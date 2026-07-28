(() => {
  const supported = ["en", "zh-CN", "zh-TW", "ja", "ko", "ru"];
  const copy = {
    verified: {
      en: {
        title: "Became a Bethesda Verified Creator",
        text: "Officially joined the Bethesda Game Studios Verified Creator Program, opening a new chapter for TownGG creations."
      },
      "zh-CN": {
        title: "成为 Bethesda 官方认证作者",
        text: "2026 年 7 月正式通过 Bethesda Game Studios Verified Creator Program 认证，开启 TownGG 创作的新阶段。"
      },
      "zh-TW": {
        title: "成為 Bethesda 官方認證作者",
        text: "2026 年 7 月正式通過 Bethesda Game Studios Verified Creator Program 認證，開啟 TownGG 創作的新階段。"
      },
      ja: {
        title: "Bethesda Verified Creator に認定",
        text: "2026年7月、Bethesda Game Studios Verified Creator Program に正式認定され、TownGG の新たな創作段階が始まりました。"
      },
      ko: {
        title: "Bethesda 공식 인증 크리에이터 선정",
        text: "2026년 7월 Bethesda Game Studios Verified Creator Program의 공식 인증을 받아 TownGG 창작 활동의 새로운 장을 열었습니다."
      },
      ru: {
        title: "Получен статус Bethesda Verified Creator",
        text: "В июле 2026 года TownGG официально присоединился к программе Bethesda Game Studios Verified Creator Program."
      }
    }
  };

  let applying = false;

  function language() {
    const value = document.documentElement.lang || localStorage.getItem("townggSiteLang") || "en";
    return supported.includes(value) ? value : "en";
  }

  function locale(lang) {
    if (lang === "zh-CN") return "zh-CN";
    if (lang === "zh-TW") return "zh-TW";
    if (lang === "ja") return "ja-JP";
    if (lang === "ko") return "ko-KR";
    if (lang === "ru") return "ru-RU";
    return "en-US";
  }

  function thresholdTitle(threshold, lang) {
    if (lang === "zh-CN") return `全网总下载量突破 ${threshold / 10000} 万`;
    if (lang === "zh-TW") return `全網總下載量突破 ${threshold / 10000} 萬`;
    const formatted = new Intl.NumberFormat(locale(lang)).format(threshold);
    if (lang === "ja") return `全プラットフォーム累計ダウンロード ${formatted} 突破`;
    if (lang === "ko") return `전체 플랫폼 누적 다운로드 ${formatted} 돌파`;
    if (lang === "ru") return `Общее число загрузок превысило ${formatted}`;
    return `Total downloads passed ${formatted}`;
  }

  function thresholdText(threshold, lang) {
    if (lang === "zh-CN") return `TownGG 在 Bethesda Creations 与 Nexus Mods 的作品累计下载量突破 ${threshold / 10000} 万。`;
    if (lang === "zh-TW") return `TownGG 在 Bethesda Creations 與 Nexus Mods 的作品累計下載量突破 ${threshold / 10000} 萬。`;
    const formatted = new Intl.NumberFormat(locale(lang)).format(threshold);
    if (lang === "ja") return `Bethesda Creations と Nexus Mods における TownGG 作品の累計ダウンロードが ${formatted} を突破しました。`;
    if (lang === "ko") return `Bethesda Creations와 Nexus Mods의 TownGG 작품 누적 다운로드가 ${formatted}회를 돌파했습니다.`;
    if (lang === "ru") return `Совокупное число загрузок работ TownGG в Bethesda Creations и Nexus Mods превысило ${formatted}.`;
    return `TownGG releases across Bethesda Creations and Nexus Mods passed ${formatted} combined downloads.`;
  }

  function identify(item) {
    if (item.dataset.milestoneKey) return;
    const title = item.querySelector("h3")?.textContent.trim() || "";
    const original = item.querySelector("h3")?.dataset.i18nOriginal || title;

    if (original === "Became a Bethesda Verified Creator" || title === "Became a Bethesda Verified Creator") {
      item.dataset.milestoneKey = "verified";
      return;
    }

    const match = original.match(/^Total downloads passed\s+([\d,.\s]+)$/i)
      || title.match(/^Total downloads passed\s+([\d,.\s]+)$/i);
    if (!match) return;
    const threshold = Number(match[1].replace(/[^0-9]/g, ""));
    if (!Number.isFinite(threshold) || threshold <= 0) return;
    item.dataset.milestoneKey = "downloads";
    item.dataset.downloadThreshold = String(threshold);
  }

  function apply() {
    if (applying) return;
    const timeline = document.querySelector("[data-notes-timeline]");
    if (!timeline) return;
    applying = true;

    const lang = language();
    timeline.querySelectorAll(".timeline-item").forEach((item) => {
      identify(item);
      const title = item.querySelector("h3");
      const text = item.querySelector("p");
      if (!title || !text) return;

      if (item.dataset.milestoneKey === "verified") {
        const translated = copy.verified[lang] || copy.verified.en;
        title.textContent = translated.title;
        text.textContent = translated.text;
      }

      if (item.dataset.milestoneKey === "downloads") {
        const threshold = Number(item.dataset.downloadThreshold || 0);
        if (!threshold) return;
        title.textContent = thresholdTitle(threshold, lang);
        text.textContent = thresholdText(threshold, lang);
      }
    });

    applying = false;
  }

  const observer = new MutationObserver(() => window.setTimeout(apply, 0));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  const start = () => {
    const timeline = document.querySelector("[data-notes-timeline]");
    if (timeline) observer.observe(timeline, { childList: true, subtree: true });
    apply();
    window.setTimeout(apply, 200);
    window.setTimeout(apply, 900);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
