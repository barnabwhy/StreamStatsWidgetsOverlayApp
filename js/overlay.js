window.api.receive("sub", arg => {
  switch(arg[2]) {
    case 0: // Sub
      break;
    case 1: // Resub
      break;
    case 2: // Gift
      break;
  }
  //document.querySelector("#subsWidget > .widget-text").innerText = numberWithCommas(Number(document.querySelector("#subsWidget > .widget-text").innerText)+1);
});

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const mathjs = window.api.mathjs;
const uuidv4 = window.api.uuidv4;

let widgets = {};
async function initialiseWidgets(defaults) {
  widgets = {};
  document.getElementById("widgets").innerHTML = "";
  if(defaults == undefined) defaults = await window.api.getDefaultWidgets();
  defaults.map(async w => {
    let data = await window.api.getWidget(w.name);
    if(data[0]) {
      let widget = data[1];
      if(w.pos) widget.pos = { ...widget.pos, ...w.pos };
      if(w.settings) w.settings.map(s => {
        let i = widget.settings.findIndex(e => e.name == s.name)
        if(s.val != undefined && i != -1) widget.settings[i].val = s.val; 
      })
      createWidget(data[1]);
    }
  })
}
initialiseWidgets();

async function addWidget(name) {
  let data = await window.api.getWidget(name);
  if(data[0])
    createWidget(data[1]);
}
function createWidget(widget) {
  let w = document.createElement("div");
  w.name = widget.name;
  w.classList.add("widget-"+widget.type);
  w.id = uuidv4();
  widgets[w.id] = widget;
  widgets[w.id].settings = widgets[w.id].settings.map(s => {
    if(s.val == undefined) s.val = s.default;
    return s
  });
  w.style.setProperty("--pos-x", (widget.pos.x || 0)+"px")
  w.style.setProperty("--pos-y", (widget.pos.y || 0)+"px")
  w.classList.add(`align-`+(widget.pos.align || "top-left"))
  widgets[w.id].opacity = 1;
  // if(widget.type == "group") {
    for(c in widget.widgets) {
      let cNode = createElementFromHTML(widget.widgets[c].html.join("\n"));
      for (e in widget.widgets[c].events) {
        let ev = widget.widgets[c].events[e];
        window.api.receive(ev.name, arg => {
            try {
            let settingRe = /\{.*?\}/gi;
            let mathRe = /\[.*?\]/gi;
            let settingReplace = ev.expression.replace(settingRe, match => { return widgets[w.id].settings.find(el => el.name === match.substr(1, match.length-2)).val || match })
            let val = settingReplace.replace(mathRe, match => { return mathjs.evaluate(match.substr(1, match.length-2), { x: arg }) })
            switch (ev.format) {
              case "commaNumber":
                val = numberWithCommas(val);
                break;
            }
            if(ev.attribute.startsWith("style.")) {
              cNode.querySelector(ev.querySelector).style[ev.attribute.split(".")[1]] = val;
            } else {
              cNode.querySelector(ev.querySelector)[ev.attribute] = val;
            }
          } catch(e) {}
        })
      }
      w.append(cNode);
    }
  // }
  Object.keys(widget.css).forEach(selector => {
    createCSSSelector(w, selector, widget.css[selector])
  });
  let settingsBtn = createElementFromHTML("<button class='widgetSettings material-icons'>settings</button>");
  let deleteBtn = createElementFromHTML("<button class='widgetDelete material-icons'>delete</button>");
  settingsBtn.addEventListener("click", () => { widgetSettings(w) });
  deleteBtn.addEventListener("click", () => { deleteWidget(w) });
  w.append(settingsBtn);
  w.append(deleteBtn);
  dragWidget(w);

  
  widgets[w.id].settings.forEach((s, i) => {
    initWidgetAttribute(w, s, i)
  });

  document.getElementById("widgets").append(w);
}

function deleteWidget(w) {
  delete widgets[w.id];
  w.remove()
}


