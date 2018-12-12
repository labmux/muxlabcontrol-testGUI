<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use Slim\Http\UploadedFile;


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

    $uploadedFile = '';
    $uploadedFiles = $request->getUploadedFiles();

    // handle single input with single file upload
    if (!empty($uploadedFiles['update_file'])) {
        $uploadedFile = $uploadedFiles['update_file'];
        if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
            return $response->withJson(array(
                'status' => 'error',
                'message' => 'invalid update-file upload'
            ), 400);
        }
    }

    $result = TestPlayground\TestSuite::createTestSuite($data['name'], $data['mnc_versions'], $data['app_versions'], $uploadedFile);

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});

$app->delete('/test-suites/{suite_id}', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    if (emptynz($args['suite_id'])) {
        $args['suite_id'] = '';
    }

    $result = TestPlayground\TestSuite::deleteTestSuite($args['suite_id']);

    if (!empty($result['status']) && $result['status'] === 'error') {
        $response = $response->withJson($result, 400);
    } else {
        $response = $response->withJson($result, 200);
    }

    return $response;
});