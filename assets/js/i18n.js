(() => {
  const LANG_KEY = "townggSiteLang";
  const languages = ["en", "zh-CN", "zh-TW", "ja", "ko", "ru"];
  const labels = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어", ru: "Русский" };

  const dict = {
    "zh-CN": {
      "Home": "首页", "Mods": "模组", "Gallery": "画廊", "Personal Logs": "个人日志", "Message Board": "留言板", "About": "关于", "Admin": "后台",
      "View Mods": "查看模组", "Explore Gallery": "浏览画廊", "Leave a Message": "留言", "Donate": "赞助",
      "Total Downloads": "总下载量", "Community Likes": "社区点赞", "Published Mods": "已发布模组", "Creations Plays": "Creations 游玩数",
      "Latest Logs": "最新日志", "All Logs": "全部日志", "Featured Release": "精选发布", "Signature Starfield Experience": "代表性星空体验",
      "Selected Mods": "精选模组", "Nexus Releases": "Nexus 发布", "Original Art": "原创美术", "Concept Gallery Preview": "概念画廊预览", "Open Gallery": "打开画廊",
      "Community Notes": "社区留言", "Visit Message Board": "进入留言板", "Public Feedback": "公开反馈", "Contact": "联系", "Social Links": "社交链接",
      "MOD Archive": "模组档案", "Nexus Telemetry": "Nexus 数据", "Nexus Mods releases with daily downloads, total downloads and endorsements.": "Nexus Mods 发布数据，包含每日下载、总下载和点赞。",
      "Trend": "趋势", "Daily downloads": "每日下载", "Total downloads": "总下载", "Unique downloads": "唯一下载", "Endorsements": "点赞", "All releases": "全部发布", "Nexus Details": "Nexus 明细",
      "Bethesda Creations": "Bethesda Creations", "Creation Metrics": "Creation 数据", "Latest Bethesda Creations stats.": "最新 Bethesda Creations 数据。",
      "Creations Ranking": "Creations 排名", "Snapshot from Bethesda Creations stats.": "来自 Bethesda Creations 数据的快照。", "Creations Details": "Creations 明细",
      "All": "全部", "Quest": "任务", "Gameplay": "玩法", "Clothing": "服装", "Translation": "翻译", "Filter": "筛选",
      "Original Art Gallery": "原创美术画廊", "Concept Art": "概念设计", "In-Game Screenshots": "游戏截图",
      "About TownGG": "关于 TownGG", "Profile": "简介", "Creator Direction": "创作方向", "Workflow": "工作流程", "Production Workflow": "制作流程", "Concept Design": "概念设计", "Asset Creation": "资产制作", "Integration": "集成实现", "Testing": "测试",
      "Site Telemetry": "站点数据", "Portfolio Traffic": "官网流量", "Privacy-safe public traffic data for the TownGG portfolio.": "TownGG 官网的隐私安全公开流量数据。",
      "Visits": "访问量", "Requests": "请求数", "Bandwidth Served": "带宽用量", "Cache Hit Rate": "缓存命中率", "7-Day Visits Trend": "7 日访问趋势", "Loading": "加载中", "Loading telemetry...": "正在加载站点数据...",
      "Community Terminal": "社区终端", "Public Board": "公开留言板", "Community Messages": "社区留言", "Comments": "评论", "Discussion": "讨论",
      "Active Projects": "进行中项目", "Latest Entry": "最新条目", "Total Notes": "日志总数", "Journal": "日志", "Recent Milestones": "近期里程碑", "Timeline": "时间线",
      "Read More": "阅读全文", "Previous Article": "上一篇", "Next Article": "下一篇", "Back to Personal Logs": "返回个人日志",
      "Likes": "点赞", "Downloads": "下载", "Plays": "游玩", "Library Adds": "加入库", "Views": "浏览", "Daily": "每日", "Total": "总计", "Unique": "唯一", "Endorse": "点赞", "Creation": "Creation",
      "Sort": "排序", "Latest Time": "最新时间", "Auto Discovered": "自动发现", "Automatically discovered from Bethesda Creations.": "自动从 Bethesda Creations 发现。"
    },
    "zh-TW": {
      "Home": "首頁", "Mods": "模組", "Gallery": "畫廊", "Personal Logs": "個人日誌", "Message Board": "留言板", "About": "關於", "Admin": "後台",
      "View Mods": "查看模組", "Explore Gallery": "瀏覽畫廊", "Leave a Message": "留言", "Donate": "贊助",
      "Total Downloads": "總下載量", "Community Likes": "社群按讚", "Published Mods": "已發佈模組", "Creations Plays": "Creations 遊玩數",
      "Latest Logs": "最新日誌", "All Logs": "全部日誌", "Featured Release": "精選發佈", "Signature Starfield Experience": "代表性星空體驗",
      "Selected Mods": "精選模組", "Nexus Releases": "Nexus 發佈", "Original Art": "原創美術", "Concept Gallery Preview": "概念畫廊預覽", "Open Gallery": "開啟畫廊",
      "Community Notes": "社群留言", "Visit Message Board": "進入留言板", "Public Feedback": "公開回饋", "Contact": "聯絡", "Social Links": "社群連結",
      "MOD Archive": "模組檔案", "Nexus Telemetry": "Nexus 數據", "Nexus Mods releases with daily downloads, total downloads and endorsements.": "Nexus Mods 發佈數據，包含每日下載、總下載和按讚。",
      "Trend": "趨勢", "Daily downloads": "每日下載", "Total downloads": "總下載", "Unique downloads": "唯一下載", "Endorsements": "按讚", "All releases": "全部發佈", "Nexus Details": "Nexus 明細",
      "Bethesda Creations": "Bethesda Creations", "Creation Metrics": "Creation 數據", "Latest Bethesda Creations stats.": "最新 Bethesda Creations 數據。",
      "Creations Ranking": "Creations 排名", "Snapshot from Bethesda Creations stats.": "來自 Bethesda Creations 數據的快照。", "Creations Details": "Creations 明細",
      "All": "全部", "Quest": "任務", "Gameplay": "玩法", "Clothing": "服裝", "Translation": "翻譯", "Filter": "篩選",
      "Original Art Gallery": "原創美術畫廊", "Concept Art": "概念設計", "In-Game Screenshots": "遊戲截圖",
      "About TownGG": "關於 TownGG", "Profile": "簡介", "Creator Direction": "創作方向", "Workflow": "工作流程", "Production Workflow": "製作流程", "Concept Design": "概念設計", "Asset Creation": "資產製作", "Integration": "整合實作", "Testing": "測試",
      "Site Telemetry": "站點數據", "Portfolio Traffic": "官網流量", "Privacy-safe public traffic data for the TownGG portfolio.": "TownGG 官網的隱私安全公開流量數據。",
      "Visits": "訪問量", "Requests": "請求數", "Bandwidth Served": "頻寬用量", "Cache Hit Rate": "快取命中率", "7-Day Visits Trend": "7 日訪問趨勢", "Loading": "載入中", "Loading telemetry...": "正在載入站點數據...",
      "Community Terminal": "社群終端", "Public Board": "公開留言板", "Community Messages": "社群留言", "Comments": "評論", "Discussion": "討論",
      "Active Projects": "進行中專案", "Latest Entry": "最新條目", "Total Notes": "日誌總數", "Journal": "日誌", "Recent Milestones": "近期里程碑", "Timeline": "時間線",
      "Read More": "閱讀全文", "Previous Article": "上一篇", "Next Article": "下一篇", "Back to Personal Logs": "返回個人日誌",
      "Likes": "按讚", "Downloads": "下載", "Plays": "遊玩", "Library Adds": "加入庫", "Views": "瀏覽", "Daily": "每日", "Total": "總計", "Unique": "唯一", "Endorse": "按讚", "Creation": "Creation",
      "Sort": "排序", "Latest Time": "最新時間", "Auto Discovered": "自動發現", "Automatically discovered from Bethesda Creations.": "自動從 Bethesda Creations 發現。"
    },
    ja: {
      "Home": "ホーム", "Mods": "Mods", "Gallery": "ギャラリー", "Personal Logs": "個人ログ", "Message Board": "メッセージボード", "About": "概要", "Admin": "管理",
      "View Mods": "Modsを見る", "Explore Gallery": "ギャラリーを見る", "Leave a Message": "メッセージを残す", "Donate": "支援",
      "Total Downloads": "総ダウンロード", "Community Likes": "コミュニティいいね", "Published Mods": "公開済みMods", "Creations Plays": "Creationsプレイ数",
      "Latest Logs": "最新ログ", "All Logs": "すべてのログ", "Featured Release": "注目リリース", "Signature Starfield Experience": "代表的なStarfield体験",
      "Selected Mods": "選択されたMods", "Nexus Releases": "Nexusリリース", "Original Art": "オリジナルアート", "Concept Gallery Preview": "コンセプトギャラリー プレビュー", "Open Gallery": "ギャラリーを開く",
      "Community Notes": "コミュニティノート", "Visit Message Board": "メッセージボードへ", "Public Feedback": "公開フィードバック", "Contact": "連絡先", "Social Links": "ソーシャルリンク",
      "MOD Archive": "MODアーカイブ", "Nexus Telemetry": "Nexusデータ", "Nexus Mods releases with daily downloads, total downloads and endorsements.": "Nexus Modsのリリースデータ、日別ダウンロード、総ダウンロード、支持数を表示します。",
      "Trend": "トレンド", "Daily downloads": "日別ダウンロード", "Total downloads": "総ダウンロード", "Unique downloads": "ユニークダウンロード", "Endorsements": "支持数", "All releases": "すべてのリリース", "Nexus Details": "Nexus詳細",
      "Bethesda Creations": "Bethesda Creations", "Creation Metrics": "Creationデータ", "Latest Bethesda Creations stats.": "最新のBethesda Creationsデータ。",
      "Creations Ranking": "Creationsランキング", "Snapshot from Bethesda Creations stats.": "Bethesda Creationsデータのスナップショット。", "Creations Details": "Creations詳細",
      "All": "すべて", "Quest": "クエスト", "Gameplay": "ゲームプレイ", "Clothing": "衣装", "Translation": "翻訳", "Filter": "フィルター",
      "Original Art Gallery": "オリジナルアートギャラリー", "Concept Art": "コンセプトアート", "In-Game Screenshots": "ゲーム内スクリーンショット",
      "About TownGG": "TownGGについて", "Profile": "プロフィール", "Creator Direction": "制作方針", "Workflow": "ワークフロー", "Production Workflow": "制作ワークフロー", "Concept Design": "コンセプト設計", "Asset Creation": "アセット制作", "Integration": "実装", "Testing": "テスト",
      "Site Telemetry": "サイトデータ", "Portfolio Traffic": "ポートフォリオ流入", "Privacy-safe public traffic data for the TownGG portfolio.": "TownGGポートフォリオのプライバシーに配慮した公開トラフィックデータ。",
      "Visits": "訪問数", "Requests": "リクエスト", "Bandwidth Served": "配信帯域", "Cache Hit Rate": "キャッシュ率", "7-Day Visits Trend": "7日間の訪問トレンド", "Loading": "読み込み中", "Loading telemetry...": "サイトデータを読み込み中...",
      "Community Terminal": "コミュニティ端末", "Public Board": "公開ボード", "Community Messages": "コミュニティメッセージ", "Comments": "コメント", "Discussion": "ディスカッション",
      "Active Projects": "進行中プロジェクト", "Latest Entry": "最新エントリー", "Total Notes": "ログ総数", "Journal": "ジャーナル", "Recent Milestones": "最近のマイルストーン", "Timeline": "タイムライン",
      "Read More": "続きを読む", "Previous Article": "前の記事", "Next Article": "次の記事", "Back to Personal Logs": "個人ログへ戻る",
      "Likes": "いいね", "Downloads": "ダウンロード", "Plays": "プレイ", "Library Adds": "ライブラリ追加", "Views": "閲覧", "Daily": "日別", "Total": "合計", "Unique": "ユニーク", "Endorse": "支持", "Creation": "Creation",
      "Sort": "並び替え", "Latest Time": "最新順", "Auto Discovered": "自動取得", "Automatically discovered from Bethesda Creations.": "Bethesda Creations から自動取得。"
    },
    ko: {
      "Home": "홈", "Mods": "모드", "Gallery": "갤러리", "Personal Logs": "개인 로그", "Message Board": "메시지 보드", "About": "소개", "Admin": "관리",
      "View Mods": "모드 보기", "Explore Gallery": "갤러리 보기", "Leave a Message": "메시지 남기기", "Donate": "후원",
      "Total Downloads": "총 다운로드", "Community Likes": "커뮤니티 좋아요", "Published Mods": "공개된 모드", "Creations Plays": "Creations 플레이",
      "Latest Logs": "최신 로그", "All Logs": "전체 로그", "Featured Release": "주요 릴리스", "Signature Starfield Experience": "대표 Starfield 경험",
      "Selected Mods": "선별 모드", "Nexus Releases": "Nexus 릴리스", "Original Art": "오리지널 아트", "Concept Gallery Preview": "콘셉트 갤러리 미리보기", "Open Gallery": "갤러리 열기",
      "Community Notes": "커뮤니티 노트", "Visit Message Board": "메시지 보드 방문", "Public Feedback": "공개 피드백", "Contact": "연락", "Social Links": "소셜 링크",
      "MOD Archive": "모드 아카이브", "Nexus Telemetry": "Nexus 데이터", "Nexus Mods releases with daily downloads, total downloads and endorsements.": "Nexus Mods 릴리스 데이터, 일일 다운로드, 총 다운로드와 추천 수를 표시합니다.",
      "Trend": "추세", "Daily downloads": "일일 다운로드", "Total downloads": "총 다운로드", "Unique downloads": "고유 다운로드", "Endorsements": "추천", "All releases": "전체 릴리스", "Nexus Details": "Nexus 세부 정보",
      "Bethesda Creations": "Bethesda Creations", "Creation Metrics": "Creation 데이터", "Latest Bethesda Creations stats.": "최신 Bethesda Creations 통계.",
      "Creations Ranking": "Creations 순위", "Snapshot from Bethesda Creations stats.": "Bethesda Creations 통계 스냅샷.", "Creations Details": "Creations 세부 정보",
      "All": "전체", "Quest": "퀘스트", "Gameplay": "게임플레이", "Clothing": "의상", "Translation": "번역", "Filter": "필터",
      "Original Art Gallery": "오리지널 아트 갤러리", "Concept Art": "콘셉트 아트", "In-Game Screenshots": "게임 내 스크린샷",
      "About TownGG": "TownGG 소개", "Profile": "프로필", "Creator Direction": "제작 방향", "Workflow": "작업 흐름", "Production Workflow": "제작 워크플로", "Concept Design": "콘셉트 설계", "Asset Creation": "에셋 제작", "Integration": "통합", "Testing": "테스트",
      "Site Telemetry": "사이트 데이터", "Portfolio Traffic": "포트폴리오 트래픽", "Privacy-safe public traffic data for the TownGG portfolio.": "TownGG 포트폴리오의 개인정보 보호형 공개 트래픽 데이터.",
      "Visits": "방문", "Requests": "요청", "Bandwidth Served": "전송 대역폭", "Cache Hit Rate": "캐시 적중률", "7-Day Visits Trend": "7일 방문 추세", "Loading": "로딩 중", "Loading telemetry...": "사이트 데이터 로딩 중...",
      "Community Terminal": "커뮤니티 터미널", "Public Board": "공개 게시판", "Community Messages": "커뮤니티 메시지", "Comments": "댓글", "Discussion": "토론",
      "Active Projects": "진행 중 프로젝트", "Latest Entry": "최신 항목", "Total Notes": "로그 수", "Journal": "저널", "Recent Milestones": "최근 마일스톤", "Timeline": "타임라인",
      "Read More": "더 보기", "Previous Article": "이전 글", "Next Article": "다음 글", "Back to Personal Logs": "개인 로그로 돌아가기",
      "Likes": "좋아요", "Downloads": "다운로드", "Plays": "플레이", "Library Adds": "라이브러리 추가", "Views": "조회", "Daily": "일일", "Total": "합계", "Unique": "고유", "Endorse": "추천", "Creation": "Creation",
      "Sort": "정렬", "Latest Time": "최신순", "Auto Discovered": "자동 발견", "Automatically discovered from Bethesda Creations.": "Bethesda Creations에서 자동 발견됨."
    },
    ru: {
      "Home": "Главная", "Mods": "Моды", "Gallery": "Галерея", "Personal Logs": "Личные записи", "Message Board": "Доска сообщений", "About": "О проекте", "Admin": "Админ",
      "View Mods": "Смотреть моды", "Explore Gallery": "Открыть галерею", "Leave a Message": "Оставить сообщение", "Donate": "Поддержать",
      "Total Downloads": "Всего загрузок", "Community Likes": "Лайки сообщества", "Published Mods": "Опубликованные моды", "Creations Plays": "Запуски Creations",
      "Latest Logs": "Последние записи", "All Logs": "Все записи", "Featured Release": "Избранный релиз", "Signature Starfield Experience": "Фирменный опыт Starfield",
      "Selected Mods": "Избранные моды", "Nexus Releases": "Релизы Nexus", "Original Art": "Оригинальный арт", "Concept Gallery Preview": "Превью концепт-галереи", "Open Gallery": "Открыть галерею",
      "Community Notes": "Заметки сообщества", "Visit Message Board": "Перейти к сообщениям", "Public Feedback": "Публичные отзывы", "Contact": "Контакты", "Social Links": "Социальные ссылки",
      "MOD Archive": "Архив модов", "Nexus Telemetry": "Данные Nexus", "Nexus Mods releases with daily downloads, total downloads and endorsements.": "Данные релизов Nexus Mods: ежедневные загрузки, общие загрузки и лайки.",
      "Trend": "Тренд", "Daily downloads": "Ежедневные загрузки", "Total downloads": "Всего загрузок", "Unique downloads": "Уникальные загрузки", "Endorsements": "Лайки", "All releases": "Все релизы", "Nexus Details": "Детали Nexus",
      "Bethesda Creations": "Bethesda Creations", "Creation Metrics": "Данные Creation", "Latest Bethesda Creations stats.": "Последняя статистика Bethesda Creations.",
      "Creations Ranking": "Рейтинг Creations", "Snapshot from Bethesda Creations stats.": "Снимок статистики Bethesda Creations.", "Creations Details": "Детали Creations",
      "All": "Все", "Quest": "Квесты", "Gameplay": "Геймплей", "Clothing": "Одежда", "Translation": "Перевод", "Filter": "Фильтр",
      "Original Art Gallery": "Галерея оригинального арта", "Concept Art": "Концепт-арт", "In-Game Screenshots": "Скриншоты из игры",
      "About TownGG": "О TownGG", "Profile": "Профиль", "Creator Direction": "Творческое направление", "Workflow": "Процесс", "Production Workflow": "Производственный процесс", "Concept Design": "Концепт-дизайн", "Asset Creation": "Создание ассетов", "Integration": "Интеграция", "Testing": "Тестирование",
      "Site Telemetry": "Данные сайта", "Portfolio Traffic": "Трафик портфолио", "Privacy-safe public traffic data for the TownGG portfolio.": "Публичные данные трафика портфолио TownGG без персональных данных.",
      "Visits": "Посещения", "Requests": "Запросы", "Bandwidth Served": "Переданный трафик", "Cache Hit Rate": "Попадания в кэш", "7-Day Visits Trend": "Тренд посещений за 7 дней", "Loading": "Загрузка", "Loading telemetry...": "Загрузка данных сайта...",
      "Community Terminal": "Терминал сообщества", "Public Board": "Публичная доска", "Community Messages": "Сообщения сообщества", "Comments": "Комментарии", "Discussion": "Обсуждение",
      "Active Projects": "Активные проекты", "Latest Entry": "Последняя запись", "Total Notes": "Всего записей", "Journal": "Журнал", "Recent Milestones": "Недавние этапы", "Timeline": "Хронология",
      "Read More": "Читать дальше", "Previous Article": "Предыдущая статья", "Next Article": "Следующая статья", "Back to Personal Logs": "Назад к личным записям",
      "Likes": "Лайки", "Downloads": "Загрузки", "Plays": "Запуски", "Library Adds": "Добавления в библиотеку", "Views": "Просмотры", "Daily": "Ежедневно", "Total": "Всего", "Unique": "Уникальные", "Endorse": "Лайки", "Creation": "Creation",
      "Sort": "Сортировка", "Latest Time": "Сначала новые", "Auto Discovered": "Автообнаружено", "Automatically discovered from Bethesda Creations.": "Автоматически найдено в Bethesda Creations."
    }
  };

  const heroCopy = {
    home: {
      en: ["TownGG", "Creator Hub", "Starfield gameplay systems, immersive world interaction, NASA-punk equipment design and original sci-fi concept art."],
      "zh-CN": ["TownGG", "创作者中心", "星空玩法系统、沉浸式世界互动、NASA-punk 装备设计与原创科幻概念美术。"],
      "zh-TW": ["TownGG", "創作者中心", "星空玩法系統、沉浸式世界互動、NASA-punk 裝備設計與原創科幻概念美術。"],
      ja: ["TownGG", "クリエイターハブ", "Starfield向けゲームプレイシステム、没入型ワールドインタラクション、NASA-punk装備デザイン、オリジナルSFコンセプトアート。"],
      ko: ["TownGG", "크리에이터 허브", "Starfield 게임플레이 시스템, 몰입형 월드 상호작용, NASA-punk 장비 디자인과 오리지널 SF 콘셉트 아트."],
      ru: ["TownGG", "Центр автора", "Игровые системы Starfield, иммерсивное взаимодействие с миром, дизайн NASA-punk снаряжения и оригинальный sci-fi концепт-арт."]
    },
    mods: {
      en: ["Starfield", "Mods", "Full catalog of gameplay systems, world interaction mods, weapons, outfits and character customization work."],
      "zh-CN": ["Starfield", "模组", "完整收录玩法系统、世界互动模组、武器、服装与角色自定义作品。"],
      "zh-TW": ["Starfield", "模組", "完整收錄玩法系統、世界互動模組、武器、服裝與角色自訂作品。"],
      ja: ["Starfield", "Mods", "ゲームプレイシステム、ワールドインタラクション、武器、衣装、キャラクターカスタマイズ作品の一覧。"],
      ko: ["Starfield", "모드", "게임플레이 시스템, 월드 상호작용 모드, 무기, 의상과 캐릭터 커스터마이징 작업 전체 목록."],
      ru: ["Starfield", "Моды", "Полный каталог игровых систем, модов взаимодействия с миром, оружия, костюмов и кастомизации персонажей."]
    },
    gallery: {
      en: ["Concept", "Design", "A dedicated place for original paintings, character studies, weapon concepts, UI moods and environment direction."],
      "zh-CN": ["概念", "设计", "收录原创绘画、角色设定、武器概念、UI 情绪板与环境方向。"],
      "zh-TW": ["概念", "設計", "收錄原創繪畫、角色設定、武器概念、UI 情緒板與環境方向。"],
      ja: ["コンセプト", "デザイン", "オリジナル絵画、キャラクター研究、武器コンセプト、UIムード、環境デザインの保管場所。"],
      ko: ["콘셉트", "디자인", "오리지널 그림, 캐릭터 스터디, 무기 콘셉트, UI 무드와 환경 방향을 모아둔 공간."],
      ru: ["Концепт", "Дизайн", "Место для оригинальных иллюстраций, исследований персонажей, концептов оружия, UI-настроений и окружения."]
    },
    about: {
      en: ["Mod Creator", "CUP Founder", "I am the creator of the Cassilia Universe Project (CUP), an original Starfield mod series centered around Cassilia, Terminus and the stories that connect them. CUP is built to expand Starfield with lore-friendly characters, weapons, outfits and future story-driven adventures that feel like a natural extension of Bethesda's universe."],
      "zh-CN": ["模组作者", "CUP 创始人", "我是 Cassilia Universe Project（CUP）的创作者，这是一个围绕 Cassilia、Terminus 以及相关故事展开的原创 Starfield 模组系列。"],
      "zh-TW": ["模組作者", "CUP 創始人", "我是 Cassilia Universe Project（CUP）的創作者，這是一個圍繞 Cassilia、Terminus 以及相關故事展開的原創 Starfield 模組系列。"],
      ja: ["Mod制作者", "CUP創設者", "Cassilia、Terminus、そして関連する物語を中心に展開するオリジナルStarfield Modシリーズ、Cassilia Universe Project（CUP）の制作者です。"],
      ko: ["모드 제작자", "CUP 창립자", "저는 Cassilia, Terminus와 그들을 잇는 이야기를 중심으로 한 오리지널 Starfield 모드 시리즈 Cassilia Universe Project(CUP)의 제작자입니다."],
      ru: ["Автор модов", "Основатель CUP", "Я автор Cassilia Universe Project (CUP) — оригинальной серии модов Starfield о Cassilia, Terminus и связанных с ними историях."]
    },
    "message-board": {
      en: ["Message", "Board", "Leave feedback, ideas, collaboration notes or requests for future Starfield releases."],
      "zh-CN": ["留言", "板", "留下反馈、想法、合作信息，或对未来 Starfield 作品的需求。"],
      "zh-TW": ["留言", "板", "留下回饋、想法、合作資訊，或對未來 Starfield 作品的需求。"],
      ja: ["メッセージ", "ボード", "フィードバック、アイデア、コラボ相談、今後のStarfieldリリースへのリクエストを残せます。"],
      ko: ["메시지", "보드", "피드백, 아이디어, 협업 메모 또는 향후 Starfield 릴리스 요청을 남겨주세요."],
      ru: ["Доска", "сообщений", "Оставляйте отзывы, идеи, предложения по сотрудничеству или запросы для будущих релизов Starfield."]
    },
    "dev-log": {
      en: ["Personal", "Logs", "Thoughts, development stories and random moments from TownGG."],
      "zh-CN": ["个人", "日志", "TownGG 的想法、开发故事与日常片段。"],
      "zh-TW": ["個人", "日誌", "TownGG 的想法、開發故事與日常片段。"],
      ja: ["個人", "ログ", "TownGGの考え、開発ストーリー、日々の小さな記録。"],
      ko: ["개인", "로그", "TownGG의 생각, 개발 이야기와 일상의 순간들."],
      ru: ["Личные", "записи", "Мысли, истории разработки и случайные моменты от TownGG."]
    }
  };

  function pageId() {
    if (document.body.dataset.page) return document.body.dataset.page;
    const file = location.pathname.split("/").pop().replace(".html", "") || "home";
    return file === "index" ? "home" : file;
  }

  function preferredLanguage() {
    const stored = localStorage.getItem(LANG_KEY);
    if (languages.includes(stored)) return stored;
    const browser = (navigator.language || "").toLowerCase();
    if (browser.startsWith("zh-tw") || browser.startsWith("zh-hk") || browser.startsWith("zh-mo")) return "zh-TW";
    if (browser.startsWith("zh")) return "zh-CN";
    if (browser.startsWith("ja")) return "ja";
    if (browser.startsWith("ko")) return "ko";
    if (browser.startsWith("ru")) return "ru";
    return "en";
  }

  function injectStyle() {
    if (document.getElementById("towngg-i18n-style")) return;
    const style = document.createElement("style");
    style.id = "towngg-i18n-style";
    style.textContent = `
      .nav { display:grid; grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr); }
      .nav .brand{justify-self:start}.nav .nav-links{justify-self:center}.nav .nav-toggle{justify-self:end}
      .language-switcher{position:relative;justify-self:end}.language-button{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.04);color:var(--text);cursor:pointer;font:inherit;font-size:13px;font-weight:800}.language-button:hover,.language-switcher.is-open .language-button{border-color:var(--line-blue);background:rgba(125,216,255,.08)}
      .language-menu{position:absolute;top:calc(100% + 10px);right:0;z-index:30;display:grid;min-width:168px;padding:8px;border:1px solid var(--line);border-radius:16px;background:rgba(8,12,18,.94);box-shadow:var(--shadow);backdrop-filter:blur(18px);opacity:0;pointer-events:none;transform:translateY(-6px);transition:opacity .18s ease,transform .18s ease}.language-switcher.is-open .language-menu{opacity:1;pointer-events:auto;transform:translateY(0)}
      .language-option{min-height:38px;padding:0 12px;border:1px solid transparent;border-radius:12px;background:transparent;color:#c7d4e3;cursor:pointer;text-align:left;font:inherit;font-size:13px;font-weight:800}.language-option:hover,.language-option.is-active{border-color:var(--line-blue);background:rgba(125,216,255,.08);color:var(--text)}
      @media(max-width:980px){.nav{display:flex;align-items:center;gap:6px}.language-switcher{margin-left:auto;margin-right:0;justify-self:auto;position:relative}.nav-toggle{order:4;margin-left:0}.nav-links{right:0}.site-header .language-switcher .language-button{width:44px;height:44px;min-height:44px;padding:0;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important;display:inline-flex;align-items:center;justify-content:center;color:var(--text);gap:0}.site-header .language-switcher .language-button:hover,.site-header .language-switcher.is-open .language-button{border:0!important;background:transparent!important;box-shadow:none!important;color:#8fe7ff}.site-header .language-switcher .language-button>span{display:none!important}.site-header .language-switcher .language-button::before{content:"";display:block;width:22px;height:22px;background:currentColor;-webkit-mask:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3z"/></svg>') center/contain no-repeat;mask:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3z"/></svg>') center/contain no-repeat}.site-header .language-switcher .language-menu{top:calc(100% + 8px);right:-4px}}@media(max-width:520px){.site-header .language-switcher .language-button{width:44px;height:44px;min-height:44px;padding:0}}
    `;
    document.head.appendChild(style);
  }

  function renderSwitcher() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector(".language-switcher")) return;
    const switcher = document.createElement("div");
    switcher.className = "language-switcher";
    switcher.innerHTML = `<button class="language-button" type="button" aria-haspopup="true" aria-expanded="false"><span aria-hidden="true">🌐</span><span class="language-button-label"></span><span aria-hidden="true">▾</span></button><div class="language-menu" role="menu">${languages.map((code) => `<button class="language-option" type="button" data-lang="${code}" role="menuitem"></button>`).join("")}</div>`;
    nav.appendChild(switcher);
    const button = switcher.querySelector(".language-button");
    button.addEventListener("click", () => {
      const open = switcher.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
    });
    switcher.addEventListener("click", (event) => {
      const option = event.target.closest("[data-lang]");
      if (!option) return;
      setLanguage(option.dataset.lang);
      switcher.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("click", (event) => {
      if (switcher.contains(event.target)) return;
      switcher.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function updateSwitcher(lang) {
    const switcher = document.querySelector(".language-switcher");
    if (!switcher) return;
    switcher.querySelector(".language-button-label").textContent = labels[lang] || labels.en;
    switcher.querySelectorAll("[data-lang]").forEach((option) => {
      option.textContent = `${option.dataset.lang === lang ? "✓ " : ""}${labels[option.dataset.lang]}`;
      option.classList.toggle("is-active", option.dataset.lang === lang);
    });
  }

  function translateSimpleText(lang) {
    const map = dict[lang] || {};
    document.querySelectorAll("a,button,div,p,h2,h3,h4,span,th,option,label,strong").forEach((node) => {
      if (node.closest(".language-switcher")) return;
      if (node.children.length) return;
      const current = node.textContent.trim();
      if (!node.dataset.i18nOriginal) node.dataset.i18nOriginal = current;
      const original = node.dataset.i18nOriginal;
      node.textContent = lang === "en" ? original : (map[original] || original);
    });
  }

  function applyHero(lang) {
    const copy = heroCopy[pageId()]?.[lang];
    if (!copy) return;
    const title = document.querySelector(".hero-content h1");
    const subtitle = document.querySelector(".hero-sub,.page-sub");
    if (title) title.innerHTML = `${copy[0]}<br><span>${copy[1]}</span>`;
    if (subtitle) subtitle.textContent = copy[2];
  }

  function syncGiscusLanguage(lang) {
    const value = lang === "ja" ? "ja" : lang === "zh-CN" ? "zh-CN" : lang === "zh-TW" ? "zh-TW" : lang === "ko" ? "ko" : lang === "ru" ? "ru" : "en";
    document.querySelectorAll('script[src*="giscus.app/client.js"]').forEach((script) => { script.dataset.lang = value; });
  }

  function setLanguage(lang) {
    const next = languages.includes(lang) ? lang : "en";
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    renderSwitcher();
    updateSwitcher(next);
    translateSimpleText(next);
    applyHero(next);
    syncGiscusLanguage(next);
  }

  function setupObserver() {
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      window.setTimeout(() => {
        pending = false;
        setLanguage(preferredLanguage());
      }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    injectStyle();
    setLanguage(preferredLanguage());
    setupObserver();
    window.TownGGI18n = { setLanguage };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
