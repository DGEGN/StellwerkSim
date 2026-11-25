import { Interlocking } from './engine.js';
import data from './data-skl-west.js';
import { Betrieb, LEVELS } from './betrieb.js';

const SY = 1.4, Y0 = 560;                       // vertikale Streckung des Plans
const P = (x, y) => [x, Y0 + (y - Y0) * SY];
const C = { free: '#4b5563', route: '#facc15', occ: '#ff3b30', bg: '#0b0f14', ye: '#facc15' };

let il, ui, bt, numBuf = '';
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
  numBuf = '';
  ui = { start: null, startUntil: 0, pending: null, mode: null, dir: 'E', targets: [] };
  document.querySelectorAll('[data-mode],[data-key]').forEach(b => b.classList.remove('on', 'pend'));
  setBtnDir();
  il.msg('Neustart. Starttaste (Signal) und Zieltaste bedienen.');
  draw();
}

// ---------- Zeichnen ----------
const pts = e => e.pts.map(([x, y]) => P(x, y));
const pl = e => pts(e).map(p => p.join(',')).join(' ');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function legVec(swId, port) {
  const e = il.edges[il.portMap[`${swId}.${port}`]];
  const pp = pts(e);
  const fromStart = e.ends[0].node === swId && e.ends[0].port === port;
  const a = fromStart ? pp[0] : pp[pp.length - 1];
  const b = fromStart ? pp[1] : pp[pp.length - 2];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}
const num = (n, w = 5) => String(n).padStart(w, '0');

