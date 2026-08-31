const DEFAULT_SHORTCUT = "CommandOrControl+Shift+K";
const MODIFIERS = new Set(["CommandOrControl", "Alt", "Shift"]);
const NAMED_KEYS = new Set([
  "Space", "Tab", "Capslock", "Numlock", "Scrolllock", "Backspace", "Delete", "Insert",
  "Return", "Enter", "Up", "Down", "Left", "Right", "Home", "End", "PageUp", "PageDown",
  "VolumeUp", "VolumeDown", "VolumeMute", "MediaNextTrack", "MediaPreviousTrack", "MediaStop",
  "MediaPlayPause", "PrintScreen", "Plus", "numdec", "numadd", "numsub", "nummult", "numdiv"
]);
const PUNCTUATION_KEYS = new Set([";", "+", "=", ",", "_", "-", ".", "/", "~", "`", "]", "[", "\\"]);

function isAllowedKey(key) {
  return /^[A-Z0-9]$/.test(key)
    || /^F(?:[1-9]|1[0-9]|2[0-4])$/.test(key)
    || /^num[0-9]$/.test(key)
    || NAMED_KEYS.has(key)
    || PUNCTUATION_KEYS.has(key);
}

function isValidShortcut(value) {
  if (typeof value !== "string") return false;
  const parts = value.split("+");
  if (parts.length < 2) return false;
  const key = parts.pop();
  const modifiers = parts;
  if (!isAllowedKey(key) || new Set(modifiers).size !== modifiers.length) return false;
  if (!modifiers.every((modifier) => MODIFIERS.has(modifier))) return false;
  return modifiers.includes("CommandOrControl") || modifiers.includes("Alt");
}

function normalizeShortcut(value) {
  return isValidShortcut(value) ? value : DEFAULT_SHORTCUT;
}

function shortcutLabel(value, platform = process.platform) {
  return normalizeShortcut(value)
    .replace("CommandOrControl", platform === "darwin" ? "Cmd" : "Ctrl");
}

module.exports = { DEFAULT_SHORTCUT, isValidShortcut, normalizeShortcut, shortcutLabel };
