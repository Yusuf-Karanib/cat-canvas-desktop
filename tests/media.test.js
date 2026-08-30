const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const cats = require("../src/cats");
const { shapeFor, suitableCats, randomSuitable, wrapIndex } = require("../src/media-utils");

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
