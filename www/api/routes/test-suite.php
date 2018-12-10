<?php
$app->get('/test-suites', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    $result = TestPlayground\TestSuite::getTestSuites();

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});

$app->post('/test-suites', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    $data = $request->getParsedBody();

    if (empty($data['name'])) {
        $data['name'] = '';
    }
    if (empty($data['mnc_versions'])) {
        $data['mnc_versions'] = '';
    }
    if (empty($data['app_versions'])) {
        $data['app_versions'] = '';
    }

    $result = TestPlayground\TestSuite::createTestSuite($data['name'], $data['mnc_versions'], $data['app_versions']);

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});