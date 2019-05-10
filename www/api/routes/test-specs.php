<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

$app->get('/test-specs', function (Request $request, Response $response, $args) {
    $files = array();
    $dir = '/var/www/html/tests/e2e/specs/';
    $files = scandir($dir);

    if (empty($files)) {
        $response = $response->withJson($files, 400);
    }
    else {
        $response = $response->withJson($files);
    }

//    print_r($files);
    return $response;

    // push file names to an array and return it
//    foreach (glob("*.*") as $filename) {
//        array_push($specs, $filename);
//    }
});