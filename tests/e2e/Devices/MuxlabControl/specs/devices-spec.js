/**
 * Import LoginPage function
 * @type {LoginPage}
 */
var loginpagepo = require('../page-objects/LoginPage.js');
var LoginPage = new loginpagepo();

var devicespagepo = require('../page-objects/DevicesPage');
var DevicesPage = new devicespagepo();

var ip = browser.params.ipAddress;
var port = browser.params.port;

var EC = protractor.ExpectedConditions;

describe('Devices test', function () {
    beforeEach(function () {
        browser.get(port);
    });

    // TODO problems with this it
    it('should delete device', function () {
        // LoginPage.ip_login(ip);
        LoginPage.login();
        LoginPage.goToDevices();

        var length_before, length_after;

        element.all(by.repeater('device in displaysList.available')).count().then(function (len) {
            length_before = len;
        });

        DevicesPage.deleteDevice();

        element.all(by.repeater('device in displaysList.available')).count().then(function (len) {
            length_after = len;
            expect((length_before > length_after)).toBe(true);
        });
    });

    //TODO doesnt work when theres an it before it
    it('should restore deleted device', function () {
        LoginPage.login();
        LoginPage.goToDevices();

        var length_before, length_after;

        element.all(by.repeater('device in displaysList.available')).count().then(function (len) {
            length_before = len;
        });

        DevicesPage.restoreDevice();

        element.all(by.repeater('device in displaysList.available')).count().then(function (len) {
            length_after = len;
            expect((length_after > length_before)).toBe(true);
        });
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