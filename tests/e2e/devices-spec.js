/**
 * Import LoginPage function
 * @type {LoginPage}
 */
var loginpagepo = require('./page-objects/LoginPage.js');
var LoginPage = new loginpagepo();

describe('Devices test', function () {
    beforeEach(function () {
        browser.get("http://localhost:8100/");
    });

    it('should delete device', function () {
        LoginPage.ip_login(browser.params.ipAddress);
        LoginPage.login();
        LoginPage.goToDevices();

        var moreOptions_btn = element(by.name("devices_moreOptions"));
        var delete_btn = element(by.name("devices_delete"));
        var confirmDelete_btn = element(by.className("devices-confirmDelete"));

        var length_before, length_after;
        element.all(by.repeater('device in displayList.available')).count().then(function (len) {
            length_before = len;
            moreOptions_btn.click();
            delete_btn.click();
            confirmDelete_btn.click();
            console.log(length_before);

        });

        element.all(by.repeater('device in displayList.available')).count().then(function (len) {
            length_after = len;

        });

        expect(length_before > length_after).toBe(true);
    });

    it('should verify that devices list is not empty', function () {
        //LoginPage.ip_login();
        LoginPage.login();
        LoginPage.goToDevices();

        element.all(by.repeater('device in displaysList.available')).count().then(function (devices) {
            expect(devices >= 1).toBe(true);
        });
    });

    it('should verify that sources list is not empty', function () {
        LoginPage.login();
        LoginPage.goToDevices();

        element.all(by.repeater('device in sourcesList.available')).then(function (sources) {
            expect(sources.length >= 1).toBe(true);
        });
    });
});