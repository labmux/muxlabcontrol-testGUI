var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    params: {
        //ip: '192.168.168.250',
        //ip:'muxlablab.ngrok.io',
        ipAddress: "192.168.168.186",
        port: "http://localhost:8100/",
        username: 'admin',
        password: 'admin',
    },
    files: [{pattern: '*.js', included: true}],
    seleniumAddress: 'http://localhost:4444/wd/hub',
    capabilities: {browserName: 'chrome'},
    jasmineNodeOpts: {
		showColors: true,
        defaultTimeoutInterval: 30000
	},
    onPrepare: function () {
        jasmine.getEnv().addReporter(
            new HtmlReporter({
                baseDirectory: 'tmp/screenshots'
        }).getJasmine2Reporter());
    },
    //Choose which spec file to read
    specs:
        [
            // 'devices-spec.js',


            // WORK
            'login-spec.js',
            'locations-spec.js',
            'settings-spec.js',

            'deviceMnc-spec.js',
            // 'presentation.js'


        ]
};
