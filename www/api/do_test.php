<?php
/**
 * This file is meant to be called by the command line, and it is meant to run a specific test suite
 * it's meant to be called as such php do_test.php "test_run_id=123"
 */

require __DIR__ . '/../../vendor/autoload.php';
require 'utlis.php';
require 'config.php';

spl_autoload_register(function ($classname) {
    $classname = str_replace('\\', '/', $classname);
    require (__DIR__ . "/./" . $classname . ".php");
});

$config['displayErrorDetails'] = true;
$config['addContentLengthHeader'] = false;


chdir('/');
$data = array();
if (!empty($argv[1])) {
    parse_str($argv[1], $data);
}

if (emptynz($data['test_run_id'])) {
    echo 'invalid test run id';
    exit(0);
}

\TestPlayground\DB::init();
$test_run_data = \TestPlayground\DB::query('SELECT test_suite_run.*, test_suite.update_file FROM test_suite_run LEFT JOIN test_suite ON test_suite_run.test_suite_id = test_suite.id WHERE test_suite_run.id = ?:[id,i]', array(
'id' => $data['test_run_id']
));
$test_run_data = reset($test_run_data);

\TestPlayground\DB::query('UPDATE test_suite_run SET status = "in_progress", activity_message = "Test Initiated" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id']
));

//run the MNC virtualbox here
$mnc_instance = array();
if (!empty($test_run_data['mnc_user_defined'])) {

    $mnc_instance = \TestPlayground\MNC::getMNC($test_run_data['mnc_identifier']);
    if (empty($mnc_instance)) {
        \TestPlayground\DB::query('UPDATE test_suite_run SET status = ?:[status,s] WHERE id = ?:[id,i]', array(
            'id' => $data['test_run_id'],
            'status' => 'invalid'
        ));
    }
} else {

    \TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Creating MNC for test" WHERE id = ?:[id,i]', array(
        'id' => $data['test_run_id']
    ));
    $mnc_instance = \TestPlayground\MNC::createMNCInstance('System Initiated ' . $test_run_data['test_suite_id'] . '_' . $data['test_run_id'], $test_run_data['mnc_identifier'], true);
    //run the update file here if applicable
    \TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "MNC Created" WHERE id = ?:[id,i]', array(
        'id' => $data['test_run_id']
    ));

    if (!empty($test_run_data['update_file'])) {

        //TODO test the auto update sys as well
        $client = new \GuzzleHttp\Client(['cookies' => true]);

        //log in
        $r = $client->request('POST', 'http://' . $mnc_instance['ip_address'] . '/version/', [
            'form_params' => [
                'p_cmd' => 'mainLogin',
                'p_userName' => 'admin',
                'p_password' => 'admin',
                'submit' => 'Sign In'
            ],
            'headers' => [
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding' => 'gzip,deflate',
                'Cache-Control' => 'max-age=0',
                'Connection' => 'keep-alive',
                'Content-Type' => 'application/x-www-form-urlencoded',
                'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebkit/537.36 (KHTML, Like Gecko) Chrome/70.0.3538/110 Safari/537.36'
            ]
        ]);

//send over the update zip file
        $response = $client->request('POST', 'http://' . $mnc_instance['ip_address'] . '/version/xSoftwareUpdateV202/xSoftwareUpdate.php', [
            'multipart' => [
                [
                    'name'     => 'zip_file',
                    'contents' => fopen(PATH_TEST_RUNS . '/test-suite_' . $test_run_data['test_suite_id'], 'r')
                ]
            ],
            'headers' => [
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding' => 'gzip,deflate',
                'Cache-Control' => 'max-age=0',
                'Connection' => 'keep-alive',
                //'Content-Type' => 'multipart/form-data',
                'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebkit/537.36 (KHTML, Like Gecko) Chrome/70.0.3538/110 Safari/537.36'
            ]
        ]);
        sleep(1);//while the version updates and reboots
    }

    //TODO @ELIRAN in the web interface don't let the user specify an update file when it's a user defined MNC
}
\TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Setting up folders for test" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id']
));
//create a new MuxLabControl app instance for this test
if (!is_dir('/var/www/html/www/test-runs')) {
    shell_exec('sudo -u muxlab mkdir /var/www/html/www/test-runs ');
}

if (!is_dir('/var/www/html/www/test-runs/test-suite_' . $test_run_data['test_suite_id'])) {
    shell_exec('sudo -u muxlab mkdir ' . '/var/www/html/www/test-runs/test-suite_' . $test_run_data['test_suite_id']);
}

$test_run_path = '/var/www/html/www/test-runs/test-suite_' . $test_run_data['test_suite_id'] . '/test-run_' . $data['test_run_id'];
if (!is_dir($test_run_path)) {
    shell_exec('sudo -u muxlab mkdir ' . $test_run_path);
}


//check if this version of the app is installed on the server already
$apps_root = '/var/www/html/www/apps';

if (!is_dir($apps_root)) {
    shell_exec('sudo -u muxlab mkdir ' . $apps_root);
}

putenv('PATH=' . getenv('PATH') . ':/home/muxlab/.nvm/versions/node/v6.11.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games');

