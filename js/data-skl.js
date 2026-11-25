// Kaiserslautern Hbf – Westkopf (Version 1)
// Koordinaten = Pixel des Plans "SKL_APN-Skizze" (Seite auf 2000 px Breite skaliert).
// Gelesen vom Plan, NICHT amtlich geprüft. Abweichungen bitte melden/korrigieren.
//
// Knoten:  sw  = Weiche (Ports: stem=Spitze, str=gerade, br=abzweigend)
//          sig = Hauptsignal (Ports: w/e, dir = Richtung, in die es zeigt)
//          term= Gleisende / Zielpunkt (Port: p)
// Kanten:  [id, 'knoten.port', 'knoten.port', [Zwischenpunkte]]
const N = (t, x, y, o = {}) => ({ t, x, y, ...o });

const west = {
  name: 'Kaiserslautern Hbf – Westkopf',
  nodes: {
    // Weichen
    w003: N('sw', 256, 710, { no: '003' }), w004: N('sw', 288, 746, { no: '004' }),
    w005: N('sw', 314, 746, { no: '005' }), w006: N('sw', 339, 782, { no: '006' }),
    w007: N('sw', 361, 782, { no: '007' }), w008: N('sw', 378, 799, { no: '008' }),
    w017: N('sw', 450, 799, { no: '017' }), w018: N('sw', 489, 799, { no: '018' }),
    w022: N('sw', 467, 782, { no: '022' }), w023: N('sw', 506, 782, { no: '023' }),
    w028: N('sw', 489, 710, { no: '028' }), w029: N('sw', 517, 746, { no: '029' }),
    w036: N('sw', 647, 746, { no: '036' }), w037: N('sw', 681, 782, { no: '037' }),
    w038: N('sw', 773, 746, { no: '038' }), w039: N('sw', 802, 717, { no: '039' }),
    w042: N('sw', 781, 782, { no: '042' }), w043: N('sw', 795, 799, { no: '043' }),
    w044: N('sw', 864, 799, { no: '044' }), w047: N('sw', 889, 835, { no: '047' }), w048: N('sw', 876, 818, { no: '048' }),
    w057: N('sw', 560, 710, { no: '057' }), w058: N('sw', 596, 746, { no: '058' }),
    w054: N('sw', 759, 710, { no: '054' }), w056: N('sw', 838, 602, { no: '056' }),
    // Hauptsignale (Einfahrt aus Westen: Richtung Ost; Ausfahrt nach Westen: Richtung West)
    s_D:  N('sig', 222, 710, { dir: 'E', name: 'D' }),
    s_CC: N('sig', 204, 746, { dir: 'E', name: 'CC' }),
    s_C:  N('sig', 204, 782, { dir: 'E', name: 'C' }),
    s_A:  N('sig', 180, 817, { dir: 'E', name: 'A' }),
    s_P39: N('sig', 880, 602, { dir: 'W', name: 'P39' }),
    s_P40: N('sig', 880, 639, { dir: 'W', name: 'P40' }),
    s_P41: N('sig', 860, 674, { dir: 'W', name: 'P41' }),
    s_P42: N('sig', 840, 718, { dir: 'W', name: 'P42' }),
    s_P43: N('sig', 840, 746, { dir: 'W', name: 'P43' }),
    s_P104: N('sig', 840, 782, { dir: 'W', name: 'P104' }),
    s_P45: N('sig', 905, 799, { dir: 'W', name: 'P45' }),
    s_P105: N('sig', 930, 835, { dir: 'W', name: 'P105' }),
    // Zielpunkte
    t_laut: N('term', 125, 655, { name: 'Lauterecken', label: 'Str. 3302 → Lauterecken-Grumbach', side: 'W' }),
    t_hb:   N('term', 60, 746, { name: 'Homburg Gl. CC', label: 'Str. 3280 → Homburg (Gl. CC)', side: 'W' }),
    t_hc:   N('term', 60, 782, { name: 'Homburg Gl. C', label: 'Str. 3280 → Homburg (Gl. C)', side: 'W' }),
    t_pir:  N('term', 120, 872, { name: 'Pirmasens', label: 'Str. 3300 → Pirmasens', side: 'W' }),
    t_37:  N('term', 1000, 584, { name: 'Gl. 37', label: 'Gl. 37', side: 'E' }),
    t_39:  N('term', 1000, 602, { name: 'Gl. 39', label: 'Gl. 39', side: 'E' }),
    t_40:  N('term', 1000, 639, { name: 'Gl. 40', label: 'Gl. 40', side: 'E' }),
    t_41:  N('term', 1000, 674, { name: 'Gl. 41', label: 'Gl. 41', side: 'E' }),
    t_42:  N('term', 1000, 718, { name: 'Gl. 42', label: 'Gl. 42', side: 'E' }),
    t_3:   N('term', 1000, 746, { name: 'Gl. 3', label: 'Gl. 3', side: 'E' }),
    t_4:   N('term', 1000, 782, { name: 'Gl. 4', label: 'Gl. 4', side: 'E' }),
    t_45:  N('term', 1000, 799, { name: 'Gl. 45', label: 'Gl. 45', side: 'E' }),
    t_105: N('term', 1000, 835, { name: 'Gl. 105', label: 'Gl. 105', side: 'E' }),
    t_108: N('term', 1000, 870, { name: 'Gl. 108', label: 'Gl. 108', side: 'E' }),
  },
  edges: [
    // Reihe a (Str. 3302 / Gl. 40)
    ['e_a0', 't_laut.p', 's_D.w', [[181, 710]]],
    ['e_a1', 's_D.e', 'w003.stem'],
    ['e_a2', 'w003.str', 'w028.stem'],
    ['e_a3', 'w028.str', 'w057.str'],
    ['e_a3b', 'w057.stem', 'w054.stem'],
    ['e_a3c', 'w057.br', 'w058.br'],
    ['e_a4', 'w054.str', 's_P40.w', [[780, 710], [850, 639]]],
    ['e_p40', 's_P40.e', 't_40.p'],
    ['e_054_056', 'w054.br', 'w056.stem'],
    ['e_37', 'w056.str', 't_37.p', [[852, 584]]],
    ['e_39a', 'w056.br', 's_P39.w', [[852, 602]]],
    ['e_39b', 's_P39.e', 't_39.p'],
    // Reihe b (Str. 3280 Gl. CC / Gl. 3)
    ['e_b0', 't_hb.p', 's_CC.w'],
    ['e_b1', 's_CC.e', 'w004.str'],
    ['e_b2', 'w004.stem', 'w005.stem'],
    ['e_b3', 'w005.str', 'w029.str'],
    ['e_b4', 'w029.stem', 'w058.stem'],
    ['e_b4b', 'w058.str', 'w036.stem'],
    ['e_b5', 'w036.str', 'w038.stem'],
    ['e_b6', 'w038.str', 's_P43.w'],
    ['e_b7', 's_P43.e', 't_3.p'],
    ['e_038_039', 'w038.br', 'w039.stem'],
    ['e_039_41', 'w039.str', 's_P41.w', [[842, 674]]],
    ['e_41', 's_P41.e', 't_41.p'],
    ['e_039_42', 'w039.br', 's_P42.w'],
    ['e_42', 's_P42.e', 't_42.p'],
    // Reihe c (Str. 3280 Gl. C / Gl. 4)
    ['e_c0', 't_hc.p', 's_C.w'],
    ['e_c1', 's_C.e', 'w006.str'],
    ['e_c2', 'w006.stem', 'w007.stem'],
    ['e_c3', 'w007.str', 'w022.str'],
    ['e_c4', 'w022.stem', 'w023.str'],
    ['e_c5', 'w023.stem', 'w037.str'],
    ['e_c6', 'w037.stem', 'w042.stem'],
    ['e_c7', 'w042.str', 's_P104.w'],
    ['e_c8', 's_P104.e', 't_4.p'],
    // Reihe d (Str. 3300 / Gl. 45)
    ['e_d0', 't_pir.p', 's_A.w'],
    ['e_d1', 's_A.e', 'w008.str', [[200, 799]]],
    ['e_d2', 'w008.stem', 'w017.stem'],
    ['e_d3', 'w017.str', 'w018.stem'],
    ['e_d4', 'w018.str', 'w043.str'],
    ['e_d5', 'w043.stem', 'w044.stem'],
    ['e_d6', 'w044.str', 's_P45.w'],
    ['e_d7', 's_P45.e', 't_45.p'],
    ['e_044_048', 'w044.br', 'w048.stem'],
    ['e_048_047', 'w048.str', 'w047.stem'],
    ['e_047_105', 'w047.br', 's_P105.w'],
    ['e_105', 's_P105.e', 't_105.p'],
    ['e_047_108', 'w047.str', 't_108.p', [[905, 853]]],
    // Verbindungen zwischen den Reihen
    ['e_003_004', 'w003.br', 'w004.br'],
    ['e_005_006', 'w005.br', 'w006.br'],
    ['e_007_008', 'w007.br', 'w008.br'],
    ['e_017_022', 'w017.br', 'w022.br'],
    ['e_018_023', 'w018.br', 'w023.br'],
    ['e_028_029', 'w028.br', 'w029.br'],
    ['e_036_037', 'w036.br', 'w037.br'],
    ['e_042_043', 'w042.br', 'w043.br'],
  ],
};

