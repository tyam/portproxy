
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const storage = require('electron-json-storage')
const path = require('path')


let mainWindow = null;
let config = null;
let configWindow = null

const loadConfig = (k) => () => {
  storage.get('config', (err, aConfig) => {
    if (Object.keys(aConfig).length === 0) {
      // no config. Then use default one.
      config = {theme: 'dark'}
    } else {
      config = aConfig
    }
    k()
  })
}

const prepareWindow = (k) => () => {
  if (mainWindow === null) {
    electron.Menu.setApplicationMenu(null)
    mainWindow = new BrowserWindow({width: 600, height: 250, show:false})
    mainWindow.loadFile(path.join(__dirname, 'main.html'))
    //mainWindow.webContents.openDevTools()
    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
    })
    mainWindow.on('closed', () => {
      app.quit();
    })
  }
}

const prepareConfigWindow = () => {
  if (configWindow === null) {
    configWindow = new BrowserWindow({width: 320, height:200, show:false})
    configWindow.loadFile(path.join(__dirname, 'config.html'))
    //configWindow.webContents.openDevTools()
    configWindow.once('ready-to-show', () => {
      configWindow.show()
    })
    configWindow.on('closed', () => {
      configWindow = null
    })
  }
}

const doNothing = () => {}

app.on('ready', loadConfig(prepareWindow(doNothing)))

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', prepareWindow(doNothing));

module.exports = {
  getConfig: () => {
    return config
  }, 
  setConfig: (aConfig) => {
    config = aConfig
    storage.set('config', config, (err) => {})
    app.emit('configure', config)
  }, 
  openConfigWindow: () => {
    prepareConfigWindow()
  }, 
  closeConfigWindow: () => {
    configWindow.close()
  }
};