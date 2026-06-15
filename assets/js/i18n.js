const TGG_SUPPORTED_LANGUAGES = ['zh', 'en', 'ja', 'ko', 'ru', 'fr'];
const TGG_LANGUAGE_LABELS = { zh: '中文', en: 'English', ja: '日本語', ko: '한국어', ru: 'Русский', fr: 'Français' };
const TGG_COUNTRY_LANGUAGE_MAP = {
  CN: 'zh', HK: 'zh', TW: 'zh', MO: 'zh',
  JP: 'ja', KR: 'ko',
  RU: 'ru', BY: 'ru', KZ: 'ru',
  FR: 'fr', MC: 'fr', BE: 'fr', CH: 'fr',
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en'
};

const TGG_TEXT = {
  navHome: ['Home', '首页', 'ホーム', '홈', 'Главная', 'Accueil'],
  navMods: ['Mods', '模组', 'Mod', '모드', 'Моды', 'Mods'],
  navGallery: ['Gallery', '图库', 'ギャラリー', '갤러리', 'Галерея', 'Galerie'],
  navLogs: ['Personal Logs', '个人日志', '個人ログ', '개인 로그', 'Личные записи', 'Carnets personnels'],
  navBoard: ['Message Board', '留言板', 'メッセージボード', '메시지 보드', 'Доска сообщений', 'Tableau de messages'],
  navAbout: ['About', '关于', '概要', '소개', 'Обо мне', 'À propos'],
  heroTag: ['Starfield Mod Creator Portfolio', 'Starfield 模组作者作品集', 'Starfield Mod 制作者ポートフォリオ', 'Starfield 모드 제작자 포트폴리오', 'Портфолио автора модов Starfield', 'Portfolio de créateur de mods Starfield'],
  heroTitle: ['TownGG<br><span>Creator Hub</span>', 'TownGG<br><span>创作者中心</span>', 'TownGG<br><span>クリエイターハブ</span>', 'TownGG<br><span>크리에이터 허브</span>', 'TownGG<br><span>Центр автора</span>', 'TownGG<br><span>Hub créateur</span>'],
  heroSub: ['Starfield gameplay systems, immersive world interaction, NASA-punk equipment design and original sci-fi concept art.', 'Starfield 玩法系统、沉浸式世界交互、NASA-punk 装备设计与原创科幻概念艺术。', 'Starfield のゲームプレイシステム、没入型ワールドインタラクション、NASA-punk 装備デザイン、オリジナルSFコンセプトアート。', 'Starfield 게임플레이 시스템, 몰입형 월드 인터랙션, NASA-punk 장비 디자인, 오리지널 SF 콘셉트 아트.', 'Игровые системы Starfield, иммерсивное взаимодействие с миром, NASA-punk дизайн экипировки и оригинальный sci-fi концепт-арт.', 'Systèmes de gameplay Starfield, interactions immersives, design d’équipement NASA-punk et concept art sci-fi original.'],
  viewMods: ['View Mods', '查看模组', 'Modを見る', '모드 보기', 'Смотреть моды', 'Voir les mods'],
  exploreGallery: ['Explore Gallery', '浏览图库', 'ギャラリーを見る', '갤러리 둘러보기', 'Открыть галерею', 'Explorer la galerie'],
  leaveMessage: ['Leave a Message', '留言', 'メッセージを残す', '메시지 남기기', 'Оставить сообщение', 'Laisser un message'],
  metricDownloads: ['Total Downloads', '总下载量', '総ダウンロード数', '총 다운로드', 'Всего загрузок', 'Téléchargements totaux'],
  metricLikes: ['Community Likes', '社区点赞', 'コミュニティいいね', '커뮤니티 좋아요', 'Лайки сообщества', 'Likes communautaires'],
  metricMods: ['Published Mods', '已发布模组', '公開済みMod', '게시된 모드', 'Опубликованные моды', 'Mods publiés'],
  metricPlays: ['Creations Plays', 'Creations 游玩数', 'Creationsプレイ数', 'Creations 플레이', 'Запуски Creations', 'Lectures Creations'],
  latestLogsEyebrow: ['Latest Logs', '最新日志', '最新ログ', '최신 로그', 'Последние записи', 'Derniers carnets'],
  latestLogsTitle: ['Personal Logs', '个人日志', '個人ログ', '개인 로그', 'Личные записи', 'Carnets personnels'],
  latestLogsDesc: ['Recent development stories, release moments and small thoughts from TownGG.', 'TownGG 最近的开发故事、发布瞬间和创作想法。', 'TownGG の最近の開発ストーリー、リリースの瞬間、小さな考え。', 'TownGG의 최근 개발 이야기, 출시 순간, 작은 생각들.', 'Недавние истории разработки, моменты релизов и небольшие мысли TownGG.', 'Histoires de développement récentes, moments de sortie et petites pensées de TownGG.'],
  allLogs: ['All Logs', '全部日志', 'すべてのログ', '모든 로그', 'Все записи', 'Tous les carnets'],
  featuredReleaseEyebrow: ['Featured Release', '精选发布', '注目リリース', '추천 릴리스', 'Избранный релиз', 'Sortie en vedette'],
  featuredReleaseTitle: ['Signature Starfield Experience', '标志性 Starfield 体验', '代表的な Starfield 体験', '대표 Starfield 경험', 'Фирменный опыт Starfield', 'Expérience Starfield signature'],
  featuredReleaseDesc: ['A larger showcase area for the work you most want visitors to notice first.', '用于展示最希望访客第一眼注意到的核心作品区域。', '訪問者に最初に見てほしい作品を大きく見せるためのショーケースエリア。', '방문자가 가장 먼저 보길 원하는 핵심 작품을 크게 보여주는 쇼케이스 영역입니다.', 'Большая витрина для работы, которую вы хотите показать посетителям в первую очередь.', 'Une grande zone de présentation pour l’œuvre que vous voulez mettre en avant en premier.'],
  selectedModsEyebrow: ['Selected Mods', '精选模组', '選定Mod', '선정 모드', 'Избранные моды', 'Mods sélectionnés'],
  selectedModsTitle: ['Nexus Releases', 'Nexus 发布作品', 'Nexus リリース', 'Nexus 릴리스', 'Релизы Nexus', 'Sorties Nexus'],
  selectedModsDesc: ['A short homepage preview of TownGG releases on Nexus Mods, with the full archive living on the Mods page.', '首页展示 TownGG 在 Nexus Mods 上的部分作品，完整归档请进入模组页面。', 'TownGG の Nexus Mods 作品をホームに短く表示し、完全なアーカイブは Mods ページに配置しています。', 'TownGG의 Nexus Mods 작품 일부를 홈에서 미리 보여주며, 전체 아카이브는 Mods 페이지에 있습니다.', 'Короткий предпросмотр релизов TownGG на Nexus Mods; полный архив находится на странице Mods.', 'Un court aperçu en page d’accueil des sorties TownGG sur Nexus Mods, avec l’archive complète sur la page Mods.'],
  allMods: ['All Mods', '全部模组', 'すべてのMod', '모든 모드', 'Все моды', 'Tous les mods'],
  artEyebrow: ['Original Art', '原创艺术', 'オリジナルアート', '오리지널 아트', 'Оригинальное искусство', 'Art original'],
  artTitle: ['Concept Gallery Preview', '概念图库预览', 'コンセプトギャラリープレビュー', '콘셉트 갤러리 미리보기', 'Превью концепт-галереи', 'Aperçu de la galerie concept'],
  artDesc: ['A horizontal preview of selected concept artwork, with the full image wall on the Gallery page.', '精选概念图横向预览，完整图片墙请进入图库页面。', '選定したコンセプトアートの横長プレビュー。完全な画像ウォールはギャラリーページへ。', '선택된 콘셉트 아트의 가로형 미리보기이며, 전체 이미지 월은 갤러리 페이지에서 확인할 수 있습니다.', 'Горизонтальное превью выбранных концепт-артов; полная стена изображений находится в галерее.', 'Un aperçu horizontal d’œuvres conceptuelles sélectionnées, avec le mur complet d’images sur la page Galerie.'],
  openGallery: ['Open Gallery', '打开图库', 'ギャラリーを開く', '갤러리 열기', 'Открыть галерею', 'Ouvrir la galerie'],
  boardEyebrow: ['Message Board', '留言板', 'メッセージボード', '메시지 보드', 'Доска сообщений', 'Tableau de messages'],
  boardTitle: ['Community Notes', '社区留言', 'コミュニティノート', '커뮤니티 노트', 'Заметки сообщества', 'Notes communautaires'],
  boardDesc: ['A public message board powered by GitHub Discussions, synced for every visitor.', '由 GitHub Discussions 驱动的公开留言板，所有访客都可同步查看。', 'GitHub Discussions による公開メッセージボード。すべての訪問者に同期されます。', 'GitHub Discussions 기반 공개 메시지 보드로, 모든 방문자에게 동기화됩니다.', 'Публичная доска сообщений на GitHub Discussions, синхронизированная для каждого посетителя.', 'Un tableau de messages public propulsé par GitHub Discussions, synchronisé pour chaque visiteur.'],
  visitBoard: ['Visit Message Board', '访问留言板', 'ボードを見る', '메시지 보드 방문', 'Перейти к доске', 'Visiter le tableau'],
  feedbackTitle: ['Public Feedback', '公开反馈', '公開フィードバック', '공개 피드백', 'Публичная обратная связь', 'Retours publics'],
  feedbackDesc: ['Open the board to leave release ideas, bug notes, collaboration requests or general feedback.', '进入留言板，留下发布想法、Bug 反馈、合作请求或一般建议。', 'リリース案、バグ報告、コラボ依頼、一般的な意見をボードに残せます。', '릴리스 아이디어, 버그 노트, 협업 요청 또는 일반 피드백을 남길 수 있습니다.', 'Откройте доску, чтобы оставить идеи релизов, баг-репорты, запросы на сотрудничество или общий отзыв.', 'Ouvrez le tableau pour laisser des idées de sortie, notes de bug, demandes de collaboration ou retours généraux.'],
  contactEyebrow: ['Contact', '联系', '連絡先', '연락처', 'Контакты', 'Contact'],
  contactTitle: ['Social Links', '社交链接', 'ソーシャルリンク', '소셜 링크', 'Социальные ссылки', 'Liens sociaux'],
  contactDesc: ['Follow projects, Starfield creations and future updates.', '关注项目、Starfield 创作与未来更新。', 'プロジェクト、Starfield 作品、今後の更新をフォロー。', '프로젝트, Starfield 창작물, 향후 업데이트를 팔로우하세요.', 'Следите за проектами, Starfield creations и будущими обновлениями.', 'Suivez les projets, créations Starfield et futures mises à jour.'],
  footerDesc: ['Bethesda-style immersive systems / NASA-punk industrial design / Starfield gameplay expansion', 'Bethesda 风格沉浸系统 / NASA-punk 工业设计 / Starfield 玩法扩展', 'Bethesda風の没入型システム / NASA-punk インダストリアルデザイン / Starfield ゲームプレイ拡張', 'Bethesda 스타일 몰입형 시스템 / NASA-punk 산업 디자인 / Starfield 게임플레이 확장', 'Иммерсивные системы в стиле Bethesda / NASA-punk индустриальный дизайн / расширение игрового процесса Starfield', 'Systèmes immersifs style Bethesda / design industriel NASA-punk / extension de gameplay Starfield']
};

