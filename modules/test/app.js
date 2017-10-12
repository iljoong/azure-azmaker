var async = require('async');

module.exports = {
    run: function (cb) {
        async.series(
            [

                function (callback) {
                    setTimeout(function () {
                        cb(20, "service 1 completed");

                        callback(null, "service1");
                    }, 1500);

                },

                function (callback) {
                    setTimeout(function () {
                        cb(40, "service 2 completed");

                        callback(null, "service2");
                    }, 1500);

                },
                function (callback) {
                    setTimeout(function () {
                        cb(60, "service 3 completed");

                        callback(null, "service3");
                    }, 1500);

                },

                function (callback) {
                    setTimeout(function () {
                        cb(80, "service 4 completed");

                        callback(null, "service4");
                    }, 1500);

                },


            ],
            function (err, results) {
                if (err) {
                    cb(100, "error: " + JSON.stringify(err, null, 4));
                }
                cb(100, "success");
            }
        );
    }
}