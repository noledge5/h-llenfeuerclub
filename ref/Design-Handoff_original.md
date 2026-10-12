# Design-Handoff: Eulenbach DM-Helfer 2.0
**DM-Werkzeug, virtueller Spieltisch und Soundboard in einer Offline-HTML-Datei**

Stand: 10.10.2026 · Referenz: `eulenbach_dm_helfer_v5.html` (aktueller Funktionsstand, Quelle aller Inhalte)

---

## 1. Worum es geht

Ein Lehrer leitet als Dungeon Master (DM) D&D für 5 Schülerinnen (13–15 Jahre) einer Realschule, in Sitzungen von 60–80 Minuten. Er hat einen Laptop vor sich, dazu einen Beamer oder Fernseher für die Gruppe. Gespielt wird das eigene Abenteuer **„Die Laterne von Eulenbach“** (Kapitel 1, D&D-Regeln 2024, Stufe 1).

Der bestehende DM-Helfer funktioniert, soll aber **neu gestaltet und erweitert** werden:

1. **DM-Ansicht** auf dem Laptop: Szenen leiten, Kampf führen, nachschlagen. Das gibt es schon, es wird verfeinert.
2. **Spielerinnen-Ansicht (VTT)** für den Beamer: Karte mit Raster, Spielmarken, Nebel des Krieges, Stimmungsbilder, Handouts und Initiativeleiste. Gesteuert wird sie aus der DM-Ansicht.
3. **Soundboard**: Musik, Atmosphäre und Effekte. Die Klänge lädt der DM selbst hoch und ordnet sie den Szenen zu. Beim Szenenwechsel blenden sie automatisch über.

**Ergebnis:** Eine einzelne HTML-Datei, die offline per Doppelklick in Chrome oder Edge läuft. Sie braucht keinen Server und kein Konto.

---

## 2. Nutzung am Tisch

| Situation | Gerät | Was zu sehen ist |
|---|---|---|
| Vorbereitung zu Hause | Laptop oder Desktop | Vorbereiten, Wissen, Sound-Bibliothek, Karten einrichten |
| Während des Spiels | Laptop (DM, 1366–1920 px) | Szene, Kampf, Soundboard, VTT-Steuerung |
| Für die Gruppe | Beamer oder TV (1920×1080), zweites Fenster | Karte, Stimmungsbild, Handout, Initiativeleiste |
| Unterwegs | Tablet oder Handy | Nur lesen und Kampf (vereinfacht, eine Spalte) |

Licht im Raum ist oft gedimmt. Die DM-Ansicht braucht deshalb einen angenehmen dunklen Modus, die Beamer-Ansicht hohen Kontrast.

---

## 3. Informationsarchitektur

### DM-Fenster: Hauptnavigation links

1. **Spielen** (Standard): Szene links, Spieltisch-Dock rechts. Unten ein dauerhafter **Audio-Streifen**.
2. **Spieltisch (VTT)**: Karte bearbeiten und steuern, das heißt Nebel aufdecken, Marken bewegen und an die Spielerinnen senden.
3. **Sound**: Bibliothek, Mischpult, Zuordnung von Klängen zu Szenen.
4. **Heldinnen**: 5 Vorlagen mit Inventar.
5. **Wissen**: Hintergrund, Personen, Regeln, durchsuchbar.
6. **Vorbereiten**: Checkliste, Ablauf, Tischregeln, Medien einrichten, Sicherung exportieren und importieren.

**Kopfleiste, immer sichtbar:** Titel, aktuelle Szene, Sitzungszeit, Kampf-Chip (Runde und wer am Zug ist), Würfel, Status des Spielerinnen-Fensters (verbunden ja/nein, „Öffnen“), Lautstärke gesamt und Stummschalter.

### Spielerinnen-Fenster (zweites Browserfenster, auf dem Beamer im Vollbild)

Es hat keine Bedienelemente und folgt nur der DM. Es kennt vier **Bühnen-Modi**, zwischen denen der DM umschaltet:

1. **Karte**: Karte mit Raster, Nebel, Marken, Zeigepunkten und Linealanzeige.
2. **Stimmungsbild**: Vollbildbild mit optionalem Titel, zum Beispiel „Eulenbach, am Abend des Herbstfests“.
3. **Handout**: Rätsel oder Tagebuch in großer, lesbarer Schrift.
4. **Pause/Titel**: Titelbild „Die Laterne von Eulenbach“, für Pausen und den Beginn.

