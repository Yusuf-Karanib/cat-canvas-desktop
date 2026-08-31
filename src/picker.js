const grid = document.querySelector("#cat-grid");
const empty = document.querySelector("#empty");
const status = document.querySelector("#status");
const targetScreen = document.querySelector("#target-screen");
const startupToggle = document.querySelector("#start-with-windows");
const tutorial = document.querySelector("#tutorial");
const closeTutorial = document.querySelector("#close-tutorial");
const shortcutButton = document.querySelector("#random-shortcut");
const resetShortcut = document.querySelector("#reset-shortcut");
const tutorialShortcut = document.querySelector("#tutorial-shortcut");
let state = { cats: [], favorites: [], shortcut: "Ctrl+Shift+K", shortcutAccelerator: "CommandOrControl+Shift+K", screens: [], currentScreenId: "", startWithWindows: false, tutorialSeen: false };
let currentFilter = "all";
let recordingShortcut = false;

function showTutorial() {
  tutorial.hidden = false;
  closeTutorial.focus();
}

async function hideTutorial() {
  tutorial.hidden = true;
  if (!state.tutorialSeen) state = await window.catCanvasDesktop.dismissTutorial();
  document.querySelector("#show-tutorial").focus();
}

function renderScreens() {
  const previous = targetScreen.value;
  targetScreen.replaceChildren();
  for (const screen of state.screens) {
    const option = document.createElement("option");
    option.value = screen.id;
    option.textContent = screen.name;
    targetScreen.append(option);
  }
  targetScreen.value = state.screens.some((screen) => screen.id === previous) ? previous : state.currentScreenId;
}

function renderShortcut() {
  if (!recordingShortcut) shortcutButton.textContent = state.shortcut;
  resetShortcut.disabled = state.shortcutAccelerator === "CommandOrControl+Shift+K";
  tutorialShortcut.replaceChildren();
  const keys = state.shortcut.split("+");
  keys.forEach((key, index) => {
    if (index) tutorialShortcut.append(" + ");
    const keycap = document.createElement("kbd");
    keycap.textContent = key;
    tutorialShortcut.append(keycap);
  });
}

function acceleratorKey(event) {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(event.code)) return event.code;
  if (/^Numpad[0-9]$/.test(event.code)) return `num${event.code.slice(6)}`;
  const keys = {
    Space: "Space", Tab: "Tab", CapsLock: "Capslock", NumLock: "Numlock", ScrollLock: "Scrolllock",
    Backspace: "Backspace", Delete: "Delete", Insert: "Insert", Enter: "Enter",
    ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
    Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown", PrintScreen: "PrintScreen",
    NumpadDecimal: "numdec", NumpadAdd: "numadd", NumpadSubtract: "numsub", NumpadMultiply: "nummult", NumpadDivide: "numdiv",
    Semicolon: ";", Equal: "=", Comma: ",", Minus: "-", Period: ".", Slash: "/", Backquote: "`",
    BracketLeft: "[", BracketRight: "]", Backslash: "\\"
  };
  return keys[event.code] || "";
}

function shortcutFromEvent(event) {
  const key = acceleratorKey(event);
  if (!key || (!event.ctrlKey && !event.metaKey && !event.altKey)) return "";
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push("CommandOrControl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(key);
  return parts.join("+");
}

async function stopShortcutRecording(message = "") {
  if (!recordingShortcut) return;
  recordingShortcut = false;
  await window.catCanvasDesktop.setShortcutRecording(false);
  shortcutButton.classList.remove("recording");
  shortcutButton.textContent = state.shortcut;
  if (message) status.textContent = message;
}

async function beginShortcutRecording() {
  if (recordingShortcut) return;
  await window.catCanvasDesktop.setShortcutRecording(true);
  recordingShortcut = true;
  shortcutButton.classList.add("recording");
  shortcutButton.textContent = "Press keys…";
  status.className = "status";
  status.textContent = "Press Ctrl or Alt with another key. Esc cancels.";
  shortcutButton.focus();
}

function visibleCats() {
  const favorites = new Set(state.favorites);
  return state.cats.filter((cat) => {
    if (currentFilter === "favorites") return favorites.has(cat.id);
    if (currentFilter === "mine") return cat.custom;
    if (currentFilter === "gif") return cat.kind === "gif";
    return true;
  });
}

function render() {
  renderScreens();
  renderShortcut();
  startupToggle.checked = Boolean(state.startWithWindows);
  const cats = visibleCats();
  const favorites = new Set(state.favorites);
  grid.replaceChildren();
  empty.hidden = cats.length > 0;

  for (const cat of cats) {
    const card = document.createElement("article");
    card.className = "cat-card";

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "cat-pick";
    pick.title = `Draw ${cat.name}`;
    pick.addEventListener("click", () => startDrawing(cat.id));

    const image = document.createElement("img");
    image.src = cat.url;
    image.alt = "";
    if (cat.pixel) image.className = "pixel-media";
    const name = document.createElement("span");
    name.className = "cat-name";
    name.textContent = cat.name;
    pick.append(image, name);

    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = `favorite${favorites.has(cat.id) ? " on" : ""}`;
    favorite.textContent = favorites.has(cat.id) ? "♥" : "♡";
    favorite.title = favorites.has(cat.id) ? "Remove from favorites" : "Add to favorites";
    favorite.setAttribute("aria-label", `${favorite.title}: ${cat.name}`);
    favorite.addEventListener("click", async () => {
      state = await window.catCanvasDesktop.toggleFavorite(cat.id);
      render();
    });

    card.append(pick, favorite);
    if (cat.custom) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-custom";
      remove.textContent = "×";
      remove.title = `Remove ${cat.name}`;
      remove.addEventListener("click", async () => {
        state = await window.catCanvasDesktop.removeMedia(cat.id);
        render();
      });
      card.append(remove);
    }
    if (cat.kind === "gif") {
      const badge = document.createElement("span");
      badge.className = "kind";
      badge.textContent = "GIF";
      card.append(badge);
    }
    grid.append(card);
  }
}

