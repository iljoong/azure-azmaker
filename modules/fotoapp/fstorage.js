/*

Azure stroage provisioning

 */

var async = require('async');
var request = require('request');
var util = require('util');

module.exports = {
    provisionStorage: function (storageClient, params, callback) {
        var storageConnString = null;

        async.series(
            [
                function (cb) {
                    createStorageAccount(storageClient, params, function (err, result, res, req) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, result);
                    });
                },
                function (cb) {
                    configStorageAccount(storageClient, params, function (err, result, res, req) {
                        if (err) {
                            return cb(err);
                        }
                        // configStorageAccount returns connstring via 'res'
                        storageConnString = res;

                        cb(null, result);
                    });
                }
            ],
            function (err, results) {
                console.log('storage provision completed');
                /*if (err) {
                    console.log(err);
                } else {
                    console.log(results);
                }*/

                callback(err, results, storageConnString);
            }
        );
    }
};

function createStorageAccount(storageClient, params, callback) {
    var storageParameters = {
        location: params.location,
        sku: {
            name: 'Standard_RAGRS'
        },
        kind: 'Storage',
        tags: {
            costcenter: params.tag,
        }
    };

    console.log('\nCreating storage account: ' + params.accountName);
    storageClient.storageAccounts.create(params.resourceGroupName, params.accountName, storageParameters, callback);

}

function configStorageAccount(storageClient, params, callback) {

    console.log('Config storage account: ' + params.accountName);
    /// get storage acct key
    storageClient.storageAccounts.listKeys(params.resourceGroupName, params.accountName, function (error, result, request, response) {
        if (error) {
            callback(error);
        }
        //console.log(result);
        var accountKey = result.keys[0].value;
        var connectionString = util.format("DefaultEndpointsProtocol=https;AccountName=%s;AccountKey=%s;", params.accountName, accountKey);

        console.log("---ConnectionString: " + connectionString);

        // https://azure.github.io/azure-storage-node/
        // set cors
        var storage = require('azure-storage');
        var blobService = storage.createBlobService(params.accountName, accountKey);
        var serviceProperties = {
            Cors: {
                CorsRule: [
                    {
                        AllowedOrigins: [params.corsURL],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                        AllowedHeaders: ['*'],
                        ExposedHeaders: ['*'],
                        MaxAgeInSeconds: 3600
                    }
                ],
            },
        };

        //async.parallel(
        async.series(
            [
                function (cb) {
                    console.log('Config storage account property(CORS): ' + params.corsURL);
                    blobService.setServiceProperties(serviceProperties, function (error, result, response) {
                        if (!error) {
                            // properties are set
                            cb(null, result);
                        }
                    });
                },
                function (cb) {
                    console.log('Create container: ' + params.containerName);
                    blobService.createContainerIfNotExists(params.containerName, { publicAccessLevel: 'blob' }, function (error, result, response) {
                        if (!error) {
                            //console.log(result);
                            cb(null, result);
                        }
                    });

                },
                function (cb) {
                    console.log('Create healthcheck file');
                    blobService.createBlockBlobFromText(params.containerName, "health.json", "{}", function(error, result) {
                        if (!error) {
                            //console.log(result);
                            cb(null, result);
                        }
                    });
                },
                function (cb) {
                    console.log('Create queue: ' + params.queueName);
                    var queueService = storage.createQueueService(params.accountName, accountKey);
                    queueService.createQueueIfNotExists(params.queueName, function (error, result, response) {
                        if (!error) {
                            //console.log(result);
                            cb(null, result);
                        }
                    });
                },
                function (cb) {
                    console.log('Create table: ' + params.tableName);
                    var tableService = storage.createTableService(params.accountName, accountKey);
                    tableService.createTableIfNotExists(params.tableName, function (error, result, response) {
                        if (!error) {
                            //console.log(result);
                            cb(null, result);
                        }

                    });
                },
            ], function (err, results) {
                if (!err) {
                    callback(null, results, connectionString);
                } else {
                    callback(err);
                }
            });
    });
}