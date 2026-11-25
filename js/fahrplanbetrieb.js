// Tagesfahrplan-Betrieb: Regelfahrplan Kaiserslautern Hbf (Abfahrten, gültig ab 14.06.2026).
// Aus jeder Abfahrt wird eine Zugfahrt gebildet: Der Zug erscheint vor dem Einfahrsignal, fährt in das
// Plangleis, wartet (bei Kopfmachen mit Wende) und darf erst zur Planzeit abfahren.
import FAHRPLAN from './fahrplan.js';
import { nextHop } from './betrieb.js';

// Fahrplangleis → Gleisbild. w = Signal am Westende (Ausfahrt nach Westen / Ziel von Osten),
// e = Signal bzw. Prellbock am Ostende (Ausfahrt nach Osten / Ziel von Westen).
export const FP_GLEISE = {
  '1': { name: '1 (Gl. 101)', w: 's_S101', e: 's_N101' },
  '2': { name: '2 (Gl. 102)', w: 's_S102', e: 's_N102' },
  '3': { name: '3', w: 's_P43', e: 's_N103' },
  '4': { name: '4', w: 's_P104', e: 's_N104' },
  '5': { name: '5 (Gl. 105)', w: 's_P105', e: 's_N105' },
  '8': { name: '8 (Gl. 108)', w: 's_P108', e: 's_N106' },
  '10': { name: '10 (Gl. 110)', w: 's_P110', e: 's_N110' },
  '39': { name: '39', w: 's_P39', e: 't_39' },
  '40': { name: '40', w: 's_P40', e: 't_40' },
  '41': { name: '41', w: 's_P41', e: 's_R41' },
  '42': { name: '42', w: 's_P42', e: 's_R42' },
  '45': { name: '45', w: 's_P45', e: 't_45' },
  '120': { name: '120', w: 't_g120', e: 's_N120' },
};
// Richtungsgruppen: Einfahrt-/Ausfahrtpunkte
const GRP = {
  pir: { side: 'W', name: 'Pirmasens', entries: [{ edge: 'e_d0', sig: 's_A' }], terms: ['t_pir'] },
  laut: { side: 'W', name: 'Lauterecken', entries: [{ edge: 'e_a0', sig: 's_D' }], terms: ['t_laut'] },
  hb: { side: 'W', name: 'Homburg / Landstuhl', entries: [{ edge: 'e_b0', sig: 's_CC' }, { edge: 'e_c0', sig: 's_C' }], terms: ['t_hb', 't_hc'] },
  lu: { side: 'E', name: 'Hochspeyer / Neustadt', entries: [{ edge: 'e_h', sig: 's_H' }, { edge: 'e_i', sig: 's_I' }], terms: ['t_lu3', 't_lu4'] },
  enk: { side: 'E', name: 'Enkenbach / Bad Münster', entries: [{ edge: 'e_g_enk', sig: 's_G' }], terms: ['t_enk'] },
};
const LINE_EDGE = { t_laut: 'e_a0', t_hb: 'e_b0', t_hc: 'e_c0', t_pir: 'e_d0', t_lu3: 'e_h', t_lu4: 'e_i', t_enk: 'e_g_enk' };
export const DAYS = { mf: 'Mo–Fr (Mi 25.11.)', sa: 'Samstag (28.11.)', so: 'Sonntag (29.11.)' };
const fmt = s => { s = Math.floor(s); return `${String(Math.floor(s / 3600) % 24).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`; };
export const fmtClock = s => { s = Math.floor(s); return `${fmt(s)}:${String(s % 60).padStart(2, '0')}`; };
const DWELL_THRU = 180, DWELL_TURN = 420, LEAD = 200;