async function startDrawing(id) {
  status.className = "status";
  status.textContent = "Draw a box anywhere on the screen.";
  await window.catCanvasDesktop.startDrawing(id, targetScreen.value);
}

document.querySelector("#random").addEventListener("click", () => startDrawing("random"));
document.querySelector("#slideshow").addEventListener("click", async () => {
  status.className = "status";
  status.textContent = "Draw a box for the slideshow.";
  const source = document.querySelector("#slideshow-source").value;
  const seconds = Number(document.querySelector("#slideshow-speed").value);
  const result = await window.catCanvasDesktop.startSlideshow(source, seconds, targetScreen.value);
  status.className = `status${result.started ? "" : " error"}`;
  status.textContent = result.message;
});
document.querySelector("#add-media").addEventListener("click", async () => {
  const result = await window.catCanvasDesktop.addMedia();
  status.className = `status${result.added ? "" : " error"}`;
  status.textContent = result.message;
  currentFilter = result.added ? "mine" : currentFilter;
  if (result.added) {
    document.querySelector(".filter.active")?.classList.remove("active");
    document.querySelector('[data-filter="mine"]').classList.add("active");
  }
});
document.querySelector("#clear").addEventListener("click", () => {
  window.catCanvasDesktop.clearAll();
  status.textContent = "Screen cleared.";
});
document.querySelector("#hide").addEventListener("click", () => window.catCanvasDesktop.hidePicker());
document.querySelector("#show-tutorial").addEventListener("click", showTutorial);
closeTutorial.addEventListener("click", hideTutorial);
tutorial.addEventListener("click", (event) => {
  if (event.target === tutorial) hideTutorial();
});
document.addEventListener("keydown", (event) => {
  if (recordingShortcut) {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      stopShortcutRecording("Shortcut change cancelled.");
      return;
    }
    if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
    const accelerator = shortcutFromEvent(event);
    if (!accelerator) {
      status.className = "status error";
      status.textContent = "Hold Ctrl or Alt, then press another key.";
      return;
    }
    stopShortcutRecording().then(async () => {
      const result = await window.catCanvasDesktop.setShortcut(accelerator);
      state = result.state;
      status.className = `status${result.error ? " error" : ""}`;
      status.textContent = result.message;
      render();
    });
    return;
  }
  if (event.key === "Escape" && !tutorial.hidden) hideTutorial();
});
startupToggle.addEventListener("change", async () => {
  startupToggle.disabled = true;
  const result = await window.catCanvasDesktop.setStartWithWindows(startupToggle.checked);
  state = result.state;
  status.className = `status${result.error ? " error" : ""}`;
  status.textContent = result.message;
  startupToggle.disabled = false;
  render();
});
shortcutButton.addEventListener("click", beginShortcutRecording);
resetShortcut.addEventListener("click", async () => {
  const result = await window.catCanvasDesktop.setShortcut("CommandOrControl+Shift+K");
  state = result.state;
  status.className = `status${result.error ? " error" : ""}`;
  status.textContent = result.message;
  render();
});
window.addEventListener("blur", () => stopShortcutRecording("Shortcut change cancelled."));

for (const button of document.querySelectorAll(".filter")) {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelector(".filter.active")?.classList.remove("active");
    button.classList.add("active");
    render();
  });
}

window.catCanvasDesktop.onStateChanged((nextState) => {
  state = nextState;
  render();
});

window.catCanvasDesktop.getState().then((nextState) => {
  state = nextState;
  status.textContent = `Draw Random: ${state.shortcut} · App stays in the tray`;
  render();
  if (!state.tutorialSeen) showTutorial();
});
