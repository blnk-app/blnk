// Сайт BLNK: только удобства поверх готового HTML. Без скрипта страница целиком
// работает и читается поисковиками; скрипт лишь уточняет ссылки и подсказывает язык.
//
// 1. Кнопки скачивания ведут прямо на установщик свежего релиза: стабильного, а пока
//    его нет — беты. GitHub не ответил — остаются ссылки на страницу релизов.
// 2. На Windows на ARM главной становится кнопка установщика для ARM.
// 3. Если язык браузера есть среди версий сайта, а открыта другая, — плашка со ссылкой.
//    Сами не перебрасываем: так советует Google, и человек мог выбрать язык нарочно.

const REPO = "blnk-app/blnk";

async function latestRelease() {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`);
  if (!response.ok) return null;
  const releases = (await response.json()).filter((r) => !r.draft);
  return releases.find((r) => !r.prerelease) || releases[0] || null;
}

async function linkInstallers() {
  const links = document.querySelectorAll("[data-asset]");
  if (links.length === 0) return;
  try {
    const release = await latestRelease();
    if (!release) return;
    for (const link of links) {
      const asset = release.assets.find((a) => a.name.endsWith(link.dataset.asset));
      if (asset) link.href = asset.browser_download_url;
    }
  } catch {
    // Нет сети или GitHub не ответил.
  }
}

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
  const local = document.querySelector(`.langs a[hreflang="${wanted}"]`);
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

suggestLanguage();
preferArm().then(linkInstallers);
