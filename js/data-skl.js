// Kaiserslautern Hbf (SKL) – Gleisbild nach dem Stelltischbild (Version 6)
// Alle Koordinaten sind Pixel des Vorlagebildes (Raster 6 px). Das Gleisbild ist als Graph beschrieben:
//   Knoten  sw  = Weiche, sig = Hauptsignal (dir = Richtung der Lampen), term = Gleisende/Ziel
//   Kanten  entstehen aus chain(...): Knoten-IDs und Zwischenpunkte [x,y] in Fahrtreihenfolge.
// Die Ports (Spitze/gerade/abzweigend bzw. w/e) werden aus der Zeichnung berechnet (finalize).
// NICHT amtlich geprüft – nur nach dem Bild nachgebaut.

const nodes = {};
const links = [];
const decor = { blocks: [], labels: [], markers: [], leds: [], glyphs: [], tracks: [], bars: [] };

const SW = (no, x, y, lab = 't') => { nodes['w' + no] = { t: 'sw', x, y, no: String(no), lab }; };
// dir: Richtung, in die die Lampen zeigen (E = nach rechts). lab: Nummernschild links ('l') oder rechts ('r')
const SG = (no, x, y, dir, o = {}) => { nodes['s' + no] = { t: 'sig', x, y, dir, name: String(no), zt: true, lab: dir === 'E' ? 'r' : 'l', ...o }; };
const TM = (id, x, y, name, o = {}) => { nodes[id] = { t: 'term', x, y, name, label: name, ...o }; };
const chain = (...items) => {
  let prev = null, via = [];
  for (const it of items) {
    if (Array.isArray(it)) { via.push(it); continue; }
    if (prev !== null) links.push([prev, it, via]);
    prev = it; via = [];
  }
};

// ---------------------------------------------------------------- Weichen
// Zeile 282/306 (West)
SW(212, 186, 306); SW(216, 354, 306); SW(215, 366, 306, 'b'); SW(217, 462, 306); SW(218, 498, 306, 'b'); SW(220, 534, 306, 'b');
SW(223, 774, 306);
SW(198, 330, 282);
// Zeile 330
SW(237, 210, 330); SW(236, 222, 330, 'b'); SW(239, 390, 330, 'b'); SW(240, 414, 330); SW(241, 438, 330, 'b'); SW(243, 486, 330);
SW(246, 798, 330, 'b');
// Zeile 354
SW(260, 258, 354); SW(259, 246, 354, 'b'); SW(262, 366, 354); SW(263, 390, 354, 'b'); SW(266, 510, 354, 'b'); SW(267, 534, 354);
// Zeile 378
SW(282, 282, 378, 'b'); SW(283, 306, 378); SW(284, 342, 378, 'b'); SW(285, 402, 378); SW(286, 438, 378); SW(289, 558, 378, 'b'); SW(290, 582, 378);
// Zeile 414 / 402 / 426
SW(311, 270, 414, 'b'); SW(300, 606, 402); SW(315, 486, 426); SW(318, 630, 426, 'b');
// Leiter nach Gl. 39/40/41 (Gleisharfe)
SW(171, 558, 282, ''); SW(172, 582, 258, '');
// Ostende der Gleise 39–42
SW(189, 834, 258); SW(202, 834, 282); SW(203, 858, 282, 'b');
// Diagonale 120/121/122 nach Osten
SW(175, 1050, 234); SW(176, 1074, 258); SW(177, 1098, 282); SW(226, 1122, 306, 'b');
// Zeile 306 Ost / 330 Ost
SW(227, 1146, 306); SW(229, 1170, 306); SW(232, 1254, 306);
SW(249, 1110, 330); SW(250, 1122, 330, 'b'); SW(253, 1194, 330, 'b'); SW(254, 1218, 330); SW(255, 1230, 330, 'b'); SW(256, 1254, 330);
// Zeile 354 Ost
SW(270, 1086, 354, 'b'); SW(273, 1170, 354); SW(274, 1194, 354, 'b'); SW(277, 1278, 354, 'b');
// Zeile 402 / 426 / 450 Ost
SW(303, 1110, 402); SW(304, 1122, 402, 'b'); SW(305, 1146, 402, 'b'); SW(306, 1170, 402);
SW(321, 1050, 426); SW(322, 1086, 426, 'b'); 
SW(295, 1338, 378); SW(325, 1386, 426, 'b');

