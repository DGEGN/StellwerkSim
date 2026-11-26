import { Interlocking } from './engine.js';
import data from './data-skl.js';
import { Betrieb, LEVELS, nextHop } from './betrieb.js';
import { Fahrplanbetrieb, DAYS, fmtClock, FP_GLEISE } from './fahrplanbetrieb.js';

import { renderStatic, renderDynamic, renderLabels } from './render.js';
const C = { free: '#4b5563', route: '#facc15', occ: '#ff3b30', bg: '#0b0f14', ye: '#facc15' };

let il, ui, bt, fp, numBuf = '';
let speed = 1;
let windowSec = 5;
const svg = document.getElementById('plan');
const meld = document.getElementById('meldung');
const now = () => performance.now();

const HINTS = {
  WGT: 'WGT: Weiche antippen (Einzelumstellung)',
  WHT: 'WHT: als besetzt gemeldete Weiche antippen',
  WAT: 'WAT: aufgefahrene Weiche antippen',
  WSpT: 'WSpT: Weiche antippen – oder Bahnhofstaste (BfT) für Weichenlaufkette',
  WESpT: 'WESpT: Weiche antippen – oder Bahnhofstaste (BfT) für Weichenlaufkette',
  HaGT: 'HaGT: Signal antippen (Halt)',
  ErsGT: 'ErsGT: Signal antippen (Ersatzsignal)',
  LsSpT: 'LsSpT: Signal antippen (sperren)',
  LsESpT: 'LsESpT: Signal antippen (entsperren)',
  FHT: 'FHT: Startsignal, dann Zieltaste – oder Weiche/Gleis (Einzelauflösung)',
  FRT: 'FRT: Startsignal, dann Zieltaste',
  AzGrT: 'AzGrT: Weiche oder Gleis antippen',
};

function reset() {
  il = new Interlocking(data);
  bt = new Betrieb(il);
  fp = new Fahrplanbetrieb(il);
  numBuf = '';
  ui = { start: null, startUntil: 0, pending: null, mode: null, dir: 'E', kind: 'zug', targets: [] };
  document.querySelectorAll('[data-mode],[data-key]').forEach(b => b.classList.remove('on', 'pend'));
  setBtnDir();
  il.msg('Neustart. Starttaste (Signal) und Zieltaste bedienen.');
  draw();
}

// ---------- Zeichnen ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (n, w = 5) => String(n).padStart(w, '0');
let staticHtml = '', labelHtml = '';
function draw() {
  if (!staticHtml) { staticHtml = renderStatic(data); labelHtml = renderLabels(data); }
  svg.innerHTML = staticHtml + renderDynamic(il, ui) + labelHtml;
  drawPanel();
}

