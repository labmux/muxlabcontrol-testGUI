var TestValidation = function () {

    function runTest(version) {

        if (versionIsSmaller(version))
        {
            return;
        }
        else
            expect(true.toBe(false));
    };

    var versionIsSmaller = function (version) {

        var num = "";

        for (var i = 0; i < version.length; i++) {
            if (version.charAt(i) == ".")
                continue;
            else
                num += "" + version.charAt(i);
        }

        num.parseInt();

        if (browser.params.mncs.version <= num)
            return true;
        else
            return false;
        
    };
};

module.exports = TestValidation;

