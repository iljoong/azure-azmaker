/*

Azure search provisioning

 */

var async = require('async');
var request = require('request');
var util = require('util');

module.exports = {

    provisionSearch: function (token, params, callback) {

        // provision storage
        var schKey = null;

        async.series(
            [
                function (cb) {
                    createSearchService(token, params, function (err, result, res, req) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, result);
                    });
                },
                function (cb) {
                    configSearchService(token, params, function (err, result, res, req) {
                        if (err) {
                            return cb(err);
                        }

                        schKey = res;

                        cb(null, result);
                    });
                }
            ],
            function (err, results) {
                console.log('search provision completed');
                if (err) {
                    console.log(err);
                }

                callback(err, results, schKey);
            }
        );

    },

    provisionSearch2: function (schKey, params, callback) {

        async.series(
            [
                // configSearchIndex
                function (cb) {
                    configSearchIndex(schKey, params, function (error, result) {
                        if (!error) {
                            cb(null, result);
                        }
                    });
                }
            ],
            function (err, results) {
                console.log('search provision completed');
                if (err) {
                    console.log(err);
                }

                callback(err, results, schKey);
            }
        );

    },

    configDR: function (schKey, params, callback) {

        async.series(
            [
                function (cb) {
                    configSearchDS(schKey, params, function (error, result) {
                        if (!error) {
                            cb(null, result);
                        }
                    });
                },
                function (cb) {
                    configSearchIndexer(schKey, params, function (error, result) {
                        if (!error) {
                            cb(null, result);
                        }
                    });
                }
            ],
            function (err, results) {
                console.log('search config completed');
                if (err) {
                    console.log(err);
                }

                callback(err, results, schKey);
            }
        );

    }
};

function createSearchService(token, params, callback) {

    var _params = {
        uri: util.format("https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Search/searchServices/%s?api-version=2015-08-19",
            params.subscription, params.resourceGroupName, params.searchServiceName),
        method: 'PUT',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: {
            "properties": {
                "replicaCount": 1,
                "partitionCount": 1,
                "hostingMode": "Default"
            },
            "sku": {
                "name": "basic"
            },
            "location": params.schlocation,
            "tags": {
                "costcenter": params.tags
            }
        }
    };

    request(_params, function (error, result, response) {
        if (!error) {
            console.log("\nCreating search account: " + params.searchServiceName);
            //console.log(result);
            callback(null, result);
        }

    });
}

function configSearchService(token, params, callback) {

    var schKey = null;

    async.series([
        function (cb) {
            getSearchSeviceKey(token, params, function (error, result, res) {
                if (!error) {

                    schKey = res;
                    console.log("search key: ", schKey);
                    cb(null, result);
                } else {
                    cb(error);
                }

            });
        },
        // configSearchIndex
        function (cb) {
            // DNS Error
            retryConfigSearchIndex(schKey, params, 10, 30000, function (error, result) {
                if (!error) {
                    console.log("search index created");
                    cb(null, result);
                } else {
                    cb(error);
                }
            });

            /*configSearchIndex(schKey, params, function (error, result) {
                if (!error) {
                    cb(null, result);
                } else {
                    cb(error);
                }
            });*/
        }
    ], function (err, results) {
        if (!err) {
            callback(null, results, schKey);
        } else {
            callback(err);
        }
    });

}

function getSearchSeviceKey(token, paramsSearch, callback) {
    var params = {
        uri: util.format("https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Search/searchServices/%s/listAdminKeys?api-version=2015-08-19",
            paramsSearch.subscription, paramsSearch.resourceGroupName, paramsSearch.searchServiceName),
        method: 'POST',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        }
    };

    console.log("Get searchservice key: ", paramsSearch.searchServiceName);
    request(params, function (error, result, response) {
        if (!error) {
            //console.log(result);
            var schkey = result.body.primaryKey; // result.body.secondaryKey

            callback(null, result, schkey);
        } else {
            callback(error);
        }

    });
}