function drawPanel() {
  const m = il.messages[0];
  meld.textContent = m ? m.text : 'Bereit.';
  meld.className = 'meldung ' + (m && m.level !== 'info' ? m.level : '');
  const f = il.anyFault();
  const L = (txt, cls) => `<span class="lamp ${cls || ''}">${txt}</span>`;
  document.getElementById('lamps').innerHTML =
    L('Wecker', il.alarm.wecker ? 'red blink' : '') + L('Hupe', il.alarm.hupe ? 'red blink' : '') +
    L('W', f.weiche ? 'red blink' : '') + L('S', f.signal ? 'red blink' : '') + L('G', f.gleis ? 'red' : '') +
    L('LK', il.laufkette ? 'yellow' : '') + L('Ausl', il.ausleuchtung ? 'yellow' : '');
  const z = il.zaehler;
  document.getElementById('zaehler').innerHTML = [['FHZ', z.FHZ], ['EAZ', z.EAZ], ['GAZ', z.GAZ], ['WHZ', z.WHZ], ['WAZ', z.WAZ], ['ErsZ', z.ErsZ]]
    .map(([k, v]) => `<div class="zw"><i class="knob"></i><span class="cnt">${num(v).split('').map(d => `<b>${d}</b>`).join('')}</span><em>${k}</em></div>`).join('');
  const rs = il.routes.map(r => {
    const sg = il.sig[r.start];
    const open = sg.aspect !== 'Hp0';
    const cls = open ? 'open' : r.state === 'locked' ? 'locked' : 'setting';
    const st = open ? (sg.aspect === 'Zs1' ? 'Zs 1' : 'Fahrt') : r.state === 'locked' ? (r.ffm ? 'festgelegt' : 'aufgelöst') : 'läuft ein';
    return `<span class="chip ${cls}">${esc(r.names)} · ${st}</span>`;
  });
  document.getElementById('routes').innerHTML = rs.length ? rs.join('') : '<span style="color:#8b98a8">keine</span>';
  const s = Math.floor(il.time);
  document.getElementById('clock').textContent = fp.active ? fmtClock(fp.clock) : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  document.querySelectorAll('[data-key]').forEach(b => b.classList.toggle('pend', !!ui.pending && ui.pending.key === b.dataset.key));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', ui.mode === b.dataset.mode));
  document.getElementById('btn-ausl').classList.toggle('on', il.ausleuchtung);
  document.getElementById('nstp-disp').textContent = numBuf.padEnd(4, '–');
  document.getElementById('btn-betrieb').textContent = 'Zufallsbetrieb: ' + LEVELS[bt.level].name;
  document.getElementById('btn-fp').textContent = fp.active ? 'Tagesfahrplan beenden' : 'Tagesfahrplan starten';
  const sc = fp.active ? fp.score : bt.score;
  document.getElementById('score').textContent = `✔ ${sc.ok} · ✖ ${sc.wrong} · Verspätung ${sc.delay.toFixed(1)} min` + (fp.active ? ` · >5 min spät ${fp.score.late} · ausgefallen ${fp.score.missed}` : '');
  document.getElementById('tafel').innerHTML = fp.active ? '<table>' + fp.tafel(8).map(r => `<tr class="${r.state}"><td>${r.dep}</td><td>${esc(r.label)}</td><td>${esc(r.dest)}</td><td>Gl ${esc(r.gl)}</td></tr>`).join('') + '</table>' : '';
  const zl = il.trains.filter(t => t.kind).map(t => {
    const nd = t.cur.kind === 'edge' ? il.nodes[t.cur.to.node] : null;
    let via = '';
    if (nd && nd.t === 'sig' && t.state === 'halt' && !il.sig[nd.id].route && nd.id !== t.dest) { const h = nextHop(il, nd.id, t.dest); if (h && h !== t.dest) via = ` · zuerst ${esc(il.nodes[h].name)}`; }
    if (t.fp) {
      const gl = FP_GLEISE[t.fp.gl].name;
      return `<div><b>${esc(t.line)} ${t.no}</b> · Gl ${esc(gl)} · ${t.fp.stage === 'ein' ? 'Einfahrt' : 'ab ' + fmtClock(t.fp.dep).slice(0, 5)} → ${esc(il.nodes[t.dest].name)}${t.state === 'halt' ? (t.hold ? ' <span class="h">wartet auf Abfahrzeit</span>' : ' <span class="h">wartet</span>') : ''}${via}</div>`;
    }
    return `<div><b>${t.no}</b> → ${esc(il.nodes[t.dest].name)}${t.state === 'halt' ? ' <span class="h">wartet</span>' : t.state === 'done' ? ' (Halt)' : ''}${via}</div>`;
  });
  document.getElementById('zugliste').innerHTML = zl.length ? zl.join('') : '–';
}

// ---------- Bedienung ----------
const deadline = () => windowSec ? now() + windowSec * 1000 : Infinity;
function clearPending() { ui.pending = null; ui.start = null; ui.kind = 'zug'; ui.targets = []; ui.rtargets = []; }