export class Fahrplanbetrieb {
  constructor(il) {
    this.il = il; this.active = false; this.clock = 0; this.items = [];
    this.score = { ok: 0, wrong: 0, delay: 0, late: 0, missed: 0 };
  }
  start(day, startMin) {
    const il = this.il;
    this.day = day; this.active = true; this.clock = startMin * 60;
    this.score = { ok: 0, wrong: 0, delay: 0, late: 0, missed: 0 };
    this.items = FAHRPLAN.filter(r => r[day] && FP_GLEISE[r.gl]).map(r => {
      const dwell = r.thru ? DWELL_THRU : DWELL_TURN, dep = r.m * 60;
      const destSide = GRP[r.g].side;
      const origin = r.thru ? (destSide === 'W' ? 'lu' : 'hb') : r.g;
      return { r, dep, arr: dep - dwell, spawn: dep - dwell - LEAD, origin, destSide, gl: r.gl, state: 'plan', label: r.tr, no: r.nr && r.nr.length <= 5 ? r.nr : r.tr.replace(/\s+/g, '') };
    }).filter(i => i.spawn >= this.clock - 1).sort((a, b) => a.spawn - b.spawn);
    for (const t of il.trains.slice()) il.removeTrain(t.id);
    il.msg(`Tagesfahrplan ${DAYS[day]} ab ${fmt(this.clock)} – ${this.items.length} Zugfahrten`);
  }
  stop() { this.active = false; this.items = []; this.il.msg('Tagesfahrplan beendet'); }
  // nächste Abfahrten für die Abfahrtstafel
  tafel(n = 8) {
    return this.items.filter(i => i.state !== 'done').sort((a, b) => a.dep - b.dep).slice(0, n)
      .map(i => ({ dep: fmt(i.dep), label: i.label, no: i.no, dest: i.r.dest || GRP[i.r.g].name, gl: i.gl, state: i.state }));
  }
  _frontEdge(node) {
    const il = this.il, n = il.nodes[node];
    const port = n.t === 'sig' ? (n.dir === 'E' ? 'w' : 'e') : 'p';
    return Object.values(il.edges).find(e => e.ends.some(en => en.node === node && en.port === port));
  }
  _free(edgeId) { return !this.il.isOccupied(edgeId) && !this.il.lock[edgeId]; }
  _gleisFree(gl) {
    if (this.il.trains.some(t => t.fp && t.fp.gl === gl)) return false;
    const g = FP_GLEISE[gl];
    return [g.w, g.e].every(n => { const e = this._frontEdge(n); return !e || this._free(e.id); });
  }
  _lineBusy(edge) {
    return !this._free(edge) || this.il.trains.some(t => t.fp && ((t.fp.entry && t.fp.entry.edge === edge && t.fp.stage === 'ein') || (t.dest && LINE_EDGE[t.dest] === edge)));
  }
  _spawn(it) {
    const il = this.il, g = FP_GLEISE[it.gl], og = GRP[it.origin];
    const target = og.side === 'W' ? g.e : g.w;
    if (!this._gleisFree(it.gl)) { it.why = 'gleis'; return false; }
    const e = og.entries.find(x => !this._lineBusy(x.edge) && nextHop(il, x.sig, target));
    if (!e) { it.why = 'zulauf ' + og.entries.map(x => x.sig + (this._lineBusy(x.edge) ? ':belegt' : ':kein Weg')).join(','); return false; }
    const r = il.spawnTrain(e.edge, og.side === 'W' ? 'E' : 'W', { no: it.no, line: it.label, dest: target, kind: 'ein', fp: it, delay: 0 });
    if (!r.train) return false;
    it.state = 'ein'; it.stage = 'ein'; it.entry = e; it.train = r.train;
    il.msg(`${it.label} ${it.no} aus ${og.name}: wartet vor Signal ${il.nodes[e.sig].name}, Plangleis ${g.name}, ab ${fmt(it.dep)}`);
    return true;
  }
  tick(dt) {
    if (!this.active) return;
    const il = this.il;
    this.clock += dt;
    for (const it of this.items) {
      if (it.state === 'plan' && this.clock >= it.spawn) { if (this._spawn(it)) it.spawnedAt = this.clock; else it.blocked = (it.blocked || 0) + dt; }
      if (it.state === 'plan' && it.blocked > 1200) { it.state = 'done'; this.score.missed++; il.msg(`${it.label} ${it.no} ausgefallen (Gleis nicht frei)`, 'err'); }
    }
    for (const t of il.trains.slice()) {
      if (!t.fp) continue;
      const it = t.fp, at = t.cur.kind === 'edge' ? t.cur.to.node : null;
      const idle = t.state === 'halt' || t.state === 'done';
      if (it.stage === 'ein') {
        if (t.state === 'halt' && !t.hold) this.score.delay += dt / 60;
        if (!at || !idle) continue;
        const term = il.nodes[at].t === 'term' && t.state === 'done';
        if (at === t.dest) {
          it.stage = 'halt'; it.arrAt = this.clock;
          const late = Math.max(0, this.clock - it.arr) / 60;
          this.score.ok++;
          il.msg(`${it.label} ${it.no} in Gleis ${FP_GLEISE[it.gl].name} angekommen${late > 1 ? ` (+${late.toFixed(0)} min)` : ''}`);
          const turn = GRP[it.r.g].side === GRP[it.origin].side;
          const terms = GRP[it.r.g].terms;
          if (turn) il.reverseTrain(t.id);
          const startSig = t.cur.to.node;
          const reach = terms.filter(d => il.nodes[startSig].t === 'sig' && nextHop(il, startSig, d));
          const free = reach.filter(d => !this._lineBusy(LINE_EDGE[d]));
          t.dest = (free.length ? free : reach.length ? reach : terms)[0];
          t.hold = true; t.kind = 'aus';
          it.stage = 'aus';
        } else if (term) {
          this.score.wrong++; it.state = 'done'; it.stage = 'fehl';
          il.msg(`${it.label} ${it.no} falsch geleitet nach ${il.nodes[at].name}`, 'err'); t.dwell = 8;
        }
      } else if (it.stage === 'aus') {
        t.hold = this.clock < it.dep;
        if (t.hold && t.state === 'halt') { /* wartet auf Abfahrtzeit */ }
        else if (t.state === 'halt') this.score.delay += dt / 60;
        if (t.state === 'run' && it.leftAt === undefined) {
          it.leftAt = this.clock; const d = (this.clock - it.dep) / 60;
          if (d > 5) { this.score.late++; il.msg(`${it.label} ${it.no} ${d.toFixed(0)} min verspätet abgefahren`, 'warn'); }
        }
        if (t.state === 'done' && at && il.nodes[at].t === 'term') {
          if (at === t.dest) { it.state = 'done'; t.fp.stage = 'weg'; t.dwell = 3; il.msg(`${it.label} ${it.no} ausgefahren nach ${il.nodes[at].name}`); }
          else { this.score.wrong++; it.state = 'done'; t.fp.stage = 'weg'; t.dwell = 3; il.msg(`${it.label} ${it.no} falsch geleitet`, 'err'); }
        }
      } else if (it.stage === 'weg' || it.stage === 'fehl') {
        t.dwell -= dt; if (t.dwell <= 0) il.removeTrain(t.id);
      }
    }
  }
}
