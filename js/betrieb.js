// Fahrplanbetrieb: erzeugt Ein- und Ausfahrten mit Zugnummern und bewertet die Abwicklung.
const ENTRIES = [
  { edge: 'e_a0', sig: 's_D', from: 'Lauterecken-Grumbach' },
  { edge: 'e_b0', sig: 's_CC', from: 'Homburg (Saar)' },
  { edge: 'e_c0', sig: 's_C', from: 'Homburg (Saar)' },
  { edge: 'e_d0', sig: 's_A', from: 'Pirmasens' },
];
// Bahnsteiggleise mit Signal: Zielpunkt -> Kante, Signal
const LINE_EDGE = { t_laut: 'e_a0', t_hb: 'e_b0', t_hc: 'e_c0', t_pir: 'e_d0' };
const PLATFORMS = {
  t_39: ['e_39b', 's_P39'], t_40: ['e_p40', 's_P40'], t_41: ['e_41', 's_P41'], t_42: ['e_42', 's_P42'],
  t_3: ['e_b7', 's_P43'], t_4: ['e_c8', 's_P104'], t_45: ['e_d7', 's_P45'], t_105: ['e_105', 's_P105'],
};
export const LEVELS = [
  { name: 'aus', every: 0 },
  { name: 'ruhig', every: 75 },
  { name: 'normal', every: 45 },
  { name: 'dicht', every: 25 },
];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const zn = () => String(1000 + Math.floor(Math.random() * 8999));

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
  // Eingleisige Streckenzufahrt: darf nicht gleichzeitig Einfahrt und Ausfahrt haben
  _lineFree(term) {
    const e = LINE_EDGE[term];
    if (!e) return true;
    return this._free(e) && !this.il.trains.some(t => t.kind === 'aus' && t.dest === term);
  }
  _free(edge) { return !this.il.isOccupied(edge) && !this.il.lock[edge]; }
  _arrival() {
    const il = this.il;
    const opts = ENTRIES.filter(e => this._free(e.edge) && !il.trains.some(t => t.kind === 'aus' && LINE_EDGE[t.dest] === e.edge));
    if (!opts.length) return;
    const e = rnd(opts);
    const dests = il.validTargets(e.sig).filter(t => PLATFORMS[t]);
    if (!dests.length) return;
    const dest = rnd(dests);
    const r = il.spawnTrain(e.edge, 'E', { no: zn(), dest, kind: 'ein', delay: 0 });
    if (r && r.train) il.msg(`Zug ${r.train.no} aus ${e.from} wartet vor Signal ${il.nodes[e.sig].name}, Ziel ${il.nodes[dest].name}`);
  }
  _departure() {
    const il = this.il;
    const opts = Object.entries(PLATFORMS).filter(([, [edge]]) => this._free(edge));
    if (!opts.length) return;
    const [term, [edge, sig]] = rnd(opts);
    const dests = il.validTargets(sig).filter(d => this._lineFree(d));
    if (!dests.length) return;
    const dest = rnd(dests);
    const r = il.spawnTrain(edge, 'W', { no: zn(), dest, kind: 'aus', delay: 0, from: term });
    if (r && r.train) il.msg(`Zug ${r.train.no} ab ${il.nodes[term].name} nach ${il.nodes[dest].label.replace(/^Str\. \d+ → /, '')} wartet vor Signal ${il.nodes[sig].name}`);
  }
  tick(dt) {
    const il = this.il;
    for (const t of il.trains.slice()) {
      if (!t.kind) continue;
      if (t.state === 'halt') { t.delay = (t.delay || 0) + dt; this.score.delay += dt / 60; }
      if (t.state !== 'done') continue;
      const at = t.cur.to.node;
      if (t.kind === 'ein') {
        if (t.dwell === undefined) {
          const good = at === t.dest;
          this.score[good ? 'ok' : 'wrong']++;
          il.msg(good ? `Zug ${t.no} in ${il.nodes[at].name} angekommen` : `Zug ${t.no} falsch geleitet nach ${il.nodes[at].name} (Ziel war ${il.nodes[t.dest].name})`, good ? 'info' : 'err');
          t.dwell = 35 + Math.random() * 40;
        }
        t.dwell -= dt;
        if (t.dwell <= 0) {
          const pf = PLATFORMS[at];
          const dests = pf ? il.validTargets(pf[1]).filter(d => this._lineFree(d)) : [];
          if (!dests.length) { t.dwell = 5; continue; }
          il.reverseTrain(t.id);
          Object.assign(t, { kind: 'aus', no: zn(), dest: rnd(dests), dwell: undefined, delay: 0, from: at });
          il.msg(`Zug ${t.no} ab ${il.nodes[at].name} nach ${il.nodes[t.dest].label.replace(/^Str\. \d+ → /, '')} bereit`);
        }
      } else {
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
    if (this.timer <= 0 && il.trains.length < 9) {
      this.timer = L.every * (0.7 + Math.random() * 0.6);
      Math.random() < 0.6 ? this._arrival() : this._departure();
    }
  }
}