function pressKey(key) {
  if (ui.pending && ui.pending.key === key) { clearPending(); draw(); return; }
  ui.mode = null; ui.start = null; ui.targets = [];
  ui.pending = { key, until: deadline(), start: null };
  il.msg(HINTS[key]);
  draw();
}
function setMode(m) {
  ui.mode = ui.mode === m ? null : m;
  clearPending();
  if (ui.mode) il.msg(`${ui.mode === 'ZUG' ? 'Zug einsetzen' : ui.mode === 'WENDEN' ? 'Zug wenden' : ui.mode === 'ENTF' ? 'Zug entfernen' : ui.mode === 'NUM' ? 'Zugnummer setzen' : ui.mode === 'NUMDEL' ? 'Zugnummer löschen' : 'Störung auslösen'}: Objekt antippen`);
  draw();
}
const setBtnDir = () => { document.getElementById('btn-dir').textContent = ui.dir === 'E' ? '→ Ost' : '← West'; };

function tapPending(k, id) {
  const p = ui.pending;
  const bad = () => il.msg(`${p.key}: hier nicht möglich`, 'warn');
  let done = true;
  switch (p.key) {
    case 'WGT': k === 'sw' ? il.weicheUmstellen(id) : bad(); break;
    case 'WHT': k === 'sw' ? il.weicheHilfs(id) : bad(); break;
    case 'WAT': k === 'sw' ? il.weicheAuffahrt(id) : bad(); break;
    case 'WSpT': k === 'sw' ? il.weicheSperren(id, true) : bad(); break;
    case 'WESpT': k === 'sw' ? il.weicheSperren(id, false) : bad(); break;
    case 'HaGT': (k === 'sig' || k === 'rsig') ? il.signalHalt(id) : bad(); break;
    case 'ErsGT': (k === 'sig' || k === 'rsig') ? il.ersatzsignal(id) : bad(); break;
    case 'LsSpT': (k === 'sig' || k === 'rsig') ? il.signalSperren(id) : bad(); break;
    case 'LsESpT': (k === 'sig' || k === 'rsig') ? il.signalEntsperren(id) : bad(); break;
    case 'AzGrT': (k === 'sw' || k === 'edge') ? il.azGrund(id) : bad(); break;
    case 'FHT':
    case 'FRT':
      if (k === 'sig' || k === 'rsig') {
        const r = il.routeOf(id);
        if (!r) il.msg(`Signal ${il.nodes[id].name}: keine Fahrstraße eingestellt`, 'err');
        else { p.start = id; ui.targets = [r.target]; p.until = deadline(); done = false; il.msg(`${p.key}: Zieltaste bedienen`); }
      } else if (k === 'term' && p.start) {
        p.key === 'FHT' ? il.hilfsaufloesen(p.start, id) : il.ruecknahme(p.start, id);
      } else if (p.key === 'FHT' && (k === 'sw' || k === 'edge')) il.hilfsaufloesenEinzel(id);
      else bad();
      break;
    default: bad();
  }
  if (done) clearPending();
}

