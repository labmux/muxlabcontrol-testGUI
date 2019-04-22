/**
 * Import LoginPage function
 * @type {LoginPage}
 */
var loginpagepo = require('./page-objects/LoginPage.js');
var LoginPage = new loginpagepo();

var ip = browser.params.ipAddress;
var port = browser.params.port;

var EC = protractor.ExpectedConditions;

describe('Devices test', function () {
    beforeEach(function () {
        browser.get("http://localhost:8100/");
    });

    // TODO problems with this it
    it('should delete device', function () {
        LoginPage.ip_login(ip);
        LoginPage.login();
        LoginPage.goToDevices();

        // TODO Ariel these names still show up and work on my version of muxlab control
        // var moreOptions_btn = element(by.name("devices_moreOptions"));
        // var delete_btn = element(by.name("devices_delete"));
        // var confirmDelete_btn = element(by.className("devices-confirmDelete"));

        var length_before, length_after;

        element.all(by.repeater('device in displaysList.available | orderBy: sort.by track by device.mac')).count().then(function (len) {
            length_before = len;

        });

        var moreOptions_btn = element(by.css('i[ng-click="showDeviceOptions($event, device)"]'));
        var delete_btn = element(by.css('a[ng-click="deleteDevice(currentPopoverDevice)"]'));
        var confirmDelete_btn = element.all(by.repeater('button in buttons')).get(1);       // get by repeater cause button exists through ng-repeat, so no specific id

        // delete device
        moreOptions_btn.click();
        delete_btn.click();
        confirmDelete_btn.click();

        element.all(by.repeater('device in displaysList.available | orderBy: sort.by track by device.mac')).count().then(function (len) {
            length_after = len;
        });

        //TODO Not working, error: expecting false to be true
        expect(length_before > length_after).toBe(true);
    });

    // it('should verify that devices list is not empty', function () {
    //     //LoginPage.ip_login();
    //     LoginPage.login();
    //     LoginPage.goToDevices();
    //
    //     element.all(by.repeater('device in displaysList.available')).count().then(function (devices) {
    //         expect(devices >= 1).toBe(true);
    //     });
    // });
    //
    // it('should verify that sources list is not empty', function () {
    //     LoginPage.login();
    //     LoginPage.goToDevices();
    //
    //     element.all(by.repeater('device in sourcesList.available')).then(function (sources) {
    //         expect(sources.length >= 1).toBe(true);
    //     });
    // });
});