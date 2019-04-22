/**
 * Verifies whether variable is empty
 * @param str
 * @returns {boolean}
 */
var isEmpty = function (str) {
    if (typeof str === "undefined" || str === "" || str === 0 || str === "0")
        return true;
    else
        return false;
};

app.controller('HomeCtrl', function ($scope, $uibModal, TestServerAPIService, $interval) {

    var $ctrl = this;
    /**
     * Fetches version data for the table
     */
    $ctrl.refreshPage = function () {
        TestServerAPIService.getMNCVirtualMachines().then(function (resp) {
            $scope.mncs = resp.data;
        }).catch(function (e) {
            $scope.alert = [{type:'danger', msg: "Error occurred while fetching mnc virtual machine"}];
            console.log("Failed to get mnc virtual machines");
            console.log(e);
        });

        TestServerAPIService.getTestSuites().then(function (resp) {
            $scope.testsuites = resp.data;
        }).catch(function (e) {
            $scope.alert = [{type:'danger', msg: "Error occurred while getting test suite"}];
            console.log("Failed to get test suites");
            console.log(e);
        });
    };

    $ctrl.refreshPage();

    $interval(function () {
        $ctrl.refreshPage();
    }, 1000);

    $ctrl.createNewVirtualMncModal = function () {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/newVirtualMnc.html',
            controller: 'VirtualMachineCtrl',
            controllerAs: '$ctrl',
            animation: true,
            size: 'sm'
        });

        modalInstance.result.then(function () {
            $ctrl.refreshPage();
        });
    };

    $ctrl.createNewTestSuiteModal = function () {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/newTestSuite.html',
            controller: 'TestSuiteCtrl',
            controllerAs: '$ctrl',
            animation: true,
            size: 'md'
        });

        modalInstance.result.then(function (versions) {
            $ctrl.refreshPage();
        });
    };

    $ctrl.deleteMNC = function (mnc_id) {
        let deleteModalInstance  = $uibModal.open({
            templateUrl: 'modals/deleteModal.html',
            controller: function ($uibModalInstance, TestServerAPIService, mnc_id) {
                this.confirmDelete = function () {
                    TestServerAPIService.deleteMNCVirtualMachine(mnc_id).then(function (status) {
                        $scope.alert = [{type:'success', msg: "Deleted Virtual MNC succesfully"}];

                    }).catch(function (e) {
                        console.log("Failed to delete version virtual machine");
                        console.log(e);
                        $scope.alert = [{type:'danger', msg: "Error occurred while deleting version"}];
                    });

                    $uibModalInstance.close();
                };

                this.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            controllerAs: '$ctrl',
            animation: true,
            size: 'sm',
            resolve: {
                     mnc_id: function () { return mnc_id;}
            }
        });
    };

    $ctrl.deleteTestSuite = function(testsuite_id) {
        let deleteModalInstance  = $uibModal.open({
            templateUrl: 'modals/deleteModal.html',
            controller: function ($uibModalInstance, TestServerAPIService, testsuite_id) {
                this.confirmDelete = function () {
                    TestServerAPIService.deleteTestSuite(testsuite_id).then(function (status) {
                        $scope.alert = [{type:'success', msg: "Deleted Test Suite successfully"}];

                    }).catch(function (e) {
                        console.log("Failed to delete test suite");
                        console.log(e);
                        $scope.alert = [{type:'danger', msg: "Error occurred while deleting test suite"}];
                    });

                    $uibModalInstance.close();
                };

                this.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            controllerAs: '$ctrl',
            animation: true,
            size: 'sm',
            resolve: {
                testsuite_id: function () { return testsuite_id;}
            }
        });

    };

    $ctrl.openMNC = function (mnc) {
        window.open('http://' + mnc.ip_address + '/mnc', '_blank');
        };

    $ctrl.startMNC = function (id) {
        TestServerAPIService.startMNCVirtualMachine(id).then(function (status) {
            console.log(status);
            $ctrl.refreshPage();
        }).catch(function (e) {
            console.log("failed to start version virtual machine");
            console.log(e);
            $scope.alert = [
                {type:'danger', msg: "Error occurred while starting version virtual machine"}
            ];
        });
    };

    $ctrl.stopMNC = function (id) {
        TestServerAPIService.stopMNCVirtualMachine(id).then(function (status) {
            console.log(status);
            $ctrl.refreshPage();
        }).catch(function (e) {
            console.log("failed to start version virtual machine");
            console.log(e);
            $scope.alert = [{type:'danger', msg: "Error occurred while stopping version virtual machine"}];
        })
    };
});