function tap(k, id) {
  if (ui.pending) { tapPending(k, id); draw(); return; }
  const m = ui.mode;
  if (m) {
    if (m === 'NUM' || m === 'NUMDEL') {
      let t = null;
      if (k === 'train') t = il.trains.find(x => x.id === +id);
      else if (k === 'edge' || k === 'sw') { const tid = il.occ[id]; t = il.trains.find(x => x.id === tid); }
      if (!t) il.msg('Zugnummer: Zug oder besetztes Gleis antippen', 'warn');
      else if (m === 'NUMDEL') { t.no = ''; il.msg(`Zugnummer von Zug ${t.id} gelöscht`); }
      else if (!numBuf) il.msg('Erst Ziffern am Nummernstellpult eingeben', 'warn');
      else { t.no = numBuf; il.msg(`Zugnummer ${numBuf} gesetzt`); numBuf = ''; }
    }
    else if (m === 'ZUG' && k === 'edge') il.spawnTrain(id, ui.dir);
    else if (m === 'WENDEN' && k === 'train') { il.reverseTrain(+id); ui.mode = null; }
    else if (m === 'ENTF' && k === 'train') { il.removeTrain(+id); ui.mode = null; }
    else if (m === 'STW' && k === 'sw') { il.toggleSwitchFault(id); ui.mode = null; }
    else if (m === 'AUFF' && k === 'sw') { il.switchRunOver(id); ui.mode = null; }
    else if (m === 'STS' && (k === 'sig' || k === 'rsig')) { il.toggleSignalFault(id); ui.mode = null; }
    else if (m === 'STG' && (k === 'edge' || k === 'sw')) { il.toggleTrackFault(id); ui.mode = null; }
    else il.msg('Hier nicht möglich – anderes Objekt antippen oder Taste erneut drücken.', 'warn');
    draw();
    return;
  }
  const kind = k === 'rsig' ? 'rangier' : 'zug';
  const isT = ui.start && id !== ui.start && ui.targets.includes(id) && (k === 'term' || k === 'sig' || (k === 'rsig' && ui.kind === 'rangier'));
  const isR = ui.start && id !== ui.start && k === 'rsig' && (ui.rtargets || []).includes(id);
  if (isR) {
    il.request(ui.start, id, 'rangier');
    clearPending();
  } else if (isT) {
    il.request(ui.start, id, ui.kind);
    clearPending();
  } else if (k === 'sig' || k === 'rsig') {
    if (ui.start === id && ui.kind === kind) { clearPending(); }
    else if (il.sig[id].route) il.msg(`Signal ${il.nodes[id].name}: Fahrstraße bereits eingestellt`, 'warn');
    else {
      ui.start = id; ui.kind = kind; ui.startUntil = deadline();
      ui.rtargets = il.validTargets(id, 'rangier');
      ui.targets = kind === 'rangier' ? ui.rtargets : il.validTargets(id);
      il.msg(`${kind === 'rangier' ? 'Rangiertaste' : 'Zugstraßentaste'} ${il.nodes[id].name}: Zieltaste bedienen (rot = Zugstraße, grau = Rangierstraße)`);
    }
  } else if (ui.start) clearPending();
  draw();
}

document.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => pressKey(b.dataset.key)));
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('[data-num]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.num;
  numBuf = v === 'C' ? '' : (numBuf + v).slice(0, 4);
  draw();
}));
document.getElementById('btn-betrieb').addEventListener('click', () => { if (fp.active) fp.stop(); bt.setLevel((bt.level + 1) % LEVELS.length); draw(); });
const fpStart = document.getElementById('fp-start');
for (let h = 0; h < 24; h++) fpStart.insertAdjacentHTML('beforeend', `<option value="${h * 60}"${h === 5 ? ' selected' : ''}>ab ${String(h).padStart(2, '0')}:00</option>`);
document.getElementById('btn-fp').addEventListener('click', () => {
  if (fp.active) fp.stop();
  else { bt.setLevel(0); fp.start(document.getElementById('fp-day').value, +fpStart.value); }
  draw();
});
document.getElementById('btn-bft').addEventListener('click', () => {
  const p = ui.pending;
  if (p && p.key === 'WSpT') il.laufketteSperren(true);
  else if (p && p.key === 'WESpT') il.laufketteSperren(false);
  else il.msg('Bahnhofstaste allein ohne Wirkung – Gruppentaste (WSpT/WESpT) zuerst', 'warn');
  clearPending(); draw();
});
document.getElementById('btn-ausl').addEventListener('click', () => { il.setAusleuchtung(!il.ausleuchtung); draw(); });
document.getElementById('btn-wut').addEventListener('click', () => { il.weckerAus(); draw(); });
document.getElementById('btn-hut').addEventListener('click', () => { il.hupeAus(); draw(); });
document.getElementById('btn-dir').addEventListener('click', () => { ui.dir = ui.dir === 'E' ? 'W' : 'E'; setBtnDir(); });
document.getElementById('btn-reset').addEventListener('click', reset);
document.getElementById('btn-help').addEventListener('click', () => document.getElementById('help').showModal());
document.getElementById('btn-speed').addEventListener('click', e => { speed = speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 8 : speed === 8 ? 16 : 1; e.target.textContent = speed + '×'; });
document.getElementById('btn-window').addEventListener('click', e => {
  windowSec = windowSec === 5 ? 10 : windowSec === 10 ? 0 : 5;
  e.target.textContent = windowSec ? `Zeitfenster ${windowSec} s` : 'Zeitfenster aus';
});

