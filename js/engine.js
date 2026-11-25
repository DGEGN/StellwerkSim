// Stellwerks-Engine (Spurplan-Drucktastenstellwerk, vereinfacht nach Spdr L60)
// Läuft im Browser und in Node (für Tests). Keine DOM-Abhängigkeiten.

export const SWITCH_TIME = 2.5;   // s für eine Weichenumlauf-Bewegung
export const FHT_WAIT = 8;        // s Auflösewartezeit (im echten Betrieb ca. 2 min)
const OPEN = new Set(['Hp1', 'Hp2', 'Zs1']);

export class Interlocking {
  constructor(data) {
    this.data = data;
    this.nodes = {};
    this.edges = {};
    this.portMap = {};
    for (const [id, n] of Object.entries(data.nodes)) this.nodes[id] = { id, ...n };
    for (const [id, a, b, via] of data.edges) {
      const ea = this._end(a), eb = this._end(b);
      this.edges[id] = { id, ends: [ea, eb], via: via || [] };
      this.portMap[a] = id;
      this.portMap[b] = id;
    }
    for (const e of Object.values(this.edges)) {
      const pts = [this._pos(e.ends[0].node), ...e.via, this._pos(e.ends[1].node)];
      e.pts = pts;
      e.len = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
    }
    this.sw = {};
    this.sig = {};
    this.occ = {};   // element -> trainId
    this.fault = {}; // element -> true (Gleisfreimeldestörung, belegt gemeldet)
    this.lock = {};  // element -> routeId
    this.flankLock = {}; // swId -> {pos, count}
    this.routes = [];
    this.trains = [];
    this.time = 0;
    this._rid = 1;
    this._tid = 1;
    this.messages = [];
    this.listeners = [];
    for (const n of Object.values(this.nodes)) {
      if (n.t === 'sw') this.sw[n.id] = { pos: 'str', target: 'str', moving: 0, disturbed: false };
      if (n.t === 'sig') this.sig[n.id] = { aspect: 'Hp0', route: null, disturbed: false };
    }
    this._validate();
  }

  _end(s) { const [node, port] = s.split('.'); return { node, port }; }
  _pos(id) { const n = this.nodes[id]; return [n.x, n.y]; }

  _validate() {
    for (const n of Object.values(this.nodes)) {
      const ports = n.t === 'sw' ? ['stem', 'str', 'br'] : n.t === 'sig' ? ['w', 'e'] : ['p'];
      for (const p of ports) {
        if (!this.portMap[`${n.id}.${p}`]) throw new Error(`Port ohne Kante: ${n.id}.${p}`);
      }
    }
  }

  on(fn) { this.listeners.push(fn); }
  _emit() { for (const fn of this.listeners) fn(); }
  msg(text, level = 'info') {
    this.messages.unshift({ t: this.time, text, level });
    if (this.messages.length > 40) this.messages.pop();
  }

  isElement(id) { return !!this.edges[id] || (this.nodes[id] && this.nodes[id].t === 'sw'); }
  elements() { return [...Object.keys(this.edges), ...Object.keys(this.sw)]; }
  label(el) { return this.edges[el] ? el : 'W ' + this.nodes[el].no; }
  isOccupied(el) { return !!this.occ[el] || !!this.fault[el]; }

  // Gegenseite einer Kante vom Knoten/Port aus
  _across(node, port) {
    const eid = this.portMap[`${node}.${port}`];
    const e = this.edges[eid];
    const other = (e.ends[0].node === node && e.ends[0].port === port) ? e.ends[1] : e.ends[0];
    return { edge: eid, node: other.node, port: other.port };
  }

