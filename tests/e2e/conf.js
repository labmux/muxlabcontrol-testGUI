var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    params: {
        //ip: '192.168.168.250',
        //ip:'muxlablab.ngrok.io',
        ipAddress: "192.168.168.85",
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
            'deviceMnc-spec.js',
            // 'presentation.js'
            // 'login-spec.js'
            // 'devices-spec.js',
            //'locations-spec.js'
        ]
};

/*
/var/www
192.168.168.100
 */