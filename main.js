// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, autoUpdater, dialog } = require('electron')

// Squirrel Events
const setupEvents = require('./installers/setupEvents')
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

// Auto updater
const server = 'https://stream-stats-widgets-overlay-app-update-server.vercel.app/'
const url = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({ url })

setInterval(() => {
  autoUpdater.checkForUpdates()
}, 60000)

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  // const dialogOpts = {
  //   type: 'info',
  //   buttons: ['Restart', 'Later'],
  //   title: 'Application Update',
  //   message: process.platform === 'win32' ? releaseNotes : releaseName,
  //   detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  // }

  // dialog.showMessageBox(dialogOpts).then((returnValue) => {
  //   if (returnValue.response === 0) autoUpdater.quitAndInstall()
  // })
  mainWindow.webContents.send("update-available")
})

autoUpdater.on('error', message => {
  console.error('There was a problem updating the application')
  console.error(message)
})

const path = require('path')
const fs = require('fs')
var basepath = app.getAppPath();

let mainWindow, overlayWindow;
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "Stream Stats Widgets Overlay App",
    width: 420,
    height: 640,
    frame: false,
    backgroundColor: "#18181b",
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    icon: "icon.png",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js")
    }
  })
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => { mainWindow.show() })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-finish-load', e => {
    if(token != null && channel != "") {
      mainWindow.webContents.send("twitch-auth", [true, channel])
    }
  })

  overlayWindow = new BrowserWindow({
    title: "Stream Stats Widgets Overlay App | Overlay",
    width: 420,
    height: 640,
    skipTaskbar: true,
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    alwaysOnTop: true,
    focusable: false,
    fullscreen: true,
    show: false,
    kiosk: true,
    icon: "icon.png",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload_overlay.js"),
      backgroundThrottling: false
    }
  })
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.loadFile('overlay.html');
  // overlayWindow.webContents.openDevTools()

  overlayWindow.webContents.on('did-finish-load', e => {
    if(editing) {
      overlayWindow.webContents.send("startEdit")
    }
  });

  mainWindow.on("close", () => {
    app.quit()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const { ipcMain } = require('electron')
ipcMain.on('reload', (event, arg) => {
  mainWindow.reload()
})
ipcMain.on('minimize', (event, arg) => {
  mainWindow.minimize();
})
ipcMain.on('close', (event, arg) => {
  app.exit();
})
ipcMain.on('twitch-auth', (event, arg) => {
  twitchMain(arg)
})
ipcMain.on('overlay-toggle', (event, arg) => {
  if(overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.show()
  }
})
ipcMain.on('overlay-reload', (event, arg) => {
  overlayWindow.reload()
})

ipcMain.on("update-and-restart", (event, arg) => {
  autoUpdater.quitAndInstall()
})

let editing = false;
ipcMain.on('widget-edit', (event, arg) => {
  editing = true;
  overlayWindow.show();
  overlayWindow.setFocusable(true);
  //overlayWindow.setSkipTaskbar(false);
  overlayWindow.focus();
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.webContents.send("startEdit")
  mainWindow.webContents.send("startEdit")
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.focus();
})
ipcMain.on('widgets-cancel', (event, arg) => {
  editing = false;
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setFocusable(false);
  overlayWindow.setSkipTaskbar(true);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.webContents.send("endEdit")
});
ipcMain.on('widgets-save', (event, widgets) => {
  editing = false;
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setFocusable(false);
  overlayWindow.setSkipTaskbar(true);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.webContents.send("endEdit")

  let wVals = Object.values(widgets).map(w => { delete w.widgets; delete w.type; delete w.css; delete w.display; return w })
  fs.promises.writeFile(`${adPath}/DefaultWidgets`, JSON.stringify(wVals))
});

const adPath = app.getPath('userData');
ipcMain.handle('get-widget', async (event, name) => {
  const result = await getWidget(name)
  return result
})

const blankWidget = require("./blankWidget.json")
async function getWidget(name) {
  return new Promise(resolve => {
    fs.stat(`${adPath}/Widgets/${name}.json`, async (error, stat) => {
      if(error) {
        fs.stat(`${basepath}/widgets/${name}.json`, async (error, stat) => {
          if(error) {
            resolve(undefined);
          } else {
            fs.promises.copyFile(`${basepath}/widgets/${name}.json`, `${adPath}/Widgets/${name}.json`)
            const widget = {...blankWidget, ...JSON.parse(await fs.promises.readFile(`${basepath}/widgets/${name}.json`, { encoding: "utf8" }))};
            resolve(widget);
          }
        });
      } else {
        const widget = {...blankWidget, ...JSON.parse(await fs.promises.readFile(`${adPath}/Widgets/${name}.json`, { encoding: "utf8" }))};
        resolve(widget);
      }
    });
  });
}

ipcMain.handle('get-default-widgets', async (event, name) => {
  const result = await getDefaultWidgets()
  return result
})
async function getDefaultWidgets() {
  return new Promise(resolve => {
    fs.stat(`${adPath}/DefaultWidgets`, async (error, stat) => {
      if(error) {
          fs.stat(`${basepath}/defaultWidgets`, async (error, stat) => {
          if(error) {
            resolve(undefined);
          } else {
            const result = JSON.parse(await fs.promises.readFile(`${basepath}/defaultWidgets.json`, { encoding: "utf8" }));
            resolve(result);
          }
        });
      } else {
        const result = JSON.parse(await fs.promises.readFile(`${adPath}/DefaultWidgets`, { encoding: "utf8" }));
        resolve(result);
      }
    });
  });
}

fs.stat(`${adPath}/Widgets`, (error, stat) => {
  if(error) {
    fs.mkdirSync(`${adPath}/Widgets`);
  }
});

ipcMain.handle('get-widgets-list', async (event, arg) => {
  const widgets = await fs.promises.readdir(`${basepath}/widgets`);
  const appdataWidgets = await fs.promises.readdir(`${adPath}/Widgets`);
  await Promise.all(widgets.map(w => {
    if(appdataWidgets.indexOf(w) == -1) fs.promises.copyFile(`${basepath}/widgets/${w}`, `${adPath}/Widgets/${w}`);
  }));
  let list = await fs.promises.readdir(`${adPath}/Widgets`);
  let display = (await Promise.all(list.map((w, i) => {
    wName = path.basename(w, path.extname(w));
    return getWidget(wName)
  }))).map((w, i) => {
    return w.display
  });
  list = list.map((w, i) => {
    return [path.basename(w, path.extname(w)), display[i]]
  })
  return list
});

const { ElectronAuthProvider } = require('@twurple/auth-electron');
const { ChatClient } = require('@twurple/chat');
const { ApiClient } = require("@twurple/api");

let authProvider
let token = null;
let channel = "";
let channelId;
let apiClient;
let subCount = 0;
let initialFollowers = 0;
async function twitchMain(chan) {
  channel = chan;

	const clientId = 'vpc7jr1vc0x7ewc4q9neg3vqtefv11';
  const redirectUri = 'http://localhost:38472/auth/twitch/callback';

  authProvider = new ElectronAuthProvider({
      clientId,
      redirectUri
  });
  token = await authProvider.getAccessToken();
  if(token == null) {
    mainWindow.webContents.send("twitch-auth", [false])
  } else {
    try {
      apiClient = new ApiClient({ authProvider });
      const chatClient = new ChatClient({ authProvider, channels: [channel] });
      await chatClient.connect();
      
	    const user = await apiClient.users.getUserByName(channel);
      channelId = user.id;

      mainWindow.webContents.send("twitch-auth", [true, channel])
      overlayWindow.show();

      let viewers = await getViewers(channelId)
      overlayWindow.webContents.send("viewerCount", viewers)
      initialFollowers = await getFollowers(channelId)
      overlayWindow.webContents.send("followerCount", 0)
      overlayWindow.webContents.send("followerTotal", initialFollowers)
      setInterval(async () => {
        let viewers = await getViewers(channelId)
        overlayWindow.webContents.send("viewerCount", viewers)
        let followers = await getFollowers(channelId)
        overlayWindow.webContents.send("followerCount", Math.max(followers-initialFollowers, 0))
        overlayWindow.webContents.send("followerTotal", followers)
        //let subs = await getSubs(channelId)
        //overlayWindow.webContents.send("subCount", subs)
      }, 5000)

      chatClient.onMessage((channel, user, message) => {
        // if (message === '!ping') {
        //   mainWindow.webContents.send("chat-event", ["!ping"])
        // }
      });

      chatClient.onSub((channel, user, subInfo) => {
        overlayWindow.webContents.send("sub", [user, subInfo, 0]);
        subCount++;
        overlayWindow.webContents.send("subCount", subCount)
      });
      chatClient.onResub((channel, user, subInfo) => {
        overlayWindow.webContents.send("sub", [user, subInfo, 1]);
        subCount++;
        overlayWindow.webContents.send("subCount", subCount)
      });
      chatClient.onSubGift((channel, user, subInfo) => {
        overlayWindow.webContents.send("sub", [user, subInfo, 2]);
        subCount++;
        overlayWindow.webContents.send("subCount", subCount)
      });

    } catch(e) {
      mainWindow.webContents.send("twitch-auth", [false])
    }
  }
}

async function isStreamLive(userName) {
  const user = await apiClient.users.getUserByName(userName);
  if (!user) {
    return false;
  }
  return await user.getStream() !== null;
}
async function getViewers(id) {
  let details = await apiClient.streams.getStreamByUserId(id)
  if(details !== null) {
    return details.viewers;
  } else {
    return "-"
  };
}
async function getFollowers(id) {
  let details = await apiClient.users.getFollows({ followedUser: id, limit: 1 })
  if(details !== null) {
    return details.total;
  } else {
    return "-"
  };
}
async function getSubs(id) {
  let details = await apiClient.subscriptions.getSubscriptions({ broadcaster_id: id, pagination: { limit: 1 } })
  if(details !== null) {
    return details.total;
  } else {
    return "-"
  };
}