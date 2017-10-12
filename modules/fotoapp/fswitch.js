var async = require('async');
var util = require('util');
var request = require('request');

var msRestAzure = require('ms-rest-azure');
var webSiteManagement = require('azure-arm-website');
var trafficManager = require('azure-arm-trafficmanager');

module.exports = {

    exeFailover: function(params, cb) {
        msRestAzure.loginWithServicePrincipalSecret(params.client_id, params.client_secret, params.tenant_id, function (err, credentials) {
            if (err) {
                console.log(err);
                return;
            }
            var startTime = new Date();
            console.log(util.format("Start Time: %d:%d:%d", startTime.getHours(), startTime.getMinutes(), startTime.getSeconds()));

            var webSiteClient = new webSiteManagement(credentials, params.subscription);
            var token = credentials.tokenCache._entries[0].accessToken;

            async.series(         [
                function (callback) {
                    cb("TM updating");
                    updateTM(token, params, callback);
                },
                function (callback) {
                    cb("Getting standby web appsettings");
                    getWebSiteAppsetting(webSiteClient, params.failOver ? "S" : "P", params, function(err, results, res, req) {

                        params.appSettings = results.properties;
                        //console.log(JSON.stringify(results, null, 4));
                        callback(err, results);
                    });
                },
                function (callback) {
                    cb('Index Sync');
                    params.searchServiceName = params.appSettings.FOTOS_SCHACCT;
                    params.searchAPIKey = params.appSettings.FOTOS_SCHAPIKEY;
                    syncIndex(params, callback);
                },
                function (callback) {
                    cb("Setting standby web appsettings");
                    params.appSettings.FOTOS_READONLY = "false";
                    configWebSiteAppsetting(webSiteClient, params.failOver ? "S" : "P", params, callback);
                },
                function (callback) {
                    cb("Getting active web appsettings");
                    getWebSiteAppsetting(webSiteClient, params.failOver ? "P" : "S", params, function(err, results, res, req) {

                        params.appSettings = results.properties;
                        callback(err, results);
                    });
                },            
                function (callback) {
                    cb("Setting active web appsettings");                    
                    params.appSettings.FOTOS_READONLY = "true";                
                    configWebSiteAppsetting(webSiteClient, params.failOver ? "P" : "S", params, callback);                
                }
            ],
            function (err, results) {
                if (err) {
                    console.log(err);
                    cb("error: " + JSON.stringify(err, null, 4));
                    return;
                }

                var endTime = new Date();
                console.log(util.format("End Time: %d:%d:%d", endTime.getHours(), endTime.getMinutes(), endTime.getSeconds()));
                console.log(util.format("Total elapsed time: %d", Math.round((endTime.getTime() - startTime.getTime()) / 1000.0)));
                //console.log(JSON.stringify(results, null, 4));

                cb("success");
            });
        });
    }
};


function updateTM(token, params, callback) {

    var _uri = util.format("https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/trafficmanagerprofiles/%s?api-version=2015-11-01",
        params.subscription, params.resourceGroupName, params.tmName);

    var body = {
        "location": "global",
        properties: {
            trafficRoutingMethod: "Priority",
            dnsConfig: {
                relativeName: params.tmName, // dnsName
                "ttl": 30
            },
            monitorConfig: {
                profileMonitorStatus: null,
                protocol: "HTTP",
                port: 80,
                path: "/ping"
            },
            endpoints: [
                {
                    "name": "endpoint1",
                    "type": "Microsoft.Network/trafficManagerProfiles/azureEndpoints",
                    "properties": {
                        "targetResourceId": util.format("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Web/sites/%s",
                            params.subscription, params.rgNameP, params.websiteNameP),
                        "priority": (params.failOver) ? 3 : 1,
                    }
                },
                {
                    "name": "endpoint2",
                    "type": "Microsoft.Network/trafficManagerProfiles/azureEndpoints",
                    "properties": {
                        "targetResourceId": util.format("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Web/sites/%s",
                            params.subscription, params.rgNameS, params.websiteNameS),                
                        "priority": 2,
                    }
                }]
        }
    };
    //console.log(JSON.stringify(body, null, 4));

    var _params = {
        uri: _uri,
        method: 'PUT',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: body
    };

    console.log("Update TM: ", params.tmName);
    request(_params, function (error, result, response, req) {
        if (error) {
            return callback(error);
        } else if (response.error) {
            return callback(response.error);
        } else if (response.code == "BadRequest") {
            return callback(response.message);
        }

        //console.log(result);
        return callback(null, result);
    });
}

function getWebSiteAppsetting(webSiteClient, prisec, params, callback) {

    var resourceGroupName = (prisec === "P") ? params.rgNameP : params.rgNameS;
    var websiteName = (prisec === "P") ? params.websiteNameP : params.websiteNameS;

    console.log('Getting app settings for website : ' + websiteName);
    return webSiteClient.webApps.listApplicationSettings(resourceGroupName, websiteName, callback);
}

function configWebSiteAppsetting(webSiteClient, prisec, params, callback) {

    var resourceGroupName = (prisec === "P") ? params.rgNameP : params.rgNameS;
    var websiteName = (prisec === "P") ? params.websiteNameP : params.websiteNameS;
    var appSettings = {
        location: (prisec === "P") ? params.locationP : params.locationS,
        properties: params.appSettings
    };

    console.log('Updating app settings for website : ' + websiteName);
    return webSiteClient.webApps.updateApplicationSettings(resourceGroupName, websiteName, appSettings, null, callback);
}

function syncIndex(params, callback) {

    var _uri = util.format("https://%s.search.windows.net/indexers/fotos-json-indexer/run?api-version=2016-09-01",
        params.searchServiceName);
    //console.log(JSON.stringify(body, null, 4));

    var _params = {
        uri: _uri,
        method: 'POST',
        json: true,
        headers: {
            'api-key': params.searchAPIKey,
            'Content-Type': 'application/json'
        }
    };

    console.log("Sync Index: ", params.searchServiceName);
    request(_params, function (error, result, response, req) {
        if (error) {
            return callback(error);
        }

        //console.log(result);
        return callback(null, result);
    });
}