// ==UserScript==
// @name         Telegram Web Poll/Quiz → JSON exporter
// @namespace    zarevenge.github.io
// @version      0.1.0
// @description  Extract poll/quiz questions from Telegram Web DOM and export as JSON (dedup + incremental).
// @match        https://web.telegram.org/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  'use strict';

  /**
   * What this script does:
   * - Scans Telegram Web DOM for <poll-element> blocks
   * - Extracts: question, options, correct answer (if quiz has is-correct), votes count, message-id, poll-id
   * - Deduplicates by (peerId + pollId) OR (question + options hash) fallback
   * - Stores in localStorage for incremental updates
   * - Lets you download JSON at any time
   *
   * Notes:
   * - Telegram Web is a SPA; DOM changes constantly → MutationObserver + periodic scan.
   * - This is best-effort DOM scraping; Telegram may change classnames/structure anytime.
   */

  const STORAGE_KEY = 'tg_poll_export_v1';

  function nowIso() {
    return new Date().toISOString();
  }

  function safeText(node) {
    if (!node) return '';
    return String(node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, createdAt: nowIso(), updatedAt: nowIso(), itemsByKey: {} };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('bad store');
      if (!parsed.itemsByKey || typeof parsed.itemsByKey !== 'object') parsed.itemsByKey = {};
      return parsed;
    } catch {
      return { version: 1, createdAt: nowIso(), updatedAt: nowIso(), itemsByKey: {} };
    }
  }

  function writeStore(store) {
    store.updatedAt = nowIso();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function stableJson(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  async function sha1Hex(str) {
    // For dedup fallback; uses WebCrypto.
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-1', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function getPollMeta(pollEl) {
    // Attributes seen in Telegram Web:
    // <poll-element peer-id="..." poll-id="..." message-id="...">
    const peerId = pollEl.getAttribute('peer-id') || '';
    const pollId = pollEl.getAttribute('poll-id') || '';
    const messageId = pollEl.getAttribute('message-id') || pollEl.closest('[data-mid]')?.getAttribute('data-mid') || '';
    const peerId2 = pollEl.closest('[data-peer-id]')?.getAttribute('data-peer-id') || '';
    return {
      peerId: peerId || peerId2 || '',
      pollId: pollId || '',
      messageId: messageId || '',
    };
  }

  function extractPoll(pollEl) {
    const meta = getPollMeta(pollEl);

    const title = pollEl.querySelector('.poll-title .translatable-message, .poll-title, .pollTitle, [class*="poll-title"]');
    const question = safeText(title);

    const answerEls = Array.from(pollEl.querySelectorAll('.poll-answer'));
    const options = answerEls
      .map((a) => safeText(a.querySelector('.poll-answer-text .translatable-message, .poll-answer-text, [class*="poll-answer-text"]') || a))
      .map((s) => s.trim())
      .filter(Boolean);

    // Quiz correct answer often marked with .is-correct. If not available, leave empty.
    const correctEl = answerEls.find((a) => a.classList.contains('is-correct'));
    const correct = safeText(
      correctEl?.querySelector('.poll-answer-text .translatable-message, .poll-answer-text, [class*="poll-answer-text"]') || null
    );

    // Votes count
    const votesEl = pollEl.querySelector('.poll-votes-count');
    const votesText = safeText(votesEl);
    const votes = (() => {
      // e.g. "4771 answers" or localized
      const m = votesText.replace(/\u00A0/g, ' ').match(/(\d[\d\s.,]*)/);
      if (!m) return null;
      const n = Number(m[1].replace(/[^\d]/g, ''));
      return Number.isFinite(n) ? n : null;
    })();

    // Poll type
    const typeEl = pollEl.querySelector('.poll-type');
    const pollType = safeText(typeEl);

    return {
      kind: 'telegram_poll',
      extractedAt: nowIso(),
      source: {
        url: location.href,
        peerId: meta.peerId,
        pollId: meta.pollId,
        messageId: meta.messageId,
      },
      question,
      options,
      answer: correct || '',
      pollType,
      votes,
    };
  }

  function looksValid(item) {
    if (!item) return false;
    if (!item.question || item.question.length < 3) return false;
    if (!Array.isArray(item.options) || item.options.length < 2) return false;
    return true;
  }

  async function keyForItem(item) {
    const peerId = item?.source?.peerId || '';
    const pollId = item?.source?.pollId || '';
    if (peerId && pollId) return `peer:${peerId}|poll:${pollId}`;
    const hash = await sha1Hex(`${item.question}\n${item.options.join('\n')}`);
    return `hash:${hash}`;
  }

  async function scanAndStore({ onlyVisible = false } = {}) {
    const store = readStore();
    const pollEls = Array.from(document.querySelectorAll('poll-element'));

    let added = 0;
    let updated = 0;
    let seen = 0;

    for (const pollEl of pollEls) {
      if (onlyVisible && !isVisible(pollEl)) continue;
      const item = extractPoll(pollEl);
      if (!looksValid(item)) continue;

      const key = await keyForItem(item);
      seen += 1;

      const existing = store.itemsByKey[key];
      if (!existing) {
        store.itemsByKey[key] = item;
        added += 1;
      } else {
        // Update mutable fields if improved (e.g., later becomes voted and shows correct answer).
        const next = { ...existing };
        let changed = false;

        if (!next.answer && item.answer) {
          next.answer = item.answer;
          changed = true;
        }
        if ((!next.votes && item.votes) || (typeof item.votes === 'number' && item.votes !== next.votes)) {
          next.votes = item.votes;
          changed = true;
        }
        if (item.source?.messageId && !next.source?.messageId) {
          next.source = { ...(next.source || {}), messageId: item.source.messageId };
          changed = true;
        }
        if (changed) {
          next.extractedAt = item.extractedAt;
          store.itemsByKey[key] = next;
          updated += 1;
        }
      }
    }

    if (added || updated) writeStore(store);
    return { pollEls: pollEls.length, seen, added, updated, total: Object.keys(store.itemsByKey).length };
  }

  function itemsArray() {
    const store = readStore();
    return Object.values(store.itemsByKey);
  }

  function toClassicTestJson(items) {
    // Matches your `test/data/1991.json` style.
    const sorted = [...items].sort((a, b) => {
      const qa = (a.question || '').localeCompare(b.question || '');
      if (qa !== 0) return qa;
      return (a.source?.pollId || '').localeCompare(b.source?.pollId || '');
    });

    let id = 1;
    return sorted.map((it) => ({
      id: id++,
      question: it.question,
      options: it.options,
      answer: it.answer || '',
    }));
  }

  function toBlocksQaJson(items) {
    // Matches `normalizeBlockQuestions()` expectation: [{question, answer}]
    return items
      .filter((it) => it.question && it.answer)
      .map((it) => ({ question: it.question, answer: it.answer }));
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  function ensureUi() {
    if (document.getElementById('tg-poll-exporter-ui')) return;

    const root = document.createElement('div');
    root.id = 'tg-poll-exporter-ui';
    root.style.cssText = [
      'position: fixed',
      'right: 12px',
      'bottom: 12px',
      'z-index: 2147483647',
      'display: flex',
      'flex-direction: column',
      'gap: 8px',
      'font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background: rgba(20,20,20,0.9)',
      'color: #fff',
      'border: 1px solid rgba(255,255,255,0.12)',
      'border-radius: 10px',
      'padding: 10px 10px',
      'min-width: 260px',
      'box-shadow: 0 8px 30px rgba(0,0,0,0.35)',
      'backdrop-filter: blur(6px)',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Poll → JSON exporter';
    title.style.cssText = 'font-weight: 700; font-size: 13px; margin-bottom: 8px;';

    const status = document.createElement('div');
    status.id = 'tg-poll-exporter-status';
    status.style.cssText = 'font-size: 12px; opacity: 0.9; margin-bottom: 8px;';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap;';

    function mkBtn(label) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = [
        'cursor: pointer',
        'border-radius: 8px',
        'border: 1px solid rgba(255,255,255,0.15)',
        'background: rgba(255,255,255,0.08)',
        'color: #fff',
        'padding: 6px 8px',
        'font-size: 12px',
      ].join(';');
      b.onmouseenter = () => (b.style.background = 'rgba(255,255,255,0.14)');
      b.onmouseleave = () => (b.style.background = 'rgba(255,255,255,0.08)');
      return b;
    }

    const btnScan = mkBtn('Scan now');
    const btnScanVisible = mkBtn('Scan visible');
    const btnDlClassic = mkBtn('Download test.json');
    const btnDlBlocks = mkBtn('Download blocks-qa.json');
    const btnReset = mkBtn('Reset cache');

    btnScan.onclick = async () => {
      status.textContent = 'Scanning...';
      const res = await scanAndStore({ onlyVisible: false });
      status.textContent = `Found ${res.pollEls} poll blocks; stored=${res.total} (added ${res.added}, updated ${res.updated}).`;
    };

    btnScanVisible.onclick = async () => {
      status.textContent = 'Scanning visible...';
      const res = await scanAndStore({ onlyVisible: true });
      status.textContent = `Visible scan: stored=${res.total} (added ${res.added}, updated ${res.updated}).`;
    };

    btnDlClassic.onclick = () => {
      const items = itemsArray();
      const out = toClassicTestJson(items);
      downloadJson(`telegram-polls-test-${Date.now()}.json`, out);
    };

    btnDlBlocks.onclick = () => {
      const items = itemsArray();
      const out = toBlocksQaJson(items);
      downloadJson(`telegram-polls-blocks-qa-${Date.now()}.json`, out);
    };

    btnReset.onclick = () => {
      if (!confirm('Reset local cache? This will delete stored polls from localStorage.')) return;
      localStorage.removeItem(STORAGE_KEY);
      status.textContent = 'Cache cleared.';
    };

    row.appendChild(btnScan);
    row.appendChild(btnScanVisible);
    row.appendChild(btnDlClassic);
    row.appendChild(btnDlBlocks);
    row.appendChild(btnReset);

    card.appendChild(title);
    card.appendChild(status);
    card.appendChild(row);
    root.appendChild(card);
    document.documentElement.appendChild(root);

    // Initial status
    const total = Object.keys(readStore().itemsByKey).length;
    status.textContent = `Ready. Stored: ${total}. Scroll channel to load more polls.`;
  }

  function boot() {
    ensureUi();

    // Scan once shortly after load.
    setTimeout(() => {
      scanAndStore({ onlyVisible: false }).catch(() => {});
    }, 1500);

    // Observe DOM changes and debounce scans.
    let timer = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        scanAndStore({ onlyVisible: false }).catch(() => {});
      }, 1200);
    };

    const obs = new MutationObserver(() => schedule());
    obs.observe(document.documentElement, { subtree: true, childList: true });

    // Also periodic scan (safety net).
    setInterval(() => {
      scanAndStore({ onlyVisible: false }).catch(() => {});
    }, 15000);
  }

  boot();
})();

