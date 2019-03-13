<?php
$ip = '192.168.168.50';
$url='http://' . $ip . '/mnc';
$content=file_get_contents($url);
var_dump($content);