/*

Azure webapp provisioning

 */
var async = require('async');
var request = require('request');
var util = require('util');

module.exports = {

    provisionWebApp: function (resourceClient, webSiteClient, token, params, callback) {
        async.series(
            [
                // with ARM template (deploy & appsettings)
                function (callback) {
                    createDeployWebSite(token, params, function (err, result, res, req) {
                        if (err) {
                            callback(err);
                        }
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
                },
                // DON'T NEED
                /*
                function (callback) {
                    deployWebSite(token, params, function (err, result, res, req) {
                        if (err) {
                            callback(err);
                        }
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
                /**/
            ], function (err, results) {
                console.log('webapp provision completed');
                if (err) {
                    console.log(err);
                }

                callback(err, results);
            });
    },

    provisionWebAppSDK: function (resourceClient, webSiteClient, token, params, callback) {
        async.series(
            [
                // with SDK
                function (callback) {
                    createHostingPlan(resourceClient, params, function (err, result, res, req) {
                        return (err) ? callback(err) : callback(null, result);
                    });
                },
                function (callback) {
                    createWebSite(webSiteClient, params, function (err, result, res, req) {
                        return (err) ? callback(err) : callback(null, result);
                    });
                },
                function (callback) {
                    configWebSite(webSiteClient, params, function (err, result, res, req) {
                        return (err) ? callback(err) : callback(null, result);
                    });
                },
                function (callback) {
                    configWebSiteAppsetting(webSiteClient, params, function (err, result, res, req) {
                        return (err) ? callback(err) : callback(null, result);
                    });
                }
            ], function (err, results) {
                console.log('webapp provision completed');
                if (err) {
                    console.log(err);
                }

                callback(err, results);
            });
    }
};

function createDeployWebSite(token, params, callback) {
    console.log('Create & deploy webapp: ', params.webSiteName);

    var body = {
        "properties": {
            "templateLink": {
                "uri": params.webTemplateUri,
                "contentVersion": "1.0.0.0",
            },
            "mode": "Incremental",
            "parameters": {
                "appName": {
                    "value": params.webSiteName
                },
                "hostingPlanName": {
                    "value": params.hostingPlanName
                },
                "packageUri": {
                    "value": params.webappPackageUri
                },
                "costCenter": {
                    "value": params.tags
                },
                "appTitle": {
                    "value": params.title
                },
                "readOnly": {
                    "value": params.webSiteReadOnly
                },
                "isSecondary": {
                    "value": params.isSecondary
                },
                "pageSize": {
                    "value": "8"
                },
                "strConn": {
                    "value": params.storageConnString
                },
                "containerName": {
                    "value": params.containerName
                },
                "schAcct": {
                    "value": params.searchServiceName
                },
                "schAPIKey": {
                    "value": params.searchAPIKey
                },
                "schIndex": {
                    "value": params.searchIndex
                },
                "apiAppURL": {
                    "value": params.funcApiAppUrl
                },
                "redirURL": {
                    "value": params.redirURL
                }
            }
        }
    };

    var _params = {
        uri: util.format("https://management.azure.com/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Resources/deployments/%s?api-version=2015-01-01",
            params.subscription, params.resourceGroupName, params.webSiteName),
        method: 'PUT',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: body
    };

    console.log("\nCreate webapp: ", params.webSiteName);
    request(_params, function (error, result, response) {
        if (error) {
            return callback(error);
        } else if (response.error) {
            return callback(response.error);
        }

        //console.log(result);
        callback(null, result);
    });

}

var retryStatus = (function () {
    var count = 0;

    return function (token, params, max, timeout, next) {
        // check status
        var _params = {
            uri: util.format("https://management.azure.com/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Resources/deployments/%s?api-version=2015-01-01",
                params.subscription, params.resourceGroupName, params.webSiteName),
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

function getStatus(token, params, next) {
    // check status
    var _params = {
        uri: util.format("https://management.azure.com/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Resources/deployments/%s?api-version=2015-01-01",
            params.subscription, params.resourceGroupName, params.webSiteName),
        method: 'GET',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        }
    };

    request(_params, function (error, response, body) {
        next(error, body);
    });
}

/*
function deployWebSite(token, params, callback) {
    console.log('Deploying webapp: ');

    var body = {
        "properties": {
            "templateLink": {
                "uri": params.webTemplateUri,
                "contentVersion": "1.0.0.0",
            },
            "mode": "Incremental",
            "parameters": {
                "appName": {
                    "value": params.webSiteName
                },
                "packageUri": {
                    "value": params.webappPackageUri
                },
                "costCenter": {
                    "value": params.tags
                }
            }
        }
    };

    var _params = {
        uri: util.format("https://management.azure.com/subscriptions/%s/resourcegroups/%s/providers/Microsoft.Resources/deployments/%s?api-version=2015-01-01",
            params.subscription, params.resourceGroupName, params.webSiteName),
        method: 'PUT',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: body
    };

    console.log("\nDeploy webapp: ", params.webSiteName);
    request(_params, function (error, result, response) {
        if (error) {
            return callback(error);
        } else if (response.error) {
            return callback(response.error);
        }

        //console.log(result);
        callback(null, result);
    });

}
*/

// delete
function createHostingPlan(resourceClient, params, callback) {
    var planToCreate = {
        resourceName: params.hostingPlanName,
        resourceProviderNamespace: 'Microsoft.Web',
        resourceType: 'serverFarms',
        resourceProviderApiVersion: '2014-06-01'
    };

    var planParameters = {
        properties: {
            sku: 'Standard',
            numberOfWorkers: 1,
            workerSize: 'Small',
            hostingPlanName: params.hostingPlanName
        },
        location: params.location
    };
    console.log('\nCreating hosting plan: ' + params.hostingPlanName);
    return resourceClient.resources.createOrUpdate(params.resourceGroupName, planToCreate.resourceProviderNamespace, '', planToCreate.resourceType,
        planToCreate.resourceName, planToCreate.resourceProviderApiVersion, planParameters, callback);
}

function createWebSite(webSiteClient, params, callback) {
    var parameters = {
        location: params.location,
        serverFarmId: params.hostingPlanName
    };
    console.log('Creating web site: ' + params.webSiteName);

    // changes: return webSiteClient.sites.createOrUpdate(params.resourceGroupName, params.webSiteName, parameters, null, callback);
    return webSiteClient.webApps.createOrUpdate(params.resourceGroupName, params.webSiteName, parameters, null, callback);
}

function configWebSite(webSiteClient, params, callback) {
    var siteConfig = {
        location: params.location,
        alwaysOn: true
    };
    console.log('Updating config for website : ' + params.webSiteName);
    return webSiteClient.webApps.createOrUpdateConfiguration(params.resourceGroupName, params.webSiteName, siteConfig, null, callback);
}

function configWebSiteAppsetting(webSiteClient, params, callback) {
    var appSetting = {
        location: params.location,
        properties: {
            "WEBSITE_NODE_DEFAULT_VERSION": "6.9.1",    // MUST BE INCLUDED for node.js deployment
            "FOTOS_TITLE": params.title,
            "FOTOS_READONLY": params.webSiteReadOnly,
            "FOTOS_ISSECONDARY": params.isSecondary,
            "FOTOS_PAGESIZE": "8",
            "FOTOS_STRCONN": params.storageConnString,
            "FOTOS_CONTAINER": params.containerName,
            "FOTOS_SCHACCT": params.searchServiceName,
            "FOTOS_SCHAPIKEY": params.searchAPIKey,
            "FOTOS_SCHINDEX": params.searchIndex,
            "FOTOS_APIAPPURL": params.funcApiAppUrl,
            "REDIR_URL": params.redirURL,
        }
    };

    console.log('Updating app settings for website : ' + params.webSiteName);
    return webSiteClient.webApps.updateApplicationSettings(params.resourceGroupName, params.webSiteName, appSetting, null, callback);
}

