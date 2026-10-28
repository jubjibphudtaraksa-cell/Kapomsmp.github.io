(() => {
  'use strict';

  const cfg = window.KAPOM_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
  const POLL_MS = 2500;

  // ---- HTTPS only -------------------------------------------------------
  const apiBase = String(cfg.apiBase || '').replace(/\/+$/, '');
  const httpsOk = /^https:\/\//i.test(apiBase);

  const views = ['loading', 'auth', 'none', 'pending', 'lost', 'verified', 'expired'];
  function show(name) {
    views.forEach((v) => { $('v-' + v).hidden = v !== name; });
  }

  const ERR = {
    bad_request: 'ชื่อไม่ถูกต้อง ใช้ได้เฉพาะ A–Z, 0–9 และ _ ความยาว 3–16 ตัว',
    rate_limited: 'ขอรหัสบ่อยเกินไป รอสักครู่แล้วลองใหม่ (สูงสุด 5 ครั้งใน 10 นาที)',
    already_linked: 'บัญชีนี้เชื่อม Minecraft ไว้แล้ว',
    unauthorized: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
    network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
    server_error: 'เซิร์ฟเวอร์ขัดข้อง ลองใหม่อีกครั้งในภายหลัง',
    https_required: 'ต้องเชื่อมต่อผ่าน HTTPS เท่านั้น',
  };
  const msg = (e) => ERR[e] || ERR.server_error;

  // ---- API --------------------------------------------------------------
  async function api(method, path, body) {
    if (!httpsOk) return { status: 0, data: { ok: false, error: 'https_required' } };
    const token = typeof cfg.getToken === 'function' ? cfg.getToken() : '';
    if (!token) return { status: 401, data: { ok: false, error: 'unauthorized' } };
    try {
      const res = await fetch(apiBase + path, {
        method,
        headers: Object.assign({ Authorization: 'Bearer ' + token },
          body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'omit',
        cache: 'no-store',
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* non-JSON */ }
      return { status: res.status, data: data || { ok: false, error: 'server_error' } };
    } catch (e) {
      return { status: 0, data: { ok: false, error: 'network' } };
    }
  }

  // ---- state ------------------------------------------------------------
  let pollTimer = null;
  let tickTimer = null;
  let deadline = 0;
  let totalMs = 300000;
  let busy = false;
  let lastName = '';

  function stopTimers() {
    clearTimeout(pollTimer); pollTimer = null;
    clearInterval(tickTimer); tickTimer = null;
  }

  function showAuth() {
    stopTimers();
    $('devForm').hidden = !cfg.devTokenInput;
    show('auth');
  }

  function showNone(prefill) {
    stopTimers();
    $('nameErr').hidden = true;
    $('mcName').removeAttribute('aria-invalid');
    if (prefill) $('mcName').value = prefill;
    show('none');
  }

  function showPending(name, code, expiresIn) {
    $('pName').textContent = name;
    $('cmdCode').textContent = code;
    $('pendErr').hidden = true;
    totalMs = Math.max(1000, expiresIn * 1000);
    deadline = Date.now() + totalMs;
    $('copyBtn').textContent = 'คัดลอก';
    $('copyBtn').classList.remove('done');
    show('pending');
    renderTick();
    clearInterval(tickTimer);
    tickTimer = setInterval(renderTick, 250);
    schedulePoll();
  }

  function renderTick() {
    const left = Math.max(0, deadline - Date.now());
    const s = Math.ceil(left / 1000);
    $('timer').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    $('drain').style.transform = 'scaleX(' + (left / totalMs).toFixed(4) + ')';
    $('drain').parentNode.classList.toggle('low', left < 60000);
    if (left === 0) { clearInterval(tickTimer); tickTimer = null; poll(); }
  }

  function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, POLL_MS);
  }

  function showVerified(d) {
    stopTimers();
    $('vName').textContent = d.minecraft_name || '';
    let when = '';
    if (d.linked_at) {
      const t = new Date(d.linked_at);
      if (!isNaN(t)) when = t.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    }
    $('vDate').textContent = when || '-';
    show('verified');
  }

  // Applies a /status response. hasCode: we are showing a live code right now.
  function applyStatus(res, { hasCode }) {
    const d = res.data;
    if (res.status === 401) return showAuth();
    if (!d.ok) {
      if (hasCode) {
        // transient (network/server): keep the code on screen, keep polling
        $('pendErr').textContent = msg(d.error); $('pendErr').hidden = false;
        schedulePoll();
      } else {
        showNone(); $('nameErr').textContent = msg(d.error); $('nameErr').hidden = false;
      }
      return;
    }
    if (hasCode) $('pendErr').hidden = true;
    switch (d.status) {
      case 'verified': return showVerified(d);
      case 'expired': stopTimers(); return show('expired');
      case 'pending':
        if (hasCode) { schedulePoll(); return; }
        lastName = d.minecraft_name || '';
        $('lName').textContent = lastName;
        stopTimers();
        return show('lost');
      default: return showNone();
    }
  }

  async function poll() {
    const hasCode = !$('v-pending').hidden;
    if (document.hidden && hasCode) { schedulePoll(); return; }
    applyStatus(await api('GET', '/api/link/status'), { hasCode });
  }

  // ---- start ------------------------------------------------------------
  async function start(name) {
    if (busy) return;
    busy = true;
    const btn = $('startBtn');
    btn.disabled = true; $('panel').setAttribute('aria-busy', 'true');
    const res = await api('POST', '/api/link/start', { username: name });
    busy = false; btn.disabled = false; $('panel').setAttribute('aria-busy', 'false');
    const d = res.data;
    if (res.status === 401) return showAuth();
    if (d.ok && d.status === 'pending' && d.code) {
      lastName = d.minecraft_name || name;
      return showPending(lastName, d.code, Number(d.expires_in) || 300);
    }
    if (d.error === 'already_linked') {
      return applyStatus(await api('GET', '/api/link/status'), { hasCode: false });
    }
    showNone(name);
    $('nameErr').textContent = msg(d.error); $('nameErr').hidden = false;
  }

  function restart() {
    stopTimers();
    showNone(lastName);
    $('mcName').focus();
  }

  // ---- events -----------------------------------------------------------
  $('v-none').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('mcName').value.trim();
    const input = $('mcName');
    if (!NAME_RE.test(name)) {
      input.setAttribute('aria-invalid', 'true');
      $('nameErr').textContent = ERR.bad_request; $('nameErr').hidden = false;
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid'); $('nameErr').hidden = true;
    start(name);
  });

  $('copyBtn').addEventListener('click', async () => {
    const text = $('cmd').textContent.trim();
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch (e) { /* fall back */ }
    if (!copied) {
      try {
        const r = document.createRange(); r.selectNodeContents($('cmd'));
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        copied = document.execCommand('copy');
      } catch (e) { /* ignore */ }
    }
    const b = $('copyBtn');
    b.textContent = copied ? 'คัดลอกแล้ว' : 'กดค้างที่คำสั่งเพื่อคัดลอก';
    b.classList.toggle('done', copied);
    setTimeout(() => { b.textContent = 'คัดลอก'; b.classList.remove('done'); }, 2000);
  });

  ['restartBtn', 'lostBtn', 'expiredBtn'].forEach((id) => $(id).addEventListener('click', restart));
  $('refreshBtn').addEventListener('click', init);

  $('devForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('devToken').value.trim();
    if (!v) return;
    try { sessionStorage.setItem('kapom_token', v); } catch (err) { /* ignore */ }
    $('devToken').value = '';
    init();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !$('v-pending').hidden) poll();
  });

  // ---- boot -------------------------------------------------------------
  async function init() {
    $('serverAddr').textContent = cfg.serverAddress || 'Kapom';
    show('loading');
    if (!httpsOk) {
      show('none');
      $('startBtn').disabled = true;
      $('nameErr').textContent = 'ตั้งค่า apiBase ใน config.js ให้เป็น https:// ก่อน';
      $('nameErr').hidden = false;
      return;
    }
    applyStatus(await api('GET', '/api/link/status'), { hasCode: false });
  }

  init();
})();
