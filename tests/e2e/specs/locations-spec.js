/**
 * Import LoginPage functions
 * @type {LoginPage}
 */
var loginpage = require('../page-objects/LoginPage.js');
var LoginPage = new loginpage();

/**
 * Import LocationsPage functions
 * @type {LocationsPage}
 */
var locationspage = require('../page-objects/LocationsPage');
var LocationsPage = new locationspage();

/**
 * Import TestValidation functions
 * @type {TestValidation}
 */
var testvalidation = require('../page-objects/TestValidations');
var TestValidation = new testvalidation();

//get muxlablab defaultPageData key
var ip = browser.params.ipAddress;
var port = browser.params.port;

describe('Locations page tests', function () {

     beforeEach(function () {
         browser.get(port);
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

        LocationsPage.addLocation("TESTING");

        //get length after having added location
        element.all(by.repeater('location in locations')).count().then(function (loc) {
            locationlength_after = loc;

            expect((locationlength_after > locationlength_before)).toBe(true);
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

    it('should rename a location', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        LocationsPage.addLocation('Rename this');
        LocationsPage.rename('Rename this', '0 RENAMED');

        // refresh session to see if location was succesfully renamed
        browser.get(port);
        LoginPage.login();
        LoginPage.goToLocations();

        //will verify that first element in array is equal to "AAA RENAMED"
        element.all(by.repeater('location in locations')).then(function(loc) {
            expect(loc[0].getText()).toBe("0 RENAMED");
        });
    });

    it('should add sublocation', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        LocationsPage.addSubLocation("NEW Sublocation");
        LocationsPage.next();

        element.all(by.repeater('location in locations')).count().then(function (loc) {
            expect(loc != 0).toBe(true);
        });
    });

    /*
    does not click three dots
     */
    //TODO DOES NOT WORK
    /**
     * Creates a location with a sublocation, then deletes that sublocation
     */
    // it('should delete sublocation', function () {
    //     LoginPage.ip_login(ip);
    //     LoginPage.login();
    //     LoginPage.goToLocations();
    //
    //     var length_before, length_after;
    //
    //     LocationsPage.addLocation('0 SUBLOCATION TEST');
    //     LocationsPage.addSubLocation('0 SUB');
    //     LocationsPage.next();
    //
    //     element.all(by.repeater('location in locations')).count().then(function (loc) {
    //         length_before = loc;
    //     });
    //
    //     LocationsPage.deleteSubLocation();
    //
    //
    //     element.all(by.repeater('location in locations')).count().then(function (loc) {
    //         length_after = loc;
    //         expect(length_before > length_after).toBe(true);
    //
    //     });
    //
    // });

    it('should delete location with sublocations', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        var length_before;
        var length_after;

        // create before deleting
        LocationsPage.addSubLocation('A TEST');

        element.all(by.repeater('location in locations')).count().then(function (len) {
            length_before = len;

            LocationsPage.deleteSubLocations();
        });

        element.all(by.repeater('location in locations')).count().then(function (len) {
            length_after = len;

            expect(length_before > length_after).toBe(true);
        });

    });

    it('should create two new locations, then move one into the other', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        LocationsPage.addLocation("Home");
        LocationsPage.addLocation("Bedroom");

        var locationlength_before;
        var locationlength_after;

        element.all(by.repeater('location in locations')).count().then(function (len) {
            locationlength_before = len;
        });

        LocationsPage.move();

        element.all(by.repeater('location in locations')).count().then(function (len) {
            locationlength_after = len;
            expect(locationlength_after < locationlength_before).toBe(true);
        });
    });

    /**
     * Create a location, then adds a device to it
     * REQUIRED: AVAILABLE DEVICE
     */
    it('should add a device in a location', function () {
        LoginPage.login();
        LoginPage.goToLocations();
        LocationsPage.addLocation('ADD DEVICE TEST');
        LocationsPage.selectLocation('ADD DEVICE TEST');

        var devices_before;
        var devices_after;

        element.all(by.repeater('device in devices')).count().then(function (dev) {
            devices_before = dev;
            LocationsPage.addDevice('Advertisement TV');
        });

        element.all(by.repeater('device in devices')).count().then(function (dev) {
            devices_after = dev;

            expect(devices_before < devices_after).toBe(true);
        });

    });

    /**
     * First creates a location, then adds devices, then removes them
     * REQUIRED: AVAILABLE DEVICE
     */
    it('should remove a device from a location', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        var devices_before;
        var devices_after;

        LocationsPage.addLocation('Automated Location');

        // search and select location
        LocationsPage.selectLocation('Automated Location');
        LocationsPage.addDevice('Advertisement TV');

        // select first location
        // element(by.repeater('location in locations').row(0)).click();

        // count devices pre removable
        element.all(by.repeater("device in devices")).count().then(function (dev) {
            devices_before = dev;
        });

        // refresh
        browser.get(port);
        LoginPage.login();
        LoginPage.goToLocations();

        LocationsPage.selectLocation('Automated Location');
        LocationsPage.removeDevice();

        // count devices post removal
        element.all(by.repeater('device in devices')).count().then(function (dev) {
            devices_after = dev;
            expect((devices_before > devices_after)).toBe(true);
        });
        // TODO: delete locattion after test, however jasmine gives timeout interval error, and webdriver control flow error
        // LoginPage.goToLocations();
        // LocationsPage.deleteLocation('Automated Location');
    });

});

