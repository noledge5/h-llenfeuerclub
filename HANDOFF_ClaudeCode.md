# Übergabe an Claude Code: Eulenbach DM-Helfer 2.0

Status: UI gut, Funktion nicht abgenommen. Lu sagt: "UI okay, aber nicht funktional." Genaue Fehler unbekannt. Aufgabe: **real testen, kaputtes finden, fixen, Anforderungen unten abhaken.** UI-Look nicht umbauen.

## Ziel
Single-File-HTML (offline, Doppelklick `file://` in Chrome/Edge, kein Server, kein Konto) = DM-Helfer + VTT + Soundboard + Beamer-Fenster für das Abenteuer "Die Laterne von Eulenbach" (D&D 2024, Stufe 1, 5 Spieler 13–15 J., Lu = Spielleiter, Realschule BW). Sprache UI: Deutsch (Du-Form, "Heldinnen").

## Dateien
- `Eulenbach_DM-Helfer_2.0.html` = fertiges Build (585 KB). Lesbarer JS inline.
- `src/` Quellen: `skin.css`, `top.html`, `views_new.html`, `sndbar.html`, `prep_new.html`, `m1_store.js` (State, IndexedDB, Karten-Modelle, eingebaute Karten), `m2_audio.js` (Web Audio), `m3_render.js` (Zeichencode, wird als Text ins Beamer-Fenster kopiert, keine Closure-Zugriffe!), `m4_player.js` (Beamer-Fenster + Sync), `m5_vtt.js` (Spieltisch), `m6_glue.js` (Szenenleiste, Sound-Ansicht, Vorbereiten, Export/Import, Tasten, Boot).
- `build.py`: setzt aus `ref/eulenbach_dm_helfer_v5.html` + `src/` + `assets/` die Datei neu zusammen (`python3 build.py`). Patcht 6 Stellen im v5-JS (EV-Hooks, VIEWS, onView). Alternativ HTML direkt editieren.
- `ref/`: v5-Original (Abenteuertexte + Kampflogik, **Texte unverändert lassen**), `Design-Handoff_original.md`, `movement-and-scale.md`, `scenes-and-media.md`.
- `assets/`: Schriften (woff2, OFL: Cinzel, Cinzel Decorative, EB Garamond, IM Fell English), `tokens.css`, `bundle.css`.

## Architektur
- Ein IIFE. v5-Code (Szenen, Kampf `C`, `HEROES`, `MON`, `ENC`, Inventar, Würfel, SVG-Karten) + Module angehängt. `EV`-Objekt = Hooks (`EV.combatChanged` aus `renderCombat`, `EV.dice` aus `showBig`, `EV.scene` aus `showScene`).
- Speicher: localStorage `eulenbach3-*` (`v2` = Einstellungen/Szenenzuordnung, `maps` = Raster/Nebel/Figuren, v5-Keys), IndexedDB `eulenbach-v2` Store `blobs` (Bilder + Töne).
- Eingebaute Karten: SVG aus v5-Karten-Ansicht -> Canvas-Raster (140 px/Feld), getrennt `base` (ohne `.dm`, ohne Raster) und `dm`-Layer.
- Beamer: `window.open('', 'eulenbach-beamer')` + `document.write(playerDoc())`. Sync per `postMessage` (Zustand komplett; Bilder als Blob einmalig `{ev:'media'}`; Beamer meldet `{ev:'hello'}`). Nebel = Op-Liste `[{k:'all'|'r'|'b', v, ...}]`, wird auf beiden Seiten mit `evBuildFog` nachgespielt.
- Ton: `AudioContext`, Busse music/atmo/fx -> master. Musik/Atmo über `<audio>`+MediaElementSource bzw. synthetische Klänge (`syn:*`), Effekte `decodeAudioData`.
- Karten-Mathe: 1 Feld = 5 ft = 1,5 m; P = Bildbreite / Spalten; Ideal 140 px, min 100; Regel P = max(140, ceil(1080/Reihen)); Beamer-Faktor s = min(1920/B, 1080/H). Siehe `ref/movement-and-scale.md`.

