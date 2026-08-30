const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const cats = require("./cats");

const SHORTCUT = "CommandOrControl+Shift+K";
const VALID_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_CUSTOM_BYTES = 12 * 1024 * 1024;

let pickerWindow;
let overlayWindow;
let tray;
let overlayReady = false;
let overlayIsEmpty = true;
let quitting = false;
let settings = { favorites: [], customMedia: [] };

function log(message) {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(path.join(app.getPath("userData"), "cat-canvas-desktop.log"), line);
  } catch {
    // The app can continue even if Windows blocks the local log file.
  }
}

process.on("uncaughtException", (error) => log(`Uncaught error: ${error.stack || error.message}`));
process.on("unhandledRejection", (error) => log(`Unhandled rejection: ${error?.stack || error}`));

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    settings = {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((id) => typeof id === "string") : [],
      customMedia: Array.isArray(parsed.customMedia)
        ? parsed.customMedia.filter((item) => typeof item?.path === "string" && fs.existsSync(item.path))
        : []
    };
  } catch {
    settings = { favorites: [], customMedia: [] };
  }
}

function saveSettings() {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
}

function mediaUrl(filePath) {
  return pathToFileURL(filePath).href;
}

function builtInMedia() {
  return cats.map((cat) => ({
    ...cat,
    url: mediaUrl(path.join(app.getAppPath(), "assets", "cats", cat.file))
  }));
}

function customMedia() {
  return settings.customMedia
    .filter((item) => fs.existsSync(item.path))
    .map((item) => ({ ...item, url: mediaUrl(item.path), custom: true }));
}

function publicState() {
  return {
    cats: [...builtInMedia(), ...customMedia()],
    favorites: settings.favorites,
    shortcut: process.platform === "darwin" ? "Cmd+Shift+K" : "Ctrl+Shift+K"
  };
}

function broadcastState() {
  if (pickerWindow && !pickerWindow.isDestroyed()) pickerWindow.webContents.send("state:changed", publicState());
}

function createPickerWindow() {
  pickerWindow = new BrowserWindow({
    width: 410,
    height: 680,
    minWidth: 370,
    minHeight: 560,
    show: false,
    title: "Cat Canvas Desktop",
    icon: path.join(app.getAppPath(), "assets", "icons", "icon-128.png"),
    backgroundColor: "#fffaf1",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  pickerWindow.loadFile(path.join(__dirname, "picker.html")).catch((error) => log(`Picker failed to load: ${error.stack || error.message}`));
  pickerWindow.once("ready-to-show", () => {
    log("Picker is ready to show.");
    showPicker();
  });
  pickerWindow.on("show", () => log("Picker window shown."));
  pickerWindow.webContents.on("render-process-gone", (_event, details) => log(`Picker renderer stopped: ${details.reason}`));
  pickerWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      pickerWindow.hide();
    }
  });
}

function createOverlayWindow() {
  const bounds = screen.getPrimaryDisplay().bounds;
  overlayWindow = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  overlayWindow.setAlwaysOnTop(true, "floating");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));
  overlayWindow.webContents.once("did-finish-load", () => {
    overlayReady = true;
  });
  overlayWindow.on("closed", () => {
    overlayReady = false;
    overlayWindow = undefined;
  });
}

function showPicker() {
  if (!pickerWindow || pickerWindow.isDestroyed()) return;
  pickerWindow.show();
  pickerWindow.focus();
  log(`Show picker requested. Visible: ${pickerWindow.isVisible()}.`);
}

function sendToOverlay(channel, payload) {
  if (!overlayReady) {
    overlayWindow.webContents.once("did-finish-load", () => overlayWindow.webContents.send(channel, payload));
  } else {
    overlayWindow.webContents.send(channel, payload);
  }
}

function startDrawing(id = "random") {
  const available = publicState().cats;
  if (id !== "random" && !available.some((cat) => cat.id === id)) id = "random";
  overlayWindow.show();
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.focus();
  sendToOverlay("drawing:begin", { requestedId: id, cats: available });
  pickerWindow.hide();
}