// ---------- Zoom / Pan / Tap ----------
const VIEWS = { west: { x: 0, y: 195, w: 830, h: 310 }, ost: { x: 780, y: 195, w: 816, h: 310 }, all: { x: 0, y: 190, w: 1596, h: 320 } };
const VB0 = { ...VIEWS.all };
let vb = { ...VIEWS.all };
const applyVB = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
const ptrs = new Map();
let gesture = null;
function clientToSvg(cx, cy) {
  const r = svg.getBoundingClientRect();
  const sc = Math.min(r.width / vb.w, r.height / vb.h);
  const ox = (r.width - vb.w * sc) / 2, oy = (r.height - vb.h * sc) / 2;
  return { x: vb.x + (cx - r.left - ox) / sc, y: vb.y + (cy - r.top - oy) / sc, sc };
}
svg.addEventListener('pointerdown', e => {
  svg.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  gesture = { moved: ptrs.size > 1, d0: null };
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture.d0 = Math.hypot(a.x - b.x, a.y - b.y); gesture.moved = true; }
});
svg.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  const prev = { x: p.x, y: p.y };
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 9) gesture.moved = true;
    if (gesture.moved) { const sc = clientToSvg(0, 0).sc; vb.x -= (p.x - prev.x) / sc; vb.y -= (p.y - prev.y) / sc; applyVB(); }
  } else if (ptrs.size === 2 && gesture.d0) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const c = clientToSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
    const nw = Math.min(VB0.w * 1.2, Math.max(180, vb.w * gesture.d0 / d));
    const k = nw / vb.w;
    vb.x = c.x - (c.x - vb.x) * k; vb.y = c.y - (c.y - vb.y) * k; vb.w = nw; vb.h *= k;
    gesture.d0 = d; applyVB();
  }
});
svg.addEventListener('pointerup', e => {
  const p = ptrs.get(e.pointerId);
  ptrs.delete(e.pointerId);
  if (p && gesture && !gesture.moved && ptrs.size === 0) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const t = el && el.closest ? el.closest('[data-k]') : null;
    t ? tap(t.dataset.k, t.dataset.id) : tap(null, null);
  }
  if (ptrs.size === 0) gesture = null;
});
svg.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); gesture = null; });
svg.addEventListener('wheel', e => {
  e.preventDefault();
  const c = clientToSvg(e.clientX, e.clientY);
  const nw = Math.min(VB0.w * 1.2, Math.max(180, vb.w * (e.deltaY > 0 ? 1.12 : 1 / 1.12)));
  const k = nw / vb.w;
  vb.x = c.x - (c.x - vb.x) * k; vb.y = c.y - (c.y - vb.y) * k; vb.w = nw; vb.h *= k; applyVB();
}, { passive: false });
svg.addEventListener('dblclick', () => { vb = { ...VB0 }; applyVB(); });

document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { vb = { ...VIEWS[b.dataset.view] }; applyVB(); }));
// ---------- Start ----------
reset();
applyVB();
let last = now();
setInterval(() => {
  const t = now();
  const dt = Math.min(0.5, (t - last) / 1000) * speed;
  last = t;
  if (ui.pending && ui.pending.until < t) { il.msg(`${ui.pending.key}: Zeitfenster abgelaufen`, 'warn'); clearPending(); }
  if (ui.start && ui.startUntil < t) { il.msg('Starttaste: Zeitfenster abgelaufen', 'warn'); clearPending(); }
  il.tick(dt);
  bt.tick(dt);
  fp.tick(dt);
  draw();
}, 250);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
