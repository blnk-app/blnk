// Сайт BLNK: только удобства поверх готового HTML. Без скрипта страница целиком
// работает и читается поисковиками; скрипт лишь уточняет ссылки и подсказывает язык.
//
// 1. На Windows на ARM главной становится кнопка установщика для ARM.
// 2. Если язык браузера есть среди версий сайта, а открыта другая, — плашка со ссылкой.
//    Сами не перебрасываем: так советует Google, и человек мог выбрать язык нарочно.

async function preferArm() {
  try {
    const hints = await navigator.userAgentData?.getHighEntropyValues(["architecture"]);
    if (hints?.platform !== "Windows" || hints.architecture !== "arm") return;
    for (const group of document.querySelectorAll(".downloads")) {
      const main = group.querySelector("[data-asset='_x64-setup.exe']");
      const arm = group.querySelector("[data-asset='_arm64-setup.exe']");
      if (!main || !arm) continue;
      [main.dataset.asset, arm.dataset.asset] = [arm.dataset.asset, main.dataset.asset];
      [main.href, arm.href] = [arm.href, main.href];
      // Главная кнопка теперь ставит версию для ARM, а запасная ссылка — для x64.
      arm.textContent = "Windows x64";
    }
  } catch {
    // Браузер без подсказок об устройстве — оставляем x64.
  }
}

function suggestLanguage() {
  const banner = document.querySelector(".lang-banner");
  if (!banner) return;
  try {
    if (localStorage.getItem("lang-banner") === "closed") return;
  } catch {
    // Без хранилища плашка просто покажется снова.
  }
  const current = document.documentElement.lang;
  const versions = new Map(
    [...document.querySelectorAll("link[rel=alternate][hreflang]")]
      .filter((link) => link.hreflang !== "x-default")
      .map((link) => [link.hreflang, link.href]),
  );
  const wanted = (navigator.languages || [navigator.language || ""])
    .map((lang) => lang.slice(0, 2).toLowerCase())
    .find((lang) => versions.has(lang));
  if (!wanted || wanted === current) return;
  const local = document.querySelector(`.lang-menu a[hreflang="${wanted}"]`);
  const text = { ru: "Эта страница есть на русском", uk: "Ця сторінка є українською", en: "This page is also available in English" }[wanted];
  const link = document.createElement("a");
  link.href = local ? local.getAttribute("href") : versions.get(wanted);
  link.hreflang = wanted;
  link.lang = wanted;
  link.textContent = `${text} →`;
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.textContent = "×";
  close.addEventListener("click", () => {
    banner.hidden = true;
    try {
      localStorage.setItem("lang-banner", "closed");
    } catch {
      // Не запомнится — не страшно.
    }
  });
  banner.append(link, close);
  banner.hidden = false;
}

// 3. Бургер на телефоне: меню на весь экран, Esc и нажатие на ссылку закрывают его.
function menu() {
  const button = document.querySelector(".menu-toggle");
  const header = button?.closest("header");
  if (!button || !header) return;
  button.hidden = false;
  const set = (open) => {
    header.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? button.dataset.close : button.dataset.open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("menu-open")) {
      set(false);
      button.focus();
    }
  });
  header.querySelectorAll("nav.links a").forEach((link) => link.addEventListener("click", () => set(false)));
  matchMedia("(min-width: 761px)").addEventListener("change", (query) => query.matches && set(false));
}

// 4. На телефоне установщик не запустить: кнопка отправляет ссылку себе (меню «Поделиться»),
//    а где его нет — копирует ссылку в буфер.
function share() {
  for (const button of document.querySelectorAll(".share")) {
    if (!document.documentElement.classList.contains("phone")) continue;
    button.hidden = false;
    const label = button.querySelector("span");
    const initial = label.textContent;
    button.addEventListener("click", async () => {
      const { url, text } = button.dataset;
      try {
        if (navigator.share) {
          await navigator.share({ title: "BLNK", text, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        label.textContent = button.dataset.done;
        setTimeout(() => (label.textContent = initial), 2500);
      } catch {
        // Отменили меню «Поделиться» или нет доступа к буферу — ничего не делаем.
      }
    });
  }
}

// 5. Тема: глаз открыт в светлой, закрыт в тёмной. Нажатие меняет тему с морганием:
//    в тёмную веки закрываются, в светлую — открываются. Выбор запоминается.
function theme() {
  const root = document.documentElement;
  const buttons = document.querySelectorAll(".theme-toggle");
  if (!buttons.length) return;
  const system = matchMedia("(prefers-color-scheme: dark)");
  const current = () => root.dataset.theme || (system.matches ? "dark" : "light");
  const show = () => {
    const dark = current() === "dark";
    root.classList.toggle("dark", dark);
    for (const button of buttons) {
      button.setAttribute("aria-label", dark ? button.dataset.light : button.dataset.dark);
    }
  };
  const apply = (next) => {
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Не запомнится — при следующем визите тема снова будет по системе.
    }
    show();
  };
  for (const button of buttons) {
    button.hidden = false;
    button.addEventListener("click", () => {
      const next = current() === "dark" ? "light" : "dark";
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!document.startViewTransition || still) {
        apply(next);
        return;
      }
      root.dataset.blink = next === "dark" ? "close" : "open";
      const transition = document.startViewTransition(() => apply(next));
      transition.finished.finally(() => delete root.dataset.blink);
    });
  }
  // Сменили тему в системе, а сами на сайте не выбирали — просто следуем, без моргания.
  system.addEventListener("change", show);
  show();
}

// 6. Прокрутка: линия под липкой шапкой и кнопка «наверх» дальше первого экрана.
function scrolling() {
  const root = document.documentElement;
  const top = document.querySelector(".to-top");
  let queued = false;
  const update = () => {
    queued = false;
    root.classList.toggle("scrolled", scrollY > 8);
    root.classList.toggle("show-top", scrollY > innerHeight);
  };
  addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
  top?.addEventListener("click", (event) => {
    event.preventDefault();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    // С клавиатуры фокус переходит наверх, а не остаётся внизу страницы.
    document.querySelector(".brand")?.focus({ preventScroll: true });
  });
}

// 7. Список языков закрывается кликом мимо него и клавишей Esc.
function languages() {
  const menus = document.querySelectorAll(".lang-menu");
  document.addEventListener("click", (event) => {
    for (const menu of menus) if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const menu of menus) {
      if (menu.open) {
        menu.open = false;
        menu.querySelector("summary").focus();
      }
    }
  });
}

suggestLanguage();
preferArm();
menu();
share();
theme();
scrolling();
languages();