function draw() {
  const out = [];
  for (const e of Object.values(il.edges)) {
    const occ = il.isOccupied(e.id), lk = !!il.lock[e.id];
    const col = occ ? C.occ : lk ? C.route : C.free;
    out.push(`<polyline points="${pl(e)}" fill="none" stroke="${col}" stroke-width="${occ || lk ? 4.4 : 3.2}" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(`<polyline data-k="edge" data-id="${e.id}" points="${pl(e)}" fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round"/>`);
  }
  // Weichen
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sw') continue;
    const s = il.sw[n.id];
    const [x, y] = P(n.x, n.y);
    const occ = il.isOccupied(n.id), lk = !!il.lock[n.id], fl = !!il.flankLock[n.id];
    const moving = s.target !== s.pos;
    const show = occ || lk || fl || s.sperre || moving || il.ausleuchtung || s.aufgefahren;
    const lc = occ ? C.occ : C.ye;
    if (show) {
      const draw1 = (port, pulse) => {
        const [vx, vy] = legVec(n.id, port);
        out.push(`<line x1="${x}" y1="${y}" x2="${x + vx * 11}" y2="${y + vy * 11}" stroke="${lc}" stroke-width="3.2" stroke-linecap="round" ${pulse ? 'class="pulse"' : ''}/>`);
      };
      if (s.aufgefahren) { draw1('str', true); draw1('br', true); }
      else if (moving) { draw1('stem', false); draw1(s.target, true); }
      else { draw1('stem', false); draw1(s.pos, false); }
    }
    const spitze = occ ? C.occ : lk ? C.ye : C.bg;
    const ring = s.stoerMelder ? '#ef4444' : '#566274';
    out.push(`<circle cx="${x}" cy="${y}" r="5.4" fill="${spitze}" stroke="${ring}" stroke-width="${s.stoerMelder ? 2.4 : 1.2}" ${s.stoerMelder ? 'class="pulse"' : ''}/>`);
    if (lk || fl) out.push(`<rect x="${x + 5}" y="${y + 5}" width="5" height="5" fill="${C.ye}"/>`);
    if (s.sperre) out.push(`<circle cx="${x - 7}" cy="${y + 8}" r="2.8" fill="#ef4444"/>`);
    out.push(`<text x="${x}" y="${y + (n.no === '047' || n.no === '044' ? 16 : -9)}" fill="${s.stoerMelder ? '#f87171' : '#9fb0c3'}" font-size="8.5" text-anchor="middle" font-weight="600">${n.no}</text>`);
    out.push(`<circle data-k="sw" data-id="${n.id}" cx="${x}" cy="${y}" r="12" fill="transparent"/>`);
  }
  // Signale
  const tgt = new Set(ui.targets);
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sig') continue;
    const sg = il.sig[n.id];
    const r = il.routeOf(n.id);
    const [x, y] = P(n.x, n.y);
    const sd = n.dir === 'E' ? 1 : -1;
    const cy = y + sd * 15;
    const open = sg.aspect !== 'Hp0';
    const fill = open && sg.aspect !== 'Zs1' ? '#22c55e' : '#ef4444';
    const sel = ui.start === n.id || (ui.pending && ui.pending.start === n.id);
    out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + sd * 9}" stroke="#9aa6b5" stroke-width="2"/>`);
    out.push(`<line x1="${x - 5}" y1="${y + sd * 9}" x2="${x + 5}" y2="${y + sd * 9}" stroke="#9aa6b5" stroke-width="2"/>`);
    if (sel) out.push(`<circle cx="${x}" cy="${cy}" r="11" fill="none" stroke="#a855f7" stroke-width="2.4" class="pulse"/>`);
    if (sg.sperre) out.push(`<circle cx="${x}" cy="${cy}" r="9.5" fill="none" stroke="#facc15" stroke-width="2"/>`);
    out.push(`<circle cx="${x}" cy="${cy}" r="6" fill="${fill}" stroke="${sg.disturbed ? '#f87171' : '#0b0f14'}" stroke-width="${sg.disturbed ? 2.2 : 1}" ${sg.disturbed ? 'class="pulse"' : ''}/>`);
    if (sg.aspect === 'Zs1') out.push(`<path d="M${x - 4},${cy + 3} L${x + 4},${cy + 3} L${x},${cy - 4} Z" fill="#fff" class="pulse"/>`);
    // Festlegemelder (gelbes Quadrat neben der Starttaste)
    if (r && r.ffm) out.push(`<rect x="${x + (n.dir === 'E' ? 8 : -14)}" y="${cy - 3.5}" width="7" height="7" fill="${C.ye}"/>`);
    out.push(`<text x="${x + (n.dir === 'E' ? -9 : 9)}" y="${cy + 3}" fill="#c8d3e0" font-size="9" font-weight="700" text-anchor="${n.dir === 'E' ? 'end' : 'start'}">${n.name}</text>`);
    out.push(`<circle data-k="sig" data-id="${n.id}" cx="${x}" cy="${cy}" r="14" fill="transparent"/>`);
  }
  // Zieltasten
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'term') continue;
    const [x, y] = P(n.x, n.y);
    const valid = tgt.has(n.id);
    const dim = tgt.size > 0 && !valid;
    const col = valid ? '#c084fc' : '#556070';
    const w = n.side === 'E' ? 1 : -1;
    out.push(`<path d="M${x},${y - 6} L${x + w * 9},${y} L${x},${y + 6} Z" fill="${valid ? col : 'none'}" stroke="${col}" stroke-width="1.6" ${valid ? 'class="pulse"' : ''} opacity="${dim ? .35 : 1}"/>`);
    out.push(`<text x="${x + (n.side === 'E' ? 14 : -4)}" y="${n.side === 'E' ? y + 3.5 : y - 9}" fill="${valid ? '#d8b4fe' : '#8b98a8'}" font-size="${n.side === 'E' ? 9.5 : 8.5}" font-weight="${valid ? 700 : 500}" opacity="${dim ? .5 : 1}">${esc(n.side === 'E' ? n.name : n.label)}</text>`);
    out.push(`<rect data-k="term" data-id="${n.id}" x="${n.side === 'E' ? x - 6 : x - 14}" y="${y - 12}" width="${n.side === 'E' ? 60 : 28}" height="24" fill="transparent"/>`);
  }
  // Züge
  for (const t of il.trains) {
    const c = t.cur;
    let x, y;
    if (c.kind === 'edge') {
      const pp = pts(il.edges[c.id]);
      [x, y] = pp.length === 2 ? [(pp[0][0] + pp[1][0]) / 2, (pp[0][1] + pp[1][1]) / 2] : pp[Math.floor(pp.length / 2)];
    } else [x, y] = P(il.nodes[c.id].x, il.nodes[c.id].y);
    const col = t.state === 'done' ? '#94a3b8' : t.state === 'halt' ? '#f59e0b' : '#38bdf8';
    const lab = t.no || t.id, hw = Math.max(13, String(lab).length * 4.2 + 5);
    out.push(`<g data-k="train" data-id="${t.id}"><rect x="${x - hw}" y="${y - 6}" width="${hw * 2}" height="12" rx="3" fill="${col}" stroke="#0b0f14" stroke-width="1.5"/><text x="${x}" y="${y + 3.5}" font-size="9" font-weight="800" text-anchor="middle" fill="#06222f">${lab}</text></g>`);
  }
  svg.innerHTML = out.join('');
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
    .map(([k, v]) => `<div><span>${k}</span> <b>${num(v)}</b></div>`).join('');
  const rs = il.routes.map(r => {
    const sg = il.sig[r.start];
    const open = sg.aspect !== 'Hp0';
    const cls = open ? 'open' : r.state === 'locked' ? 'locked' : 'setting';
    const st = open ? (sg.aspect === 'Zs1' ? 'Zs 1' : 'Fahrt') : r.state === 'locked' ? (r.ffm ? 'festgelegt' : 'aufgelöst') : 'läuft ein';
    return `<span class="chip ${cls}">${esc(r.names)} · ${st}</span>`;
  });
  document.getElementById('routes').innerHTML = rs.length ? rs.join('') : '<span style="color:#8b98a8">keine</span>';
  const s = Math.floor(il.time);
  document.getElementById('clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  document.querySelectorAll('[data-key]').forEach(b => b.classList.toggle('pend', !!ui.pending && ui.pending.key === b.dataset.key));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', ui.mode === b.dataset.mode));
  document.getElementById('btn-ausl').classList.toggle('on', il.ausleuchtung);
  document.getElementById('nstp-disp').textContent = numBuf.padEnd(4, '–');
  document.getElementById('btn-betrieb').textContent = 'Betrieb: ' + LEVELS[bt.level].name;
  document.getElementById('score').textContent = `✔ ${bt.score.ok} · ✖ ${bt.score.wrong} · Verspätung ${bt.score.delay.toFixed(1)} min`;
  const zl = il.trains.filter(t => t.kind).map(t => `<div><b>${t.no}</b> → ${esc(il.nodes[t.dest].name)}${t.state === 'halt' ? ' <span class="h">wartet</span>' : t.state === 'done' ? ' (Halt)' : ''}</div>`);
  document.getElementById('zugliste').innerHTML = zl.length ? zl.join('') : '–';
}

