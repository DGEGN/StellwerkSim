// Fahrplanbetrieb: erzeugt Ein- und Ausfahrten mit Zugnummern und bewertet die Abwicklung.
const WEST_ENTRIES = [
  { edge: 'e_a0', sig: 's_D', from: 'Lauterecken-Grumbach', dir: 'E' },
  { edge: 'e_b0', sig: 's_CC', from: 'Homburg (Saar)', dir: 'E' },
  { edge: 'e_c0', sig: 's_C', from: 'Homburg (Saar)', dir: 'E' },
  { edge: 'e_d0', sig: 's_A', from: 'Pirmasens', dir: 'E' },
];
const EAST_ENTRIES = [
  { edge: 'e_h', sig: 's_H', from: 'Ludwigshafen', dir: 'W' },
  { edge: 'e_i', sig: 's_I', from: 'Ludwigshafen', dir: 'W' },
  { edge: 'e_g_enk', sig: 's_G', from: 'Enkenbach', dir: 'W' },
];
const LINE_EDGE = { t_laut: 'e_a0', t_hb: 'e_b0', t_hc: 'e_c0', t_pir: 'e_d0', t_lu3: 'e_h', t_lu4: 'e_i', t_enk: 'e_g_enk' };
const WEST_TERMS = ['t_laut', 't_hb', 't_hc', 't_pir'];
const EAST_TERMS = ['t_lu3', 't_lu4', 't_enk'];
// Bahnsteiggleise: p = westliches Ausfahrsignal, east = Gleisende/Ostsignal, edge = Aufstellort in Richtung West
export const PLATFORMS = {
  g39: { p: 's_P39', east: 't_39', edge: 'e_39b' },
  g40: { p: 's_P40', east: null, edge: 'e_p40' },
  g41: { p: 's_P41', east: 's_R41', edge: 'e_41', eastDep: true },
  g42: { p: 's_P42', east: 's_R42', edge: 'e_42', eastDep: true },
  g3: { p: 's_P43', east: 's_N103', edge: 'e_b7' },
  g4: { p: 's_P104', east: 's_N104', edge: 'e_c8', eastDep: true },
  g45: { p: 's_P45', east: 't_45', edge: 'e_d7' },
  g105: { p: 's_P105', east: 's_N105', edge: 'e_105', eastDep: true },
};
const P_EAST_ARR = Object.values(PLATFORMS).filter(x => x.eastDep).map(x => x.p);
const FINAL = new Set([...Object.values(PLATFORMS).flatMap(x => [x.p, x.east]).filter(Boolean), ...WEST_TERMS, ...EAST_TERMS]);
export const LEVELS = [
  { name: 'aus', every: 0 },
  { name: 'ruhig', every: 75 },
  { name: 'normal', every: 45 },
  { name: 'dicht', every: 25 },
];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const zn = () => String(1000 + Math.floor(Math.random() * 8999));

// Kürzester Weg über Signale: liefert die Zieltaste, die jetzt gedrückt werden muss
export function nextHop(il, sig, dest) {
  const seen = new Set([sig]);
  let layer = [{ s: sig, first: null }];
  for (let depth = 0; depth < 4 && layer.length; depth++) {
    const next = [];
    for (const { s, first } of layer) {
      const vt = il.validTargets(s);
      if (vt.includes(dest)) return first || dest;
      for (const t of vt) if (il.nodes[t].t === 'sig' && !seen.has(t)) { seen.add(t); next.push({ s: t, first: first || t }); }
    }
    layer = next;
  }
  return null;
}

function il_trains_reserve(il, pf) {
  return il.trains.some(t => t.kind && (t.dest === pf.east || t.dest === pf.p || t.from === pf.p || t.from === pf.east || (t.cur.kind === 'edge' && t.cur.id === pf.edge)));
}

