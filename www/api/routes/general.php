<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

$app->get('/muxlabcontrol/app-versions', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    $result = TestPlayground\MuxLabControlApp::getAppVersions();

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});