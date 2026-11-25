import { Interlocking, FHT_WAIT } from './engine.js';
import data from './data-skl-west.js';

const SY = 1.4, Y0 = 560;                       // vertikale Streckung des Plans
const P = (x, y) => [x, Y0 + (y - Y0) * SY];
const COL = { free: '#6b7686', locked: '#f3f4f6', occ: '#ff3b30', bg: '#0b0f14', flank: '#22d3ee' };

let il;
let ui;
const svg = document.getElementById('plan');
const meld = document.getElementById('meldung');
let speed = 1;

function reset() {
  il = new Interlocking(data);
  ui = { start: null, mode: null, dir: 'E', targets: [] };
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('on'));
  setBtnDir();
  il.msg('Neustart. Signal antippen = Start, dann Ziel antippen.');
  draw();
}

// ---------- Zeichnen ----------
function pts(e) { return e.pts.map(([x, y]) => P(x, y)); }
function pl(e) { return pts(e).map(p => p.join(',')).join(' '); }
function elState(el) {
  if (il.isOccupied(el)) return 'occ';
  if (il.lock[el]) return 'locked';
  return 'free';
}
function legVec(swId, port) {
  const eid = il.portMap[`${swId}.${port}`];
  const e = il.edges[eid];
  const pp = pts(e);
  const fromStart = e.ends[0].node === swId && e.ends[0].port === port;
  const a = fromStart ? pp[0] : pp[pp.length - 1];
  const b = fromStart ? pp[1] : pp[pp.length - 2];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function draw() {
  const out = [];
  // Edges (Hit-Fläche + Linie)
  for (const e of Object.values(il.edges)) {
    const st = elState(e.id);
    const col = COL[st];
    out.push(`<polyline points="${pl(e)}" fill="none" stroke="${col}" stroke-width="${st === 'free' ? 3.2 : 4.2}" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (il.fault[e.id]) out.push(`<polyline points="${pl(e)}" fill="none" stroke="#fde047" stroke-width="1.5" stroke-dasharray="3 5"/>`);
    out.push(`<polyline data-k="edge" data-id="${e.id}" points="${pl(e)}" fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round"/>`);
  }
  // Weichen
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sw') continue;
    const s = il.sw[n.id];
    const [x, y] = P(n.x, n.y);
    const st = elState(n.id);
    const moving = s.target !== s.pos && !s.disturbed;
    const col = COL[st];
    // Lage-Anzeige: Spitze und aktiver Strang
    const active = moving ? null : s.pos;
    const legs = active ? ['stem', active] : ['stem'];
    for (const l of legs) {
      const [vx, vy] = legVec(n.id, l);
      out.push(`<line x1="${x}" y1="${y}" x2="${x + vx * 10}" y2="${y + vy * 10}" stroke="${st === 'free' ? '#e5e7eb' : col}" stroke-width="3" stroke-linecap="round"/>`);
    }
    const fl = il.flankLock[n.id];
    const ring = s.disturbed ? '#ef4444' : moving ? '#f59e0b' : fl ? COL.flank : '#3b4757';
    out.push(`<circle cx="${x}" cy="${y}" r="5.6" fill="${COL.bg}" stroke="${ring}" stroke-width="${s.disturbed || moving || fl ? 2 : 1.2}" ${moving ? 'class="pulse"' : ''}/>`);
    out.push(`<text x="${x}" y="${y + (n.no === '047' || n.no === '044' ? 15 : -9)}" fill="#9fb0c3" font-size="8.5" text-anchor="middle" font-weight="600">${n.no}</text>`);
    out.push(`<circle data-k="sw" data-id="${n.id}" cx="${x}" cy="${y}" r="12" fill="transparent"/>`);
  }
  // Signale
  const validT = new Set(ui.targets);
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sig') continue;
    const sg = il.sig[n.id];
    const [x, y] = P(n.x, n.y);
    const sd = n.dir === 'E' ? 1 : -1;
    const cy = y + sd * 15;
    let fill = '#ef4444';
    if (sg.aspect === 'Hp1') fill = '#22c55e';
    if (sg.aspect === 'Hp2') fill = '#a3e635';
    const sel = ui.start === n.id;
    out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + sd * 9}" stroke="#9aa6b5" stroke-width="2"/>`);
    out.push(`<line x1="${x - 5}" y1="${y + sd * 9}" x2="${x + 5}" y2="${y + sd * 9}" stroke="#9aa6b5" stroke-width="2"/>`);
    if (sel) out.push(`<circle cx="${x}" cy="${cy}" r="11" fill="none" stroke="#38bdf8" stroke-width="2.2" class="pulse"/>`);
    out.push(`<circle cx="${x}" cy="${cy}" r="6" fill="${fill}" stroke="${sg.disturbed ? '#fde047' : '#0b0f14'}" stroke-width="${sg.disturbed ? 2 : 1}"/>`);
    if (sg.aspect === 'Hp2') out.push(`<circle cx="${x + 2.5}" cy="${cy - 2.5}" r="2.2" fill="#facc15"/>`);
    if (sg.aspect === 'Zs1') out.push(`<circle cx="${x}" cy="${cy}" r="3" fill="#fff" class="pulse"/>`);
    out.push(`<text x="${x + (n.dir === 'E' ? -9 : 9)}" y="${cy + 3}" fill="#c8d3e0" font-size="9" font-weight="700" text-anchor="${n.dir === 'E' ? 'end' : 'start'}">${n.name}</text>`);
    out.push(`<circle data-k="sig" data-id="${n.id}" cx="${x}" cy="${cy}" r="14" fill="transparent"/>`);
  }
  // Zielpunkte
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'term') continue;
    const [x, y] = P(n.x, n.y);
    const valid = validT.has(n.id);
    const dim = ui.start && !valid;
    const col = valid ? '#38bdf8' : '#556070';
    const w = n.side === 'E' ? 1 : -1;
    out.push(`<path d="M${x},${y - 6} L${x + w * 9},${y} L${x},${y + 6} Z" fill="${valid ? col : 'none'}" stroke="${col}" stroke-width="1.6" ${valid ? 'class="pulse"' : ''} opacity="${dim ? .35 : 1}"/>`);
    const tx = x + (n.side === 'E' ? 14 : -4);
    const ty = n.side === 'E' ? y + 3.5 : y - 9;
    out.push(`<text x="${tx}" y="${ty}" fill="${valid ? '#7dd3fc' : '#8b98a8'}" font-size="${n.side === 'E' ? 9.5 : 8.5}" font-weight="${valid ? 700 : 500}" text-anchor="${n.side === 'E' ? 'start' : 'start'}" opacity="${dim ? .5 : 1}">${esc(n.side === 'E' ? n.name : n.label)}</text>`);
    out.push(`<rect data-k="term" data-id="${n.id}" x="${n.side === 'E' ? x - 6 : x - 14}" y="${y - 12}" width="${n.side === 'E' ? 60 : 28}" height="24" fill="transparent"/>`);
  }
  // Züge
  for (const t of il.trains) {
    const c = t.cur;
    let x, y;
    if (c.kind === 'edge') {
      const e = il.edges[c.id], pp = pts(e);
      const m = pp.length === 2 ? [(pp[0][0] + pp[1][0]) / 2, (pp[0][1] + pp[1][1]) / 2] : pp[Math.floor(pp.length / 2)];
      [x, y] = m;
    } else [x, y] = P(il.nodes[c.id].x, il.nodes[c.id].y);
    const col = t.state === 'done' ? '#94a3b8' : t.state === 'halt' ? '#f59e0b' : '#38bdf8';
    out.push(`<g data-k="train" data-id="${t.id}"><rect x="${x - 13}" y="${y - 6}" width="26" height="12" rx="3" fill="${col}" stroke="#0b0f14" stroke-width="1.5"/><text x="${x}" y="${y + 3.5}" font-size="9" font-weight="800" text-anchor="middle" fill="#06222f">${t.id}</text></g>`);
  }
  svg.innerHTML = out.join('');
  drawPanel();
}

