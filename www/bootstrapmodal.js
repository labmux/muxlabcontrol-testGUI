angular.module('uiBootstrap').controller('ModalCtrl', function ($uibModal, TestServerAPIService) {
    var $ctrl = this;

    $ctrl.open = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'newMnc.html',
            controller: 'ModalInstanceCtrl',
            controllerAs: '$ctrl',
            // resolve: {
            //     version: function () {
            //         return $ctrl.mnc.version;
            //     }
            // }
        });

        modalInstance.result.then(function (selectedItem) {
            $ctrl.selected = selectedItem;
        });
    };

    $ctrl.getMncs = function () {
        TestServerAPIService.getAvailableMNCVersions().then(function (versions) {
            console.log(versions);
            $mncs = versions;
        });

        return $mncs;
    }
});

angular.module('uiBootstrap').controller('ModalInstanceCtrl',function ($uibModalInstance, TestServerAPIService) {

    this.ok = function () {
        $uibModalInstance.close();
    };

    this.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
});