## Vorgehen (Pflicht)
1. Datei in **echtem Chrome und Edge per `file://`** öffnen, mit echtem zweitem Monitor/Beamer, echten Lautsprechern. Headless-Tests (Playwright) liefen grün, finden aber nicht alles. Playwright zusätzlich nutzen, aber mit `--autoplay-policy` aus und mit Popup-Blocker-Verhalten.
2. Jede Anforderung unten durchspielen, Fehler notieren, fixen, Regressionstest-Skript (Playwright) ablegen.
3. Konsole muss fehlerfrei sein. Keine externen Requests (Offline-Test: Netz aus).
4. Nach jedem Fix `python3 build.py`, Ausgabe `Eulenbach_DM-Helfer_2.0.html` ersetzen.

## Anforderungen (Muss), je mit Abnahme

### A. Allgemein
- A1 Start offline per Doppelklick, keine Konsolenfehler, keine Netzzugriffe. Schriften eingebettet.
- A2 Reiter: Spielen, Spieltisch, Sound, Karten (v5-Skizzen), Heldinnen, Wissen, Vorbereiten. Letzter Reiter/Szene/Kampf bleiben nach Neuladen.
- A3 Alle v5-Funktionen unverändert: Szenen-Stepper, Hinweise abhaken, Kampf (Initiative, Runde, Welle 2, Laterne 3/4 Flammen, Todesrettungswürfe, Rückgängig), Gegnerwerte, Würfel, Ideen, Heldinnen-Inventar, Wissen-Suche, Checkliste, Sitzungstimer.
- A4 Responsive: DM ab 1100 px zweispaltig, Handy nutzbar, Tippen-zweimal statt Bestätigungsdialoge. WCAG AA, `prefers-reduced-motion`, Fokusring sichtbar.
- A5 Tasten: N nächster Zug, 1–9 Effekte, M Musik an/aus, F Beamer Karte/Bild, D Vorlesen-Ducking, Esc Werkzeug zurücksetzen. Nicht in Eingabefeldern auslösen.
- A6 Kopfleiste: Beamer-Status, Master-Lautstärke, Stumm, Timer, Würfel, Kerzenlicht-Thema.

### B. Beamer-Fenster
- B1 Knopf öffnet 2. Fenster; Popup-Blocker -> klarer Hinweis. Zweiter Klick findet bestehendes Fenster wieder (kein Doppelfenster).
- B2 Fenster zeigt 16:9-Bühne 1920×1080, skaliert + zentriert, Vollbild per F/Doppelklick, Cursor versteckt nach 2,5 s.
- B3 Modi: Karte, Stimmungsbild, Handout (Text ≥ 40 px bei 1920 breit), Titel, Pause. Umschaltung sofort.
- B4 Overlays: Kampfleiste oben (Runde, Medaillons Heldin grün/Gegner rot, aktiver Zug hervorgehoben, Heldinnen-TP als Balken, Gegner nur als Wort, Laternenflammen) und großes Würfelergebnis (4–5 m lesbar). Je abschaltbar.
- B5 DM-Neuladen oder Beamer-Neuladen -> Zustand kommt wieder (Hello/Resend), Bilder werden nachgeliefert.
- B6 Senden-Modus automatisch/von Hand (Knopf "An Beamer senden").
- B7 DM-Ebene (Fallen, versteckte Gegner, Truhe, `.dm`-Layer, versteckte Figuren) erscheint **nie** am Beamer. Prüfen per Beamer-Screenshot.
- B8 Läuft auch wenn Fenster auf zweiten Monitor gezogen/verkleinert wird.

