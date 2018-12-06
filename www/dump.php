<?php
//this script is for messing around and testing small bits of code
$output = shell_exec('sudo vboxmanage snapshot primary list --machinereadable');
var_dump($output);