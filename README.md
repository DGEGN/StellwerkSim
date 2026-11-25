# Sp Dr 60 – Kaiserslautern Hbf (Westkopf), Version 3

Tablet-Simulation eines Spurplan-Drucktastenstellwerks (Sp Dr 60) als statische Web-App.
Bedienlogik und Melderzustände orientieren sich an der Ril 482.9009 (das Dokument selbst ist nicht Teil des Repositories).
Läuft ohne Server, ohne Build-Schritt – einfach über GitHub Pages hosten.

## Auf GitHub Pages veröffentlichen
1. Neues Repository auf GitHub anlegen (z. B. `spdr-l60-simulation`).
2. Alle Dateien dieses Ordners hochladen (inkl. `.nojekyll`).
3. Settings → Pages → Source: „Deploy from a branch“ → Branch `main`, Ordner `/ (root)`.
4. Nach ca. 1 Minute erreichbar unter `https://<name>.github.io/<repo>/`.
5. Auf dem Tablet im Browser öffnen → „Zum Home-Bildschirm“ → läuft als Vollbild-App, auch offline.

## Lokal testen
    python3 -m http.server 8000     # dann http://localhost:8000
    node tests/test-engine.mjs      # Engine-Tests

## Aufbau
- `js/data-skl-west.js` – Gleisplan als Daten (Weichen, Signale, Gleise). **Hier Korrekturen am Gleisbild machen.**
- `js/betrieb.js` – Fahrplanbetrieb (Ein-/Ausfahrten mit Zugnummern, Wertung).
- `js/engine.js` – Stellwerkslogik (Fahrwegsuche, Flankenschutz, Verschlüsse, Weichenlauf, Festlegemelder, Auflösung, FRT/FHT, Ersatzsignal, Laufkettensperre, Zählwerke, Störungen).
- `js/app.js` – Oberfläche (SVG-Gleisbild, Touch-Bedienung, Hilfstasten).

## Stand Version 2 / bekannte Grenzen
- Gleisbild aus dem Plan „Serviceeinrichtungen Kaiserslautern Hbf“ übertragen, **nicht amtlich geprüft**.
- Fahrstraßen und Flankenschutz werden aus der Topologie berechnet, nicht aus der echten Verschlusstabelle.
- Abgebildet: Zugstraßen (Start-/Zieltaste, Zeitfenster), Festlegemelder, abschnittsweise Auflösung, FRT, FHT (gesamt und einzeln),
  HaGT, LsSpT/LsESpT, ErsGT (mit Laufkettensperre, erlischt nach 90 s), WGT, WHT, WAT, WSpT/WESpT, Bahnhofstaste, AzGrT,
  Weichenausleuchtung, Zählwerke, Weichen-/Signal-/Freimelde-/Auffahrstörungen mit Wecker und Hupe.
- Version 3: Nummernstellpult mit Zugnummern (folgen dem Zug) und Fahrplanbetrieb (ruhig/normal/dicht) mit Ziel und Wertung.
- Nicht abgebildet: Durchrutschweg (DHT/DRGT), Rangier- und Zughilfsstraßen, Umfahrstraßen, Mittelweichen, Nahstellbetrieb,
  Streckenblock/Erlaubnis.
- Fehlt noch: Ostkopf, Werk/Abstellanlagen (Weichen 010–016, 020/021, 050–053, 059/060, 062–076, 105–113), Gleisanschlüsse 214/215,
  ortsgestellte Weichen, Gleisfreimeldeabschnitte nach Original.
