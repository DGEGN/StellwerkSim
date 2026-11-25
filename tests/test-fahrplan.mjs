import { Interlocking } from '../js/engine.js';
import { Fahrplanbetrieb } from '../js/fahrplanbetrieb.js';
import { nextHop } from '../js/betrieb.js';
import data from '../js/data-skl.js';
const day = process.argv[2] || 'mf', from = +(process.argv[3] || 0), to = +(process.argv[4] || 24);
const il = new Interlocking(data), fp = new Fahrplanbetrieb(il);
fp.start(day, from * 60);
const total = fp.items.length;
const dt = 0.5;
let steps = 0;
while (fp.clock < to * 3600 && steps++ < 400000) {
  il.tick(dt); fp.tick(dt);
  if (steps % 4) continue;
  for (const t of il.trains) {
    if (!t.fp || t.state !== 'halt' || t.cur.kind !== 'edge') continue;
    const n = il.nodes[t.cur.to.node];
    if (n.t !== 'sig' || il.sig[n.id].route) continue;
    if (t.cur.to.port !== (n.dir === 'E' ? 'w' : 'e')) continue;
    if (t.fp.stage === 'aus' && fp.clock < t.fp.dep - 90) continue;   // Abfahrtsstraße kurz vor der Abfahrt
    const h = nextHop(il, n.id, t.dest);
    if (h) il.request(n.id, h);
  }
}
const left = il.trains.filter(t => t.fp).map(t => `${t.fp.label} ${t.no} ${t.fp.stage} ${t.state} gl${t.fp.gl}`);
console.log(day, 'Fahrten', total, JSON.stringify(fp.score), 'noch im Bild:', left.length, left.slice(0, 6).join(' | '));
const open = fp.items.filter(i => i.state !== 'done').map(i => `${i.label}@${i.dep / 60 | 0}`);
console.log('nicht erledigt:', open.length, open.slice(0, 15).join(' '));
if (process.env.V) { for (const m of il.messages.slice().reverse().filter(m => /ausgefallen|falsch/.test(m.text))) console.log(m.text); }

if (process.env.V) for (const i of fp.items.filter(i=>i.blocked>1200)) console.log('verpasst', i.label, i.no, 'Gl', i.gl, 'Plan', (i.dep/60|0)+':'+String(i.dep/60%60|0), i.why);
