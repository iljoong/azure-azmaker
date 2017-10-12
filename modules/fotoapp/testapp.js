/*

Demo automation js

*/

var async = require('async');
var request = require('request');
var util = require('util');
var open = require('open');

var config = {

    "client_id": "<add client_id>",
    "client_secret": "<add client_secret>",
    "subscription": "<add subscription>",
    "tenant_id": "<add tenant_id>"
};

// parameters
var processArguments = process.argv;
if (processArguments.length < 4) {
    var _cmd = processArguments[1];
    console.log(`\nIncorrect number of arguments. node ${_cmd} <rgname> <prefix> [dr]\n`);
    process.exit(1);
}
var _resourceGroupName = processArguments[2];
var prefix = processArguments[3];
var bDR = (processArguments[4] === 'dr') ? true : false;

/*
var _resourceGroupName = 'demo-finx';
var prefix = 'ikfinx';
/**/

var _location = ['japanwest', 'japaneast'];
var _schlocation = ['japanwest', 'eastasia'];
var _tag = 'demo'; // costcenter

var _containerName = 'images';
var _queueName = 'azf-blobtrigger';
var _tableName = 'fotoslog';
var _corsURL = '*';


var _searchIndex = "fotos-index";
var _searchDataSource = "fotos-blob-datasource";
var _searchIndexer = "fotos-json-indexer";

var params = {
    // app prop
    title: "iFOTOS",
    redirURL: "redirurl",   // AAD app redirect
    isSecondary: 'false',

    "tenant_id": config.tenant_id,
    "client_id": config.client_id,
    "client_secret": config.client_secret,
    "subscription": config.subscription,

    // common
    resourceGroupName: _resourceGroupName,
    location: _location[0],
    schlocation: _schlocation[0],
    tags: _tag,
    prefixName: prefix,

    // cog
    cogAPIKey: "<add key>",
    cogAPIUrl: "https://api.projectoxford.ai/vision/v1.0/analyze",

    // storage
    accountName: prefix + 'stor',
    containerName: _containerName,
    queueName: _queueName,
    tableName: _tableName,
    corsURL: _corsURL,

    storageConnString: "TO_BE_ADDED",

    // search
    searchServiceName: prefix + "sch",
    searchIndex: _searchIndex,
    searchDataSource: _searchDataSource,
    searchIndexer: _searchIndexer,

    searchAPIKey: "TO_BE_ADDED",

    // webapp
    hostingPlanName: prefix + "wbpn",
    webSiteName: prefix + 'web',
    webappPackageUri: "https://iljoongstorage.blob.core.windows.net/package/fotosweb28.zip",
    webTemplateUri: "https://iljoongstorage.blob.core.windows.net/package/azwebapp_deploy.json",
    webSiteReadOnly: 'false',

    // functions
    functionName: prefix + 'fx',
    funcPackageUri: "https://iljoongstorage.blob.core.windows.net/package/fotosfx26.zip",
    funcTemplateUri: "https://iljoongstorage.blob.core.windows.net/package/azfunc_appsettings.json",
    funcDeployTemplateUri: "https://iljoongstorage.blob.core.windows.net/package/azfunc_msdeploy.json",
    funcHostPlanName: prefix + "wbpn",

    funcApiAppUrl: "TO_BE_ADDED",
    // tmname
    tmName: prefix + "tm"
};

var params2 = {
    // app prop
    title: "iFOTOS-DR",
    redirURL: "redirurl",   // for AAD app redirect, not in used
    isSecondary: 'true',

    "tenant_id": config.tenant_id,
    "client_id": config.client_id,
    "client_secret": config.client_secret,
    "subscription": config.subscription,

    resourceGroupName: _resourceGroupName + 'dr',
    location: _location[1],
    schlocation: _schlocation[1],
    tags: _tag,

    cogAPIKey: params.cogAPIKey,
    cogAPIUrl: "https://api.projectoxford.ai/vision/v1.0/analyze",

    // storage
    accountName: prefix + "stordr",
    containerName: _containerName,
    queueName: _queueName,
    tableName: _tableName,
    corsURL: _corsURL,

    storageConnString: "TO_BE_ADDED",

    // search
    searchServiceName: prefix + 'schdr', //prefix + 'sch'
    searchIndex: _searchIndex,
    searchDataSource: _searchDataSource,
    searchIndexer: _searchIndexer,

    searchAPIKey: "TO_BE_ADDED",

    // webapp
    hostingPlanName: prefix + "webpndr",
    webSiteName: prefix + "webdr",
    webappPackageUri: params.webappPackageUri,
    webTemplateUri: params.webTemplateUri,
    webSiteReadOnly: 'true',

    // functions
    functionName: prefix + "fxdr",
    funcPackageUri: params.funcPackageUri,
    funcTemplateUri: params.funcTemplateUri,
    funcDeployTemplateUri: params.funcDeployTemplateUri,
    funcHostPlanName: prefix + "webpndr",

    funcApiAppUrl: "TO_BE_ADDED",

    // tmname
    tmName: prefix + "tm"
};

var fapp = require('./app.js');

// test run
if (bDR) {
    fapp.provisionDRService(params, params2, function (results) {

        console.log(results);
    }, function final(url) {
        open(url);
    });
} else {
    fapp.provisionService(params, function (results) {

        console.log(results);
    }, function final(url) {
        open(url);
    });
}
