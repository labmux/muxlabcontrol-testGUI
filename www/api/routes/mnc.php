<?php
/**
 * Endpoint Description
 */

$app->get('/mnc/getAvailableVersions', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    $result = TestPlayground\MNC::getAvailableVersions();

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});