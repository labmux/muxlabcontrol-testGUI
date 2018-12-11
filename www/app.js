angular.module('uiBootstrap', ['ui.bootstrap']);


angular.module('uiBootstrap').factory('TestServerAPIService', ['$q', '$http', function TestServerAPIServiceFactory ($q, $http) {

    var api_root = 'http://192.168.168.100/api';

    return {
        getMuxLabControlAppVersions: function () {
            return $http.get(api_root + '/muxlabcontrol/app-versions');
        },
        getAvailableMNCVersions: function () {
            return $http.get(api_root + '/mnc/available-versions');
        }
    };
}]);




angular.module('uiBootstrap').controller('ModalCtrl', ['TestServerAPIService', function (TestServerAPIService) {
    var $ctrl = this;

    window.TestServerAPIService = TestServerAPIService;
    return;//TODO @Eliran remove this line. The code below doesn't work so I added this line to test the app without it
    $ctrl.animationsEnabled = true;

    $ctrl.mnc.name;
    $ctrl.mnc.version = ['1.0.0','1.0.1','1.1.1','2.0.5'];
    $ctrl.app.version = ['1.0.0','1.0.1','1.1.1','2.0.5'];

    $ctrl.addMnc = function () {
        var modalInstance = $uibModal.open({
            animation: $ctrl.animationsEnabled,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'myModalContent.html',
            controller: 'ModalInstanceCtrl',
            controllerAs: '$ctrl',
            size: size,
            appendTo: parentElem,
            resolve: {
                version: function () {
                    return $ctrl.mnc.version;
                }
            }
        });

    }
}]);


