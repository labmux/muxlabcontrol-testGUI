var EC = protractor.ExpectedConditions;

var DevicesPage = function () {
    this.getMoreOptionsBtn = function () {
        return element(by.css('ion-item i[ng-click="showDeviceOptions($event, device)"]'));
    };

    this.deleteDevice = function () {
        let moreOptions_btn = element(by.css('i[ng-click="showDeviceOptions($event, device)"]'));
        let delete_btn = element(by.css('a[ng-click="deleteDevice(currentPopoverDevice)"]'));
        let confirmDelete_btn = element.all(by.repeater('button in buttons')).get(1);       // get by repeater cause button exists through ng-repeat, so no specific id

        // delete device
        moreOptions_btn.click();
        delete_btn.click();
        confirmDelete_btn.click();
    };

    /**
     * Restores first deleted device
     */
    this.restoreDevice = function () {
        let menu = element(by.css('div span button[ng-click="sortPopover.show($event);"]'));
        let showDeleted = element(by.css('div label[ng-click="sortPopover.hide()"]'));
        let moreOptions = this.getMoreOptionsBtn();
        let restore = element(by.css('div a[ng-click="undeleteDevice(currentPopoverDevice)"]'));

        browser.wait(EC.elementToBeClickable(menu), 1000);

        menu.click();
        showDeleted.click();
        moreOptions.click();
        restore.click();

        menu.click();
        showDeleted.click();
    };
};

module.exports = DevicesPage;