
var LoginPage = function () {

    var EC = protractor.ExpectedConditions;

    /**
     * Logs user in from the ip address login screen
     */
    this.ip_login = function (ip) {
        var ipaddress = element(by.model('mnc.mnc_ip'));
        var save_btn = element(by.css('.mnc-ip-view  .button-pill-filled'));

        //clear inputs
        browser.wait(EC.elementToBeClickable(ipaddress), 7000);
        ipaddress.clear();

        //insert input
        ipaddress.sendKeys(ip);

        browser.wait(EC.elementToBeClickable(save_btn), 7000);
        save_btn.click();
    };

    /**
     * Logs user in from the Login screen
     */
    this.login = function () {
        var username = element(by.name("txt_username"));
        var password = element(by.name('txt_password'));
        var login_btn = element(by.name('btn_login'));

        //wait for page to be ready before clearing and clicking
        browser.wait(EC.elementToBeClickable(username), 7000);
        username.clear();

        browser.wait(EC.elementToBeClickable(password), 7000);
        password.clear();

        //insert input
        username.sendKeys(browser.params.username);
        password.sendKeys(browser.params.password);

        browser.wait(EC.elementToBeClickable(login_btn), 7000);
        login_btn.click();

        browser.sleep(300);
        element.all(by.cssContainingText('.popup-title', 'Recommended')).then(function(items) {
            if (items.length) {
                var updateRecommendedPopup = items[0];
                var updateRecommendedButton = updateRecommendedPopup.element(by.xpath('..')).element(by.xpath('..')).element(by.className('button-positive'));
                updateRecommendedButton.click();
            }

        });

    };

    /**
     * These goTo functions bring the user to the desired tab
     */
    this.goToDevices = function () {
        var devicestab = element(by.className("icon-brandify-receiver-generic-blue"));
        devicestab.click();
    };

    this.goToLocations = function () {
        var locationstab = element(by.className("icon-brandify-location-blue"));
        locationstab.click();
    };
    this.goToFavorites = function () {
        var favoritestab = element(by.className("icon-brandify-star-blue"));
        favoritestab.click();
    };

    this.goToSettings = function () {
        var settingstab = element(by.className("icon-brandify-settings"));
        settingstab.click();
    };

};


module.exports = LoginPage;