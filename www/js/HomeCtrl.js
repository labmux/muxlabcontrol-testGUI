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
            console.log("Failed to get mnc virtual machines: " + e);
        });

        TestServerAPIService.getTestSuites().then(function (resp) {

            $scope.testsuites = resp.data;
            // $scope.testsuites.params.specs = $ctrl.beautifySpecs($scope.testsuites.params.specs);
            console.log($scope.testsuites);


        }).catch(function (e) {
            $scope.alert = [{type:'danger', msg: "Error occurred while getting test suite"}];
            console.log("Failed to get test suites");
            console.log(e);
        });
    };


    $ctrl.refreshPage();

    $interval(function () {
        $ctrl.refreshPage();
    }, 3000);

    $ctrl.createNewVirtualMncModal = function () {
        let modalInstance = $uibModal.open({
            templateUrl: '../modals/NewVirtualMnc/newVirtualMnc.html',
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
            templateUrl: '../modals/NewTestSuite/newTestSuite.html',
            controller: 'TestSuiteCtrl',
            controllerAs: '$ctrl',
            animation: true,
            size: 'sm'
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

    $ctrl.testsuiteTab = function (tab) {
        $scope.testsuiteTab = tab;
    }
});