// ---------------------------------------------------------------- Signale (Lampen zeigen in dir)
// Einfahrt von Westen
SG(211, 162, 306, 'E'); SG(235, 162, 330, 'E'); SG(258, 162, 354, 'E'); SG(281, 174, 378, 'E');
// Ausfahrt nach Westen (Westende der Bahnsteiggleise)
for (const [no, y] of [[176, 210], [181, 234], [187, 258], [200, 282], [221, 306], [244, 330], [268, 354], [291, 378], [301, 402]]) SG(no, 642, y, 'W');
SG(316, 510, 426, 'W'); SG(319, 654, 426, 'W'); SG(335, 534, 474, 'W');
// Ausfahrt nach Osten (Ostende der westlichen Gleishälften)
SG(188, 810, 258, 'E'); SG(201, 810, 282, 'E'); SG(222, 750, 306, 'E');
// Westende der östlichen Gleise
SG(204, 882, 282, 'W'); SG(224, 882, 306, 'W'); SG(247, 822, 330, 'W');
// Ostende (Ausfahrt nach Osten)
SG(191, 1038, 258, 'E'); SG(205, 1062, 282, 'E'); SG(225, 1062, 306, 'E'); SG(248, 1062, 330, 'E'); SG(269, 1062, 354, 'E');
SG(302, 1062, 402, 'E'); SG(320, 1014, 426, 'E'); SG(336, 1014, 474, 'E');
// Einfahrt von Osten
SG(234, 1410, 306, 'W'); SG(257, 1422, 330, 'W'); SG(280, 1422, 354, 'W'); SG(326, 1410, 426, 'W');
SG(333, 1338, 462, 'W', { vertical: true, lab: 'l' }); SG(334, 1374, 462, 'W', { vertical: true, lab: 'l' });
// reine Zugstraßentasten ohne Lampenbild
SG(193, 366, 270, 'W', { nolamp: true }); SG(312, 318, 414, 'W', { nolamp: true });

// ---------------------------------------------------------------- Gleisenden / Ziele
// ziel: Form des Zielsymbols ('R' Gleis läuft nach links, 'L' nach rechts); plain = graue Markierung im Gleis
TM('t_lamp', 18, 294, 'Lampertsmühle', { border: 'u', side: 'W' });
TM('t_pir', 18, 402, 'Pirmasens Nord', { border: 'd', side: 'W' });
TM('t_hb1', 20, 330, 'Homburg (Gl. 1)', { hidden: true, side: 'W', area: [0, 326, 24, 17] });
TM('t_hb2', 20, 354, 'Homburg (Gl. 2)', { hidden: true, side: 'W', area: [0, 343, 24, 17] });
TM('t_lu1', 1580, 330, 'Neustadt (Gl. 1)', { hidden: true, side: 'E', area: [1572, 326, 24, 17] });
TM('t_lu2', 1580, 354, 'Neustadt (Gl. 2)', { hidden: true, side: 'E', area: [1572, 343, 24, 17] });
TM('t_esel', 1578, 294, 'Eselsfürth', { border: 'u', side: 'E' });
TM('t_enk', 1566, 426, 'Enkenbach', { border: 'u', side: 'E' });
TM('t_tank', 438, 270, 'Tankstelle', { border: 'u', side: 'E' });
TM('t_bw', 738, 210, 'BW', { bw: true, side: 'E' });
TM('t_196', 222, 282, '196', { ziel: 'L', plain: true, side: 'W' });
TM('t_309', 174, 414, '309', { ziel: 'L', plain: true, side: 'W' });
TM('t_179', 930, 210, '179', { ziel: 'L', side: 'W' });
TM('t_183', 930, 234, '183', { ziel: 'L', side: 'W' });
TM('t_190', 930, 258, '190', { ziel: 'L', side: 'W' });
TM('t_182', 846, 234, '182', { ziel: 'R', side: 'E' });
TM('t_292', 810, 378, '292', { ziel: 'R', side: 'E' });
TM('t_330', 762, 450, '330', { ziel: 'R', side: 'E' });
TM('t_331', 954, 450, '331', { ziel: 'L', side: 'W' });
TM('t_297', 1422, 378, '297', { ziel: 'R', side: 'E' });
TM('t_324', 1302, 426, '324', { ziel: 'R', side: 'E' });
TM('t_abst', 366, 414, 'Abstellung', { border: 'd', side: 'E' });
// Gleisenden ohne eigenes Symbol (Prellböcke)
TM('t_e40', 872, 258, 'Gl. 40 Ende', { hidden: true, side: 'E' });
TM('t_e42', 814, 306, 'Gl. 42 Ende', { hidden: true, side: 'E' });
TM('t_h333', 1338, 498, 'Hochspeyer (333)', { hidden: true, side: 'S' });
TM('t_h334', 1374, 498, 'Hochspeyer (334)', { hidden: true, side: 'S' });

