/*

Provision 'cloud app service' using azure-arm-resource
https://github.com/Azure/azure-sdk-for-node

*/

var async = require('async');
var util = require('util');
var request = require('request');

var msRestAzure = require('ms-rest-azure');
var resourceManagementClient = require('azure-arm-resource').ResourceManagementClient;
var storageManagementClient = require('azure-arm-storage');
var webSiteManagement = require('azure-arm-website');
//var trafficManager = require('azure-arm-trafficmanager');

var fstorage = require('./fstorage.js');
var fsearch = require('./fsearch.js');
var ffx = require('./ffx.js');
var fwebapp = require('./fwebapp.js');
var ftm = require('./ftm.js');

module.exports = {
    provisionService: function (params, cb, final) {

        // login
        msRestAzure.loginWithServicePrincipalSecret(params.client_id, params.client_secret, params.tenant_id, function (err, credentials) {
            if (err) {
                console.log(err);
                return;
            }

            var startTime = new Date();
            console.log(util.format("Start Time: %d:%d:%d", startTime.getHours(), startTime.getMinutes(), startTime.getSeconds()));

            var resourceClient = new resourceManagementClient(credentials, params.subscription);
            var storageClient = new storageManagementClient(credentials, params.subscription);
            var webSiteClient = new webSiteManagement(credentials, params.subscription);

            var token = credentials.tokenCache._entries[0].accessToken;
            var storageConnString = null;

            async.series(
                primaryService(resourceClient, storageClient, webSiteClient, token, params, cb),

                function (err, results) {
                    if (err) {
                        console.log(err);
                        cb("error: " + JSON.stringify(err, null, 4));
                        return;
                    }

                    var endTime = new Date();
                    console.log(util.format("End Time: %d:%d:%d", endTime.getHours(), endTime.getMinutes(), endTime.getSeconds()));
                    console.log(util.format("Total elapsed time: %d sec", Math.round((endTime.getTime() - startTime.getTime()) / 1000.0)));
                    //console.log(JSON.stringify(results, null, 4));

                    if (final) {
                        final(`http://${params.webSiteName}.azurewebsites.net`);
                    } else {
                        cb("success");
                    }
                    
                });

        });
    },

    provisionDRService: function (params, params2, cb, final) {

        // login
        msRestAzure.loginWithServicePrincipalSecret(params.client_id, params.client_secret, params.tenant_id, function (err, credentials) {
            if (err) {
                console.log(err);
                return;
            }

            var startTime = new Date();
            console.log(util.format("Start Time: %d:%d:%d", startTime.getHours(), startTime.getMinutes(), startTime.getSeconds()));

            var resourceClient = new resourceManagementClient(credentials, params.subscription);
            var storageClient = new storageManagementClient(credentials, params.subscription);
            var webSiteClient = new webSiteManagement(credentials, params.subscription);
            //var tmClient = new trafficManager(credentials, params.subscription);

            var token = credentials.tokenCache._entries[0].accessToken;
            var storageConnString = null;

            var pSvc = primaryService(resourceClient, storageClient, webSiteClient, token, params, cb);
            var sSvc = secondaryService(resourceClient, storageClient, webSiteClient, token, params, params2, cb);
            var rSvc = restSerivce(resourceClient, storageClient, webSiteClient, token, params, params2, cb);

            async.series(
                pSvc.concat(sSvc).concat(rSvc),
                function (err, results) {
                    console.log("\nService creation completed");

                    if (err) {
                        cb("error: " + JSON.stringify(err, null, 4));
                        console.log(err);
                        return;
                    }

                    var endTime = new Date();
                    console.log(util.format("End Time: %d:%d:%d", endTime.getHours(), endTime.getMinutes(), endTime.getSeconds()));
                    console.log(util.format("Total elapsed time: %d sec", Math.round((endTime.getTime() - startTime.getTime()) / 1000.0)));
                    //console.log(JSON.stringify(results, null, 4));

                    if (final) {
                        final(`http://${params.tmName}.trafficmanager.net`);
                    } else {
                        cb("success");
                    }
                });
        });

    },
};

/* set up services */
function primaryService(resourceClient, storageClient, webSiteClient, token, params, cb) {
    return [
        function (callback) {
            cb('creating ResourceGroup...');
            createResourceGroup(resourceClient, params, function (err, result, res, req) {
                if (err) {
                    return callback(err);
                }
                cb('createResourceGroup created');
                callback(null, result);
            });
        },
        function (callback) {
            cb('provisioning Stroage...');
            fstorage.provisionStorage(storageClient, params, function (err, result, res, req) {

                params.storageConnString = res;

                if (err && params.storageConnString) {
                    return callback(err);
                }
                cb('provisionStorage created');
                callback(null, result);
            });
        },
        function (callback) {
            cb('provisioning Search...');
            fsearch.provisionSearch(token, params, function (err, result, res, req) {

                if (err) {
                    return callback(err);
                }

                params.searchAPIKey = res;

                cb('provisionSearch created');
                callback(null, result);
            });
        },
        function (callback) {
            cb('provisioning Function...');
            ffx.provisionFunction(webSiteClient, token, params, function (err, result, res, req) {
                if (err) {
                    return callback(err);
                }

                cb('provisionFunction created');
                callback(null, result);
            });
        },
        function (callback) {
            ffx.getFunctionUrl(token, params, function (err, result) {

                if (err) {
                    return callback(err);
                }

                //cb('getFunctionUrl');
                params.funcApiAppUrl = result;
                callback(null, result);
            });
        },
        function (callback) {
            cb('provisioning Webapp...');
            fwebapp.provisionWebApp(resourceClient, webSiteClient, token, params, function (err, result, res, req) {

                if (err) {
                    return callback(err);
                }

                cb('provisionWebApp created');
                callback(null, result);
            });
        }
    ];
}

