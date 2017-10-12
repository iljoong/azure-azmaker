/* 

*/
var async = require('async');
var request = require('request');
var util = require('util');

module.exports = {
    provisionTM: function (token, params, params2, callback) {

        createTM(token, params, params2, function (error, result, request, response) {
            if (error) {
                return callback(error);
            }

            callback(null, result);
        });
    }
};

function createTM(token, params, params2, callback) {

    var _uri = util.format("https://management.azure.com/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/trafficmanagerprofiles/%s?api-version=2015-11-01",
        params.subscription, params.resourceGroupName, params.tmName);

    var body = {
        "location": "global",
        "tags": { costcenter: params.tags },
        properties: {
            profileStatus: "Enabled",
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
                        "endpointStatus": "Enabled",
                        "endpointMonitorStatus": null,
                        "targetResourceId": util.format("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Web/sites/%s",
                            params.subscription, params.resourceGroupName, params.webSiteName),
                        "target": params.webSiteName + ".azurewebsites.net",
                        "weight": 1,
                        "priority": 1,
                        "endpointLocation": params.location,
                    }
                },
                {
                    "name": "endpoint2",
                    "type": "Microsoft.Network/trafficManagerProfiles/azureEndpoints",
                    "properties": {
                        "endpointStatus": "Enabled",
                        "endpointMonitorStatus": null,
                        "targetResourceId": util.format("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Web/sites/%s",
                            params.subscription, params2.resourceGroupName, params2.webSiteName),
                        "target": params2.webSiteName + ".azurewebsites.net",
                        "weight": 1,
                        "priority": 2,
                        "endpointLocation": params2.location
                    }
                }]
        }
    };

    console.log(JSON.stringify(body, null, 4));

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

    console.log("Create TM: ", params.tmName);
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
