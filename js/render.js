// Zeichnung des Gleisbilds im Stil des Stelltischbilds (Pixelkoordinaten des Vorlagebildes)
const TRAIN_LEN = 84;
const BG = '#d0d0d0', GREY_BLOCK = '#aaaaaa', CORE = '#767676';
const C_LOCK = '#f2d300', C_OCC = '#ff2a1a';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FONT = 'font-family="Arial,Helvetica,sans-serif"';

function box(x, y, w, h, fill = '#fff', stroke = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1"` : ''}/>`;
}
function sq(x, y, fill = '#fff', s = 5) {
  return `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="${fill}" stroke="#000" stroke-width="1.3"/>`;
}
function nIcon(x, y) {
  return `<g><rect x="${x - 4}" y="${y - 3.5}" width="8" height="7" fill="#c8272d" stroke="#111" stroke-width="1"/><path d="M${x - 2.2} ${y + 2} L${x - 2.2} ${y - 2} L${x + 2.2} ${y + 2} L${x + 2.2} ${y - 2}" fill="none" stroke="#fff" stroke-width="1.1"/></g>`;
}
function ring(x, y, fill = '#9a9a9a', r = 4) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#111" stroke-width="1.6"/>`;
}
function redLamp(x, y, r = 4.6, on = true) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${on ? '#ee1111' : '#6a1a1a'}" stroke="#2a0000" stroke-width="1.6"/>`;
}
function led(l) {
  let s = `<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" fill="#0d0d0d"/>`;
  const n = 5, cw = (l.w - 8) / n;
  for (let i = 0; i < n; i++) s += `<rect x="${l.x + 5 + i * cw + 1}" y="${l.y + 1.5}" width="${cw - 3}" height="${l.h - 3}" fill="#2a2a2a"/><rect x="${l.x + 5 + i * cw + cw / 2 - 1.2}" y="${l.y + 2.5}" width="2" height="${l.h - 5}" fill="#3d3d3d"/>`;
  s += `<circle cx="${l.x + 0.5}" cy="${l.y + 3}" r="3" fill="#d6d6d6" stroke="#000" stroke-width="1.4"/>`;
  return s;
}
// kleines Signalbild (Lampen in Richtung dir); lit = rot/grün/weiß
function lamps(x, y, dir, aspect, vertical) {
  const open = aspect === 'Hp1' || aspect === 'Hp2';
  const red = aspect === 'Hp0';
  const gcol = open ? '#27e052' : '#16521f', rcol = red ? '#ff1c1c' : '#5a1717', wcol = aspect === 'Zs1' ? '#ffffff' : '#2a2a2a';
  let g;
  if (dir === 'E') {
    g = `<rect x="${x - 11.5}" y="${y + 5.5}" width="29" height="7" rx="3" fill="#111"/>${sq(x - 16, y + 9, '#8a8a8a', 5)}
      <circle cx="${x - 1}" cy="${y + 9}" r="3.6" fill="${rcol}"/><circle cx="${x + 8}" cy="${y + 9}" r="3.6" fill="${gcol}"/>${sq(x + 22, y + 9, '#9a9a80', 5)}
      <circle cx="${x + 16.5}" cy="${y + 9}" r="1.8" fill="${wcol}"/>`;
  } else {
    g = `<rect x="${x - 21}" y="${y - 12.5}" width="31" height="7" rx="3" fill="#111"/><circle cx="${x - 9}" cy="${y - 9}" r="3.6" fill="${gcol}"/><circle cx="${x}" cy="${y - 9}" r="3.6" fill="${rcol}"/>
      <path d="M${x + 5} ${y - 11.5} l4 5" stroke="${aspect === 'Zs1' ? '#fff' : '#555'}" stroke-width="1.6"/>${sq(x + 17, y - 9, '#8a8a8a', 5)}${sq(x - 27, y - 9, '#9a9a80', 5)}`;
  }
  if (vertical) return `<g transform="translate(${x} ${y}) rotate(-90) translate(${-x} ${-y})">${g}</g>`;
  return g;
}
function glyph(x, y, d) {
  // Signalbild ohne Taste (dunkelgrün)
  const dx = d === 'E' ? 1 : -1;
  return `<g><rect x="${x - 9}" y="${y - 5}" width="18" height="10" rx="4" fill="#0d1a0d"/><circle cx="${x - 3 * dx}" cy="${y}" r="3.4" fill="#2c4a22"/><circle cx="${x + 4 * dx}" cy="${y}" r="3.4" fill="#4a5a2a"/><rect x="${x + (d === 'E' ? -13 : 10)}" y="${y - 4}" width="3" height="8" fill="#111"/></g>`;
}
function zielSym(x, y, form) {
  if (form === 'R') return `<line x1="${x - 10}" y1="${y + 9}" x2="${x - 3}" y2="${y + 9}" stroke="#000" stroke-width="2"/><rect x="${x - 12.5}" y="${y + 3.5}" width="3" height="11" fill="#000"/>${sq(x - 17, y + 8.5, '#9a9a9a', 5)}${redLamp(x, y + 9)}`;
  return `<line x1="${x + 3}" y1="${y - 8}" x2="${x + 10}" y2="${y - 8}" stroke="#000" stroke-width="2"/><rect x="${x + 9.5}" y="${y - 14}" width="3" height="11" fill="#000"/>${sq(x + 17, y - 8, '#9a9a9a', 5)}${redLamp(x, y - 8)}`;
}

