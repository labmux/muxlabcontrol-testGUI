<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

/**
 * Gets list of MuxlabControl specs
 */
$app->get('/muxlabcontrol-specs', function (Request $request, Response $response, $args) {
    $dir = '/var/www/html/tests/e2e/Devices/MuxlabControl/specs/';
    $files = scandir($dir);

    if (empty($files)) {
        $response = $response->withJson($files, 400);
    }
    else {
        $response = $response->withJson($files);
    }

    return $response;
});

$app->get('/devices', function (Request $request, Response $response, $args) {
    $dir = '/var/www/html/tests/e2e/Devices/';
    $files = scandir($dir);

    if (empty($files)) {
        $response = $response->withJson($files, 400);
    }
    else {
        $response = $response->withJson($files);
    }

    return $response;
});

