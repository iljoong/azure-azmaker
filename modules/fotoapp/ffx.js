/*

Azure function provisioning

template:
https://github.com/Azure/azure-quickstart-templates/blob/master/101-function-app-create-dedicated/azuredeploy.json

issue1: template with msdeploy + appsetting causes deployment failure by race condition issue
https://blogs.msdn.microsoft.com/hosamshobak/2016/05/26/arm-template-msdeploy-race-condition-issue/

issue2: template with fixing race condition (msdeploy -> appsetting) causes app deployment vanish (don't know why but it happens)
    -> get function url fail

fix: provision with appsetting -> wait for deployment -> deploy app -> wait for deployment -> get function url okay!

 */
var async = require('async');
var request = require('request');
var util = require('util');

module.exports = {
    provisionFunction: function (webSiteClient, token, params, callback) {

        async.series(
            [
                function (callback) {
                    createFunctionAppSettings(token, params, function (err, result, res, req) {
                        return (err) ? callback(err) : callback(null, result);
                    });
                },
                //http://stackoverflow.com/questions/35185800/node-js-request-loop-until-status-code-200
                // check status every 30 sec for 8-times
                function (callback) {
                    retryStatus(token, params, 10, 30000, function (err, result) {

                        if (err) {
                            console.log('error');
                        } else {
                            console.log('restryStatus passed');
                        }
                        callback(err, result);
                    });
                },
                // incremental deployment - deploy app
                function (callback) {
                    deployFunctionApp(token, params, function (err, result, res, req) {

                        if (err) {
                            return callback(err);
                        }

                        console.log('provisionFunction created');
                        callback(null, result);
                    });
                },
                // check status
                function (callback) {
                    retryStatus(token, params, 10, 30000, function (err, result) {

                        if (err) {
                            console.log('error');
                        } else {
                            console.log('restryStatus passed');
                        }
                        callback(err, result);
                    });
                }

            ], function (err, results) {
                console.log('function provision completed');
                if (err) {
                    console.log(err);
                    return callback(err);
                }

                callback(null, results);
            });
    },

    getFunctionUrl: function (token, params, callback) {
        retryFunctionUrl(token, params, 20, 30000, function (err, result) {
            console.log('FunctionUrl = ', result);
            callback(err, result);
        });
    }
};

function createFunctionAppSettings(token, params, callback) {
    var body = {
        "properties": {
            "templateLink": {
                "uri": params.funcTemplateUri,
                "contentVersion": "1.0.0.0",
            },
            "mode": "Incremental",
            "parameters": {
                "appName": {
                    "value": params.functionName
                },
                "hostingPlanName": {
                    "value": params.funcHostPlanName
                },
                "storageName": {
                    "value": params.accountName
                },
                "blobConn": {
                    "value": (params.storageConnString) || "TODO_ADD_CONNSTRING"
                },
                "blobCont": {
                    "value": params.containerName
                },
                "schAcct": {
                    "value": params.searchServiceName
                },
                "schApiKey": {
                    "value": (params.searchAPIKey) || "TODO_ADD_APIKEY"
                },
                "schIndex": {
                    "value": params.searchIndex
                },
                "cogApiKey": {
                    "value": params.cogAPIKey
                },
                "cogApiUrl": {
                    "value": params.cogAPIUrl
                },
                "isSecondary": {
                    "value": params.isSecondary
                },
                "costCenter": {
                    "value": params.tags
                }
            }
        }
    };

    var _params = {
        uri: util.format("https://management.azure.com/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Resources/deployments/%s?api-version=2015-01-01",
            params.subscription, params.resourceGroupName, params.functionName),
        method: 'PUT',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: body
    };


    request(_params, function (error, result, response) {
        if (error) {
            return callback(error);
        } else if (response.error) {
            return callback(response.error);
        }

        console.log("\nCreate azure function with Appsettings: ", params.functionName);
        //console.log(result);
        callback(null, result);
    });
}

function deployFunctionApp(token, params, callback) {
    var body = {
        "properties": {
            "templateLink": {
                "uri": params.funcDeployTemplateUri,
                "contentVersion": "1.0.0.0",
            },
            "mode": "Incremental",
            "parameters": {
                "appName": {
                    "value": params.functionName
                },
                "hostingPlanName": {
                    "value": params.funcHostPlanName
                },
                "storageName": {
                    "value": params.accountName
                },
                "packageUri": {
                    "value": params.funcPackageUri
                },
                "costCenter": {
                    "value": params.tags
                }
            }
        }
    };

    var _params = {
        uri: util.format("https://management.azure.com/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Resources/deployments/%s?api-version=2015-01-01",
            params.subscription, params.resourceGroupName, params.functionName),
        method: 'PUT',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: body
    };


    request(_params, function (error, result, response) {
        if (error) {
            return callback(error);
        } else if (response.error) {
            return callback(response.error);
        }

        console.log("\nDeploy azure function app: ", params.functionName);
        //console.log(result);
        callback(null, result);
    });
}

var retryStatus = (function () {
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

            // state = [Accepted, Running, Succeeded, Failed]
            if (error || response.statusCode !== 200 || state !== "Succeeded") {
                console.log('count, state:', count, state);

                if (state === "Failed") {
                    return next('failed provisioning');
                }

                if (count++ < max) {
                    return setTimeout(function () {
                        retryStatus(token, params, max, timeout, next);
                    }, timeout);
                } else {
                    return next('max retries reached');
                }
            }

            //console.log('success');
            // reset count
            count = 0;

            next(null, body);
        });
    };
})();

var retryFunctionUrl = (function () {
    var count = 0;

    return function (token, params, max, timeout, next) {

        var uri = `https://management.azure.com/subscriptions/${params.subscription}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.Web/sites/${params.functionName}/functions/FotosHttpTrigger/listsecrets?api-version=2015-08-01`;

        var _params = {
            uri: uri,
            method: 'POST',
            json: true,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            }
        };

        request(_params, function (error, result, response, req) {

            if (error || response.error) {
                console.log('count, code:', count, (response.error) ? response.error.code : error);

                if (count++ < max) {
                    return setTimeout(function () {
                        retryFunctionUrl(token, params, max, timeout, next);
                    }, timeout);
                } else {
                    return next('max retries reached');
                }
            }

            //console.log('fx trigger_url', response.trigger_url);
            next(null, response.trigger_url);
        });
    };
})();