const TGG_EXTRA_TEXT = {
  'MOD Archive': ['MOD 档案', 'MODアーカイブ', 'MOD 아카이브', 'Архив модов', 'Archive des mods'],
  'Starfield': ['Starfield', 'Starfield', 'Starfield', 'Starfield', 'Starfield'],
  'Full catalog of gameplay systems, world interaction mods, weapons, outfits and character customization work.': ['完整收录玩法系统、世界交互模组、武器、服装与角色自定义作品。', 'ゲームプレイシステム、ワールドインタラクションMod、武器、衣装、キャラクターカスタマイズ作品の完全カタログ。', '게임플레이 시스템, 월드 인터랙션 모드, 무기, 의상, 캐릭터 커스터마이징 작업 전체 카탈로그입니다.', 'Полный каталог игровых систем, модов взаимодействия с миром, оружия, одежды и кастомизации персонажей.', 'Catalogue complet de systèmes de gameplay, mods d’interaction, armes, tenues et personnalisation de personnage.'],
  'Nexus Telemetry': ['Nexus 数据看板', 'Nexus テレメトリ', 'Nexus 텔레메트리', 'Телеметрия Nexus', 'Télémétrie Nexus'],
  'Nexus Mods releases with daily downloads, total downloads and endorsements.': ['展示 Nexus Mods 发布作品的日下载量、总下载量和点赞。', 'Nexus Mods リリースの日次ダウンロード、総ダウンロード、支持数を表示します。', 'Nexus Mods 릴리스의 일일 다운로드, 총 다운로드, 추천 수를 표시합니다.', 'Релизы Nexus Mods с ежедневными загрузками, общими загрузками и одобрениями.', 'Sorties Nexus Mods avec téléchargements quotidiens, téléchargements totaux et endorsements.'],
  'Trend': ['趋势', 'トレンド', '추세', 'Тренд', 'Tendance'],
  'Daily downloads': ['日下载量', '日次ダウンロード', '일일 다운로드', 'Ежедневные загрузки', 'Téléchargements quotidiens'],
  'Total downloads': ['总下载量', '総ダウンロード', '총 다운로드', 'Всего загрузок', 'Téléchargements totaux'],
  'Unique downloads': ['独立下载', 'ユニークダウンロード', '고유 다운로드', 'Уникальные загрузки', 'Téléchargements uniques'],
  'Endorsements': ['点赞', '支持', '추천', 'Одобрения', 'Endorsements'],
  'Nexus Details': ['Nexus 详情', 'Nexus 詳細', 'Nexus 상세', 'Детали Nexus', 'Détails Nexus'],
  'Mod': ['模组', 'Mod', '모드', 'Мод', 'Mod'],
  'Daily': ['每日', '日次', '일일', 'За день', 'Jour'],
  'Total': ['总计', '合計', '전체', 'Всего', 'Total'],
  'Unique': ['独立', 'ユニーク', '고유', 'Уникальные', 'Unique'],
  'Endorse': ['点赞', '支持', '추천', 'Одобрить', 'Endorse'],
  'Bethesda Creations': ['Bethesda Creations', 'Bethesda Creations', 'Bethesda Creations', 'Bethesda Creations', 'Bethesda Creations'],
  'Creation Metrics': ['Creation 数据', 'Creation メトリクス', 'Creation 지표', 'Метрики Creation', 'Métriques Creation'],
  'Creations metrics are captured from rendered Bethesda pages with Playwright when updatedAt and Browser Capture are shown.': ['当页面显示 updatedAt 和 Browser Capture 时，Creations 数据由 Playwright 从 Bethesda 渲染页抓取。', 'updatedAt と Browser Capture が表示される場合、Creations メトリクスは Playwright で Bethesda レンダリングページから取得されます。', 'updatedAt 및 Browser Capture가 표시될 때 Creations 지표는 Playwright로 Bethesda 렌더링 페이지에서 캡처됩니다.', 'Метрики Creations берутся с отрендеренных страниц Bethesda через Playwright при наличии updatedAt и Browser Capture.', 'Les métriques Creations sont capturées depuis les pages Bethesda rendues avec Playwright lorsque updatedAt et Browser Capture sont affichés.'],
  'Creations Ranking': ['Creations 排名', 'Creations ランキング', 'Creations 순위', 'Рейтинг Creations', 'Classement Creations'],
  'Snapshot from Bethesda Creations stats.': ['来自 Bethesda Creations 统计的快照。', 'Bethesda Creations 統計のスナップショット。', 'Bethesda Creations 통계 스냅샷입니다.', 'Снимок статистики Bethesda Creations.', 'Instantané des statistiques Bethesda Creations.'],
  'Likes': ['点赞', 'いいね', '좋아요', 'Лайки', 'Likes'],
  'Downloads': ['下载', 'ダウンロード', '다운로드', 'Загрузки', 'Téléchargements'],
  'Plays': ['游玩', 'プレイ', '플레이', 'Запуски', 'Lectures'],
  'Library Adds': ['加入库', 'ライブラリ追加', '라이브러리 추가', 'Добавления в библиотеку', 'Ajouts à la bibliothèque'],
  'Creation': ['Creation', 'Creation', 'Creation', 'Creation', 'Creation'],
  'Original Art Gallery': ['原创艺术图库', 'オリジナルアートギャラリー', '오리지널 아트 갤러리', 'Галерея оригинального искусства', 'Galerie d’art original'],
  'Concept': ['概念', 'コンセプト', '콘셉트', 'Концепт', 'Concept'],
  'Design': ['设计', 'デザイン', '디자인', 'Дизайн', 'Design'],
  'A dedicated place for original paintings, character studies, weapon concepts, UI moods and environment direction.': ['用于展示原创绘画、角色研究、武器概念、UI 氛围和环境方向的专属空间。', 'オリジナル絵画、キャラクター研究、武器コンセプト、UIムード、環境方向性のための専用スペース。', '오리지널 페인팅, 캐릭터 스터디, 무기 콘셉트, UI 무드, 환경 방향성을 위한 전용 공간입니다.', 'Отдельное место для оригинальных иллюстраций, исследований персонажей, концептов оружия, UI-настроений и окружения.', 'Un espace dédié aux peintures originales, recherches de personnages, concepts d’armes, ambiances UI et directions d’environnement.'],
  'Concept Art': ['概念艺术', 'コンセプトアート', '콘셉트 아트', 'Концепт-арт', 'Concept art'],
  'In-Game Screenshots': ['游戏截图', 'ゲーム内スクリーンショット', '인게임 스크린샷', 'Скриншоты из игры', 'Captures en jeu'],
  'Original sci-fi concepts and production studies.': ['原创科幻概念与制作研究。', 'オリジナルSFコンセプトと制作研究。', '오리지널 SF 콘셉트와 제작 연구.', 'Оригинальные sci-fi концепты и производственные исследования.', 'Concepts sci-fi originaux et études de production.'],
  'About TownGG': ['关于 TownGG', 'TownGG について', 'TownGG 소개', 'О TownGG', 'À propos de TownGG'],
  'Mod Creator': ['模组作者', 'Mod制作者', '모드 제작자', 'Автор модов', 'Créateur de mods'],
  'CUP Founder': ['CUP 创始人', 'CUP創設者', 'CUP 창립자', 'Основатель CUP', 'Fondateur CUP'],
  "I am the creator of the Cassilia Universe Project (CUP), an original Starfield mod series centered around Cassilia, Terminus and the stories that connect them. CUP is built to expand Starfield with lore-friendly characters, weapons, outfits and future story-driven adventures that feel like a natural extension of Bethesda's universe.": ['我是 Cassilia Universe Project（CUP）的创作者，这是一个围绕 Cassilia、Terminus 以及连接它们的故事展开的原创 Starfield 模组系列。CUP 旨在用符合世界观的角色、武器、服装和未来剧情冒险扩展 Starfield，让它像 Bethesda 宇宙的自然延伸。', '私は Cassilia、Terminus、そしてそれらをつなぐ物語を中心にしたオリジナル Starfield Mod シリーズ、Cassilia Universe Project（CUP）の制作者です。CUP は世界観に合うキャラクター、武器、衣装、今後のストーリー主導の冒険で Starfield を自然に拡張するために作られています。', '저는 Cassilia, Terminus, 그리고 이들을 잇는 이야기를 중심으로 한 오리지널 Starfield 모드 시리즈 Cassilia Universe Project(CUP)의 제작자입니다. CUP는 세계관에 어울리는 캐릭터, 무기, 의상, 향후 스토리 중심 모험으로 Starfield를 자연스럽게 확장하기 위해 만들어졌습니다.', 'Я создатель Cassilia Universe Project (CUP), оригинальной серии модов Starfield вокруг Cassilia, Terminus и связывающих их историй. CUP расширяет Starfield лор-дружелюбными персонажами, оружием, костюмами и будущими сюжетными приключениями, которые ощущаются естественным продолжением вселенной Bethesda.', 'Je suis le créateur du Cassilia Universe Project (CUP), une série originale de mods Starfield centrée sur Cassilia, Terminus et les histoires qui les relient. CUP vise à étendre Starfield avec des personnages, armes, tenues et aventures narratives fidèles à l’univers.'],
  'Profile': ['简介', 'プロフィール', '프로필', 'Профиль', 'Profil'],
  'Creator Direction': ['创作方向', '制作方針', '제작 방향', 'Направление автора', 'Direction créative'],
  'TownGG focuses on believable sci-fi experiences that feel naturally integrated into the Starfield universe. The work combines gameplay integration, visual design, PBR material workflows, environmental immersion and interactive UI production.': ['TownGG 专注于可信的科幻体验，让作品自然融入 Starfield 宇宙。创作结合玩法集成、视觉设计、PBR 材质流程、环境沉浸和交互式 UI 制作。', 'TownGG は Starfield 宇宙に自然に溶け込む、説得力のあるSF体験を重視しています。作品はゲームプレイ統合、ビジュアルデザイン、PBRマテリアル、環境没入、インタラクティブUI制作を組み合わせています。', 'TownGG는 Starfield 세계에 자연스럽게 녹아드는 설득력 있는 SF 경험에 집중합니다. 작업은 게임플레이 통합, 비주얼 디자인, PBR 재질 워크플로, 환경 몰입, 인터랙티브 UI 제작을 결합합니다.', 'TownGG фокусируется на убедительных sci-fi впечатлениях, естественно встроенных во вселенную Starfield. Работа объединяет интеграцию геймплея, визуальный дизайн, PBR-материалы, иммерсивное окружение и интерактивный UI.', 'TownGG se concentre sur des expériences sci-fi crédibles, naturellement intégrées à l’univers Starfield. Le travail combine intégration gameplay, design visuel, workflows PBR, immersion environnementale et UI interactive.'],
  'Workflow': ['工作流', 'ワークフロー', '워크플로', 'Рабочий процесс', 'Workflow'],
  'Production Workflow': ['制作流程', '制作ワークフロー', '제작 워크플로', 'Производственный процесс', 'Workflow de production'],
  'From gameplay concepts to in-game implementation, combining gameplay system design, UI iteration and Bethesda Creation Kit integration.': ['从玩法概念到游戏内实现，结合玩法系统设计、UI 迭代和 Bethesda Creation Kit 集成。', 'ゲームプレイコンセプトからゲーム内実装まで、システム設計、UI反復、Bethesda Creation Kit 統合を組み合わせます。', '게임플레이 콘셉트부터 인게임 구현까지, 시스템 설계, UI 반복, Bethesda Creation Kit 통합을 결합합니다.', 'От игровых концепций до реализации в игре: дизайн систем, итерации UI и интеграция Bethesda Creation Kit.', 'Du concept gameplay à l’implémentation en jeu, combinant design système, itération UI et intégration Bethesda Creation Kit.'],
  'Concept Design': ['概念设计', 'コンセプトデザイン', '콘셉트 디자인', 'Концепт-дизайн', 'Conception'],
  'Gameplay ideas, immersion direction, character lore and visual planning.': ['玩法想法、沉浸方向、角色设定与视觉规划。', 'ゲームプレイ案、没入方向、キャラクター設定、ビジュアル計画。', '게임플레이 아이디어, 몰입 방향, 캐릭터 설정, 비주얼 계획.', 'Идеи геймплея, направление иммерсии, лор персонажей и визуальное планирование.', 'Idées gameplay, direction d’immersion, lore personnage et planification visuelle.'],
  'Asset Creation': ['资产制作', 'アセット制作', '에셋 제작', 'Создание ассетов', 'Création d’assets'],
  'Modeling, texturing and NASA-punk material development.': ['建模、贴图与 NASA-punk 材质开发。', 'モデリング、テクスチャ、NASA-punk マテリアル制作。', '모델링, 텍스처링, NASA-punk 재질 개발.', 'Моделирование, текстуры и разработка материалов NASA-punk.', 'Modélisation, texturing et développement de matériaux NASA-punk.'],
  'Integration': ['集成', '統合', '통합', 'Интеграция', 'Intégration'],
  'Gameplay systems, UI implementation and Creation Kit setup.': ['玩法系统、UI 实现与 Creation Kit 配置。', 'ゲームプレイシステム、UI実装、Creation Kit設定。', '게임플레이 시스템, UI 구현, Creation Kit 설정.', 'Игровые системы, реализация UI и настройка Creation Kit.', 'Systèmes de gameplay, implémentation UI et configuration Creation Kit.'],
  'Testing': ['测试', 'テスト', '테스트', 'Тестирование', 'Tests'],
  'Optimization, balancing and Xbox compatibility testing.': ['优化、平衡与 Xbox 兼容性测试。', '最適化、バランス調整、Xbox互換性テスト。', '최적화, 밸런싱, Xbox 호환성 테스트.', 'Оптимизация, балансировка и тестирование совместимости Xbox.', 'Optimisation, équilibrage et tests de compatibilité Xbox.'],
  'Site Telemetry': ['站点数据', 'サイトテレメトリ', '사이트 텔레메트리', 'Телеметрия сайта', 'Télémétrie du site'],
  'Portfolio Traffic': ['作品集访问数据', 'ポートフォリオトラフィック', '포트폴리오 트래픽', 'Трафик портфолио', 'Trafic du portfolio'],
  'Privacy-safe public traffic data for the TownGG portfolio.': ['TownGG 作品集的隐私安全公开访问数据。', 'TownGG ポートフォリオのプライバシー安全な公開トラフィックデータ。', 'TownGG 포트폴리오의 개인정보 안전 공개 트래픽 데이터입니다.', 'Публичные безопасные для приватности данные трафика портфолио TownGG.', 'Données publiques de trafic respectueuses de la confidentialité pour le portfolio TownGG.'],
  'Visits': ['访问', '訪問', '방문', 'Визиты', 'Visites'],
  'Requests': ['请求', 'リクエスト', '요청', 'Запросы', 'Requêtes'],
  'Bandwidth Served': ['带宽流量', '配信帯域', '제공 대역폭', 'Переданный трафик', 'Bande passante servie'],
  'Cache Hit Rate': ['缓存命中率', 'キャッシュヒット率', '캐시 적중률', 'Доля попаданий кэша', 'Taux de cache'],
  '7-Day Visits Trend': ['7 日访问趋势', '7日間訪問トレンド', '7일 방문 추세', 'Тренд визитов за 7 дней', 'Tendance des visites sur 7 jours'],
  'No individual visitor data, IP addresses, logs or security events are displayed.': ['不展示任何个人访客数据、IP 地址、日志或安全事件。', '個別訪問者データ、IPアドレス、ログ、セキュリティイベントは表示されません。', '개별 방문자 데이터, IP 주소, 로그, 보안 이벤트는 표시되지 않습니다.', 'Индивидуальные данные посетителей, IP-адреса, журналы и события безопасности не отображаются.', 'Aucune donnée visiteur individuelle, adresse IP, journal ou événement de sécurité n’est affiché.'],
  'Community Terminal': ['社区终端', 'コミュニティ端末', '커뮤니티 터미널', 'Терминал сообщества', 'Terminal communautaire'],
  'Leave feedback, ideas, collaboration notes or requests for future Starfield releases.': ['留下反馈、想法、合作说明或未来 Starfield 发布请求。', 'フィードバック、アイデア、コラボメモ、今後の Starfield リリースへの要望を残せます。', '피드백, 아이디어, 협업 메모 또는 향후 Starfield 릴리스 요청을 남기세요.', 'Оставляйте отзывы, идеи, заметки о сотрудничестве или запросы для будущих релизов Starfield.', 'Laissez retours, idées, notes de collaboration ou demandes pour de futures sorties Starfield.'],
  'Public Board': ['公开留言板', '公開ボード', '공개 보드', 'Публичная доска', 'Tableau public'],
  'Community Messages': ['社区消息', 'コミュニティメッセージ', '커뮤니티 메시지', 'Сообщения сообщества', 'Messages communautaires'],
  'Messages are synced through GitHub Discussions, so every visitor sees the same public board.': ['消息通过 GitHub Discussions 同步，因此每位访客都能看到同一个公开留言板。', 'メッセージは GitHub Discussions で同期され、すべての訪問者が同じ公開ボードを見られます。', '메시지는 GitHub Discussions를 통해 동기화되므로 모든 방문자가 같은 공개 보드를 봅니다.', 'Сообщения синхронизируются через GitHub Discussions, поэтому каждый посетитель видит одну и ту же публичную доску.', 'Les messages sont synchronisés via GitHub Discussions afin que chaque visiteur voie le même tableau public.'],
  'Feedback, ideas and future project notes.': ['反馈、想法与未来项目记录。', 'フィードバック、アイデア、今後のプロジェクトメモ。', '피드백, 아이디어, 향후 프로젝트 노트.', 'Отзывы, идеи и заметки будущих проектов.', 'Retours, idées et notes de futurs projets.'],
  'Thoughts, development stories and random moments from TownGG.': ['TownGG 的想法、开发故事和随手记录。', 'TownGG の考え、開発ストーリー、日々の瞬間。', 'TownGG의 생각, 개발 이야기, 소소한 순간들.', 'Мысли, истории разработки и случайные моменты от TownGG.', 'Pensées, histoires de développement et moments aléatoires de TownGG.'],
  'Active Projects': ['活跃项目', '進行中プロジェクト', '활성 프로젝트', 'Активные проекты', 'Projets actifs'],
  'Latest Entry': ['最新条目', '最新エントリー', '최신 항목', 'Последняя запись', 'Dernière entrée'],
  'Total Notes': ['日志总数', 'ノート総数', '총 노트', 'Всего заметок', 'Notes totales'],
  'Journal': ['日志', 'ジャーナル', '저널', 'Журнал', 'Journal'],
  'A personal creator journal for development stories, releases, lore and website progress.': ['记录开发故事、发布、设定和网站进度的个人创作者日志。', '開発ストーリー、リリース、ロア、サイト進捗の個人クリエイタージャーナル。', '개발 이야기, 릴리스, 로어, 웹사이트 진행 상황을 담은 개인 제작자 저널입니다.', 'Личный журнал автора для историй разработки, релизов, лора и прогресса сайта.', 'Journal personnel de créateur pour histoires de développement, sorties, lore et progression du site.'],
  'Timeline': ['时间线', 'タイムライン', '타임라인', 'Хронология', 'Chronologie'],
  'Recent Milestones': ['近期里程碑', '最近のマイルストーン', '최근 마일스톤', 'Недавние этапы', 'Jalons récents'],
  'Personal logs, modding stories and Cassilia Universe fragments': ['个人日志、模组故事与 Cassilia 宇宙碎片', '個人ログ、Mod制作ストーリー、Cassilia Universeの断片', '개인 로그, 모딩 이야기, Cassilia Universe 조각', 'Личные записи, истории моддинга и фрагменты Cassilia Universe', 'Carnets personnels, histoires de modding et fragments de l’univers Cassilia'],
  'Comments': ['评论', 'コメント', '댓글', 'Комментарии', 'Commentaires'],
  'Discussion': ['讨论', 'ディスカッション', '토론', 'Обсуждение', 'Discussion'],
  'GitHub login is used for replies, reactions and article-specific comments.': ['回复、表情回应和文章评论需要使用 GitHub 登录。', '返信、リアクション、記事別コメントには GitHub ログインを使用します。', '답글, 반응, 글별 댓글에는 GitHub 로그인을 사용합니다.', 'Для ответов, реакций и комментариев к статье используется вход GitHub.', 'La connexion GitHub est utilisée pour les réponses, réactions et commentaires propres à l’article.'],
  'Read More': ['阅读全文', '続きを読む', '더 읽기', 'Читать далее', 'Lire la suite'],
  'Back to Personal Logs': ['返回个人日志', '個人ログへ戻る', '개인 로그로 돌아가기', 'Назад к личным записям', 'Retour aux carnets'],
  'Previous Article': ['上一篇', '前の記事', '이전 글', 'Предыдущая статья', 'Article précédent'],
  'Next Article': ['下一篇', '次の記事', '다음 글', 'Следующая статья', 'Article suivant'],
  'Quest': ['任务', 'クエスト', '퀘스트', 'Квест', 'Quête'],
  'Gameplay': ['玩法', 'ゲームプレイ', '게임플레이', 'Геймплей', 'Gameplay'],
  'Clothing': ['服装', '衣装', '의상', 'Одежда', 'Vêtements'],
  'Translation': ['翻译', '翻訳', '번역', 'Перевод', 'Traduction'],
  'Weapon': ['武器', '武器', '무기', 'Оружие', 'Arme'],
  'Boss Fight': ['Boss 战', 'ボス戦', '보스전', 'Босс-файт', 'Combat de boss'],
  'Skill': ['技能', 'スキル', '스킬', 'Навык', 'Compétence'],
  'Legendary Effect': ['传奇效果', 'レジェンダリー効果', '전설 효과', 'Легендарный эффект', 'Effet légendaire'],
  'Constellation': ['群星组织', 'コンステレーション', '컨스텔레이션', 'Созвездие', 'Constellation'],
  'Bodysuit': ['连体衣', 'ボディスーツ', '바디수트', 'Боди', 'Bodysuit'],
  'Textures': ['贴图', 'テクスチャ', '텍스처', 'Текстуры', 'Textures'],
  'Standalone Suit': ['独立套装', 'スタンドアロンスーツ', '독립 슈트', 'Самостоятельный костюм', 'Tenue indépendante'],
  'Lingerie': ['内衣', 'ランジェリー', '란제리', 'Бельё', 'Lingerie'],
  'Adult': ['成人', '成人向け', '성인', 'Для взрослых', 'Adulte'],
  'Outfit': ['服装', '衣装', '의상', 'Наряд', 'Tenue'],
  'Robot': ['机器人', 'ロボット', '로봇', 'Робот', 'Robot'],
  'Combat': ['战斗', '戦闘', '전투', 'Бой', 'Combat'],
  'Chinese': ['中文', '中国語', '중국어', 'Китайский', 'Chinois'],
  'Auto Synced': ['自动同步', '自動同期', '자동 동기화', 'Автосинхронизация', 'Synchronisé automatiquement'],
  'New weapon starborn sword: TERMINUS / New location to explore / Extremely challenging boss': ['新增星裔剑类武器：TERMINUS / 新可探索地点 / 极具挑战性的 Boss', '新武器・星裔の剣：TERMINUS / 新探索エリア / 非常に手強いボス', '신규 무기 스타본 검: TERMINUS / 새로운 탐험 장소 / 매우 도전적인 보스', 'Новое оружие — меч звездорождённых TERMINUS / Новая локация / Очень сложный босс', 'Nouvelle arme, épée astrienne : TERMINUS / Nouveau lieu à explorer / Boss extrêmement difficile'],
  'A mysterious dateslate placed in The Lodge points toward an unknown Starborn. Its trail leads to a forgotten place. There rests \'TERMINUS,\' a relic blade once responsible for conflict among the Starborn. THE END IS MERELY THE BEGINNING...': ['放置在陋室的一块神秘数据板指向一名未知星裔。线索通往一处被遗忘之地。在那里沉睡着“TERMINUS”，一把曾引发星裔冲突的遗物之刃。终点，只是开始……', 'ロッジに置かれた謎のデータスレートが、未知のスターボーンを指し示す。その痕跡は忘れられた場所へ続く。そこに眠るのは、かつてスターボーン同士の争いを招いた遺物の刃「TERMINUS」。終わりは、始まりにすぎない……', '로지에 놓인 수수께끼의 데이터슬레이트가 미지의 스타본을 가리킨다. 그 흔적은 잊힌 장소로 이어진다. 그곳에는 한때 스타본 간의 갈등을 일으켰던 유물 검 “TERMINUS”가 잠들어 있다. 끝은 단지 시작일 뿐……', 'Таинственный датаслейт в Ложе указывает на неизвестного Звездорождённого. След ведёт в забытое место. Там покоится «TERMINUS» — реликтовый клинок, когда-то ставший причиной конфликта среди Звездорождённых. Конец — лишь начало...', 'Un mystérieux dataslate placé dans la Loge mène vers un Astrien inconnu. Sa piste conduit à un lieu oublié. Là repose « TERMINUS », une lame relique autrefois responsable d’un conflit entre Astriens. LA FIN N’EST QUE LE COMMENCEMENT...'],
  'New skill & New legendary weapon effect': ['新增技能与新增传奇武器效果', '新スキル＆新レジェンダリー武器効果', '신규 스킬 & 신규 전설 무기 효과', 'Новый навык и новый легендарный эффект оружия', 'Nouvelle compétence et nouvel effet légendaire d’arme'],
  'A weathered Constellation uniform once worn by Cassilia': ['Cassilia 曾穿过的一套旧群星组织制服', 'Cassilia がかつて着ていた風化したコンステレーション制服', 'Cassilia가 한때 입었던 낡은 컨스텔레이션 유니폼', 'Потрёпанная форма Созвездия, которую когда-то носила Cassilia', 'Un uniforme Constellation usé autrefois porté par Cassilia'],
  'a bodysuit': ['一套连体衣', 'ボディスーツ', '바디수트', 'Боди', 'Un bodysuit'],
  'A stand alone suit': ['一套独立套装', 'スタンドアロンのスーツ', '독립 슈트', 'Самостоятельный костюм', 'Une tenue indépendante'],
  'Premium custom black silk lingerie release for Starfield.': ['为 Starfield 制作的高级定制黑色丝质内衣。', 'Starfield 向けの高品質カスタム黒シルクランジェリー。', 'Starfield용 프리미엄 커스텀 블랙 실크 란제리입니다.', 'Премиальный кастомный комплект чёрного шёлкового белья для Starfield.', 'Lingerie noire en soie personnalisée premium pour Starfield.'],
  'Automatically synced from Nexus Mods.': ['从 Nexus Mods 自动同步。', 'Nexus Mods から自動同期。', 'Nexus Mods에서 자동 동기화됨.', 'Автоматически синхронизировано с Nexus Mods.', 'Synchronisé automatiquement depuis Nexus Mods.'],
  'Just for female': ['仅女性角色使用', '女性キャラクター専用', '여성 캐릭터 전용', 'Только для женских персонажей', 'Pour personnage féminin uniquement'],
  'Find it in Lodge': ['可在陋室找到', 'ロッジで入手可能', '로지에서 찾을 수 있습니다', 'Можно найти в Ложе', 'À trouver dans la Loge'],
  'You can deploy robots to assist you in combat.': ['可以部署机器人协助战斗。', '戦闘を支援するロボットを展開できます。', '전투를 돕는 로봇을 배치할 수 있습니다.', 'Можно развернуть роботов для помощи в бою.', 'Vous pouvez déployer des robots pour vous assister en combat.'],
  'Chinese translation patch.': ['中文翻译补丁。', '中国語翻訳パッチ。', '중국어 번역 패치입니다.', 'Патч китайского перевода.', 'Patch de traduction chinoise.'],
  'Filter': ['筛选', 'フィルター', '필터', 'Фильтр', 'Filtrer'],
  'All': ['全部', 'すべて', '전체', 'Все', 'Tous'],
  'All releases': ['全部发布', 'すべてのリリース', '모든 릴리스', 'Все релизы', 'Toutes les sorties'],
  'No images yet': ['暂无图片', 'まだ画像がありません', '아직 이미지가 없습니다', 'Изображений пока нет', 'Pas encore d’images'],
  'In-game screenshots will be added here soon.': ['游戏内截图将很快添加到这里。', 'ゲーム内スクリーンショットは近日追加予定です。', '인게임 스크린샷이 곧 여기에 추가됩니다.', 'Скриншоты из игры скоро появятся здесь.', 'Des captures en jeu seront bientôt ajoutées ici.'],
  'Nexus dashboard data could not be loaded.': ['无法加载 Nexus 数据看板。', 'Nexus ダッシュボードデータを読み込めませんでした。', 'Nexus 대시보드 데이터를 불러올 수 없습니다.', 'Не удалось загрузить данные панели Nexus.', 'Impossible de charger les données du tableau Nexus.'],
  'No Nexus data available yet.': ['暂无 Nexus 数据。', 'Nexus データはまだありません。', '아직 Nexus 데이터가 없습니다.', 'Данных Nexus пока нет.', 'Aucune donnée Nexus pour le moment.']
};

