<?php
namespace TestPlayground;
/**
 * Database connector, encapsulates the db connection and provides sanitization for queries.
 *
 * Apart from using the datatypes below, it is also possible to use these:
 *
 * z - implodes and converts individual array elements to integers
 * x - implodes and converts individual array elements to strings
 *
 *
 * example usage:
    $data = array(
        'mac' => $mac,
        'icon' => $icon
    );
    $sql = 'UPDATE devices SET icon = ?:[icon,s] WHERE mac = ?:[mac,s] LIMIT 1';
    DB::query($sql, $data);
 *
 * @author Ariel
 */
class DB {
    private static $host = 'localhost';
    private static $user = 'playtest0110';
    private static $pass = 'gwsSFQ#$@#FFSD231';
    private static $db_name = 'testplayground';
    private static $conn;
    private static $connection_failed = false;
    private static $datatypes = array(
        'i',//integer
        'f',//float
        's',//string
        'b',//boolean
        'z',//array of integers to be used inside of IN. adds the parentheses for you
        'x'//array of strings to be used inside of IN. adds the parentheses for you as well as quotes
    );

    function __construct() {
    }

    public static function init() {
        self::$conn = mysqli_connect(self::$host, self::$user, self::$pass, self::$db_name);
        if (!self::$conn) {
            self::$connection_failed = true;
            return false;
        }
        self::$connection_failed = false;
        return true;
    }

    /*
     * run a query, sanitize and escape data.
     * Returns assoc array of results OR array('error', errmsg)
     * Possible options: return_insert_id
     */
    public static function query($sql, $data, $options = array()) {
        //the ?: symbol will indicate a variable. It will be followed by "[]". Inside the brackets will be the var name, followed by comma and data type, optionally followed by comma and "w" which escapes wildcards for LIKEs

        while ( ($indexStart = strpos($sql, '?:[') ) !== false ) {
            $indexEnd = strpos($sql, ']', $indexStart);
            if ($indexEnd === false) {
                throw new \Exception('malformed sql, no closing brace after variable ' . substr($sql, $indexStart, 10));
            }
            $var_info = substr($sql, $indexStart + 3, $indexEnd - $indexStart - 3);
            $var_info = explode(',', $var_info);

            if (sizeof($var_info) < 2) {
                throw new \Exception('Insufficient params: only 1 param provide in data selector');
            }

            if (!isset($data[$var_info[0]])) {
                throw new \Exception('reference to variable that was not provided: ' . $var_info[0]);
            }

            $filtered_var = self::filter_var_input($data[$var_info[0]], $var_info[1], (!empty($var_info[2]) ? $var_info[2] : false) );
            if (is_array($filtered_var) && !empty($filtered_var['error'])) {
                throw new \Exception('unable to filter variable ' . $var_info[0] . ' with type ' . $var_info[1] . '. ' . $filtered_var['message']);
            }

            $sql = str_replace( '?:[' . $var_info[0] . ',' . $var_info[1] . (!empty($var_info[2]) ? ',' . $var_info[2] : '') . ']' , $filtered_var, $sql);
        }

        global $config;
        if (!empty($config['debug_sql']) && $config['debug_sql'] === true) {
            echo '<pre>';
            echo $sql;
            echo '</pre>';
        }

        $results = mysqli_query(self::$conn, $sql);

        if ($results === false) {
            throw new \Exception('query error for string: ' . "\n" . $sql . "\n" . mysqli_error(self::$conn));
        }

        if (!empty($options['return_insert_id'])) {
            $insert_id = mysqli_insert_id(self::$conn);
            return $insert_id;
        } else if ($results === true) {
            return true;
        } else {
            $results_data = array();
            while ( ($row = mysqli_fetch_assoc($results) ) !== null ) {
                $row_filtered = array();
                if (!empty($row)) {
                    foreach ($row as $key => $value) {
                        if (!is_numeric($value)) {
                            $row_filtered[$key] = self::filter_var_output($value);
                        } else {
                            $row_filtered[$key] = $value;
                        }

                    }
                }
                if (!empty($options['firstFieldIsPK']) && $options['firstFieldIsPK'] === true) {
                    $results_data[reset($row_filtered)] = $row_filtered;
                } else {
                    $results_data[] = $row_filtered;
                }
            }


            return $results_data;
        }

        return false;

    }

    /*
     * Filters and cleans a var for entry into DB. Also adds quotes for strings.
     */
    private static function filter_var_input($var, $type, $escape_wildcards = false) {

        set_time_limit(4);
        if (!in_array($type, self::$datatypes)) {
            throw new \Exception('datatype "' . $type . '" not supported');
        }

        if ($type === 'i') {
            return intval($var);
        }else if ($type === 'z') {
            if (!is_array($var)) {
                throw new \Exception('datatype "z" expects an array');
            }
            for ($i = 0; $i < sizeof($var); $i++) {
                $var[$i] = intval($var[$i]);
            }
            return '(' . implode(',', $var) . ')';
        } else if ($type === 's') {
            $var = mysqli_real_escape_string(self::$conn, $var);
            $var = htmlspecialchars($var, ENT_QUOTES);
            if (!empty($escape_wildcards)) {

                if ($escape_wildcards === 'w' || $escape_wildcards === 'l') {

                    $var = str_replace('[', '\\[', $var);
                    $var = str_replace(']', '\\]', $var);
                    $var = str_replace('%', '\\%', $var);
                    $var = str_replace('_', '\\_', $var);
                }
                if ($escape_wildcards === 'l') {
                    $var = '%' . $var . '%';
                }
            }

            return '"' . $var . '"';
        } else if ($type === 'x') {
            if (!is_array($var)) {
                throw new \Exception('datatype "x" expects an array');
            }
            for ($i = 0; $i < sizeof($var); $i++) {
                $var[$i] = mysqli_real_escape_string(self::$conn, $var[$i]);
                $var[$i] = htmlspecialchars($var[$i], ENT_QUOTES);
                $var[$i] = '"' . $var[$i] . '"';
            }

            return '(' . implode(',', $var) . ')';

        } else if ($type === 'b') {
            if (empty($var) || $var === 'false') {
                return "false";
            } else {
                return "true";
            }
        } else if ($type === 'f') {
            if (!is_numeric($var)) {
                throw new \Exception('filter_var - invalid float value');
            }
            return floatval($var);
        }

        throw new \Exception('filter_var ended without converting the variable');
    }

    /*
     * Filters and cleans a var for output to view.
     */
    private static function filter_var_output($var) {
        $var = htmlspecialchars_decode($var, ENT_QUOTES);
        return $var;
    }

    /*
     * Returns true for connected, false for not connected
     */
    public static function getConnectionStatus() {
        return !self::$connection_failed;
    }
}