// ---------------------------------------------------------------- Gleise (Fahrtreihenfolge von West nach Ost)
// Lampertsmühle – Gl. 60
chain('t_lamp', [126, 294], [138, 306], 's211', 'w212', 'w216', 'w215', 'w217', 'w218', 'w220', 's221', 's222', 'w223', 't_e42');
// Hauptgleise Homburg
chain('t_hb1', 's235', 'w237', 'w236', 'w239', 'w240', 'w241', 'w243', 's244', 'w246', 's247', 's248', 'w249', 'w250', 'w253', 'w254', 'w255', 'w256', 's257', 't_lu1');
chain('t_hb2', 's258', 'w259', 'w260', 'w262', 'w263', 'w266', 'w267', 's268', 's269', 'w270', 'w273', 'w274', 'w277', 's280', 't_lu2');
// Pirmasens Nord – Zeile 378 – Gl. 45
chain('t_pir', [42, 402], [54, 390], [138, 390], [150, 378], 's281', 'w282', 'w283', 'w284', 'w285', 'w286', 'w289', 'w290', 's291', 't_292');
// Verbindungen zwischen den Zeilen (westlicher Kopf)
chain('w212', 'w237');                         // Diagonale A
chain('w236', 'w259');                         // B
chain('w260', 'w282');                         // C
chain('w283', 'w311');                         // D
chain('w284', 'w262');                         // E
chain('w216', 'w198');                         // G
chain('w215', 'w239');                         // F
chain('w240', 'w263');                         // H
chain('w241', 'w217');                         // I
chain('w243', 'w266');                         // J
chain('w267', 'w289');                         // M
chain('w223', 'w246');                         // P (Gl. 42 – Gl. 13)
// -220- und Tankstelle
chain('t_196', 'w198', [342, 282], [354, 270], 's193', 't_tank');
// -68- Abstellung
chain('t_309', 'w311', 's312', 't_abst');
// BW
chain('w218', [594, 210], 's176', 't_bw');
// Gleisharfe nach Gl. 39/40/41
chain('w220', 'w171', 'w172', [606, 234], 's181', 't_182');
chain('w171', 's200', 's201', 'w202', 'w203', 's204', 's205', 'w177');
chain('w172', 's187', 's188', 'w189', 't_e40');
chain('w189', 'w203');
chain('w202', [858, 306], 's224', 's225', 'w226');
// Abstellanlage / lange Diagonalen im Südwesten
chain('w285', [498, 474], 's335', 's336', [1038, 474], 'w322', 'w303');
chain('w286', 'w315', [510, 450], 't_330');
chain('w290', 'w300', 'w318');
chain('w315', 's316', 'w318', 's319', 's320', 'w321', 'w322');
chain('w300', 's301', 's302', 'w303', 'w304', 'w305', 'w306', [1314, 402], 'w295');
// Gl. 119 / 120–122
chain('t_331', [1026, 450], 'w321');
chain('t_179', [1020, 210], 'w175', 'w176', 'w177', 'w226');
chain('t_183', 'w175');
chain('t_190', 's191', 'w176');
// Zeile 306 Ost
chain('w226', 'w227', 'w229', 'w232', 's234', [1446, 306], [1458, 294], 't_esel');
// Verbindungen im östlichen Kopf
chain('w227', 'w250');                         // R
chain('w229', 'w253');                         // Q
chain('w232', 'w255');                         // c=1560
chain('w254', 'w274');                         // c=1548
chain('w256', 'w277');                         // c=924
chain('w249', 'w270');                         // c=1440
chain('w273', 'w304');                         // c=1524
chain('w305', [1170, 378], 'w295', 't_297');   // Gl. 180/190
chain('t_324', [1194, 426], 'w306');           // Gl. 182 nach Weiche 306
// Enkenbach und Verbindung nach Hochspeyer
chain('t_enk', 's326', 'w325', [1350, 426], [1338, 438], 's333', 't_h333');
chain('w325', [1374, 438], 's334', 't_h334');