export function renderStatic(data) {
  const d = data.decor, out = [];
  out.push(`<rect x="-10" y="180" width="1620" height="340" fill="${BG}"/>`);
  for (const b of d.blocks) out.push(box(b.x, b.y, b.w, b.h, GREY_BLOCK));
  const [bx, by, bw, bh] = d.edge.blue, [gx, gy, gw, gh] = d.edge.green;
  out.push(box(bx, by, bw, bh, '#8890ff'), box(gx, gy, gw, gh, '#78ed6a'));
  const t = d.title;
  out.push(`<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="#5c9a5e" stroke="#9bd09c" stroke-width="1.5"/><text x="${t.x + t.w / 2}" y="${t.y + 16.5}" text-anchor="middle" font-size="13.5" font-weight="700" ${FONT} fill="#111">${t.text}</text>`);
  for (const l of d.leds) out.push(led(l));
  for (const g of d.glyphs) out.push(glyph(g.x, g.y, g.d));
  return out.join('');
}

export function renderLabels(data) {
  const d = data.decor, out = [];
  for (const l of d.labels) {
    const w = l.text.length * (l.kind === 'track' ? 6.2 : l.kind === 'place' ? 7.3 : 5.2) + 6;
    if (l.kind === 'track') out.push(box(l.x - w / 2, l.y - 8, w, 16, '#fff'), `<text x="${l.x}" y="${l.y + 4.6}" text-anchor="middle" font-size="13" ${FONT} fill="#111">${esc(l.text)}</text>`);
    else if (l.kind === 'place') out.push(box(l.x - 2, l.y - 12, w, 17, '#fff'), `<text x="${l.x}" y="${l.y + 1}" font-size="13" font-weight="700" ${FONT} fill="#000">${esc(l.text)}</text>`);
    else out.push(box(l.x - 2, l.y - 9, w, 13, '#fff'), `<text x="${l.x}" y="${l.y}" font-size="10" ${FONT} fill="#111">${esc(l.text)}</text>`);
  }
  return `<g pointer-events="none">${out.join('')}</g>`;
}