Dazu kommen zwei Überlagerungen, die der DM einzeln ein- und ausschaltet:
- **Initiativeleiste** oben: Namen in Reihenfolge, wer am Zug ist, TP der Heldinnen als Balken, TP der Gegner nur als Zustandswort („unverletzt“, „angeschlagen“, „schwer verletzt“).
- **Würfelwurf groß**: Ergebnis kurz einblenden, wenn der DM einen Wurf „zeigt“.

---

## 4. Bildschirme im Detail

### 4.1 Spielen (DM)

Funktioniert heute schon und soll erhalten bleiben. Gewünscht ist, dass es schöner, ruhiger und klarer wird.

- **Szenenleiste** mit Sitzungs-Gruppen (Sitzung 1: Heldinnen, 1 Herbstfest, 2 Spuren · Sitzung 2: 3 Wald, 4 Wachturm · Sitzung 3: 5 Snirk, 6 Turmstube, 7 Finale, Ausklang). Aktuelle Szene hervorgehoben, erledigte gedämpft.
- **Szeneninhalt** in festen Bausteinen, die visuell klar unterscheidbar sein müssen:
  - *Vorlesen*: das wichtigste Element. Ruhig, groß, gut aus 60 cm Abstand lesbar.
  - *Was passiert / Würfe*: Zeilen mit SG-Abzeichen rechts, zum Beispiel „Wahrnehmung SG 12“.
  - *Hinweise abhaken*: Checkliste, die sich speichert.
  - *Kampf-Callout* mit „Kampf starten“.
  - *Handout* (zum Vorlesen oder Zeigen) mit Knopf **„Auf Beamer zeigen“**.
  - *Spotlight*: welche Heldin hier glänzen kann (Chips).
  - *Cliffhanger* am Sitzungsende.
- **Neu: Szenen-Kopf mit Medien.** Jede Szene zeigt, welche Karte, welches Stimmungsbild und welche Klangkulisse zu ihr gehören. Ein Knopf **„Szene starten“** stellt alles auf einmal ein: Sound überblenden, Bühne der Spielerinnen umschalten. Das soll sich wie ein Theaterpult anfühlen.
- **Spieltisch-Dock** rechts mit den Reitern Kampf, Gegner, Würfel und Ideen. Die Funktionen siehe Abschnitt 6.

### 4.2 Spieltisch / VTT (DM)

- Große Kartenfläche, zoombar und verschiebbar.
- **Werkzeugleiste:**
  - Auswählen und Bewegen
  - Nebel aufdecken (Pinsel, Rechteck, Raum)
  - Nebel verdecken
  - Lineal (zeigt Meter und Felder, 1 Feld = 1,5 m)
  - Zeigepunkt („Ping“, erscheint als kurzer Puls auch auf dem Beamer)
  - Marke hinzufügen
- **Kartenbibliothek:** Bild hochladen (PNG, JPG, WebP, gedacht für die eigenen Ideogram-Karten), Raster kalibrieren (Felder breit und hoch eintragen, Versatz verschieben), Raster ein- oder ausblenden.
- **Vorhandene Karten:** Dorfplatz (16×12), Halle (10×10), Keller (6×6), Turmstube (6×6), Gegend (ohne Raster). Die heutigen SVG-Karten dienen als Platzhalter, solange kein Bild hochgeladen ist.
- **Spielmarken:**
  - Heldinnen: farbiger Rand, Initial oder Bild.
  - Gegner: roter Rand, Nummer.
  - Verbündete: Glut-Rand.
  - Marken lassen sich verstecken (nur für den DM sichtbar), und Zustände erscheinen als kleine Punkte.
- **Kampf-Kopplung:** Marken sind mit den Einträgen in der Initiative verknüpft. Fällt eine Figur auf 0 TP, wird ihre Marke grau.
- **Vorschau:** „Was die Spielerinnen sehen“ als kleines Bild in der Ecke. Daneben **„Senden: automatisch / manuell“**, damit der DM vorbereiten kann, ohne dass der Beamer jeden Zwischenschritt zeigt.
- **DM-Ebene:** Geheimnisse (Fallen, Gegnerpositionen, Truhe) sieht nur der DM.

