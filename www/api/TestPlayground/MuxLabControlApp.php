<?php
namespace TestPlayground;


class MuxLabControlApp {

    private static $app_versions = [];

    public function __construct() {
    }

    public static function getAppVersions() {
        $app_versions = shell_exec('sudo -u muxlab true && cd /var/www/html/www/test-runs/primary/muxcontrol && git fetch && git tag -l');
        self::$app_versions = explode("\n", $app_versions);

        return self::$app_versions;
    }

    public static function isValidAppVersion($app_version) {
        $isValid = false;

        if (empty(self::$app_versions)) {
            self::getAppVersions();
        }

        foreach (self::$app_versions as $version) {
            if (strcmp($version, $app_version) === 0) {
                $isValid = true;
            }
        }

        return $isValid;
    }

}