  // ---------- Fahrwegsuche ----------
  findPath(startSig, targetId) {
    const S = this.nodes[startSig];
    if (!S || S.t !== 'sig') return null;
    const exitPort = S.dir === 'E' ? 'e' : 'w';
    const first = this._across(startSig, exitPort);
    const best = new Map();
    const pq = [{ cost: 0, node: first.node, port: first.port, elems: [first.edge], sw: {}, br: 0 }];
    while (pq.length) {
      pq.sort((a, b) => a.cost - b.cost);
      const cur = pq.shift();
      const key = cur.node + '.' + cur.port + '|' + Object.entries(cur.sw).map(([k, v]) => k + v).join(',');
      if (best.has(key)) continue;
      best.set(key, 1);
      const N = this.nodes[cur.node];
      if (N.t === 'term') {
        if (N.id === targetId) return { elems: cur.elems, sw: cur.sw, br: cur.br, end: N.id };
        continue;
      }
      if (N.t === 'sig') {
        const front = N.dir === 'E' ? 'w' : 'e';
        if (cur.port === front) {
          if (N.id === targetId) return { elems: cur.elems, sw: cur.sw, br: cur.br, end: N.id };
          continue; // anderes Signal in Fahrtrichtung beendet jede Fahrstraße
        }
        const out = cur.port === 'w' ? 'e' : 'w';
        const nx = this._across(N.id, out);
        pq.push({ ...cur, cost: cur.cost + 1, node: nx.node, port: nx.port, elems: [...cur.elems, nx.edge] });
        continue;
      }
      // Weiche
      const opts = [];
      if (cur.port === 'stem') { opts.push(['str', 'str'], ['br', 'br']); }
      else { opts.push(['stem', cur.port]); }
      for (const [outPort, pos] of opts) {
        if (cur.sw[N.id] && cur.sw[N.id] !== pos) continue;
        const nx = this._across(N.id, outPort);
        pq.push({
          cost: cur.cost + 1 + (pos === 'br' ? 3 : 0),
          node: nx.node, port: nx.port,
          elems: [...cur.elems, N.id, nx.edge],
          sw: { ...cur.sw, [N.id]: pos },
          br: cur.br + (cur.port === 'stem' && pos === 'br' ? 1 : 0),
        });
      }
    }
    return null;
  }

  // gültige Ziele für ein Startsignal (für die Zielleuchten)
  validTargets(startSig) {
    const out = [];
    for (const n of Object.values(this.nodes)) {
      if (n.t !== 'term') continue;
      const p = this.findPath(startSig, n.id);
      if (p) out.push(n.id);
    }
    return out;
  }

  // Flankenschutz: gibt {need: {weiche: lage}, open: [unschützbare Stellen]} zurück
  _flank(path) {
    const need = {};
    const open = [];
    for (const id of Object.keys(path.sw)) {
      const i = path.elems.indexOf(id);
      const prev = path.elems[i - 1], next = path.elems[i + 1];
      for (const p of ['str', 'br']) {
        const e = this.portMap[`${id}.${p}`];
        if (e === prev || e === next) continue; // Strang gehört zum Fahrweg
        let c = this._across(id, p);
        for (let guard = 0; guard < 12; guard++) {
          const N = this.nodes[c.node];
          if (N.t === 'term') break; // Prellbock/Gleisende schützt
          if (N.t === 'sig') {
            // Fahrt zur Weiche hin liefe auf die Frontseite des Signals (Halt) -> Schutz
            if (c.port === (N.dir === 'E' ? 'e' : 'w')) break;
            c = this._across(N.id, c.port === 'w' ? 'e' : 'w');
            continue;
          }
          if (c.port === 'stem') { open.push(`${this.nodes[id].no}/${N.no}`); break; }
          const want = c.port === 'str' ? 'br' : 'str';
          const have = path.sw[N.id];
          if (!have) need[N.id] = want;
          break;
        }
      }
    }
    return { need, open };
  }