### 4.3 Sound (DM)

Siehe Abschnitt 5. Dieser Bildschirm braucht drei Bereiche:
1. **Bibliothek:** alle hochgeladenen Klänge mit Tags (Musik, Atmosphäre, Effekt), Dauer, Vorhören, Umbenennen, Löschen.
2. **Szenen-Zuordnung:** eine Zeile pro Szene. Darin stehen ein Musikstück, bis zu 3 Atmosphären mit eigener Lautstärke und das Effekt-Set für diese Szene. Per Drag-and-drop aus der Bibliothek.
3. **Mischpult:** Regler für Musik, Atmosphäre, Effekte und Gesamt. Dazu „Ducking“: Bei „Vorlesen“ wird die Musik leiser.

### 4.4 Heldinnen, Wissen, Vorbereiten

Inhalte wie in v5. Gewünscht ist nur eine bessere Gestaltung:
- **Heldinnen:** Charakterkarten mit Werten, Angriffen, Fähigkeiten (aufklappbar) und Inventar als Chips. Nicht als Bogen-Kopie, sondern übersichtlich für Einsteigerinnen.
- **Wissen:** Kartenraster mit Suche. Zeitstrahl, Personen mit Stimmtipp, Hinweis-Tabelle, Regeln, Zustände, Abenteuerschule.
- **Vorbereiten:** Checkliste, Tischregeln, Ablauf, **Medien-Einrichtung** (Karten und Sounds pro Szene, mit Fortschrittsanzeige „4 von 9 Szenen vertont“) und **Sicherung**: Export und Import des gesamten Projekts als eine Datei.

---

## 5. Soundsystem (Spezifikation)

### Kanäle
| Kanal | Verhalten | Beispiele |
|---|---|---|
| **Musik** | 1 Stück gleichzeitig, Schleife, Überblenden (Standard 3 s) | Festmusik, Spannung, Kampf, ruhiger Ausklang |
| **Atmosphäre** | bis zu 3 Schleifen gleichzeitig, jede mit eigener Lautstärke | Menschenmenge, Feuerknistern, Wind, Tropfen |
| **Effekte** | einmalig, mehrere gleichzeitig möglich, Raster aus 8–12 Feldern | Holz knackt, Tor splittert, Flamme „puff“, Eulenruf |

### Pro Szene (Phase)
- **Standardkulisse:** Musik plus Atmosphären, startet mit „Szene starten“ oder automatisch beim Szenenwechsel (abschaltbar).
- **Kampf-Variante:** „Kampf starten“ blendet zur Kampfmusik über, „Kampf beenden“ zurück zur Szenenkulisse.
- **Effekt-Set:** die Effekte, die in dieser Szene im Effektraster erscheinen. Tasten 1–9 lösen sie aus.
- **Ereignis-Klänge** (optional zuordenbar):

| Ereignis | Klang |
|---|---|
| Laterne flackert | kurzes Zischen |
| Laterne erlischt | tiefer Ton |
| Welle 2 kommt | Knacken |
| Heldin fällt auf 0 TP | dumpfer Schlag |
| Natürliche 20 | Fanfare |

### Vorschlag für die Klänge pro Szene
| Szene | Musik | Atmosphäre | Effekte |
|---|---|---|---|
| Heldinnen / Anreise | leicht, abenteuerlich | Waldweg am Tag, Vögel | – |
| 1 Herbstfest | Volksmusik/Fiedel → Kampf: Spannung | Menschenmenge, Feuer | Holz knackt, Kinder rufen, Flamme „puff“ |
| 2 Spuren | leise, geheimnisvoll | Nacht, Feuerring, leichter Wind | Eulenruf, fernes Knacken |
| 3 Wald | ruhig, Morgen | Tropfen, Bach-Rinnsal, Vögel | Ast bricht, Schlinge schnappt |
| 4 Wachturm | angespannt | Wind am Hügel, Nebel-Brummen | Tür knarrt, Steine rutschen |
| 4 Keller | – | Tropfen, Holzknarzen | Zweigling erwacht |
| 5 Snirk | warm, verletzlich | Feuer knistert leise, Goblin-Gemurmel | – |
| 6 Turmstube | magisch, staunend | Staub, Wind am Fenster | Stein knirscht (Eulentür), Seite umblättern |
| 7 Finale | Bosskampf | Sturm, Holz knarzt | Tor splittert, Rankenschlag, Laterne flackert |
| Ausklang | warm, triumphal | Dorfabend, Feuer | Glocke |

