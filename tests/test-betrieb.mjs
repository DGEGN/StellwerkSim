import { Interlocking } from '../js/engine.js';
import { Betrieb } from '../js/betrieb.js';
import data from '../js/data-skl-west.js';
const il = new Interlocking(data), bt = new Betrieb(il);
bt.setLevel(3);
const sigOfEdge = {};
for (let step = 0; step < 4000 * 4; step++) {
  il.tick(0.25); bt.tick(0.25);
  if (step % 8) continue;
  // einfacher Fahrdienstleiter-Bot
  for (const t of il.trains) {
    if (!t.kind || t.state !== 'halt' || t.cur.kind !== 'edge') continue;
    const n = il.nodes[t.cur.to.node];
    if (n.t !== 'sig' || il.sig[n.id].route) continue;
    il.request(n.id, t.dest);
  }
}
const stuck = il.trains.filter(t => t.state === 'halt').length;
console.log('Punkte', JSON.stringify(bt.score), 'Züge im Bild', il.trains.length, 'wartend', stuck);
if (bt.score.ok < 15) { console.error('FEHLER: zu wenige Zugfahrten'); process.exit(1); }
if (bt.score.wrong > 0) { console.error('FEHLER: Fehlleitungen durch Bot'); process.exit(1); }
console.log('OK – Betrieb');
