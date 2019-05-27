/**
 * Import LoginPage function
 * @type {LoginPage}
 */
var loginpagepo = require('../page-objects/LoginPage.js');
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