async function setWidgetList() {
  let widgets = await window.api.getWidgetsList();
  document.querySelector("#widgetList > .widgets-list").innerHTML = "";
  widgets.forEach(w => {
    let adder = createElementFromHTML(`<div><p></p><button class="widget-add">Add</button></div>`);
    adder.querySelector("p").innerText = w[1];
    adder.querySelector("button").addEventListener("click", () => {
      closeWidgetList();
      addWidget(w[0]);
    });
    document.querySelector("#widgetList > .widgets-list").append(adder);
  });
}
document.getElementById("addWidget").addEventListener("click", openWidgetList);
function openWidgetList() {
  document.getElementById("widgetList").style.visibility = "visible";
  document.getElementById("widgetList").style.display = "block";
}
document.getElementById("widgets").addEventListener("click", closeWidgetList);
function closeWidgetList() {
  document.getElementById("widgetList").style.visibility = "hidden";
  document.getElementById("widgetList").style.display = "none";
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstChild; 
}

document.getElementById("editDone").addEventListener("click", () => {
  console.log(widgets)
  window.api.send("widgets-save", widgets);
  document.getElementById("editControls").style.visibility = "hidden";
  document.getElementById("editControls").style.display = "none";
  
  document.getElementById("settingsWindow").style.visibility = "hidden";
  document.getElementById("settingsWindow").style.display = "none";
  document.getElementById("widgetList").style.visibility = "hidden";
  document.getElementById("widgetList").style.display = "none";
})
document.getElementById("editCancel").addEventListener("click", () => {
  initialiseWidgets(Object.values(preEditWidgets));
  window.api.send("widgets-cancel");
  document.getElementById("editControls").style.visibility = "hidden";
  document.getElementById("editControls").style.display = "none";

  document.getElementById("settingsWindow").style.visibility = "hidden";
  document.getElementById("settingsWindow").style.display = "none";
  document.getElementById("widgetList").style.visibility = "hidden";
  document.getElementById("widgetList").style.display = "none";
})

document.addEventListener("keydown", (e) => {
  if(e.key != "Escape") return
  initialiseWidgets(Object.values(preEditWidgets));
  window.api.send("widgets-cancel");
  document.getElementById("editControls").style.visibility = "hidden";
  document.getElementById("editControls").style.display = "none";

  document.getElementById("settingsWindow").style.visibility = "hidden";
  document.getElementById("settingsWindow").style.display = "none";
  document.getElementById("widgetList").style.visibility = "hidden";
  document.getElementById("widgetList").style.display = "none";
})

setWidgetList()
let preEditWidgets = {};
window.api.receive("startEdit", arg => {
  preEditWidgets = JSON.parse(JSON.stringify(widgets));
  document.getElementById("editControls").style.visibility = "visible";
  document.getElementById("editControls").style.display = "initial";
  setWidgetList()
});

document.getElementById("closeSettings").addEventListener("click", () => {
  document.getElementById("settingsWindow").style.visibility = "hidden";
  document.getElementById("settingsWindow").style.display = "none";
});
document.getElementById("closeWidgetList").addEventListener("click", () => {
  document.getElementById("widgetList").style.visibility = "hidden";
  document.getElementById("widgetList").style.display = "none";
});

