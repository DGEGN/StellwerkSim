import { Interlocking } from '../js/engine.js';
import { Betrieb, nextHop } from '../js/betrieb.js';
import data from '../js/data-skl.js';
const il = new Interlocking(data), bt = new Betrieb(il);
bt.setLevel(3);
for (let step = 0; step < 4000 * 4; step++) {
  il.tick(0.25); bt.tick(0.25);
  if (step % 8) continue;
  for (const t of il.trains) {
    if (!t.kind || t.state !== 'halt' || t.cur.kind !== 'edge') continue;
    const n = il.nodes[t.cur.to.node];
    if (n.t !== 'sig' || il.sig[n.id].route) continue;
    if (t.cur.to.port !== (n.dir === 'E' ? 'w' : 'e')) continue;
    const h = nextHop(il, n.id, t.dest);
    if (h) il.request(n.id, h);
  }
}
const _w=[];
const stuck = il.trains.filter(t => t.state === 'halt').length;
for (const m of il.messages.filter(m=>m.text.includes("falsch"))) console.log(m.text);
console.log('Punkte', JSON.stringify(bt.score), 'Züge im Bild', il.trains.length, 'wartend', stuck);
if (bt.score.ok < 15) { console.error('FEHLER: zu wenige Zugfahrten'); process.exit(1); }
if (bt.score.wrong > 0) { console.error('FEHLER: Fehlleitungen durch Bot'); process.exit(1); }
console.log('OK – Betrieb');
if (process.env.DBG) for (const t of il.trains) console.log(t.no, t.kind, t.state, 'auf', t.cur.id, 'vor', t.cur.to && t.cur.to.node, 'ziel', t.dest, 'route', il.nodes[t.cur.to?.node]?.t === 'sig' ? !!il.sig[t.cur.to.node].route : '-');