// ---------------- Ostkopf (Version 4) ----------------
// Aus dem Plan abgelesen (Zoom 330 dpi), vereinfacht: ohne Gleise 109/119/180-182, Werk und Gleisanschlüsse.
const E = (t, x, y, o = {}) => ({ t, x, y, ...o });
const sigE = (id, x, y, name, extra = {}) => { west.nodes[id] = E('sig', x, y, { dir: 'E', name, zt: true, ...extra }); };
const sigW = (id, x, y, name, extra = {}) => { west.nodes[id] = E('sig', x, y, { dir: 'W', name, zt: true, ...extra }); };
const sw = (id, no, x, y) => { west.nodes[id] = E('sw', x, y, { no }); };
const term = (id, x, y, name, label, side = 'E') => { west.nodes[id] = E('term', x, y, { name, label: label || name, side }); };
const edge = (id, a, b, via) => west.edges.push(via ? [id, a, b, via] : [id, a, b]);
const del = (...ids) => { for (const i of ids) delete west.nodes[i]; };
del('t_41', 't_3', 't_4', 't_105', 't_108');
west.edges = west.edges.filter(e => !['e_p40', 'e_41', 'e_42', 'e_b7', 'e_c8', 'e_105', 'e_047_108'].includes(e[0]));
// Stumpfgleise am Bahnsteigende (Zieltasten)
Object.assign(west.nodes, {
  t_37: E('term', 1101, 584, { name: 'Gl. 37', label: 'Gl. 37', side: 'E' }),
  t_39: E('term', 1099, 602, { name: 'Gl. 39', label: 'Gl. 39', side: 'E' }),
  t_40: E('term', 1099, 638, { name: 'Gl. 40', label: 'Gl. 40', side: 'E' }),
  t_42: E('term', 1075, 716, { name: 'Gl. 42', label: 'Gl. 42', side: 'E' }),
  t_45: E('term', 1083, 799, { name: 'Gl. 45', label: 'Gl. 45', side: 'E' }),
});
// Weichen
sw('w096', '096', 1083, 638); sw('w095', '095', 1108, 676); sw('w094', '094', 1075, 673);
sw('w092', '092', 1057, 716); sw('w093', '093', 1080, 745);
sw('w129', '129', 1487, 671); sw('w130', '130', 1518, 709);
sw('w127', '127', 1427, 619); sw('w128', '128', 1445, 637);
sw('w121', '121', 1479, 781); sw('w122', '122', 1505, 745); sw('w118', '118', 1609, 781);
sw('w123', '123', 1549, 745); sw('w133', '133', 1580, 709); sw('w134', '134', 1611, 709);
sw('w135', '135', 1642, 745); sw('w136', '136', 1650, 781); sw('w137', '137', 1681, 745);
sw('w138', '138', 1702, 745); sw('w139', '139', 1735, 709); sw('w140', '140', 1730, 745); sw('w141', '141', 1761, 781);
sw('w112', '112', 1554, 837); sw('w110s', '110', 1518, 872);
// Signale (E = Richtung Ost, W = Richtung West); zt = Zugstraßentaste dient als Zieltaste
sigE('s_R41', 1050, 673, 'R41'); sigE('s_R42', 1050, 716, 'R42');
sigW('s_S101', 1135, 676, 'S101'); sigW('s_S102', 1140, 709, 'S102'); sigW('s_S103', 1130, 745, 'S103');
sigE('s_N101', 1440, 676, 'N101'); sigE('s_N102', 1440, 709, 'N102'); sigE('s_N103', 1440, 745, 'N103');
sigE('s_N104', 1432, 781, 'N104'); sigE('s_N105', 1414, 835, 'N105'); sigE('s_N106', 1425, 872, 'N106'); sigE('s_N110', 1389, 907, 'N110');
sigW('s_P108', 960, 853, 'P108'); sigW('s_P110', 1000, 907, 'P110'); sigE('s_N120', 1305, 638, 'N120');
sigW('s_H', 1880, 745, 'H'); sigW('s_I', 1880, 781, 'I'); sigW('s_G', 1798, 693, 'G');
// Zielpunkte
term('t_g120', 1264, 638, 'Gl. 120', 'Gl. 120', 'W'); term('t_g121', 1295, 620, 'Gl. 121', 'Gl. 121', 'W'); term('t_g122', 1290, 602, 'Gl. 122', 'Gl. 122', 'W');
term('t_lu3', 1950, 745, 'Ludwigshafen Gl. 3', 'Str. 3280 → Ludwigshafen (Gl. 3)'); term('t_lu4', 1950, 781, 'Ludwigshafen Gl. 4', 'Str. 3280 → Ludwigshafen (Gl. 4)');
term('t_enk', 1900, 596, 'Enkenbach', 'Str. 3303 → Enkenbach'); 
// Bahnsteiggleise → Ostkopf
edge('e_p40', 's_P40.e', 'w096.stem');
edge('e_096_40', 'w096.str', 't_40.p'); edge('e_096_095', 'w096.br', 'w095.br');
edge('e_41', 's_P41.e', 's_R41.w'); edge('e_r41', 's_R41.e', 'w094.stem');
edge('e_094_095', 'w094.str', 'w095.str');
edge('e_094_102', 'w094.br', 's_S102.w', [[1108, 709]]);
edge('e_42', 's_P42.e', 's_R42.w'); edge('e_r42', 's_R42.e', 'w092.stem');
edge('e_092_42', 'w092.str', 't_42.p'); edge('e_092_093', 'w092.br', 'w093.br');
edge('e_b7', 's_P43.e', 'w093.str'); edge('e_093_s', 'w093.stem', 's_S103.w');
edge('e_c8', 's_P104.e', 's_N104.w'); edge('e_n104', 's_N104.e', 'w121.stem');
edge('e_105', 's_P105.e', 's_N105.w'); edge('e_n105', 's_N105.e', 'w112.br');
edge('e_047_108', 'w047.str', 's_P108.w', [[905, 853]]); edge('e_p108', 's_P108.e', 's_N106.w'); edge('e_n106', 's_N106.e', 'w110s.br');
// Gleise 101 / 102 / 3 nach Osten
edge('e_095_s101', 'w095.stem', 's_S101.w'); edge('e_s101_n101', 's_S101.e', 's_N101.w'); edge('e_n101', 's_N101.e', 'w129.br');
edge('e_s102_n102', 's_S102.e', 's_N102.w'); edge('e_n102', 's_N102.e', 'w130.str');
edge('e_s103_n103', 's_S103.e', 's_N103.w'); edge('e_n103', 's_N103.e', 'w122.str');
// Gleise 120-122 und Diagonale 125-130
edge('e_g122', 't_g122.p', 'w127.str', [[1415, 602]]); edge('e_g121', 't_g121.p', 'w127.br'); edge('e_g120', 't_g120.p', 's_N120.w'); edge('e_n120', 's_N120.e', 'w128.br');
edge('e_127_128', 'w127.stem', 'w128.str'); edge('e_128_129', 'w128.stem', 'w129.str'); edge('e_129_130', 'w129.stem', 'w130.br');
// Zugbildungsgleis-Zufahrten Zeilen 3/4/102
edge('e_130_133', 'w130.stem', 'w133.str'); edge('e_133_134', 'w133.stem', 'w134.stem'); edge('e_134_139', 'w134.str', 'w139.str');
edge('e_139_g', 'w139.stem', 's_G.w', [[1770, 709]]); edge('e_g_enk', 's_G.e', 't_enk.p', [[1880, 614]]);
edge('e_122_123', 'w122.stem', 'w123.stem'); edge('e_123_135', 'w123.str', 'w135.str'); edge('e_135_137', 'w135.stem', 'w137.str');
edge('e_137_138', 'w137.stem', 'w138.stem'); edge('e_138_140', 'w138.str', 'w140.stem');
edge('e_140_h', 'w140.str', 's_H.w'); edge('e_h', 's_H.e', 't_lu3.p');
edge('e_121_118', 'w121.str', 'w118.str'); edge('e_118_136', 'w118.stem', 'w136.stem'); edge('e_136_141', 'w136.str', 'w141.str');
edge('e_141_i', 'w141.stem', 's_I.w'); edge('e_i', 's_I.e', 't_lu4.p');
// Überleitverbindungen
edge('e_122_121', 'w122.br', 'w121.br'); edge('e_123_133', 'w123.br', 'w133.br'); edge('e_134_135', 'w134.br', 'w135.br');
edge('e_137_136', 'w137.br', 'w136.br'); edge('e_138_139', 'w138.br', 'w139.br'); edge('e_140_141', 'w140.br', 'w141.br');
// Gleise 105 / 108 / 110 nach Osten
edge('e_112_118', 'w112.stem', 'w118.br', [[1580, 811]]); edge('e_112_110', 'w112.str', 'w110s.stem');
edge('e_110s', 'w110s.str', 's_N110.e', [[1500, 890]]); edge('e_n110', 's_N110.w', 's_P110.e'); edge('e_048_110', 'w048.br', 's_P110.w', [[890, 907]]);
for (const n of Object.values(west.nodes)) if (n.t === 'sig' && /^s_P/.test(Object.keys(west.nodes).find(k => west.nodes[k] === n))) n.zt = true;
export default west;
