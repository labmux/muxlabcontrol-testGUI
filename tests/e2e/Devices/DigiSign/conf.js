var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    params: {
        //ip: '192.168.168.250',
        //ip:'muxlablab.ngrok.io',
        ipAddress: "eliran.ngrok.io",
        port: "http://localhost:8100/",
        username: 'admin',
        password: 'admin',
        test_run_id: '123'
    },
    files: [{pattern: '*.js', included: true}],
    seleniumAddress: 'http://localhost:4444/wd/hub',
    capabilities: {browserName: 'firefox'},
    jasmineNodeOpts: {
		showColors: true,
        defaultTimeoutInterval: 30000
	},
    onPrepare: function () {
        jasmine.getEnv().addReporter(
            new HtmlReporter({
                baseDirectory: 'tmp/screenshots'
        }).getJasmine2Reporter());

        // ui-sref locator
        require('protractor-uisref-locator')(protractor);
    },
    //Choose which spec file to read
    specs:
        [


            //
            // // WORK
            // 'login-spec.js',
            // 'locations-spec.js',
            // 'devices-spec.js',
            'settings-spec.js'

            // 'login-spec.js',
            //
            // 'deviceMnc-spec.js',
            // 'presentation-spec.js'


        ]
};