  // ---------- Fahrstraße einstellen ----------
  request(startSig, targetId) {
    const sg = this.sig[startSig];
    if (!sg) return this._fail('Unbekanntes Signal');
    const name = this.nodes[startSig].name;
    const tname = this.nodes[targetId] ? this.nodes[targetId].name : targetId;
    if (sg.route) return this._fail(`Signal ${name} hat bereits eine Fahrstraße`);
    const path = this.findPath(startSig, targetId);
    if (!path) return this._fail(`Keine Fahrstraße ${name} → ${tname} möglich`);
    // Prüfungen
    for (const el of path.elems) {
      if (this.isOccupied(el)) return this._fail(`${name} → ${tname}: ${this.label(el)} besetzt`);
      if (this.lock[el]) return this._fail(`${name} → ${tname}: Fahrstraßenausschluss (${this.label(el)} festgelegt)`);
    }
    for (const [id, pos] of Object.entries(path.sw)) {
      const fl = this.flankLock[id];
      if (fl && fl.pos !== pos) return this._fail(`${name} → ${tname}: Fahrstraßenausschluss (Flankenschutz W ${this.nodes[id].no})`);
      const s = this.sw[id];
      if (s.disturbed && s.pos !== pos) return this._fail(`${name} → ${tname}: Weichenstörung W ${this.nodes[id].no}`);
    }
    const fl = this._flank(path);
    const flankOk = {};
    const unprotected = [...fl.open];
    for (const [id, pos] of Object.entries(fl.need)) {
      const cur = this.flankLock[id];
      const routeLock = this.lock[id] ? this.routes.find(r => r.id === this.lock[id]) : null;
      const lockedOther = routeLock && routeLock.sw[id] !== pos;
      if ((cur && cur.pos !== pos) || lockedOther || (this.sw[id].disturbed && this.sw[id].pos !== pos) || this.isOccupied(id) && this.sw[id].pos !== pos) {
        unprotected.push(this.nodes[id].no);
      } else flankOk[id] = pos;
    }
    const route = {
      id: this._rid++, start: startSig, target: targetId, elems: path.elems, sw: path.sw,
      flank: flankOk, diverging: path.br > 0, state: 'setting', progress: -1, fht: null, unprotected,
      names: `${name} → ${tname}`,
    };
    for (const el of route.elems) this.lock[el] = route.id;
    for (const [id, pos] of Object.entries(route.flank)) {
      const f = this.flankLock[id] || (this.flankLock[id] = { pos, count: 0 });
      f.count++;
    }
    for (const [id, pos] of [...Object.entries(route.sw), ...Object.entries(route.flank)]) {
      this.sw[id].target = pos;
    }
    sg.route = route.id;
    this.routes.push(route);
    this.msg(`Fahrstraße ${route.names} wird eingestellt` + (unprotected.length ? ` – Flankenschutz unvollständig (${unprotected.join(', ')})` : ''), unprotected.length ? 'warn' : 'info');
    this._emit();
    return { ok: true, route };
  }

  _fail(text) { this.msg(text, 'err'); this._emit(); return { ok: false, msg: text }; }

  routeOf(sigId) { const r = this.sig[sigId].route; return r ? this.routes.find(x => x.id === r) : null; }

  // ---------- Hilfsbedienungen ----------
  signalHalt(sigId) {
    const sg = this.sig[sigId];
    if (!OPEN.has(sg.aspect)) return this._fail(`Signal ${this.nodes[sigId].name} steht schon auf Halt`);
    sg.aspect = 'Hp0';
    const r = this.routeOf(sigId);
    if (r) r.held = true;
    this.msg(`Signal ${this.nodes[sigId].name}: Halt (SHT)`);
    this._emit();
    return { ok: true };
  }

  hilfsaufloesen(sigId) {
    const sg = this.sig[sigId];
    const r = this.routeOf(sigId);
    if (!r) return this._fail(`Signal ${this.nodes[sigId].name}: keine Fahrstraße festgelegt`);
    if (OPEN.has(sg.aspect)) return this._fail(`Signal ${this.nodes[sigId].name} zeigt Fahrt – erst Signal Halt (SHT)`);
    r.fht = FHT_WAIT;
    this.msg(`Hilfsauflösung ${r.names}: Wartezeit läuft (${FHT_WAIT} s)`, 'warn');
    this._emit();
    return { ok: true };
  }

  ersatzsignal(sigId) {
    const sg = this.sig[sigId];
    const r = this.routeOf(sigId);
    if (!r || r.state !== 'locked') return this._fail(`Ersatzsignal ${this.nodes[sigId].name}: Fahrstraße nicht fest`);
    if (!sg.disturbed) return this._fail(`Ersatzsignal nur bei Signalstörung (Signal ${this.nodes[sigId].name} ist nicht gestört)`);
    sg.aspect = 'Zs1';
    r.held = false;
    this.msg(`Ersatzsignal Zs 1 an ${this.nodes[sigId].name} (EGT)`, 'warn');
    this._emit();
    return { ok: true };
  }

  switchManual(swId, pos) {
    const s = this.sw[swId];
    if (this.lock[swId] || this.flankLock[swId]) return this._fail(`W ${this.nodes[swId].no} ist festgelegt`);
    if (this.isOccupied(swId)) return this._fail(`W ${this.nodes[swId].no} besetzt`);
    if (s.disturbed) return this._fail(`W ${this.nodes[swId].no} gestört`);
    s.target = pos || (s.pos === 'str' ? 'br' : 'str');
    this.msg(`W ${this.nodes[swId].no} wird in ${s.target === 'str' ? 'Grund' : 'Abzweig'}stellung umgestellt (WT)`);
    this._emit();
    return { ok: true };
  }

