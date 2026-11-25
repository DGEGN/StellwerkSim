import { Interlocking, SWITCH_FAULT_TIME } from '../js/engine.js';
import data from '../js/data-skl.js';
import assert from 'node:assert/strict';

const mk = () => new Interlocking(data);
const run = (il, sec, step = 0.25) => { for (let t = 0; t < sec; t += step) il.tick(step); };
const aspectOpen = (il, s) => il.sig[s].aspect !== 'Hp0';

// 1. Erreichbarkeit
{
  const il = mk();
  for (const s of ['s_D', 's_CC', 's_C', 's_A']) assert(il.validTargets(s).length >= 3, s);
  for (const s of ['s_P39', 's_P40', 's_P41', 's_P42', 's_P43', 's_P104', 's_P45', 's_P105']) assert(il.validTargets(s).length >= 1, s);
}
// 2. Fahrstraße, Festlegemelder, Zugfahrt, Auflösung
{
  const il = mk();
  assert(il.request('s_D', 's_R41').ok);
  run(il, 12);
  const r = il.routes[0];
  assert.equal(r.state, 'locked'); assert(r.ffm, 'Festlegemelder'); assert(aspectOpen(il, 's_D'));
  assert(il.spawnTrain('e_a0', 'E').ok);
  run(il, 80);
  assert.equal(il.trains[0].state, 'halt'); assert.equal(il.trains[0].cur.to.node, 's_R41');
  assert.equal(il.routes.length, 0); assert.equal(Object.keys(il.lock).length, 0); assert.equal(Object.keys(il.flankLock).length, 0);
}
// 3. FRT/FHT-Regeln
{
  const il = mk();
  il.request('s_D', 's_R41'); run(il, 12);
  assert(!il.ruecknahme('s_D', 's_R41').ok, 'Signal steht auf Fahrt');
  assert(il.signalHalt('s_D').ok);
  assert(!il.ruecknahme('s_D', 's_R41').ok, 'FRT bei leuchtendem Festlegemelder nicht erlaubt');
  assert(!il.hilfsaufloesen('s_D', 's_N103').ok, 'falsches Ziel');
  assert(il.hilfsaufloesen('s_D', 's_R41').ok);
  assert.equal(il.zaehler.FHZ, 1);
  assert.equal(il.routes.length, 0);
  assert.equal(Object.keys(il.lock).length, 0);
}
// 4. Rücknahme einer noch nicht festgelegten Zugstraße
{
  const il = mk();
  il.toggleSwitchFault('w028');
  il.sw.w028.pos = 'str'; // Grundstellung
  il.request('s_D', 's_R41'); // braucht 028 in br -> abgewiesen (gestört)
  assert.equal(il.routes.length, 0);
  il.toggleSwitchFault('w028');
  il.request('s_D', 's_R41'); run(il, 1);
  assert.equal(il.routes[0].state, 'setting');
  assert(il.ruecknahme('s_D', 's_R41').ok);
  assert.equal(Object.keys(il.lock).length, 0);
}
// 5. Ersatzsignal braucht gesperrte Laufkette, erlischt nach 90 s
{
  const il = mk();
  il.request('s_D', 's_R41'); run(il, 12);
  il.toggleSignalFault('s_D'); // Signal gestört -> Halt, Hupe
  assert(il.alarm.hupe && il.sig.s_D.aspect === 'Hp0');
  assert(!il.ersatzsignal('s_D').ok, 'Laufkette nicht gesperrt');
  il.laufketteSperren(true);
  assert(il.ersatzsignal('s_D').ok);
  assert.equal(il.sig.s_D.aspect, 'Zs1');
  run(il, 91);
  assert.equal(il.sig.s_D.aspect, 'Hp0');
  assert.equal(il.zaehler.ErsZ, 1);
}
// 6. Laufkette gesperrt: Weichen müssen vorher stehen
{
  const il = mk();
  il.laufketteSperren(true);
  assert(!il.request('s_D', 's_R41').ok);
  for (const id of ['w028', 'w036']) { assert(il.weicheUmstellen(id).ok); }
  run(il, 5);
  const r1 = il.request('s_D', 's_R41');
  console.log('Laufkette gesperrt, Weichen teilweise gestellt:', r1.ok ? 'ok' : r1.msg);
}
// 7. Weichenstörung -> Störmelder + Wecker nach 6 s, WUT
{
  const il = mk();
  il.toggleSwitchFault('w003');
  il.weicheUmstellen('w003');
  run(il, SWITCH_FAULT_TIME + 1);
  assert(il.sw.w003.stoerMelder && il.alarm.wecker);
  il.weckerAus(); assert(!il.alarm.wecker && il.sw.w003.stoerMelder);
}
// 8. Gleisfreimeldestörung: Weiche nur mit WHT, AzGrT setzt zurück
{
  const il = mk();
  il.toggleTrackFault('w003');
  assert(!il.weicheUmstellen('w003').ok);
  assert(il.weicheHilfs('w003').ok); run(il, 5);
  assert.equal(il.sw.w003.pos, 'br'); assert.equal(il.zaehler.WHZ, 1);
  assert(il.azGrund('w003').ok);
}
// 9. Signalsperre, Einzelauflösung
{
  const il = mk();
  assert(il.signalSperren('s_D').ok); assert(!il.request('s_D', 's_R41').ok);
  il.signalEntsperren('s_D'); il.request('s_D', 's_R41'); run(il, 12); il.signalHalt('s_D');
  assert(il.hilfsaufloesenEinzel('e_a2').ok); assert.equal(il.zaehler.EAZ, 1);
}
console.log('OK – alle Tests bestanden');