function secondaryService(resourceClient, storageClient, webSiteClient, token, params, params2, cb) {
    return [
        function (callback) {
            cb('creating DR ResourceGroup...');
            createResourceGroup(resourceClient, params2, function (err, result, res, req) {
                if (err) {
                    return callback(err);
                }
                cb('DR ResourceGroup created');
                callback(null, result);
            });
        },
        function (callback) {
            cb('provisioning DR Stroage...');
            fstorage.provisionStorage(storageClient, params2, function (err, result, res, req) {

                params2.storageConnString = res;

                if (err && params2.storageConnString) {
                    return callback(err);
                }

                cb('DR Storage created');
                callback(null, result);
            });
        },
        function (callback) {
            // If you want to use same search service, use `provisionSearch2`
            /*fsearch.provisionSearch2(params.searchAPIKey, params2, function (err, result, res, req) {

                if (err) {
                    return callback(err);
                }

                params2.searchAPIKey = params.searchAPIKey;

                cb('DR Search created');
                callback(null, result);
            });
            */
            cb('provisioning DR Search...');
            fsearch.provisionSearch(token, params2, function (err, result, res, req) {

                if (err) {
                    return callback(err);
                }

                params2.searchAPIKey = res;

                cb('provisionSearch created');
                callback(null, result);
            });
        },

        function (callback) {
            cb('provisioning DR Functions...');
            ffx.provisionFunction(webSiteClient, token, params2, function (err, result, res, req) {
                if (err) {
                    return callback(err);
                }

                cb('DR Function created');
                callback(null, result);
            });
        },
        function (callback) {
            ffx.getFunctionUrl(token, params2, function (err, result) {

                if (err) {
                    return callback(err);
                }

                //cb('getFunctionUrl');
                params2.funcApiAppUrl = result;
                callback(null, result);
            });
        },
        function (callback) {
            cb('provisioning DR Webapp...');
            fwebapp.provisionWebApp(resourceClient, webSiteClient, token, params2, function (err, result, res, req) {

                if (err) {
                    return callback(err);
                }

                cb('DR WebApp created');
                callback(null, result);
            });
        }];
}

function restSerivce(resourceClient, storageClient, webSiteClient, token, params, params2, cb) {
    return [
        // search point to blobdr
        function (callback) {
            var schparams = {
                searchServiceName: params.searchServiceName,
                searchDataSource: params.searchDataSource,
                storageConnString: params2.storageConnString,
                containerName: params2.containerName,
                searchIndexer: params.searchIndexer,
                searchIndex: params.searchIndex
            };

            cb('configing Search...');
            fsearch.configDR(params.searchAPIKey, schparams, function (err, result, res, req) {

                if (err) {
                    return callback(err);
                }

                cb('Config Primary DR created');
                callback(null, result);
            });
        },
        // searchdr point to blob
        function (callback) {
            var schparams = {
                searchServiceName: params2.searchServiceName,
                searchDataSource: params2.searchDataSource,
                storageConnString: params.storageConnString,
                containerName: params.containerName,
                searchIndexer: params2.searchIndexer,
                searchIndex: params2.searchIndex
            };

            cb('configing DR Search...');
            fsearch.configDR(params2.searchAPIKey, schparams, function (err, result, res, req) {

                if (err) {
                    return callback(err);
                }

                cb('Config Secondary DR created');
                callback(null, result);
            });
        },
        function (callback) {

            cb('provisioning TM...');
            ftm.provisionTM(token, params, params2, function (err, result, res, req) {
                if (err) {
                    return callback(err);
                }

                cb('TM created');
                callback(null, result);
            });
        }
    ];
}

function createResourceGroup(resourceClient, params, callback) {
    var groupParameters = { location: params.location, tags: { costcenter: params.tags } };
    console.log('Creating resource group: ' + params.resourceGroupName);
    return resourceClient.resourceGroups.createOrUpdate(params.resourceGroupName, groupParameters, callback);

}

/* common functions */
function getFunctionTriggerUrl(token, params, callback) {
    var url = `https://management.azure.com/subscriptions/${params.subscription}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.Web/sites/${params.functionName}/functions/FotosHttpTrigger/listsecrets?api-version=2015-08-01`;

    var _params = {
        uri: url,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        }
    };

    request(_params, function (error, result, response, req) {
        if (error) {
            callback(error);
        } else if (response.error) {
            callback(response.error);
        } else if (response.code == "BadRequest") {
            callback(response.code);
        }

        console.log('fx returns:', response);
        body = JSON.parse(response);
        console.log('fx trigger_url', body.trigger_url);
        callback(null, body.trigger_url);
    });

}

var retryFxProvisioningStatus = (function () {
    var count = 0;

    return function (token, params, max, timeout, next) {
        // check status
        var _params = {
            uri: util.format("https://management.azure.com/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Resources/deployments/%s?api-version=2016-09-01",
                params.subscription, params.resourceGroupName, params.functionName),
            method: 'GET',
            json: true,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            }
        };

        request(_params, function (error, response, body) {

            var state = body.properties.provisioningState;

            if (error || response.statusCode !== 200 || state !== "Succeeded") {
                console.log('count, state:', count, state);

                if (count++ < max) {
                    return setTimeout(function () {
                        retryFxProvisioningStatus(token, params, max, timeout, next);
                    }, timeout);
                } else {
                    return next('max retries reached');
                }
            }

            console.log('success');
            next(null, body);
        });
    };
})();

