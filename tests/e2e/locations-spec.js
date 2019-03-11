/**
 * Import LoginPage functions
 * @type {LoginPage}
 */
var loginpage = require('./page-objects/LoginPage.js');
var LoginPage = new loginpage();

/**
 * Import LocationsPage functions
 * @type {LocationsPage}
 */
var locationspage = require('./page-objects/LocationsPage');
var LocationsPage = new locationspage();

/**
 * Import TestValidation functions
 * @type {TestValidation}
 */
var testvalidation = require('./page-objects/TestValidations');
var TestValidation = new testvalidation();

describe('\n--------------------------------- Locations Test ---------------------------------\n' +
        'Version: '+  + '\n'+
        'IP: ' + + '\n' +
        'Port: ' +  + '\n' +
        '----------------------------------------------------------------------------------\n\n', function () {

        beforeEach(function () {
            browser.get(browser.params.port);
        });

       // var moreOptions = LocationsPage.getMoreOptionsBtn();

     it('should add location', function () {

        LoginPage.ip_login(browser.params.ipAddress);
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


     }); //it

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

        LocationsPage.rename("RENAMED");

        //will verify that first element in array is equal to "ANAME"
        element.all(by.repeater('location in locations')).then(function(loc) {
            expect(loc[0].getText()).toBe("RENAMED");
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
     * Adds a device in the first location
     */
    it('should add a device in a location', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        //device to search for to add to location
        const DEVICE_NAME = "Middle TV";

        element.all(by.repeater('location in locations')).then(function (loc) {
            var location = loc;
            location[0].click();
        });

        var devices_before;
        var devices_after;

        element.all(by.repeater('device in devices')).count().then(function (dev) {
            devices_before = dev;
            LocationsPage.addDevice(DEVICE_NAME,2);
        });

        element.all(by.repeater('device in devices')).count().then(function (dev) {
            devices_after = dev;

            expect(devices_before < devices_after).toBe(true);
        });

    });

    it('should remove a device from a location', function () {
        LoginPage.login();
        LoginPage.goToLocations();

        var moreOptions;
        var removeDevice_btn;

        var devices_before;
        var devices_after;

        element.all(by.repeater('location in locations')).then(function (loc) {
                    var location = loc;
                    location[0].click();

                    moreOptions = element(by.name("locations_deviceOptions"));
                    removeDevice_btn = element(by.model('locations_removeDevice'));
                });

        element.all(by.repeater('device in devices')).count().then(function (dev) {
            devices_before = dev;

            moreOptions.click();
            removeDevice_btn.click();
            });

        element.all(by.repeater('device in devices')).count().then(function (dev) {
            devices_after = dev;

            expect(devices_before > devices_after).toBe(true);
        });

    });

    it('should delete sublocation and location', function () {
        LoginPage.ip_login();
        LoginPage.login();
        LoginPage.goToLocations();

        var moreOptions_btn = element(by.name('locations_moreOptions'));
        var delete_btn = element(by.name('locations_delete'));
        var confirmDelete_btn = element(by.className('locations-confirmDelete'));

        var length_before;
        var length_after;
        element.all(by.repeater('location in locations')).count().then(function (len) {
            length_before = len;

            moreOptions_btn.click();
            delete_btn.click();
            confirmDelete_btn.click();
        });

        element.all(by.repeater('location in locations')).count().then(function (len) {
            length_after = len;

            expect(length_before > length_after).toBe(true);
        });

    });

});

