app.controller('TestSuiteCtrl', function ($scope, $uibModalInstance, $uibModal, TestServerAPIService) {
    let $ctrl = this;

    /**
     * Gets a list of available devices to test
     */
    TestServerAPIService.getDevices().then(function (resp) {
        //remove first two options (., ..)
        $scope.devicesList = resp.data.slice(2);

    }).catch(function (e) {
        console.log("Failed to get devices");
        $scope.alert = [{type:'danger', msg: "Error occurred while getting devices"}];
    });

    $ctrl.openDevice = function(device) {
        if (device == 'MuxlabControl') {
            // close current modal
            $uibModalInstance.close();

            // open new modal
            let modalInstance = $uibModal.open({
                templateUrl: '../modals/muxlabControl.html',
                controller: 'MuxlabControlCtrl',
                controllerAs: '$ctrl',
                animation: true,
                size: 'md'
            });

        }
    };
});