export function renderDynamic(il, ui) {
  const out = [];
  const pts = e => e.pts;
  // Gleise
  for (const e of Object.values(il.edges)) {
    const occ = il.isOccupied(e.id), lk = !!il.lock[e.id];
    const dd = 'M' + pts(e).map(p => p.join(',')).join(' L');
    out.push(`<path d="${dd}" fill="none" stroke="#000" stroke-width="5.4" stroke-linejoin="round"/>`);
    out.push(`<path d="${dd}" fill="none" stroke="${occ ? C_OCC : lk ? C_LOCK : CORE}" stroke-width="3" stroke-dasharray="8 4" stroke-linejoin="round"/>`);
    out.push(`<path data-k="edge" data-id="${e.id}" d="${dd}" fill="none" stroke="transparent" stroke-width="14"/>`);
  }
  // Markierungen (Gleisgrenzen) mit Nummernschild
  for (const m of il.data.decor.markers) {
    out.push(ring(m.x, m.y));
    if (m.no) {
      const w = m.no.length * 5.8 + 3;
      out.push(box(m.side === 'l' ? m.x - 6 - w : m.x + 6, m.y - 5.5, w, 11), `<text x="${(m.side === 'l' ? m.x - 6 - w : m.x + 6) + w / 2}" y="${m.y + 3.6}" text-anchor="middle" font-size="9.6" ${FONT} fill="#222">${m.no}</text>`);
    }
    if (m.n === 't') out.push(nIcon(m.x - 3, m.y - 11));
    if (m.n === 'b') out.push(nIcon(m.x - 3, m.y + 11));
  }
  // Gleisenden mit Rahmen (Strecken- und Abstellgleise)
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'term' || n.hidden) continue;
    const tgtOK = ui.targets.includes(n.id);
    const pulse = tgtOK ? ' class="pulse"' : '';
    if (n.border) {
      const up = n.border === 'u', s = up ? -1 : 1;
      out.push(redLamp(n.x, n.y + s * 24), sq(n.x - 5, n.y + s * 13, '#8a8a8a'), sq(n.x + 4, n.y + s * 13, '#5a2a2a'), sq(n.x + 10, n.y - 8, '#8a8a8a'));
      out.push(redLamp(n.x, n.y, 5));
      if (tgtOK) out.push(`<circle cx="${n.x}" cy="${n.y}" r="9" fill="none" stroke="#a855f7" stroke-width="2.6"${pulse}/>`);
      out.push(`<circle data-k="term" data-id="${n.id}" cx="${n.x}" cy="${n.y}" r="14" fill="transparent"/>`);
    } else if (n.ziel) {
      out.push(n.plain ? ring(n.x, n.y) : redLamp(n.x, n.y, 4.8));
      out.push(zielSym(n.x, n.y, n.ziel));
      if (n.plain) { /* Ziel liegt neben dem Gleis */ }
      if (tgtOK) out.push(`<circle cx="${n.x}" cy="${n.y + (n.ziel === 'R' ? 9 : -8)}" r="8.5" fill="none" stroke="#a855f7" stroke-width="2.6"${pulse}/>`);
      out.push(`<circle data-k="term" data-id="${n.id}" cx="${n.x}" cy="${n.y + (n.ziel === 'R' ? 5 : -5)}" r="13" fill="transparent"/>`);
    } else if (n.bw) {
      out.push(redLamp(n.x, n.y, 5), redLamp(n.x + 24, n.y, 5), sq(n.x - 6, n.y + 12, '#8a8a8a'), sq(n.x + 24, n.y + 12, '#5a2a2a'));
      if (tgtOK) out.push(`<circle cx="${n.x}" cy="${n.y}" r="9" fill="none" stroke="#a855f7" stroke-width="2.6"${pulse}/>`);
      out.push(`<circle data-k="term" data-id="${n.id}" cx="${n.x}" cy="${n.y}" r="14" fill="transparent"/>`);
    }
  }
  // unsichtbare Gleisenden: Fläche des Randfelds antippbar
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'term' || !n.hidden || !n.area) continue;
    const [x, y, w, h] = n.area;
    const ok = ui.targets.includes(n.id);
    out.push(`<rect data-k="term" data-id="${n.id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${ok ? 'rgba(168,85,247,.55)' : 'transparent'}"${ok ? ' class="pulse"' : ''}/>`);
  }
  // Weichen
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sw') continue;
    const s = il.sw[n.id];
    const occ = il.isOccupied(n.id), lk = !!il.lock[n.id], fl = !!il.flankLock[n.id];
    const moving = s.target !== s.pos;
    const fill = occ ? C_OCC : lk || fl ? C_LOCK : '#9a9a9a';
    const pulse = moving || s.stoerMelder ? ' class="pulse"' : '';
    out.push(`<circle cx="${n.x}" cy="${n.y}" r="4.2" fill="${fill}" stroke="${s.stoerMelder ? '#e11' : '#111'}" stroke-width="${s.stoerMelder ? 2.4 : 1.7}"${pulse}/>`);
    out.push(sq(n.x + 2, n.y - 8, s.sperre ? '#ff5050' : '#fff'), sq(n.x - 3, n.y + 5, '#fff'));
    const lab = n.lab;
    if (lab === 't') out.push(`<text x="${n.x - 5}" y="${n.y - 10}" font-size="10" ${FONT} fill="#8a8a98">${n.no}</text><line x1="${n.x - 5}" y1="${n.y - 7}" x2="${n.x + 5}" y2="${n.y - 7}" stroke="#000" stroke-width="1.3"/>`);
    else if (lab === 'b') out.push(`<text x="${n.x - 8}" y="${n.y + 17}" font-size="10" ${FONT} fill="#8a8a98">${n.no}</text><line x1="${n.x - 8}" y1="${n.y + 8}" x2="${n.x + 4}" y2="${n.y + 8}" stroke="#000" stroke-width="1.3"/>`);
    else out.push(`<line x1="${n.x - 9}" y1="${n.y + 6}" x2="${n.x + 1}" y2="${n.y + 6}" stroke="#000" stroke-width="1.3"/>`);
    out.push(`<circle data-k="sw" data-id="${n.id}" cx="${n.x}" cy="${n.y}" r="11" fill="transparent"/>`);
  }
  // Signale
  const tgt = new Set(ui.targets);
  for (const n of Object.values(il.nodes)) {
    if (n.t !== 'sig') continue;
    const sg = il.sig[n.id], r = il.routeOf(n.id);
    const open = sg.aspect !== 'Hp0';
    const sel = ui.start === n.id || (ui.pending && ui.pending.start === n.id);
    const isT = tgt.has(n.id);
    if (!n.nolamp) out.push(lamps(n.x, n.y, n.dir, sg.aspect, n.vertical));
    if (sg.disturbed) out.push(`<circle cx="${n.x}" cy="${n.y}" r="9" fill="none" stroke="#e11" stroke-width="2" class="pulse"/>`);
    // Nummernschild
    const w = n.name.length * 5.9 + 3;
    if (n.vertical) {
      out.push(`<g transform="translate(${n.x - 3} ${n.y - 14}) rotate(-90)"><rect x="0" y="-6" width="${w}" height="11" fill="#fff"/><text x="${w / 2}" y="2.8" text-anchor="middle" font-size="9.6" ${FONT} fill="#222">${n.name}</text></g>`);
    } else {
      const lx = n.lab === 'l' ? n.x - 7 - w : n.x + 7;
      out.push(box(lx, n.y - 5.5, w, 11), `<text x="${lx + w / 2}" y="${n.y + 3.5}" text-anchor="middle" font-size="9.6" ${FONT} fill="#222">${n.name}</text>`);
    }
    // rote Zugstraßentaste (immer rot hinterlegt)
    const selZ = ui.start === n.id && ui.kind !== 'rangier';
    out.push(`<circle cx="${n.x}" cy="${n.y}" r="5.6" fill="#ee1111" stroke="${selZ ? '#a855f7' : '#220000'}" stroke-width="${selZ ? 2.8 : 1.7}"${selZ ? ' class="pulse"' : ''}/>`);
    const zTgt = tgt.has(n.id) && ui.kind !== 'rangier';
    if (zTgt) out.push(`<circle cx="${n.x}" cy="${n.y}" r="9.5" fill="none" stroke="#a855f7" stroke-width="2.6" class="pulse"/>`);
    // graue Rangiertaste am Signalbild
    if (!n.nolamp && !n.vertical) {
      const rx = n.dir === 'E' ? n.x - 16 : n.x + 17, ry = n.dir === 'E' ? n.y + 9 : n.y - 9;
      const selR = ui.start === n.id && ui.kind === 'rangier';
      const rTgt = tgt.has(n.id) && ui.kind === 'rangier';
      out.push(`<rect x="${rx - 3.5}" y="${ry - 3.5}" width="7" height="7" fill="${selR || rTgt ? '#d9b8ff' : '#9a9a9a'}" stroke="${selR || rTgt ? '#a855f7' : '#111'}" stroke-width="${selR || rTgt ? 2.2 : 1.4}"${selR || rTgt ? ' class="pulse"' : ''}/>`);
      out.push(`<circle data-k="rsig" data-id="${n.id}" cx="${rx}" cy="${ry}" r="9" fill="transparent"/>`);
    }
    if (r && r.ffm) out.push(sq(n.x + 8, n.y - 9, C_LOCK, 6));
    out.push(`<circle data-k="sig" data-id="${n.id}" cx="${n.x}" cy="${n.y + (n.vertical ? 0 : n.dir === 'E' ? 3 : -3)}" r="9" fill="transparent"/>`);
  }
  // Züge: Balken entlang des Gleises, passt zwischen die Signale
  const along = (pts, d0, d1) => {
    const res = []; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
      const a = Math.max(d0, acc), b = Math.min(d1, acc + L);
      if (b > a) {
        if (!res.length) res.push([x0 + (x1 - x0) * (a - acc) / L, y0 + (y1 - y0) * (a - acc) / L]);
        res.push([x0 + (x1 - x0) * (b - acc) / L, y0 + (y1 - y0) * (b - acc) / L]);
      }
      acc += L;
    }
    return res;
  };
  for (const t of il.trains) {
    const c = t.cur;
    let x, y, bar = null;
    if (c.kind === 'edge') {
      const e = il.edges[c.id];
      let pp = e.pts;
      if (!(e.ends[1].node === c.to.node && e.ends[1].port === c.to.port)) pp = pp.slice().reverse();   // Fahrtrichtung: Ende = Ziel
      let L = 0; for (let i = 1; i < pp.length; i++) L += Math.hypot(pp[i][0] - pp[i - 1][0], pp[i][1] - pp[i - 1][1]);
      const len = Math.min(TRAIN_LEN, Math.max(14, L - 10));
      const atEnd = t.state === 'halt' || t.state === 'done';
      const mid = atEnd ? L - 5 - len / 2 : L / 2;
      bar = along(pp, mid - len / 2, mid + len / 2);
      [x, y] = bar[Math.floor(bar.length / 2)] || pp[0];
    } else [x, y] = [il.nodes[c.id].x, il.nodes[c.id].y];
    const col = t.state === 'done' ? '#94a3b8' : t.state === 'halt' ? '#f59e0b' : '#38bdf8';
    const lab = t.no || t.id, hw = Math.max(13, String(lab).length * 4.2 + 5);
    let g = '';
    if (bar && bar.length > 1) {
      const dd = 'M' + bar.map(p => p.join(',')).join(' L');
      g += `<path d="${dd}" fill="none" stroke="#0b0f14" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${dd}" fill="none" stroke="${col}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    g += `<rect x="${x - hw}" y="${y - 19}" width="${hw * 2}" height="11" rx="3" fill="${col}" stroke="#0b0f14" stroke-width="1.2"/><text x="${x}" y="${y - 11}" font-size="8.6" font-weight="800" text-anchor="middle" fill="#06222f" ${FONT}>${lab}</text>`;
    out.push(`<g data-k="train" data-id="${t.id}">${g}</g>`);
  }
  return out.join('');
}
