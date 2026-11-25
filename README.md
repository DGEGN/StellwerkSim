# Sp Dr 60 – Kaiserslautern Hbf (Westkopf), Version 4

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

## Stand Version 4 / bekannte Grenzen
- Oberfläche nach den Tischfeldern der Ril 482.9009: farbige Tischfelder, runde Tasten mit Beschriftungsschild, Zählwerke mit Zahlenfeldern,
  Gleisbild mit schwarzen Gleisbändern, Gleisfeldmeldern (grau/gelb/rot), Weichen mit Spitzentaste, Stellungs-, Verschluss- und Sperrmeldern,
  Signalen mit Zugstraßentaste (Haltmelder), Festlegemelder und Namensschild.
- Gleisbild aus dem Plan „Serviceeinrichtungen Kaiserslautern Hbf“ übertragen, **nicht amtlich geprüft**. Der Ostkopf ist vereinfacht nachgebaut.
- Fahrstraßen und Flankenschutz werden aus der Topologie berechnet, nicht aus der echten Verschlusstabelle.
- Abgebildet: Zugstraßen (Start-/Zieltaste, Zeitfenster), Festlegemelder, abschnittsweise Auflösung, FRT, FHT, HaGT, LsSpT/LsESpT,
  ErsGT mit Laufkettensperre, WGT, WHT, WAT, WSpT/WESpT, Bahnhofstaste, AzGrT, Weichenausleuchtung, Zählwerke, Störungen mit Wecker/Hupe,
  Nummernstellpult mit Zugnummern, Fahrplanbetrieb mit Wertung.
- Nicht abgebildet: Durchrutschweg (DHT), Rangier-/Zughilfsstraßen, Umfahrstraßen, Nahstellbetrieb, Streckenblock.
- Fehlt noch: Werk und Abstellanlagen (Gleise 220–237, Weichen 025–027, 050–053, 056, 059, 060), Gleise 109/119/180–182, Gleisanschlüsse, ortsgestellte Weichen.
