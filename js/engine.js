// Stellwerks-Engine – Spurplanstellwerk Sp Dr 60 (vereinfacht, Bedienlogik nach Ril 482.9009)
// Läuft im Browser und in Node (für Tests). Keine DOM-Abhängigkeiten.
//
// Abgebildet: Zugstraßen (Start-/Zieltaste), Weichenlaufkette, Verschlüsse, Flankenschutz,
// Festlegemelder, abschnittsweise Auflösung, Rücknahme (FRT), Hilfsauflösung (FHT, auch einzeln),
// Signalhalt/-sperre, Ersatzsignal, Weichen einzeln/Hilfstaste/Sperre/Auffahren, Zählwerke, Störungen.
// Nicht abgebildet: Durchrutschweg, Rangierstraßen, Zughilfsstraßen, Umfahrstraßen, Nahstellbetrieb.

export const SWITCH_TIME = 3.5;     // s Weichenumlauf (Ril: i. d. R. 3–5 s)
export const SWITCH_FAULT_TIME = 6; // s bis Weichenstörung gemeldet wird (Ril §11)
export const ERSATZ_TIME = 90;      // s bis Ersatzsignal selbsttätig erlischt (Ril §6 Abs. 6)
export const KEY_WINDOW = 5;        // s Zeitfenster für Folgebedienung (Ril §7)
const OPEN = new Set(['Hp1', 'Hp2', 'Zs1']);