// ---------------------------------------------------------------- Beschriftungen und Flächen
const B = (x, y, w, h) => decor.blocks.push({ x, y, w, h });
B(864, 206, 48, 48); B(670, 240, 129, 10); B(939, 265, 69, 7); B(72, 280, 48, 8); B(670, 288, 65, 8);
B(889, 313, 143, 7); B(829, 360, 214, 24); B(817, 384, 226, 10); B(672, 384, 120, 10); B(72, 401, 48, 7);
B(781, 432, 155, 34); B(742, 204, 26, 14); B(1357, 108, 155, 132);
// graue Streifen hinter den Gleisenden
B(11, 264, 12, 32); B(11, 396, 12, 32); B(432, 240, 10, 38); B(1572, 264, 12, 32); B(1560, 402, 12, 26);
decor.edge = { blue: [0, 325, 24, 35], green: [1573, 325, 23, 35] };
decor.title = { x: 1129, y: 261, w: 142, h: 23, text: 'Kaiserslautern (SKL)' };

const L = (x, y, text, kind = 'white', o = {}) => decor.labels.push({ x, y, text, kind, ...o });
// Gleisnummern (weißes Schild, mittig)
for (const [x, y, t] of [[720, 234, '- 39 -'], [720, 258, '- 40 -'], [720, 282, '- 41 -'], [720, 306, '- 42 -'], [720, 330, '- 13 -'], [744, 378, '- 45 -'],
  [642, 450, '- 109 -'], [990, 450, '-119-'], [958, 210, '-122-'], [958, 234, '-121-'], [958, 258, '-120-'], [958, 282, '- 1 -'], [958, 306, '- 2 -'],
  [934, 330, '- 3 -'], [934, 354, '- 4 -'], [934, 402, '- 5 -'], [850, 426, '- 8 -'], [852, 474, '- 10 -'], [275, 282, '-220-'], [272, 306, '-60-'],
  [228, 414, '- 68 -'], [1331, 306, '-162-'], [1331, 354, '-164-'], [1247, 378, '-180-'], [1380, 378, '-190-'], [1247, 402, '-181-'], [1247, 426, '-182-']]) L(x, y, t, 'track');
// Ortsnamen
L(13, 306, 'Lampertsmühle', 'place'); L(13, 414, 'Pirmasens Nord', 'place'); L(38, 378, 'Galgenschanze', 'small'); L(110, 270, 'Pfaffwerk', 'small');
L(430, 283, 'Tankstelle', 'place'); L(742, 223, 'BW', 'place'); L(362, 426, 'Abstellung', 'place'); L(1526, 312, 'Eselsfürth', 'place');
L(1510, 444, 'Enkenbach', 'place'); L(1478, 263, 'nächstes STW Alsenz ->', 'small'); L(1466, 466, 'nächstes STW Alsenz ->', 'small');
for (const [y, t] of [[127, 'Homburg'], [151, 'Neustadt (W)'], [175, 'Alsenz'], [199, 'Pirmasens'], [223, 'Region']]) L(1369, y, t, 'small');
decor.legendLeds = [127, 151, 175, 199, 223];

