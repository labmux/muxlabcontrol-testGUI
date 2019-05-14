var LocationsPage = function () {

    /**
     * returns the "more options" button
     * @returns {*}
     */
    this.getMoreOptionsBtn = function () {
        var moreOptions = element(by.css('div i[ng-click="showLocationOptions($event, location)"]'));
        return moreOptions;
    };

    this.addLocation = function(location_name) {
        var addLocation = element(by.className("icon-brandify-plus-outlined"));
        var name = element(by.model("addLocationData.name"));
        var create_btn = element(by.css('[ng-click="addLocation(addLocationData)"]'));

        addLocation.click();
        name.sendKeys(location_name);
        create_btn.click();
    };

    /**
     * Clicks the next button
     */
    this.next = function () {
        var next_btn = element(by.className("icon-brandify-next"));
        next_btn.click();
    };

    /**
     * Adds sublocations to first Location on the list
     * @param sublocation_name
     */
    this.addSubLocation = function (sublocation_name) {
        let moreOptions = this.getMoreOptionsBtn();

        moreOptions.click();
        let addSubLocation_btn = element(by.css('div.list a.item[ng-click="showAddNewLocationModal($event, currentPopoverLocation);"]'));
        let sublocationName = element(by.model("addLocationData.name"));
        let create_btn = element(by.css('button[ng-click="addLocation(addLocationData)"]'));

        addSubLocation_btn.click();
        sublocationName.sendKeys(sublocation_name);
        create_btn.click();
     };

    /**
     * Deletes first location on the list
     * Does not work with locations that have sub location
     */
    this.delete = function() {
        var delete_btn = element(by.css('[ng-click="deleteLocation(currentPopoverLocation)"]'));
        var confirmDelete_btn = element(by.cssContainingText('.button-positive', 'Delete'));
        var moreOptions = this.getMoreOptionsBtn();

        moreOptions.click();
        delete_btn.click();
        confirmDelete_btn.click();
    };

    this.deleteLocation = function(location) {
        // navigate to location
        element(by.css('span button[ng-click="toggleSearch()"]')).click();
        element(by.model('search.search_terms')).sendKeys(location);
        element.all(by.repeater('location in searchResults')).then(function (loc) {
            loc[0].click();
        });

        // delete location
        var moreOptions = element(by.css('button[ng-click="showLocationMoreOptions($event)"]'));
        var deleteBtn = element(by.css('a[ng-click="deleteLocation($event)"]'));
        var confirmDelete = element(by.cssContainingText('.button-positive', 'Delete'));

        moreOptions.click();
        deleteBtn.click();
        confirmDelete.click();
    };

    /**
     * Deletes first sublocation on the list
     */
    //TODO DOES NOT WORK
    this.deleteSubLocation = function() {
        // var delete_btn = element(by.css('div a[ng-click="deleteLocation(currentPopoverLocation)"]'));
        // var confirmDelete_btn = element(by.buttonText('Delete'));
        var moreOptions = element(by.className('icon-more-options-dots'));


        moreOptions.click();
        // delete_btn.click();
        // confirmDelete_btn.click();
    };

    /**
     * Deletes location with sublocations
     */
    this.deleteSubLocations = function() {
        var delete_btn = element(by.css('[ng-click="deleteLocation(currentPopoverLocation)"]'));
        var confirmDelete_btn = element(by.buttonText('Delete them'));
        var moreOptions = element(by.css('[ng-click="showLocationOptions($event, location)"]'));

        moreOptions.click();
        delete_btn.click();
        confirmDelete_btn.click();
    };

    /**
     * Renames first location on the list
     * @param new_name
     */
    this.rename = function (old_name, new_name) {
        this.selectLocation(old_name);

        var rename_btn = element(by.css('div a[ng-click="renameLocation($event)"]'));
        var name = element(by.model("renameLocationPopupData.newName"));
        var save_btn = element(by.buttonText('Save'));
        var moreOptions = element(by.css('button[ng-click="showLocationMoreOptions($event)"]'));

        moreOptions.click();
        rename_btn.click();
        name.sendKeys(new_name);
        save_btn.click();
    };

    this.move = function () {
        var moreOptions = this.getMoreOptionsBtn();
        var move_btn = element(by.css('[ng-click="moveLocation(currentPopoverLocation)"]'));
        var location;
        var search = element(by.model("search.search_terms"));

        moreOptions.click();
        move_btn.click();
        //find home
        search.sendKeys("home");

            element.all(by.repeater('location in search.searchResults')).then(function (loc) {
                location = loc;
                location[0].click();
            });
    };

    /**
     * Adds a device to a certain location
     * Recieves the name of desired device to search for, and location
     * in the array of where it will be located post search
     * @param device_name
     * @param device_location
     */
    this.addDevice = function (device_name) {
        var addDevice_btn = element(by.css('button[ng-click="addDeviceModal.showModal($event);"]'));
        var search = element(by.model("addDeviceModal.addDeviceSearch.customName"));

        addDevice_btn.click();
        search.sendKeys(device_name);

        element.all(by.repeater("device in addDeviceModal.availableDevices")).then(function (dev) {
            element(by.model('device.selectedForAdding')).click();
            element(by.css('[ng-click="addDeviceModal.addDevices()"]')).click();

        });

    };

    this.selectLocation = function (name) {
        element(by.css('span button[ng-click="toggleSearch()"]')).click();
        element(by.model('search.search_terms')).sendKeys(name);
        element.all(by.repeater('location in searchResults')).then(function (loc) {
            loc[0].click();
        });
    }

    /**
     * Removes first device from location
     */
    this.removeDevice = function () {
        element(by.css('a i[ng-click="showDeviceOptions($event, device)"]')).click();
        element(by.css('div a[ng-click="removeDeviceFromLocation(currentPopoverDevice)"]')).click();
    }
};

module.exports = LocationsPage;