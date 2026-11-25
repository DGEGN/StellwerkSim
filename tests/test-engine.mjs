import { Interlocking } from '../js/engine.js';
import data from '../js/data-skl.js';
import assert from 'node:assert/strict';

const mk = () => new Interlocking(data);
const run = (il, sec, step = 0.25) => { for (let t = 0; t < sec; t += step) il.tick(step); };
const open = (il, s) => il.sig[s].aspect !== 'Hp0';

// 1. Erreichbarkeit
{
  const il = mk();
  for (const s of ['s211', 's235', 's258', 's281']) assert(il.validTargets(s).length >= 8, s);
  for (const s of ['s257', 's280', 's234']) assert(il.validTargets(s).includes('s268'), s);
  assert(il.validTargets('s268').includes('t_hb1'));
}
// 2. Fahrstraße, Festlegemelder, Zugfahrt, Auflösung
{
  const il = mk();
  assert(il.request('s211', 's222').ok);
  run(il, 15);
  const r = il.routes[0];
  assert.equal(r.state, 'locked'); assert(r.ffm, 'Festlegemelder'); assert(open(il, 's211'));
  assert(il.spawnTrain('t_lamp_s211', 'E').ok);
  run(il, 120);
  assert.equal(il.trains[0].state, 'halt'); assert.equal(il.trains[0].cur.to.node, 's222');
  assert.equal(il.routes.length, 0); assert.equal(Object.keys(il.lock).length, 0); assert.equal(Object.keys(il.flankLock).length, 0);
}
// 3. FRT/FHT-Regeln
{
  const il = mk();
  il.request('s211', 's222'); run(il, 15);
  assert(!il.ruecknahme('s211', 's222').ok, 'Signal steht auf Fahrt');
  assert(il.signalHalt('s211').ok);
  assert(!il.ruecknahme('s211', 's222').ok, 'FRT bei leuchtendem Festlegemelder nicht erlaubt');
  assert(il.hilfsaufloesen('s211', 's222').ok);
  assert.equal(il.routes.length, 0);
  assert.equal(Object.keys(il.lock).length, 0);
}
// 4. Feindliche Fahrstraße wird abgelehnt
{
  const il = mk();
  assert(il.request('s211', 's222').ok);
  assert(!il.request('s235', 's222').ok, 'gleiches Ziel');
}
// 5. Alle Signale haben Anschlüsse, Ziele sind erreichbar
{
  const il = mk();
  assert(Object.keys(il.nodes).length > 100);
  for (const [gl, g] of Object.entries(data.config.gleise)) { assert(il.nodes[g.w] && il.nodes[g.e], 'Gleis ' + gl); }
}
console.log('OK – Engine');
// 6. Rangierstraße / Mindestlänge
{
  const il = mk();
  assert(!il.validTargets('s247').includes('s244') || il.validTargets('s247', 'rangier').includes('s244'));
  assert(il.validTargets('s319', 'rangier').includes('s316'), 'Rangierstraße auch kurz');
  assert(!il.validTargets('s319').includes('s316'), 'Zugstraße zu kurz');
  assert(!il.request('s319', 's316').ok);
  assert(il.request('s319', 's316', 'rangier').ok);
  run(il, 15);
  assert.equal(il.sig.s319.aspect, 'Sh1');
}
console.log('OK – Rangieren');
