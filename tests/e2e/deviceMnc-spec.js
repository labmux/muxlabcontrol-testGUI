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
    element(by.id('id_in_productCodeSelected')).click();                // clicks dropdown menu
    element(by.cssContainingText('option', device)).click();            // clicks selected device from dropdown
    element(by.cssContainingText('.localized', 'Add Device')).click();  // clicks the add Device button
    element(by.name('customname')).sendKeys(name);                      // inputs name of new device
    element(by.cssContainingText('button','OK')).click();               // clicks OK ie. confirms

    // Select device button
    browser.wait(EC.elementToBeClickable(element(by.name('SelectDevice'))), 8000);   // waits for element to be clickable, timesout at 8sec, don't know if its actually useful though
    element(by.name('SelectDevice')).click();

    // Wait for the alert popup to show and clicks OK, timesout at 7sec
    browser.wait(EC.alertIsPresent(), 7000, "Alert is not getting present :(")
    browser.switchTo().alert().accept();

    // launch discovery
    element(by.css("input[value='Launch discovery']")).click(); //TODO: Ariel le probleme es la

    //  waits until the table shows up, showing that it finished loading
    browser.wait(EC.presenceOf(element(by.id('setup_auto_div_displaylist'))), 20000, 'Element taking too long to appear in the DOM');
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
    element(by.cssContainingText('.access_controlled', 'Products')).click();
}

/**
 * I didnt include expect() functions because the its automatically
 * generate success feedbacks if they accomplish everything all their tasks (which they aren't at the moment)
 */
describe('Add Mnc Devices', function () {
    beforeEach(function () {
        // a fix to the page not being angular
        browser.ignoreSynchronization = true;

        // Loads mnc page
        browser.get('http://' + ip + '/mnc/');
    });

    /**
     * These its both create a different device
     */
    it('should create a first mnc devics', function () {
        signIn();
        goToProducts();
        addDevice('AUTOMATED TEST DEVICE 1', 'HDMI over IP (500752/753/754/755/756)');
    });

    it('should create a second mnc device', function () {
        signIn();
        goToProducts();
        addDevice('AAUTOMATED TEST DEVICE 2', 'HDMI over IP H264/H265 (500762)');
    });
});