  toggleSwitchFault(swId) {
    const s = this.sw[swId];
    s.disturbed = !s.disturbed;
    this.msg(`W ${this.nodes[swId].no}: Störung ${s.disturbed ? 'eingeleitet' : 'behoben'}`, s.disturbed ? 'err' : 'info');
    this._emit();
  }
  toggleSignalFault(sigId) {
    const sg = this.sig[sigId];
    sg.disturbed = !sg.disturbed;
    if (sg.disturbed && sg.aspect !== 'Hp0') { sg.aspect = 'Hp0'; }
    this.msg(`Signal ${this.nodes[sigId].name}: Störung ${sg.disturbed ? 'eingeleitet' : 'behoben'}`, sg.disturbed ? 'err' : 'info');
    this._emit();
  }
  toggleTrackFault(el) {
    this.fault[el] ? delete this.fault[el] : (this.fault[el] = true);
    this.msg(`${this.label(el)}: Gleisfreimeldestörung ${this.fault[el] ? 'eingeleitet' : 'behoben'}`, this.fault[el] ? 'err' : 'info');
    this._emit();
  }

  // ---------- Züge ----------
  spawnTrain(edgeId, dir) {
    const e = this.edges[edgeId];
    if (!e) return this._fail('Kein Gleisabschnitt');
    if (this.isOccupied(edgeId)) return this._fail(`${edgeId} ist schon besetzt`);
    if (this.lock[edgeId]) return this._fail(`${edgeId} ist festgelegt`);
    const xs = e.ends.map(en => this.nodes[en.node].x);
    let toIdx = xs[0] > xs[1] ? 0 : 1;
    if (dir === 'W') toIdx = 1 - toIdx;
    const to = e.ends[toIdx];
    const t = { id: this._tid++, cur: { kind: 'edge', id: edgeId, to }, cells: [edgeId], wait: 0.5, state: 'ready', dir };
    this.occ[edgeId] = t.id;
    this.trains.push(t);
    this.msg(`Zug ${t.id} auf ${edgeId} aufgestellt (${dir === 'E' ? 'Richtung Ost' : 'Richtung West'})`);
    this._emit();
    return { ok: true, train: t };
  }

  reverseTrain(id) {
    const t = this.trains.find(x => x.id === id);
    if (!t || t.cur.kind !== 'edge') return this._fail('Zug kann hier nicht wenden');
    const e = this.edges[t.cur.id];
    const to = (e.ends[0].node === t.cur.to.node && e.ends[0].port === t.cur.to.port) ? e.ends[1] : e.ends[0];
    for (const c of t.cells) if (c !== t.cur.id && this.occ[c] === t.id) delete this.occ[c];
    t.cells = [t.cur.id];
    t.cur = { kind: 'edge', id: t.cur.id, to };
    t.dir = t.dir === 'E' ? 'W' : 'E';
    t.state = 'ready';
    t.wait = 0.5;
    this.msg(`Zug ${t.id} wendet (Fahrtrichtung ${t.dir === 'E' ? 'Ost' : 'West'})`);
    this._emit();
    return { ok: true };
  }

  removeTrain(id) {
    const t = this.trains.find(x => x.id === id);
    if (!t) return;
    for (const c of t.cells) delete this.occ[c];
    this.trains = this.trains.filter(x => x !== t);
    this._emit();
  }

  // ---------- Zeitschritt ----------
  tick(dt) {
    this.time += dt;
    // Weichen
    for (const [id, s] of Object.entries(this.sw)) {
      if (s.target !== s.pos) {
        if (s.disturbed || this.isOccupied(id)) { s.moving = 0; continue; }
        s.moving += dt;
        if (s.moving >= SWITCH_TIME) { s.pos = s.target; s.moving = 0; }
      } else s.moving = 0;
    }
    // Fahrstraßen
    for (const r of this.routes.slice()) {
      const sg = this.sig[r.start];
      if (r.state === 'setting') {
        const all = [...Object.entries(r.sw), ...Object.entries(r.flank)];
        if (all.every(([id, pos]) => this.sw[id].pos === pos && this.sw[id].target === pos)) {
          r.state = 'locked';
          this.msg(`Fahrstraße ${r.names} festgelegt`);
        }
      }
      if (r.state === 'locked' && !r.held && !r.passed && sg.aspect === 'Hp0' && !sg.disturbed && !r.fht) {
        sg.aspect = r.diverging ? 'Hp2' : 'Hp1';
        this.msg(`Signal ${this.nodes[r.start].name}: ${sg.aspect === 'Hp1' ? 'Fahrt (Hp 1)' : 'Langsamfahrt (Hp 2)'}`);
      }
      if (r.fht != null) {
        r.fht -= dt;
        if (r.fht <= 0) { this._dissolve(r, true); continue; }
      }
    }
    // Züge
    for (const t of this.trains.slice()) this._moveTrain(t, dt);
    this._releaseBehindTrains();
    this._emit();
  }

