/**
* Import LoginPage function
* @type {LoginPage}
*/
var loginpagepo = require('../page-objects/LoginPage.js');
var LoginPage = new loginpagepo();

/**
 * Import SettingsPage function
 * @type {SettingsPage}
 */
var settingspage = require('../page-objects/SettingsPage.js');
var SettingsPage = new settingspage();


//get muxlablab defaultPageData key
var ip = browser.params.ipAddress;
var port = browser.params.port;
var test_run_id = browser.params.test_run_id;

var EC = protractor.ExpectedConditions;

describe('Ngrok test', function () {
    beforeEach(function () {
        browser.get(port);

    });
    
    it('should set ngrok url', function () {
        LoginPage.ip_login(ip);
        LoginPage.login();

        LoginPage.goToSettings();

        // go to remote access settings and enable it
        SettingsPage.remoteAccess();
        SettingsPage.enableRemoteAccess();

        // gives specifications of remote access
        SettingsPage.setRemoteAccess('AUTOMATED TEST', '3sgYM3MDqxjW16LDr5wyQ_2Cb6C29nKDg3hSgWTMmVS', 'muxlab-' + test_run_id);

        // when process executes succesfully, return to settings page
        expect(browser.getCurrentUrl()).toContain('settings');
    });
});

/**
 * Tests default page
 */
describe('Default page tests', function () {
    beforeEach(function () {
        browser.get(port);
        LoginPage.login();
    });

    it('should go to "Favorites" by default', function() {
        LoginPage.goToSettings();
        element(by.css('div[ng-click="defaultPageTypeModal.showModal($event)"]')).click();

        let favorites = element(by.css('label[ng-value="\'favorites\'"]'));
        browser.wait(EC.elementToBeClickable(favorites), 1000);
        favorites.click();

        browser.refresh();
        LoginPage.login();
        expect(browser.getCurrentUrl()).toContain('/favorites');
    });

    it('should go to "Devices" by default', function() {
        LoginPage.goToSettings();
        element(by.css('div[ng-click="defaultPageTypeModal.showModal($event)"]')).click();

        let devices = element(by.css('label[ng-value="\'devices\'"]'));
        browser.wait(EC.elementToBeClickable(devices), 1000);
        devices.click();

        browser.refresh();
        LoginPage.login();
        expect(browser.getCurrentUrl()).toContain('/devices');
    });

    it('should go to "Locations" by default', function() {
        LoginPage.goToSettings();
        element(by.css('div[ng-click="defaultPageTypeModal.showModal($event)"]')).click();

        let locations = element(by.css('label[ng-value="\'locations\'"]'));
        browser.wait(EC.elementToBeClickable(locations), 1000);
        locations.click();

        browser.refresh();
        LoginPage.login();
        expect(browser.getCurrentUrl()).toContain('/locations');
    });
});

/**
 * Tests default specific page
 */
describe('Sets "show specific" device and locations', function () {
    beforeEach(function () {
        browser.get(port);
        LoginPage.login();
    });

    /**
     * BUG: cannot log in when selected device has been disconnected
     */
    it('should go to second device on login', function () {
        LoginPage.goToSettings();

        // clicks default page then selects devices as default page
        element(by.css('div[ng-click="defaultPageTypeModal.showModal($event)"]')).click();
        let devices = element(by.css('label[ng-value="\'devices\'"]'));
        browser.wait(EC.elementToBeClickable(devices), 1000);
        devices.click();

        // clicks "show specific device" and selects second element
        element(by.css('a[ng-click="selectDeviceModal.showModal($event)"]')).click();
        let  device = element.all(by.repeater('device in selectDeviceModal.availableDevices | filter:selectDeviceModal.addDeviceData.search track by device.mac')).get(1);
        browser.wait(EC.elementToBeClickable(device), 1000);
        device.click();

        browser.refresh();
        LoginPage.login();
        expect(browser.getCurrentUrl()).toContain('viewDisplay');
    });

    it('should go to specific location on login', function () {
        LoginPage.goToSettings();

        // clicks default page then selects locations as default page
        element(by.css('div[ng-click="defaultPageTypeModal.showModal($event)"]')).click();
        let locations = element(by.css('label[ng-value="\'locations\'"]'));
        browser.wait(EC.elementToBeClickable(locations), 1000);
        locations.click();

        // clicks "show specific location" and selects first element
        element(by.css('a[ng-click="selectLocationModal.showModal($event)"]')).click();
        let  loc = element.all(by.repeater('location in slide.locations track by location.id')).get(0);
        browser.wait(EC.elementToBeClickable(loc), 1000);
        loc.click();

        browser.refresh();
        LoginPage.login();
        expect(browser.getCurrentUrl()).toContain('location');
    });
});


