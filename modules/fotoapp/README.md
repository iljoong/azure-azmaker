# iFotoapp Automation Demo

This demo script demonstrates how to automate provisioning iFotoapp service(PaaS based) with BCDR.

## Prep

- create a 'computer vision' cognitive services

- setup [AAD for service principal](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal) login

- update paramters in `testapp.js`

    * tenant_id, client_id, tenant_secret, subscription
    * computer vision api key

note: if you want interactive login instead of service principal login then modify `msRestAzure.loginWithServicePrincipalSecret` code in `app.js` to below code snippet.

```
msRestAzure.interactiveLogin(function (err, credentials)
```

## Run test

```
npm install
npm testapp.js <rg name> <prefix name>
```

note: since prefix name is used for webapp name, it must be unique globally.

## Failover/back Test

Use following Azure CLI (2.0) to test failover/failback

[dwswitch.sh](./docs/drswitch.sh)

### Test Scenario

[Test scenario](./docs/test_senario.md)

## Templates

Please refer following ARM templates for creating azure functions and web app.

[Template](./docs/templates)

## Reference

Azure SDK for node: http://azure.github.io/azure-sdk-for-node/
