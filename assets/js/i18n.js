const TGG_SUPPORTED_LANGUAGES = ['zh', 'en', 'ja', 'ko', 'ru', 'fr'];

const TGG_LANGUAGE_LABELS = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  fr: 'Français'
};

const TGG_COUNTRY_LANGUAGE_MAP = {
  CN: 'zh',
  HK: 'zh',
  TW: 'zh',
  MO: 'zh',

  JP: 'ja',
  KR: 'ko',

  RU: 'ru',
  BY: 'ru',
  KZ: 'ru',

  FR: 'fr',
  MC: 'fr',
  BE: 'fr',
  CH: 'fr',

  US: 'en',
  GB: 'en',
  AU: 'en',
  CA: 'en',
  NZ: 'en'
};

const TGG_I18N = {
  zh: {
    navHome: '首页',
    navMods: '模组',
    navGallery: '图库',
    navLogs: '个人日志',
    navBoard: '留言板',
    navAbout: '关于',
    languageLabel: '语言',
    heroTag: 'Starfield 模组作者作品集',
    heroTitle: 'TownGG<br><span>创作者中心</span>',
    heroSub: 'Starfield 玩法系统、沉浸式世界交互、NASA-punk 装备设计与原创科幻概念艺术。',
    viewMods: '查看模组',
    exploreGallery: '浏览图库',
    leaveMessage: '留言',
    metricDownloads: '总下载量',
    metricLikes: '社区点赞',
    metricMods: '已发布模组',
    metricPlays: 'Creations 游玩数',
    latestLogsEyebrow: '最新日志',
    latestLogsTitle: '个人日志',
    latestLogsDesc: 'TownGG 最近的开发故事、发布瞬间和创作想法。',
    allLogs: '全部日志',
    featuredReleaseEyebrow: '精选发布',
    featuredReleaseTitle: '标志性 Starfield 体验',
    featuredReleaseDesc: '用于展示最希望访客第一眼注意到的核心作品区域。',
    selectedModsEyebrow: '精选模组',
    selectedModsTitle: 'Nexus 发布作品',
    selectedModsDesc: '首页展示 TownGG 在 Nexus Mods 上的部分作品，完整归档请进入模组页面。',
    allMods: '全部模组',
    artEyebrow: '原创艺术',
    artTitle: '概念图库预览',
    artDesc: '精选概念图横向预览，完整图片墙请进入图库页面。',
    openGallery: '打开图库',
    boardEyebrow: '留言板',
    boardTitle: '社区留言',
    boardDesc: '由 GitHub Discussions 驱动的公开留言板，所有访客都可同步查看。',
    visitBoard: '访问留言板',
    feedbackTitle: '公开反馈',
    feedbackDesc: '进入留言板，留下发布想法、Bug 反馈、合作请求或一般建议。',
    contactEyebrow: '联系',
    contactTitle: '社交链接',
    contactDesc: '关注项目、Starfield 创作与未来更新。',
    footerDesc: 'Bethesda 风格沉浸系统 / NASA-punk 工业设计 / Starfield 玩法扩展'
  },
  en: {
    navHome: 'Home',
    navMods: 'Mods',
    navGallery: 'Gallery',
    navLogs: 'Personal Logs',
    navBoard: 'Message Board',
    navAbout: 'About',
    languageLabel: 'Language',
    heroTag: 'Starfield Mod Creator Portfolio',
    heroTitle: 'TownGG<br><span>Creator Hub</span>',
    heroSub: 'Starfield gameplay systems, immersive world interaction, NASA-punk equipment design and original sci-fi concept art.',
    viewMods: 'View Mods',
    exploreGallery: 'Explore Gallery',
    leaveMessage: 'Leave a Message',
    metricDownloads: 'Total Downloads',
    metricLikes: 'Community Likes',
    metricMods: 'Published Mods',
    metricPlays: 'Creations Plays',
    latestLogsEyebrow: 'Latest Logs',
    latestLogsTitle: 'Personal Logs',
    latestLogsDesc: 'Recent development stories, release moments and small thoughts from TownGG.',
    allLogs: 'All Logs',
    featuredReleaseEyebrow: 'Featured Release',
    featuredReleaseTitle: 'Signature Starfield Experience',
    featuredReleaseDesc: 'A larger showcase area for the work you most want visitors to notice first.',
    selectedModsEyebrow: 'Selected Mods',
    selectedModsTitle: 'Nexus Releases',
    selectedModsDesc: 'A short homepage preview of TownGG releases on Nexus Mods, with the full archive living on the Mods page.',
    allMods: 'All Mods',
    artEyebrow: 'Original Art',
    artTitle: 'Concept Gallery Preview',
    artDesc: 'A horizontal preview of selected concept artwork, with the full image wall on the Gallery page.',
    openGallery: 'Open Gallery',
    boardEyebrow: 'Message Board',
    boardTitle: 'Community Notes',
    boardDesc: 'A public message board powered by GitHub Discussions, synced for every visitor.',
    visitBoard: 'Visit Message Board',
    feedbackTitle: 'Public Feedback',
    feedbackDesc: 'Open the board to leave release ideas, bug notes, collaboration requests or general feedback.',
    contactEyebrow: 'Contact',
    contactTitle: 'Social Links',
    contactDesc: 'Follow projects, Starfield creations and future updates.',
    footerDesc: 'Bethesda-style immersive systems / NASA-punk industrial design / Starfield gameplay expansion'
  },
  ja: {
    navHome: 'ホーム',
    navMods: 'Mod',
    navGallery: 'ギャラリー',
    navLogs: '個人ログ',
    navBoard: 'メッセージボード',
    navAbout: '概要',
    languageLabel: '言語',
    heroTag: 'Starfield Mod 制作者ポートフォリオ',
    heroTitle: 'TownGG<br><span>クリエイターハブ</span>',
    heroSub: 'Starfield のゲームプレイシステム、没入型ワールドインタラクション、NASA-punk 装備デザイン、オリジナルSFコンセプトアート。',
    viewMods: 'Modを見る',
    exploreGallery: 'ギャラリーを見る',
    leaveMessage: 'メッセージを残す',
    metricDownloads: '総ダウンロード数',
    metricLikes: 'コミュニティいいね',
    metricMods: '公開済みMod',
    metricPlays: 'Creationsプレイ数',
    latestLogsEyebrow: '最新ログ',
    latestLogsTitle: '個人ログ',
    latestLogsDesc: 'TownGG の最近の開発ストーリー、リリースの瞬間、小さな考え。',
    allLogs: 'すべてのログ',
    featuredReleaseEyebrow: '注目リリース',
    featuredReleaseTitle: '代表的な Starfield 体験',
    featuredReleaseDesc: '訪問者に最初に見てほしい作品を大きく見せるためのショーケースエリア。',
    selectedModsEyebrow: '選定Mod',
    selectedModsTitle: 'Nexus リリース',
    selectedModsDesc: 'TownGG の Nexus Mods 作品をホームに短く表示し、完全なアーカイブは Mods ページに配置しています。',
    allMods: 'すべてのMod',
    artEyebrow: 'オリジナルアート',
    artTitle: 'コンセプトギャラリープレビュー',
    artDesc: '選定したコンセプトアートの横長プレビュー。完全な画像ウォールはギャラリーページへ。',
    openGallery: 'ギャラリーを開く',
    boardEyebrow: 'メッセージボード',
    boardTitle: 'コミュニティノート',
    boardDesc: 'GitHub Discussions による公開メッセージボード。すべての訪問者に同期されます。',
    visitBoard: 'ボードを見る',
    feedbackTitle: '公開フィードバック',
    feedbackDesc: 'リリース案、バグ報告、コラボ依頼、一般的な意見をボードに残せます。',
    contactEyebrow: '連絡先',
    contactTitle: 'ソーシャルリンク',
    contactDesc: 'プロジェクト、Starfield 作品、今後の更新をフォロー。',
    footerDesc: 'Bethesda風の没入型システム / NASA-punk インダストリアルデザイン / Starfield ゲームプレイ拡張'
  },
  ko: {
    navHome: '홈',
    navMods: '모드',
    navGallery: '갤러리',
    navLogs: '개인 로그',
    navBoard: '메시지 보드',
    navAbout: '소개',
    languageLabel: '언어',
    heroTag: 'Starfield 모드 제작자 포트폴리오',
    heroTitle: 'TownGG<br><span>크리에이터 허브</span>',
    heroSub: 'Starfield 게임플레이 시스템, 몰입형 월드 인터랙션, NASA-punk 장비 디자인, 오리지널 SF 콘셉트 아트.',
    viewMods: '모드 보기',
    exploreGallery: '갤러리 둘러보기',
    leaveMessage: '메시지 남기기',
    metricDownloads: '총 다운로드',
    metricLikes: '커뮤니티 좋아요',
    metricMods: '게시된 모드',
    metricPlays: 'Creations 플레이',
    latestLogsEyebrow: '최신 로그',
    latestLogsTitle: '개인 로그',
    latestLogsDesc: 'TownGG의 최근 개발 이야기, 출시 순간, 작은 생각들.',
    allLogs: '모든 로그',
    featuredReleaseEyebrow: '추천 릴리스',
    featuredReleaseTitle: '대표 Starfield 경험',
    featuredReleaseDesc: '방문자가 가장 먼저 보길 원하는 핵심 작품을 크게 보여주는 쇼케이스 영역입니다.',
    selectedModsEyebrow: '선정 모드',
    selectedModsTitle: 'Nexus 릴리스',
    selectedModsDesc: 'TownGG의 Nexus Mods 작품 일부를 홈에서 미리 보여주며, 전체 아카이브는 Mods 페이지에 있습니다.',
    allMods: '모든 모드',
    artEyebrow: '오리지널 아트',
    artTitle: '콘셉트 갤러리 미리보기',
    artDesc: '선택된 콘셉트 아트의 가로형 미리보기이며, 전체 이미지 월은 갤러리 페이지에서 확인할 수 있습니다.',
    openGallery: '갤러리 열기',
    boardEyebrow: '메시지 보드',
    boardTitle: '커뮤니티 노트',
    boardDesc: 'GitHub Discussions 기반 공개 메시지 보드로, 모든 방문자에게 동기화됩니다.',
    visitBoard: '메시지 보드 방문',
    feedbackTitle: '공개 피드백',
    feedbackDesc: '릴리스 아이디어, 버그 노트, 협업 요청 또는 일반 피드백을 남길 수 있습니다.',
    contactEyebrow: '연락처',
    contactTitle: '소셜 링크',
    contactDesc: '프로젝트, Starfield 창작물, 향후 업데이트를 팔로우하세요.',
    footerDesc: 'Bethesda 스타일 몰입형 시스템 / NASA-punk 산업 디자인 / Starfield 게임플레이 확장'
  },
  ru: {
    navHome: 'Главная',
    navMods: 'Моды',
    navGallery: 'Галерея',
    navLogs: 'Личные записи',
    navBoard: 'Доска сообщений',
    navAbout: 'Обо мне',
    languageLabel: 'Язык',
    heroTag: 'Портфолио автора модов Starfield',
    heroTitle: 'TownGG<br><span>Центр автора</span>',
    heroSub: 'Игровые системы Starfield, иммерсивное взаимодействие с миром, NASA-punk дизайн экипировки и оригинальный sci-fi концепт-арт.',
    viewMods: 'Смотреть моды',
    exploreGallery: 'Открыть галерею',
    leaveMessage: 'Оставить сообщение',
    metricDownloads: 'Всего загрузок',
    metricLikes: 'Лайки сообщества',
    metricMods: 'Опубликованные моды',
    metricPlays: 'Запуски Creations',
    latestLogsEyebrow: 'Последние записи',
    latestLogsTitle: 'Личные записи',
    latestLogsDesc: 'Недавние истории разработки, моменты релизов и небольшие мысли TownGG.',
    allLogs: 'Все записи',
    featuredReleaseEyebrow: 'Избранный релиз',
    featuredReleaseTitle: 'Фирменный опыт Starfield',
    featuredReleaseDesc: 'Большая витрина для работы, которую вы хотите показать посетителям в первую очередь.',
    selectedModsEyebrow: 'Избранные моды',
    selectedModsTitle: 'Релизы Nexus',
    selectedModsDesc: 'Короткий предпросмотр релизов TownGG на Nexus Mods; полный архив находится на странице Mods.',
    allMods: 'Все моды',
    artEyebrow: 'Оригинальное искусство',
    artTitle: 'Превью концепт-галереи',
    artDesc: 'Горизонтальное превью выбранных концепт-артов; полная стена изображений находится в галерее.',
    openGallery: 'Открыть галерею',
    boardEyebrow: 'Доска сообщений',
    boardTitle: 'Заметки сообщества',
    boardDesc: 'Публичная доска сообщений на GitHub Discussions, синхронизированная для каждого посетителя.',
    visitBoard: 'Перейти к доске',
    feedbackTitle: 'Публичная обратная связь',
    feedbackDesc: 'Откройте доску, чтобы оставить идеи релизов, баг-репорты, запросы на сотрудничество или общий отзыв.',
    contactEyebrow: 'Контакты',
    contactTitle: 'Социальные ссылки',
    contactDesc: 'Следите за проектами, Starfield creations и будущими обновлениями.',
    footerDesc: 'Иммерсивные системы в стиле Bethesda / NASA-punk индустриальный дизайн / расширение игрового процесса Starfield'
  },
  fr: {
    navHome: 'Accueil',
    navMods: 'Mods',
    navGallery: 'Galerie',
    navLogs: 'Carnets personnels',
    navBoard: 'Tableau de messages',
    navAbout: 'À propos',
    languageLabel: 'Langue',
    heroTag: 'Portfolio de créateur de mods Starfield',
    heroTitle: 'TownGG<br><span>Hub créateur</span>',
    heroSub: 'Systèmes de gameplay Starfield, interactions immersives, design d’équipement NASA-punk et concept art sci-fi original.',
    viewMods: 'Voir les mods',
    exploreGallery: 'Explorer la galerie',
    leaveMessage: 'Laisser un message',
    metricDownloads: 'Téléchargements totaux',
    metricLikes: 'Likes communautaires',
    metricMods: 'Mods publiés',
    metricPlays: 'Lectures Creations',
    latestLogsEyebrow: 'Derniers carnets',
    latestLogsTitle: 'Carnets personnels',
    latestLogsDesc: 'Histoires de développement récentes, moments de sortie et petites pensées de TownGG.',
    allLogs: 'Tous les carnets',
    featuredReleaseEyebrow: 'Sortie en vedette',
    featuredReleaseTitle: 'Expérience Starfield signature',
    featuredReleaseDesc: 'Une grande zone de présentation pour l’œuvre que vous voulez mettre en avant en premier.',
    selectedModsEyebrow: 'Mods sélectionnés',
    selectedModsTitle: 'Sorties Nexus',
    selectedModsDesc: 'Un court aperçu en page d’accueil des sorties TownGG sur Nexus Mods, avec l’archive complète sur la page Mods.',
    allMods: 'Tous les mods',
    artEyebrow: 'Art original',
    artTitle: 'Aperçu de la galerie concept',
    artDesc: 'Un aperçu horizontal d’œuvres conceptuelles sélectionnées, avec le mur complet d’images sur la page Galerie.',
    openGallery: 'Ouvrir la galerie',
    boardEyebrow: 'Tableau de messages',
    boardTitle: 'Notes communautaires',
    boardDesc: 'Un tableau de messages public propulsé par GitHub Discussions, synchronisé pour chaque visiteur.',
    visitBoard: 'Visiter le tableau',
    feedbackTitle: 'Retours publics',
    feedbackDesc: 'Ouvrez le tableau pour laisser des idées de sortie, notes de bug, demandes de collaboration ou retours généraux.',
    contactEyebrow: 'Contact',
    contactTitle: 'Liens sociaux',
    contactDesc: 'Suivez les projets, créations Starfield et futures mises à jour.',
    footerDesc: 'Systèmes immersifs style Bethesda / design industriel NASA-punk / extension de gameplay Starfield'
  }
};

