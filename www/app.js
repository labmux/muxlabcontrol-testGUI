var app = angular.module('uiBootstrap', ['ui.bootstrap']);

angular.module('uiBootstrap').factory('TestServerAPIService', ['$q', '$http', function TestServerAPIServiceFactory ($q, $http) {

    var api_root = 'http://192.168.168.100/api';

    /**
     * Note that any of the api calls below may fail, and you are responsible for checking for that and showing the user the failure message if applicable.
     * When a call fails, it will return {status: 'error', message: string}
     */
    return {
        /**
         * Returns array of strings representing the different app versions available for testing
         * @returns {HttpPromise}
         */
        getMuxLabControlAppVersions: function () {
            return $http.get(api_root + '/muxlabcontrol/app-versions');
        },
        /**
         * Returns array of strings representing the different MNC versions available for testing or instantiating
         * @returns {HttpPromise}
         */
        getAvailableMNCVersions: function () {
            return $http.get(api_root + '/mnc/available-versions');
        },

        /**
         * Returns a list of MNC Virtual Machines that have been created
         * @returns {HttpPromise}
         */
        getMNCVirtualMachines: function () {
            return $http.get(api_root + '/mnc');
        },
        /**
         * Create a new MNC Virtual Machine. Returns {status => 'success' | 'error', name => 'TheNameYouProvided', id => UniqueGeneratedID, ip_address => 'string'}
         * This will automatically start the VM, so no need to call startMNCVirtualMachine below
         * @param name
         * @param mncVersion
         * @returns {HttpPromise}
         */
        createMNCVirtualMachine: function (name, mncVersion) {
            return $http.post(api_root + '/mnc', {
                name: name,
                mnc_version: mncVersion
            });
        },
        /**
         * Deletes an MNC Virtual Machine provided its ID (you can get the ID from getMNCVirtualMachines above)
         * @param mncID
         * @returns {HttpPromise}
         */
        deleteMNCVirtualMachine: function (mncID) {
            return $http.delete(api_root + '/mnc/' + mncID);
        },
        /**
         * Starts an MNC Virtual Machine in case it was stopped by SSH or by calling the stop function below. This effectively
         * boots up the VM.
         * @param mncID
         * @returns {HttpPromise}
         */
        startMNCVirtualMachine: function (mncID) {
            return $http.get(api_root + '/mnc/' + mncID + '/start');
        },
        /**
         * Stops a running MNC Virtual Machine, do this when you're done testing for the day but not ready to delete the VM. this will free up some RAM.
         * This effectively shuts down the VM.
         * @param mncID
         * @returns {HttpPromise}
         */
        stopMNCVirtualMachine: function (mncID) {
            return $http.get(api_root + '/mnc/' + mncID + '/stop');
        },


        /**
         * Returns the list of test suites that were created. Run this function every second or so to get status updates.
         * Returns {id: int, name: string, timestamp_created: timestamp, status: string, results_download_link: string}
         * @returns {HttpPromise}
         */
        getTestSuites: function () {
            return $http.get(api_root + '/test-suites');
        },

        /**
         * Creates a new test suite. Specify an array of version numbers and app versions to test, as well as a name for your test suite
         * and optionally an update file which will be used to update the 811 before each test run. Remember to run getMNCVirtualMachines after this to update your
         * list of VMs
         * @param name
         * @param mncVersions
         * @param appVersions
         * @param updateFile
         * @param specs
         * @returns {HttpPromise}
         */
        createTestSuite: function (name, mncVersions, appVersions, fd, specs) {
            if (typeof fd === 'undefined') {
                fd = {};
            }

            fd.append('name', name);
            fd.append('mnc_versions', mncVersions);
            fd.append('app_versions', appVersions);
            fd.append('specs', specs);

            return $http.post(api_root + '/test-suites', fd, {
                withCredentials: true,
                headers: {'Content-Type': undefined },
                transformRequest: angular.identity
            });
        },

        /**
         * Deletes a test suite. User will do this when he ran his test, downloaded his results and doesn't need it anymore
         * @param testSuiteID
         * @returns {HttpPromise}
         */
        deleteTestSuite: function (testSuiteID) {
            return $http.delete(api_root + '/test-suites/' + testSuiteID);
        },

        /**
         * Returns a list of all the different test specs
         * @returns {HttpPromise}
         */
        getTestSpecs: function () {
            return $http.get(api_root + '/test-specs')
        }

    };
}]);
