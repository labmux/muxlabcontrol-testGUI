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
     * Refetches array of mncs and refreshes the page
     */
    $ctrl.refreshPage = function () {
        TestServerAPIService.getMNCVirtualMachines().then(function (resp) {
            $scope.mncs = resp.data;
        }).catch(function (e) {
            console.log("Failed to get mnc virtual machines");
            console.log(e);
        });
    };

    $interval(function () {
        $ctrl.refreshPage();
    }, 1000);

    $ctrl.openModal = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'newMnc.html',
            controller: 'ModalInstanceCtrl',
            controllerAs: '$ctrl',
            animation: true,
            size: 'sm'
        });

        modalInstance.result.then(function () {
            $ctrl.refreshPage();
        });
    };

    $ctrl.deleteMNC = function (mnc_id) {
        var deleteModalInstance  = $uibModal.open({
            templateUrl: 'deleteMNC.html',
            controller: function ($uibModalInstance, TestServerAPIService, mnc_id) {
                this.confirmDelete = function () {
                    TestServerAPIService.deleteMNCVirtualMachine(mnc_id).then(function (status) {

                    }).catch(function (e) {
                        console.log("Failed to delete mnc virtual machine");
                        console.log(e);
                        window.alert('Error occurred while deleting mnc');
                    });

                    $ctrl.refreshPage();
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

    $ctrl.openMNC = function (mnc) {
        window.open('http://' + mnc.ip_address + '/mnc', '_blank');
        };

    $ctrl.startMNC = function (id) {
        TestServerAPIService.startMNCVirtualMachine(id).then(function (status) {
            console.log(status);
            $ctrl.refreshPage();
        }).catch(function (e) {
            console.log("failed to start mnc virtual machine");
            console.log(e);
            window.alert("Error occurred while starting mnc virtual machine");
        });
    };

    $ctrl.stopMNC = function (id) {
        TestServerAPIService.stopMNCVirtualMachine(id).then(function (status) {
            console.log(status);
            $ctrl.refreshPage();
        }).catch(function (e) {
            console.log("failed to start mnc virtual machine");
            console.log(e);
            window.alert("Error occurred while stopping mnc virtual machine");
        })
    };
});

app.controller('ModalInstanceCtrl', function ($scope, $uibModalInstance, TestServerAPIService) {
    //refresh
    TestServerAPIService.getAvailableMNCVersions().then(function (versions) {
        console.log("get available mnc versions: " + versions.data);
        $scope.mnc_versions = versions.data;
    }).catch(function (e) {
        console.log('failed to get available mnc versions')
        console.log(e);
        window.alert("Error occurred while getting available mnc versions");
    });

    this.createVM = function () {
        //debugging
        console.log($scope.mnc_name);
        console.log($scope.mnc_versionSelected);

        //make sure name and version have been selected
        if (isEmpty($scope.mnc_name)) {
            window.alert("Name field empty");
        }
        else if (isEmpty($scope.mnc_versionSelected)) {
            window.alert("Version not selected");
        }
        else {
            //create mnc virtual machine
            TestServerAPIService.createMNCVirtualMachine($scope.mnc_name, $scope.mnc_versionSelected).then(function (result) {

            }).catch(function (e) {
                console.log("Failed to create mnc virtual machine");
                console.log(e);
                window.alert('Error occurred while creating virtual machine')
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