  _dissolve(r, force) {
    for (const el of r.elems) {
      if (this.lock[el] === r.id) {
        if (force || !this.isOccupied(el)) delete this.lock[el];
      }
    }
    for (const id of Object.keys(r.flank)) {
      const f = this.flankLock[id];
      if (f && --f.count <= 0) delete this.flankLock[id];
    }
    const sg = this.sig[r.start];
    sg.route = null;
    sg.aspect = 'Hp0';
    this.routes = this.routes.filter(x => x !== r);
    this.msg(`Fahrstraße ${r.names} aufgelöst`);
  }

  _releaseBehindTrains() {
    for (const r of this.routes.slice()) {
      if (r.progress < 0) continue;
      const last = r.elems.length - 1;
      for (let i = 0; i < r.progress; i++) {
        const el = r.elems[i];
        if (this.lock[el] === r.id && !this.isOccupied(el)) delete this.lock[el];
      }
      if (r.progress === last) {
        const el = r.elems[last];
        if (this.lock[el] === r.id) delete this.lock[el];
      }
      const lastTrain = this.trains.find(t => t.id === this.occ[r.elems[last]]);
      if (r.progress === last && lastTrain && lastTrain.state === 'done') { this._dissolve(r, true); continue; }
      const still = r.elems.some(el => this.lock[el] === r.id);
      if (!still) this._dissolve(r, false);
    }
  }

  _moveTrain(t, dt) {
    t.wait -= dt;
    if (t.wait > 0 || t.state === 'done') return;
    const cur = t.cur;
    if (cur.kind === 'edge') {
      const N = this.nodes[cur.to.node];
      if (N.t === 'term') { t.state = 'done'; return; }
      if (N.t === 'sig') {
        const front = N.dir === 'E' ? 'w' : 'e';
        if (cur.to.port === front) {
          const sg = this.sig[N.id];
          if (!OPEN.has(sg.aspect)) { t.state = 'halt'; return; }
          t.state = 'run';
          const r = this.routeOf(N.id);
          if (r) { r.passed = true; }
          sg.aspect = 'Hp0'; // Signalrückfall
        }
        const out = cur.to.port === 'w' ? 'e' : 'w';
        const nx = this._across(N.id, out);
        this._enterEdge(t, nx.edge, { node: nx.node, port: nx.port });
        return;
      }
      // Weiche
      const s = this.sw[N.id];
      const p = cur.to.port;
      if (s.target !== s.pos) { t.state = 'halt'; return; }
      if (p !== 'stem' && s.pos !== p) { t.state = 'halt'; return; }
      if (this.isOccupied(N.id) && this.occ[N.id] !== t.id) { t.state = 'halt'; return; }
      const outPort = p === 'stem' ? s.pos : 'stem';
      t.state = 'run';
      this._occupy(t, N.id);
      t.cur = { kind: 'sw', id: N.id, out: outPort };
      t.wait = 0.5;
      return;
    }
    // aktuell auf Weiche: in Folgekante
    const nx = this._across(cur.id, cur.out);
    this._enterEdge(t, nx.edge, { node: nx.node, port: nx.port });
  }

  _enterEdge(t, edgeId, to) {
    if (this.occ[edgeId] && this.occ[edgeId] !== t.id) { t.state = 'halt'; return; }
    t.state = 'run';
    this._occupy(t, edgeId);
    t.cur = { kind: 'edge', id: edgeId, to };
    t.wait = 0.5 + this.edges[edgeId].len / 260;
  }

  _occupy(t, el) {
    this.occ[el] = t.id;
    t.cells.push(el);
    while (t.cells.length > 2) { const old = t.cells.shift(); if (this.occ[old] === t.id) delete this.occ[old]; }
    const r = this.routes.find(x => x.id === this.lock[el]);
    if (r) {
      const i = r.elems.indexOf(el);
      if (i > r.progress) r.progress = i;
    }
  }
}