function drawPanel() {
  const m = il.messages[0];
  meld.textContent = m ? m.text : 'Bereit.';
  meld.className = 'meldung ' + (m && m.level !== 'info' ? m.level : '');
  const rs = il.routes.map(r => {
    const open = il.sig[r.start].aspect !== 'Hp0';
    const cls = r.fht != null ? 'setting' : open ? 'open' : r.state === 'locked' ? 'locked' : 'setting';
    const txt = r.fht != null ? `${r.names} · Auflösung ${Math.max(0, r.fht).toFixed(0)} s` : `${r.names} · ${open ? il.sig[r.start].aspect : r.state === 'locked' ? 'festgelegt' : 'stellt…'}`;
    return `<span class="chip ${cls}">${esc(txt)}</span>`;
  });
  document.getElementById('routes').innerHTML = rs.length ? rs.join('') : '<span style="color:#8b98a8">keine</span>';
  const s = Math.floor(il.time);
  document.getElementById('clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- Bedienung ----------
function setMode(m) {
  ui.mode = ui.mode === m ? null : m;
  ui.start = null; ui.targets = [];
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === ui.mode));
  if (ui.mode) il.msg(`Hilfsbedienung ${ui.mode}: Objekt antippen`);
  draw();
}
function setBtnDir() { document.getElementById('btn-dir').textContent = ui.dir === 'E' ? '→ Ost' : '← West'; }

