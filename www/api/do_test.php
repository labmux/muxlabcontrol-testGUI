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


//TODO since multiple test can run at the same time, and ionic serve from there! and returngbf the port of server

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
$app_path .= '/muxcontrol';
shell_exec('sudo -u muxlab cd ' . $app_path . ' && npm install');//TODO on test server this isn't working for some reason
shell_exec('sudo -u muxlab cd ' . $app_path . ' && bower install');
shell_exec('sudo -u muxlab cd ' . $app_path . ' && ionic setup sass');
shell_exec('sudo -u muxlab cd ' . $app_path . ' && gulp sass');
shell_exec('sudo -u muxlab cd ' . $app_path . ' && gulp templatecache');
shell_exec('sudo -u muxlab cd ' . $app_path . ' && gulp bundlejs');
shell_exec('sudo -u muxlab cd ' . $app_path . ' && ionic serve');//TODO get the port returned!!