function getLanguageFromBrowser() {
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('fr')) return 'fr';
  return 'en';
}

function normalizeLanguage(lang) {
  return TGG_SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
}

function setLanguageButton(lang) {
  const current = document.querySelector('[data-current-language]');
  if (current) current.textContent = TGG_LANGUAGE_LABELS[lang] || 'English';

  document.querySelectorAll('[data-language-option]').forEach((button) => {
    const active = button.dataset.languageOption === lang;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function applyLanguage(lang, options = {}) {
  const nextLang = normalizeLanguage(lang);
  const dict = TGG_I18N[nextLang] || TGG_I18N.en;

  document.documentElement.lang = nextLang === 'zh' ? 'zh-CN' : nextLang;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    const value = dict[key] || TGG_I18N.en[key];
    if (!value) return;
    element.innerHTML = value;
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    const value = dict[key] || TGG_I18N.en[key];
    if (value) element.setAttribute('aria-label', value);
  });

  setLanguageButton(nextLang);

  if (options.persist !== false) {
    localStorage.setItem('towngg_language', nextLang);
  }
}

async function detectLanguageByIp() {
  try {
    const response = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!response.ok) throw new Error('IP language detection failed');
    const data = await response.json();
    const countryCode = String(data.country_code || '').toUpperCase();
    return TGG_COUNTRY_LANGUAGE_MAP[countryCode] || getLanguageFromBrowser();
  } catch (error) {
    console.warn(error);
    return getLanguageFromBrowser();
  }
}

function setupLanguageMenu() {
  const toggle = document.querySelector('[data-language-toggle]');
  const menu = document.querySelector('[data-language-menu]');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    menu.hidden = isOpen;
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-language-switcher]')) {
      toggle.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }
  });

  document.querySelectorAll('[data-language-option]').forEach((button) => {
    button.addEventListener('click', () => {
      applyLanguage(button.dataset.languageOption);
      toggle.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    });
  });
}

async function initTownGGLanguage() {
  setupLanguageMenu();

  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang && TGG_SUPPORTED_LANGUAGES.includes(urlLang)) {
    applyLanguage(urlLang);
    return;
  }

  const savedLang = localStorage.getItem('towngg_language');
  if (savedLang && TGG_SUPPORTED_LANGUAGES.includes(savedLang)) {
    applyLanguage(savedLang);
    return;
  }

  applyLanguage('en', { persist: false });
  const detectedLang = await detectLanguageByIp();
  applyLanguage(detectedLang, { persist: false });
}

document.addEventListener('DOMContentLoaded', initTownGGLanguage);
