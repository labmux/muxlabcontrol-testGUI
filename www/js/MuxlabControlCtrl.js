app.controller('MuxlabControlCtrl', function ($scope, $uibModalInstance, TestServerAPIService) {
    let $ctrl = this;
    $scope.testsuite_name = '';
    $scope.selectedMncVersions = [];
    $scope.selectedAppVersions = [];
    $scope.selectedSpecs = [];

    /**
     * Get available mnc versions
     */
    TestServerAPIService.getAvailableMNCVersions().then(function (versions) {
        console.log("get available mnc versions: " + versions.data);
        $scope.availableMncVersions = versions.data;
    }).catch(function (e) {
        console.log('failed to get available mnc versions')
        console.log(e);
        $scope.alert = [{type:'danger', msg: "Error occurred while getting available mnc versions"}];
    });

    /**
     * Get MuxlabControl app Versions
     */
    TestServerAPIService.getMuxLabControlAppVersions().then(function (result) {
        console.log(result);
        $scope.availableAppVersions = result.data;

    }).catch(function (e) {
        console.log('failed to get muxlab control app versions')
        console.log(e);
        $scope.alert = [{type:'danger', msg: "Error occurred while getting available Muxlab Control App versions"}];
    });

    /**
     * Get spec files
     */
    TestServerAPIService.getMuxlabControlSpecs().then(function (resp) {
        //remove first two options (., ..)
        $scope.spec_files = resp.data.slice(2);

        for(let i = 0; i < $scope.spec_files.length; i++) {
            $scope.spec_files[i] = $scope.spec_files[i]
            // remove -spec.js
                .replace(/(-spec.js|.js)/, '')
                // put space
                .replace(/([A-Z])/g, ' $1')
                // uppercase the first character
                .replace(/^./, function(str){ return str.toUpperCase(); })
        }

    }).catch(function (e) {
        console.log("Failed to get spec files");
        console.log(e);
        $scope.alert = [{type:'danger', msg: "Error occurred while getting spec files"}];
    });

    $ctrl.createTestSuite = function () {
        if ($scope.testsuite_name == '') {
            alert("Couldn't create Test Suite: Name is undefined");
        }
        else if ($scope.selectedMncVersions.length == 0) {
            alert("Couldn't create Test Suite: Mnc Versions is undefined");
        }
        else if ($scope.selectedAppVersions.length == 0) {
            alert("Couldn't create Test Suite: App Version is undefined");
        }
        else if ($scope.selectedSpecs.length == 0) {
            alert("Couldn't create Test Suite: Test Spec is undefined");
        }
        else {
            $scope.fd = new FormData();
            $ctrl.setUploadFile();

            var mncVersions = [];
            for (var i = 0; i < $scope.selectedMncVersions.length; i++ ) {
                mncVersions.push({
                    identifier: $scope.selectedMncVersions[i]
                });
            }

            TestServerAPIService.createTestSuite($scope.testsuite_name, mncVersions, $scope.selectedAppVersions, $scope.fd, $scope.selectedSpecs).then(function (result) {

            }).catch(function (e) {
                console.log("Failed to create test suite " + $scope.testsuite_name + " " + $scope.selectedMncVersions + " " + $scope.selectedAppVersions);
                console.log(e);
                $scope.alert = [{type:'danger', msg: "Error occurred while creating test Suite"}];
            });
        }

        // HomeCtrl.refreshPage()
        $uibModalInstance.close();
    };

    $ctrl.cancel = function () {
        $uibModalInstance.close();
    };

    $ctrl.toggleSelectedMncVersion = function (version) {

        let i = $scope.selectedMncVersions.indexOf(version);

        if (i == -1)
            $scope.selectedMncVersions.push(version);
        else
            $scope.selectedMncVersions.splice(i, 1);
    };

    $ctrl.toggleSelectedAppVersion = function (version) {
        let i = $scope.selectedAppVersions.indexOf(version);

        if (i == -1)
            $scope.selectedAppVersions.push(version);
        else
            $scope.selectedAppVersions.splice(i, 1);

    };

    $ctrl.toggleSelectedSpec = function (spec) {
        let i = $scope.selectedSpecs.indexOf(spec);

        if (i == -1)
            $scope.selectedSpecs.push(spec);
        else
            $scope.selectedSpecs.splice(i, 1);
    };

    $ctrl.setUploadFile = function () {
        if (angular.isDefined($scope.files)) {
            $scope.fd.append("file", $scope.files[0]);

            // console.log(files);
            // console.log(files[0]);
            // console.log($scope.fd);
            // console.log($scope.fd.values());
            // for (var value of $scope.fd.entries()) {
            //     console.log(value);
            // }
        }
    }
});