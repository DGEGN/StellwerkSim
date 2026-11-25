# Spdr L60 – Kaiserslautern Hbf (Westkopf)

Tablet-Simulation eines Spurplan-Drucktastenstellwerks (Spdr L60) als statische Web-App.
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
- `js/engine.js` – Stellwerkslogik (Fahrwegsuche, Flankenschutz, Verschlüsse, Weichenlauf, Signale, Zugfahrten, Auflösung).
- `js/app.js` – Oberfläche (SVG-Gleisbild, Touch-Bedienung, Hilfstasten).

## Stand Version 1 / bekannte Grenzen
- Gleisbild aus dem Plan „Serviceeinrichtungen Kaiserslautern Hbf“ übertragen, **nicht amtlich geprüft**.
- Fahrstraßen und Flankenschutz werden aus der Topologie berechnet, nicht aus der echten Fahrstraßentabelle.
- Fehlt noch: Ostkopf, Werk/Abstellanlagen (Weichen 010–016, 020/021, 050–053, 059/060, 062–076, 105–113),
  Gleisanschlüsse 214/215, Rangiersignale, ortsgestellte Weichen, Gleisfreimeldeabschnitte nach Original.
- Signalbilder vereinfacht: Hp 1 / Hp 2 (bei Abzweig) / Zs 1.