export class Betrieb {
  constructor(il) {
    this.il = il; this.level = 0; this.timer = 8;
    this.score = { ok: 0, wrong: 0, delay: 0 };
  }
  setLevel(l) {
    this.level = l;
    this.timer = 4;
    if (l > 0 && this.il.trains.length === 0) { this._departure(); this._departure(); }
    this.il.msg(l ? `Fahrplanbetrieb ${LEVELS[l].name}: Züge kommen mit Zugnummer und Ziel` : 'Fahrplanbetrieb beendet');
  }
  _free(edge) { return !this.il.isOccupied(edge) && !this.il.lock[edge]; }
  _lineFree(term) {
    const e = LINE_EDGE[term];
    if (!e) return true;
    return this._free(e) && !this.il.trains.some(t => t.kind && t.dest === term);
  }
  _lineName(il, term) { return il.nodes[term].label.replace(/^Str\. \d+ → /, ''); }
  // Zielgleis frei und von keinem anderen Zug reserviert
  _platformFree(dest) {
    const pf = Object.values(PLATFORMS).find(x => x.east === dest || x.p === dest);
    if (!pf || !this._free(pf.edge)) return false;
    if (pf.east && pf.east !== dest && !this._free(pf.edge)) return false;
    const g = Object.values(PLATFORMS).filter(x => x === pf);
    return !il_trains_reserve(this.il, pf);
  }
  _arrival() {
    const il = this.il;
    const fromEast = Math.random() < 0.35;
    const entries = (fromEast ? EAST_ENTRIES : WEST_ENTRIES).filter(e => {
      const term = Object.keys(LINE_EDGE).find(k => LINE_EDGE[k] === e.edge);
      return this._free(e.edge) && !il.trains.some(t => t.kind && (t.dest === term));
    });
    if (!entries.length) return;
    const e = rnd(entries);
    let dests;
    if (fromEast) dests = P_EAST_ARR.filter(p => nextHop(il, e.sig, p));
    else dests = Object.values(PLATFORMS).filter(x => x.east).map(x => x.east).filter(d => nextHop(il, e.sig, d));
    dests = dests.filter(d => this._platformFree(d));
    if (!dests.length) return;
    const dest = rnd(dests);
    const r = il.spawnTrain(e.edge, e.dir, { no: zn(), dest, kind: 'ein', delay: 0, origin: e.edge });
    if (r && r.train) il.msg(`Zug ${r.train.no} aus ${e.from} wartet vor Signal ${il.nodes[e.sig].name}, Ziel ${il.nodes[dest].name}`);
  }
  _departure() {
    const il = this.il;
    const opts = Object.values(PLATFORMS).filter(x => this._free(x.edge));
    if (!opts.length) return;
    const pf = rnd(opts);
    const dests = WEST_TERMS.filter(d => this._lineFree(d) && il.validTargets(pf.p).includes(d));
    if (!dests.length) return;
    const dest = rnd(dests);
    const r = il.spawnTrain(pf.edge, 'W', { no: zn(), dest, kind: 'aus', delay: 0, from: pf.p });
    if (r && r.train) il.msg(`Zug ${r.train.no} ab ${il.nodes[pf.p].name} nach ${this._lineName(il, dest)} wartet vor Signal ${il.nodes[pf.p].name}`);
  }
  _node(t) { return t.cur.kind === 'edge' ? t.cur.to.node : null; }
  tick(dt) {
    const il = this.il;
    for (const t of il.trains.slice()) {
      if (!t.kind) continue;
      if (t.state === 'halt') { t.delay = (t.delay || 0) + dt; this.score.delay += dt / 60; }
      const at = this._node(t);
      const atFinal = at && FINAL.has(at) && (t.state === 'done' || t.state === 'halt');
      if (!atFinal) continue;
      if (t.kind === 'ein') {
        if (t.dwell === undefined) {
          const good = at === t.dest;
          this.score[good ? 'ok' : 'wrong']++;
          il.msg(good ? `Zug ${t.no} in ${il.nodes[t.dest].name} angekommen` : `Zug ${t.no} falsch geleitet nach ${il.nodes[at].name} (Ziel war ${il.nodes[t.dest].name})`, good ? 'info' : 'err');
          t.dwell = 35 + Math.random() * 40;
        }
        t.dwell -= dt;
        if (t.dwell <= 0) {
          const pf = Object.values(PLATFORMS).find(x => x.east === at || x.p === at);
          const fromEast = pf && pf.p === at;
          let dests = [];
          if (pf) {
            const start = fromEast ? pf.east : pf.p;
            dests = (fromEast ? EAST_TERMS : WEST_TERMS).filter(d => this._lineFree(d) && nextHop(il, start, d));
          }
          if (!pf || (fromEast && !pf.east)) { il.removeTrain(t.id); continue; }
          if (!dests.length) { t.dwell = 5; continue; }
          il.reverseTrain(t.id);
          Object.assign(t, { kind: 'aus', no: zn(), dest: rnd(dests), dwell: undefined, delay: 0, from: at });
          il.msg(`Zug ${t.no} ab ${il.nodes[at].name} nach ${this._lineName(il, t.dest)} bereit`);
        }
      } else {
        if (t.state !== 'done') continue;
        if (t.dwell === undefined) {
          const good = at === t.dest;
          this.score[good ? 'ok' : 'wrong']++;
          il.msg(good ? `Zug ${t.no} ausgefahren nach ${il.nodes[at].name}` : `Zug ${t.no} falsch geleitet nach ${il.nodes[at].name}`, good ? 'info' : 'err');
          t.dwell = 3;
        }
        t.dwell -= dt;
        if (t.dwell <= 0) il.removeTrain(t.id);
      }
    }
    const L = LEVELS[this.level];
    if (!L.every) return;
    this.timer -= dt;
    if (this.timer <= 0 && il.trains.length < 10) {
      this.timer = L.every * (0.7 + Math.random() * 0.6);
      Math.random() < 0.65 ? this._arrival() : this._departure();
    }
  }
}
