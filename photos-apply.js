// photos-apply.js — 案ごとにトンマナの異なる写真プールを .ph 要素へ動的に適用する
// 仕様：
//   1) <body data-design="case1|case2|case3"> で案を判定（無ければ document.title から推定）
//   2) data-label のキーワードからカテゴリを決定（既存ルール踏襲）
//   3) 案ごとに別プールから写真を選択し、background-image として注入
//   4) 「本社」スロット（office カテゴリ）は写真ではなく Google マップ埋め込み iframe を挿入
//   5) オーバーレイは案ごとに濃度／色味を変える
//
// 写真選定方針（すべて preview で目視検証済み 2026-05-23）：
//   案1 地域実直   … 日本の地方・川辺・人の気配。暖色寄り。
//   案2 清潔モダン … 都市インフラ・大型建設・直線美。高彩度。
//   案3 編集デザイン … 静かな水辺・モノクロ的な風景。余白・墨×象牙。
// 被写体は文意に正確に対応：
//   river=広い河川／road=アスファルト舗装現場／mountain=斜面工事・法枠工／
//   stone=石壁／pipe=大型ヒューム管／wall=コンクリート擁壁／hero=日本の風景

(function () {
  // ───── print=1 モード：PDF 出力時のレイアウト調整 ─────
  // ?print=1 を付けて開くと、reveal アニメで隠れている要素を即座に表示し、
  // sticky/fixed ヘッダーを通常配置にして、@page を縦長一枚に設定する。
  const PRINT_MODE = (() => {
    try { return new URLSearchParams(location.search).has('print'); } catch (e) { return false; }
  })();

  if (PRINT_MODE) {
    // PDF 出力時：reveal 解除＋sticky 解除＋十分に大きい @page を即座に設定
    // 各案の実測値（案1=6818, 案2=8153, 案3=9162 CSS px @ 1280幅）を踏まえ、
    // 一律 12000px の @page でカバー。下端に余白が出ても 1 枚物の縦長 PDF を優先する。
    const ps = document.createElement('style');
    ps.id = 'print-prep-style';
    ps.textContent = [
      '.reveal, .reveal-up, .reveal-in, [class*="reveal"] {',
      '  opacity: 1 !important;',
      '  transform: none !important;',
      '  visibility: visible !important;',
      '}',
      'header, .header, .site-header, .nav, nav {',
      '  position: static !important;',
      '}',
      '* { animation: none !important; transition: none !important; }',
      '@page { size: 1280px 30000px; margin: 0; }',
      'html, body { min-width: 1280px !important; width: 1280px !important; }',
      // Chrome --print-to-pdf のレイアウトビューポートが約 816px と狭くなり、
      // モバイル用 @media が誤って効いてヒーローが 1 カラムに崩れるのを防ぐ。
      '.hero-grid { grid-template-columns: 1.5fr 1fr !important; align-items: center !important; gap: 48px !important; }',
      '.hero h1 { font-size: 44px !important; line-height: 1.3 !important; letter-spacing: 0.01em !important; }',
      '.nav-toggle { display: none !important; }',
      '.container, .container-narrow { width: 1216px !important; max-width: 1216px !important; margin-left: auto !important; margin-right: auto !important; }',
      '@media print {',
      '  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0 !important; }',
      '  html { margin: 0 !important; }',
      '}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(ps);
  }

  const U = (id, w = 1400) =>
    `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop&crop=entropy`;

  // 本社住所（3案共通）
  const HQ_ADDRESS = '茨城県神栖市土合中央3-7-4';
  const MAP_EMBED_URL =
    'https://maps.google.com/maps?q=' +
    encodeURIComponent(HQ_ADDRESS) +
    '&output=embed';

  // ───────── 案1：地域実直（温かみ・地域・人）─────────
  const POOLS_CASE1 = {
    hero: [
      'assets/case1-hero.jpg', // ユーザー提供：日本の現場・作業員・山並み（地に足のついた実写）
      U('1727359223300-a9d08f38671d'), // 予備：日本の海岸＋堤防
    ],
    river: [
      U('1727359223300-a9d08f38671d'), // 同 — 河口・堤防・海の組み合わせ
      U('1597914428299-01a2ac896b07'), // 草原と橋のある日本の河川
    ],
    road: [
      U('1708117390188-d1547de962be'), // 緑色のフィニッシャー＋作業員
    ],
    mountain: [
      U('1706338263959-113d62bfc9ae'), // 植生で覆われた法面と石組み
    ],
    stone: [
      U('1697497710118-0d5cb5a7094a'), // 暖色系の石積み
    ],
    pipe: [
      U('1749229453406-33ca17ee32d6'), // 大型ヒューム管と緑地
    ],
    wall: [
      U('1623769334382-d602a40f0327'), // コンクリート擁壁＋足元の草
    ],
    site: [
      U('1708117390188-d1547de962be'), // 舗装現場の作業員（人の気配）
    ],
  };

  // ───────── 案2：清潔モダン（白基調・直線・大型）─────────
  const POOLS_CASE2 = {
    hero: [
      U('1759603955894-0e874a184e57'), // 大型吊橋を仰ぐ
    ],
    river: [
      U('1691684106910-4c539b4e26a8'), // 日本の高速道路と河川
    ],
    road: [
      U('1706712637075-f47fb47548f2'), // 直線道路上の舗装機械
    ],
    mountain: [
      U('1758858534177-ac4a1cb29263'), // 法枠工（コンクリート格子の斜面）
    ],
    stone: [
      U('1605932870425-8c18882e1e49'), // 大判で清潔感のある石材
    ],
    pipe: [
      U('1572488501918-90520ef09349'), // 大型ヒューム管が並ぶ資材ヤード
    ],
    wall: [
      U('1746160934129-36b73b974228'), // 青空に伸びる直線の擁壁
    ],
    site: [
      U('1662351903413-0ad4f6bfe2ef'), // 東京の高層ビル群と大型クレーン
    ],
  };

  // ───────── 案3：編集デザイン（墨×象牙・物語性）─────────
  const POOLS_CASE3 = {
    hero: [
      U('1740328144438-24d078c3bf40'), // 夕景の静かな海と岩（編集調）
    ],
    river: [
      U('1609359923548-cd7fe10364eb'), // 広い河川を斜めに切る堤防
    ],
    road: [
      U('1708117242652-25dc76c4b30c'), // 空と道、編集調のワイドショット
    ],
    mountain: [
      U('1758858534177-ac4a1cb29263'), // 法枠工（幾何学的な編集感）
    ],
    stone: [
      U('1657401972566-6679de283e1b'), // テクスチャの効いた石壁
    ],
    pipe: [
      U('1522544692312-8b3f91dbf24a'), // ヒューム管とランドスケープ（編集調）
    ],
    wall: [
      U('1768751947810-fd47fe2fac11'), // 苔むした古い擁壁（時間の経過）
    ],
    site: [
      U('1708117242652-25dc76c4b30c'), // ワイドショットの道路（編集調）
    ],
  };

  // ───────── 案4：シネマティック（ダーク基調、橙アクセント）─────────
  // 案2 のプールをベースに大型・俯瞰寄りを選び、橙×墨のトンマナと合わせる
  const POOLS_CASE4 = {
    hero: [
      U('1609359923548-cd7fe10364eb'), // 広い河川と斜めの堤防（フルブリード用）
      U('1759603955894-0e874a184e57'), // 吊橋
    ],
    river: [
      U('1691684106910-4c539b4e26a8'),
      U('1609359923548-cd7fe10364eb'),
    ],
    road: [
      U('1706712637075-f47fb47548f2'),
      U('1708117242652-25dc76c4b30c'),
    ],
    mountain: [
      U('1758858534177-ac4a1cb29263'),
    ],
    stone: [
      U('1605932870425-8c18882e1e49'),
    ],
    pipe: [
      U('1572488501918-90520ef09349'),
    ],
    wall: [
      U('1746160934129-36b73b974228'),
    ],
    site: [
      U('1662351903413-0ad4f6bfe2ef'),
    ],
  };

  // ───────── 案ごとのオーバーレイ ─────────
  const OVERLAY = {
    case1: 'linear-gradient(rgba(53,85,69,0.06), rgba(53,85,69,0.06))',
    case2: 'linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.04))',
    case3: 'linear-gradient(rgba(20,20,20,0.20), rgba(20,20,20,0.20))',
    case4: 'linear-gradient(rgba(15,18,22,0.40), rgba(15,18,22,0.40))',
  };

  // ───────── ラベル → カテゴリ ─────────
  const RULES = [
    { keys: ['鹿島灘', '堤防', '河川', 'RIVER', '利根川'], cat: 'river' },
    { keys: ['MAIN', 'COVER', 'ヒーロー', 'fig.01', 'FEATURE'], cat: 'hero' },
    { keys: ['舗装', 'PAVING', '市道', '路面'], cat: 'road' },
    { keys: ['治山', 'EROSION', '山腹'], cat: 'mountain' },
    { keys: ['石工事', '石張り', 'STONE', '石'], cat: 'stone' },
    { keys: ['下水道', '水道', 'SEWER', 'WATER', '配管'], cat: 'pipe' },
    { keys: ['擁壁', 'WALL', '土木'], cat: 'wall' },
    { keys: ['事務所', '本社', 'HEAD OFFICE', '神栖市'], cat: 'office' },
    { keys: ['現場', 'CIVIL ENGINEERING', '01'], cat: 'site' },
  ];

  function pickCategory(label) {
    for (const r of RULES) {
      if (r.keys.some((k) => label.includes(k))) return r.cat;
    }
    return 'site';
  }

  function detectDesign() {
    const ds = document.body && document.body.dataset && document.body.dataset.design;
    if (ds === 'case1' || ds === 'case2' || ds === 'case3' || ds === 'case4') return ds;
    const hint = (document.title || '') + ' ' + (location.pathname || '');
    if (hint.includes('case4') || hint.includes('cinematic') || hint.includes('案4') || hint.includes('シネマ')) return 'case4';
    if (hint.includes('case1') || hint.includes('案1') || hint.includes('地域実直') || hint.includes('local')) return 'case1';
    if (hint.includes('case2') || hint.includes('案2') || hint.includes('清潔モダン') || hint.includes('modern')) return 'case2';
    if (hint.includes('case3') || hint.includes('案3') || hint.includes('編集') || hint.includes('editorial')) return 'case3';
    return 'case1';
  }

  function getPool(design) {
    if (design === 'case2') return POOLS_CASE2;
    if (design === 'case3') return POOLS_CASE3;
    if (design === 'case4') return POOLS_CASE4;
    return POOLS_CASE1;
  }

  // ───────── 本社スロット：Google マップ埋め込みを差し込む ─────────
  // 通常はライブの iframe を挿入。print=1 モード時はヘッドレス Chrome では
  // iframe ロードが PDF 出力に間に合わないため、事前生成した静止画 PNG を使う。
  function applyOfficeMap(el) {
    el.classList.add('ph-map');
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.style.backgroundImage = 'none';
    el.innerHTML = '';

    if (PRINT_MODE) {
      const img = document.createElement('img');
      img.src = 'assets/map-static.png';
      img.alt = '本社所在地マップ：' + HQ_ADDRESS;
      img.style.cssText =
        'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;';
      el.appendChild(img);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = MAP_EMBED_URL;
    iframe.title = '本社所在地マップ：' + HQ_ADDRESS;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    iframe.style.cssText =
      'position:absolute; inset:0; width:100%; height:100%; border:0; display:block;';
    el.appendChild(iframe);
  }

  // ph-map の ::after を消すための1行スタイルを注入（CSSファイルを触らずに済ませる）
  function injectMapStyle() {
    if (document.getElementById('ph-map-style')) return;
    const s = document.createElement('style');
    s.id = 'ph-map-style';
    s.textContent = `.ph.ph-map::before, .ph.ph-map::after { content: none !important; display: none !important; }`;
    document.head.appendChild(s);
  }

  function apply() {
    injectMapStyle();
    const design = detectDesign();
    const pools = getPool(design);
    const overlay = OVERLAY[design] || OVERLAY.case1;
    const used = {};
    document.querySelectorAll('.ph').forEach((el) => {
      const label = el.dataset.label || '';
      const cat = pickCategory(label);

      if (cat === 'office') {
        applyOfficeMap(el);
        return;
      }

      const pool = pools[cat] || pools.site;
      used[cat] = used[cat] || 0;
      const url = pool[used[cat] % pool.length];
      used[cat]++;
      el.style.backgroundImage = `${overlay}, url("${url}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
