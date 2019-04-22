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
describe('Connections Tests', function () {
    beforeEach(function () {
        browser.ignoreSynchronization = false;
        browser.get(port);

    });


    it('should connect 753 RX (Lounge TV) to 753 TX (811 Output IR E)', function () {
        // LoginPage.ip_login(ip);
        LoginPage.login();
        LoginPage.goToDevices();

        element(by.css("panel1-content ion-list ion-item:nth-child(6)")).click();
        element(by.css("div ion-content ul li:nth-child(1)")).click();

        var e = element(by.css('div ion-content ul li:nth-child(1) i'));
        expect(e.isDisplayed()).toBe(true);
    });

    it('should connect 762 RX (100 in TV) to 762 TX (Roku)', function () {
        LoginPage.login();
        LoginPage.goToDevices();

        element(by.css("panel1-content ion-list ion-item")).click();
        element(by.css("div ion-content ul li:nth-child(2)")).click();

        var e = element(by.css('div ion-content ul li:nth-child(2) i'));
        expect(e.isDisplayed()).toBe(true);
    });


    // it('should click on different tabs', function () {
    //     LoginPage.ip_login(ip);
    //     LoginPage.login();
    //
    //     LoginPage.goToDevices();
    //     LoginPage.goToLocations();
    //     LoginPage.goToFavorites();
    //     LoginPage.goToSettings();
    //     LoginPage.goToFavorites();
    //     LoginPage.goToLocations();
    //     LoginPage.goToDevices();
    //     LoginPage.goToFavorites();
    //     LoginPage.goToDevices();
    //
    //     expect(browser.getCurrentUrl()).toContain('/devices');
    // });
    //


});

describe('Locations Tests', function () {
    beforeEach(function () {
        browser.ignoreSynchronization = false;
        browser.get(port);

    });

    it('should add new location', function () {

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