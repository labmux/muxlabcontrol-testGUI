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



app.controller('VirtualMachineCtrl', function ($scope, $uibModalInstance, TestServerAPIService) {

    //Get MNC Versions
    TestServerAPIService.getAvailableMNCVersions().then(function (versions) {
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

        // HomeCtrl.refreshPage();
        $uibModalInstance.close();
    };

    this.cancel = function () {
        $uibModalInstance.close();
    };


    this.selectVersion = function (mnc) {
        $scope.mnc_versionSelected = mnc;
    };


});