### Upload und Speicherung
- Klänge per Drag-and-drop oder Dateiauswahl hochladen (MP3, OGG, WAV, M4A).
- **Speicherung im Browser (IndexedDB als Blob)**, damit Uploads nach einem Neuladen noch da sind. Speicherplatz-Anzeige.
- **Sicherung exportieren und importieren:** eine Projektdatei mit allen Einstellungen, Karten und Klängen. So kommt alles auf einen anderen Rechner, zum Beispiel vom Heim-PC auf den Schul-Laptop.
- Hinweis im Bildschirm: Browser spielen Ton erst nach einem Klick ab. Deshalb gibt es zu Sitzungsbeginn einen sichtbaren Knopf **„Ton aktivieren“**.

### Audio-Streifen (unten, in der Spielen-Ansicht immer sichtbar)
Aktuelles Musikstück mit Fortschritt, aktive Atmosphären als kleine Chips mit Mini-Regler, Effektraster (aufklappbar), Gesamtlautstärke, „Alles ausblenden“ (Panik-Knopf mit 2 s Fade).

---

## 6. Abläufe, die sich gut anfühlen müssen

1. **Sitzung beginnen:** „Ton aktivieren“ → Spielerinnen-Fenster öffnen und auf den Beamer ziehen → Titelbild läuft → „Szene starten“.
2. **Szene wechseln:** „Weiter“ → Klangkulisse blendet über → der Beamer zeigt das Stimmungsbild der Szene → der DM liest vor → ein Klick wechselt auf die Karte.
3. **Kampf starten** (aus der Szene): Gegner mit Initiative und Heldinnen werden eingetragen, auf der Karte erscheinen die Marken an ihren Startpositionen, Kampfmusik blendet ein, der Beamer zeigt die Initiativeleiste. Die Spielerinnen würfeln selbst, der DM trägt die Zahlen ein, die Reihenfolge sortiert sich.
4. **Im Kampf:** „Nächster Zug“ (Taste N), Schaden oder Heilung per Zahl, Zustände antippen, Gegnerangriff mit einem Klick würfeln (optional mit „auf Beamer zeigen“), Rückgängig. Hinweise erscheinen zum richtigen Zeitpunkt: „Welle 2 in Runde 3“, im Finale am Rundenende „Flackert die Laterne?“.
5. **Nebel aufdecken:** Die Gruppe betritt einen Raum, der DM wischt mit dem Pinsel, und der Beamer deckt mit weichem Übergang auf.
6. **Handout zeigen:** Knopf am Handout → der Beamer zeigt Rätsel oder Tagebuch groß. Ein zweiter Klick wechselt zurück zur Karte.
7. **Sitzung beenden:** Cliffhanger vorlesen → Ausklang-Musik → Titelbild.

---

## 7. Designrichtung

### Bisherige Sprache, die bleiben soll
- **Farbe:** Dunkelgrün `#2D6A4F` als Akzent, Glut-Orange nur für Licht, Feuer und Laterne, Rot nur für Gefahr. **Kein Blau.** Flächen sparsam einsetzen.
- **Schrift:** Calibri (Webersatz Carlito). Die Hierarchie entsteht über Größe und Gewicht. Optional darf die Titelzeile der Beamer-Ansicht einen charaktervollen Zierschnitt bekommen, aber nur dort.

### Gewünschte Stimmung
„Laternenlicht im Nebelwald“: warm, freundlich, ein bisschen geheimnisvoll, nicht düster-gruselig, schließlich spielen 13-Jährige. Keine Klischee-Pergament-Optik in der DM-Ansicht, die bleibt ein klares Werkzeug. Die Beamer-Ansicht darf atmosphärischer sein: Vignette, sanfter Nebel-Schimmer am Rand, weiche Übergänge.

