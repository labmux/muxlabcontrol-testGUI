<?php
/**
 * This file is meant to be called by the command line, and it is meant to run a specific test suite
 * it's meant to be called as such php do_test.php "test_run_id=123"
 */

require '../../vendor/autoload.php';
require 'utlis.php';
require 'config.php';

spl_autoload_register(function ($classname) {
    $classname = str_replace('\\', '/', $classname);
    require ("./" . $classname . ".php");
});

$config['displayErrorDetails'] = true;
$config['addContentLengthHeader'] = false;


$data = array();
if (!empty($argv[1])) {
    parse_str($argv[1], $data);
}

if (emptynz($data['test_run_id'])) {
    echo 'invalid test run id';
    exit(0);
}

$test_run_data = \TestPlayground\DB::query('SELECT test_suite_run.*, test_suite.id as `test_suite_id`, test_suite.update_file FROM test_suite_run LEFT JOIN test_suite ON test_suite_run.test_suite_id = test_suite.id WHERE test_suite_run.id = ?:[id,i]', array(
'id' => $data['test_run_id']
));

\TestPlayground\DB::query('UPDATE test_suite_run SET status = "in_progress" WHERE id = ?:[id,i]', array(
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
        exit(0);
    }
} else {
    $mnc_instance = \TestPlayground\MNC::createMNCInstance('System Initiated ' . $test_run_data['test_suite_id'] . '_' . $data['test_run_id'], $test_run_data['mnc_identifier'], true);
    //run the update file here if applicable
    if (!empty($test_run_data['update_file'])) {

        //TODO test the auto update sys as well
        $client = new \GuzzleHttp\Client(['cookies' => true]);

        //log in
        $r = $client->request('POST', 'http://' . $mnc_instance['ip_address'] . '/mnc/', [
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
        $response = $client->request('POST', 'http://' . $mnc_instance['ip_address'] . '/mnc/xSoftwareUpdateV202/xSoftwareUpdate.php', [
            'multipart' => [
                [
                    'name'     => 'zip_file',
                    'contents' => fopen($test_run_data['update_file'], 'r')
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
        sleep(1);//while the mnc updates and reboots
    }

    //TODO @ELIRAN in the web interface don't let the user specify an update file when it's a user defined MNC
}



//create a new MuxLabControl app instance for this test
if (!is_dir('/var/www/html/www/test-runs')) {
    shell_exec('sudo -u muxlab mkdir /var/www/html/www/test-runs ');
}

$test_run_path = '/var/www/html/www/test-runs/test-run_' . $test_run_data['test_suite_id'] . '_' . $data['test_run_id'];
if (!is_dir($test_run_path)) {
    shell_exec('sudo -u muxlab mkdir ' . $test_run_path);
}

$app_path = $test_run_path . '/app';
if (!is_dir($app_path)) {
    shell_exec('sudo -u muxlab mkdir ' . $app_path);
}

shell_exec('sudo -u muxlab true && cd ' . $app_path . ' && git clone http://10.0.1.144:8080/git/a.abitbol/muxcontrol.git');
shell_exec('sudo -u muxlab true && cd ' . $app_path . ' && git checkout tags/' . $test_run_data['app_version']);
$appserver_path .= '/muxcontrol';
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && apv init');//the app doesn't use semver, which prevents npm install from working... so change it to semver here [for some reason this wasn't necessary during dev...]
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && apv set-version '. str_replace('v', '', $test_run_data['app_version']) . '.0');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && npm install');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && bower install');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && ionic setup sass');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && npm rebuild node-sass');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && gulp sass');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && gulp templatecache');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && gulp bundlejs');
$ionic_process_id = shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && nohup ionic serve --port=' . $test_run_data['app_server_port'] . ' > /dev/null 2>&1 & echo $!');
$ionic_process_id = explode("\n", $ionic_process_id);
$ionic_process_id = $ionic_process_id[1];

//TODO @ELIRAN CODE HERE for protractor / selenium etc
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && ELIRAN');//Eliran place your commands all the way at the end of the string after the second "&&"
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && STUFF');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && GOES');
shell_exec('sudo -u muxlab true && cd ' . $appserver_path . ' && HERE');

$test_run_result = 'success';
//TODO @ELIRAN if you can save the results of the protractor run to a file under $app_path/results_{test_suite_ID}_{test_run_id}_{mnc_version}_{app_version}.txt
//TODO @ELIRAN and once that's done, scan each of those files for any failures in protractor (I guess if the word FAILED is there or something) and then assign it to the variable $test_run_result (enter "failed" or "success" in it)

//stop ionic server
shell_exec('sudo -u muxlab true && kill ' . $ionic_process_id);//TODO test if this works
//delete the repo from here
shell_exec('sudo -u muxlab true && rm -rf ' . $appserver_path);//TODO test this
if (empty($test_run_data['mnc_user_defined'])) {
    \TestPlayground\MNC::deleteMNC($mnc_instance['id']);
}

\TestPlayground\DB::query('UPDATE test_suite_run SET status = ?:[status,s] WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id'],
    'status' => $test_run_result
));

//check if this was the last run and if so mark the whole suite as compelte
$all_test_runs = \TestPlayground\DB::query('SELECT * FROM test_suite_run WHERE status = "in_progress" AND test_suite_id = ?:[test_suite_id,i]', array(
    'test_suite_id' => $test_run_data['test_suite_id']
));
if (sizeof($all_test_runs) === 0) {//test suite has all its child processes finished running
    \TestPlayground\DB::query('UPDATE test_suite SET status = "done" WHERE id = ?:[id,i]', array(
        'id' => $test_run_data['test_suite_id']
    ));
}