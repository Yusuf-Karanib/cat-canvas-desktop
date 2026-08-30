const grid = document.querySelector("#cat-grid");
const empty = document.querySelector("#empty");
const status = document.querySelector("#status");
let state = { cats: [], favorites: [], shortcut: "Ctrl+Shift+K" };
let currentFilter = "all";

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
  await window.catCanvasDesktop.startDrawing(id);
}

document.querySelector("#random").addEventListener("click", () => startDrawing("random"));
document.querySelector("#slideshow").addEventListener("click", async () => {
  status.className = "status";
  status.textContent = "Choose at least 2 photos.";
  const result = await window.catCanvasDesktop.startSlideshow();
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
});