// ---------- Bedienung ----------
const deadline = () => windowSec ? now() + windowSec * 1000 : Infinity;
function clearPending() { ui.pending = null; ui.start = null; ui.targets = []; }

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
    case 'HaGT': k === 'sig' ? il.signalHalt(id) : bad(); break;
    case 'ErsGT': k === 'sig' ? il.ersatzsignal(id) : bad(); break;
    case 'LsSpT': k === 'sig' ? il.signalSperren(id) : bad(); break;
    case 'LsESpT': k === 'sig' ? il.signalEntsperren(id) : bad(); break;
    case 'AzGrT': (k === 'sw' || k === 'edge') ? il.azGrund(id) : bad(); break;
    case 'FHT':
    case 'FRT':
      if (k === 'sig') {
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
    else if (m === 'STS' && k === 'sig') { il.toggleSignalFault(id); ui.mode = null; }
    else if (m === 'STG' && (k === 'edge' || k === 'sw')) { il.toggleTrackFault(id); ui.mode = null; }
    else il.msg('Hier nicht möglich – anderes Objekt antippen oder Taste erneut drücken.', 'warn');
    draw();
    return;
  }
  if (k === 'sig') {
    if (ui.start === id) { clearPending(); }
    else if (il.sig[id].route) il.msg(`Signal ${il.nodes[id].name}: Fahrstraße bereits eingestellt`, 'warn');
    else { ui.start = id; ui.startUntil = deadline(); ui.targets = il.validTargets(id); il.msg(`Starttaste ${il.nodes[id].name}: Zieltaste bedienen`); }
  } else if (k === 'term' && ui.start) {
    il.request(ui.start, id);
    clearPending();
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
document.getElementById('btn-betrieb').addEventListener('click', () => { bt.setLevel((bt.level + 1) % LEVELS.length); draw(); });
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
document.getElementById('btn-speed').addEventListener('click', e => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; e.target.textContent = speed + '×'; });
document.getElementById('btn-window').addEventListener('click', e => {
  windowSec = windowSec === 5 ? 10 : windowSec === 10 ? 0 : 5;
  e.target.textContent = windowSec ? `Zeitfenster ${windowSec} s` : 'Zeitfenster aus';
});

// ---------- Zoom / Pan / Tap ----------
const VB0 = { x: 30, y: 566, w: 1110, h: 470 };
let vb = { ...VB0 };
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
  draw();
}, 250);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
