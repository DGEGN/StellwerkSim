// Kaiserslautern Hbf – Westkopf (Version 1)
// Koordinaten = Pixel des Plans "SKL_APN-Skizze" (Seite auf 2000 px Breite skaliert).
// Gelesen vom Plan, NICHT amtlich geprüft. Abweichungen bitte melden/korrigieren.
//
// Knoten:  sw  = Weiche (Ports: stem=Spitze, str=gerade, br=abzweigend)
//          sig = Hauptsignal (Ports: w/e, dir = Richtung, in die es zeigt)
//          term= Gleisende / Zielpunkt (Port: p)
// Kanten:  [id, 'knoten.port', 'knoten.port', [Zwischenpunkte]]
const N = (t, x, y, o = {}) => ({ t, x, y, ...o });

export default {
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
    w044: N('sw', 864, 799, { no: '044' }), w047: N('sw', 889, 835, { no: '047' }),
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
    ['e_a3', 'w028.str', 'w054.stem'],
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
    ['e_b4', 'w029.stem', 'w036.stem'],
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
    ['e_044_047', 'w044.br', 'w047.stem'],
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
