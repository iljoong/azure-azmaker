const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

const ipc = require('electron').ipcMain
const dialog = require('electron').dialog

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 1000, height: 800 })

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
var fs = require('fs');

ipc.on('open-file-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openFile']
  }, function (path) {
    if (path) {
        event.sender.send('selected-directory', path);
    }
  });
});

// initialize subscription settings
ipc.on('app-settinges-init', function(event) {
  //get config
  //console.log('app-settinges-init');
  var filepath = app.getPath('home') + '/azmaker.json';


  fs.readFile(filepath, 'utf8', (err, data) => {
      if (!err && data) {
        //console.log(data);
        event.sender.send('app-settings-init-file', data);
      }
  });  
});

// update subscription settings
ipc.on('app-settinges', function(event) {
  //get config
  var filepath = app.getPath('home') + '/azmaker.json';

  fs.readFile(filepath, 'utf8', (err, data) => {
      if (!err && data) {
        //console.log(`${filepath}, ${data}`);
        event.sender.send('app-settings-file', data);
      }
  });  
});

// save settings
ipc.on('app-settinges-save', function(event, json) {

  console.log('app-settinges-save');
  var data = JSON.stringify(json, null, 4);
  //get config
  var filepath = app.getPath('home') + '/azmaker.json';

  fs.writeFile(filepath, data, 'utf8', (err) => {
      if (err) throw err;
  });  
});

// open dev tool
ipc.on('main-devtool', function(event) {
  //get config
  console.log('main-devtool');
  win.webContents.openDevTools();

});
