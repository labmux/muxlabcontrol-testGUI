/**
 * Import LoginPage function
 * @type {LoginPage}
 */
var loginpagepo = require('./page-objects/LoginPage.js');
var LoginPage = new loginpagepo();

//get muxlablab defaultPageData key
var ip = browser.params.ipAddress;
var port = browser.params.port;

var EC = protractor.ExpectedConditions;


/**
 * Default login test
 */
describe('Login Tests', function() {
    beforeEach(function () {
        browser.get(port);
    });

    it('should load up "setup ip" page first', function () {
        expect(browser.getCurrentUrl()).toContain('/setup/mnc-ip');
    });

    it('should redirect to login page, after saving IP address', function () {
        LoginPage.ip_login(ip);
        expect(browser.getCurrentUrl()).toContain('/auth/login');
    });
});

/**
 * Make sure switching tabs works
 */
describe('Tab changes', function () {
    beforeEach(function () {
        browser.get(port);

    });

    it('should click "Devices" and go there', function () {
        LoginPage.login();

        LoginPage.goToDevices();

        expect(browser.getCurrentUrl()).toContain('devices');
    });

    it('should click "Locations" and go there', function () {
        LoginPage.login();

        LoginPage.goToLocations();

        expect(browser.getCurrentUrl()).toContain('locations');
    });

    it('should click "Favorites" and go there', function () {
        LoginPage.login();
        LoginPage.goToFavorites();

        expect(browser.getCurrentUrl()).toContain('favorites');
    });

    it('should click "Settings" and go there', function () {
        LoginPage.login();
        LoginPage.goToSettings();

        expect(browser.getCurrentUrl()).toContain('settings');
    });
});