function tap(k, id) {
  const m = ui.mode;
  const done = () => { if (!['ZUG'].includes(ui.mode)) { ui.mode = null; document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('on')); } };
  if (m) {
    if (m === 'FHT' && k === 'sig') { il.hilfsaufloesen(id); done(); }
    else if (m === 'SHT' && k === 'sig') { il.signalHalt(id); done(); }
    else if (m === 'EGT' && k === 'sig') { il.ersatzsignal(id); done(); }
    else if (m === 'WT' && k === 'sw') { il.switchManual(id); done(); }
    else if (m === 'STW' && k === 'sw') { il.toggleSwitchFault(id); done(); }
    else if (m === 'STS' && k === 'sig') { il.toggleSignalFault(id); done(); }
    else if (m === 'STG' && (k === 'edge' || k === 'sw')) { il.toggleTrackFault(id); done(); }
    else if (m === 'ZUG' && k === 'edge') { il.spawnTrain(id, ui.dir); }
    else if (m === 'WENDEN' && k === 'train') { il.reverseTrain(+id); done(); }
    else if (m === 'ENTF' && k === 'train') { il.removeTrain(+id); done(); }
    else il.msg('Hier nicht möglich – anderes Objekt antippen oder Taste erneut drücken.', 'warn');
    draw();
    return;
  }
  if (k === 'sig') {
    if (ui.start === id) { ui.start = null; ui.targets = []; }
    else {
      const sg = il.sig[id];
      if (sg.route) { il.msg(`Signal ${il.nodes[id].name} hat bereits eine Fahrstraße (Auflösen mit FHT)`, 'warn'); }
      else {
        ui.start = id; ui.targets = il.validTargets(id);
        il.msg(`Start ${il.nodes[id].name}: Ziel wählen`);
      }
    }
  } else if (k === 'term' && ui.start) {
    il.request(ui.start, id);
    ui.start = null; ui.targets = [];
  } else if (ui.start) {
    ui.start = null; ui.targets = [];
  }
  draw();
}

document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.getElementById('btn-dir').addEventListener('click', () => { ui.dir = ui.dir === 'E' ? 'W' : 'E'; setBtnDir(); });
document.getElementById('btn-reset').addEventListener('click', reset);
document.getElementById('btn-help').addEventListener('click', () => document.getElementById('help').showModal());
document.getElementById('btn-speed').addEventListener('click', e => {
  speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  e.target.textContent = speed + '×';
});

// ---------- Zoom / Pan / Tap ----------
const VB0 = { x: 30, y: 566, w: 1110, h: 470 };
let vb = { ...VB0 };
function applyVB() { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
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
  gesture = { moved: ptrs.size > 1, startVB: { ...vb }, d0: null };
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    gesture.d0 = Math.hypot(a.x - b.x, a.y - b.y);
    gesture.moved = true;
  }
});
svg.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  const prev = { x: p.x, y: p.y };
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 9) gesture.moved = true;
    if (gesture.moved) {
      const sc = clientToSvg(0, 0).sc;
      vb.x -= (p.x - prev.x) / sc; vb.y -= (p.y - prev.y) / sc;
      applyVB();
    }
  } else if (ptrs.size === 2 && gesture.d0) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const f = gesture.d0 / d;
    const c = clientToSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
    const nw = Math.min(VB0.w * 1.2, Math.max(180, vb.w * f));
    const k = nw / vb.w;
    vb.x = c.x - (c.x - vb.x) * k; vb.y = c.y - (c.y - vb.y) * k; vb.w = nw; vb.h = vb.h * k;
    gesture.d0 = d;
    applyVB();
  }
});
function up(e) {
  const p = ptrs.get(e.pointerId);
  ptrs.delete(e.pointerId);
  if (p && gesture && !gesture.moved && ptrs.size === 0) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const t = el && el.closest ? el.closest('[data-k]') : null;
    if (t) tap(t.dataset.k, t.dataset.id); else tap(null, null);
  }
  if (ptrs.size === 0) gesture = null;
}
svg.addEventListener('pointerup', up);
svg.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); gesture = null; });
svg.addEventListener('wheel', e => {
  e.preventDefault();
  const c = clientToSvg(e.clientX, e.clientY);
  const f = e.deltaY > 0 ? 1.12 : 1 / 1.12;
  const nw = Math.min(VB0.w * 1.2, Math.max(180, vb.w * f));
  const k = nw / vb.w;
  vb.x = c.x - (c.x - vb.x) * k; vb.y = c.y - (c.y - vb.y) * k; vb.w = nw; vb.h *= k;
  applyVB();
}, { passive: false });
svg.addEventListener('dblclick', () => { vb = { ...VB0 }; applyVB(); });

// ---------- Start ----------
reset();
applyVB();
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(0.5, (now - last) / 1000) * speed;
  last = now;
  il.tick(dt);
  draw();
}, 250);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
