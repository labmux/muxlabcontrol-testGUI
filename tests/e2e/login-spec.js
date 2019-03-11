/**
 * Import LoginPage function
 * @type {LoginPage}
 */
var loginpagepo = require('./page-objects/LoginPage.js');
var LoginPage = new loginpagepo();

//get muxlablab defaultPageData key
var ip = browser.params.ipAddress;
var key = ip + "_admin_defaultPageData";
var port = browser.params.port;

/**
 * Default login test
 */
// describe('Login Tests', function() {
//     beforeEach(function () {
//         browser.get(port);
//     });
//
//     it('should load up "setup ip" page first', function () {
//         expect(browser.getCurrentUrl()).toContain('/setup/version-ip');
//     });
//
//     it('should redirect to login page, after saving IP address', function () {
//         LoginPage.ip_login(ip);
//         expect(browser.getCurrentUrl()).toContain('/auth/login');
//     });
// });

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

        expect(browser.getCurrentUrl()).toContain('/devices');
    });

    // it('should click "Locations" and go there', function () {
    //     LoginPage.login();
    //
    //     LoginPage.goToLocations();
    //
    //     expect(browser.getCurrentUrl()).toContain('/locations');
    // });
    //
    // it('should click "Favorites" and go there', function () {
    //     LoginPage.login();
    //     LoginPage.goToFavorites();
    //
    //     expect(browser.getCurrentUrl()).toContain('/favorites');
    // });

    it('should click "Settings" and go there', function () {
        LoginPage.login();
        LoginPage.goToSettings();

        expect(browser.getCurrentUrl()).toContain('/setting');
    });
});
//
// /**
//  * Tests default page
//  */
// describe('Default tests', function () {
//     beforeEach(function () {
//         browser.get('http://localhost:8100/');
//         LoginPage.login();
//     });
//
//     it('should go to "Favorites" by default', function() {
//         var value = '{"type":"favorites"}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+");");
//
//         expect(browser.getCurrentUrl()).toContain('/favorites');
//     });
//
//     it('should go to "Devices" by default', function() {
//         var value = '{"type":"devices"}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+");");
//
//         expect(browser.getCurrentUrl()).toContain('/devices');
//     });
//
//     it('should go to "Locations" by default', function() {
//         var value = '{"type":"locations"}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+");");
//
//         expect(browser.getCurrentUrl()).toContain('/locations');
//     });
// });
//
// /**
//  * Default specific page tests
//  */
//
// /*
//     Devices
//  */
// describe('Specific "device" by default', function () {
//     beforeEach(function () {
//         browser.get('http://localhost:8100/');
//         LoginPage.login();
//     });
//
//     it('should go to "Playstation" device on login', function () {
//         var value = '{"type":"devices","selected_device":{"mac":"00-0B-78-00-77-B7","modelName":"500753-TX"}}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+")");
//
//         expect(browser.getCurrentUrl()).toContain("00-0B-78-00-77-B7");
//     });
//
//     it('should go to "MX Q Pro" device on login', function () {
//         var value = '{"type":"devices","selected_device":{"mac":"00-0B-78-00-77-BE","modelName":"500753-TX"}}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+")");
//
//         expect(browser.getCurrentUrl()).toContain("00-0B-78-00-77-BE");
//     });
//
//     it('should go to "Top Left TV"', function () {
//         var value = '{"type":"devices","selected_device":{"mac":"00-0B-78-00-7D-E2","modelName":"500754-RX"}}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+")");
//
//         expect(browser.getCurrentUrl()).toContain("00-0B-78-00-7D-E2");
//     });
//
//     /**
//      * BUG: cannot log in when selected device has been deleted
//      */
//     // it('should go to "Top Single TV" device on login', function () {
//     //     var value = '{"type":"devices","selected_device":{"mac":"00-0B-78-00-77-C6","modelName":"500753-RX"}}';
//     //     var str = JSON.stringify(value);
//     //     browser.executeScript("window.localStorage.setItem('"+key+"', "+str+")");
//     //
//     //     LoginPage.login();
//     //     expect(browser.getCurrentUrl()).toContain("00-0B-78-00-77-C6");
//     // });
//
// });
//
// /*
//     Locations
//  */
// describe('Specific "Locations" by default', function () {
//     beforeEach(function () {
//         browser.get('http://localhost:8100/');
//         LoginPage.login();
//     });
//
//     it('should go to Locations "Bob"', function () {
//         var value = '{"type":"locations","selected_location":{"id":"124","name":"bob"}}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+")");
//
//         expect(browser.getCurrentUrl()).toContain("location_listview/124");
//     });
//
//     it('should go to Locations "yry"', function () {
//         var value = '{"type":"locations","selected_location":{"id":"125","name":"yry"}}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+")");
//
//         expect(browser.getCurrentUrl()).toContain("location_listview/125");
//     });
// });
//
// /*
//     Favorites
//  */
// describe('Favorites by default', function () {
//     beforeEach(function () {
//         browser.get('http://localhost:8100/');
//         LoginPage.login();
//     });
//
//     it('should go to "Favorites"', function () {
//         var value = '{"type":"favorites","selected_location":{"id":"124","name":"bob"}}';
//         var str = JSON.stringify(value);
//         browser.executeScript("window.localStorage.setItem('"+key+"', "+str+")");
//
//         expect(browser.getCurrentUrl()).toContain("favorites");
//     });
// })
//