// LED-Felder (Zugnummernmelder): x, y, Breite, Höhe, Knopf-Mitte
for (const [x, y, w, h] of [[36, 265, 60, 11], [48, 360, 72, 12], [48, 420, 60, 11], [1500, 265, 60, 11], [1462, 312, 74, 12], [1487, 361, 73, 12], [1450, 407, 61, 12]]) decor.leds.push({ x, y, w, h });
for (const y of decor.legendLeds) decor.leds.push({ x: 1440, y: y - 6, w: 60, h: 12 });

// Markierungen im Gleis: [x, y, Nummer, Seite des Schildes (l/r/''), N-Symbol (t/b/'')]
const M = (x, y, no = '', side = '', n = '') => decor.markers.push({ x, y, no, side, n });
M(210, 306, '213', 'l'); M(330, 306, '214', 'r', 'b'); M(486, 306, '', '', 'b'); M(306, 282, '', '', 'b'); M(222, 282, '196', 'l');
M(258, 330, '238', 'l', 't'); M(462, 330, '242', 'l', 't'); M(774, 330, '245', 'r', 'b'); M(834, 330, '', ''); M(1146, 330, '251', 'l', 't'); M(1170, 330, '252', 'r', 'b');
M(282, 354, '261', 'l', 't'); M(414, 354, '264', 'l', 't'); M(486, 354, '265', 'l', 'b'); M(1110, 354, '', '', 'b'); M(1146, 354, '272', 'r', 'b');
M(1218, 354, '275', 'l', 't'); M(1254, 354, '276', 'r', 'b'); M(1290, 354, '', ''); M(1386, 354, '279', 'r', 'b');
M(462, 378, '287', 'l', 't'); M(534, 378, '288', 'l', 'b'); M(1206, 378, '293', 'l', 't'); M(1302, 378, '294', 'r', 'b');
M(1206, 402, '307', 'l', 't'); M(1302, 402, '308', 'r', 'b'); M(606, 426, '317', 'r', 'b'); M(522, 426, '', ''); M(1206, 426, '323', 'l', 't');
M(534, 450, '329', 'l', 't'); M(894, 282, '', ''); M(894, 306, '', ''); M(834, 330, '', ''); M(1014, 234, '184', 'l', 'b'); M(1014, 210, '180', 'r', 'b');
M(1230, 306, '230', 'r', 'b'); M(1278, 306, '232', 'l', ''); M(1374, 306, '233', 'r', 'b'); M(1194, 306, '', ''); M(264, 414, '', ''); M(1230, 330, '', '');
// kleine Signalbilder ohne Taste (Vor-/Wiederholsignale)
for (const [x, y, d] of [[53, 316, 'E'], [30, 337, 'E'], [27, 361, 'E'], [68, 390, 'E'], [338, 342, 'E'], [338, 364, 'E'], [338, 386, 'E'],
  [1540, 296, 'E'], [1554, 321, 'W'], [1554, 344, 'W'], [1459, 364, 'E'], [1514, 424, 'E']]) decor.glyphs.push({ x, y, d });