const LANG_INDEX = { en: 0, zh: 1, ja: 2, ko: 3, ru: 4, fr: 5 };
const TGG_I18N = Object.fromEntries(TGG_SUPPORTED_LANGUAGES.map((lang) => [lang, Object.fromEntries(Object.entries(TGG_TEXT).map(([key, values]) => [key, values[LANG_INDEX[lang]] || values[0]]))]));
const TGG_TEXT_REPLACEMENTS = Object.fromEntries(Object.entries({ ...Object.fromEntries(Object.values(TGG_TEXT).map((values) => [values[0], values.slice(1)])), ...TGG_EXTRA_TEXT }).map(([english, values]) => [english, { zh: values[0], ja: values[1], ko: values[2], ru: values[3], fr: values[4], en: english }]));

let tggCurrentLanguage = 'en';
let tggObserver;
let tggApplying = false;

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

function injectLanguageSwitcher() {
  const nav = document.querySelector('.site-header .nav');
  if (!nav || document.querySelector('[data-language-switcher]')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'language-switcher';
  wrapper.dataset.languageSwitcher = '';
  wrapper.innerHTML = `
    <button class="language-toggle" type="button" data-language-toggle aria-expanded="false">
      <span class="language-icon" aria-hidden="true">🌐</span>
      <span data-current-language>English</span>
    </button>
    <div class="language-menu" data-language-menu hidden>
      <button type="button" data-language-option="zh">中文</button>
      <button type="button" data-language-option="en">English</button>
      <button type="button" data-language-option="ja">日本語</button>
      <button type="button" data-language-option="ko">한국어</button>
      <button type="button" data-language-option="ru">Русский</button>
      <button type="button" data-language-option="fr">Français</button>
    </div>`;
  nav.appendChild(wrapper);
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

function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest('[data-keep-english], .card-title, .featured-title, .creation-bar span')) return true;
  if (parent.closest('script, style, textarea, input, select, option')) return true;
  const projectCardTitle = parent.matches('h3') && parent.closest('.project-card');
  if (projectCardTitle) return true;
  return false;
}

