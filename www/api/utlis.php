<?php


function emptynz(&$var) {
    if (isset($var) && ($var === 0) || $var === '0') {
        return false;
    }
    return (empty($var));
}
