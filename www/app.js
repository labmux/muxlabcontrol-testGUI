angular.module('uiBootstrap', ['ui.router', 'ui.bootstrap']);
angular.module('uiBootsrtap').controller('ModalCtrl', function ($uibModal) {
    var $ctrl = this;

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
})

angular.module('uiBootstrap').config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.when('', '/home');

    $stateProvider
        .state('root', {
            url: '/',
            template: 'You are at root'
        })
        .state()
})