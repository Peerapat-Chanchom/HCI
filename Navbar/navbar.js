/* =========================================
   navbar.js — ตรงกับโครงสร้าง HTML ที่ให้มา
   ฟีเจอร์:
   1) ไฮไลต์ลิงก์เมนูตามหน้าปัจจุบัน (aria-current)
   2) เพิ่มเงาให้ navbar ตอนสกรอลล์
   3) จัดการตัวเลือกภาษา/สกุลเงิน (ถ้ามี .lang-currency-selector)
   4) แสดง badge ตัวเลขบนไอคอน inbox/notifications/favorites จาก localStorage
   ========================================= */

(() => {
  'use strict';

  // ช็อตคัตเลือก DOM
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  document.addEventListener('DOMContentLoaded', () => {
    initActiveNavLinks();        // ไฮไลต์ลิงก์ปัจจุบัน
    initNavbarScrollShadow();    // ใส่เงาเมื่อสกรอลล์
    initLangCurrencySelector();  // ตัวเลือกภาษา/สกุลเงิน (ถ้ามี)
    initIconBadgeCounts();       // badge ตัวเลขบนไอคอนจาก localStorage
  });

  /* -----------------------------------------
     1) ไฮไลต์ลิงก์เมนูตามหน้าปัจจุบัน
     ตรงกับ <ul class="cc-links"> และลิงก์อื่น ๆ ใน .cc-nav-wrap
     ----------------------------------------- */
  function initActiveNavLinks() {
    const currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const wrap = $('.cc-nav-wrap');
    if (!wrap) return;

    const links = $$('a[href]', wrap);
    links.forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;

      const file = href.split('/').pop();
      const isActive = file === currentFile ||
                       (currentFile === 'index.html' && (file === '' || file === './' || file === 'index.html'));

      a.classList.toggle('is-active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* -----------------------------------------
     2) ใส่เงาให้ .cc-navbar ตอนสกรอลล์
     ตรงกับ <header class="cc-navbar">
     ----------------------------------------- */
  function initNavbarScrollShadow() {
    const navbar = $('.cc-navbar');
    if (!navbar) return;

    const onScroll = () => {
      if (window.scrollY > 2) navbar.classList.add('is-scrolled');
      else navbar.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* -----------------------------------------
     3) ตัวเลือกภาษา/สกุลเงิน (ออปชัน)
     ตรงกับ:
       <div class="lang-currency-selector" role="listbox">
         <button role="option" data-lang="th" data-cur="THB">ภาษาไทย, THB</button>
         ...
       </div>
     - เก็บค่าที่เลือกไว้ใน localStorage
     - เซ็ต document.documentElement.lang ให้ตรงภาษา
     - ยิง CustomEvent 'lcchange' เผื่อส่วนอื่นจะฟังต่อ
     ----------------------------------------- */
  function initLangCurrencySelector() {
    const box = $('.lang-currency-selector[role="listbox"]');
    if (!box) return;

    const options = $$('button[role="option"][data-lang][data-cur]', box);
    if (!options.length) return;

    const LS_KEY = 'lc.pref';
    const root   = document.documentElement;

    const saved = readJSON(localStorage.getItem(LS_KEY)) || { lang: 'th', cur: 'THB' };
    let currentBtn = options.find(b => b.dataset.lang === saved.lang && b.dataset.cur === saved.cur) || options[0];

    setSelected(currentBtn, false);

    // คลิกเลือก
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('button[role="option"]');
      if (!btn) return;
      setSelected(btn, true);
    });

    // คีย์บอร์ดเลือก (ซ้าย/ขวา/บน/ล่าง/Home/End)
    box.addEventListener('keydown', (e) => {
      const list = options;
      const active = $('button[role="option"].is-selected', box) || currentBtn;
      const idx = list.indexOf(active);
      let next = null;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = list[(idx + 1) % list.length]; break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = list[(idx - 1 + list.length) % list.length]; break;
        case 'Home':
          next = list[0]; break;
        case 'End':
          next = list[list.length - 1]; break;
      }
      if (next) {
        e.preventDefault();
        setSelected(next, true);
        next.focus();
      }
    });

    function setSelected(btn, persist) {
      options.forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      currentBtn = btn;
      const lang = btn.dataset.lang;
      const cur  = btn.dataset.cur;

      // อัปเดตภาษาใน <html lang="...">
      if (lang) document.documentElement.lang = lang;

      // เก็บค่า (เช่น {lang:'en', cur:'USD'})
      if (persist) localStorage.setItem(LS_KEY, JSON.stringify({ lang, cur }));

      // แจ้งส่วนอื่น ๆ
      box.dispatchEvent(new CustomEvent('lcchange', { detail: { lang, cur } }));
    }
  }

  /* -----------------------------------------
     4) Badge ตัวเลขบนไอคอน (อินบ็อกซ์, แจ้งเตือน, ถูกใจ)
     ตรงกับลิงก์ใน .cc-actions:
       <a class="cc-icon" href="inbox.html">...</a>
       <a class="cc-icon" href="notifications.html">...</a>
       <a class="cc-icon" href="favorites.html">...</a>
     - อ่านค่าจาก localStorage:
         inbox.unread, notifications.unread, favorites.count
       ตัวอย่างทดสอบในคอนโซล:
         localStorage.setItem('notifications.unread','5')
     ----------------------------------------- */
  function initIconBadgeCounts() {
    const map = {
      inbox:         { selector: 'a.cc-icon[href*="inbox.html"]',          key: 'inbox.unread' },
      notifications: { selector: 'a.cc-icon[href*="notifications.html"]',  key: 'notifications.unread' },
      favorites:     { selector: 'a.cc-icon[href*="favorites.html"]',      key: 'favorites.count' },
    };

    for (const k of Object.keys(map)) {
      const { selector, key } = map[k];
      const el = $(selector);
      if (!el) continue;
      renderBadge(el, toInt(localStorage.getItem(key)));
    }

    // อัปเดตแบบ realtime ถ้าแท็บอื่นแก้ค่า
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      for (const k of Object.keys(map)) {
        const { selector, key } = map[k];
        if (e.key !== key) continue;
        const el = $(selector);
        if (!el) continue;
        renderBadge(el, toInt(e.newValue));
      }
    });

    function renderBadge(anchor, count) {
      let badge = anchor.querySelector('.cc-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'cc-badge';
          badge.setAttribute('aria-hidden', 'true');
          anchor.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : String(count);
        anchor.setAttribute('data-has-unread', 'true');
      } else {
        if (badge) badge.remove();
        anchor.removeAttribute('data-has-unread');
      }
    }

    function toInt(v) {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }
  }

  /* ยูทิล */
  function readJSON(s) { try { return JSON.parse(s); } catch { return null; } }
})();
// navbar.js — แสดง badge การแจ้งเตือน และบุ๊คมาร์ก ❤ แบบเรียลไทม์
(function(){
  'use strict';

  const SELECTOR = {
    notifIcon: '.cc-icon[href="notifications.html"]',
    favIcon: '.cc-links a[href="favorites.html"]',
  };

  const LS_KEYS = {
    notifCount: 'notifications.count',
    favCount: 'favorites.count',
  };

  // ===== สร้าง badge element =====
  function createBadge(value = 0){
    const span = document.createElement('span');
    span.className = 'cc-badge';
    span.textContent = value;
    return span;
  }

  function updateBadge(el, value){
    if(!el) return;
    let badge = el.querySelector('.cc-badge');
    if(!badge && value > 0){
      badge = createBadge(value);
      el.appendChild(badge);
    }
    if(badge){
      badge.textContent = value;
      badge.style.display = value > 0 ? 'inline-flex' : 'none';
    }
  }

  // ===== โหลดค่าจาก localStorage =====
  function loadCounts(){
    return {
      notif: parseInt(localStorage.getItem(LS_KEYS.notifCount) || '0', 10),
      fav:   parseInt(localStorage.getItem(LS_KEYS.favCount) || '0', 10),
    };
  }

  // ===== เรนเดอร์เริ่มต้น =====
  function render(){
    const { notif, fav } = loadCounts();
    const notifIcon = document.querySelector(SELECTOR.notifIcon);
    const favLink = document.querySelector(SELECTOR.favIcon);

    updateBadge(notifIcon, notif);
    updateBadge(favLink, fav);
  }

  // ===== sync real-time ผ่าน StorageEvent =====
  window.addEventListener('storage', (e)=>{
    if(!e.key) return;
    if(e.key === LS_KEYS.notifCount || e.key === LS_KEYS.favCount){
      render();
    }
  });

  // ===== เริ่มทำงาน =====
  document.addEventListener('DOMContentLoaded', render);
})();
