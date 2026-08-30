const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 410,
    height: 760,
    show: false,
    backgroundColor: "#fffaf1",
    webPreferences: {
      preload: path.join(__dirname, "capture-picker-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  await window.loadFile(path.join(__dirname, "..", "src", "picker.html"));
  await new Promise((resolve) => setTimeout(resolve, 800));
  const image = await window.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, "..", "docs", "picker.png"), image.toPNG());
  window.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
