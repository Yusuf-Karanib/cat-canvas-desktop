const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("catCanvasDesktop", {
  getState: () => ipcRenderer.invoke("state:get"),
  toggleFavorite: (id) => ipcRenderer.invoke("favorite:toggle", id),
  addMedia: () => ipcRenderer.invoke("custom:add"),
  removeMedia: (id) => ipcRenderer.invoke("custom:remove", id),
  startDrawing: (id, displayId) => ipcRenderer.invoke("drawing:start", id, displayId),
  startSlideshow: (seconds, displayId) => ipcRenderer.invoke("slideshow:start", seconds, displayId),
  clearAll: () => ipcRenderer.send("overlay:clear"),
  hidePicker: () => ipcRenderer.send("picker:hide"),
  setIgnoreMouse: (ignore) => ipcRenderer.send("overlay:ignore-mouse", Boolean(ignore)),
  drawingFinished: () => ipcRenderer.send("drawing:finished"),
  overlayEmpty: (empty) => ipcRenderer.send("overlay:empty", Boolean(empty)),
  onStateChanged: (callback) => ipcRenderer.on("state:changed", (_event, state) => callback(state)),
  onStartDrawing: (callback) => ipcRenderer.on("drawing:begin", (_event, payload) => callback(payload)),
  onClearAll: (callback) => ipcRenderer.on("overlay:clear", callback),
  onUnlockAll: (callback) => ipcRenderer.on("overlay:unlock-all", callback)
});