function translatePlainText(root = document) {
  if (tggCurrentLanguage === 'en') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue.trim();
      return TGG_TEXT_REPLACEMENTS[text] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const original = node.nodeValue.trim();
    const translated = TGG_TEXT_REPLACEMENTS[original]?.[tggCurrentLanguage];
    if (translated) node.nodeValue = node.nodeValue.replace(original, translated);
  });
}

function applyLanguage(lang, options = {}) {
  const nextLang = normalizeLanguage(lang);
  tggCurrentLanguage = nextLang;
  const dict = TGG_I18N[nextLang] || TGG_I18N.en;
  document.documentElement.lang = nextLang === 'zh' ? 'zh-CN' : nextLang;

  tggApplying = true;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    const value = dict[key] || TGG_I18N.en[key];
    if (value) element.innerHTML = value;
  });
  translatePlainText(document.body);
  tggApplying = false;

  setLanguageButton(nextLang);
  if (options.persist !== false) localStorage.setItem('towngg_language', nextLang);
  window.tggCurrentLanguage = nextLang;
  window.dispatchEvent(new CustomEvent('towngg:languagechange', { detail: { lang: nextLang } }));
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
  injectLanguageSwitcher();
  const toggle = document.querySelector('[data-language-toggle]');
  const menu = document.querySelector('[data-language-menu]');
  if (!toggle || !menu || toggle.dataset.ready) return;
  toggle.dataset.ready = 'true';

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