### C. Spieltisch (VTT)
- C1 Karte je Szene wählbar; eingebaute Skizzen sofort nutzbar (Dorfplatz 16×12, Halle 10×10, Keller 6×6, Turmstube 6×6, Gegend ohne Raster).
- C2 Raster ein/aus, korrekt ausgerichtet bei Skizzen und eigenen Bildern.
- C3 Nebel: Pinsel aufdecken/verdecken (weicher Rand), Rechteck/Raum (Shift = verdecken), alles verdecken/aufdecken, Nebel-Rückgängig. Start = alles verdeckt. Nebel bleibt nach Neuladen.
- C4 Figuren: Heldinnen (grüner Ring), Gegner (roter Ring + Nummer), Verbündete (Glut-Ring), DM-Marker (Falle/Truhe/Geheimnis). Setzen per Klick, Ziehen rastet aufs Feld, "Alle Heldinnen setzen", "Kampf-Gegner setzen", Größe 1/2/3, versteckt-Schalter, Zustandspunkte, Entfernen (zweimal tippen). Bleiben nach Neuladen.
- C5 Kampfkopplung: Figur mit 0 TP im Kampf wird grau mit X (Heldin und Gegner), Zuordnung über Name ("Zweigling 2").
- C6 Lineal: Felder/Meter/ft, Variante 5-10-5, Vergleich mit gewählter Bewegungsrate (Felder, schwieriges Gelände halb, Spurt doppelt, Aufstehen halb).
- C7 Ping: erscheint am Beamer als wachsende Ringe ~1,6 s.
- C8 Vorschau "Spielersicht" = exakt Beamer-Bild (kein DM-Layer, Nebel deckend).
- C9 Zoom (Knöpfe, Strg+Mausrad, Einpassen), Scrollen, Touch/Stift (pointer events).
- C10 Info-Zeile: Bildgröße, Felder, px/Feld, px/Feld am Beamer.
- C11 Leistung: Karte 2560×1440 und Dorfplatz 2500×1855 flüssig beim Nebelpinsel.

### D. Karten und Bilder (Vorbereiten)
- D1 Eigene Karte (PNG/JPG/WebP) je Szene hochladen: ersetzt Skizze oder als neue Karte hinzufügen; Vorschaubild.
- D2 Kalibrierung: Spalten, Reihen, px/Feld, Versatz x/y; Live-Urteil (scharf/gut/zu klein), empfohlene Bildgröße nach Regel, Feldgröße am Beamer.
- D3 Mehrere Karten pro Szene (erste startet). Stimmungsbild je Szene (Warnung wenn nicht 16:9). Beamer-Start je Szene (auto/Karte/Bild/Titel).
- D4 Bilder liegen in IndexedDB, überleben Neuladen.
- D5 Tabelle Maße + Bewegung (aus `HEROES`/`MON` Tempo) korrekt: Dorfplatz 2240×1680 -> 90 px/Feld am Beamer, Halle 1400² -> 108, Keller/Turm 1080² -> 180.

### E. Szenen starten
- E1 Knopf "Szene starten" (im Szenenkopf): Szene wechseln, Musik+Atmosphäre der Szene, Karte laden, Beamer-Modus setzen — in einem Klick, auch wenn Beamer noch zu (dann Hinweis).
- E2 Szenenkopf zeigt Karte/Bild/Ton der Szene. "Karte zeigen"/"Bild zeigen".
- E3 Handouts: "Auf Beamer zeigen" <-> "Zurück zur Karte".
- E4 Kampfstart schaltet Kampfmusik (falls gesetzt), Ende zurück.