### Tokens (aus v5, bitte als Basis nehmen und verfeinern)
| Token | Hell | Dunkel |
|---|---|---|
| `--bg` | `#f2f4f1` | `#0f1712` |
| `--surface` | `#ffffff` | `#16211a` |
| `--surface-2` | `#e8ede9` | `#1d2b23` |
| `--fg` | `#17231b` | `#e4ece6` |
| `--muted` | `#5a6a60` | `#9db1a5` |
| `--line` | `#d3ddd6` | `#2a3a31` |
| `--accent` | `#2D6A4F` | `#74c69d` |
| `--accent-soft` | `#dcebe2` | `#1f3a2d` |
| `--ember` | `#b4641c` | `#e2a052` |
| `--danger` | `#a4262c` | `#e57b80` |

Die Beamer-Ansicht bekommt ein eigenes, kontrastreicheres Dunkel-Set.

### Komponenten
Kopfleiste, Seitennavigation, Szenenleiste, Vorlese-Block, Wurf-Zeile mit SG-Abzeichen, Hinweis-Checkliste, Callouts (Kampf, Cliffhanger, Tipp), Handout-Karte, Spieltisch-Dock mit Reitern, Kampfteilnehmer-Zeile (aufklappbar: Schaden/Heilung, Zustands-Chips, Todesrettungswürfe, Gegnerangriffe), Laternen-Anzeige (3–4 Flammen), Würfelfeld, Audio-Streifen, Mischpult-Regler, Effekt-Feld, Kartenwerkzeugleiste, Spielmarke, Initiativeleiste (Beamer), Toast, leere Zustände, Bestätigung durch zweites Tippen statt Dialogfenster.

### Bewegung
Gezielt und kurz (150–250 ms), dazu Überblenden auf dem Beamer (Nebel aufdecken, Moduswechsel 600–800 ms). Die Laternenflammen flackern sanft. `prefers-reduced-motion` respektieren.

---

## 8. Responsiv und barrierefrei

- **DM-Ansicht:** ab 1100 px zwei Spalten (Szene und Dock), darunter eine Spalte mit Umschalter „Szene / Spieltisch“. Ab 900 px Navigation links, darunter unten.
- **Die VTT-Bearbeitung** ist nur ab etwa 1000 px sinnvoll. Darunter gibt es nur die Vorschau mit Grundfunktionen (Ping, Bühnenmodus wechseln).
- **Beamer-Ansicht:** füllt 16:9, ohne Scrollen, alle Texte aus 4–5 m lesbar (Handout mindestens 40 px).
- **Tastatur:**

| Taste | Funktion |
|---|---|
| N | nächster Zug |
| 1–9 | Effekte |
| M | Musik an/aus |
| F | Beamer: Karte/Bild |
| Esc | Werkzeug abwählen |

  Sichtbarer Fokus, Kontraste nach WCAG AA, Klickflächen mindestens 40 px.

---

## 9. Technische Leitplanken (für die spätere Umsetzung)

- **Eine HTML-Datei**, offline lauffähig, ohne Build-Schritt. Kein Framework nötig; wenn doch, als eingebettetes Skript. Schrift: Systemschrift Calibri, Carlito eingebettet oder als Fallback.
- **Audio:** Web Audio API mit Gain-Knoten pro Kanal für Überblenden und Ducking. Uploads werden als Blob in IndexedDB gespeichert und über Objekt-URLs abgespielt.
- **Spielerinnen-Fenster:** wird per `window.open` aus der DM-Ansicht geöffnet. Die Synchronisation läuft über `postMessage`, als Rückfallebene über `BroadcastChannel`. Der Zustand wird immer komplett gesendet, nicht als Unterschied, damit ein neu geöffnetes Fenster sofort stimmt.
- **Karten:** Canvas für Karte, Nebel (Maske) und Marken, eine eigene Ebene pro Funktion.
- **Speicherung:** Einstellungen, Fortschritt, Kampf und Inventar in localStorage. Medien in IndexedDB. Export als eine Datei (JSON mit Base64-Medien, oder ZIP).
- **Inhalte** (Szenen, Gegner, Heldinnen, Wissen) liegen als Datenobjekte im Skript, siehe `eulenbach_dm_helfer_v5.html`. Die Texte dort sind abgestimmt und sollen inhaltlich **nicht** verändert werden.
- **Grenze:** Als Claude-Artifact im Browser sind Downloads und zweite Fenster eingeschränkt. Die volle Funktion gibt es als lokale Datei.

