<?php
namespace TestPlayground;
use \phpseclib\Net\SSH2;

class MNC {

    /**
     * $is_instantiating
     * is used to lock the instantiating mechanism, to force one operation at a time.
     * This is needed because each version instance has the same IP address, and we want to avoid IP address conflicts.
     * After each instantiation, the ip address is assigned to something random and returned to the user. Then, we are
     * ready for another instantiation
     * @var bool
     */
    private static $box_prefix = 'vbox';

    public function __construct() {
    }

    public static function getMNCs() {
        //TODO delete boxes that are 36 hours old, to prevent misuse of this platform

        $boxes = DB::query('SELECT * FROM mnc', array());
        return (!empty($boxes) ? $boxes : array());
    }

    public static function getMNC($id) {
        $box = DB::query('SELECT * FROM mnc WHERE id = ?:[id,i]', array(
            'id' => $id
        ));
        return (!empty($box[0]) ? $box[0] : array());
    }

    public static function getAvailableVersions() {
        $availableVersions = [];

        //$raw_versions = `sudo -u muxlab true && cd / && VBoxManage snapshot primary list --machinereadable`;
        $raw_versions = `sudo -u muxlab VBoxManage snapshot primary list --machinereadable`;

        $raw_versions = explode("\n", $raw_versions);

        foreach ($raw_versions as $raw_version) {
            $raw_version = explode('=', $raw_version);
            if (strpos($raw_version[0], 'SnapshotName') === 0) {
                $raw_version = str_replace('"', '', $raw_version[1]);
                $availableVersions[] = $raw_version;
            }
        }

        return $availableVersions;
    }

    public static function createMNCInstance($name, $mnc_version, $system_initiated = false) {

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
                'message' => 'you must specify an version version to instantiate'
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

        while (self::isMNCInstantiating() === true) {
            sleep(1);
        }

        try {
            //ok, now let's clone the snapshot of this version version for the user
            self::setIsMNCInstantiating(true);//lock the insantiating mechanism, to prevent > 1 VM insantiating at a time.

            //register the new box info to the DB
            try {
                $vbox_id = DB::query('INSERT INTO mnc SET name = ?:[name,s], status = "uninstantiated", system_initiated = ?:[system_initiated,b]', array(
                    'name' => $name,
                    'system_initiated' => $system_initiated
                ), array('return_insert_id' => true));
            } catch (\Exception $e) {
                if (!empty($e->getMessage()) && strpos(strtolower($e->getMessage()), 'duplicate') !== false) {
                    return array(
                        'status' => 'error',
                        'message' => 'name exists already'
                    );
                }
            }


            //make sure the insert happened ok
            if (emptynz($vbox_id)) {
                self::setIsMNCInstantiating(false);
                return array(
                    'status' => 'error',
                    'message' => 'Unable to add box to database BX1.01'
                );
            }

            //instantiate the machine:
            $clone = shell_exec('sudo -u muxlab VBoxManage clonevm primary --snapshot ' . $mnc_version . ' --name ' . self::$box_prefix . $vbox_id . ' --register --options link --mode machine');
            DB::query('UPDATE mnc SET status = "instantiated" WHERE id = ?:[id,i]', array('id' => $vbox_id));

            //now let's boot it and change the default IP to something unique
            self::startMNC($vbox_id);

            self::waitForMNCBooted('192.168.168.50');

            $box_new_ip = self::getAvailableIPForMNC();
            if ($box_new_ip === false) {//no more ips available
                self::setIsMNCInstantiating(false);
                return array(
                    'status' => 'error',
                    'message' => 'no more ips available!'
                );
            }


            self::setBoxIP('192.168.168.50', $box_new_ip);
            DB::query('UPDATE mnc SET status = "ready", ip_address = ?:[new_ip,s] WHERE id = ?:[id,i]', array('id' => $vbox_id, 'new_ip' => $box_new_ip));

            self::setIsMNCInstantiating(false);

            return array(
                'status' => 'success',
                'name' => $name,
                'id' => $vbox_id,
                'ip_address' => $box_new_ip
            );

        } catch (\Exception $e) {
            self::setIsMNCInstantiating(false);
            //TODO also delete the created VM cuz now it's hogging the .50 address!
            return array(
                'status' => 'error',
                'message' => $e->getMessage()
            );
        }

    }

    private static function setBoxIP($current_ip, $new_ip) {
        $ssh = new \phpseclib\Net\SSH2($current_ip);
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

        $is_already_started = DB::query('SELECT * FROM mnc WHERE id = ?:[id,i]', array('id' => $box_id));

        if (empty($is_already_started[0]['status']) || !in_array($is_already_started[0]['status'], array('ready', 'started'))) {

            $result = shell_exec('sudo -u muxlab VBoxManage startvm ' . self::$box_prefix . $box_id . ' --type headless');
            DB::query('UPDATE mnc SET status = "started" WHERE id = ?:[id,i] LIMIT 1', array('id' => $box_id));

        }

        return true;
    }

    public static function stopMNC($box_id) {
        $box_id = intval($box_id);

        $result = shell_exec('sudo -u muxlab VBoxManage controlvm ' . self::$box_prefix . $box_id . ' poweroff');
        DB::query('UPDATE mnc SET status = "stopped" WHERE id = ?:[id,i] LIMIT 1', array('id' => $box_id));

        return true;
    }

    public static function deleteMNC($box_id) {
        $box_id = intval($box_id);
        $result = shell_exec('sudo -u muxlab VBoxManage controlvm ' . self::$box_prefix . $box_id . ' poweroff');
        $result = shell_exec('sudo -u muxlab VBoxManage unregistervm ' . self::$box_prefix . $box_id . ' --delete');
        DB::query('DELETE FROM mnc WHERE id = ?:[id,i] LIMIT 1', array('id' => $box_id));

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

    private static function isMNCInstantiating() {
        $is_instantiating = DB::query('SELECT value FROM config WHERE name = "is_mnc_instantiating"', array());
        if (!empty($is_instantiating)) {
            $is_instantiating = reset($is_instantiating);
            if (!empty($is_instantiating['value'])) {
                return true;
            }
        }

        return false;
    }

    private static function setIsMNCInstantiating($is_instantiating) {
        DB::query('REPLACE INTO config SET name = "is_mnc_instantiating", value = ?:[val,b]', array('val' => $is_instantiating));
    }


    private static function waitForMNCBooted($ip) {
        usleep(300 * 1000);//300 milliseconds before checking if done

        $max_retries = 5;
        while (!self::isMNCBooted($ip)) {
            usleep(100 * 1000);//100 milliseconds
            $max_retries--;
            if ($max_retries <= 0) {
                return false;
            }
        }
        return true;
    }
    private static function isMNCBooted($ip) {
        $url='http://' . $ip . '/mnc';

        $ch = curl_init();
        $timeout = 2;
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpcode < 400 || $httpcode >= 500) {
            return true;
        } else {
            return false;
        }
    }
}