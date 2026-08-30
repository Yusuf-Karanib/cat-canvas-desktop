const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const cats = require("./cats");
const { slideshowChoices, slideshowDelayMs } = require("./media-utils");

const SHORTCUT = "CommandOrControl+Shift+K";
const VALID_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_CUSTOM_BYTES = 12 * 1024 * 1024;

let pickerWindow;
const overlayWindows = new Map();
let tray;
let quitting = false;
let activeDrawingRecord;
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
  const displays = screen.getAllDisplays().sort((left, right) => left.bounds.x - right.bounds.x || left.bounds.y - right.bounds.y);
  const primaryId = String(screen.getPrimaryDisplay().id);
  const pickerDisplay = pickerWindow && !pickerWindow.isDestroyed()
    ? screen.getDisplayMatching(pickerWindow.getBounds())
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return {
    cats: [...builtInMedia(), ...customMedia()],
    favorites: settings.favorites,
    shortcut: process.platform === "darwin" ? "Cmd+Shift+K" : "Ctrl+Shift+K",
    screens: displays.map((display, index) => ({
      id: String(display.id),
      name: `Screen ${index + 1}${String(display.id) === primaryId ? " (Main)" : ""} · ${display.bounds.width}×${display.bounds.height}`
    })),
    currentScreenId: String(pickerDisplay.id)
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

function createOverlayWindow(display) {
  const displayId = String(display.id);
  const existing = overlayWindows.get(displayId);
  if (existing && !existing.window.isDestroyed()) return existing;

  const overlayWindow = new BrowserWindow({
    ...display.bounds,
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
  const record = { window: overlayWindow, ready: false };
  overlayWindows.set(displayId, record);
  log(`Created overlay for screen ${displayId} at ${display.bounds.x},${display.bounds.y} (${display.bounds.width}x${display.bounds.height}).`);
  overlayWindow.setAlwaysOnTop(true, "screen-saver", 1);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));
  overlayWindow.webContents.once("did-finish-load", () => {
    record.ready = true;
  });
  overlayWindow.on("closed", () => {
    if (activeDrawingRecord === record) {
      activeDrawingRecord = undefined;
      globalShortcut.unregister("Escape");
    }
    if (overlayWindows.get(displayId) === record) overlayWindows.delete(displayId);
  });
  return record;
}

function createOverlayWindows() {
  for (const display of screen.getAllDisplays()) createOverlayWindow(display);
}

function showPicker() {
  if (!pickerWindow || pickerWindow.isDestroyed()) return;
  pickerWindow.show();
  pickerWindow.focus();
  log(`Show picker requested. Visible: ${pickerWindow.isVisible()}.`);
}

function sendToOverlay(record, channel, payload) {
  if (!record || record.window.isDestroyed()) return;
  if (!record.ready) {
    record.window.webContents.once("did-finish-load", () => record.window.webContents.send(channel, payload));
  } else {
    record.window.webContents.send(channel, payload);
  }
}

function broadcastToOverlays(channel, payload) {
  for (const record of overlayWindows.values()) sendToOverlay(record, channel, payload);
}

function targetDisplay(displayId) {
  const chosen = screen.getAllDisplays().find((display) => String(display.id) === String(displayId));
  return chosen || screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function startDrawing(id = "random", slideshow = [], slideshowDelay = 10000, displayId) {
  const available = publicState().cats;
  if (id !== "random" && id !== "slideshow" && !available.some((cat) => cat.id === id)) id = "random";
  const display = targetDisplay(displayId);
  log(`Starting ${id} drawing on screen ${display.id}.`);
  const record = createOverlayWindow(display);
  record.window.setBounds(display.bounds);
  record.window.setAlwaysOnTop(true, "screen-saver", 1);
  record.window.setIgnoreMouseEvents(false);
  record.window.show();
  record.window.moveTop();
  record.window.focus();
  record.window.webContents.focus();
  activeDrawingRecord = record;
  globalShortcut.unregister("Escape");
  if (!globalShortcut.register("Escape", () => sendToOverlay(activeDrawingRecord, "drawing:cancel"))) {
    log("Could not register Escape while drawing; the focused-window Escape key remains available.");
  }
  sendToOverlay(record, "drawing:begin", { requestedId: id, cats: available, slideshow, slideshowDelay });
  if (pickerWindow && !pickerWindow.isDestroyed()) pickerWindow.hide();
}

function createTray() {
  tray = new Tray(path.join(app.getAppPath(), "assets", "icons", "icon-32.png"));
  tray.setToolTip("Cat Canvas Desktop");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Cat Picker", click: showPicker },
    { label: "Draw Random Cat", accelerator: SHORTCUT, click: () => startDrawing("random") },
    { type: "separator" },
    { label: "Unlock All Overlays", click: () => broadcastToOverlays("overlay:unlock-all") },
    { label: "Clear All Overlays", click: () => broadcastToOverlays("overlay:clear") },
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

async function startSlideshow(_event, source, seconds, displayId) {
  const state = publicState();
  const safeSource = ["random", "favorites", "mine", "gifs"].includes(source) ? source : "random";
  const items = slideshowChoices(state.cats, state.favorites, safeSource);
  if (items.length < 2) {
    const message = safeSource === "favorites"
      ? "Favorite at least 2 items first."
      : safeSource === "mine"
        ? "Add at least 2 of your own items first."
        : "This slideshow needs at least 2 items.";
    return { started: false, message };
  }
  startDrawing("slideshow", items, slideshowDelayMs(seconds), displayId);
  return { started: true, count: items.length, message: `Slideshow ready with ${items.length} items.` };
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
ipcMain.handle("slideshow:start", startSlideshow);
ipcMain.handle("custom:remove", (_event, id) => {
  settings.customMedia = settings.customMedia.filter((item) => item.id !== id);
  settings.favorites = settings.favorites.filter((favorite) => favorite !== id);
  saveSettings();
  broadcastState();
  return publicState();
});
ipcMain.handle("drawing:start", (_event, id, displayId) => {
  startDrawing(typeof id === "string" ? id : "random", [], 10000, displayId);
  return true;
});
ipcMain.on("picker:hide", () => pickerWindow.hide());
ipcMain.on("overlay:clear", () => broadcastToOverlays("overlay:clear"));
ipcMain.on("overlay:ignore-mouse", (event, ignore) => {
  const overlayWindow = BrowserWindow.fromWebContents(event.sender);
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
});
ipcMain.on("drawing:finished", (event) => {
  const overlayWindow = BrowserWindow.fromWebContents(event.sender);
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  if (activeDrawingRecord?.window === overlayWindow) {
    activeDrawingRecord = undefined;
    globalShortcut.unregister("Escape");
  }
});
ipcMain.on("overlay:empty", (event, empty) => {
  const overlayWindow = BrowserWindow.fromWebContents(event.sender);
  if (Boolean(empty) && overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
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
    createOverlayWindows();
    screen.on("display-added", (_event, display) => {
      createOverlayWindow(display);
      broadcastState();
    });
    screen.on("display-removed", (_event, display) => {
      const record = overlayWindows.get(String(display.id));
      if (record && !record.window.isDestroyed()) record.window.destroy();
      overlayWindows.delete(String(display.id));
      broadcastState();
    });
    screen.on("display-metrics-changed", (_event, display) => {
      const record = overlayWindows.get(String(display.id));
      if (record && !record.window.isDestroyed()) record.window.setBounds(display.bounds);
      broadcastState();
    });
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