function widgetSettings(elem) {
  console.log(`Widget settings: ID="${elem.id}", Widget="${elem.name}"`)
  document.getElementById("settingsWindow").style.visibility = "visible";
  document.getElementById("settingsWindow").style.display = "initial";
  let widget = widgets[elem.id];
  document.querySelector("#settingsWindow > .setting-list").innerHTML = "";
  let opacitySetting = createElementFromHTML(`<div class="widget-setting"><span>Opacity</span><input type="range" value="${widget.opacity}" step="0.01" min="0" max="1"></div>`);
  var value = (opacitySetting.querySelector("input").value-opacitySetting.querySelector("input").min)/(opacitySetting.querySelector("input").max-opacitySetting.querySelector("input").min)*100;
  opacitySetting.querySelector("input").style.background = `linear-gradient(to right, #9146FF 0%, #9146FF ${value}%, #18181b ${value}%, #18181b 100%)`;
  opacitySetting.querySelector("input").addEventListener("input", () => {
    var value = (opacitySetting.querySelector("input").value-opacitySetting.querySelector("input").min)/(opacitySetting.querySelector("input").max-opacitySetting.querySelector("input").min)*100;
    opacitySetting.querySelector("input").style.background = `linear-gradient(to right, #9146FF 0%, #9146FF ${value}%, #18181b ${value}%, #18181b 100%)`;
    elem.childNodes.forEach(element => {
      if(!element.classList.contains("widgetSettings") && !element.classList.contains("widgetDelete")) element.style.opacity = opacitySetting.querySelector("input").value;
    });
    widgets[elem.id].opacity = opacitySetting.querySelector("input").value;
  });
  document.querySelector("#settingsWindow > .setting-list").append(opacitySetting);
  widget.settings.forEach((s, i) => {
    setWidgetAttribute(elem, s, i)
  });
  let xOffsetSetting = createElementFromHTML(`<div class="widget-setting"><span>X Offset</span><input type="number" value="${widget.pos.x}"></div>`);
  let yOffsetSetting = createElementFromHTML(`<div class="widget-setting"><span>Y Offset</span><input type="number" value="${widget.pos.y}"></div>`);
  let alignSetting = createElementFromHTML(`<div class="widget-setting"><span>Align</span><div class="align-buttons"><button class="material-icons" data-align="top-left">north_west</button><button class="material-icons" data-align="top-mid">north</button><button class="material-icons" data-align="top-right">north_east</button><br><button class="material-icons" data-align="mid-left">west</button><button class="material-icons" data-align="mid-mid">fiber_manual_record</button><button class="material-icons" data-align="mid-right">east</button><br><button class="material-icons" data-align="bottom-left">south_west</button><button class="material-icons" data-align="bottom-mid">south</button><button class="material-icons" data-align="bottom-right">south_east</button></div></div>`)
  alignSetting.querySelectorAll("button").forEach(b => {
    if(elem.classList.contains("align-"+b.getAttribute("data-align"))) b.classList.add("active");
    b.addEventListener("click", e => {
      let align = b.getAttribute("data-align");
      let pos = setWidgetAlign(elem, align);
      xOffsetSetting.querySelector("input").value = pos.x;
      yOffsetSetting.querySelector("input").value = pos.y;
      alignSetting.querySelector("button.active").classList.remove("active");
      b.classList.add("active");
    })
  });
  document.querySelector("#settingsWindow > .setting-list").append(alignSetting);
  xOffsetSetting.querySelector("input").addEventListener("input", e => {
    let cappedX = Math.min(Math.max(0, xOffsetSetting.querySelector("input").value), window.innerWidth-elem.clientWidth);
    xOffsetSetting.querySelector("input").value = cappedX;
    widgets[elem.id].pos.x = cappedX;
    elem.style.setProperty("--pos-x", cappedX + "px");
  })
  document.querySelector("#settingsWindow > .setting-list").append(xOffsetSetting);
  yOffsetSetting.querySelector("input").addEventListener("input", e => {
    let cappedY = Math.min(Math.max(0, yOffsetSetting.querySelector("input").value), window.innerHeight-elem.clientHeight);
    yOffsetSetting.querySelector("input").value = cappedY;
    widgets[elem.id].pos.y = cappedY;
    elem.style.setProperty("--pos-y", cappedY + "px");
  })
  posChange = function(id, pos) {
    if(id == elem.id) {
      xOffsetSetting.querySelector("input").value = pos.x
      yOffsetSetting.querySelector("input").value = pos.y
    }
  }
  document.querySelector("#settingsWindow > .setting-list").append(yOffsetSetting);
}
function setWidgetAttribute(elem, s, i) {
  let setting;
  if(s.type == "toggle") {
    setting = createElementFromHTML(`<div class="widget-setting"><span>${s.name}</span><label class="switch"><input type="checkbox" ${s.val ? "checked" : ""}><span class="slider round"></span></label></div>`);
    setting.querySelector("input").addEventListener("change", () => {
     widgets[elem.id].settings[i].val = setting.querySelector("input").checked;
     if(s.action == "elemVisibility") {
       if(setting.querySelector("input").checked) {
        elem.querySelector(s.querySelector).style.visibility = "visible";
        elem.querySelector(s.querySelector).style.display = "";
      } else {
        elem.querySelector(s.querySelector).style.visibility = "hidden";
        elem.querySelector(s.querySelector).style.display = "none";
      }
     }
   })
  }
  if(s.type == "number") {
    setting = createElementFromHTML(`<div class="widget-setting"><span>${s.name}</span><input type="number" value="${s.val}"></div>`);
    setting.querySelector("input").addEventListener("input", () => {
      widgets[elem.id].settings[i].val = setting.querySelector("input").value;
      if(s.action == "text") {
        elem.querySelector(s.querySelector).innerText = setting.querySelector("input").value;
      }
      if(s.action.startsWith("style.")) {
        console.log(s.action.split(".")[1])
        elem.querySelector(s.querySelector).style[s.action.split(".")[1]] = setting.querySelector("input").value + "px";
      }
    });
  }
  document.querySelector("#settingsWindow > .setting-list").append(setting)
}
function initWidgetAttribute(elem, s, i) {
  if(s.type == "toggle") {
    if(s.action == "elemVisibility") {
      if(widgets[elem.id].settings[i].val) {
        elem.querySelector(s.querySelector).style.visibility = "visible";
        elem.querySelector(s.querySelector).style.display = "";
      } else {
        elem.querySelector(s.querySelector).style.visibility = "hidden";
        elem.querySelector(s.querySelector).style.display = "none";
      }
    }
  }
  if(s.type == "number") {
    if(s.action == "text") {
      elem.querySelector(s.querySelector).innerText = widgets[elem.id].settings[i].val;
    }
  }
}

