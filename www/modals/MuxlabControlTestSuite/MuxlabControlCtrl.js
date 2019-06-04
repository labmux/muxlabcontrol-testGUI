app.controller('MuxlabControlCtrl', function ($scope, $uibModalInstance, TestServerAPIService) {
    let $ctrl = this;
    $scope.testsuite_name = '';
    $scope.selectedMncVersions = [];
    $scope.selectedAppVersions = [];
    $scope.selectedSpecs = [];

    $scope.fd = new FormData();

    /**
     * Get available mnc versions
     */
    TestServerAPIService.getAvailableMNCVersions().then(function (versions) {
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
        $scope.spec_files = resp.data;

    }).catch(function (e) {
        console.log("Failed to get spec files");
        console.log(e);
        $scope.alert = [{type:'danger', msg: "Error occurred while getting spec files"}];
    });

    /**
     * Create a test
     */
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
            // transform mncVersions for server
            var mncVersions = [];
            for (var i = 0; i < $scope.selectedMncVersions.length; i++ ) {
                mncVersions.push({
                    identifier: $scope.selectedMncVersions[i]
                });
            }

            // get upload file if set
            $ctrl.setUploadFile();

            // convert all data for form data
            $scope.selectedSpecs = JSON.stringify($scope.selectedSpecs);
            mncVersions = JSON.stringify(mncVersions);
            $scope.selectedAppVersions = JSON.stringify($scope.selectedAppVersions);
            // $scope.testsuite_name = JSON.stringify($scope.testsuite_name);

            // insert all information inside the form data
            $scope.fd.append('name', $scope.testsuite_name);
            $scope.fd.append('mnc_versions', mncVersions);
            $scope.fd.append('app_versions', $scope.selectedAppVersions);
            $scope.fd.append('specs', $scope.selectedSpecs);

            // console.log(specs);
            TestServerAPIService.createTestSuite($scope.fd).then(function (result) {

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

        var file = document.querySelector('#file');

        if (file !== null && file !== 'undefined' && file !== '')
            $scope.fd.append("file", file.files[0]);

        // debugging
        // console.log($scope.fd.entries());
        // // console.log(file);
        // for (var value of $scope.fd.entries()) {
        //     console.log(value);
        // }
    };

});
