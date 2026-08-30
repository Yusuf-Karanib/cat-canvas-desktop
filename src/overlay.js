const canvas = document.querySelector("#canvas");
const drawLayer = document.querySelector("#draw-layer");
const drawBox = document.querySelector("#draw-box");
const drawLabel = document.querySelector("#draw-label");
const { randomSuitable, wrapIndex } = globalThis.CatCanvasMedia;

let catalog = [];
let requestedId = "random";
let slideshowItems = [];
let slideshowDelay = 10000;
let drawStart = null;
let drawingActive = false;
let ignoringMouse = true;
let moveState = null;
const slideshowControllers = new Map();

function setIgnoreMouse(ignore) {
  if (ignore === ignoringMouse) return;
  ignoringMouse = ignore;
  window.catCanvasDesktop.setIgnoreMouse(ignore);
}

function rectFromPoints(start, end) {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

function updateDrawBox(rect) {
  drawBox.hidden = false;
  drawBox.style.left = `${rect.left}px`;
  drawBox.style.top = `${rect.top}px`;
  drawBox.style.width = `${rect.width}px`;
  drawBox.style.height = `${rect.height}px`;
}

function finishDrawing() {
  drawingActive = false;
  drawStart = null;
  drawLayer.hidden = true;
  drawBox.hidden = true;
  window.catCanvasDesktop.drawingFinished();
  ignoringMouse = true;
}

function cancelDrawing() {
  finishDrawing();
  if (!canvas.children.length) window.catCanvasDesktop.overlayEmpty(true);
}

function chooseCat(width, height, exceptId) {
  if (requestedId !== "random" && !exceptId) {
    const selected = catalog.find((cat) => cat.id === requestedId);
    if (selected) return selected;
  }
  return randomSuitable(catalog, width, height, exceptId);
}

function createAction(text, title, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action ${className}`.trim();
  button.textContent = text;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  if (onClick) button.addEventListener("click", onClick);
  return button;
}

function startMoving(event, item) {
  event.preventDefault();
  event.stopPropagation();
  moveState = {
    item,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: item.offsetLeft,
    top: item.offsetTop
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function stopSlideshow(item) {
  const controller = slideshowControllers.get(item);
  if (!controller) return;
  clearInterval(controller.timer);
  slideshowControllers.delete(item);
}

function placeMedia(rect) {
  const isSlideshow = requestedId === "slideshow" && slideshowItems.length >= 2;
  const cat = isSlideshow ? slideshowItems[0] : chooseCat(rect.width, rect.height);
  if (!cat) return;

  const item = document.createElement("section");
  item.className = "placed";
  item.style.left = `${rect.left}px`;
  item.style.top = `${rect.top}px`;
  item.style.width = `${rect.width}px`;
  item.style.height = `${rect.height}px`;
  item.dataset.catId = cat.id || "slideshow";
  item.classList.toggle("slideshow", isSlideshow);

  const image = document.createElement("img");
  image.src = cat.url;
  image.alt = cat.name;
  image.draggable = false;
  image.classList.toggle("pixel-media", Boolean(cat.pixel));

  const actions = document.createElement("div");
  actions.className = "actions";
  const move = createAction("↕", "Move", null, "move-handle");
  move.addEventListener("pointerdown", (event) => startMoving(event, item));
  const lock = createAction("▣", "Lock and click through", () => {
    item.classList.add("locked");
    setIgnoreMouse(true);
  });
  const remove = createAction("×", "Remove", () => {
    stopSlideshow(item);
    item.remove();
    if (!canvas.children.length) window.catCanvasDesktop.overlayEmpty(true);
  });

  if (isSlideshow) {
    const controller = { items: [...slideshowItems], index: 0, paused: false, timer: null, delay: slideshowDelay };
    const show = (index) => {
      controller.index = wrapIndex(index, controller.items.length);
      const nextItem = controller.items[controller.index];
      image.src = nextItem.url;
      image.alt = nextItem.name;
    };
    const restart = () => {
      clearInterval(controller.timer);
      if (!controller.paused) controller.timer = setInterval(() => show(controller.index + 1), controller.delay);
    };
    const previous = createAction("‹", "Previous item", () => {
      show(controller.index - 1);
      restart();
    });
    const pause = createAction("Ⅱ", "Pause slideshow", () => {
      controller.paused = !controller.paused;
      pause.textContent = controller.paused ? "▶" : "Ⅱ";
      pause.title = controller.paused ? "Play slideshow" : "Pause slideshow";
      pause.setAttribute("aria-label", pause.title);
      restart();
    });
    const next = createAction("›", "Next item", () => {
      show(controller.index + 1);
      restart();
    });
    actions.append(move, previous, pause, next, lock, remove);
    slideshowControllers.set(item, controller);
    restart();
  } else {
    const replace = createAction("↻", "Replace", () => {
      const next = randomSuitable(catalog, item.offsetWidth, item.offsetHeight, item.dataset.catId);
      if (!next) return;
      item.dataset.catId = next.id;
      image.src = next.url;
      image.alt = next.name;
      image.classList.toggle("pixel-media", Boolean(next.pixel));
    });
    actions.append(move, replace, lock, remove);
  }

  const resizeCorner = document.createElement("span");
  resizeCorner.className = "resize-corner";
  item.append(image, actions, resizeCorner);
  canvas.append(item);
  window.catCanvasDesktop.overlayEmpty(false);
}

drawLayer.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  drawStart = { x: event.clientX, y: event.clientY };
  updateDrawBox({ left: event.clientX, top: event.clientY, width: 0, height: 0 });
  drawLayer.setPointerCapture(event.pointerId);
});

drawLayer.addEventListener("pointermove", (event) => {
  if (!drawStart) return;
  updateDrawBox(rectFromPoints(drawStart, { x: event.clientX, y: event.clientY }));
});

drawLayer.addEventListener("pointerup", (event) => {
  if (!drawStart) return;
  const rect = rectFromPoints(drawStart, { x: event.clientX, y: event.clientY });
  if (rect.width >= 32 && rect.height >= 32) placeMedia(rect);
  finishDrawing();
});

window.addEventListener("pointermove", (event) => {
  if (moveState) {
    const maxLeft = window.innerWidth - moveState.item.offsetWidth;
    const maxTop = window.innerHeight - moveState.item.offsetHeight;
    moveState.item.style.left = `${Math.max(0, Math.min(maxLeft, moveState.left + event.clientX - moveState.startX))}px`;
    moveState.item.style.top = `${Math.max(0, Math.min(maxTop, moveState.top + event.clientY - moveState.startY))}px`;
    return;
  }
  if (drawingActive) return;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const interactive = target?.closest?.(".placed:not(.locked)");
  setIgnoreMouse(!interactive);
});

window.addEventListener("pointerup", () => { moveState = null; });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawingActive) {
    event.preventDefault();
    cancelDrawing();
  }
});

window.catCanvasDesktop.onStartDrawing((payload) => {
  catalog = Array.isArray(payload.cats) ? payload.cats : [];
  slideshowItems = Array.isArray(payload.slideshow) ? payload.slideshow : [];
  slideshowDelay = Number.isFinite(payload.slideshowDelay) ? payload.slideshowDelay : 10000;
  requestedId = payload.requestedId || "random";
  drawLabel.textContent = requestedId === "slideshow"
    ? "Drag to draw a slideshow box · Esc to cancel"
    : "Drag to draw a cat box · Esc to cancel";
  drawingActive = true;
  ignoringMouse = false;
  drawStart = null;
  drawBox.hidden = true;
  drawLayer.hidden = false;
});

window.catCanvasDesktop.onClearAll(() => {
  for (const item of slideshowControllers.keys()) stopSlideshow(item);
  canvas.replaceChildren();
  window.catCanvasDesktop.overlayEmpty(true);
});

window.catCanvasDesktop.onUnlockAll(() => {
  for (const item of canvas.querySelectorAll(".placed.locked")) item.classList.remove("locked");
});
