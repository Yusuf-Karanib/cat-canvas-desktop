const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const cats = require("../src/cats");
const { shapeFor, suitableCats, randomSuitable, wrapIndex, slideshowDelayMs, slideshowChoices } = require("../src/media-utils");

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