### F. Sound
- F1 "Ton aktivieren" bis AudioContext läuft; jede Geste setzt ihn fort.
- F2 Musik: 1 Spur, Schleife, 3 s Überblendung, Wechsel ohne Knacken/Doppelspiel (auch bei schnellem Doppelklick).
- F3 Atmosphäre: bis 3 Schleifen, eigene Lautstärke, 2 s Fade. Effekte: 9 Slots, Tasten 1–9.
- F4 Ducking beim Vorlesen (Knopf/D), Auto-Aus nach 3 min.
- F5 Panik "Alles ausblenden": 2 s Fade auf Stille, danach alles gestoppt, Master wieder normal.
- F6 Bibliothek: Dateien (MP3/OGG/WAV/M4A) per Dialog + Drag&Drop, als Musik/Atmo/Effekt, Probehören, Löschen (zweimal tippen), Zuordnung je Szene (Musik, Kampfmusik, 3 Atmo, 9 Effekte). Bleiben nach Neuladen.
- F7 Ereignis-Töne: Kampf Start/Ende, Laterne flackert/erlischt, Welle 2, Heldin 0 TP, Natürliche 20.
- F8 Eingebaute synthetische Klänge klingen brauchbar; **bewerten, ggf. verbessern** (aktuell einfache Oszillator-/Rauschsynthese, Klangteppiche sind schwach).
- F9 Lautstärke/Stumm global, Pegel nicht übersteuernd.

### G. Export/Import
- G1 Ein Klick -> eine JSON: Einstellungen, Karten-Modelle, Szenenzuordnung, alle Bilder/Töne. Import auf frischem Browserprofil stellt alles her (inkl. Medien) ohne Überschreiben durch alten Zustand (`NOSAVE`-Flag beim Reload).
- G2 Große Projekte (> 100 MB) funktionieren oder melden verständlich.

## Bekannte Risiken / zuerst prüfen
1. `window.open` + `document.write` aus `file://`: Popup-Blocker, Edge-Verhalten, `window.opener`/`postMessage` mit Ursprung "null". Fallback erwägen (BroadcastChannel nicht implementiert; ggf. Beamer als eigene URL-Hash-Seite `#beamer` derselben Datei + BroadcastChannel/localStorage-Events).
2. `localStorage`-Quote: Nebel-Op-Listen wachsen (Pinselpunkte). Falls voll -> Fehler verschluckt. Nebel zusammenfassen/komprimieren oder in IndexedDB speichern.
3. `evDrawMap`/`evBuildFog` werden per `toString()` ins Beamer-Fenster kopiert -> dürfen keine Außenvariablen nutzen. Bei Änderungen daran wach bleiben.
4. Schriften im Canvas: Figuren-Buchstaben nutzen Cinzel; vor erstem Zeichnen `document.fonts` laden, sonst Fallback-Schrift.
5. Eingebaute Karten werden per SVG->Image gerastert; Schrift dort nur Georgia (Systemschrift).
6. Chrome Autoplay: Musik darf erst nach Geste starten; `playMusic` bei suspendiertem Kontext prüfen.
7. v5-Karten-Ansicht ("Karten") und neue VTT doppeln sich. Entscheiden: behalten als Druck-/Übersichtsansicht oder entfernen.
8. Mobil: Tonleiste belegt viel Platz (2 Reihen).
9. Kerzenlicht-Thema: Kontraste nochmal mit Prüfwerkzeug messen (AA).
10. Szenen-Kartenzuordnung teils geraten (siehe `ref/scenes-and-media.md`, mit "?" markiert).

## Nicht ändern
- Abenteuertexte und Regelwerte aus v5.
- Farbrollen: Waldgrün = primär, Weinrot = nur Gefahr/Gegner, Glutorange = nur Licht/Feuer/Laterne, Gold = Zierde, **kein Blau**.
- Schrift-Stack und Ornament-Look (Leder + Pergament + Goldecken).

## Abnahme
Lu startet Datei per Doppelklick, öffnet Beamer, spielt Szene 1 (Herbstfest) komplett: Szene starten -> Nebel aufdecken -> Figuren -> Kampf starten -> Initiative -> Welle 2 -> Kampf Ende -> Handout -> Pause-Bild. Alles ohne Konsolenfehler, Beamer zeigt nie DM-Infos, Neuladen verliert nichts, Export/Import rund.