function setWidgetAlign(elmnt, align) {
  if(["top-left", "top-mid", "top-right", "mid-left", "mid-mid", "mid-right", "bottom-left", "bottom-mid", "bottom-right"].indexOf(align) == -1) return;

  let elemOffset = { x: elmnt.getBoundingClientRect().left, y: elmnt.getBoundingClientRect().top }

  let cappedY = elemOffset.y
  let cappedX = elemOffset.x

  switch (align) {
    case "top-mid":
      cappedX = cappedX - window.innerWidth/2 + elmnt.clientWidth/2;
      break;
    case "top-right":
      cappedX = window.innerWidth - cappedX - elmnt.clientWidth;
      break;
    case "mid-left":
      cappedY = cappedY - window.innerHeight/2 + elmnt.clientHeight/2;
      break;
    case "mid-mid":
      cappedY = cappedY - window.innerHeight/2 + elmnt.clientHeight/2;
      cappedX = cappedX - window.innerWidth/2 + elmnt.clientWidth/2;
      break;
    case "mid-right":
      cappedY = cappedY - window.innerHeight/2 + elmnt.clientHeight/2;
      cappedX = window.innerWidth - cappedX - elmnt.clientWidth;
      break;
    case "bottom-left":
      cappedY = window.innerHeight - cappedY - elmnt.clientHeight;
      break;
    case "bottom-mid":
      cappedY = window.innerHeight - cappedY - elmnt.clientHeight;
      cappedX = cappedX - window.innerWidth/2 + elmnt.clientWidth/2;
      break;
    case "bottom-right":
      cappedY = window.innerHeight - cappedY - elmnt.clientHeight;
      cappedX = window.innerWidth - cappedX - elmnt.clientWidth;
      break;
  }

  elmnt.style.setProperty("--pos-y", cappedY + "px");
  elmnt.style.setProperty("--pos-x", cappedX + "px");
  elmnt.classList.remove(...["align-top-left", "align-top-mid", "align-top-right", "align-mid-left", "align-mid-mid", "align-mid-right", "align-bottom-left", "align-bottom-mid", "align-bottom-right"]);
  elmnt.classList.add("align-"+align);
  widgets[elmnt.id].pos = { x: cappedX, y: cappedY, align };
  return { x: cappedX, y: cappedY };
}

let posChange = function(id, pos) {}

