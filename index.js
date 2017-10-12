// handling subscription
const BrowserWindow = require('electron').remote.BrowserWindow;
const path = require('path');

$('#main_subs').click(function () {

    const modalPath = path.join('file://', __dirname, 'common/subs.html');
    win = new BrowserWindow({ width: 400, height: 360 });
    win.on('close', function () { win = null });
    win.loadURL(modalPath);
    win.show();
    
});
//main_dev
$('#main_dev').click(function () {
    ipc.send('main-devtool');
});

//main_dev
$('#main_about').click(function () {
    alert("Develop by Il Joong Kim\niljoong@outlook.com");
});

/////////// TODO: update to load menu dynamically ////////////////////////
$('#main_menu_test').click(function () {

    $("#page-wrapper").html('<div class="row"><h3>loading...</h3></div>');
    $("#page-wrapper").load(__dirname + '/modules/test/index.html', function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success")
            console.log("html loaded successfully!");
        if (statusTxt == "error")
            console.log("Error: " + xhr.status + ": " + xhr.statusText);
    });

});

$('#main_menu_demo_foto').click(function () {
    ipc.removeAllListeners(['selected-directory']);

    $("#page-wrapper").html('<div class="row"><h3>loading...</h3></div>');
    $("#page-wrapper").load(__dirname + '/modules/fotoapp/index.html', function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success")
            console.log("html loaded successfully!");
        if (statusTxt == "error")
            console.log("Error: " + xhr.status + ": " + xhr.statusText);
    });

});

$('#main_menu_demo_vmss').click(function () {
    ipc.removeAllListeners(['selected-directory']);

    $("#page-wrapper").html('<div class="row"><h3>loading...</h3></div>');
    $("#page-wrapper").load(__dirname + '/modules/vmss/index.html', function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success")
            console.log("html loaded successfully!");
        if (statusTxt == "error")
            console.log("Error: " + xhr.status + ": " + xhr.statusText);
    });
});
///////////////////////////////////////////////////////////////////////////////

var ipc = require('electron').ipcRenderer;

$(document).ready(function () {

    ipc.on('app-settings-init-file', function (event, data) {
        var json = JSON.parse(data);

        if (json.name && json.name == "azmaker") {
            $('#subs_tenant_id').val(json.subs_tenant_id);
            $('#subs_client_id').val(json.subs_client_id);
            $('#subs_client_secret').val(json.subs_client_secret);
            $('#subs_subscription').val(json.subs_subscription);
        } else {
            alert('app settings file is invalid!');
        }
    });

    ipc.send('app-settinges-init');
});

// test subscription
$('#main_menu_debug').click(function () {

    var json = {
      "tenant_id": $('#subs_tenant_id').val(),
      "client_id": $('#subs_client_id').val(),
      "client_secret": $('#subs_client_secret').val(),
      "subscription": $('#subs_subscription').val()
    };

    alert(JSON.stringify(json, null, 4));
});