// ---------------------------------------------------------------- Ports aus der Zeichnung berechnen
function finalize() {
  const legs = {};
  links.forEach(([a, b, via], i) => {
    for (const id of [a, b]) if (!nodes[id]) throw new Error('Unbekannter Knoten ' + id + ' in Link ' + a + '–' + b);
    const pa = [nodes[a].x, nodes[a].y], pb = [nodes[b].x, nodes[b].y];
    const na = via.length ? via[0] : pb, nb = via.length ? via[via.length - 1] : pa;
    const unit = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / d, (q[1] - p[1]) / d]; };
    (legs[a] ||= []).push({ link: i, end: 0, v: unit(pa, na) });
    (legs[b] ||= []).push({ link: i, end: 1, v: unit(pb, nb) });
  });
  const portOf = {};
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
  for (const [id, n] of Object.entries(nodes)) {
    const lg = legs[id] || [];
    const set = (leg, port) => { portOf[leg.link + ':' + leg.end] = id + '.' + port; };
    if (n.t === 'term') {
      if (lg.length !== 1) throw new Error(`Ziel ${id} hat ${lg.length} Anschlüsse`);
      set(lg[0], 'p');
    } else if (n.t === 'sig') {
      if (lg.length !== 2) throw new Error(`Signal ${id} hat ${lg.length} Anschlüsse`);
      const key = l => (Math.abs(l.v[0]) > 0.3 ? l.v[0] : l.v[1]);
      const [a, b] = lg.slice().sort((p, q) => key(p) - key(q));
      set(a, 'w'); set(b, 'e');
    } else {
      if (lg.length !== 3) throw new Error(`Weiche ${id} hat ${lg.length} Anschlüsse: ${lg.map(l => links[l.link].slice(0, 2)).join(' | ')}`);
      const stem = lg.find(l => lg.every(o => o === l || dot(l.v, o.v) < 0));
      if (!stem) throw new Error(`Weiche ${id}: keine Spitze erkennbar`);
      const rest = lg.filter(l => l !== stem).sort((p, q) => dot(stem.v, p.v) - dot(stem.v, q.v));
      set(stem, 'stem'); set(rest[0], 'str'); set(rest[1], 'br');
    }
  }
  const used = new Set();
  const edges = links.map(([a, b, via], i) => {
    let id = `${a}_${b}`;
    while (used.has(id)) id += "'";
    used.add(id);
    return via.length ? [id, portOf[i + ':0'], portOf[i + ':1'], via] : [id, portOf[i + ':0'], portOf[i + ':1']];
  });
  return edges;
}

const data = { name: 'Kaiserslautern Hbf (SKL)', nodes, edges: finalize(), decor };

// ---------------------------------------------------------------- Betriebskonfiguration (Fahrplan / Zufallsbetrieb)
// Fahrplangleis → w = Signal/Ziel am Westende, e = Signal/Ziel am Ostende
data.config = {
  gleise: {
    '1': { name: '1', w: 's204', e: 's205' },
    '2': { name: '2', w: 's224', e: 's225' },
    '3': { name: '3', w: 's247', e: 's248' },
    '4': { name: '4', w: 's268', e: 's269' },
    '5': { name: '5', w: 's301', e: 's302' },
    '8': { name: '8', w: 's319', e: 's320' },
    '10': { name: '10', w: 's335', e: 's336' },
    '39': { name: '39', w: 's181', e: 't_182' },
    '40': { name: '40', w: 's187', e: 's188' },
    '41': { name: '41', w: 's200', e: 's201' },
    '42': { name: '42', w: 's221', e: 's222' },
    '45': { name: '45', w: 's291', e: 't_292' },
    '120': { name: '120', w: 't_190', e: 's191' },
  },
  // Richtungsgruppen: side = Seite, von der die Züge kommen bzw. in die sie fahren
  gruppen: {
    pir: { side: 'W', name: 'Pirmasens', entries: ['s281'], terms: ['t_pir'] },
    laut: { side: 'W', name: 'Lauterecken (Lampertsmühle)', entries: ['s211'], terms: ['t_lamp'] },
    hb: { side: 'W', name: 'Homburg / Landstuhl', entries: ['s235', 's258'], terms: ['t_hb1', 't_hb2'] },
    lu: { side: 'E', name: 'Hochspeyer / Neustadt', entries: ['s257', 's280'], terms: ['t_lu1', 't_lu2'] },
    enk: { side: 'E', name: 'Enkenbach / Bad Münster', entries: ['s326', 's234'], terms: ['t_enk', 't_esel'] },
  },
};
export default data;
