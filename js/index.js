document.getElementById("appUpdate").addEventListener("click", e => {
  window.api.send("update-and-restart");
})
window.api.receive("update-available", arg => {
  document.getElementById("appUpdate").style.visibility = "visible";
  document.getElementById("appUpdate").style.display = "inline-block";
});

document.getElementById("windowReload").addEventListener("click", e => {
  window.api.send("reload");
})
document.getElementById("windowMinimize").addEventListener("click", e => {
  window.api.send("minimize");
})
document.getElementById("windowClose").addEventListener("click", e => {
  window.api.send("close");
})

document.getElementById("connectButton").addEventListener("click", e => {
  let channelInput = document.getElementById("channelInput");
  let channelInputError = document.getElementById("channelInputError");
  if(channelInput.value.trim() == "") {
    channelInputError.style.visibility = "visible";
    channelInputError.style.display = "block";
  } else {
    channelInputError.style.visibility = "hidden";
    channelInputError.style.display = "none";

    window.api.send("twitch-auth", channelInput.value.trim());
  }
})
window.api.receive("twitch-auth", arg => {
  let connectDiv = document.getElementById("connect");
  let controlPanelDiv = document.getElementById("controlPanel");
  if(arg[0]) {
    connectDiv.style.visibility = "hidden";
    connectDiv.style.display = "none";

    controlPanelDiv.style.visibility = "visible";
    controlPanelDiv.style.display = "block";
    document.getElementById("trackedChannel").innerText = arg[1];
  } else {
    channelInputError.innerText = "Connection failed."
    channelInputError.style.visibility = "visible";
    channelInputError.style.display = "block";
  }
})

window.api.receive("chat-event", arg => {

});

document.getElementById("toggleOverlay").addEventListener("click", e => {
  window.api.send("overlay-toggle");
})
document.getElementById("reloadOverlay").addEventListener("click", e => {
  window.api.send("overlay-reload");
})
document.getElementById("editWidgets").addEventListener("click", e => {
  window.api.send("widget-edit");
})


document.getElementById("openChannelButton").addEventListener("click", e => {
  window.api.openExternal(`http://twitch.tv/${document.getElementById("trackedChannel").innerText}`)
});


window.api.receive("startEdit", arg => {
  document.body.style.opacity = 0.25;
});
window.api.receive("endEdit", arg => {
  document.body.style.opacity = 1;
});