### Datenmodell (Skizze)
```json
{
  "scenes": [{ "id": "s1", "title": "Das Herbstfest", "session": 1, "minutes": 25,
    "map": "dorfplatz", "moodImage": "img_fest", "encounter": "fest",
    "sound": { "music": "snd_fest", "ambience": [["snd_crowd", 0.6], ["snd_fire", 0.4]],
               "combatMusic": "snd_tension", "sfx": ["snd_crack", "snd_puff", "snd_owl"] } }],
  "maps": [{ "id": "dorfplatz", "image": "img_map1", "cols": 16, "rows": 12, "offset": [0, 0],
    "fog": "<maske>", "tokens": [{ "ref": "hero:Kämpferin", "x": 5, "y": 9, "hidden": false }] }],
  "media": [{ "id": "snd_fest", "kind": "music", "name": "Festfiedel", "blobKey": "idb:…" }],
  "combat": { "round": 1, "turn": 0, "list": [], "lantern": { "max": 3, "out": 0 } }
}
```

---

## 10. Abnahmekriterien

- [ ] Alle Inhalte aus v5 sind vorhanden und unverändert lesbar.
- [ ] „Szene starten“ stellt Sound und Beamer-Bühne mit einem Klick ein.
- [ ] Eigene Klänge lassen sich hochladen, Szenen zuordnen und sind nach einem Neuladen noch da.
- [ ] Musik blendet beim Szenen- und Kampfwechsel ohne Knacken über, Effekte liegen auf den Tasten 1–9.
- [ ] Das Spielerinnen-Fenster zeigt Karte, Nebel, Marken, Initiative, Bild und Handout und folgt der DM ohne spürbare Verzögerung.
- [ ] Geheimes, also die DM-Ebene und versteckte Marken, erscheint nie auf dem Beamer.
- [ ] Eine eigene Karte lässt sich in unter 1 Minute hochladen und auf das Raster kalibrieren.
- [ ] Der Kampf läuft wie in v5: Vorlagen, Wellen-Hinweis, Laterne einmal pro Runde, Todesrettungswürfe, Rückgängig.
- [ ] Export und Import überträgt das gesamte Projekt auf einen anderen Rechner.
- [ ] Hell- und Dunkelmodus sind sauber, und der Beamer ist auch in einem halbdunklen Klassenraum lesbar.

## 11. Nicht-Ziele

- Kein Online-Mehrspieler, keine Konten, keine Cloud.
- Die Spielerinnen haben keine eigenen Geräte im Spiel, nur den Beamer.
- Keine automatische Regel-Engine für alle Klassen. Die Vorlagen bleiben vereinfacht.
- Keine eingebauten Musikdateien. Der DM lädt sie selbst hoch und achtet dabei auf die Lizenzen der Quellen.

---

## 12. Kurz-Prompt zum Einfügen in Claude Design

> Gestalte den „Eulenbach DM-Helfer 2.0“ nach dem beigefügten Design-Handoff, mit der HTML-Datei v5 als inhaltlicher Referenz. Ich brauche diese Bildschirme:
> 1. DM-Ansicht „Spielen“ (Szene, Spieltisch-Dock, Audio-Streifen unten) in Hell und Dunkel
> 2. DM-Ansicht „Spieltisch/VTT“ mit Kartenwerkzeugen und Beamer-Vorschau
> 3. „Sound“ mit Bibliothek, Szenen-Zuordnung und Mischpult
> 4. Spielerinnen-Fenster für den Beamer in den Modi Karte mit Initiativeleiste, Stimmungsbild, Handout und Titel
> 5. Heldinnen-Karte mit Inventar
>
> Designsprache: Dunkelgrün #2D6A4F, Glut-Orange nur für Licht und Feuer, Rot nur für Gefahr, kein Blau, Calibri/Carlito, sparsame Flächen. Stimmung: „Laternenlicht im Nebelwald“, warm und freundlich für 13-Jährige, nicht gruselig. Die DM-Ansicht ist ein klares Werkzeug, die Beamer-Ansicht darf atmosphärisch sein.
