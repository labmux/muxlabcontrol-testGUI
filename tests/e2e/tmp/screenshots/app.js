var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "should choose first device|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6eb17b67bfe1741da801bd5d11ced999",
        "instanceId": 34649,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7018ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7018ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:33:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should choose first device\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553621346897,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1553621347124,
                "type": ""
            }
        ],
        "screenShotFile": "008c0022-00ae-0053-00de-005500290077.png",
        "timestamp": 1553621346160,
        "duration": 13754
    },
    {
        "description": "should choose first device|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ba7a20f842ba0d9236010f1e8b34db1f",
        "instanceId": 34712,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553621376806,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1553621377031,
                "type": ""
            }
        ],
        "screenShotFile": "003c00c1-008a-0019-000c-00a300f90051.png",
        "timestamp": 1553621376176,
        "duration": 11470
    },
    {
        "description": "should choose second device|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ba7a20f842ba0d9236010f1e8b34db1f",
        "instanceId": 34712,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a50033-008c-009d-00f5-003a00370008.png",
        "timestamp": 1553621388474,
        "duration": 9791
    },
    {
        "description": "should add location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ba7a20f842ba0d9236010f1e8b34db1f",
        "instanceId": 34712,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "000c0049-00be-00e7-0048-0028009300d3.png",
        "timestamp": 1553621398977,
        "duration": 10322
    },
    {
        "description": "should delete location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ba7a20f842ba0d9236010f1e8b34db1f",
        "instanceId": 34712,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00bb0017-002f-00ec-00e1-009f009b005b.png",
        "timestamp": 1553621410174,
        "duration": 10619
    },
    {
        "description": "should add location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "afdcfc15cfb6e27d0fdac65b9a435d05",
        "instanceId": 35138,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553621724398,
                "type": ""
            }
        ],
        "screenShotFile": "00d900bd-00c3-00f1-0040-005c008300cb.png",
        "timestamp": 1553621723769,
        "duration": 11500
    },
    {
        "description": "should delete location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "afdcfc15cfb6e27d0fdac65b9a435d05",
        "instanceId": 35138,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0046001f-00d3-00f8-0085-004e004500b3.png",
        "timestamp": 1553621736208,
        "duration": 10318
    },
    {
        "description": "should add location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8fddb6758956882f17e56aaac9db8daa",
        "instanceId": 35655,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553622223383,
                "type": ""
            }
        ],
        "screenShotFile": "000a00fa-006b-005e-00ca-007900ae00ff.png",
        "timestamp": 1553622222775,
        "duration": 11284
    },
    {
        "description": "should delete location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8fddb6758956882f17e56aaac9db8daa",
        "instanceId": 35655,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0069001d-0026-0014-0085-00e3008700f1.png",
        "timestamp": 1553622234989,
        "duration": 10094
    },
    {
        "description": "should add location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b3fb6b0f4b167130bd0dd469e6fb419c",
        "instanceId": 35772,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553622317247,
                "type": ""
            }
        ],
        "screenShotFile": "006900ec-00b6-0068-0089-00e2006c00a7.png",
        "timestamp": 1553622316645,
        "duration": 11479
    },
    {
        "description": "should delete location|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b3fb6b0f4b167130bd0dd469e6fb419c",
        "instanceId": 35772,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a60096-00a2-005e-007e-004d00d900e6.png",
        "timestamp": 1553622329055,
        "duration": 10262
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a44e45f86d66f4f98a489903fbf21491",
        "instanceId": 37388,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Angular could not be found on the page http://192.168.168.85/mnc/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page http://192.168.168.85/mnc/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at executeAsyncScript_.then (/usr/local/lib/node_modules/protractor/built/browser.js:720:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553623852787,
                "type": ""
            }
        ],
        "screenShotFile": "00d000d1-0068-006b-00bb-0051006700f5.png",
        "timestamp": 1553623852144,
        "duration": 11646
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "58419f26e898ff4024bf7e11b9e4a220",
        "instanceId": 37565,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Angular could not be found on the page http://192.168.168.85/mnc/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page http://192.168.168.85/mnc/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at executeAsyncScript_.then (/usr/local/lib/node_modules/protractor/built/browser.js:720:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624000157,
                "type": ""
            }
        ],
        "screenShotFile": "004a009a-00f9-0071-0081-00ed0082001c.png",
        "timestamp": 1553623999579,
        "duration": 11485
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8141caaedb874b138e11c6352ccc7058",
        "instanceId": 37708,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624096833,
                "type": ""
            }
        ],
        "screenShotFile": "000b00b8-0098-008e-00bb-00ad008100e7.png",
        "timestamp": 1553624096276,
        "duration": 1565
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b4281221fec33af119094c8328120542",
        "instanceId": 38442,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624719673,
                "type": ""
            }
        ],
        "screenShotFile": "00c10019-00fe-00bd-0050-008b002800ed.png",
        "timestamp": 1553624719107,
        "duration": 800
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c6f749f7c4c0e0d107809ea135642255",
        "instanceId": 38556,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624808257,
                "type": ""
            }
        ],
        "screenShotFile": "002c004f-0075-00f3-0041-004f00dc000c.png",
        "timestamp": 1553624807689,
        "duration": 804
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c3fa9b2fcd61d7ccb8660f158778c886",
        "instanceId": 38615,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624839653,
                "type": ""
            }
        ],
        "screenShotFile": "004a0060-006d-0011-00f5-00bf00330008.png",
        "timestamp": 1553624839055,
        "duration": 854
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "fdef7de3c40fff95b3179eea46c8618d",
        "instanceId": 38684,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624881589,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1553624881794,
                "type": ""
            }
        ],
        "screenShotFile": "00f20060-0060-003a-00a4-00ec0063008f.png",
        "timestamp": 1553624881007,
        "duration": 819
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f9f19f95a226e7d08b5d6ade93f25808",
        "instanceId": 38761,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624924979,
                "type": ""
            }
        ],
        "screenShotFile": "00620089-00eb-00e8-000f-00f900e300cf.png",
        "timestamp": 1553624924388,
        "duration": 1757
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7a7d5cc5fea424d80420a47383eeb7b5",
        "instanceId": 38811,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553624945026,
                "type": ""
            }
        ],
        "screenShotFile": "00ef000a-0070-00a5-00f9-004f003f0098.png",
        "timestamp": 1553624944442,
        "duration": 844
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "322e4581037f362e3a0d7b8b0be7a309",
        "instanceId": 38909,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625008889,
                "type": ""
            }
        ],
        "screenShotFile": "00aa0053-007f-000e-00c3-001c00db00f8.png",
        "timestamp": 1553625008324,
        "duration": 909
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "708e3f155e3093190b02a216d9a92e1c",
        "instanceId": 39248,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"div#nav a:nth-child(0)\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"div#nav a:nth-child(0)\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, div#nav a:nth-child(0)))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:70)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625325061,
                "type": ""
            }
        ],
        "screenShotFile": "00920020-001b-00bd-00de-0045002000b7.png",
        "timestamp": 1553625324467,
        "duration": 2293
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "2859ed46f4e20faf2fce19c447349b24",
        "instanceId": 39308,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"div #nav a:nth-child(0)\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"div #nav a:nth-child(0)\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, div #nav a:nth-child(0)))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:71)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625359844,
                "type": ""
            }
        ],
        "screenShotFile": "003b005c-0036-0061-0042-00fe0048005d.png",
        "timestamp": 1553625359263,
        "duration": 1770
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ebd63b87969a3eab38bba3f8ed959de9",
        "instanceId": 39466,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"xpath\",\"selector\":\"//div[contains(text(), \"Products\")]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"xpath\",\"selector\":\"//div[contains(text(), \"Products\")]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(xpath, //div[contains(text(), \"Products\")]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:85)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625486996,
                "type": ""
            }
        ],
        "screenShotFile": "002e000c-00b9-00fb-0001-00520087004a.png",
        "timestamp": 1553625486426,
        "duration": 1541
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "11a450f400ae065d0fb9ac86535e2f27",
        "instanceId": 39527,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625520430,
                "type": ""
            }
        ],
        "screenShotFile": "009e0010-007e-00ee-007e-006a006e00b1.png",
        "timestamp": 1553625519815,
        "duration": 855
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4d4ac146f4e498738acf354dc50a6ffa",
        "instanceId": 39578,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Invalid locator"
        ],
        "trace": [
            "TypeError: Invalid locator\n    at Object.check [as checkedLocator] (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:275:9)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1007:18)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625541888,
                "type": ""
            }
        ],
        "screenShotFile": "0014007a-00df-00dd-00ef-00330024005e.png",
        "timestamp": 1553625541318,
        "duration": 799
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "65e1c24e1cc1edeb84357f40ed3f251c",
        "instanceId": 39620,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (/usr/local/lib/node_modules/protractor/built/browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:40:73)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625559296,
                "type": ""
            }
        ],
        "screenShotFile": "00a300c9-0013-00b5-005f-00a800f600c9.png",
        "timestamp": 1553625558733,
        "duration": 1659
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "47c90184418dc0c51dc8a98757e2de57",
        "instanceId": 39679,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553625586213,
                "type": ""
            }
        ],
        "screenShotFile": "008e00b5-00cb-0094-0001-00d900f2001a.png",
        "timestamp": 1553625585600,
        "duration": 1892
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ab166c3cf2b22d05d4b5ab9db33853d2",
        "instanceId": 39959,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: javascript error: Cannot read property 'indexOf' of null\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "JavascriptError: javascript error: Cannot read property 'indexOf' of null\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.executeScript()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.executeScript (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:878:16)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:191:35\n    at call (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1068:28)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: WebDriver.call(function)\n    at thenableWebDriverProxy.call (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:901:23)\n    at thenableWebDriverProxy.findElementsInternal_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1068:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1043:19)\n    at Object.findElementsOverride (/usr/local/lib/node_modules/protractor/built/locators.js:384:31)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:156:40)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:23:80)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:8:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:7:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00fd00b7-00a1-00bb-005e-00e6008700c6.png",
        "timestamp": 1553625804279,
        "duration": 1264
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "46c5644f5949f2fcea97981f91fc2dd4",
        "instanceId": 40125,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"localized\", \"Add Device\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"localized\", \"Add Device\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:24:66)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:8:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:7:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008500d5-00ee-0090-0050-00ce0047003d.png",
        "timestamp": 1553625945124,
        "duration": 1359
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e0d7494c93b7035fba18d36556b8d7eb",
        "instanceId": 40238,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00df001e-001e-00b6-0057-004500b900bf.png",
        "timestamp": 1553626030075,
        "duration": 1996
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7aa0fc2f706e6e6547757b57a3307b8b",
        "instanceId": 40364,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, *[name=\"customname\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[name=\"customname\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:34:40)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:8:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:7:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d100db-0004-0013-0029-00d5006c0086.png",
        "timestamp": 1553626121666,
        "duration": 2418
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "2a0374bad9305adbb29b73069f6fd9fb",
        "instanceId": 40419,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fd00e3-00f1-0048-00d4-00e200ac0043.png",
        "timestamp": 1553626150301,
        "duration": 2565
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "31d80becdebe14b77e1c26e051b70ea9",
        "instanceId": 40646,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "StaleElementReferenceError: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:8:53)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:33:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:16:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:15:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0007009c-00a0-00f4-0091-00ac003c007b.png",
        "timestamp": 1553626336148,
        "duration": 2350
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "d276a76f87f1e0ea3f59d3ad80199244",
        "instanceId": 41302,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, *[name=\"SelectDevice\\:nth-child\\(0\\)\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[name=\"SelectDevice\\:nth-child\\(0\\)\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:15:51)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:40:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:33:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:32:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00580011-00c0-00d1-009e-00580076002f.png",
        "timestamp": 1553626943105,
        "duration": 2271
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "db7b590713fddbf435d510badc72471d",
        "instanceId": 41380,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, td button #SelectDevice:nth-child(0))"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, td button #SelectDevice:nth-child(0))\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:15:61)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:40:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:33:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:32:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00cf0023-0072-00f4-006d-00c4005700d6.png",
        "timestamp": 1553626990518,
        "duration": 1963
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "45da210ac784889bee43ea73db91ce1c",
        "instanceId": 41605,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Alert is not getting present :(\nWait timed out after 5003ms"
        ],
        "trace": [
            "TimeoutError: Alert is not getting present :(\nWait timed out after 5003ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Alert is not getting present :(\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:17:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:40:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:33:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:32:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d50043-00c1-0019-00f0-0045003f00ac.png",
        "timestamp": 1553627193859,
        "duration": 7106
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "45da210ac784889bee43ea73db91ce1c",
        "instanceId": 41605,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627202277,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627202286,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627202322,
                "type": ""
            }
        ],
        "screenShotFile": "00cf001f-0074-0002-00b2-006300d700a3.png",
        "timestamp": 1553627201469,
        "duration": 1453
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "45ee7ad7f7b8492ff76adc9eaa7b7874",
        "instanceId": 41727,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at TargetLocator.alert (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1862:29)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:16:24)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:38:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:30:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005f007c-00d7-00b6-0075-00b8000f00ee.png",
        "timestamp": 1553627264679,
        "duration": 2124
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "45ee7ad7f7b8492ff76adc9eaa7b7874",
        "instanceId": 41727,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627268034,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627268034,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627268035,
                "type": ""
            }
        ],
        "screenShotFile": "002b00a3-0035-0085-0035-006400e30035.png",
        "timestamp": 1553627267294,
        "duration": 1296
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cba44d35377a063fce1299acb078eb1",
        "instanceId": 41776,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, *[id=\"id_in_productCodeSelected\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"id_in_productCodeSelected\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:8:49)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:41:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:33:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:32:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00660065-006b-002f-0083-00ba00560058.png",
        "timestamp": 1553627284224,
        "duration": 3236
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cba44d35377a063fce1299acb078eb1",
        "instanceId": 41776,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1553627288705,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627288760,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627288772,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627288775,
                "type": ""
            }
        ],
        "screenShotFile": "00fb000a-0066-0045-0062-00cd003c000f.png",
        "timestamp": 1553627287986,
        "duration": 1336
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "02a580c5b47c41f294f99de4a7b8aed6",
        "instanceId": 41991,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Alert is not getting present :(\nWait timed out after 5002ms"
        ],
        "trace": [
            "TimeoutError: Alert is not getting present :(\nWait timed out after 5002ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Alert is not getting present :(\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:17:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:43:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:35:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f60053-0050-0030-0044-003e00a50005.png",
        "timestamp": 1553627464909,
        "duration": 7157
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "02a580c5b47c41f294f99de4a7b8aed6",
        "instanceId": 41991,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627473311,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627473328,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627473337,
                "type": ""
            }
        ],
        "screenShotFile": "006300be-004b-00df-0006-000400130052.png",
        "timestamp": 1553627472546,
        "duration": 1484
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5969f1282292194b858ea573d0b8fd1c",
        "instanceId": 42058,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, *[id=\"id_in_productCodeSelected\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"id_in_productCodeSelected\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:8:49)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:35:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0047001e-00e0-0044-0006-001200ab00f3.png",
        "timestamp": 1553627508322,
        "duration": 2418
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5969f1282292194b858ea573d0b8fd1c",
        "instanceId": 42058,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627511967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627511973,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627511974,
                "type": ""
            }
        ],
        "screenShotFile": "004c0096-0006-00e5-0079-001b002400d2.png",
        "timestamp": 1553627511273,
        "duration": 1139
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dbe2c0e8e59897272f0b522bc6de5583",
        "instanceId": 42440,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Alert is not getting present :(\nWait timed out after 5001ms"
        ],
        "trace": [
            "TimeoutError: Alert is not getting present :(\nWait timed out after 5001ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Alert is not getting present :(\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:17:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:43:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:35:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004700d1-0016-002f-00e5-00b0004b00ad.png",
        "timestamp": 1553627845006,
        "duration": 7137
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dbe2c0e8e59897272f0b522bc6de5583",
        "instanceId": 42440,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627853345,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627853354,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627853355,
                "type": ""
            }
        ],
        "screenShotFile": "000700a4-00b9-00f5-00d6-009100110003.png",
        "timestamp": 1553627852633,
        "duration": 1346
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "194fbbe6eb0db67a95d4e16438f20362",
        "instanceId": 42501,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Alert is not getting present :(\nWait timed out after 10000ms"
        ],
        "trace": [
            "TimeoutError: Alert is not getting present :(\nWait timed out after 10000ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Alert is not getting present :(\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:17:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:43:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:35:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00560091-0078-00f9-0002-00d500400015.png",
        "timestamp": 1553627875961,
        "duration": 12192
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "194fbbe6eb0db67a95d4e16438f20362",
        "instanceId": 42501,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627889649,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627889649,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627889659,
                "type": ""
            }
        ],
        "screenShotFile": "00b100af-0015-00e6-0059-006e00330020.png",
        "timestamp": 1553627888911,
        "duration": 1392
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dd83edc820c33e40cc30226137b29f3c",
        "instanceId": 42579,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait condition must be a promise-like object, function, or a Condition object"
        ],
        "trace": [
            "TypeError: Wait condition must be a promise-like object, function, or a Condition object\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:928:13)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:16:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f300dd-006d-00fb-00ef-009d0082004e.png",
        "timestamp": 1553627921353,
        "duration": 20
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dd83edc820c33e40cc30226137b29f3c",
        "instanceId": 42579,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627922458,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627922459,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627922466,
                "type": ""
            }
        ],
        "screenShotFile": "00e90071-00c1-009d-00ed-007100970027.png",
        "timestamp": 1553627921784,
        "duration": 1872
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "088cce6189b2796fd6f8c62bcc5a4f2e",
        "instanceId": 42671,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "StaleElementReferenceError: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:17:38)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e50007-0001-000b-0055-00c600bc00d0.png",
        "timestamp": 1553627987232,
        "duration": 2272
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "088cce6189b2796fd6f8c62bcc5a4f2e",
        "instanceId": 42671,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627990773,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627990774,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553627990776,
                "type": ""
            }
        ],
        "screenShotFile": "00db0071-00ec-004b-0020-00a6009c0068.png",
        "timestamp": 1553627990042,
        "duration": 1077
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "82846672b72716b9aa409bd891035640",
        "instanceId": 42713,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "StaleElementReferenceError: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:17:38)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:46:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e20003-0078-004b-00d2-00c1002800b6.png",
        "timestamp": 1553628002857,
        "duration": 4084
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "82846672b72716b9aa409bd891035640",
        "instanceId": 42713,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553628008197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553628008210,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553628008210,
                "type": ""
            }
        ],
        "screenShotFile": "003b007c-0030-00c9-0028-002c00710059.png",
        "timestamp": 1553628007487,
        "duration": 1252
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4cd0008cd6b047a64833823785cdf5dc",
        "instanceId": 42808,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c00092-003a-00e3-00c5-007100090013.png",
        "timestamp": 1553628061441,
        "duration": 5001
    },
    {
        "description": "should create mnc devices|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4cd0008cd6b047a64833823785cdf5dc",
        "instanceId": 42808,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "NoSuchElementError: no such element: Unable to locate element: {\"method\":\"css selector\",\"selector\":\"*[name=\"p_userName\"]\"}\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElement(By(css selector, *[name=\"p_userName\"]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElement (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1014:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElementPromise.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElementPromise.sendKeys (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:37:59)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:31:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/presentation.js:25:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553628067694,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553628067695,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1553628067706,
                "type": ""
            }
        ],
        "screenShotFile": "0053008e-003f-009b-0011-00110040006e.png",
        "timestamp": 1553628066986,
        "duration": 1131
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a389c109878ba812987a5f807784766e",
        "instanceId": 42999,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00460027-0049-00a6-00c5-00e100060010.png",
        "timestamp": 1553628213249,
        "duration": 4298
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "2ca8dfd22760a75881b5dc7eaef98e9d",
        "instanceId": 43152,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00870018-00d4-004e-0040-0074006b00d8.png",
        "timestamp": 1553628321866,
        "duration": 4277
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a5f06aa328faacaee0dee6d6f83d7fd5",
        "instanceId": 43402,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 5008ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5008ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:16:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f9002a-00d7-0080-003b-0047000300a7.png",
        "timestamp": 1553628513856,
        "duration": 7069
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "d9c966b206b572cff15e12c48ddb7ae3",
        "instanceId": 43449,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 8009ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 8009ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:16:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00b0008a-00fb-0016-0080-001d00b8003d.png",
        "timestamp": 1553628533546,
        "duration": 9897
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "01182003ce16842bfe365575632fae1e",
        "instanceId": 43532,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d300d6-0070-00df-00bc-006f00230004.png",
        "timestamp": 1553628583920,
        "duration": 4425
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "fee01332881acbb349396c1c0d622ee3",
        "instanceId": 43603,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003a0043-0079-0088-00c8-007f001b00fc.png",
        "timestamp": 1553628629752,
        "duration": 4707
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ead5c623db8a6cb55e94ece900188297",
        "instanceId": 43734,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0003007f-001a-00a4-0005-0022005d00c7.png",
        "timestamp": 1553628722180,
        "duration": 4563
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b88f2ac182f4379f2a1d0a08534d3e23",
        "instanceId": 43858,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElements(By(css selector, #automatic_setup input[value=Launch discovery]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:159:44)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:71)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000b008d-00e7-0024-0098-002a00d4004a.png",
        "timestamp": 1553628815413,
        "duration": 2458
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "fff5bdec1a03f85590b2af58c01d4889",
        "instanceId": 43931,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElements(By(css selector, .discovery input[value=Launch discovery]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:159:44)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:65)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008600e2-00c9-008e-0027-00b2005a00ea.png",
        "timestamp": 1553628866287,
        "duration": 2423
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c762479a31afa04933025bb83d703cb8",
        "instanceId": 43984,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "StaleElementReferenceError: stale element reference: element is not attached to the page document\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:17:38)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00af00c8-00d0-0004-00ef-00c300e700fd.png",
        "timestamp": 1553628890454,
        "duration": 2092
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c8a7e8bda50d7079425a9634b8da6d97",
        "instanceId": 44019,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElements(By(css selector, .clear input[value=Launch discovery]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:159:44)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:61)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004200cb-0059-006b-00ad-00a0001600a7.png",
        "timestamp": 1553628901170,
        "duration": 2487
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "910e42f5c593054d5139011da2c477ba",
        "instanceId": 44094,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElements(By(css selector, .clear .discovery input[value=Launch discovery]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:159:44)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:72)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006700eb-00dd-006e-00f1-003700080055.png",
        "timestamp": 1553628941280,
        "duration": 2445
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53031951a40c6d9cf2a198b7f24332f0",
        "instanceId": 44157,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.findElements(By(css selector, #automatic_setup input[value=Launch discovery]))\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1048:19)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:159:44)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:71)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00420083-0094-005c-001f-00cf00cc00f0.png",
        "timestamp": 1553628975330,
        "duration": 2566
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c0bd24259909a4c88bdfe6bff32e712a",
        "instanceId": 44266,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@id='partSelection']/button[@value='Launch discovery'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@id='partSelection']/button[@value='Launch discovery'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:87)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d00072-00d8-00ae-00ed-00b6003600d9.png",
        "timestamp": 1553629056982,
        "duration": 2530
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ab69dae99f84ed023e3f457d64947085",
        "instanceId": 44473,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element.find_element_by_css_selector is not a function"
        ],
        "trace": [
            "TypeError: element.find_element_by_css_selector is not a function\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:13)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00020012-000a-0038-008d-007d00dd00d2.png",
        "timestamp": 1553629216853,
        "duration": 22
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "67d0ce6d3170281daa8d502ec034d9d7",
        "instanceId": 44509,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: driver is not defined"
        ],
        "trace": [
            "ReferenceError: driver is not defined\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:5)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e2005b-006b-0053-000c-00b50048006c.png",
        "timestamp": 1553629230741,
        "duration": 19
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ab8bea3995fc5933135be1b2f082003f",
        "instanceId": 44575,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:61)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0086008f-0035-000f-00fd-00c3004800aa.png",
        "timestamp": 1553629269735,
        "duration": 2537
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "017656571bbcca26512892b8542a9856",
        "instanceId": 44690,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .discovery [value='Launch discovery'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .discovery [value='Launch discovery'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:62)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e600b2-006d-0067-0070-009200fe006b.png",
        "timestamp": 1553629366902,
        "duration": 2779
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c77aabf60f4a97fdba96bae3a8555f86",
        "instanceId": 44795,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\".discovery\", \"input[value='Launch discovery']\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\".discovery\", \"input[value='Launch discovery']\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:84)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005a002d-007a-0031-00c4-000000e70039.png",
        "timestamp": 1553629438846,
        "duration": 2512
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8390f0b588c2d82305a167287c57acd9",
        "instanceId": 45028,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .discovery input[value='Launch discovery'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .discovery input[value='Launch discovery'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:67)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00680076-00b2-005a-000c-00ee00c0005b.png",
        "timestamp": 1553630030832,
        "duration": 2693
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4c3290eb7a72ff3ec4633c9ba8f6defc",
        "instanceId": 45097,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .discovery input[type='button'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .discovery input[type='button'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:56)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d80029-00b9-004c-0018-00b100100097.png",
        "timestamp": 1553630062867,
        "duration": 2662
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9dd0d5e162140b395bc650cdff624435",
        "instanceId": 45166,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .localized input[type='button'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .localized input[type='button'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:56)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004d0045-0047-0065-00bf-004d001f0054.png",
        "timestamp": 1553630096359,
        "duration": 3111
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "57114a723662c1b57e568003cc3c5cc0",
        "instanceId": 45367,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:45)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007a00a4-009c-0031-008c-00da00eb00f6.png",
        "timestamp": 1553630192948,
        "duration": 3111
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "84ab300ed1b149537e972b03cb2f82f7",
        "instanceId": 45432,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .discovery.localized input)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .discovery.localized input)\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:51)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0083004e-00b8-000c-00b5-00ff0026002c.png",
        "timestamp": 1553630225500,
        "duration": 3703
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "d60a160375034626f22dee45c8c5cad5",
        "instanceId": 45496,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .discovery.localized input[value='discovery Launch'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .discovery.localized input[value='discovery Launch'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:77)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00700036-0080-0005-0027-0061003000cb.png",
        "timestamp": 1553630260458,
        "duration": 3971
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "3224fd8d3c0c20c7df28589e1f59da71",
        "instanceId": 45544,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, input[value='discovery Launch'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, input[value='discovery Launch'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:56)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008d005a-0057-00da-008b-0056005500c0.png",
        "timestamp": 1553630279536,
        "duration": 4276
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "2e5b3294bb8203078c7f9ab6d038c181",
        "instanceId": 45591,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .discovery.localized input[value='Launch discovery'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .discovery.localized input[value='Launch discovery'])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:77)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d600c1-00ab-0046-00c6-004a00eb00cf.png",
        "timestamp": 1553630297968,
        "duration": 3078
    },
    {
        "description": "should create mnc devices|Add Mnc Devices",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "2f2bad429e3c774948c77e71e04ebf8b",
        "instanceId": 45633,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at addDevice (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:22:56)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:44:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create mnc devices\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:37:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:36:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000700ab-00d3-0010-00d2-00590096009b.png",
        "timestamp": 1553630313113,
        "duration": 2757
    },
    {
        "description": "should create a 754 product family|Add Mnc Device families",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "eee646a0fa1882ba1491c064d2eda37f",
        "instanceId": 50836,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: No element found using locator: By(css selector, *[name=\"p_userName\"])",
            "Failed: No element found using locator: by.cssContainingText(\".access_controlled\", \"Products\")"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at listOnTimeout (timers.js:324:15)\n    at processTimers (timers.js:268:5)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at listOnTimeout (timers.js:324:15)\n    at processTimers (timers.js:268:5)",
            "NoSuchElementError: No element found using locator: By(css selector, *[name=\"p_userName\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at signIn (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:43:36)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:65:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeAll in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at UserContext.fn (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5325:13)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at queueRunnerFactory (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:61:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:59:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "NoSuchElementError: No element found using locator: by.cssContainingText(\".access_controlled\", \"Products\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at goToProducts (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:52:76)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:81:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create a 754 product family\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:59:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ff00da-00c0-0028-0063-0070008200d8.png",
        "timestamp": 1554736787804,
        "duration": 45673
    },
    {
        "description": "should create a 762/763 product family|Add Mnc Device families",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "eee646a0fa1882ba1491c064d2eda37f",
        "instanceId": 50836,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: No element found using locator: by.cssContainingText(\".access_controlled\", \"Products\")"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at listOnTimeout (timers.js:324:15)\n    at processTimers (timers.js:268:5)",
            "NoSuchElementError: No element found using locator: by.cssContainingText(\".access_controlled\", \"Products\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at goToProducts (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:52:76)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:88:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should create a 762/763 product family\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:87:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/deviceMnc-spec.js:59:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0073008f-00d6-00b0-0064-0012004600fc.png",
        "timestamp": 1554736834109,
        "duration": 17
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8edc8e874f15f3722c0e7508c0d9fb93",
        "instanceId": 51310,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/setup/version-ip'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:22:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554737336890,
                "type": ""
            }
        ],
        "screenShotFile": "00a400ce-0019-0015-00b7-007f007e0092.png",
        "timestamp": 1554737336217,
        "duration": 6073
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8edc8e874f15f3722c0e7508c0d9fb93",
        "instanceId": 51310,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/auth/login'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:27:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554737343628,
                "type": ""
            }
        ],
        "screenShotFile": "0056003a-00ee-005e-00e0-000100b2005a.png",
        "timestamp": 1554737342820,
        "duration": 11722
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8edc8e874f15f3722c0e7508c0d9fb93",
        "instanceId": 51310,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7018ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7018ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:42:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Devices\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:40:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554737355788,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.85/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554737363512,
                "type": ""
            }
        ],
        "screenShotFile": "004e009d-00ee-0036-00ea-0062002900a7.png",
        "timestamp": 1554737355005,
        "duration": 15539
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8edc8e874f15f3722c0e7508c0d9fb93",
        "instanceId": 51310,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7009ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7009ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:65:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Settings\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:64:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ef00ae-006b-00ff-004b-0087001b0080.png",
        "timestamp": 1554737371168,
        "duration": 7968
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ef297924d3514cf270d2586b1f8aefb",
        "instanceId": 51633,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554737727933,
                "type": ""
            }
        ],
        "screenShotFile": "003e007c-00bd-0076-00a2-0020005300e5.png",
        "timestamp": 1554737727252,
        "duration": 5944
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ef297924d3514cf270d2586b1f8aefb",
        "instanceId": 51633,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554737734619,
                "type": ""
            }
        ],
        "screenShotFile": "006200ca-0057-00cc-002a-00c200ec000e.png",
        "timestamp": 1554737733727,
        "duration": 7467
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ef297924d3514cf270d2586b1f8aefb",
        "instanceId": 51633,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7011ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7011ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:41:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Devices\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:40:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006f00c6-002c-005e-001d-009a00760016.png",
        "timestamp": 1554737741653,
        "duration": 7907
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ef297924d3514cf270d2586b1f8aefb",
        "instanceId": 51633,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006000db-00fc-0068-00e4-000c00c500c5.png",
        "timestamp": 1554737750017,
        "duration": 7744
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "003ec1766d778fe2c4ddca006f04b724",
        "instanceId": 51696,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554737778350,
                "type": ""
            }
        ],
        "screenShotFile": "004e0070-0011-003c-00b0-006e00b800a0.png",
        "timestamp": 1554737777353,
        "duration": 10893
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "003ec1766d778fe2c4ddca006f04b724",
        "instanceId": 51696,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554737791615,
                "type": ""
            }
        ],
        "screenShotFile": "00b600d9-00f0-001d-00f8-00a60047003c.png",
        "timestamp": 1554737789432,
        "duration": 10100
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "003ec1766d778fe2c4ddca006f04b724",
        "instanceId": 51696,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7321ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7321ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:41:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Devices\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:40:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008d00e4-00fb-0021-0081-00ae00ef005e.png",
        "timestamp": 1554737800030,
        "duration": 8267
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "003ec1766d778fe2c4ddca006f04b724",
        "instanceId": 51696,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <i class=\"icon icon-brandify-settings\" ng-if=\"getIcon()\"></i> is not clickable at point (825, 529). Other element would receive the click: <div class=\"row\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <i class=\"icon icon-brandify-settings\" ng-if=\"getIcon()\"></i> is not clickable at point (825, 529). Other element would receive the click: <div class=\"row\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToSettings (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:77:21)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:66:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should click \"Settings\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:64:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d80058-008b-00dc-0018-0082007700e1.png",
        "timestamp": 1554737808918,
        "duration": 15497
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4c5087d1d39e2ad70e3d57a55e4fac3f",
        "instanceId": 51869,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554737977677,
                "type": ""
            }
        ],
        "screenShotFile": "006000a7-00f2-0088-00d6-002e003b0034.png",
        "timestamp": 1554737977007,
        "duration": 5966
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4c5087d1d39e2ad70e3d57a55e4fac3f",
        "instanceId": 51869,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554737984400,
                "type": ""
            }
        ],
        "screenShotFile": "00af0031-0090-00ed-0032-0008005900b8.png",
        "timestamp": 1554737983496,
        "duration": 7354
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4c5087d1d39e2ad70e3d57a55e4fac3f",
        "instanceId": 51869,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7013ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7013ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:41:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Devices\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:40:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "001b0041-004d-009d-008f-002800020095.png",
        "timestamp": 1554737991303,
        "duration": 7831
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4c5087d1d39e2ad70e3d57a55e4fac3f",
        "instanceId": 51869,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003a007d-0012-00ed-0008-007100ab00ea.png",
        "timestamp": 1554737999566,
        "duration": 7678
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554738126836,
                "type": ""
            }
        ],
        "screenShotFile": "006200b4-006b-0052-003d-00a000d300d0.png",
        "timestamp": 1554738126129,
        "duration": 5973
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554738133608,
                "type": ""
            }
        ],
        "screenShotFile": "007f00b4-00c7-00bd-00e6-002e00540050.png",
        "timestamp": 1554738132639,
        "duration": 7372
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7007ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7007ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:41:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Devices\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:40:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ff00ed-0086-0077-00f4-0077007000f6.png",
        "timestamp": 1554738140466,
        "duration": 7857
    },
    {
        "description": "should click \"Locations\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006500d0-008a-00d1-0020-00650056003b.png",
        "timestamp": 1554738148756,
        "duration": 7989
    },
    {
        "description": "should click \"Favorites\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002e00fe-0060-006d-001f-004d00c000c1.png",
        "timestamp": 1554738157637,
        "duration": 8595
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001300e0-0072-0024-008f-0030008e001c.png",
        "timestamp": 1554738167142,
        "duration": 10795
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)",
            "Failed: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Protractor.waitForAngular() - Locator: by.cssContainingText(\".popup-title\", \"Recommended\")\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/usr/local/lib/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/usr/local/lib/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:76:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Protractor.waitForAngular()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/usr/local/lib/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/usr/local/lib/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:81:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00370003-000e-00eb-0067-0024003c00f0.png",
        "timestamp": 1554738178834,
        "duration": 30413
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain '/devices'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:94:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "001500cc-00ce-008a-00eb-00a6008c00b7.png",
        "timestamp": 1554738210022,
        "duration": 17111
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain '/locations'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:102:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554738233350,
                "type": ""
            }
        ],
        "screenShotFile": "00f0004b-0006-0009-00e2-000100b100ba.png",
        "timestamp": 1554738227588,
        "duration": 12062
    },
    {
        "description": "should go to \"Playstation\" device on login|Specific \"device\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)",
            "Expected 'http://localhost:8100/#/auth/login' to contain '00-0B-78-00-77-B7'."
        ],
        "trace": [
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(css selector, *[name=\"txt_username\"])\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/usr/local/lib/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/usr/local/lib/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:116:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:114:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:113:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:124:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "006d0082-00ce-00ba-00e8-00030034004d.png",
        "timestamp": 1554738240086,
        "duration": 13201
    },
    {
        "description": "should go to \"MX Q Pro\" device on login|Specific \"device\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain '00-0B-78-00-77-BE'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:132:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554738259792,
                "type": ""
            }
        ],
        "screenShotFile": "003d00c6-00c1-007a-0062-00030053008f.png",
        "timestamp": 1554738254020,
        "duration": 12608
    },
    {
        "description": "should go to \"Top Left TV\"|Specific \"device\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain '00-0B-78-00-7D-E2'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:140:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.8/mnc/secure_api.php - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1554738287709,
                "type": ""
            }
        ],
        "screenShotFile": "00490035-00ab-00c6-007e-005f007900a7.png",
        "timestamp": 1554738267081,
        "duration": 21284
    },
    {
        "description": "should go to Locations \"Bob\"|Specific \"Locations\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 9042ms",
            "Expected 'http://localhost:8100/#/auth/login' to contain 'location_listview/124'."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 9042ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:163:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:161:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:171:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554738296286,
                "type": ""
            }
        ],
        "screenShotFile": "0010005a-0088-00bd-00b9-00aa00c0007b.png",
        "timestamp": 1554738289093,
        "duration": 10413
    },
    {
        "description": "should go to Locations \"yry\"|Specific \"Locations\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain 'location_listview/125'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:179:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.8/mnc/secure_api.php - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1554738305126,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.8/mnc/secure_api.php - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1554738311239,
                "type": ""
            }
        ],
        "screenShotFile": "001500f3-0043-00fc-001b-009f005a0044.png",
        "timestamp": 1554738301222,
        "duration": 10393
    },
    {
        "description": "should go to \"Favorites\"|Favorites by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6cc374afa7aee63cbf1c0dfb7b52d979",
        "instanceId": 52004,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain 'favorites'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:197:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.8/mnc/secure_api.php - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1554738317686,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554738317686,
                "type": ""
            }
        ],
        "screenShotFile": "000100b8-00dc-005b-00a3-006700730066.png",
        "timestamp": 1554738312115,
        "duration": 12034
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554738382693,
                "type": ""
            }
        ],
        "screenShotFile": "000f00d8-006d-00c2-005c-00cc007700b6.png",
        "timestamp": 1554738381592,
        "duration": 6396
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554738389599,
                "type": ""
            }
        ],
        "screenShotFile": "00fb0038-0020-000e-00de-004d00e200fb.png",
        "timestamp": 1554738388615,
        "duration": 7393
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7015ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7015ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:41:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Devices\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:40:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00de00a7-00e0-0036-0089-0081002f0028.png",
        "timestamp": 1554738396460,
        "duration": 7842
    },
    {
        "description": "should click \"Locations\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <i class=\"icon icon-brandify-location-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (525, 529). Other element would receive the click: <div style=\"text-align: center\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <i class=\"icon icon-brandify-location-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (525, 529). Other element would receive the click: <div style=\"text-align: center\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToLocations (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:68:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:52:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should click \"Locations\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:49:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f600b9-00af-00a2-00cc-008e00d60035.png",
        "timestamp": 1554738404770,
        "duration": 16528
    },
    {
        "description": "should click \"Favorites\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <i class=\"icon icon-brandify-star-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (675, 529). Other element would receive the click: <div style=\"text-align: center\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <i class=\"icon icon-brandify-star-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (675, 529). Other element would receive the click: <div style=\"text-align: center\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToFavorites (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:72:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:59:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should click \"Favorites\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:57:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d90075-0011-000c-0090-008a00630020.png",
        "timestamp": 1554738422417,
        "duration": 14957
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7422ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7422ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:65:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should click \"Settings\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:64:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:34:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00b300cf-0057-000a-00d8-006900b1009e.png",
        "timestamp": 1554738438911,
        "duration": 10407
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7516ms",
            "Expected 'http://localhost:8100/#/auth/login' to contain '/favorites'."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7516ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:78:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:76:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00b50030-0080-0088-00e1-004200fe0067.png",
        "timestamp": 1554738450374,
        "duration": 9955
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 8536ms",
            "Expected 'http://localhost:8100/#/auth/login' to contain '/devices'."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 8536ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:78:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:76:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:94:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "003a00e0-00f7-00f9-0063-00f8001e0097.png",
        "timestamp": 1554738461417,
        "duration": 10947
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/devices' to contain '/locations'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:102:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00b400e4-00fc-004a-008f-000d004d0060.png",
        "timestamp": 1554738473462,
        "duration": 7418
    },
    {
        "description": "should go to \"Playstation\" device on login|Specific \"device\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/locations' to contain '00-0B-78-00-77-B7'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:124:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "001e007c-0052-00b4-0008-00b500c3009a.png",
        "timestamp": 1554738481389,
        "duration": 15016
    },
    {
        "description": "should go to \"MX Q Pro\" device on login|Specific \"device\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/viewSource/00-0B-78-00-77-B7' to contain '00-0B-78-00-77-BE'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:132:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "000c00b0-0060-00c8-0053-003b00350085.png",
        "timestamp": 1554738497702,
        "duration": 15601
    },
    {
        "description": "should go to \"Top Left TV\"|Specific \"device\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/viewSource/00-0B-78-00-77-BE' to contain '00-0B-78-00-7D-E2'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:140:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.8/angelica-o/api/devices/00-0B-78-00-77-BE?password=admin&type=false&user_name=admin - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1554738528786,
                "type": ""
            }
        ],
        "screenShotFile": "007a0097-0059-005a-00c4-00c3005200d6.png",
        "timestamp": 1554738514791,
        "duration": 16624
    },
    {
        "description": "should go to Locations \"Bob\"|Specific \"Locations\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/viewDisplay/00-0B-78-00-7D-E2' to contain 'location_listview/124'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:171:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "0024000e-0006-0023-00fb-00e100c10025.png",
        "timestamp": 1554738532620,
        "duration": 16733
    },
    {
        "description": "should go to Locations \"yry\"|Specific \"Locations\" by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/location_listview/124' to contain 'location_listview/125'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:179:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.8/angelica-o/api/locations/location/124?password=admin&type=false&user_name=admin - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1554738557815,
                "type": ""
            }
        ],
        "screenShotFile": "00eb00ca-0073-00c2-0085-005100ef00d4.png",
        "timestamp": 1554738550585,
        "duration": 7651
    },
    {
        "description": "should go to \"Favorites\"|Favorites by default",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "40806195b9b177bc342c45d429a68ee0",
        "instanceId": 52242,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/location_listview/125' to contain 'favorites'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:197:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.8/angelica-o/api/locations/location/125?password=admin&type=false&user_name=admin - Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "timestamp": 1554738575457,
                "type": ""
            }
        ],
        "screenShotFile": "00b10073-000d-00ca-0009-0092002f0026.png",
        "timestamp": 1554738559161,
        "duration": 20165
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0b4b32333e40c25f66f25fac33511620",
        "instanceId": 53641,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554740411979,
                "type": ""
            }
        ],
        "screenShotFile": "00d300d1-00f2-0019-0081-00e1001a0009.png",
        "timestamp": 1554740411340,
        "duration": 5882
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0b4b32333e40c25f66f25fac33511620",
        "instanceId": 53641,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554740418594,
                "type": ""
            }
        ],
        "screenShotFile": "00b20063-0065-0044-000c-007a00a2009f.png",
        "timestamp": 1554740417750,
        "duration": 7343
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0b4b32333e40c25f66f25fac33511620",
        "instanceId": 53641,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f10008-0055-0004-0096-001d00300062.png",
        "timestamp": 1554740425545,
        "duration": 7881
    },
    {
        "description": "should click \"Locations\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0b4b32333e40c25f66f25fac33511620",
        "instanceId": 53641,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00620089-007b-00aa-00fd-0074008d005a.png",
        "timestamp": 1554740433939,
        "duration": 8261
    },
    {
        "description": "should click \"Favorites\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0b4b32333e40c25f66f25fac33511620",
        "instanceId": 53641,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002a0079-00ca-00b3-0074-001200d500c4.png",
        "timestamp": 1554740443094,
        "duration": 8554
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0b4b32333e40c25f66f25fac33511620",
        "instanceId": 53641,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00380046-0041-002f-00b2-008b00c0009d.png",
        "timestamp": 1554740452566,
        "duration": 8327
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b7a0ec68d9988af46a09d3f84140da19",
        "instanceId": 54636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554741644176,
                "type": ""
            }
        ],
        "screenShotFile": "00250035-00a5-00ea-0046-009b00f300a3.png",
        "timestamp": 1554741643469,
        "duration": 5955
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b7a0ec68d9988af46a09d3f84140da19",
        "instanceId": 54636,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/auth/login'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:27:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "006100ac-00cc-006b-00f6-00f3003d0011.png",
        "timestamp": 1554741649933,
        "duration": 12557
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b1772a8501e693d6141fd6abe7d3dd9b",
        "instanceId": 54689,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554741674649,
                "type": ""
            }
        ],
        "screenShotFile": "007600f5-00dd-00e4-0040-000b00cc0045.png",
        "timestamp": 1554741674059,
        "duration": 5829
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b1772a8501e693d6141fd6abe7d3dd9b",
        "instanceId": 54689,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/auth/login'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:27:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554741681209,
                "type": ""
            }
        ],
        "screenShotFile": "00cb00e9-008d-00d6-00f0-008400da00bf.png",
        "timestamp": 1554741680410,
        "duration": 11616
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4d3c2814d2e841dfefd9ed909efb9952",
        "instanceId": 54737,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554741699831,
                "type": ""
            }
        ],
        "screenShotFile": "004500ec-00fb-0036-00d8-000f00f700d8.png",
        "timestamp": 1554741699170,
        "duration": 5908
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4d3c2814d2e841dfefd9ed909efb9952",
        "instanceId": 54737,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/auth/login'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:27:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554741706461,
                "type": ""
            }
        ],
        "screenShotFile": "001f000e-0005-0034-009c-00f6005700b7.png",
        "timestamp": 1554741705605,
        "duration": 11667
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "23fe9ba7fab7ffaaec9a59acc8b7845f",
        "instanceId": 54802,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554741754931,
                "type": ""
            }
        ],
        "screenShotFile": "008c008a-0032-00a7-0026-00ac00160016.png",
        "timestamp": 1554741754122,
        "duration": 7432
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "23fe9ba7fab7ffaaec9a59acc8b7845f",
        "instanceId": 54802,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"div.item-clear-background h2\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"div.item-clear-background h2\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:87)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008a0007-004d-0019-00c5-002f003a0055.png",
        "timestamp": 1554741762107,
        "duration": 7841
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "23fe9ba7fab7ffaaec9a59acc8b7845f",
        "instanceId": 54802,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b30019-00f6-002f-0095-0052001d00e8.png",
        "timestamp": 1554741770776,
        "duration": 7413
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "23fe9ba7fab7ffaaec9a59acc8b7845f",
        "instanceId": 54802,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/devices' to contain '/locations'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:107:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "003c00f2-006e-001f-00d3-006f00940012.png",
        "timestamp": 1554741778689,
        "duration": 7421
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "54640c1cb88b1f283b8e2793c2bd7ea6",
        "instanceId": 54886,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554741835017,
                "type": ""
            }
        ],
        "screenShotFile": "0070002d-00e7-002f-002c-005100ec0045.png",
        "timestamp": 1554741834369,
        "duration": 7244
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "54640c1cb88b1f283b8e2793c2bd7ea6",
        "instanceId": 54886,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"div.item-clear-background h2\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"div.item-clear-background h2\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:87)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000800c5-008a-0085-00f9-00ed00d60030.png",
        "timestamp": 1554741842136,
        "duration": 7855
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "54640c1cb88b1f283b8e2793c2bd7ea6",
        "instanceId": 54886,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "007900e5-0060-0037-0029-0053002f0002.png",
        "timestamp": 1554741850827,
        "duration": 7571
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "54640c1cb88b1f283b8e2793c2bd7ea6",
        "instanceId": 54886,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/devices' to contain '/locations'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:107:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00e40077-0075-0018-00bb-00b800ed00ba.png",
        "timestamp": 1554741858903,
        "duration": 8094
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "500b48880ae3ce07cc0b6523193b463a",
        "instanceId": 54983,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554741931493,
                "type": ""
            }
        ],
        "screenShotFile": "00dc0075-0051-0090-0026-003c00f10014.png",
        "timestamp": 1554741930918,
        "duration": 7150
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "500b48880ae3ce07cc0b6523193b463a",
        "instanceId": 54983,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"div.item-clear-background\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"div.item-clear-background\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:84)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008700f4-00a5-001a-00f7-003400850029.png",
        "timestamp": 1554741938594,
        "duration": 8142
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "3c2fe47e52fefde9f0a151be1e7b7d15",
        "instanceId": 55059,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742006940,
                "type": ""
            }
        ],
        "screenShotFile": "0006000a-002f-007a-00c0-00d700460094.png",
        "timestamp": 1554742006177,
        "duration": 8746
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "3c2fe47e52fefde9f0a151be1e7b7d15",
        "instanceId": 55059,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"h2\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"h2\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:61)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007a001c-00b7-0095-003e-00b500910086.png",
        "timestamp": 1554742015451,
        "duration": 7573
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6b868f47b7ee8594fb16579b91278de1",
        "instanceId": 55166,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742085653,
                "type": ""
            }
        ],
        "screenShotFile": "00af001f-0070-0020-00b9-00f700a3002e.png",
        "timestamp": 1554742085053,
        "duration": 13312
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6b868f47b7ee8594fb16579b91278de1",
        "instanceId": 55166,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"div > h2\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"div > h2\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:67)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a60030-00de-00d4-0088-005900a50089.png",
        "timestamp": 1554742099259,
        "duration": 7807
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "722082192d3cd03b1eb91d764997d5fe",
        "instanceId": 55326,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742274436,
                "type": ""
            }
        ],
        "screenShotFile": "00f100ef-0019-00ce-00af-005c008600d5.png",
        "timestamp": 1554742273752,
        "duration": 7307
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "722082192d3cd03b1eb91d764997d5fe",
        "instanceId": 55326,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"div h2\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"div h2\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:65)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008300e8-0018-00fa-00e5-00c5000d001c.png",
        "timestamp": 1554742281617,
        "duration": 7681
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6df871754ab297e85985afc0673eb8fe",
        "instanceId": 55370,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7926ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7926ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:26:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should redirect to login page, after saving IP address\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:25:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742301476,
                "type": ""
            }
        ],
        "screenShotFile": "006e00a9-0049-00e3-004c-005e0007002f.png",
        "timestamp": 1554742300544,
        "duration": 9911
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6df871754ab297e85985afc0673eb8fe",
        "instanceId": 55370,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7013ms",
            "Failed: No element found using locator: By(css selector, .icon-brandify-settings)"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7013ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "NoSuchElementError: No element found using locator: By(css selector, .icon-brandify-settings)\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToSettings (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:77:21)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:85:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554742312283,
                "type": ""
            }
        ],
        "screenShotFile": "002a00f4-00d3-005e-00e7-00150085000c.png",
        "timestamp": 1554742311532,
        "duration": 7807
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6df871754ab297e85985afc0673eb8fe",
        "instanceId": 55370,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7013ms",
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/devices'."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7013ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:100:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554742320761,
                "type": ""
            }
        ],
        "screenShotFile": "007200f0-0003-0008-00ba-00c9006f0067.png",
        "timestamp": 1554742319805,
        "duration": 8013
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6df871754ab297e85985afc0673eb8fe",
        "instanceId": 55370,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7006ms",
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/locations'."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7006ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:108:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00a1006f-0098-00eb-0079-00ad004400b3.png",
        "timestamp": 1554742328282,
        "duration": 7907
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "10b58bd41f4e6dee2aeb6f32048658a0",
        "instanceId": 55438,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742347675,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554742347931,
                "type": ""
            }
        ],
        "screenShotFile": "003c001a-001a-00c7-002c-00c500b400b7.png",
        "timestamp": 1554742346705,
        "duration": 7619
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "10b58bd41f4e6dee2aeb6f32048658a0",
        "instanceId": 55438,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"h2\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"h2\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:61)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005800b6-0014-0027-0057-00d30033003b.png",
        "timestamp": 1554742354861,
        "duration": 7616
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "70643e727bbc388f446f7530e90aafc9",
        "instanceId": 55724,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742700472,
                "type": ""
            }
        ],
        "screenShotFile": "00f900d3-00a9-00de-003c-0002002200ca.png",
        "timestamp": 1554742699776,
        "duration": 7253
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "70643e727bbc388f446f7530e90aafc9",
        "instanceId": 55724,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"div[ng-click=\"defaultPageTypeModal.showModal($event)\"]\", \"Default Page\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"div[ng-click=\"defaultPageTypeModal.showModal($event)\"]\", \"Default Page\")\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:113)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00460088-00c9-0055-0001-008700f30023.png",
        "timestamp": 1554742707603,
        "duration": 7822
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5e77872082824d53b15cedf70b4d927e",
        "instanceId": 55807,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7501ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7501ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:26:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should redirect to login page, after saving IP address\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:25:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742764706,
                "type": ""
            }
        ],
        "screenShotFile": "005600b0-000d-0073-00b8-00a2001f000f.png",
        "timestamp": 1554742764075,
        "duration": 8369
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5e77872082824d53b15cedf70b4d927e",
        "instanceId": 55807,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 8329ms",
            "Failed: No element found using locator: By(css selector, .icon-brandify-settings)"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 8329ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "NoSuchElementError: No element found using locator: By(css selector, .icon-brandify-settings)\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToSettings (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:77:21)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:85:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554742774080,
                "type": ""
            }
        ],
        "screenShotFile": "008b009c-0075-00c0-00e5-00af00c10047.png",
        "timestamp": 1554742773359,
        "duration": 9100
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5e77872082824d53b15cedf70b4d927e",
        "instanceId": 55807,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7011ms",
            "Expected 'http://localhost:8100/#/setup/mnc-ip' to contain '/devices'."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7011ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:100:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554742784005,
                "type": ""
            }
        ],
        "screenShotFile": "0022000a-00e6-00da-00ff-00dd003600a0.png",
        "timestamp": 1554742783163,
        "duration": 7885
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c6b016173b77cf7f20cd42764a15a585",
        "instanceId": 55860,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742798524,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554742798716,
                "type": ""
            }
        ],
        "screenShotFile": "00f400ec-00aa-008a-002d-00cc00bf0089.png",
        "timestamp": 1554742797963,
        "duration": 7111
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c6b016173b77cf7f20cd42764a15a585",
        "instanceId": 55860,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: javascript error: Cannot read property 'indexOf' of null\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "JavascriptError: javascript error: Cannot read property 'indexOf' of null\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.executeScript()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.executeScript (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:878:16)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:191:35\n    at call (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1068:28)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: WebDriver.call(function)\n    at thenableWebDriverProxy.call (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:901:23)\n    at thenableWebDriverProxy.findElementsInternal_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1068:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1043:19)\n    at Object.findElementsOverride (/usr/local/lib/node_modules/protractor/built/locators.js:384:31)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:156:40)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:97)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00fb001a-00f7-00ce-0014-003b006a003a.png",
        "timestamp": 1554742805577,
        "duration": 7641
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e51a174de23a7c27c70b146b10df4c2a",
        "instanceId": 55979,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554742933429,
                "type": ""
            }
        ],
        "screenShotFile": "004a005c-0091-00fb-0041-00ef00d10086.png",
        "timestamp": 1554742932866,
        "duration": 7105
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e51a174de23a7c27c70b146b10df4c2a",
        "instanceId": 55979,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: javascript error: Cannot read property 'indexOf' of null\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "JavascriptError: javascript error: Cannot read property 'indexOf' of null\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebDriver.executeScript()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at thenableWebDriverProxy.executeScript (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:878:16)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/by.js:191:35\n    at call (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1068:28)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\nFrom: Task: WebDriver.call(function)\n    at thenableWebDriverProxy.call (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:901:23)\n    at thenableWebDriverProxy.findElementsInternal_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1068:17)\n    at thenableWebDriverProxy.findElements (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1043:19)\n    at Object.findElementsOverride (/usr/local/lib/node_modules/protractor/built/locators.js:384:31)\n    at ptor.waitForAngular.then (/usr/local/lib/node_modules/protractor/built/element.js:156:40)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:86:98)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e50070-0034-00e2-008a-008b005a0097.png",
        "timestamp": 1554742940485,
        "duration": 7909
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b9ea2dd94282dc039039c55dcf34eaec",
        "instanceId": 56175,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554743188085,
                "type": ""
            }
        ],
        "screenShotFile": "0060008f-0001-0029-00af-00c100bb000f.png",
        "timestamp": 1554743187454,
        "duration": 7334
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b9ea2dd94282dc039039c55dcf34eaec",
        "instanceId": 56175,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 7730ms",
            "Failed: No element found using locator: By(css selector, .icon-brandify-settings)"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 7730ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "NoSuchElementError: No element found using locator: By(css selector, .icon-brandify-settings)\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToSettings (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:77:21)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:85:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a50082-0037-00c8-0044-0038001900d1.png",
        "timestamp": 1554743195445,
        "duration": 9072
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b9ea2dd94282dc039039c55dcf34eaec",
        "instanceId": 56175,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "007000e3-00d3-0067-00ff-00c0004f00ac.png",
        "timestamp": 1554743205396,
        "duration": 11070
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b9ea2dd94282dc039039c55dcf34eaec",
        "instanceId": 56175,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/devices' to contain '/locations'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:108:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "008000ac-00b4-0044-0010-0089003400d4.png",
        "timestamp": 1554743217571,
        "duration": 16934
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ebebd7581753e3834837cf695ec09285",
        "instanceId": 56332,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554743370804,
                "type": ""
            }
        ],
        "screenShotFile": "001300b4-0088-00f0-0067-00bc00fd0001.png",
        "timestamp": 1554743370254,
        "duration": 7106
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ebebd7581753e3834837cf695ec09285",
        "instanceId": 56332,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <span>...</span> is not clickable at point (290, 280). Other element would receive the click: <div class=\"radio-content\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span>...</span> is not clickable at point (290, 280). Other element would receive the click: <div class=\"radio-content\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:88:77)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00250068-0073-0028-00b4-0019008b0072.png",
        "timestamp": 1554743377886,
        "duration": 8429
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "ebebd7581753e3834837cf695ec09285",
        "instanceId": 56332,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f300d5-00b5-0095-0089-00780001006f.png",
        "timestamp": 1554743386895,
        "duration": 15480
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f3b5cb7e82b02589f6f81c799a027b17",
        "instanceId": 56487,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554743556892,
                "type": ""
            }
        ],
        "screenShotFile": "00d60033-0096-0039-009c-00e200d80070.png",
        "timestamp": 1554743556324,
        "duration": 7155
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f3b5cb7e82b02589f6f81c799a027b17",
        "instanceId": 56487,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, div[ng-value=\"'favorites'\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, div[ng-value=\"'favorites'\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:88:58)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "001300e5-008f-00af-00c9-0096002b0026.png",
        "timestamp": 1554743564058,
        "duration": 8443
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f3b5cb7e82b02589f6f81c799a027b17",
        "instanceId": 56487,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004c0036-00fb-0046-001a-00b7003e008b.png",
        "timestamp": 1554743573092,
        "duration": 16394
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f3b5cb7e82b02589f6f81c799a027b17",
        "instanceId": 56487,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 8803ms",
            "Expected 'http://localhost:8100/#/auth/login' to contain '/locations'."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 8803ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:33:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:75:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:108:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00860043-0005-0076-0043-005c00ef005a.png",
        "timestamp": 1554743590343,
        "duration": 10075
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "059c9c26fd04392946bbd7ef32d18ad5",
        "instanceId": 56574,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554743632473,
                "type": ""
            }
        ],
        "screenShotFile": "000e00a8-0097-00e1-00e0-00090061008f.png",
        "timestamp": 1554743631914,
        "duration": 7128
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "059c9c26fd04392946bbd7ef32d18ad5",
        "instanceId": 56574,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: EC is not defined"
        ],
        "trace": [
            "ReferenceError: EC is not defined\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:90:22)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ad00df-0055-00fb-0091-00f6001b002d.png",
        "timestamp": 1554743639582,
        "duration": 7436
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "059c9c26fd04392946bbd7ef32d18ad5",
        "instanceId": 56574,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003a00a3-005c-00f8-00ae-000d00c800bd.png",
        "timestamp": 1554743647518,
        "duration": 7561
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a7c3a5007515c461f23f76a15be46706",
        "instanceId": 56626,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554743669537,
                "type": ""
            }
        ],
        "screenShotFile": "00bd002b-0096-008f-006e-0045000f004c.png",
        "timestamp": 1554743668807,
        "duration": 7534
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a7c3a5007515c461f23f76a15be46706",
        "instanceId": 56626,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: EC is not defined"
        ],
        "trace": [
            "ReferenceError: EC is not defined\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:90:22)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f30094-0074-0031-00ea-006c004d00d5.png",
        "timestamp": 1554743676940,
        "duration": 7647
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f2f0ad8a7f3ace50b7092c2c3c777439",
        "instanceId": 56713,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554743756145,
                "type": ""
            }
        ],
        "screenShotFile": "002b00b8-009b-00ca-00aa-009e007f0062.png",
        "timestamp": 1554743755494,
        "duration": 8452
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f2f0ad8a7f3ace50b7092c2c3c777439",
        "instanceId": 56713,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: EC is not defined"
        ],
        "trace": [
            "ReferenceError: EC is not defined\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:90:22)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bd000e-00b0-0038-002f-007c005a00ff.png",
        "timestamp": 1554743764494,
        "duration": 7437
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5d6900c1aa9c7c4474ae436c38b8d926",
        "instanceId": 57037,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554744163333,
                "type": ""
            }
        ],
        "screenShotFile": "001f0073-0027-0021-0009-003200ac0086.png",
        "timestamp": 1554744162524,
        "duration": 7528
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5d6900c1aa9c7c4474ae436c38b8d926",
        "instanceId": 57037,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: EC is not defined"
        ],
        "trace": [
            "ReferenceError: EC is not defined\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:89:22)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000700ea-002c-00cd-000a-00cf00710082.png",
        "timestamp": 1554744170599,
        "duration": 7989
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "5d6900c1aa9c7c4474ae436c38b8d926",
        "instanceId": 57037,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "005c007c-0081-00c2-00d7-006800840024.png",
        "timestamp": 1554744179109,
        "duration": 7480
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a23b9b5709e121fbd9b8f67ab1202dda",
        "instanceId": 57116,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554744241930,
                "type": ""
            }
        ],
        "screenShotFile": "001c0005-0044-0040-0081-00ce007600b2.png",
        "timestamp": 1554744241251,
        "duration": 7279
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a23b9b5709e121fbd9b8f67ab1202dda",
        "instanceId": 57116,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: EC is not defined"
        ],
        "trace": [
            "ReferenceError: EC is not defined\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:89:22)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should go to \"Favorites\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:80:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:74:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002d00a1-00e9-0042-0053-0023009600b7.png",
        "timestamp": 1554744249076,
        "duration": 7333
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a23b9b5709e121fbd9b8f67ab1202dda",
        "instanceId": 57116,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0043003c-00d9-0093-00bf-0095007700c0.png",
        "timestamp": 1554744256925,
        "duration": 15541
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a23b9b5709e121fbd9b8f67ab1202dda",
        "instanceId": 57116,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain '/locations'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:111:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "006600c2-00d6-0056-0037-0067006f0080.png",
        "timestamp": 1554744274084,
        "duration": 11576
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e8ff80c9504236bfaeff35f712f712d5",
        "instanceId": 57197,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554744312844,
                "type": ""
            }
        ],
        "screenShotFile": "00a5001b-008e-001b-00f7-0002004d0027.png",
        "timestamp": 1554744312173,
        "duration": 7341
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e8ff80c9504236bfaeff35f712f712d5",
        "instanceId": 57197,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a10048-0065-00ca-00e6-003400f200ae.png",
        "timestamp": 1554744320059,
        "duration": 19212
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e0d4c835ca15b47c380b880d3ff1fa80",
        "instanceId": 57398,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554744556857,
                "type": ""
            }
        ],
        "screenShotFile": "008e00ef-0039-0073-0058-005100e5009e.png",
        "timestamp": 1554744556173,
        "duration": 7332
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e0d4c835ca15b47c380b880d3ff1fa80",
        "instanceId": 57398,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00cd007a-001a-006d-0067-00cc005100aa.png",
        "timestamp": 1554744564088,
        "duration": 15945
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e0d4c835ca15b47c380b880d3ff1fa80",
        "instanceId": 57398,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00bc008e-009a-001b-003b-002c0081002e.png",
        "timestamp": 1554744580976,
        "duration": 16051
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e0d4c835ca15b47c380b880d3ff1fa80",
        "instanceId": 57398,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: devices is not defined"
        ],
        "trace": [
            "ReferenceError: devices is not defined\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:114:46)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"should go to \"Locations\" by default\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:109:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:77:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a4007a-0077-0039-0049-007c00df00fb.png",
        "timestamp": 1554744597570,
        "duration": 7378
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "d62f541398d625ebcfdbaf9cec874ebc",
        "instanceId": 57504,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: Wait timed out after 8876ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 8876ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at LoginPage.ip_login (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:14:17)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:29:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\nFrom: Task: Run it(\"should redirect to login page, after saving IP address\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:28:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:19:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554744664943,
                "type": ""
            }
        ],
        "screenShotFile": "005c007a-00b1-00ca-005c-0017005b0084.png",
        "timestamp": 1554744664062,
        "duration": 10445
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1434d9c5348d4f14fa7816da9ac6e759",
        "instanceId": 57578,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554744724517,
                "type": ""
            }
        ],
        "screenShotFile": "00b7008f-0021-006d-0063-00ba004b005e.png",
        "timestamp": 1554744723938,
        "duration": 7202
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1434d9c5348d4f14fa7816da9ac6e759",
        "instanceId": 57578,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002d0088-0099-00cc-0083-001300d400c3.png",
        "timestamp": 1554744731715,
        "duration": 16315
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1434d9c5348d4f14fa7816da9ac6e759",
        "instanceId": 57578,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006400d8-00e9-0069-007f-006400850038.png",
        "timestamp": 1554744748946,
        "duration": 16342
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1434d9c5348d4f14fa7816da9ac6e759",
        "instanceId": 57578,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00330008-00c1-00cf-0027-0026005f0059.png",
        "timestamp": 1554744765792,
        "duration": 16221
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "967d6df66122d8cdd49f9270791abc83",
        "instanceId": 59156,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554746945341,
                "type": ""
            }
        ],
        "screenShotFile": "00e20035-009e-00f1-0093-00a2008f0026.png",
        "timestamp": 1554746944728,
        "duration": 7285
    },
    {
        "description": "should go to second device on login|Sets \"show specific device\" ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "967d6df66122d8cdd49f9270791abc83",
        "instanceId": 59156,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, div[ng-click=\"selectDeviceModal.showModal($event)\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, div[ng-click=\"selectDeviceModal.showModal($event)\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:146:80)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to second device on login\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:136:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:130:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00870081-0017-0017-00e9-0018002d0086.png",
        "timestamp": 1554746952564,
        "duration": 9186
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "70784feb988c2ceb7e20e2cf682d42e5",
        "instanceId": 59217,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554746998557,
                "type": ""
            }
        ],
        "screenShotFile": "006100d6-0034-009a-0083-006900eb0050.png",
        "timestamp": 1554746997909,
        "duration": 14584
    },
    {
        "description": "should go to second device on login|Sets \"show specific device\" ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "70784feb988c2ceb7e20e2cf682d42e5",
        "instanceId": 59217,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, div[ng-click=\"selectDeviceModal.showModal($event)\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, div[ng-click=\"selectDeviceModal.showModal($event)\"])\n    at elementArrayFinder.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:146:80)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should go to second device on login\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:136:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:130:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000e00f9-0027-001b-00a1-00e9004900d0.png",
        "timestamp": 1554747013334,
        "duration": 13499
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6a9a6d2990ea73602a471fe12d71f537",
        "instanceId": 59286,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554747062866,
                "type": ""
            }
        ],
        "screenShotFile": "00750076-00a5-00c1-0025-009200f7001e.png",
        "timestamp": 1554747062291,
        "duration": 7162
    },
    {
        "description": "should go to second device on login|Sets \"show specific device\" ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6a9a6d2990ea73602a471fe12d71f537",
        "instanceId": 59286,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/settings' to contain ElementFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::6067\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4083<then>\n| | | | | (active) TaskQueue::6066\n| | Task::3968<then>\n| TaskQueue::6064\n| | (pending) Task::6063<then>\n| | | TaskQueue::6065, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), then: null, parentElementArrayFinder: ElementArrayFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::6067\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4083<then>\n| | | | | (active) TaskQueue::6066\n| | Task::3968<then>\n| TaskQueue::6064\n| | (pending) Task::6063<then>\n| | | TaskQueue::6065, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), getWebElements: Function, locator_: by.repeater(\"device in selectDeviceModal.availableDevices | filter:selectDeviceModal.addDeviceData.search track by device.mac\"), actionResults_: null, click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function }), elementArrayFinder_: ElementArrayFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::6067\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4083<then>\n| | | | | (active) TaskQueue::6066\n| | Task::3968<then>\n| TaskQueue::6064\n| | (pending) Task::6063<then>\n| | | TaskQueue::6065, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), getWebElements: Function, locator_: by.repeater(\"device in selectDeviceModal.availableDevices | filter:selectDeviceModal.addDeviceData.search track by device.mac\"), actionResults_: null, click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function }), click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function })."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:151:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00af00fb-00ca-0038-00c8-00af00090064.png",
        "timestamp": 1554747069998,
        "duration": 10820
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "eacb84d04f3806ded044f54ab0786b41",
        "instanceId": 59347,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554747117017,
                "type": ""
            }
        ],
        "screenShotFile": "007f0054-00bd-0063-0088-001f00ec0065.png",
        "timestamp": 1554747116396,
        "duration": 7629
    },
    {
        "description": "should go to second device on login|Sets \"show specific device\" ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "eacb84d04f3806ded044f54ab0786b41",
        "instanceId": 59347,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/auth/login' to contain ElementFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::6261\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4091<then>\n| | | | | (active) TaskQueue::6260\n| | Task::3968<then>\n| TaskQueue::6258\n| | (pending) Task::6257<then>\n| | | TaskQueue::6259, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), then: null, parentElementArrayFinder: ElementArrayFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::6261\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4091<then>\n| | | | | (active) TaskQueue::6260\n| | Task::3968<then>\n| TaskQueue::6258\n| | (pending) Task::6257<then>\n| | | TaskQueue::6259, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), getWebElements: Function, locator_: by.repeater(\"device in selectDeviceModal.availableDevices | filter:selectDeviceModal.addDeviceData.search track by device.mac\"), actionResults_: null, click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function }), elementArrayFinder_: ElementArrayFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::6261\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4091<then>\n| | | | | (active) TaskQueue::6260\n| | Task::3968<then>\n| TaskQueue::6258\n| | (pending) Task::6257<then>\n| | | TaskQueue::6259, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), getWebElements: Function, locator_: by.repeater(\"device in selectDeviceModal.availableDevices | filter:selectDeviceModal.addDeviceData.search track by device.mac\"), actionResults_: null, click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function }), click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function })."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:152:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "008700d2-0009-0053-00a8-002100bc006b.png",
        "timestamp": 1554747124612,
        "duration": 16024
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4475e6f8eef995d7f29f68ea18a42ca6",
        "instanceId": 59399,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554747152449,
                "type": ""
            }
        ],
        "screenShotFile": "00e000b2-0078-0070-00f5-009d00500054.png",
        "timestamp": 1554747151899,
        "duration": 7103
    },
    {
        "description": "should go to second device on login|Sets \"show specific device\" ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4475e6f8eef995d7f29f68ea18a42ca6",
        "instanceId": 59399,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected 'http://localhost:8100/#/app/viewDisplay/00-0B-78-00-77-C6' to contain ElementFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::8275\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4203<then>\n| | | | | (active) TaskQueue::8274\n| | Task::3968<then>\n| TaskQueue::8272\n| | (pending) Task::8271<then>\n| | | TaskQueue::8273, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), then: null, parentElementArrayFinder: ElementArrayFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::8275\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4203<then>\n| | | | | (active) TaskQueue::8274\n| | Task::3968<then>\n| TaskQueue::8272\n| | (pending) Task::8271<then>\n| | | TaskQueue::8273, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), getWebElements: Function, locator_: by.repeater(\"device in selectDeviceModal.availableDevices | filter:selectDeviceModal.addDeviceData.search track by device.mac\"), actionResults_: null, click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function }), elementArrayFinder_: ElementArrayFinder({ browser_: ProtractorBrowser({ controlFlow: Function, schedule: Function, setFileDetector: Function, getExecutor: Function, getSession: Function, getCapabilities: Function, quit: Function, actions: Function, touchActions: Function, executeScript: Function, executeAsyncScript: Function, call: Function, wait: Function, sleep: Function, getWindowHandle: Function, getAllWindowHandles: Function, getPageSource: Function, close: Function, getCurrentUrl: Function, getTitle: Function, findElementInternal_: Function, findElementsInternal_: Function, takeScreenshot: Function, manage: Function, switchTo: Function, driver: thenableWebDriverProxy({ flow_: ControlFlow::8275\n| TaskQueue::3966\n| | (pending) Task::3965<Run it(\"should go to second device on login\") in control flow>\n| | | TaskQueue::3969\n| | | | (pending) Task::4203<then>\n| | | | | (active) TaskQueue::8274\n| | Task::3968<then>\n| TaskQueue::8272\n| | (pending) Task::8271<then>\n| | | TaskQueue::8273, session_: ManagedPromise::4 {[[PromiseStatus]]: \"fulfilled\"}, executor_: Executor({ w3c: false, customCommands_: Map( [ 'launchApp', Object({ method: 'POST', path: '/session/:sessionId/chromium/launch_app' }) ], [ 'getNetworkConditions', Object({ method: 'GET', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'setNetworkConditions', Object({ method: 'POST', path: '/session/:sessionId/chromium/network_conditions' }) ], [ 'getNetworkConnection', Object({ method: 'GET', path: '/session/:sessionId/network_connection' }) ], [ 'setNetworkConnection', Object({ method: 'POST', path: '/session/:sessionId/network_connection' }) ], [ 'toggleAirplaneMode', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_airplane_mode' }) ], [ 'toggleWiFi', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_wifi' }) ], [ 'toggleData', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_data' }) ], [ 'toggleLocationServices', Object({ method: 'POST', path: '/session/:sessionId/appium/device/toggle_location_services' }) ], [ 'getGeolocation', Object({ method: 'GET', path: '/session/:sessionId/location' }) ], [ 'setGeolocation', Object({ method: 'POST', path: '/session/:sessionId/location' }) ], [ 'getCurrentDeviceActivity', Object({ method: 'GET', path: '/session/:sessionId/appium/device/current_activity' }) ], [ 'startDeviceActivity', Object({ method: 'POST', path: '/session/:sessionId/appium/device/start_activity' }) ], [ 'getAppiumSettings', Object({ method: 'GET', path: '/session/:sessionId/appium/settings' }) ], [ 'setAppiumSettings', Object({ method: 'POST', path: '/session/:sessionId/appium/settings' }) ], [ 'getCurrentContext', Object({ method: 'GET', path: '/session/:sessionId/context' }) ], [ 'selectContext', Object({ method: 'POST', path: '/session/:sessionId/context' }) ], [ 'getScreenOrientation', Object({ method: 'GET', path: '/session/:sessionId/orientation' }) ], [ 'setScreenOrientation', Object({ method: 'POST', path: '/session/:sessionId/orientation' }) ], [ 'isDeviceLocked', Object({ method: 'POST', path: '/session/:sessionId/appium/device/is_locked' }) ], [ 'lockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/lock' }) ], [ 'unlockDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/unlock' }) ], [ 'installApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/install_app' }) ], [ 'isAppInstalled', Object({ method: 'POST', path: '/session/:sessionId/appium/device/app_installed' }) ], [ 'removeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/device/remove_app' }) ], [ 'pullFileFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_file' }) ], [ 'pullFolderFromDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/pull_folder' }) ], [ 'pushFileToDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/push_file' }) ], [ 'listContexts', Object({ method: 'GET', path: '/session/:sessionId/contexts' }) ], [ 'uploadFile', Object({ method: 'POST', path: '/session/:sessionId/file' }) ], [ 'switchToParentFrame', Object({ method: 'POST', path: '/session/:sessionId/frame/parent' }) ], [ 'fullscreen', Object({ method: 'POST', path: '/session/:sessionId/window/fullscreen' }) ], [ 'sendAppToBackground', Object({ method: 'POST', path: '/session/:sessionId/appium/app/background' }) ], [ 'closeApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/close' }) ], [ 'getAppStrings', Object({ method: 'POST', path: '/session/:sessionId/appium/app/strings' }) ], [ 'launchSession', Object({ method: 'POST', path: '/session/:sessionId/appium/app/launch' }) ], [ 'resetApp', Object({ method: 'POST', path: '/session/:sessionId/appium/app/reset' }) ], [ 'hideSoftKeyboard', Object({ method: 'POST', path: '/session/:sessionId/appium/device/hide_keyboard' }) ], [ 'getDeviceTime', Object({ method: 'GET', path: '/session/:sessionId/appium/device/system_time' }) ], [ 'openDeviceNotifications', Object({ method: 'POST', path: '/session/:sessionId/appium/device/open_notifications' }) ], [ 'rotationGesture', Object({ method: 'POST', path: '/session/:sessionId/appium/device/rotate' }) ], [ 'shakeDevice', Object({ method: 'POST', path: '/session/:sessionId/appium/device/shake' }) ], [ 'sendChromiumCommand', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command' }) ], [ 'sendChromiumCommandAndGetResult', Object({ method: 'POST', path: '/session/:sessionId/chromium/send_command_and_get_result' }) ] ), log_: Logger({ name_: 'webdriver.http.Executor', level_: null, parent_: Logger({ name_: 'webdriver.http', level_: null, parent_: Logger({ name_: 'webdriver', level_: null, parent_: Logger({ name_: '', level_: OFF, parent_: null, handlers_: null }), handlers_: null }), handlers_: null }), handlers_: null }) }), fileDetector_: null, onQuit_: undefined, cancel: Function, then: Function, catch: Function, getNetworkConnection: Function, setNetworkConnection: Function, toggleAirplaneMode: Function, toggleWiFi: Function, toggleData: Function, toggleLocationServices: Function, getGeolocation: Function, setGeolocation: Function, getCurrentDeviceActivity: Function, startDeviceActivity: Function, getAppiumSettings: Function, setAppiumSettings: Function, getCurrentContext: Function, selectContext: Function, getScreenOrientation: Function, setScreenOrientation: Function, isDeviceLocked: Function, lockDevice: Function, unlockDevice: Function, installApp: Function, isAppInstalled: Function, removeApp: Function, pullFileFromDevice: Function, pullFolderFromDevice: Function, pushFileToDevice: Function, listContexts: Function, uploadFile: Function, switchToParentFrame: Function, fullscreen: Function, sendAppToBackground: Function, closeApp: Function, getAppStrings: Function, launchSession: Function, resetApp: Function, hideSoftKeyboard: Function, getDeviceTime: Function, openDeviceNotifications: Function, rotationGesture: Function, shakeDevice: Function, sendChromiumCommand: Function, sendChromiumCommandAndGetResult: Function }), element: Function, $: Function, $: Function, baseUrl: '', getPageTimeout: 10000, params: Object({ ipAddress: '192.168.168.8', port: 'http://localhost:8100/', username: 'admin', password: 'admin' }), resetUrl: 'data:text/html,<html></html>', debugHelper: DebugHelper({ browserUnderDebug_: <circular reference: Object> }), ready: ManagedPromise::19 {[[PromiseStatus]]: \"fulfilled\"}, trackOutstandingTimeouts_: true, mockModules_: [ Object({ name: 'protractorBaseModule_', script: Function, args: [ true ] }) ], ExpectedConditions: ProtractorExpectedConditions({ browser: <circular reference: Object> }), plugins_: Plugins({ setup: Function, onPrepare: Function, teardown: Function, postResults: Function, postTest: Function, onPageLoad: Function, onPageStable: Function, waitForPromise: Function, waitForCondition: Function, pluginObjs: [  ], assertions: Object({  }), resultsReported: false }), allScriptsTimeout: 11000, getProcessedConfig: Function, forkNewDriverInstance: Function, restart: Function, restartSync: Function, internalRootEl: '', internalIgnoreSynchronization: false }), getWebElements: Function, locator_: by.repeater(\"device in selectDeviceModal.availableDevices | filter:selectDeviceModal.addDeviceData.search track by device.mac\"), actionResults_: null, click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function }), click: Function, sendKeys: Function, getTagName: Function, getCssValue: Function, getAttribute: Function, getText: Function, getSize: Function, getLocation: Function, isEnabled: Function, isSelected: Function, submit: Function, clear: Function, isDisplayed: Function, getId: Function, takeScreenshot: Function })."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:153:41)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00440078-0033-000d-002f-008900ec0057.png",
        "timestamp": 1554747159533,
        "duration": 17530
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0187245b5e216d5e56364474e2b5cc9f",
        "instanceId": 59487,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554747242406,
                "type": ""
            }
        ],
        "screenShotFile": "00e3007d-005b-00dc-0072-00e300250049.png",
        "timestamp": 1554747241800,
        "duration": 7159
    },
    {
        "description": "should go to second device on login|Sets \"show specific device\" ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0187245b5e216d5e56364474e2b5cc9f",
        "instanceId": 59487,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008300cb-0036-0077-0087-00e4002c00c4.png",
        "timestamp": 1554747249688,
        "duration": 17579
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c7e62fba8b6d346902fe165be4bad6e7",
        "instanceId": 59779,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554747638606,
                "type": ""
            }
        ],
        "screenShotFile": "00f8001c-00c9-003e-001d-00a800aa002d.png",
        "timestamp": 1554747638004,
        "duration": 7208
    },
    {
        "description": "should go to second device on login|Sets \"show specific device\" ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c7e62fba8b6d346902fe165be4bad6e7",
        "instanceId": 59779,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00df00c6-0002-0049-00a2-00e300150090.png",
        "timestamp": 1554747645759,
        "duration": 18841
    },
    {
        "description": "should go to specific Location|Sets \"show specific device\" ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c7e62fba8b6d346902fe165be4bad6e7",
        "instanceId": 59779,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2872:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554747683964,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2769:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554747683964,
                "type": ""
            }
        ],
        "screenShotFile": "008700e0-0064-0048-0041-004a00a000bb.png",
        "timestamp": 1554747665476,
        "duration": 18618
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554747776267,
                "type": ""
            }
        ],
        "screenShotFile": "00d00063-00a0-000a-00f2-0020006a00f8.png",
        "timestamp": 1554747775692,
        "duration": 7875
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554747785080,
                "type": ""
            }
        ],
        "screenShotFile": "00cf00fb-000f-0026-0074-003a0058006e.png",
        "timestamp": 1554747784340,
        "duration": 13172
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <i class=\"icon icon-brandify-receiver-generic-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (375, 527). Other element would receive the click: <div class=\"row\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <i class=\"icon icon-brandify-receiver-generic-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (375, 527). Other element would receive the click: <div class=\"row\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToDevices (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:65:20)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:46:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should click \"Devices\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:43:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:37:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00250087-00aa-006a-0024-005b00e2009b.png",
        "timestamp": 1554747798170,
        "duration": 15674
    },
    {
        "description": "should click \"Locations\" and go there|Tab changes",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <i class=\"icon icon-brandify-location-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (525, 527). Other element would receive the click: <div style=\"text-align: center\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <i class=\"icon icon-brandify-location-blue\" ng-if=\"getIcon()\"></i> is not clickable at point (525, 527). Other element would receive the click: <div style=\"text-align: center\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.13.6 x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at LoginPage.goToLocations (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/page-objects/LoginPage.js:72:22)\n    at UserContext.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:54:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"should click \"Locations\" and go there\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:51:5)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Applications/MAMP/htdocs/muxlabcontrol_testGUI/tests/e2e/login-spec.js:37:1)\n    at Module._compile (internal/modules/cjs/loader.js:722:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:733:10)\n    at Module.load (internal/modules/cjs/loader.js:620:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:560:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005c008b-0057-0026-0066-002e00e700e0.png",
        "timestamp": 1554747814779,
        "duration": 15879
    },
    {
        "description": "should click \"Favorites\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006e00e2-0002-003c-00b7-009e0003003a.png",
        "timestamp": 1554747831405,
        "duration": 13783
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00df0024-00f3-00ea-00cf-004a007800b5.png",
        "timestamp": 1554747846192,
        "duration": 8288
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00480001-00d6-00f5-001b-00dd004a00f2.png",
        "timestamp": 1554747855448,
        "duration": 15890
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002d00fa-0087-00b8-006d-0095009900da.png",
        "timestamp": 1554747872299,
        "duration": 16132
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ab007d-00be-00b4-0052-00d00007001a.png",
        "timestamp": 1554747888980,
        "duration": 16158
    },
    {
        "description": "should go to second device on login|Sets \"show specific\" device and locations",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004700ad-009d-0093-00d5-00e8005c008d.png",
        "timestamp": 1554747906075,
        "duration": 17707
    },
    {
        "description": "should go to specific location on login|Sets \"show specific\" device and locations",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1f6fbaeec9bd2fe065c91d29d080c6fd",
        "instanceId": 59907,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2872:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554747942359,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2769:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554747942360,
                "type": ""
            }
        ],
        "screenShotFile": "009a00b4-0045-00ed-0046-009c003a001b.png",
        "timestamp": 1554747924541,
        "duration": 18050
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554747990248,
                "type": ""
            }
        ],
        "screenShotFile": "00480068-00d7-00b9-007b-006200b200f6.png",
        "timestamp": 1554747989046,
        "duration": 6504
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554747997009,
                "type": ""
            }
        ],
        "screenShotFile": "007400a2-003e-0012-003b-00aa00f700f1.png",
        "timestamp": 1554747996151,
        "duration": 7156
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0035003a-00e3-00a3-008c-005800440005.png",
        "timestamp": 1554748003791,
        "duration": 7828
    },
    {
        "description": "should click \"Locations\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e800df-00d4-00e1-00b8-00ac005d00ea.png",
        "timestamp": 1554748012112,
        "duration": 8790
    },
    {
        "description": "should click \"Favorites\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004700d2-005d-0035-0038-0052003400aa.png",
        "timestamp": 1554748021808,
        "duration": 7772
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e90040-00f4-0054-00ab-005a001800d3.png",
        "timestamp": 1554748030529,
        "duration": 7841
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009100ab-00e7-002e-003b-0039007e00a4.png",
        "timestamp": 1554748039186,
        "duration": 15948
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d30031-0011-0077-004a-008800400056.png",
        "timestamp": 1554748056136,
        "duration": 17160
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00080076-00e2-00ba-0081-0003009e00bb.png",
        "timestamp": 1554748073875,
        "duration": 17297
    },
    {
        "description": "should go to second device on login|Sets \"show specific\" device and locations",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00dc002f-005a-00d6-00fd-000300f600b3.png",
        "timestamp": 1554748092182,
        "duration": 18516
    },
    {
        "description": "should go to specific location on login|Sets \"show specific\" device and locations",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "1cb215cfca103175c9e9e948b1327dd8",
        "instanceId": 60127,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2872:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554748129938,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2769:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554748129938,
                "type": ""
            }
        ],
        "screenShotFile": "00aa0013-0042-00d6-0040-00d100c1005b.png",
        "timestamp": 1554748111487,
        "duration": 18577
    },
    {
        "description": "should load up \"setup ip\" page first|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1554748159736,
                "type": ""
            }
        ],
        "screenShotFile": "00760000-00f6-0024-001e-00de00a30018.png",
        "timestamp": 1554748159144,
        "duration": 5829
    },
    {
        "description": "should redirect to login page, after saving IP address|Login Tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://192.168.168.50/mnc/secure_api.php - Failed to load resource: net::ERR_ADDRESS_UNREACHABLE",
                "timestamp": 1554748166129,
                "type": ""
            }
        ],
        "screenShotFile": "00ab0082-004a-00ab-0014-000f001400d6.png",
        "timestamp": 1554748165391,
        "duration": 7129
    },
    {
        "description": "should click \"Devices\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b1001f-008f-0000-00c6-001700940020.png",
        "timestamp": 1554748172894,
        "duration": 8507
    },
    {
        "description": "should click \"Locations\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00540004-006a-0038-006a-006400b60083.png",
        "timestamp": 1554748181789,
        "duration": 8636
    },
    {
        "description": "should click \"Favorites\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00aa0066-00c5-006f-00e0-0074004d0004.png",
        "timestamp": 1554748191047,
        "duration": 7937
    },
    {
        "description": "should click \"Settings\" and go there|Tab changes",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e80067-00a9-00f0-00b6-006900a9007c.png",
        "timestamp": 1554748199547,
        "duration": 7915
    },
    {
        "description": "should go to \"Favorites\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001c0095-002a-008f-003d-00e9004b007f.png",
        "timestamp": 1554748207993,
        "duration": 15903
    },
    {
        "description": "should go to \"Devices\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00470041-0026-007b-00f6-00fd006300a1.png",
        "timestamp": 1554748224433,
        "duration": 15646
    },
    {
        "description": "should go to \"Locations\" by default|Default tests",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f70008-001a-009d-0094-00f200720024.png",
        "timestamp": 1554748240425,
        "duration": 16248
    },
    {
        "description": "should go to second device on login|Sets \"show specific\" device and locations",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00060091-0071-00d0-0022-00c4006400ae.png",
        "timestamp": 1554748257207,
        "duration": 17315
    },
    {
        "description": "should go to specific location on login|Sets \"show specific\" device and locations",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "055b78a69cb0709d6d23aeb7944f8541",
        "instanceId": 60315,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2872:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554748292402,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:8100/lib/ionic/js/ionic.bundle.js 26798:23 \"TypeError: Cannot read property 'addEventListener' of undefined\\n    at Object.bindDom (http://localhost:8100/lib/ionic/js/ionic.bundle.js:871:17)\\n    at Object.onTouch (http://localhost:8100/lib/ionic/js/ionic.bundle.js:885:12)\\n    at new ionic.Gestures.Instance (http://localhost:8100/lib/ionic/js/ionic.bundle.js:761:26)\\n    at new ionic.Gesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:644:12)\\n    at Function.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:594:21)\\n    at Object.ionic.onGesture (http://localhost:8100/lib/ionic/js/ionic.bundle.js:621:73)\\n    at Object.on (http://localhost:8100/lib/ionic/js/ionic.bundle.js:53788:27)\\n    at http://localhost:8100/js/angelica-o.bundle.js:2769:31\\n    at \\u003Canonymous>:410:29\\n    at http://localhost:8100/lib/ionic/js/ionic.bundle.js:32328:31\"",
                "timestamp": 1554748292403,
                "type": ""
            }
        ],
        "screenShotFile": "00210033-009e-008e-00b7-005200010073.png",
        "timestamp": 1554748274975,
        "duration": 17659
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

