var LocationsPage = function () {

    /**
     * returns the "more options" button
     * @returns {*}
     */
    this.getMoreOptionsBtn = function () {
        var moreOptions = element(by.css('[ng-click="showLocationOptions($event, location)"]'));
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

    /**
     * Deletes first sublocation on the list
     */
    //TODO DOES NOT WORK: ERROR: ELEMENT NOT INTERACTABLE
    this.deleteSubLocation = function() {
        // var delete_btn = element(by.css('[ng-click="deleteLocation(currentPopoverLocation)"]'));
        // var confirmDelete_btn = element(by.buttonText('Delete'));
        var moreOptions = this.getMoreOptionsBtn();

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
    this.rename = function (new_name) {
        var rename_btn = element(by.css('[ng-click="renameLocation(currentPopoverLocation)"]'));
        var name = element(by.model("renameLocationPopupData.newName"));
        var save_btn = element(by.buttonText('Save'));
        var moreOptions = this.getMoreOptionsBtn();

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
    this.addDevice = function (device_name, device_location) {
        var addDevice_btn = element(by.css('[ng-click="addDeviceModal.showModal($event);"]'));
        var search = element(by.model("addDeviceModal.addDeviceSearch.customName"));
        var check_btn = element(by.model("device.selectedForAdding"));
        var device;

        addDevice_btn.click();
        search.sendKeys(device_name);

        element.all(by.repeater("device in addDeviceModal.availableDevices")).then(function (dev) {
            device = dev;
            device[device_location].click();
            check_btn.click();

        });
        // var i = 0;
        // while (device[i].getText() != device_name) {
        //     i++;
        // }


        

    };
};

module.exports = LocationsPage;