app.controller('VirtualMachineCtrl', function ($scope, $uibModalInstance, TestServerAPIService) {

    //Get MNC Versions
    TestServerAPIService.getAvailableMNCVersions().then(function (versions) {
        console.log("get available mnc versions: " + versions.data);
        $scope.mncVersions = versions.data;
    }).catch(function (e) {
        console.log('failed to get available mnc versions')
        console.log(e);
        $scope.alert = [{type:'danger', msg: "Error occurred while getting available mnc versions"}];
    });

    this.createVM = function () {
        //debugging
        console.log("CREATE VM FUNCTION CALLED");
        console.log($scope.mnc_name);
        console.log($scope.mnc_versionSelected);

        //make sure name and version have been selected
        if (isEmpty($scope.mnc_name)) {
            $scope.alert = [{type:'danger', msg: "Name field empty"}];
        }
        else if (isEmpty($scope.mnc_versionSelected)) {
            $scope.alert = [{type:'danger', msg: "Version not selected"}];
        }
        else {
            //create version virtual machine
            TestServerAPIService.createMNCVirtualMachine($scope.mnc_name, $scope.mnc_versionSelected).then(function (result) {
                $scope.alert = [{type:'success', msg: "Created Virtual MNC succesfully"}];
                console.log(result);

            }).catch(function (e) {
                console.log("Failed to create version virtual machine");
                console.log(e);
                $scope.alert = [{type:'danger', msg: "Error occurred while creating virtual machine"}];
            });
        }
        $uibModalInstance.close();
    };

    this.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };


    this.selectVersion = function (mnc) {
        $scope.mnc_versionSelected = mnc;
    };


});

app.controller('TestSuiteCtrl', function ($scope, $uibModalInstance, TestServerAPIService) {
    let $ctrl = this;
    $scope.selectedMncVersions = [];
    $scope.selectedAppVersions = [];

    //Get MNC Versions
    TestServerAPIService.getAvailableMNCVersions().then(function (versions) {
        console.log("get available mnc versions: " + versions.data);
        $scope.availableMncVersions = versions.data;
    }).catch(function (e) {
        console.log('failed to get available mnc versions')
        console.log(e);
        $scope.alert = [{type:'danger', msg: "Error occurred while getting available mnc versions"}];
    });

    TestServerAPIService.getMuxLabControlAppVersions().then(function (result) {
        console.log(result);
        $scope.availableAppVersions = result.data;
    }).catch(function (e) {
         console.log('failed to get muxlab control app versions')
         console.log(e);
         $scope.alert = [{type:'danger', msg: "Error occurred while getting available Muxlab Control App versions"}];
    });

    $ctrl.createTestSuite = function () {
        var mncVersions = [];
        for (var i = 0; i < $scope.selectedMncVersions.length; i++ ) {
            mncVersions.push({
                identifier: $scope.selectedMncVersions[i]
            });
        }

        TestServerAPIService.createTestSuite($scope.testsuite_name, mncVersions, $scope.selectedAppVersions).then(function (result) {

        }).catch(function (e) {
            console.log("Failed to create test suite" + $scope.testsuite_name + " " + $scope.selectedMncVersions + " " + $scope.selectedAppVersions);
            console.log(e);
            $scope.alert = [{type:'danger', msg: "Error occurred while creating test Suite"}];
            });

        $uibModalInstance.close();

    };

    $ctrl.cancel = function () {
        $uibModalInstance.dismiss('cancel');
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

    }
});
