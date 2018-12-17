<?php
namespace TestPlayground;


class TestPlayground {

    public function __construct() {
    }

    public static function init() {
        if (!DB::init()) {
            die('Error: dbe. Please report this error to the support team.');
        }
        //Session::init();
    }
}