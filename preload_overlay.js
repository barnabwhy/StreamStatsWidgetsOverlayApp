const {
  contextBridge,
  ipcRenderer
} = require("electron");

const fs = require('fs');
const path = require('path');

const mathjs = require("mathjs");
const uuidv4 = require("uuid").v4;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  "api", {
      send: (channel, data) => {
          // whitelist channels
          let validChannels = ["widgets-save", "widgets-cancel"];
          if (validChannels.includes(channel)) {
              ipcRenderer.send(channel, data);
          }
      },
      receive: (channel, func) => {
          let validChannels = ["startEdit", "endEdit", "twitch-auth", "viewerCount", "followerCount", "followerTotal", "subCount", "sub", "chat-event"];
          if (validChannels.includes(channel)) {
              // Deliberately strip event as it includes `sender` 
              ipcRenderer.on(channel, (event, ...args) => func(...args));
          }
      },
      getDefaultWidgets: () => {
        return new Promise((resolve, reject) => {
          ipcRenderer.invoke('get-default-widgets').then((data) => {
            resolve(data);
          })
        });
      },
      getWidgetsList: () => {
        return new Promise((resolve, reject) => {
          ipcRenderer.invoke('get-widgets-list').then((data) => {
            resolve(data);
          })
        });
      },
      getWidget: (name) => {
        return new Promise((resolve, reject) => {
          ipcRenderer.invoke('get-widget', name).then((data) => {
            try {
              if(data == undefined) resolve([false, null]);
              else resolve([true, data]);

            } catch(e) {
              resolve([false, null]);
            }
          })
        });
      },
      mathjs,
      uuidv4,
      readWidgetFile: (p) => {
        let rawdata = fs.readFileSync(path.resolve(__dirname, p));
        let widget = JSON.parse(rawdata);
        return widget;
      }
  }
);