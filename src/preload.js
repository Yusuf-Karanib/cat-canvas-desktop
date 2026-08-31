const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("catCanvasDesktop", {
  getState: () => ipcRenderer.invoke("state:get"),
  toggleFavorite: (id) => ipcRenderer.invoke("favorite:toggle", id),
  addMedia: () => ipcRenderer.invoke("custom:add"),
  removeMedia: (id) => ipcRenderer.invoke("custom:remove", id),
  startDrawing: (id, displayId) => ipcRenderer.invoke("drawing:start", id, displayId),
  startSlideshow: (source, seconds, displayId) => ipcRenderer.invoke("slideshow:start", source, seconds, displayId),
  setStartWithWindows: (enabled) => ipcRenderer.invoke("startup:set", enabled),
  dismissTutorial: () => ipcRenderer.invoke("tutorial:dismiss"),
  setShortcut: (accelerator) => ipcRenderer.invoke("shortcut:set", accelerator),
  setShortcutRecording: (active) => ipcRenderer.invoke("shortcut:recording", active),
  clearAll: () => ipcRenderer.send("overlay:clear"),
  hidePicker: () => ipcRenderer.send("picker:hide"),
  setIgnoreMouse: (ignore) => ipcRenderer.send("overlay:ignore-mouse", Boolean(ignore)),
  drawingFinished: () => ipcRenderer.send("drawing:finished"),
  overlayEmpty: (empty) => ipcRenderer.send("overlay:empty", Boolean(empty)),
  moveToNextScreen: (payload) => ipcRenderer.invoke("overlay:move-next", payload),
  onStateChanged: (callback) => ipcRenderer.on("state:changed", (_event, state) => callback(state)),
  onStartDrawing: (callback) => ipcRenderer.on("drawing:begin", (_event, payload) => callback(payload)),
  onCancelDrawing: (callback) => ipcRenderer.on("drawing:cancel", callback),
  onClearAll: (callback) => ipcRenderer.on("overlay:clear", callback),
  onUnlockAll: (callback) => ipcRenderer.on("overlay:unlock-all", callback),
  onAddItem: (callback) => ipcRenderer.on("overlay:item-add", (_event, payload) => callback(payload))
});
