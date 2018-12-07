<?php
namespace TestPlayground;
use \phpseclib\Net\SSH2;

class MNC {

    /**
     * $is_instantiating
     * is used to lock the instantiating mechanism, to force one operation at a time.
     * This is needed because each mnc instance has the same IP address, and we want to avoid IP address conflicts.
     * After each instantiation, the ip address is assigned to something random and returned to the user. Then, we are
     * ready for another instantiation
     * @var bool
     */
    private static $is_instantiating = false;
    private static $box_prefix = 'vbox';

    public function __construct() {
    }

    public static function getMNCs() {
        //TODO delete boxes that are 36 hours old, to prevent misuse of this platform

        $boxes = DB::query('SELECT * FROM mnc', array());
        return (!empty($boxes) ? $boxes : array());
    }

    public static function getAvailableVersions() {
        $availableVersions = [];
        $raw_versions = `sudo -u muxlab VBoxManage snapshot primary list --machinereadable`;
        $raw_versions = explode("\n", $raw_versions);

        foreach ($raw_versions as $raw_version) {
            $raw_version = explode('=', $raw_version);
            if (strpos($raw_version[0], 'SnapshotName') !== false) {
                $raw_version = str_replace('"', '', $raw_version[1]);
                $availableVersions[] = $raw_version;
            }
        }

        return $availableVersions;
    }

    public static function createMNCInstance($name, $mnc_version) {
        if (empty($name)) {
            return array(
                'status' => 'error',
                'message' => 'you must specify an instance name'
            );
        }

        //validate the requested version
        if (empty($mnc_version)) {
            return array(
                'status' => 'error',
                'message' => 'you must specify an mnc version to instantiate'
            );
        }
        $availableVersions = self::getAvailableVersions();
        if (strpos($mnc_version, 'v') !== 0) {//make sure there's a "v" before the version number
            $mnc_version = 'v' . $mnc_version;
        }
        if (!in_array($mnc_version, $availableVersions)) {
            return array(
                'status' => 'error',
                'message' => 'the version number you provided is invalid (does not exist on server)'
            );
        }

        while (self::$is_instantiating === true) {
            sleep(1);
        }

        //ok, no let's clone the snapshot of this mnc version for the user
        self::$is_instantiating = true;//lock the insantiating mechanism, to prevent > 1 VM insantiating at a time.

        //register the new box info to the DB
        $vbox_id = DB::query('INSERT INTO mnc SET name = ?:[name,s], status = "uninstantiated"', array(
            'name' => $name
        ), array('return_insert_id' => true));

        //make sure the insert happened ok
        if (emptynz($vbox_id)) {
            self::$is_instantiating = false;
            return array(
                'status' => 'error',
                'message' => 'Unable to add box to database BX1.01'
            );
        }

        //instantiate the machine:
        $clone = shell_exec('sudo -u muxlab VBoxManage clonevm primary --snapshot ' . $mnc_version . ' --name ' . self::$box_prefix . $vbox_id . ' --register');
        DB::query('UPDATE mnc SET status = "instantiated" WHERE id = ?:[id,i]"', array('id' => $vbox_id));

        //now let's boot it and change the default IP to something unique
        self::startMNC($vbox_id);

        $box_new_ip = self::getAvailableIPForMNC();
        if ($box_new_ip === false) {//no more ips available
            self::$is_instantiating = false;
            return array(
                'status' => 'error',
                'message' => 'no more ips available!'
            );
        }


        self::setBoxIP('192.168.168.50', $box_new_ip);
        DB::query('UPDATE mnc SET status = "ready" WHERE id = ?:[id,i]"', array('id' => $vbox_id));

        self::$is_instantiating = false;
        return array(
            'status' => 'success',
            'name' => $name,
            'id' => $vbox_id,
            'ip_address' => $box_new_ip
        );
    }

    private static function setBoxIP($current_ip, $new_ip) {
        $ssh = new SSH2($current_ip);
        $ssh->login('root', '111111');

        $ssh->exec("sudo cat <<EOT | sudo tee /etc/network/interfaces >&-
auto eth0
iface eth0 inet static
    address {$new_ip}
    netmask 255.255.255.0
    gateway 192.168.168.1
    
auto lo
iface lo inet loopback
");

        $ssh->exec('sudo ifdown eth0 && sudo ifup eth0');
        @$ssh->disconnect();
    }

    /**
     * Queries the DB for all machines and returns an available ip address in the 192.168.168.x range
     * @return string
     * @throws \Exception
     */
    private static function getAvailableIPForMNC() {
        $available_ip = '192.168.168.';
        $existing_machines = DB::query('SELECT * FROM mnc', array());
        $busy_ips = array(
            '100',//this is the test server itself
            '1',//router
            '2'//just in case!
        );
        foreach ($existing_machines as $machine) {
            if (!empty($machine['ip_address'])) {
                $busy_ips[] = substr($machine['ip_address'], strrpos($machine['ip_address'], '.') + 1);
            }
        }

        if (sizeof($busy_ips) >= 255) {//prevent an infinite loop below! if no ips available, just quit
            return false;
        }

        $node = '';
        do {
            $node = rand(3, 255);//1 belongs to the router and 255 is max
        } while (in_array($node, $busy_ips));

        $available_ip .= $node;
        return $available_ip;
    }

    public static function startMNC($box_id) {
        $box_id = intval($box_id);

        $is_already_started = DB::query('SELECT status FROM mnc WHERE id = ?:[id,i]', array('id' => $box_id));

        if (empty($is_already_started[0]['status']) || !in_array($is_already_started[0]['status'], array('ready', 'started'))) {

            $result = shell_exec('sudo -u muxlab VBoxManage startvm ' . self::$box_prefix . $box_id . ' --type headless');
            DB::query('UPDATE mnc SET status = "started" WHERE id = ?:[id,i] LIMIT 1"', array('id' => $box_id));

        }

        return true;
    }

    public static function stopMNC($box_id) {
        $box_id = intval($box_id);

        $result = shell_exec('sudo -u muxlab VBoxManage controlvm ' . self::$box_prefix . $box_id . ' poweroff');
        DB::query('UPDATE mnc SET status = "stopped" WHERE id = ?:[id,i] LIMIT 1"', array('id' => $box_id));

        return true;
    }

    public static function deleteMNC($box_id) {
        $box_id = intval($box_id);
        $result = shell_exec('sudo -u muxlab VBoxManage controlvm ' . self::$box_prefix . $box_id . ' poweroff');
        $result = shell_exec('sudo -u muxlab VBoxManage unregistervm ' . self::$box_prefix . $box_id . ' --delete');
        DB::query('DELETE FROM mnc WHERE id = ?:[id,i] LIMIT 1"', array('id' => $box_id));

        return true;
    }

    public static function isValidMNCVersion($mnc_version) {
        $availableVersions = self::getAvailableVersions();
        if (strpos($mnc_version, 'v') !== 0) {//make sure there's a "v" before the version number
            $mnc_version = 'v' . $mnc_version;
        }
        if (!in_array($mnc_version, $availableVersions)) {
            return false;
        }

        return true;
    }


}