var retryConfigSearchIndex = (function () {
    var count = 0;

    return function (schkey, params, max, timeout, next) {

        var body = {
            "name": params.searchIndex,
            "fields": [
                { "name": "id", "type": "Edm.String", "key": true, "searchable": false, "filterable": false, "sortable": false, "facetable": false },
                { "name": "uri", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
                { "name": "uri2", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
                { "name": "thumbnail", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
                { "name": "thumbnail2", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
                { "name": "tags", "type": "Collection(Edm.String)", "searchable": true, "filterable": true, "sortable": false, "facetable": true },
                { "name": "caption", "type": "Edm.String", "searchable": true, "filterable": false, "sortable": false, "facetable": false }
            ]
        };

        var _params = {
            uri: "https://" + params.searchServiceName + ".search.windows.net/indexes?api-version=2016-09-01",
            method: 'POST',
            json: true,
            headers: {
                "Content-Type": "application/json",
                "api-key": schkey
            },
            body: body
        };

        request(_params, function (error, response) {

            if (error || response.statusCode != 201) {
                if (error) {
                    console.log('count, err code:', count, (error.code) ? error.code : error);
                }
                if (response) {
                    console.log('count, statuscode:', count, (response.statusCode) ? response.statusCode : response);
                }

                if (count++ < max) {
                    return setTimeout(function () {
                        retryConfigSearchIndex(schkey, params, max, timeout, next);
                    }, timeout);
                } else {
                    count = 0; // reset count
                    return next('max retries reached');
                }
            }
            console.log('statuscode:', (response.statusCode) ? response.statusCode : response);
            count = 0; // reset count
            next(null, response);
        });
    };
})();


function configSearchIndex(schkey, paramsSearch, callback) {

    var body = {
        "name": paramsSearch.searchIndex,
        "fields": [
            { "name": "id", "type": "Edm.String", "key": true, "searchable": false, "filterable": false, "sortable": false, "facetable": false },
            { "name": "uri", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
            { "name": "uri2", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
            { "name": "thumbnail", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
            { "name": "thumbnail2", "type": "Edm.String", "searchable": false, "filterable": false, "sortable": false, "facetable": false },
            { "name": "tags", "type": "Collection(Edm.String)", "searchable": true, "filterable": true, "sortable": false, "facetable": true },
            { "name": "caption", "type": "Edm.String", "searchable": true, "filterable": false, "sortable": false, "facetable": false }
        ]
    };

    var params = {
        uri: "https://" + paramsSearch.searchServiceName + ".search.windows.net/indexes?api-version=2016-09-01",
        method: 'POST',
        json: true,
        headers: {
            "Content-Type": "application/json",
            "api-key": schkey
        },
        body: body
    };

    console.log("Config search index: ", body.name);
    request(params, function (error, response) {
        // TODO: status 503, DNS not found issue
        if (!error) {
            callback(null, response);
        } else {
            callback(error);
        }
    });

}

function configSearchDS(schkey, paramsSearch, callback) {

    var params = {
        uri: "https://" + paramsSearch.searchServiceName + ".search.windows.net/datasources?api-version=2016-09-01",
        method: 'POST',
        json: true,
        headers: {
            "Content-Type": "application/json",
            "api-key": schkey
        },
        body: {
            "name": paramsSearch.searchDataSource,
            "type": "azureblob",
            "credentials": { "connectionString": paramsSearch.storageConnString },
            "container": { "name": paramsSearch.containerName, "query": "log" }
        }
    };

    console.log("Config search datasource: ", params.body.name);
    request(params, function (error, result) {
        if (!error) {
            //console.log(result);
            callback(null, result);
        }
    });
}

// this is for DR index
function configSearchIndexer(schkey, paramsSearch, callback) {

    var params = {
        uri: "https://" + paramsSearch.searchServiceName + ".search.windows.net/indexers?api-version=2016-09-01",
        method: 'POST',
        json: true,
        headers: {
            "Content-Type": "application/json",
            "api-key": schkey
        },
        body: {
            "name": paramsSearch.searchIndexer,
            "dataSourceName": paramsSearch.searchDataSource,
            "targetIndexName": paramsSearch.searchIndex,
            "parameters": { "configuration": { "parsingMode": "json" } },
            "schedule": { "interval": "PT30M" } // 30 min
        }
    };

    console.log("Config search indexer: ", params.body.name);

    request(params, function (error, result) {
        if (!error) {
            //console.log(result);
            callback(null, result);
        }
    });
}
