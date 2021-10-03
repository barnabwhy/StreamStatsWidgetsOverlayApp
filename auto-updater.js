const electron = require('electron')
const os = require('os')
const autoUpdater = electron.autoUpdater
const appVersion = require('./package.json').version

autoUpdater.on('error', message => {
  console.error('There was a problem updating the application');
  console.error(message);
})

let updateFeed = ''
let initialized = false
const platform = `${os.platform()}_${os.arch()}`
const serverURL = 'https://stream-stats-widgets-overlay-app-update-server.vercel.app'

if (os.platform() === 'darwin') {
  updateFeed = `${serverURL}/update/${platform}/${appVersion}`
} else if (os.platform() === 'win32') {
  updateFeed = `${serverURL}/update/win32/${appVersion}`
}

function init(mainWindow) {
  if (initialized || !updateFeed || process.env.NODE_ENV === 'development') { return }

  initialized = true

  autoUpdater.setFeedURL(updateFeed)

  autoUpdater.once('update-downloaded', (event, releaseNotes, releaseName) => {
    mainWindow.webContents.send('update-available', { name: releaseName, notes: releaseNotes })
  })

  autoUpdater.checkForUpdates()

  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 60000)
}

module.exports = {
  init
}
