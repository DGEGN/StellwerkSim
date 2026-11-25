import { Interlocking } from '../js/engine.js';
import data from '../js/data-skl-west.js';
import assert from 'node:assert/strict';

const il = new Interlocking(data);
const run = (sec, step = 0.25) => { for (let t = 0; t < sec; t += step) il.tick(step); };

// 1. Alle Einfahrten -> alle Gleise erreichbar?
const starts = ['s_D', 's_CC', 's_C', 's_A'];
for (const s of starts) {
  const t = il.validTargets(s);
  console.log(s, '→', t.join(', '));
  assert(t.length >= 3, `zu wenige Ziele von ${s}`);
}
// 2. Ausfahrten nach Westen
for (const s of ['s_P39', 's_P40', 's_P41', 's_P42', 's_P43', 's_P104', 's_P45', 's_P105']) {
  const t = il.validTargets(s);
  console.log(s, '→', t.join(', '));
  assert(t.length >= 1, `keine Ziele von ${s}`);
}

// 3. Fahrstraße D -> Gl. 41 mit Zug
let r = il.request('s_D', 't_41');
assert(r.ok, r.msg);
run(10);
assert.equal(il.sig.s_D.aspect.startsWith('Hp'), true, 'Signal D sollte Fahrt zeigen: ' + il.sig.s_D.aspect);
console.log('Signal D:', il.sig.s_D.aspect, 'Flank:', JSON.stringify(r.route.flank), 'offen:', r.route.unprotected);
// Zug einsetzen vor Signal D
const sp = il.spawnTrain('e_a0', 'E');
assert(sp.ok, sp.msg);
run(60);
const tr = il.trains[0];
console.log('Zug-Zustand:', tr.state, 'auf', tr.cur.id);
assert.equal(tr.state, 'done');
assert.equal(il.routes.length, 0, 'Fahrstraße sollte aufgelöst sein');
assert.equal(Object.keys(il.lock).length, 0, 'keine Verschlüsse mehr');
assert.equal(Object.keys(il.flankLock).length, 0, 'keine Flankenlocks mehr');

// 4. Fahrstraßenausschluss: P41 -> Homburg Gl. C blockiert wegen besetzem Gl. 41? (Zug steht auf e_41)
il.reverseTrain(tr.id);
r = il.request('s_P41', 't_hb');
assert(r.ok, r.msg);
run(10);
assert(il.sig.s_P41.aspect.startsWith('Hp'));
// gleichzeitig D -> Gl. 3 sollte möglich sein, wenn keine Konflikte; D -> Gl. 41 nicht
const r2 = il.request('s_D', 't_41');
console.log('D→41 parallel:', r2.ok ? 'ok' : r2.msg);
run(80);
console.log('Zug nach Ausfahrt:', il.trains[0].state, il.trains[0].cur.id);

// 5. Störungen
il.toggleSwitchFault('w054');
const r3 = il.request('s_D', 't_40');
console.log('Störung W054, D→40:', r3.ok ? 'ok (Weiche liegt in gewünschter Lage)' : r3.msg);
console.log('OK – alle Tests bestanden');