function dragWidget(elmnt) {
  let elemMouseOffset= { x: 0, y: 0 };
  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();

    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;

    elemMouseOffset = { x: e.clientX-elmnt.getBoundingClientRect().left, y: e.clientY-elmnt.getBoundingClientRect().top }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();

    let elemNewOffset = { x: e.clientX-elemMouseOffset.x, y: e.clientY-elemMouseOffset.y }
    let elemNewMargin = { x: Math.min(Math.max(0, elemNewOffset.x), window.innerWidth-elmnt.clientWidth), y: Math.min(Math.max(0, elemNewOffset.y), window.innerHeight-elmnt.clientHeight) }

    let cappedY = elemNewMargin.y
    let cappedX = elemNewMargin.x

    if(elmnt.classList.contains("align-top-mid")) {
      cappedX = cappedX - window.innerWidth/2 + elmnt.clientWidth/2;
    }
    if(elmnt.classList.contains("align-top-right")) {
      cappedX = window.innerWidth - cappedX - elmnt.clientWidth;
    }
    if(elmnt.classList.contains("align-mid-left")) {
      cappedY = cappedY - window.innerHeight/2 + elmnt.clientHeight/2;
    }
    if(elmnt.classList.contains("align-mid-mid")) {
      cappedY = cappedY - window.innerHeight/2 + elmnt.clientHeight/2;
      cappedX = cappedX - window.innerWidth/2 + elmnt.clientWidth/2;
    }
    if(elmnt.classList.contains("align-mid-right")) {
      cappedY = cappedY - window.innerHeight/2 + elmnt.clientHeight/2;
      cappedX = window.innerWidth - cappedX - elmnt.clientWidth;
    }
    if(elmnt.classList.contains("align-bottom-left")) {
      cappedY = window.innerHeight - cappedY - elmnt.clientHeight;
    }
    if(elmnt.classList.contains("align-bottom-mid")) {
      cappedY = window.innerHeight - cappedY - elmnt.clientHeight;
      cappedX = cappedX - window.innerWidth/2 + elmnt.clientWidth/2;
    }
    if(elmnt.classList.contains("align-bottom-right")) {
      cappedY = window.innerHeight - cappedY - elmnt.clientHeight;
      cappedX = window.innerWidth - cappedX - elmnt.clientWidth;
    }

    elmnt.style.setProperty("--pos-y", cappedY + "px");
    elmnt.style.setProperty("--pos-x", cappedX + "px");
    widgets[elmnt.id].pos = { x: cappedX, y: cappedY, align: widgets[elmnt.id].align };
    posChange(elmnt.id, { x: cappedX, y: cappedY });
  }

  function closeDragElement() {
    
    elmnt.style.transform = "";
    elmnt.style.top = "";
    elmnt.style.left = "";

    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function createCSSSelector (elem, selector, style) {
  if (!document.styleSheets) return;
  if (document.getElementsByTagName('head').length == 0) return;

  var styleSheet,mediaType;

  if (document.styleSheets.length > 0) {
    for (var i = document.styleSheets.length-1; i >= 0; i--) {
      if (document.styleSheets[i].disabled) 
        continue;
      var media = document.styleSheets[i].media;
      mediaType = typeof media;

      if (mediaType === 'string') {
        if (media === '' || (media.indexOf('screen') !== -1)) {
          styleSheet = document.styleSheets[i];
        }
      }
      else if (mediaType=='object') {
        if (media.mediaText === '' || (media.mediaText.indexOf('screen') !== -1)) {
          styleSheet = document.styleSheets[i];
        }
      }

      if (typeof styleSheet !== 'undefined') 
        break;
    }
  }

  if (typeof styleSheet === 'undefined') {
    var styleSheetElement = document.createElement('style');
    styleSheetElement.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(styleSheetElement);

    for (i = 0; i < document.styleSheets.length; i++) {
      if (document.styleSheets[i].disabled) {
        continue;
      }
      styleSheet = document.styleSheets[i];
    }

    mediaType = typeof styleSheet.media;
  }

  if (mediaType === 'string') {
    for (var i = 0, l = styleSheet.rules.length; i < l; i++) {
      if(styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase()==selector.toLowerCase()) {
        styleSheet.rules[i].style.cssText = style;
        return;
      }
    }
    styleSheet.addRule("#"+elem.id+" > " + selector.split(", ").join("#"+elem.id+" > "),style);
  }
  else if (mediaType === 'object') {
    var styleSheetLength = (styleSheet.cssRules) ? styleSheet.cssRules.length : 0;
    for (var i = 0; i < styleSheetLength; i++) {
      if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
        styleSheet.cssRules[i].style.cssText = style;
        return;
      }
    }
    styleSheet.insertRule("#"+elem.id+" > " + selector.split(", ").join("#"+elem.id+" > ") + '{' + style + '}', styleSheetLength);
  }
}