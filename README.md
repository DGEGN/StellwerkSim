# Sp Dr 60 – Kaiserslautern Hbf (Gesamtanlage nach Stelltischbild), Version 7

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


## Version 5: Tagesfahrplan
- `js/fahrplan.js`: Regelfahrplan Kaiserslautern Hbf (Abfahrtstafel gültig ab 14.06.2026), 249 Zugfahrten, für Mo–Fr (Mi 25.11.2026), Sa (28.11.) und So (29.11.) ausgewertet. Gültigkeitshinweise („vom … bis …“, „nicht …“, „auch …“) wurden für diese Referenztage berechnet.
- `js/fahrplanbetrieb.js`: Tagesfahrplan-Betrieb. Der Fahrplan nennt nur Abfahrten – Ankunftszeiten sind errechnet (Durchläufer 3 min, Wendezüge 7 min Aufenthalt). Zugnummer, Linie und Plangleis werden angezeigt. Abfahrt erst zur Planzeit.
- Gleiszuordnung: 1=101, 2=102, 5=105, 8=108, 10=110, übrige gleich. Richtungen: Pirmasens, Lauterecken, Homburg (Landstuhl/Kusel), Ludwigshafen (Hochspeyer/Neustadt), Enkenbach (Bad Münster).
- Zusätzlich im Gleisbild (nicht im Plan vorhanden, nötig für den Fahrplan): Signale P108, P110, N120; Weichen 048, 057, 058 (Überleitung Gl. 40 ↔ Homburg, Gl. 110 ↔ Westkopf).
- `tests/test-fahrplan.mjs <mf|sa|so> <von h> <bis h>`: Bot fährt einen ganzen Tag (alle drei Tage: 0 falsch, 0 ausgefallen).
- Noch nicht enthalten: Werk/Abstellanlagen, Gleise 109/119/162–190, Durchrutschweg, Rangierstraßen, Eselsfürth.

## Tasten am Signal (Version 7)
- **Rote Taste** (Kreis im Gleis): Zugstraße. Starttaste, dann Zieltaste (blinkt). Zugstraßen zu einem Signal gibt es nur, wenn der Abschnitt mindestens 150 Bildpunkte lang ist (Zug passt hinein).
- **Graue Taste** (Quadrat am Signalbild): Rangierstraße, beliebig kurz, Signal zeigt Sh 1 (weiß). Zieltaste: graue Taste des Zielsignals oder Gleisende.
- Züge werden als Balken mit Länge dargestellt.
