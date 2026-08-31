const SHORTCUT_CHOICES = Object.freeze([
  { accelerator: "CommandOrControl+Shift+K", label: "Ctrl+Shift+K" },
  { accelerator: "CommandOrControl+Shift+C", label: "Ctrl+Shift+C" },
  { accelerator: "CommandOrControl+Alt+K", label: "Ctrl+Alt+K" },
  { accelerator: "Alt+Shift+K", label: "Alt+Shift+K" }
]);

const DEFAULT_SHORTCUT = SHORTCUT_CHOICES[0].accelerator;

function normalizeShortcut(value) {
  return SHORTCUT_CHOICES.some((choice) => choice.accelerator === value) ? value : DEFAULT_SHORTCUT;
}

function shortcutLabel(value, platform = process.platform) {
  const choice = SHORTCUT_CHOICES.find((item) => item.accelerator === normalizeShortcut(value));
  return platform === "darwin" ? choice.label.replaceAll("Ctrl", "Cmd") : choice.label;
}

module.exports = { DEFAULT_SHORTCUT, SHORTCUT_CHOICES, normalizeShortcut, shortcutLabel };
