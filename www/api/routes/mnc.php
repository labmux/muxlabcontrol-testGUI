<?php
/**
 * Endpoint Description
 */

$app->get('/mnc/available-versions', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    $result = TestPlayground\MNC::getAvailableVersions();

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});

$app->get('/mnc', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    $result = TestPlayground\MNC::getMNCs();

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});

$app->post('/mnc', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();
    $data = $request->getParsedBody();

    if (empty($data['name'])) {
        $data['name'] = '';
    }
    if (empty($data['mnc_version'])) {
        $data['mnc_version'] = '';
    }

    $result = TestPlayground\MNC::createMNCInstance($data['name'], $data['mnc_version']);

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});

$app->delete('/mnc/{mnc_id}', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();
    
    if (emptynz($args['mnc_id'])) {
        $args['mnc_id'] = '';
    }

    $result = TestPlayground\MNC::deleteMNC($args['mnc_id']);

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});

$app->get('/mnc/{mnc_id}/start', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    if (emptynz($args['mnc_id'])) {
        $args['mnc_id'] = '';
    }

    $result = TestPlayground\MNC::startMNC($args['mnc_id']);

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});

$app->get('/mnc/{mnc_id}/stop', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    if (emptynz($args['mnc_id'])) {
        $args['mnc_id'] = '';
    }

    $result = TestPlayground\MNC::stopMNC($args['mnc_id']);

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});