function createTray() {
  tray = new Tray(path.join(app.getAppPath(), "assets", "icons", "icon-32.png"));
  tray.setToolTip("Cat Canvas Desktop");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Cat Picker", click: showPicker },
    { label: "Draw Random Cat", accelerator: SHORTCUT, click: () => startDrawing("random") },
    { type: "separator" },
    { label: "Unlock All Overlays", click: () => sendToOverlay("overlay:unlock-all") },
    { label: "Clear All Overlays", click: () => sendToOverlay("overlay:clear") },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on("click", showPicker);
}

function shapeForSize(width, height) {
  const ratio = width / height;
  if (ratio >= 1.2) return "wide";
  if (ratio <= 0.9) return "tall";
  return "square";
}

async function addCustomMedia() {
  const result = await dialog.showOpenDialog(pickerWindow, {
    title: "Add your image or GIF",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Images and GIFs", extensions: ["jpg", "jpeg", "png", "webp", "gif"] }]
  });
  if (result.canceled) return { added: 0, message: "Nothing added." };

  let added = 0;
  for (const filePath of result.filePaths) {
    const extension = path.extname(filePath).toLowerCase();
    const stat = fs.statSync(filePath);
    if (!VALID_EXTENSIONS.has(extension) || stat.size > MAX_CUSTOM_BYTES) continue;
    const size = nativeImage.createFromPath(filePath).getSize();
    settings.customMedia.push({
      id: `custom-${Date.now()}-${added}`,
      name: path.basename(filePath, extension).slice(0, 32) || "My media",
      path: filePath,
      shape: size.width && size.height ? shapeForSize(size.width, size.height) : "square",
      kind: extension === ".gif" ? "gif" : "still"
    });
    added += 1;
  }
  saveSettings();
  broadcastState();
  return {
    added,
    message: added ? `${added} item${added === 1 ? "" : "s"} added locally.` : "Use an image or GIF under 12 MB."
  };
}

ipcMain.handle("state:get", () => publicState());
ipcMain.handle("favorite:toggle", (_event, id) => {
  if (typeof id !== "string" || !publicState().cats.some((cat) => cat.id === id)) return publicState();
  const favorites = new Set(settings.favorites);
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  settings.favorites = [...favorites];
  saveSettings();
  broadcastState();
  return publicState();
});
ipcMain.handle("custom:add", addCustomMedia);
ipcMain.handle("custom:remove", (_event, id) => {
  settings.customMedia = settings.customMedia.filter((item) => item.id !== id);
  settings.favorites = settings.favorites.filter((favorite) => favorite !== id);
  saveSettings();
  broadcastState();
  return publicState();
});
ipcMain.handle("drawing:start", (_event, id) => {
  startDrawing(typeof id === "string" ? id : "random");
  return true;
});
ipcMain.on("picker:hide", () => pickerWindow.hide());
ipcMain.on("overlay:clear", () => sendToOverlay("overlay:clear"));
ipcMain.on("overlay:ignore-mouse", (_event, ignore) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
});
ipcMain.on("drawing:finished", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.setIgnoreMouseEvents(true, { forward: true });
});
ipcMain.on("overlay:empty", (_event, empty) => {
  overlayIsEmpty = Boolean(empty);
  if (overlayIsEmpty && overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
});

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  log("Another instance is already running.");
  app.quit();
}
else {
  app.on("second-instance", showPicker);
  app.whenReady().then(() => {
    log("Starting Cat Canvas Desktop.");
    app.setAppUserModelId("com.yusufkaranib.catcanvasdesktop");
    loadSettings();
    log("Creating picker.");
    createPickerWindow();
    log("Creating overlay.");
    createOverlayWindow();
    log("Creating tray.");
    createTray();
    globalShortcut.register(SHORTCUT, () => startDrawing("random"));
    log("Cat Canvas Desktop is ready.");
  }).catch((error) => {
    log(`Startup failed: ${error.stack || error.message}`);
    dialog.showErrorBox("Cat Canvas Desktop could not start", "See cat-canvas-desktop.log in the app settings folder for details.");
    app.quit();
  });
}

app.on("activate", showPicker);
app.on("before-quit", () => { quitting = true; });
app.on("will-quit", () => globalShortcut.unregisterAll());
