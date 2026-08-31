const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const cats = require("../src/cats");
const { shapeFor, suitableCats, randomSuitable, wrapIndex, slideshowDelayMs, slideshowChoices, nextDisplayId } = require("../src/media-utils");
const { loginLaunchOptions } = require("../src/startup-utils");
const { DEFAULT_SHORTCUT, isValidShortcut, normalizeShortcut, shortcutLabel } = require("../src/shortcut-utils");

test("the built-in pack contains 12 stills and 12 GIFs", () => {
  assert.equal(cats.length, 24);
  assert.equal(cats.filter((cat) => cat.kind === "still").length, 12);
  assert.equal(cats.filter((cat) => cat.kind === "gif").length, 12);
});

test("every built-in media file exists", () => {
  for (const cat of cats) {
    assert.equal(fs.existsSync(path.join(__dirname, "..", "assets", "cats", cat.file)), true, cat.file);
  }
});

test("box shapes are recognized", () => {
  assert.equal(shapeFor(400, 200), "wide");
  assert.equal(shapeFor(100, 300), "tall");
  assert.equal(shapeFor(250, 250), "square");
});

test("large wide boxes prefer still media", () => {
  const choices = suitableCats(cats, 900, 300);
  assert.ok(choices.length > 0);
  assert.ok(choices.every((cat) => cat.kind === "still"));
});

test("replacement excludes the current media when alternatives exist", () => {
  const chosen = randomSuitable(cats, 300, 300, "cat-18", () => 0);
  assert.notEqual(chosen.id, "cat-18");
});

test("slideshow positions wrap forward and backward", () => {
  assert.equal(wrapIndex(4, 4), 0);
  assert.equal(wrapIndex(-1, 4), 3);
  assert.equal(wrapIndex(2, 4), 2);
});

test("slideshow speed accepts safe choices and defaults to 10 seconds", () => {
  assert.equal(slideshowDelayMs(5), 5000);
  assert.equal(slideshowDelayMs("30"), 30000);
  assert.equal(slideshowDelayMs(7), 10000);
});

test("slideshows can use favorites, custom media, GIFs, or everything", () => {
  const catalog = [
    { id: "still", kind: "still" },
    { id: "gif", kind: "gif" },
    { id: "mine", kind: "still", custom: true }
  ];
  assert.deepEqual(slideshowChoices(catalog, ["still", "gif"], "favorites", () => 0).map((item) => item.id).sort(), ["gif", "still"]);
  assert.deepEqual(slideshowChoices(catalog, [], "mine", () => 0).map((item) => item.id), ["mine"]);
  assert.deepEqual(slideshowChoices(catalog, [], "gifs", () => 0).map((item) => item.id), ["gif"]);
  assert.equal(slideshowChoices(catalog, [], "random", () => 0).length, 3);
});

test("moving to the next screen wraps back to the first screen", () => {
  const displays = ["left", "main", "right"];
  assert.equal(nextDisplayId(displays, "left"), "main");
  assert.equal(nextDisplayId(displays, "right"), "left");
  assert.equal(nextDisplayId(["main"], "main"), "main");
});

test("Windows startup uses the original portable file instead of its temporary copy", () => {
  assert.deepEqual(loginLaunchOptions({
    isPackaged: true,
    portableExecutableFile: "C:\\Apps\\Cat Canvas.exe",
    execPath: "C:\\Temp\\Cat Canvas.exe",
    appPath: "C:\\project"
  }), {
    path: "C:\\Apps\\Cat Canvas.exe",
    args: ["--hidden"]
  });
});

test("development startup includes the project path", () => {
  assert.deepEqual(loginLaunchOptions({
    isPackaged: false,
    execPath: "C:\\Electron\\electron.exe",
    appPath: "C:\\project"
  }), {
    path: "C:\\Electron\\electron.exe",
    args: ["C:\\project", "--hidden"]
  });
});

test("the picker includes a reusable first-time guide", () => {
  const picker = fs.readFileSync(path.join(__dirname, "..", "src", "picker.html"), "utf8");
  assert.match(picker, /id="tutorial"/);
  assert.match(picker, /id="show-tutorial"/);
  assert.match(picker, /id="tutorial-shortcut"/);
});

test("custom Random shortcuts require Ctrl or Alt plus a supported key", () => {
  assert.equal(isValidShortcut("CommandOrControl+Alt+Shift+Q"), true);
  assert.equal(isValidShortcut("Alt+F12"), true);
  assert.equal(isValidShortcut("CommandOrControl+num7"), true);
  assert.equal(isValidShortcut("Shift+K"), false);
  assert.equal(isValidShortcut("CommandOrControl"), false);
  assert.equal(normalizeShortcut("not-a-shortcut"), DEFAULT_SHORTCUT);
  assert.equal(shortcutLabel("CommandOrControl+Alt+K", "win32"), "Ctrl+Alt+K");
  assert.equal(shortcutLabel(DEFAULT_SHORTCUT, "darwin"), "Cmd+Shift+K");
});