$app_root = $apps_root . '/' . $test_run_data['app_version'];
$appserver_path = $app_root . '/muxcontrol';
if (!is_dir($app_root)) {
    \TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Installing app from Git" WHERE id = ?:[id,i]', array(
        'id' => $data['test_run_id']
    ));
    shell_exec('sudo -u muxlab mkdir ' . $app_root);

    shell_exec('sudo -u muxlab true && cd ' . $app_root . ' && git clone http://10.0.1.144:8080/git/a.abitbol/muxcontrol.git');

    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && git checkout tags/' . $test_run_data['app_version']);

    $fixed_version = str_replace('v', '', $test_run_data['app_version']);
    if (substr_count($fixed_version, '.') < 2) {//package.json now requires semver, so enforce it if necessary
        $fixed_version .= '.0';
    }

    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && json -I -f package.json -e \'this.version="' . $fixed_version . '"\'');

    \TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Installing app dependencies" WHERE id = ?:[id,i]', array(
        'id' => $data['test_run_id']
    ));
    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && npm install');
    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && bower install');
    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && ionic setup sass');
    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && npm rebuild node-sass');

    \TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Compiling app assets with Gulp" WHERE id = ?:[id,i]', array(
        'id' => $data['test_run_id']
    ));
    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && gulp sass');
    //shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && gulp templatecache');
    shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && gulp bundlejs');

}


$ionic_process_id = shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && nohup ionic serve --port=' . $test_run_data['app_server_port'] . ' > /dev/null 2>&1 & echo $!');
$ionic_process_id = explode("\n", $ionic_process_id);
$ionic_process_id = $ionic_process_id[1];
sleep(3);//wait for ionic serve to fire up

//we will send this file path to protractors config file
$testResults_path = $test_run_path . '/results_' . $test_run_data['test_suite_id'] . '_' . $data['test_run_id'] . '_' . $test_run_data['mnc_identifier'] . '_' . $test_run_data['app_version'] . '.txt';
$server_port = $test_run_data['app_server_port'];


//TODO @ELIRAN CODE HERE for protractor / selenium etc
/**
 * Eliran - here are the variables that are available to you at this point:
 * $test_run_data['app_version'] this is the app version we are testing now
 * $test_run_data['mnc_identifier'] this is the version of the version we are testing BUT it might be a random string, see the next variable below
 * $test_run_data['mnc_user_defined'] this means that the user created an MNC and may have changed files on it, so we can't assume it's any specific version of the MNC, so just assume this is the latest MNC version for your tests
 * $test_run_data['app_server_port'] this is the port that ionic serve is serving on so you can point protractor to http://localhost:PORT
 *
 * Note that this server will run multiple tests simultaneously so let me know if selenium is bugging out due to port number being used / different etc. we might generate our own port #s and store them in the DB or something
 */

/*
\TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Starting Webdriver" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id']
));
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && nohup webdriver-manager start --detach > /dev/null 2>&1 &');
NOTE it seems that protractor will only work if webdriver-manager is started from manually (and not from ssh). For some reason, calling it this way is causing ChromeDriver issues (chrome exiting unexpectedly)
*/


$testserver_path = '/var/www/html/tests/e2e/';
\TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Running Tests (Protractor)" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id']
));

//EDIT ariel:
//create a config.js file specific to this test, instead of messing around with conf.js which is not easily made dynamic
$protractor_spec_filepath = '/var/www/html/tests/e2e';//where the protractor e2e tests are

$protractor_configjs_content = <<<CONFIGJS
var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    params: {
        ipAddress: "{$mnc_instance['ip_address']}",
        port: "http://localhost:{$test_run_data['app_server_port']}/",
        username: 'admin',
        password: 'admin',
    },
    files: [{pattern: '$protractor_spec_filepath/*.js', included: true}],
    seleniumAddress: 'http://localhost:4444/wd/hub',
    capabilities: {browserName: 'chrome','chromeOptions': {
            'args': ['no-sandbox']
        }},
    jasmineNodeOpts: {
		showColors: true,
        defaultTimeoutInterval: 10000
	},
    onPrepare: function () {
        jasmine.getEnv().addReporter(
            new HtmlReporter({
                baseDirectory: '$test_run_path/beautiful-report'
        }).getJasmine2Reporter());
    },
    //Choose which spec file to read
    specs:
        [
            '$protractor_spec_filepath/presentation.js'
            // '$protractor_spec_filepath/login-spec.js'
            // '$protractor_spec_filepath/devices-spec.js',
            //'$protractor_spec_filepath/locations-spec.js'
        ]
};
CONFIGJS;


file_put_contents($test_run_path . '/conf.js', $protractor_configjs_content);
sleep(1);
shell_exec('sudo -u muxlab true && protractor ' . $test_run_path . '/conf.js > ' . $testResults_path);

\TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Tests complete, generating reports" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id']
));

//scan test results for failure

$file = file_get_contents($testResults_path);

if (strpos($file, 'failed') === false) {
    $test_run_result = 'success';
} else {
    $test_run_result = 'failed';
}



//stop ionic server
\TestPlayground\DB::query('UPDATE test_suite_run SET activity_message = "Reports generated, cleaning up" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id']
));
try {
    shell_exec('sudo -u muxlab true && kill ' . $ionic_process_id);//TODO test if this works
} catch (\Exception $e) {

}
try {
    if (empty($test_run_data['mnc_user_defined'])) {
        \TestPlayground\MNC::deleteMNC($mnc_instance['id']);
    }
} catch (\Exception $e) {

}


\TestPlayground\DB::query('UPDATE test_suite_run SET status = ?:[status,s], activity_message = "Complete" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id'],
    'status' => $test_run_result
));

//check if this was the last run and if so mark the whole suite as complete
$all_test_runs = \TestPlayground\DB::query('SELECT * FROM test_suite_run WHERE status = "in_progress" AND test_suite_id = ?:[test_suite_id,i]', array(
    'test_suite_id' => $test_run_data['test_suite_id']
));
if (sizeof($all_test_runs) === 0) {//test suite has all its child processes finished running
    \TestPlayground\DB::query('UPDATE test_suite SET status = "done" WHERE id = ?:[id,i]', array(
        'id' => $test_run_data['test_suite_id']
    ));
}