function setupMutationTranslation() {
  if (tggObserver) return;
  tggObserver = new MutationObserver((mutations) => {
    if (tggApplying || tggCurrentLanguage === 'en') return;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) translatePlainText(node);
        if (node.nodeType === Node.TEXT_NODE && !shouldSkipTextNode(node)) {
          const original = node.nodeValue.trim();
          const translated = TGG_TEXT_REPLACEMENTS[original]?.[tggCurrentLanguage];
          if (translated) node.nodeValue = node.nodeValue.replace(original, translated);
        }
      });
    });
  });
  tggObserver.observe(document.body, { childList: true, subtree: true });
}

async function initTownGGLanguage() {
  setupLanguageMenu();
  setupMutationTranslation();
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang && TGG_SUPPORTED_LANGUAGES.includes(urlLang)) return applyLanguage(urlLang);
  const savedLang = localStorage.getItem('towngg_language');
  if (savedLang && TGG_SUPPORTED_LANGUAGES.includes(savedLang)) return applyLanguage(savedLang);
  applyLanguage('en', { persist: false });
  const detectedLang = await detectLanguageByIp();
  applyLanguage(detectedLang, { persist: false });
}

window.tggTranslate = (text) => TGG_TEXT_REPLACEMENTS[text]?.[tggCurrentLanguage] || text;
window.tggApplyLanguage = applyLanguage;

document.addEventListener('DOMContentLoaded', initTownGGLanguage);
