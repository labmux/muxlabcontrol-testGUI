var SettingsPage = function() {

    this.remoteAccess = function () {
        element(by.uiSref('app.remote_access')).click();
    };

    this.enableRemoteAccess = function () {
        let checkbox = $('.toggle-assertive');
        browser.actions().mouseMove(checkbox).click().perform();
    };

    this.setRemoteAccess = function (hostName, authToken, subdomain) {
        element(by.model('ngrok.site_name')).clear();
        element(by.model('ngrok.site_name')).sendKeys(hostName);


        element(by.model('ngrok.auth_token')).clear();
        element(by.model('ngrok.auth_token')).sendKeys(authToken);

        element(by.model('ngrok.subdomain')).clear();
        element(by.model('ngrok.subdomain')).sendKeys(subdomain);

        element(by.className('icon-brandify-checkmark')).click();
    };
};

module.exports = SettingsPage;