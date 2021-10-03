const {
  contextBridge,
  ipcRenderer
} = require("electron");

const fs = require('fs');
const path = require('path');

const mathjs = require("mathjs");
const uuidv4 = require("uuid").v4;
const openExternal = require('electron').shell.openExternal;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  "api", {
      send: (channel, data) => {
          // whitelist channels
          let validChannels = ["reload", "minimize", "close", "twitch-auth", "overlay-toggle", "overlay-reload", "widget-edit"];
          if (validChannels.includes(channel)) {
              ipcRenderer.send(channel, data);
          }
      },
      receive: (channel, func) => {
          let validChannels = ["startEdit", "endEdit", "twitch-auth", "viewerCount", "followerCount", "followerTotal", "subCount", "sub", "chat-event"];
          if (validChannels.includes(channel)) {
              // Deliberately strip event as it includes `sender` 
              ipcRenderer.on(channel, (event, arg) => func(arg));
          }
      },
      mathjs,
      uuidv4,
      openExternal,
      readWidgetFile: (p) => {
        let rawdata = fs.readFileSync(path.resolve(__dirname, p));
        let widget = JSON.parse(rawdata);
        return widget;
      }
  }
);