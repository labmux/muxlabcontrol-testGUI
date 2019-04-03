When first checking this project from Git, install composer, and run 
```composer install```

# Virtualizing the 811

When creating a new test server do the following steps. When updating the existing server, see below "Updates to 811".

#### Creating an 811 image

The image used to flash 811s in production will not work for our purposed. Create your own image by booting the 811 you’d like to virtualize. Then, from a different computer, run this command:
```
ssh root@192.168.168.50 "dd if=/dev/mmcblk0 | gzip -1 -" | dd of=mnc811.gz
```

###### Creating the virtual box harddrive

The resulting file is a gzipped image (should be around 2GB, decompressed 30G, make sure you have space for this).
On the host machine, decompress this file. For convenience, rename the resulting file to include an extension, say ```.img```.
Then (install virtualbox) and run this command:

```
VBoxManage convertfromraw -format VDI mnc.img mncVDI.vdi
```

Then, open virtual box using
```
sudo virtualbox
```

Then,
1. Create a new box (64-bit) using the new VDI file (“Use an existing virtual hard drive file”). Call this VM "primary".
2. Give it at least 2GB or RAM (4GB used in test)
3. System > Enable EFI (special OSes only)
4. Boot up the 811, and create a snapshot of the current state. Name this snapshot v1.5.8 (or whatever the version is).
5. Turn off the VM when done (important!)

That’s it!

###### Updates to the 811
If you simply want to add a new version of the 811 to the platform, open virtualbox, and select the box called ```primary```.
Then,
1. Click on Snapshots, and select that latest Snapshot.
2. Restore it and run it. Ignore warning, and don't create snapshot of current state as prompted
3. In your browser go to 192.168.168.50/mnc, log in and run the MNC update as usual
4. After the update is done, save the current state of the VM under a new snapshot and call it v1.5.9 (or whatever the version is).

# Configuring the testing platform
In order to set up the automated testing platform,
make sure to first install a few things:
- Google Chrome
- NodeJS
- Java
- Apache (configure it to host the www folder)
- MySQL (install the ```base.sql``` DB in there and configure ```api/DB.php``` with the right MySQL credentials)

Then, run
```
npm install -g ionic
npm install -g @ionic/v1-toolkit
npm install -g protractor-beautiful-reporter
npm install -g protractor
webdriver-manager update
webdriver-manager start
```
For the last line (```webdriver-manager start```) leave this terminal window open. Also this command seems to give problems down the line when run over SSH.

Finally from the directory of this project (where you have package.json) run
```npm install```.

### Updating the test specs
When making updates to the e2e protractor spec files, manually FTP them over to the server, at ```/var/www/html/tests/e2e```

Any changes to protractor's conf.js should be done in ```do_test.php``` which overrides this file