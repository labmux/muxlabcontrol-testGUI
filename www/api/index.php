<?php
//Copyright 2017 MuxLab. All rights reserved.

session_start();

require '../../vendor/autoload.php';
use Slim\Http\UploadedFile;
require 'utlis.php';
require 'config.php';

spl_autoload_register(function ($classname) {
    $classname = str_replace('\\', '/', $classname);
    require ("./" . $classname . ".php");
});

$config['displayErrorDetails'] = true;
$config['addContentLengthHeader'] = false;

$app = new \Slim\App(["settings" => $config]);

$container = $app->getContainer();
if (!is_dir(__DIR__ . '/temp-uploads')) {
    shell_exec('sudo -u muxlab mkdir ' . __DIR__ . '/temp-uploads');
    shell_exec('sudo -u muxlab chmod -R 777 ' . __DIR__ . '/temp-uploads');
}

$container['upload_directory'] = __DIR__ . '/temp-uploads';

$app->options('/{routes:.+}', function ($request, $response, $args) {
    return $response;
});

$app->add(function ($req, $res, $next) {
    $response = $next($req, $res);
    return $response
        //->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->withHeader('Access-Control-Max-Age', '1000')
        ->withHeader('Access-Control-Allow-Headers', 'x-requested-with, Content-Type, origin, authorization, accept, client-security-token');
});



//Routes
$routes = glob("./routes/*.php");
foreach ($routes as $route) {
    include $route;
}


$app->run();