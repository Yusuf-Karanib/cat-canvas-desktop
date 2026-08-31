const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.disableHardwareAcceleration();
app.setPath("userData", path.join(app.getPath("temp"), "cat-canvas-picker-capture"));

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 410,
    height: 760,
    show: false,
    backgroundColor: "#fffaf1",
    webPreferences: {
      preload: path.join(__dirname, "capture-picker-preload.js"),
      additionalArguments: process.argv.includes("--tutorial") ? ["--tutorial"] : [],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  await window.loadFile(path.join(__dirname, "..", "src", "picker.html"));
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (process.argv.includes("--shortcut-test")) {
    await window.webContents.executeJavaScript('document.querySelector("#random-shortcut").click()');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await window.webContents.executeJavaScript('document.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true, altKey: true, bubbles: true, cancelable: true }))');
    await new Promise((resolve) => setTimeout(resolve, 200));
    const customLabel = await window.webContents.executeJavaScript('document.querySelector("#random-shortcut").textContent');
    if (customLabel !== "Ctrl+Alt+J") throw new Error(`Shortcut recording failed: ${customLabel}`);
    await window.webContents.executeJavaScript('document.querySelector("#reset-shortcut").click()');
    await new Promise((resolve) => setTimeout(resolve, 200));
    const resetLabel = await window.webContents.executeJavaScript('document.querySelector("#random-shortcut").textContent');
    if (resetLabel !== "Ctrl+Shift+K") throw new Error(`Shortcut reset failed: ${resetLabel}`);
    console.log("Shortcut recording and Reset passed.");
  }
  const image = await window.webContents.capturePage();
  const filename = process.argv.includes("--tutorial") ? "tutorial.png" : "picker.png";
  fs.writeFileSync(path.join(__dirname, "..", "docs", filename), image.toPNG());
  window.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
