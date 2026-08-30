(function (root, factory) {
  const cats = factory();
  if (typeof module === "object" && module.exports) module.exports = cats;
  else root.CAT_CANVAS_CATS = cats;
})(globalThis, function () {
  return Object.freeze([
    { id: "cat-01", name: "Not Broken", shape: "wide", kind: "still", file: "cat-01.webp" },
    { id: "cat-02", name: "Basement Cat", shape: "wide", kind: "still", file: "cat-02.webp" },
    { id: "cat-03", name: "Serious Business", shape: "wide", kind: "still", file: "cat-03.webp" },
    { id: "cat-04", name: "Crying Cat", shape: "wide", kind: "still", file: "cat-04.webp" },
    { id: "cat-05", name: "Keyboard Cat", shape: "wide", kind: "still", file: "cat-05.webp" },
    { id: "cat-06", name: "Cat Meme", shape: "wide", kind: "still", file: "cat-06.webp" },
    { id: "cat-07", name: "No Understand", shape: "wide", kind: "still", file: "cat-07.webp" },
    { id: "cat-08", name: "Cheezburger", shape: "wide", kind: "still", file: "cat-08.webp" },
    { id: "cat-09", name: "In Ur Wallz", shape: "wide", kind: "still", file: "cat-09.webp" },
    { id: "cat-10", name: "Lolwut", shape: "wide", kind: "still", file: "cat-10.webp" },
    { id: "cat-11", name: "You Wake Me", shape: "wide", kind: "still", file: "cat-11.webp" },
    { id: "cat-12", name: "Cat Council", shape: "wide", kind: "still", file: "cat-12.webp" },
    { id: "cat-13", name: "Running Cartoon", shape: "wide", kind: "gif", file: "cat-13.gif", pixel: true },
    { id: "cat-14", name: "Muybridge Run", shape: "wide", kind: "gif", file: "cat-14.gif" },
    { id: "cat-15", name: "Sleeping Cat", shape: "wide", kind: "gif", file: "cat-15.gif" },
    { id: "cat-16", name: "Walking Cat", shape: "tall", kind: "gif", file: "cat-16.gif" },
    { id: "cat-17", name: "Kitka Run", shape: "wide", kind: "gif", file: "cat-17.gif", pixel: true },
    { id: "cat-18", name: "Plant Cat", shape: "square", kind: "gif", file: "cat-18.gif", pixel: true },
    { id: "cat-19", name: "Tiny Sprint", shape: "square", kind: "gif", file: "cat-19.gif", pixel: true },
    { id: "cat-20", name: "Big Sprint", shape: "square", kind: "gif", file: "cat-20.gif", pixel: true },
    { id: "cat-21", name: "Tiny Walk", shape: "square", kind: "gif", file: "cat-21.gif", pixel: true },
    { id: "cat-22", name: "Big Walk", shape: "square", kind: "gif", file: "cat-22.gif", pixel: true },
    { id: "cat-23", name: "Kitty Idle", shape: "square", kind: "gif", file: "cat-23.gif", pixel: true },
    { id: "cat-24", name: "Kitty Walk", shape: "square", kind: "gif", file: "cat-24.gif", pixel: true }
  ].map(Object.freeze));
});
