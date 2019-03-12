<?php
namespace TestPlayground;
use \phpseclib\Net\SSH2;

class TestSuite {

    public function __construct() {
    }

    public static function getTestSuites() {
        $suites = DB::query('SELECT * FROM test_suite', array());
        for ($i = 0; $i < sizeof($suites); $i++) {
            $suites[$i]['mnc_versions'] = json_decode($suites[$i]['mnc_versions']);
            $suites[$i]['app_versions'] = json_decode($suites[$i]['app_versions']);
            $suites[$i]['test_suite_runs'] = DB::query('SELECT * FROM test_suite_run WHERE test_suite_id = ?:[suite_id,i]', array(
                'suite_id' => $suites[$i]['id']
            ));
        }

        return (!empty($suites) ? $suites : array());
    }

    /**
     * @param $name
     * @param $mnc_versions [{identifier: 'v1.5.7f', user_defined: bool}, ...] Where user-defined means that the identifier refers to an existing VM created by user
     * @param $app_versions ['v1.0', 'v3.0', 'v5.4']
     * @return array
     * @throws \Exception
     */
    public static function createTestSuite($name, $mnc_versions, $app_versions, $uploaded_file) {

        if (empty($name)) {
            return array(
                'status' => 'error',
                'message' => 'name cannot be empty TS001'
            );
        }

        if (empty($mnc_versions)) {
            return array(
                'status' => 'error',
                'message' => 'you must specify MNCs to test against TS002'
            );
        }

        if (empty($app_versions)) {
            return array(
                'status' => 'error',
                'message' => 'you must specify app versions to to test against TS003'
            );
        }

        //validate the version's specified
        $existing_boxes = MNC::getMNCs();
        foreach ($mnc_versions as $mnc_version) {
            if (empty($mnc_version['user_defined'])) {
                if (empty($mnc_version['identifier']) || !MNC::isValidMNCVersion($mnc_version['identifier'])) {
                    return array(
                        'status' => 'error',
                        'message' => 'test suite specified invalid version version TS004'
                    );
                }
            } else {//ie we are dealing with a user defined box
                $box_exists = false;
                foreach ($existing_boxes as $existing_box) {
                    if (intval($existing_box['id']) === intval($mnc_version['identifier'])) {
                        $box_exists = true;
                    }
                }

                if (empty($box_exists)) {
                    return array(
                        'status' => 'error',
                        'message' => 'test suite specified invalid user defined box TS005'
                    );
                }
            }
        }

        //validate the app versions
        foreach ($app_versions as $app_version) {
            if (!MuxLabControlApp::isValidAppVersion($app_version)) {
                return array(
                    'status' => 'error',
                    'message' => 'test suite specified invalid app version TS006'
                );
            }
        }

        //at this point we have valid data, let's go ahead and create an entry in the DB for this test suite
        $test_suite_id = DB::query('INSERT INTO test_suite SET name = ?:[name,s], mnc_versions = ?:[mnc_versions,s], app_versions = ?:[app_versions,s], update_file = ?:[update_file,b]', array(
            'name' => $name,
            'mnc_versions' => json_encode($mnc_versions),
            'app_versions' => json_encode($app_versions),
            'update_file' => (!empty($uploaded_file) ? true : false)
        ), array('return_insert_id' => true));

        //Ok, now let's run these tests! and register each in DB
        if (!emptynz($test_suite_id)) {

            //TODO handle the update file here and place it in test suite folder so that it gets deleted after (on user delete)
            if (!empty($uploaded_file)) {
                if (!is_dir(PATH_TEST_RUNS . '/test-suite_' . $test_suite_id)) {
                    shell_exec('sudo -u muxlab mkdir ' . PATH_TEST_RUNS . '/test-suite_' . $test_suite_id);
                }
                moveUploadedUpdateFile(PATH_TEST_RUNS . 'test-suite_' . $test_suite_id . '/update-file.zip', $uploaded_file);
            }



            //get list of ports used already for the app server (ionic serve)
            $existing_runs = DB::query('SELECT * FROM test_suite_run ', array());
            $ports_busy = array();
            foreach ($existing_runs as $existing_run) {
                if (!emptynz($existing_run['app_server_port'])) {
                    $ports_busy[] = intval($existing_run['app_server_port']);
                }
            }

            foreach ($mnc_versions as $mnc_version) {
                foreach ($app_versions as $app_version) {
                    //choose a port to run the app server on
                    $app_server_port = 8100;
                    if (!empty($ports_busy)) {
                        $app_server_port = max($ports_busy) + 1;
                    }

                    $ports_busy[] = $app_server_port;

                    //register in DB
                    $test_run_id = DB::query('INSERT INTO test_suite_run SET test_suite_id = ?:[test_suite_id,i], mnc_identifier = ?:[mnc_id,s], mnc_user_defined = ?:[mnc_user_defined,b], app_version = ?:[app_version,s], app_server_port = ?:[app_server_port,i], status = "pending"', array(
                        'test_suite_id' => $test_suite_id,
                        'mnc_id' => $mnc_version['identifier'],
                        'mnc_user_defined' => (!empty($mnc_version['user_defined']) ? true : false),
                        'app_version' => $app_version,
                        'app_server_port' => $app_server_port
                    ), array('return_insert_id' => true));

                    //should spawn a new process for each test, since we don't want to wait here for them to complete before responding to the user
                    $output = array();
                    exec("sudo -u muxlab nohup php /var/www/html/www/api/do_test.php \"test_run_id={$test_run_id}\" > /dev/null 2>&1 &", $output);
                    //TO DEBUG USE BELOW INSTEAD OF ABOVE
                    //exec("sudo -u muxlab php /var/www/html/www/api/do_test.php \"test_run_id={$test_run_id}\"", $output);
                    var_dump($output);
                }
            }

        }

        //inform the user that all was initiated and waiting for results
        DB::query('UPDATE test_suite SET status="in_progress" WHERE id = ?:[id,i]', array('id' => $test_suite_id));
        return array(
            'status' => 'success',
            'message' => 'tests in progress'
        );
    }


    public static function deleteTestSuite($test_suite_id) {
        $test_suite_id = intval($test_suite_id);
        if (is_dir('sudo -u muxlab true && rm -rf /var/www/html/www/test-runs/test-suite_' . $test_suite_id)) {
            shell_exec('sudo -u muxlab true && rm -rf /var/www/html/www/test-runs/test-suite_' . $test_suite_id);//TODO test this
        }
        
        DB::query('DELETE FROM test_suite_run WHERE test_suite_id = ?:[test_suite_id,i]', array(
            'test_suite_id' => $test_suite_id
        ));

        DB::query('DELETE FROM test_suite WHERE id = ?:[test_suite_id,i]', array(
            'test_suite_id' => $test_suite_id
        ));
    }

}