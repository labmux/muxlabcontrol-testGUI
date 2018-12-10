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

shell_exec('sudo -u muxlab cd ' . $app_path . ' && git clone http://10.0.1.144:8080/git/a.abitbol/muxcontrol.git');
shell_exec('sudo -u muxlab cd ' . $app_path . ' && git checkout tags/' . $test_run_data['app_version']);
$appserver_path .= '/muxcontrol';
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && apv init');//the app doesn't use semver, which prevents npm install from working... so change it to semver here [for some reason this wasn't necessary during dev...]
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && apv set-version '. str_replace('v', '', $test_run_data['app_version']) . '.0');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && npm install');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && bower install');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && ionic setup sass');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && npm rebuild node-sass');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && gulp sass');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && gulp templatecache');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && gulp bundlejs');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && ionic serve --port=' . $test_run_data['app_server_port']);

//TODO ELIRAN CODE HERE for protractor / selenium etc
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && ELIRAN');//Eliran place your commands all the way at the end of the string after the "&&"
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && STUFF');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && GOES');
shell_exec('sudo -u muxlab cd ' . $appserver_path . ' && HERE');

//TODO ELIRAN if you can save the results of the protractor run to a file under $app_path/results_{test_suite_ID}_{test_run_id}_{mnc_version}_{app_version}.txt
//TODO ELIRAN and once that's done, scan each of those files for any failures in protractor (I guess if the word FAILED is there or something) and then produce a file called status.txt and enter "failed" or "success" in it

\TestPlayground\DB::query('UPDATE test_suite_run SET status = "done" WHERE id = ?:[id,i]', array(
    'id' => $data['test_run_id']
));
