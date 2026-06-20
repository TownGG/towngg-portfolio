(() => {
  const COMMUNITY_DATA_URL = "./assets/data/admin-community-messages.json";
  let playerVoicesPending = false;

  function runHomeMetrics() {
    const hasHomeMetrics = document.querySelector("[data-home-metric]");
    if (!hasHomeMetrics) return;
    if (typeof window.setupHomeMetrics === "function") {
      window.setupHomeMetrics();
      return;
    }
    if (typeof setupHomeMetrics === "function") {
      setupHomeMetrics();
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function platformLabel(platform) {
    return String(platform || "").toLowerCase() === "reddit" ? "REDDIT" : "NEXUS";
  }

  function compactQuote(text) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > 170 ? `${value.slice(0, 167)}...` : value;
  }

  function currentLanguage() {
    const stored = localStorage.getItem("townggSiteLang");
    if (["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(stored)) return stored;
    const htmlLang = document.documentElement.lang;
    return ["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(htmlLang) ? htmlLang : "en";
  }

  function playerVoicesCopy() {
    const lang = currentLanguage();
    if (lang === "zh-CN") return { eyebrow: "精选反馈", title: "玩家之声", desc: "来自 Nexus Mods 与 Reddit 的精选玩家评论。" };
    if (lang === "zh-TW") return { eyebrow: "精選回饋", title: "玩家之聲", desc: "來自 Nexus Mods 與 Reddit 的精選玩家評論。" };
    if (lang === "ja") return { eyebrow: "選ばれたフィードバック", title: "プレイヤーの声", desc: "Nexus Mods と Reddit から選んだプレイヤーコメント。" };
    if (lang === "ko") return { eyebrow: "선별 피드백", title: "플레이어의 목소리", desc: "Nexus Mods와 Reddit에서 선별한 플레이어 댓글입니다." };
    if (lang === "ru") return { eyebrow: "Избранные отзывы", title: "Голоса игроков", desc: "Избранные комментарии игроков с Nexus Mods и Reddit." };
    return { eyebrow: "Selected Feedback", title: "Player Voices", desc: "Selected comments from players across Nexus Mods and Reddit." };
  }

  function updatePlayerVoicesCopy() {
    const section = document.querySelector("[data-player-voices]");
    if (!section) return;
    const copy = playerVoicesCopy();
    const eyebrow = section.querySelector("[data-player-voices-eyebrow]");
    const title = section.querySelector("[data-player-voices-title]");
    const desc = section.querySelector("[data-player-voices-desc]");
    if (eyebrow) eyebrow.textContent = copy.eyebrow;
    if (title) title.textContent = copy.title;
    if (desc) desc.textContent = copy.desc;
  }

  function dedupePlayerVoices() {
    const sections = [...document.querySelectorAll("[data-player-voices]")];
    sections.slice(1).forEach((section) => section.remove());
    return sections[0] || null;
  }

  function injectPlayerVoicesStyles() {
    if (document.getElementById("player-voices-style")) return;
    const style = document.createElement("style");
    style.id = "player-voices-style";
    style.textContent = `
      .player-voices-panel{position:relative;overflow:hidden;min-height:clamp(360px,42vw,520px);padding:clamp(24px,4vw,42px);border-color:rgba(125,216,255,.16);background:radial-gradient(circle at 18% 18%,rgba(125,216,255,.14),transparent 34%),radial-gradient(circle at 82% 30%,rgba(153,116,255,.12),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.012)),rgba(3,7,12,.52)}
      .player-voices-panel::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.32;background-image:linear-gradient(rgba(125,216,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(125,216,255,.06) 1px,transparent 1px);background-size:42px 42px;mask-image:radial-gradient(circle at center,#000,transparent 78%)}
      .player-voices-head{position:relative;z-index:2;max-width:620px}.player-voices-head .section-title{margin-bottom:10px}.player-voices-field{position:relative;z-index:1;min-height:clamp(260px,31vw,380px);margin-top:24px}
      .player-voice-card{position:absolute;left:var(--pv-left,10%);top:var(--pv-top,20%);width:min(330px,78vw);padding:18px;border:1px solid rgba(125,216,255,.18);border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.085),rgba(255,255,255,.026)),rgba(3,8,16,.72);box-shadow:0 20px 48px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(16px);transform:translate3d(var(--pv-x,0),var(--pv-y,0),0) rotate(var(--pv-r,0deg));animation:playerVoiceFloat var(--pv-duration,16s) ease-in-out infinite alternate;animation-delay:var(--pv-delay,0s);transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease}
      .player-voice-card:hover{z-index:5;border-color:rgba(125,216,255,.46);box-shadow:0 24px 60px rgba(0,0,0,.38),0 0 32px rgba(125,216,255,.12),inset 0 1px 0 rgba(255,255,255,.08);transform:translate3d(var(--pv-x,0),calc(var(--pv-y,0) - 8px),0) rotate(var(--pv-r,0deg)) scale(1.025)}
      .player-voice-card p{margin:0;color:#eefaff;font-size:clamp(14px,1.45vw,17px);font-weight:650;line-height:1.55}.player-voice-card span{display:block;margin-top:14px;color:var(--muted);font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
      @keyframes playerVoiceFloat{0%{translate:0 0}50%{translate:8px -12px}100%{translate:-6px 10px}}
      @media(max-width:760px){.player-voices-panel{min-height:auto}.player-voices-field{display:grid;gap:14px;min-height:auto}.player-voice-card{position:relative;left:auto;top:auto;width:100%;animation:none;transform:none}}
      @media(prefers-reduced-motion:reduce){.player-voice-card{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function findCommunityNotesSection() {
    const boardLink = document.querySelector('a[href="./message-board.html"]');
    const boardSection = boardLink?.closest("section");
    if (boardSection) return boardSection;
    const titles = [...document.querySelectorAll(".section-title")];
    const titleTexts = ["community notes", "社区留言", "社群留言", "コミュニティノート", "커뮤니티 노트", "заметки сообщества"];
    const communityTitle = titles.find((title) => titleTexts.includes(title.textContent.trim().toLowerCase()));
    return communityTitle?.closest("section") || null;
  }

  function findSocialLinksSection() {
    const socials = document.querySelector("[data-socials]");
    return socials?.closest("section") || null;
  }

  function buildPlayerVoicesSection(items) {
    const section = document.createElement("section");
    section.className = "section tight player-voices-section";
    section.setAttribute("data-player-voices", "");
    const copy = playerVoicesCopy();
    const positions = [[4,8,-2.4,"18s","-2s"],[44,4,1.7,"22s","-7s"],[18,42,2.6,"19s","-5s"],[62,38,-1.8,"24s","-11s"],[8,70,1.2,"21s","-3s"],[50,72,-2.1,"26s","-8s"],[72,10,2.2,"20s","-13s"],[34,22,-.8,"23s","-4s"]];
    const cards = items.map((item, index) => {
      const [left, top, rotate, duration, delay] = positions[index % positions.length];
      return `<article class="player-voice-card" style="--pv-left:${left}%;--pv-top:${top}%;--pv-r:${rotate}deg;--pv-duration:${duration};--pv-delay:${delay};"><p>“${escapeHtml(compactQuote(item.originalContent))}”</p><span>${escapeHtml(platformLabel(item.platform))} · ${escapeHtml(item.modName || "TownGG Mod")}</span></article>`;
    }).join("");
    section.innerHTML = `<div class="container"><div class="panel player-voices-panel"><div class="player-voices-head"><div class="eyebrow" data-player-voices-eyebrow>${escapeHtml(copy.eyebrow)}</div><h2 class="section-title" data-player-voices-title>${escapeHtml(copy.title)}</h2><p class="section-desc" data-player-voices-desc>${escapeHtml(copy.desc)}</p></div><div class="player-voices-field">${cards}</div></div></div>`;
    return section;
  }

  async function runPlayerVoices() {
    if (document.body?.dataset?.page !== "home") return;
    const existing = dedupePlayerVoices();
    if (existing) { updatePlayerVoicesCopy(); return; }
    if (playerVoicesPending) return;
    playerVoicesPending = true;
    try {
      const response = await fetch(`${COMMUNITY_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const messages = await response.json();
      const featured = (Array.isArray(messages) ? messages : []).filter((item) => item && item.replyStatus === "featured" && String(item.originalContent || "").trim()).slice(0, 8);
      if (!featured.length) return;
      if (dedupePlayerVoices()) { updatePlayerVoicesCopy(); return; }
      injectPlayerVoicesStyles();
      const section = buildPlayerVoicesSection(featured);
      const communitySection = findCommunityNotesSection();
      const socialSection = findSocialLinksSection();
      if (communitySection?.parentNode) communitySection.parentNode.insertBefore(section, communitySection.nextSibling);
      else if (socialSection?.parentNode) socialSection.parentNode.insertBefore(section, socialSection);
      dedupePlayerVoices();
    } catch (error) {
      // Hide silently when no featured player comments exist yet.
    } finally {
      playerVoicesPending = false;
    }
  }

  function watchLanguageChanges() {
    const observer = new MutationObserver(() => {
      dedupePlayerVoices();
      updatePlayerVoicesCopy();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(runHomeMetrics, 900);
    window.setTimeout(runPlayerVoices, 1000);
    window.setTimeout(runPlayerVoices, 1300);
    watchLanguageChanges();
  });
})();
