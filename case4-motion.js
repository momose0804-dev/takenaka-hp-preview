// case4-motion.js — 案4 「フルスクリーン × モーションリッチ」専用の動きを制御
// GSAP 3 + ScrollTrigger + Lenis（CDN 読み込み済み前提）
//
// 主要な動き：
//   1) ページロード時のカーテン
//   2) ヒーロー：Ken Burns 背景、文字スプリットフェードアップ、CTA ポップイン
//   3) スクロールでヘッダーが背景白に切り替わる
//   4) セクション見出しのワイプ表示
//   5) 強み3カードのスタガー入場
//   6) 数字カウントアップ
//   7) サービス／実績／採用カードの順次入場
//   8) リーディング進捗バー
//   9) カスタムカーソル（PCのみ）
//  10) Lenis 慣性スクロール
//
// `prefers-reduced-motion: reduce` のユーザーには全アニメをスキップする no-op モードを提供。

(function () {
  const reduce =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    /[?&]nomotion=1/.test(location.search);
  if (typeof gsap === 'undefined') {
    console.warn('[case4-motion] GSAP not loaded');
    document.getElementById('c4-curtain') && document.getElementById('c4-curtain').remove();
    return;
  }
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  // ===== Lenis 慣性スクロール =====
  let lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }
  }

  // ===== ページロードカーテン =====
  function dismissCurtain() {
    const c = document.getElementById('c4-curtain');
    if (!c) return Promise.resolve();
    if (reduce) { c.remove(); return Promise.resolve(); }
    return new Promise((resolve) => {
      let resolved = false;
      const finish = () => { if (resolved) return; resolved = true; if (c.parentNode) c.remove(); resolve(); };
      // 中央から外に向かって白いシャッターが消えていく演出
      gsap.set(c, { opacity: 1, scale: 1, transformOrigin: '50% 50%' });
      gsap.to(c, {
        opacity: 0,
        scale: 1.2,
        duration: 0.9,
        ease: 'power3.inOut',
        delay: 0.3,
        onComplete: finish,
      });
      // RAF が走らない環境向けのフォールバック（最悪 2.5 秒で必ず除去）
      setTimeout(finish, 2500);
    });
  }

  // ===== ヒーロー：文字スプリット =====
  function splitText(el) {
    if (!el) return [];
    const html = el.innerHTML;
    // <span class="accent">...</span> を保護したまま、それ以外をchar化
    el.innerHTML = '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const chars = [];
    function walk(node, parent) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          // text
          const text = n.nodeValue;
          for (const ch of text) {
            if (ch === ' ' || ch === '\n') {
              parent.appendChild(document.createTextNode(ch));
              continue;
            }
            const s = document.createElement('span');
            s.className = 'char';
            s.textContent = ch;
            parent.appendChild(s);
            chars.push(s);
          }
        } else if (n.nodeType === 1) {
          const clone = n.cloneNode(false);
          parent.appendChild(clone);
          walk(n, clone);
        }
      });
    }
    walk(temp, el);
    return chars;
  }

  // ===== ヒーロー入場 =====
  function animateHero() {
    const photo = document.getElementById('c4HeroPhoto');
    const title = document.getElementById('c4HeroTitle');
    const lead = document.getElementById('c4HeroLead');
    const cta = document.getElementById('c4HeroActions');
    const meta = document.querySelector('.c4-hero__meta-tr');

    // 背景写真を設定（c4-hero__photo は .ph ではないので直接指定）
    if (photo) {
      photo.style.backgroundImage =
        'url("https://images.unsplash.com/photo-1609359923548-cd7fe10364eb?w=2000&q=85&auto=format&fit=crop&crop=entropy")';
      photo.style.backgroundSize = 'cover';
      photo.style.backgroundPosition = 'center';
    }

    const chars = title ? splitText(title) : [];
    if (reduce) return; // 動きはスキップ、写真と分割テキストは表示済み

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Ken Burns（無限ループ）
    if (photo) {
      gsap.fromTo(photo, { scale: 1, x: 0, y: 0 }, {
        scale: 1.08, x: -20, y: -10,
        duration: 22, ease: 'none', repeat: -1, yoyo: true,
      });
    }

    if (meta) tl.from(meta, { opacity: 0, duration: 0.6 }, 0.3);
    if (chars.length) {
      tl.from(chars, { opacity: 0, y: 36, duration: 0.8, stagger: 0.04 }, 0.4);
    }
    if (lead) tl.from(lead, { opacity: 0, y: 20, duration: 0.7 }, '-=0.3');
    if (cta) tl.from(cta, { opacity: 0, scale: 0.85, duration: 0.7, ease: 'back.out(1.5)' }, '-=0.4');
  }

  // ===== マウスパララックス（ヒーロー） =====
  function setupHeroParallax() {
    if (reduce) return;
    const photo = document.getElementById('c4HeroPhoto');
    if (!photo) return;
    const hero = document.querySelector('.c4-hero');
    if (!hero) return;
    let lastX = 0, lastY = 0;
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
      lastX = x; lastY = y;
      gsap.to(photo, { x: -x, y: -y, duration: 1.2, overwrite: 'auto' });
    });
  }

  // ===== ヘッダー：scroll でフィル =====
  function setupHeaderFill() {
    const header = document.querySelector('header.header');
    if (!header) return;
    const update = () => {
      if (window.scrollY > 80) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ===== セクション見出しワイプ＆本文フェードアップ =====
  function setupSectionReveals() {
    if (typeof ScrollTrigger === 'undefined' || reduce) return;
    document.querySelectorAll('.sec-head').forEach((head) => {
      const h2 = head.querySelector('h2');
      const p = head.querySelector('p');
      const num = head.querySelector('.sec-num');
      const items = [num, h2, p].filter(Boolean);
      items.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: head,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.from(el, { opacity: 0, y: 30, duration: 0.8, delay: i * 0.12, ease: 'power3.out' });
          },
        });
      });
    });
  }

  // ===== 強み 3 カード スタガー =====
  function setupStrengthCards() {
    if (typeof ScrollTrigger === 'undefined' || reduce) return;
    document.querySelectorAll('.strengths').forEach((wrap) => {
      const cards = wrap.querySelectorAll('.strength');
      ScrollTrigger.create({
        trigger: wrap,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          gsap.from(cards, {
            opacity: 0, y: 60, rotationY: -12, transformPerspective: 800,
            duration: 0.9, stagger: 0.15, ease: 'power3.out',
          });
        },
      });
    });
  }

  // ===== 数字カウントアップ =====
  function setupCountUp() {
    if (typeof ScrollTrigger === 'undefined' || reduce) return;
    document.querySelectorAll('.stat .v').forEach((node) => {
      const m = node.textContent.match(/(\d+)/);
      if (!m) return;
      const finalVal = parseInt(m[1], 10);
      const unitSpan = node.querySelector('.u');
      const unitHtml = unitSpan ? unitSpan.outerHTML : '';
      const numEl = document.createElement('span');
      numEl.className = 'num';
      numEl.textContent = String(finalVal);
      node.innerHTML = '';
      node.appendChild(numEl);
      if (unitHtml) node.insertAdjacentHTML('beforeend', unitHtml);
      ScrollTrigger.create({
        trigger: node,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          numEl.textContent = '0';
          gsap.to({ v: 0 }, {
            v: finalVal, duration: 1.6, ease: 'power2.out',
            onUpdate: function () { numEl.textContent = Math.round(this.targets()[0].v); },
          });
        },
      });
    });
  }

  // ===== サービス / 実績 / 採用 カードのスタガー入場 =====
  function setupGridReveals() {
    if (typeof ScrollTrigger === 'undefined' || reduce) return;
    const groups = [
      { selector: '.services-grid .service', stagger: 0.08 },
      { selector: '.services-grid-2 .service', stagger: 0.08 },
      { selector: '.works-grid .work', stagger: 0.10 },
      { selector: '.jobs .job', stagger: 0.08 },
    ];
    groups.forEach((g) => {
      const items = document.querySelectorAll(g.selector);
      if (!items.length) return;
      ScrollTrigger.create({
        trigger: items[0].parentElement,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.from(items, { opacity: 0, y: 40, duration: 0.7, stagger: g.stagger, ease: 'power3.out' });
        },
      });
    });
  }

  // ===== リーディング進捗バー =====
  function setupProgress() {
    const bar = document.getElementById('c4-progress');
    if (!bar) return;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const ratio = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
      bar.style.width = (ratio * 100).toFixed(2) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ===== カスタムカーソル =====
  function setupCursor() {
    if (reduce) return;
    if (matchMedia('(hover: none)').matches) return;
    const c = document.getElementById('c4-cursor');
    if (!c) return;
    document.addEventListener('mousemove', (e) => {
      gsap.to(c, { x: e.clientX, y: e.clientY, duration: 0.18, overwrite: 'auto' });
    });
    document.querySelectorAll('a, button, .btn').forEach((el) => {
      el.addEventListener('mouseenter', () => c.classList.add('is-link'));
      el.addEventListener('mouseleave', () => c.classList.remove('is-link'));
    });
  }

  // ===== CTA セクションの呼吸 =====
  function setupCtaBreath() {
    if (reduce) return;
    const cta = document.querySelector('.cta .btn-primary, .cta .btn');
    if (!cta) return;
    gsap.to(cta, {
      scale: 1.04, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1,
    });
  }

  // ===== 初期化 =====
  function init() {
    setupHeaderFill();
    animateHero();
    setupHeroParallax();
    setupSectionReveals();
    setupStrengthCards();
    setupCountUp();
    setupGridReveals();
    setupProgress();
    setupCursor();
    setupCtaBreath();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  function bootstrap() {
    dismissCurtain().then(init).catch((e) => { console.error('[case4-motion]', e); init(); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
