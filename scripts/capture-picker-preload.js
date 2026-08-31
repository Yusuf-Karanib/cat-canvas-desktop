const { contextBridge } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const cats = require("../src/cats");

const state = {
  cats: cats.map((cat) => ({
    ...cat,
    url: pathToFileURL(path.join(__dirname, "..", "assets", "cats", cat.file)).href
  })),
  favorites: [cats[0].id, cats[1].id, cats[2].id],
  shortcut: "Ctrl+Shift+K",
  shortcutAccelerator: "CommandOrControl+Shift+K",
  shortcutChoices: [
    { accelerator: "CommandOrControl+Shift+K", label: "Ctrl+Shift+K" },
    { accelerator: "CommandOrControl+Shift+C", label: "Ctrl+Shift+C" },
    { accelerator: "CommandOrControl+Alt+K", label: "Ctrl+Alt+K" },
    { accelerator: "Alt+Shift+K", label: "Alt+Shift+K" }
  ],
  startWithWindows: false,
  tutorialSeen: !process.argv.includes("--tutorial"),
  screens: [
    { id: "left", name: "Screen 1 · 1536×864" },
    { id: "main", name: "Screen 2 (Main) · 1920×1080" },
    { id: "right", name: "Screen 3 · 1280×1024" }
  ],
  currentScreenId: "main"
};

contextBridge.exposeInMainWorld("catCanvasDesktop", {
  getState: async () => state,
  toggleFavorite: async () => state,
  addMedia: async () => ({ added: 0, message: "Demo" }),
  removeMedia: async () => state,
  startDrawing: async () => true,
  startSlideshow: async () => ({ started: true, message: "Demo" }),
  setStartWithWindows: async () => ({ state, message: "Demo" }),
  dismissTutorial: async () => state,
  setShortcut: async (accelerator) => {
    state.shortcutAccelerator = accelerator;
    state.shortcut = state.shortcutChoices.find((choice) => choice.accelerator === accelerator)?.label || state.shortcut;
    return { state, message: "Demo" };
  },
  clearAll: () => {},
  hidePicker: () => {},
  onStateChanged: () => {}
});