export class Interlocking {
  constructor(data) {
    this.data = data;
    this.nodes = {};
    this.edges = {};
    this.portMap = {};
    for (const [id, n] of Object.entries(data.nodes)) this.nodes[id] = { id, ...n };
    for (const [id, a, b, via] of data.edges) {
      this.edges[id] = { id, ends: [this._end(a), this._end(b)], via: via || [] };
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
    this.occ = {};       // Element -> Zug-ID (tatsächliche Besetzung)
    this.fault = {};     // Element -> true (Gleisfreimeldestörung: als besetzt gemeldet)
    this.lock = {};      // Element -> Fahrstraßen-ID
    this.flankLock = {}; // Weiche -> {pos, count}
    this.routes = [];
    this.trains = [];
    this.time = 0;
    this._rid = 1;
    this._tid = 1;
    this.messages = [];
    this.laufkette = false;      // Weichenlaufkette gesperrt
    this.ausleuchtung = false;   // Weichenausleuchtung (StET)
    this.alarm = { wecker: false, hupe: false };
    this.zaehler = { FHZ: 0, WHZ: 0, ErsZ: 0, EAZ: 0, GAZ: 0, WAZ: 0 };
    for (const n of Object.values(this.nodes)) {
      if (n.t === 'sw') this.sw[n.id] = { pos: 'str', target: 'str', moving: 0, disturbed: false, stoerTimer: 0, stoerMelder: false, sperre: false, aufgefahren: false, force: false };
      if (n.t === 'sig') this.sig[n.id] = { aspect: 'Hp0', route: null, disturbed: false, sperre: false, zsTimer: 0 };
    }
    this._validate();
  }

  _end(s) { const [node, port] = s.split('.'); return { node, port }; }
  _pos(id) { const n = this.nodes[id]; return [n.x, n.y]; }
  _validate() {
    for (const n of Object.values(this.nodes)) {
      const ports = n.t === 'sw' ? ['stem', 'str', 'br'] : n.t === 'sig' ? ['w', 'e'] : ['p'];
      for (const p of ports) if (!this.portMap[`${n.id}.${p}`]) throw new Error(`Port ohne Kante: ${n.id}.${p}`);
    }
  }

  msg(text, level = 'info') {
    this.messages.unshift({ t: this.time, text, level });
    if (this.messages.length > 60) this.messages.pop();
  }
  isElement(id) { return !!this.edges[id] || (this.nodes[id] && this.nodes[id].t === 'sw'); }
  label(el) { return this.edges[el] ? el : 'W ' + this.nodes[el].no; }
  sname(id) { return this.nodes[id].name || id; }
  isOccupied(el) { return !!this.occ[el] || !!this.fault[el]; }
  routeOf(sigId) { const r = this.sig[sigId].route; return r ? this.routes.find(x => x.id === r) : null; }
  _fail(text) { this.msg(text, 'err'); return { ok: false, msg: text }; }
  _ok(text, level = 'info') { if (text) this.msg(text, level); return { ok: true }; }
  anyFault() {
    return {
      weiche: Object.values(this.sw).some(s => s.stoerMelder || s.aufgefahren),
      signal: Object.values(this.sig).some(s => s.disturbed),
      gleis: Object.keys(this.fault).length > 0,
    };
  }

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
    const first = this._across(startSig, S.dir === 'E' ? 'e' : 'w');
    const seen = new Set();
    const pq = [{ cost: 0, node: first.node, port: first.port, elems: [first.edge], sw: {}, br: 0 }];
    while (pq.length) {
      pq.sort((a, b) => a.cost - b.cost);
      const cur = pq.shift();
      const key = cur.node + '.' + cur.port + '|' + Object.entries(cur.sw).map(([k, v]) => k + v).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const N = this.nodes[cur.node];
      if (N.t === 'term') {
        if (N.id === targetId) return { elems: cur.elems, sw: cur.sw, br: cur.br, end: N.id };
        continue;
      }
      if (N.t === 'sig') {
        const front = N.dir === 'E' ? 'w' : 'e';
        if (cur.port === front) {
          if (N.id === targetId) return { elems: cur.elems, sw: cur.sw, br: cur.br, end: N.id };
          continue;
        }
        const nx = this._across(N.id, cur.port === 'w' ? 'e' : 'w');
        pq.push({ ...cur, cost: cur.cost + 1, node: nx.node, port: nx.port, elems: [...cur.elems, nx.edge] });
        continue;
      }
      const opts = cur.port === 'stem' ? [['str', 'str'], ['br', 'br']] : [['stem', cur.port]];
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

  validTargets(startSig) {
    return Object.values(this.nodes).filter(n => n.t === 'term' && this.findPath(startSig, n.id)).map(n => n.id);
  }

  // Flankenschutz-Bedarf
  _flank(path) {
    const need = {};
    const open = [];
    for (const id of Object.keys(path.sw)) {
      const i = path.elems.indexOf(id);
      const prev = path.elems[i - 1], next = path.elems[i + 1];
      for (const p of ['str', 'br']) {
        const e = this.portMap[`${id}.${p}`];
        if (e === prev || e === next) continue;
        let c = this._across(id, p);
        for (let guard = 0; guard < 12; guard++) {
          const N = this.nodes[c.node];
          if (N.t === 'term') break;
          if (N.t === 'sig') {
            if (c.port === (N.dir === 'E' ? 'e' : 'w')) break;
            c = this._across(N.id, c.port === 'w' ? 'e' : 'w');
            continue;
          }
          if (c.port === 'stem') { open.push(`${this.nodes[id].no}/${N.no}`); break; }
          const want = c.port === 'str' ? 'br' : 'str';
          if (!path.sw[N.id]) need[N.id] = want;
          break;
        }
      }
    }
    return { need, open };
  }

  // ---------- Zugstraße einstellen (Starttaste + Zieltaste) ----------
  request(startSig, targetId) {
    const sg = this.sig[startSig];
    if (!sg) return this._fail('Unbekanntes Signal');
    const name = this.sname(startSig);
    const tname = this.sname(targetId);
    const label = `${name} → ${tname}`;
    if (sg.route) return this._fail(`Signal ${name}: Fahrstraße bereits eingestellt`);
    if (sg.sperre) return this._fail(`Signal ${name} ist gesperrt`);
    const path = this.findPath(startSig, targetId);
    if (!path) return this._fail(`${label}: Zugstraße nicht vorhanden`);
    for (const el of path.elems) {
      if (this.isOccupied(el)) return this._fail(`${label}: ${this.label(el)} besetzt – Zugstraße läuft nicht ein`);
      if (this.lock[el]) return this._fail(`${label}: ${this.label(el)} in anderer Fahrstraße (Fahrstraßenausschluss)`);
    }
    const fl = this._flank(path);
    const flankOk = {};
    const unprotected = [...fl.open];
    for (const [id, pos] of Object.entries(path.sw)) {
      const f = this.flankLock[id];
      if (f && f.pos !== pos) return this._fail(`${label}: Fahrstraßenausschluss (W ${this.nodes[id].no} dient als Flankenschutz)`);
      const s = this.sw[id];
      if (s.pos !== pos && (this.laufkette || s.sperre || s.disturbed || s.aufgefahren)) {
        const why = this.laufkette ? 'Weichenlaufkette gesperrt' : s.sperre ? 'gesperrt' : s.aufgefahren ? 'aufgefahren' : 'gestört';
        return this._fail(`${label}: W ${this.nodes[id].no} nicht in Stellung (${why})`);
      }
    }
    for (const [id, pos] of Object.entries(fl.need)) {
      const f = this.flankLock[id];
      const rl = this.lock[id] ? this.routes.find(r => r.id === this.lock[id]) : null;
      const s = this.sw[id];
      const blocked = (f && f.pos !== pos) || (rl && rl.sw[id] !== pos) || (s.pos !== pos && (this.laufkette || s.sperre || s.disturbed || s.aufgefahren || this.isOccupied(id)));
      if (blocked) unprotected.push(this.nodes[id].no); else flankOk[id] = pos;
    }
    const route = {
      id: this._rid++, start: startSig, target: targetId, elems: path.elems, sw: path.sw,
      flank: flankOk, diverging: path.br > 0, state: 'setting', progress: -1, unprotected,
      names: label, ffm: false,
    };
    for (const el of route.elems) this.lock[el] = route.id;
    for (const [id, pos] of Object.entries(route.flank)) {
      const f = this.flankLock[id] || (this.flankLock[id] = { pos, count: 0 });
      f.count++;
    }
    for (const [id, pos] of [...Object.entries(route.sw), ...Object.entries(route.flank)]) {
      if (this.sw[id].pos !== pos) this.sw[id].target = pos;
    }
    sg.route = route.id;
    this.routes.push(route);
    this.msg(`Zugstraße ${label} läuft ein` + (unprotected.length ? ` – kein Flankenschutz an ${unprotected.join(', ')}` : ''), unprotected.length ? 'warn' : 'info');
    return { ok: true, route };
  }

  // ---------- Signale ----------
  signalHalt(sigId) {            // HaGT + ZT
    const sg = this.sig[sigId];
    if (!OPEN.has(sg.aspect)) return this._fail(`Signal ${this.sname(sigId)} zeigt schon Halt`);
    sg.aspect = 'Hp0'; sg.zsTimer = 0;
    const r = this.routeOf(sigId);
    if (r) r.held = true;
    return this._ok(`Signal ${this.sname(sigId)} auf Halt (HaGT)`);
  }
  signalSperren(sigId) {         // LsSpT + ZT
    const sg = this.sig[sigId];
    if (OPEN.has(sg.aspect)) return this._fail(`Signal ${this.sname(sigId)} steht auf Fahrt – vor dem Sperren auf Halt stellen`);
    sg.sperre = true;
    return this._ok(`Signal ${this.sname(sigId)} gesperrt (LsSpT)`);
  }
  signalEntsperren(sigId) {      // LsESpT + ZT
    this.sig[sigId].sperre = false;
    return this._ok(`Signal ${this.sname(sigId)} entsperrt (LsESpT)`);
  }
  ersatzsignal(sigId) {          // ErsGT + ZT
    const sg = this.sig[sigId];
    const r = this.routeOf(sigId);
    if (!r || r.state !== 'locked') return this._fail(`Ersatzsignal ${this.sname(sigId)}: Zugstraße nicht eingestellt und gesichert`);
    if (!this.laufkette) return this._fail('Ersatzsignal: Weichenlaufkette vorher sperren (WSpT + BfT)');
    if (OPEN.has(sg.aspect)) return this._fail(`Signal ${this.sname(sigId)} zeigt bereits Fahrt`);
    sg.aspect = 'Zs1'; sg.zsTimer = ERSATZ_TIME; r.held = false;
    this.zaehler.ErsZ++;
    return this._ok(`Ersatzsignal Zs 1 an ${this.sname(sigId)} (ErsGT, Ersatzsignalzählwerk ${this.zaehler.ErsZ})`, 'warn');
  }

  // ---------- Fahrstraßen auflösen ----------
  ruecknahme(startSig, targetId) {         // FRT + ZT Start + ZT Ziel
    const r = this.routeOf(startSig);
    if (!r) return this._fail(`Signal ${this.sname(startSig)}: keine Fahrstraße eingestellt`);
    if (r.target !== targetId) return this._fail(`Zieltaste passt nicht zur Fahrstraße ${r.names}`);
    if (OPEN.has(this.sig[startSig].aspect)) return this._fail(`Signal ${this.sname(startSig)} erst auf Halt stellen (HaGT)`);
    if (r.ffm) return this._fail(`${r.names}: Festlegemelder leuchtet – Auflösen nur mit FHT`);
    this._dissolve(r, true, 'zurückgenommen');
    return { ok: true };
  }
  hilfsaufloesen(startSig, targetId) {     // FHT + ZT Start + ZT Ziel
    const r = this.routeOf(startSig);
    if (!r) return this._fail(`Signal ${this.sname(startSig)}: keine Fahrstraße eingestellt`);
    if (r.target !== targetId) return this._fail(`Zieltaste passt nicht zur Fahrstraße ${r.names}`);
    if (OPEN.has(this.sig[startSig].aspect)) return this._fail(`Signal ${this.sname(startSig)} erst auf Halt stellen (HaGT)`);
    this.zaehler.FHZ++; this.zaehler.GAZ++;
    this._dissolve(r, true, `hilfsaufgelöst (FHT, Zählwerk ${this.zaehler.FHZ})`);
    return { ok: true };
  }
  hilfsaufloesenEinzel(el) {               // FHT + Weichen-/Gleistaste
    const rid = this.lock[el];
    const fl = this.flankLock[el];
    if (!rid && !fl) return this._fail(`${this.label(el)} ist nicht verschlossen`);
    if (rid) {
      const r = this.routes.find(x => x.id === rid);
      delete this.lock[el];
      r.elems = r.elems.filter(e => e !== el);
      if (!r.elems.some(e => this.lock[e] === r.id)) this._dissolve(r, true, 'durch Einzelauflösung aufgelöst');
    } else {
      for (const r of this.routes) if (r.flank[el]) { delete r.flank[el]; }
      delete this.flankLock[el];
    }
    this.zaehler.EAZ++;
    return this._ok(`${this.label(el)} einzeln hilfsaufgelöst (FHT, Zählwerk EAZ ${this.zaehler.EAZ})`, 'warn');
  }

  // ---------- Weichen ----------
  laufketteSperren(on) {                   // WSpT/WESpT + BfT
    this.laufkette = on;
    return this._ok(on ? 'Weichenlaufkette gesperrt (WSpT + BfT)' : 'Weichenlaufkette entsperrt (WESpT + BfT)');
  }
  weicheUmstellen(id) {                    // WGT + WT
    const s = this.sw[id];
    if (this.lock[id] || this.flankLock[id]) return this._fail(`W ${this.nodes[id].no} verschlossen`);
    if (this.isOccupied(id)) return this._fail(`W ${this.nodes[id].no} besetzt – Umstellen nur mit WHT`);
    if (s.sperre) return this._fail(`W ${this.nodes[id].no} gesperrt`);
    if (s.disturbed) { s.target = s.target === 'str' ? 'br' : 'str'; return this._ok(`W ${this.nodes[id].no} wird umgestellt`); }
    s.target = s.pos === 'str' ? 'br' : 'str';
    return this._ok(`W ${this.nodes[id].no} läuft in ${s.target === 'str' ? 'Plus' : 'Minus'}-Stellung um`);
  }
  weicheHilfs(id) {                        // WHT + WT
    const s = this.sw[id];
    if (!this.isOccupied(id)) return this._fail(`W ${this.nodes[id].no} ist nicht als besetzt gemeldet – WGT verwenden`);
    if (this.occ[id]) return this._fail(`W ${this.nodes[id].no} ist tatsächlich besetzt – Umstellen nicht zulässig`);
    if (this.lock[id] || this.flankLock[id]) return this._fail(`W ${this.nodes[id].no} verschlossen`);
    s.target = s.pos === 'str' ? 'br' : 'str'; s.force = true;
    this.zaehler.WHZ++;
    return this._ok(`W ${this.nodes[id].no} mit WHT umgestellt (Weichenhilfstastenzählwerk ${this.zaehler.WHZ})`, 'warn');
  }
  weicheSperren(id, on) {                  // WSpT/WESpT + WT
    this.sw[id].sperre = on;
    return this._ok(`W ${this.nodes[id].no} ${on ? 'gesperrt (WSpT)' : 'entsperrt (WESpT)'}`);
  }
  weicheAuffahrt(id) {                     // WAT + WT
    const s = this.sw[id];
    if (!s.aufgefahren) return this._fail(`W ${this.nodes[id].no} ist nicht aufgefahren`);
    s.aufgefahren = false; this.zaehler.WAZ++;
    this.alarm.wecker = this.alarm.wecker && this.anyFault().weiche;
    return this._ok(`W ${this.nodes[id].no} zurückgestellt (WAT, Zählwerk ${this.zaehler.WAZ})`);
  }
  azGrund(el) {                            // AzGrT + Weichen-/Gleistaste
    if (!this.fault[el]) return this._fail(`${this.label(el)}: keine Freimeldestörung`);
    delete this.fault[el];
    return this._ok(`${this.label(el)} in Achszählgrundstellung gebracht (AzGrT)`);
  }
  setAusleuchtung(on) { this.ausleuchtung = on; return this._ok(on ? 'Weichenausleuchtung ein (StET)' : 'Weichenausleuchtung aus (StAT)'); }
  weckerAus() { this.alarm.wecker = false; return { ok: true }; }
  hupeAus() { this.alarm.hupe = false; return { ok: true }; }

  // ---------- Störungen auslösen (Instruktor) ----------
  toggleSwitchFault(id) {
    const s = this.sw[id];
    s.disturbed = !s.disturbed;
    if (!s.disturbed) { s.stoerMelder = false; s.stoerTimer = 0; this.alarm.wecker = this.alarm.wecker && Object.values(this.sw).some(x => x.stoerMelder); }
    return this._ok(`[Störung] W ${this.nodes[id].no}: Antrieb ${s.disturbed ? 'gestört' : 'repariert'}`, s.disturbed ? 'err' : 'info');
  }
  switchRunOver(id) {
    const s = this.sw[id];
    s.aufgefahren = true; this.alarm.wecker = true;
    return this._ok(`[Störung] W ${this.nodes[id].no} aufgefahren`, 'err');
  }
  toggleSignalFault(id) {
    const sg = this.sig[id];
    sg.disturbed = !sg.disturbed;
    if (sg.disturbed) { this.alarm.hupe = true; if (OPEN.has(sg.aspect)) sg.aspect = 'Hp0'; } else this.alarm.hupe = this.alarm.hupe && Object.values(this.sig).some(x => x.disturbed);
    return this._ok(`[Störung] Signal ${this.sname(id)}: ${sg.disturbed ? 'gestört (Signalstörmelder, Hupe)' : 'repariert'}`, sg.disturbed ? 'err' : 'info');
  }
  toggleTrackFault(el) {
    this.fault[el] ? delete this.fault[el] : (this.fault[el] = true);
    return this._ok(`[Störung] ${this.label(el)}: Gleisfreimeldeanlage ${this.fault[el] ? 'gestört (rot ohne Zug)' : 'repariert'}`, this.fault[el] ? 'err' : 'info');
  }

  // ---------- Züge ----------
  spawnTrain(edgeId, dir, extra = {}) {
    const e = this.edges[edgeId];
    if (!e) return this._fail('Kein Gleisabschnitt');
    if (this.isOccupied(edgeId)) return this._fail(`${edgeId} ist schon besetzt`);
    if (this.lock[edgeId]) return this._fail(`${edgeId} ist verschlossen`);
    const xs = e.ends.map(en => this.nodes[en.node].x);
    let toIdx = xs[0] > xs[1] ? 0 : 1;
    if (dir === 'W') toIdx = 1 - toIdx;
    const t = { id: this._tid++, cur: { kind: 'edge', id: edgeId, to: e.ends[toIdx] }, cells: [edgeId], wait: 0.5, state: 'ready', dir, no: '', ...extra };
    this.occ[edgeId] = t.id;
    this.trains.push(t);
    return { ...this._ok(`Zug ${t.id} auf ${edgeId} aufgestellt (${dir === 'E' ? 'Richtung Ost' : 'Richtung West'})`), train: t };
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
    t.state = 'ready'; t.wait = 0.5;
    return this._ok(`Zug ${t.id} wendet (Richtung ${t.dir === 'E' ? 'Ost' : 'West'})`);
  }
  removeTrain(id) {
    const t = this.trains.find(x => x.id === id);
    if (!t) return;
    for (const c of t.cells) if (this.occ[c] === t.id) delete this.occ[c];
    this.trains = this.trains.filter(x => x !== t);
  }

  // ---------- Zeitschritt ----------
  tick(dt) {
    this.time += dt;
    for (const [id, s] of Object.entries(this.sw)) {
      if (s.target !== s.pos) {
        const blockedByOcc = this.isOccupied(id) && !s.force;
        if (s.disturbed || s.aufgefahren || blockedByOcc) {
          if (s.disturbed) {
            s.stoerTimer += dt;
            if (s.stoerTimer >= SWITCH_FAULT_TIME && !s.stoerMelder) {
              s.stoerMelder = true; this.alarm.wecker = true;
              this.msg(`W ${this.nodes[id].no}: Endstellung nicht erreicht – Weichenstörung (Wecker)`, 'err');
            }
          }
          s.moving = 0; continue;
        }
        s.moving += dt;
        if (s.moving >= SWITCH_TIME) { s.pos = s.target; s.moving = 0; s.force = false; s.stoerTimer = 0; }
      } else { s.moving = 0; s.stoerTimer = 0; s.force = false; }
    }
    for (const r of this.routes.slice()) {
      const sg = this.sig[r.start];
      if (r.state === 'setting') {
        const all = [...Object.entries(r.sw), ...Object.entries(r.flank)];
        const free = r.elems.every(el => !this.isOccupied(el));
        if (free && all.every(([id, pos]) => this.sw[id].pos === pos && this.sw[id].target === pos && !this.sw[id].aufgefahren)) {
          r.state = 'locked'; r.ffm = true;
          this.msg(`Zugstraße ${r.names} festgelegt (Festlegemelder)`);
        }
      }
      if (r.ffm) {
        const firstSw = r.elems.find(el => this.nodes[el] && this.nodes[el].t === 'sw');
        if (firstSw ? this.lock[firstSw] !== r.id : r.passed) r.ffm = false;
      }
      if (r.state === 'locked' && !r.held && !r.passed && sg.aspect === 'Hp0' && !sg.disturbed && !sg.sperre) {
        sg.aspect = r.diverging ? 'Hp2' : 'Hp1';
        this.msg(`Signal ${this.sname(r.start)}: Fahrt`);
      }
    }
    for (const [id, sg] of Object.entries(this.sig)) {
      if (sg.aspect === 'Zs1') {
        sg.zsTimer -= dt;
        if (sg.zsTimer <= 0) { sg.aspect = 'Hp0'; this.msg(`Ersatzsignal ${this.sname(id)} selbsttätig erloschen`); }
      }
    }
    for (const t of this.trains.slice()) this._moveTrain(t, dt);
    this._releaseBehindTrains();
  }

  _dissolve(r, force, how = 'aufgelöst') {
    for (const el of r.elems) if (this.lock[el] === r.id && (force || !this.isOccupied(el))) delete this.lock[el];
    for (const id of Object.keys(r.flank)) {
      const f = this.flankLock[id];
      if (f && --f.count <= 0) delete this.flankLock[id];
    }
    const sg = this.sig[r.start];
    sg.route = null;
    sg.aspect = 'Hp0'; sg.zsTimer = 0;
    this.routes = this.routes.filter(x => x !== r);
    this.msg(`Zugstraße ${r.names} ${how}`);
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
        if (this.lock[r.elems[last]] === r.id) delete this.lock[r.elems[last]];
      }
      const lastTrain = this.trains.find(t => t.id === this.occ[r.elems[last]]);
      if (r.progress === last && lastTrain && lastTrain.state === 'done') { this._dissolve(r, true); continue; }
      if (!r.elems.some(el => this.lock[el] === r.id)) this._dissolve(r, false);
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
          if (r) r.passed = true;
          sg.aspect = 'Hp0'; sg.zsTimer = 0;
        }
        const nx = this._across(N.id, cur.to.port === 'w' ? 'e' : 'w');
        this._enterEdge(t, nx.edge, { node: nx.node, port: nx.port });
        return;
      }
      const s = this.sw[N.id];
      const p = cur.to.port;
      if (s.target !== s.pos || s.aufgefahren) { t.state = 'halt'; return; }
      if (p !== 'stem' && s.pos !== p) { t.state = 'halt'; return; }
      if (this.occ[N.id] && this.occ[N.id] !== t.id) { t.state = 'halt'; return; }
      t.state = 'run';
      this._occupy(t, N.id);
      t.cur = { kind: 'sw', id: N.id, out: p === 'stem' ? s.pos : 'stem' };
      t.wait = 0.5;
      return;
    }
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
    if (r) { const i = r.elems.indexOf(el); if (i > r.progress) r.progress = i; }
  }
}
