<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;


$app->get('/test-suites', function (Request $request, Response $response, $args) {
    \TestPlayground\TestPlayground::init();

    $result = TestPlayground\TestSuite::getTestSuites();

//    foreach ($result['specs'as &$spec) {
//        $spec = preg_replace("/-spec.js/", "", $spec);
//        $spec = ucfirst($spec);
//    }

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

    var_dump($data);
    if (empty($data['name'])) {
        $data['name'] = '';
    }
    if (empty($data['mnc_versions'])) {
        $data['mnc_versions'] = array();
    } else {
        $data['mnc_versions'] = json_decode($data['mnc_versions'], true);
    }

    if (empty($data['app_versions'])) {
        $data['app_versions'] = array();
    } else {
        $data['app_versions'] = json_decode($data['app_versions'], true);
    }

    if (empty($data['specs'])) {
        $data['specs'] = array();
    } else {
        $data['specs'] = json_decode($data['specs'], true);

        // transform spec files to original state
        for ($i = 0; $i < count($data['specs']); $i++) {
            $data['specs'][$i] = $data['specs'][$i] . '-spec.js';
            $data['specs'][$i] = lcfirst($data['specs'][$i]);
        }
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

    $result = TestPlayground\TestSuite::createTestSuite($data['name'], $data['mnc_versions'], $data['app_versions'], $uploadedFile, $data['specs']);


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