(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CatCanvasMedia = api;
})(globalThis, function () {
  function shapeFor(width, height) {
    const ratio = width / height;
    if (ratio >= 1.2) return "wide";
    if (ratio <= 0.9) return "tall";
    return "square";
  }

  function suitableCats(cats, width, height, exceptId) {
    const shape = shapeFor(width, height);
    let choices = cats.filter((cat) => cat.shape === shape && cat.id !== exceptId);
    if (Math.max(width, height) > 700) {
      const highQuality = choices.filter((cat) => cat.kind === "still");
      if (highQuality.length) choices = highQuality;
    }
    return choices.length ? choices : cats.filter((cat) => cat.id !== exceptId);
  }

  function randomSuitable(cats, width, height, exceptId, random = Math.random) {
    const choices = suitableCats(cats, width, height, exceptId);
    return choices[Math.floor(random() * choices.length)];
  }

  function wrapIndex(index, length) {
    if (!Number.isInteger(length) || length <= 0) return 0;
    return ((index % length) + length) % length;
  }

  function slideshowDelayMs(seconds) {
    const allowedSeconds = new Set([5, 10, 30, 60]);
    const safeSeconds = allowedSeconds.has(Number(seconds)) ? Number(seconds) : 10;
    return safeSeconds * 1000;
  }

  return Object.freeze({ shapeFor, suitableCats, randomSuitable, wrapIndex, slideshowDelayMs });
});
