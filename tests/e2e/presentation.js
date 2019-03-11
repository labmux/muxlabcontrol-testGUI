/**
 * Import LoginPage function
 * @type {LoginPage}
 */
var loginpagepo = require('./page-objects/LoginPage.js');
var LoginPage = new loginpagepo();

/**
 * Import LocationsPage functions
 * @type {LocationsPage}
 */
var locationspage = require('./page-objects/LocationsPage');
var LocationsPage = new locationspage();


//get muxlablab defaultPageData key
var ip = browser.params.ipAddress;
var key = ip + "_admin_defaultPageData";
var port = browser.params.port;


/**
 * Make sure switching tabs works
 */
describe('Tab changes', function () {
    beforeEach(function () {
        browser.get(port);

    });

    it('should click "Devices" and go there', function () {
        LoginPage.ip_login(ip);
        LoginPage.login();

        LoginPage.goToDevices();
        LoginPage.goToLocations();
        LoginPage.goToFavorites();
        LoginPage.goToSettings();
        LoginPage.goToFavorites();
        LoginPage.goToLocations();
        LoginPage.goToDevices();
        LoginPage.goToFavorites();
        LoginPage.goToDevices();

        expect(browser.getCurrentUrl()).toContain('/devices');
    });

    it('should add location', function () {

        LoginPage.login();
        LoginPage.goToLocations();

        var locationlength_before;
        var locationlength_after;

        //get length before adding location
        element.all(by.repeater('location in locations')).count().then(function (loc) {
            locationlength_before = loc;
        });

        LocationsPage.addLocation("AUTOMATED TEST");

        //get length after having added location
        element.all(by.repeater('location in locations')).count().then(function (loc) {
            locationlength_after = loc;

            expect((locationlength_after > locationlength_before)).toBe(true);
        });
    });

    it('should add sublocation', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        LocationsPage.addSubLocation("AUTOMATED TEST SUBLOCATION");
        LocationsPage.next();

        element.all(by.repeater('location in locations')).count().then(function (loc) {
            expect(loc != 0).toBe(true);
        });
    });

    it('should delete location', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        var locationlength_before;
        var locationlength_after;

        //get length before deleting location
        element.all(by.repeater('location in locations')).count().then(function (loc) {
            locationlength_before = loc;
        });

        LocationsPage.delete();

        //get length after deleting location
        element.all(by.repeater('location in locations')).count().then(function (loc) {
            locationlength_after = loc;

            expect((locationlength_before > locationlength_after)).toBe(true);
        });
    });

});