<?php
use Slim\Http\UploadedFile;

function emptynz(&$var) {
    if (isset($var) && ($var === 0) || $var === '0') {
        return false;
    }
    return (empty($var));
}


function moveUploadedUpdateFile($path, UploadedFile $uploadedFile) {
    $uploadedFile->moveTo($path);
    return $path;
}