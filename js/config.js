// Betriebskonfiguration, abgeleitet aus dem Gleisbild (data-skl.js)
import data from './data-skl.js';

const portMap = {};
for (const [id, a, b] of data.edges) { portMap[a] = id; portMap[b] = id; }
const node = id => data.nodes[id];
// Kante auf der Anfahrseite eines Signals (dort wartet der Zug) bzw. am Gleisende
export const frontEdge = id => { const n = node(id); return portMap[n.t === 'sig' ? id + '.' + (n.dir === 'E' ? 'w' : 'e') : id + '.p']; };

export const FP_GLEISE = data.config.gleise;
export const GRP = {};
for (const [k, g] of Object.entries(data.config.gruppen)) {
  GRP[k] = { ...g, entries: g.entries.map(sig => ({ sig, edge: frontEdge(sig) })) };
}
export const LINE_EDGE = {};
for (const g of Object.values(GRP)) for (const t of g.terms) LINE_EDGE[t] = portMap[t + '.p'];

// Bahnsteiggleise für den Zufallsbetrieb: p = Westende, east = Ostende, edge = Gleis selbst
export const PLATFORMS = {};
for (const [gl, g] of Object.entries(FP_GLEISE)) {
  PLATFORMS['g' + gl] = { p: g.w, east: g.e, edge: frontEdge(g.w), eastDep: node(g.e).t === 'sig' };
}
export const WEST_ENTRIES = Object.values(GRP).filter(g => g.side === 'W').flatMap(g => g.entries.map(e => ({ ...e, from: g.name, dir: 'E' })));
export const EAST_ENTRIES = Object.values(GRP).filter(g => g.side === 'E').flatMap(g => g.entries.map(e => ({ ...e, from: g.name, dir: 'W' })));
export const WEST_TERMS = Object.values(GRP).filter(g => g.side === 'W').flatMap(g => g.terms);
export const EAST_TERMS = Object.values(GRP).filter(g => g.side === 'E').flatMap(g => g.terms);
