import { Interlocking } from './engine.js';
import data from './data-skl.js';
import { Betrieb, LEVELS, nextHop } from './betrieb.js';

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

const GR = '#b4b7bd', YE = '#facc15', RD = '#e11d1d', BK = '#101114';
function draw() {
  const out = [];
  // Gleisbänder (schwarz) mit Gleisfeldmelder (Oval)
  for (const e of Object.values(il.edges)) {
    const occ = il.isOccupied(e.id), lk = !!il.lock[e.id];
    const d = 'M' + pts(e).map(p => p.join(',')).join(' L');
    out.push(`<path d="${d}" fill="none" stroke="${BK}" stroke-width="7" stroke-linecap="butt" stroke-linejoin="round"/>`);
    const col = occ ? RD : lk ? YE : GR;
    out.push(`<path d="${d}" pathLength="100" fill="none" stroke="${col}" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="64 100" stroke-dashoffset="-18"/>`);
    out.push(`<path data-k="edge" data-id="${e.id}" d="${d}" fill="none" stroke="transparent" stroke-width="18"/>`);
  }
  // Weichen (Bild 9): Spitzentaste, Stellungsmelder, Verschluss-/Sperrmelder, Bezeichnungsschild
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sw') continue;
    const s = il.sw[n.id];
    const [x, y] = P(n.x, n.y);
    const occ = il.isOccupied(n.id), lk = !!il.lock[n.id], fl = !!il.flankLock[n.id];
    const moving = s.target !== s.pos;
    const show = occ || lk || fl || s.sperre || moving || il.ausleuchtung || s.aufgefahren;
    const oval = (port, lit, pulse) => {
      const [vx, vy] = legVec(n.id, port);
      const c = !lit ? GR : occ ? RD : s.sperre ? YE : YE;
      out.push(`<line x1="${x + vx * 8}" y1="${y + vy * 8}" x2="${x + vx * 19}" y2="${y + vy * 19}" stroke="${c}" stroke-width="4.2" stroke-linecap="round" ${pulse ? 'class="pulse"' : ''}/>`);
    };
    const active = moving ? s.target : s.pos;
    oval('stem', show, false);
    oval('str', show && (s.aufgefahren || active === 'str'), moving && active === 'str' || s.aufgefahren);
    oval('br', show && (s.aufgefahren || active === 'br'), moving && active === 'br' || s.aufgefahren);
    const hot = s.stoerMelder;
    out.push(`<circle cx="${x}" cy="${y}" r="6.2" fill="${BK}" stroke="${hot ? RD : '#f4f4f4'}" stroke-width="${hot ? 2.6 : 1.4}" ${hot ? 'class="pulse"' : ''}/>`);
    out.push(`<circle cx="${x - 4.5}" cy="${y + 11}" r="2.7" fill="${lk || fl ? YE : GR}" stroke="#555" stroke-width=".7" ${s.target !== s.pos && lk ? 'class="pulse"' : ''}/>`);
    out.push(`<circle cx="${x + 4.5}" cy="${y + 11}" r="2.7" fill="${s.sperre ? RD : GR}" stroke="#555" stroke-width=".7"/>`);
    out.push(`<rect x="${x - 9}" y="${y + 15}" width="18" height="9" fill="#fff" stroke="#333" stroke-width=".8"/><text x="${x}" y="${y + 22.4}" fill="#111" font-size="7.4" font-weight="700" text-anchor="middle">${n.no.replace(/^0+/, '')}</text>`);
    out.push(`<circle data-k="sw" data-id="${n.id}" cx="${x}" cy="${y + 6}" r="15" fill="transparent"/>`);
  }
  // Signale (Bild 46, Sp Dr L60): Zugstraßentaste mit Haltmelder, Signalsymbol, Namensschild, Festlegemelder
  const tgt = new Set(ui.targets);
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sig') continue;
    const sg = il.sig[n.id];
    const r = il.routeOf(n.id);
    const [x, y] = P(n.x, n.y);
    const E = n.dir === 'E';
    const open = sg.aspect !== 'Hp0';
    const sel = ui.start === n.id || (ui.pending && ui.pending.start === n.id);
    const by = y + 15;
    const bx = E ? x - 26 : x + 4;
    out.push(`<rect x="${bx}" y="${by - 5.5}" width="22" height="11" rx="4" fill="${BK}"/>`);
    out.push(`<circle cx="${E ? bx + 5 : bx + 17}" cy="${by}" r="3.1" fill="${sg.sperre ? YE : '#777'}"/>`);
    const lamp = sg.aspect === 'Zs1' ? '#ffffff' : open ? '#22c55e' : '#3a3a3a';
    out.push(`<circle cx="${E ? bx + 16.5 : bx + 5.5}" cy="${by}" r="3.9" fill="${lamp}" ${sg.aspect === 'Zs1' ? 'class="pulse"' : ''}/>`);
    if (sg.disturbed) out.push(`<rect x="${bx - 2}" y="${by - 7.5}" width="26" height="15" rx="5" fill="none" stroke="${RD}" stroke-width="2" class="pulse"/>`);
    out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${by}" stroke="#555" stroke-width="1.2"/>`);
    // Zugstraßentaste mit Haltmelder (rot bei Halt)
    out.push(`<circle cx="${x}" cy="${y}" r="7.4" fill="${open ? '#cfd2d6' : RD}" stroke="${sel ? '#9333ea' : '#6b7078'}" stroke-width="${sel ? 3 : 1.6}" ${sel ? 'class="pulse"' : ''}/>`);
    if (r && r.ffm) out.push(`<rect x="${x + (E ? 6 : -14)}" y="${y - 19}" width="8" height="8" fill="${YE}" stroke="#555" stroke-width=".8"/>`);
    const w = n.name.length * 6 + 8;
    out.push(`<rect x="${E ? bx : bx + 22 - w}" y="${by + 8}" width="${w}" height="10" fill="#fff" stroke="#333" stroke-width=".8"/><text x="${(E ? bx : bx + 22 - w) + w / 2}" y="${by + 16}" fill="#111" font-size="8" font-weight="700" text-anchor="middle">${n.name}</text>`);
    out.push(`<circle data-k="sig" data-id="${n.id}" cx="${x}" cy="${y + 5}" r="16" fill="transparent"/>`);
  }
  // Zieltasten
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'term') continue;
    const [x, y] = P(n.x, n.y);
    const valid = tgt.has(n.id);
    const dim = tgt.size > 0 && !valid;
    const w = n.side === 'E' ? 1 : -1;
    out.push(`<line x1="${x}" y1="${y - 9}" x2="${x}" y2="${y + 9}" stroke="${BK}" stroke-width="3"/>`);
    out.push(`<circle cx="${x + w * 10}" cy="${y}" r="6.4" fill="${valid ? '#c084fc' : '#cfd2d6'}" stroke="${valid ? '#7e22ce' : '#6b7078'}" stroke-width="${valid ? 2.6 : 1.4}" ${valid ? 'class="pulse"' : ''} opacity="${dim ? .45 : 1}"/>`);
    const txt = n.side === 'E' ? n.name : n.label;
    out.push(`<text x="${x + (n.side === 'E' ? 22 : -4)}" y="${n.side === 'E' ? y + 3.5 : y - 11}" fill="#222" font-size="${n.side === 'E' ? 9.5 : 8.5}" font-weight="${valid ? 800 : 600}" opacity="${dim ? .5 : 1}">${esc(txt)}</text>`);
    out.push(`<rect data-k="term" data-id="${n.id}" x="${n.side === 'E' ? x - 4 : x - 22}" y="${y - 12}" width="${n.side === 'E' ? 64 : 30}" height="24" fill="transparent"/>`);
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
    out.push(`<g data-k="train" data-id="${t.id}"><rect x="${x - hw}" y="${y - 17}" width="${hw * 2}" height="11" rx="3" fill="${col}" stroke="#0b0f14" stroke-width="1.2"/><text x="${x}" y="${y - 9}" font-size="8.6" font-weight="800" text-anchor="middle" fill="#06222f">${lab}</text></g>`);
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
  document.getElementById('clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  document.querySelectorAll('[data-key]').forEach(b => b.classList.toggle('pend', !!ui.pending && ui.pending.key === b.dataset.key));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', ui.mode === b.dataset.mode));
  document.getElementById('btn-ausl').classList.toggle('on', il.ausleuchtung);
  document.getElementById('nstp-disp').textContent = numBuf.padEnd(4, '–');
  document.getElementById('btn-betrieb').textContent = 'Betrieb: ' + LEVELS[bt.level].name;
  document.getElementById('score').textContent = `✔ ${bt.score.ok} · ✖ ${bt.score.wrong} · Verspätung ${bt.score.delay.toFixed(1)} min`;
  const zl = il.trains.filter(t => t.kind).map(t => {
    const nd = t.cur.kind === 'edge' ? il.nodes[t.cur.to.node] : null;
    let via = '';
    if (nd && nd.t === 'sig' && t.state === 'halt' && !il.sig[nd.id].route && nd.id !== t.dest) { const h = nextHop(il, nd.id, t.dest); if (h && h !== t.dest) via = ` · zuerst ${esc(il.nodes[h].name)}`; }
    return `<div><b>${t.no}</b> → ${esc(il.nodes[t.dest].name)}${t.state === 'halt' ? ' <span class="h">wartet</span>' : t.state === 'done' ? ' (Halt)' : ''}${via}</div>`;
  });
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
const VIEWS = { west: { x: 30, y: 566, w: 1110, h: 470 }, ost: { x: 1030, y: 556, w: 960, h: 520 }, all: { x: 30, y: 556, w: 1960, h: 520 } };
const VB0 = { ...VIEWS.all, w: 2100 };
let vb = { ...VIEWS.west };
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
  draw();
}, 250);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
