//get muxlablab defaultPageData key
var ip = browser.params.ipAddress;
var key = ip + "_admin_defaultPageData";
var port = browser.params.port;
var EC = protractor.ExpectedConditions;

/**
 * Adds a device then launches discovery
 * @param name
 * @param device
 */
function addDevice(name, device) {
    // Create Device
    browser.wait(EC.elementToBeClickable(element(by.id('id_in_productCodeSelected'))), 8000);   // waits for element to be clickable, timesout at 8sec, don't know if its actually useful though
    element(by.id('id_in_productCodeSelected')).click();                // clicks dropdown menu
    element(by.cssContainingText('option', device)).click();            // clicks selected device from dropdown
    element(by.cssContainingText('.localized', 'Add Device')).click();  // clicks the add Device button
    element(by.name('customname')).sendKeys(name);                      // inputs name of new device
    element(by.cssContainingText('button','OK')).click();               // clicks OK ie. confirms

    // Select device button
    var selectDeviceButton = element(by.cssContainingText('td', name)).element(by.xpath('..')).element(by.xpath('..')).element(by.name('SelectDevice'));
    browser.wait(EC.elementToBeClickable(selectDeviceButton), 8000);   // waits for element to be clickable, timesout at 8sec, don't know if its actually useful though
    selectDeviceButton.click().then(function () {
        // Wait for the alert popup to show and clicks OK, timesout at 7sec
        browser.sleep(300);
        browser.wait(function () {
            return browser.switchTo().alert().then(function () {return true;}, function () {return false;});
        }, 7000, 'Alert not shown (load previous discovered devices?)');;
        //browser.wait(EC.alertIsPresent(), 7000, "Alert is not getting present :(")
        browser.switchTo().alert().accept();
        browser.sleep(100);
        //browser.switchTo().defaultContent();
        // launch discovery
        element(by.css("#automatic_setup input[value='Launch discovery']")).click(); //TODO: Ariel le probleme es la
        //  waits until the table shows up, showing that it finished loading
        browser.wait(EC.presenceOf(element(by.id('id_setup_rx_tbl'))), 60000, 'Element taking too long to appear in the DOM');
    });

}

function signIn() {
    element(by.name("p_userName")).sendKeys('admin');
    element(by.name("p_password")).sendKeys('admin');
    element(by.name("submit")).click();
}

/**
 * Goes to Products page
 */
function goToProducts() {
    return element(by.cssContainingText('.access_controlled', 'Products')).click();
}

/**
 * I didnt include expect() functions because the its automatically
 * generate success feedbacks if they accomplish everything all their tasks (which they aren't at the moment)
 */
describe('Add Mnc Device families', function () {

    beforeAll(function () {
        browser.ignoreSynchronization = true;
        var url_mnc_web = 'http://' + ip + '/mnc/';
        browser.get(url_mnc_web);
        signIn();
    });

    beforeEach(function () {
        // a fix to the page not being angular
        browser.ignoreSynchronization = true;
        //goToProducts();
    });

    afterAll(function () {
        browser.ignoreSynchronization = false;
    });
    /**
     * These its both create a different device
     */
    it('should create a first mnc device', function () {
        goToProducts().then(function () {
            addDevice('AUTOMATED TEST DEVICE 1', 'HDMI over IP (500752/753/754/755/756)');
        })

    });

    it('should create a second mnc device', function () {
        goToProducts().then(function () {
            addDevice('AAUTOMATED TEST DEVICE 2', 'HDMI over IP H264/H265 (500762)');
        });

    });
});