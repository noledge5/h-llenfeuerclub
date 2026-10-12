# Roadmap und Entscheidungen

Aufgabe laut `HANDOFF_ClaudeCode.md`: Datei real testen, Kaputtes finden, fixen, Anforderungen A bis G abhaken. Der Look bleibt unverändert.

## Entscheidungen

| Entscheidung | Warum |
|---|---|
| **Beamer = dieselbe Datei mit `#beamer`** (`window.open('', 'eulenbach-beamer')`, dann `location = …#beamer`). Vorher: leeres Fenster, mit `document.write` gefüllt. | Nach dem Neuladen einer `file://`-Seite hat sie eine neue „Herkunft“ (origin). Das alte Beamer-Fenster ist dann für sie fremd: `PW.__evPlayer` warf `SecurityError`, der Knopf „Beamer“ tat nichts, und ein neu geladener Beamer war leer (`about:blank`). Mit einer echten URL überlebt das Fenster jedes Neuladen. |
| **Nur Nachrichten, keine Fenster-Eigenschaften.** Der Beamer sendet alle 2 s `alive` mit der Kennung der DM-Seite, die er zuletzt gehört hat. Kennt der DM ihn nicht (Neuladen auf einer Seite), schickt er alles neu. | Verbindet sich nach Neuladen von selbst wieder (B5). Zustand und Bilder kommen vollständig nach. |
| Auf der Beamer-Seite läuft nichts vom DM-Code (frühes `return` am Anfang des v5-Skripts, `build.py` patcht das). | Sonst würde das Beamer-Fenster beim Schließen den DM-Zustand mit alten Werten überschreiben. |
| **Skizzen:** Raster und Rahmen nicht mehr ins Bild brennen, Farb-Variablen auflösen, Schrift EB Garamond einbetten. | Sonst: schwarzer Balken an den Türöffnungen, „Raster aus“ ohne Wirkung, doppelte Linien. |
| **Markierungen der Skizzen (G, S, O, F, P, Z, R …) gehören zur DM-Ebene.** Für die Spielerinnen übernehmen die Figuren des Spieltischs. | Sonst stehen Gegner-Markierungen fest im Bild, und gesetzte Figuren doppeln sie. **Offen für Lu:** Wenn die Spielerinnen sie sehen sollen, ist es eine Zeile in `src/m1_store.js` (Markierungs-Gruppen nicht als `dm` kennzeichnen). |
| Nebel: jeder Eingriff ist ein Schritt (auch „Alles verdecken“/„aufdecken“), Rückgängig geht über alle. Ältere Schritte vor dem vorletzten „alles“ fallen weg. | „Alles verdecken“ löschte vorher die ganze Arbeit ohne Rückweg. Die gespeicherte Liste bleibt kurz. |
| Figuren auch auf Karten ohne Raster (virtuelle Felder, Bildbreite ÷ 16). Das Lineal sagt dort klar, dass es nichts messen kann. | Szenen 0, 2, 3 nutzen „Die Gegend“ ohne Raster; vorher ließ sich dort nichts setzen. |
| Lineal rastet auf Feldmitten. | Frei gesetzte Endpunkte rundeten falsch (4 diagonal in 5-10-5 ergab 5 statt 6 Felder). |
| Ton: weicher Begrenzer (tanh) am Master. Effekte-Bus 0,75. Klangteppiche neu: Akkordfolge, Zupfnoten, Echo, Nachhall, im Kampf ein Herzschlag-Puls. | Effekte erreichten Pegel 1,04 (Übersteuern). Die alten Teppiche waren ein einzelner stehender Akkord. |
| Panik-Knopf stoppt nach der Ausblendung alles und stellt erst dann den Master zurück. | Vorher war die noch ausklingende Atmosphäre wieder laut zu hören. |
| Export baut die Datei aus Blob-Teilen, Import prüft Größe und rollt bei Fehlern zurück; `NOSAVE` gilt erst direkt vor dem Neuladen. | Über 100 MB geht. Ab etwa 350 MB Medien kommt eine verständliche Meldung statt eines Absturzes. Ein gescheiterter Import hat vorher das Speichern der Seite dauerhaft abgeschaltet. |
| Kontrast AA: `--ink-muted`, `--gold-ink`, `--forest` im Standard-Thema etwas dunkler, im Kerzenlicht `--ink-muted` heller und grüner Text in `--forest-bright`. | Gemessen auf dem echten Bild (`tests/contrast.cjs`). Die Farbrollen bleiben, nur die Helligkeit ändert sich. |
| **Die v5-Ansicht „Karten“ bleibt** als Druck- und Übersichtsansicht (Risiko 7 im Handoff). | Sie enthält die Spielerinnen-Ansicht und Vollbild für Papier oder Fernseher; nichts doppelt sich mehr, seit die Skizzen im Spieltisch aus denselben SVGs kommen. |

## Behobene Fehler (gefunden beim Durchspielen)

1. DM neu geladen → Beamer nicht mehr erreichbar, Knopf ohne Wirkung. Beamer neu geladen → leere Seite.
2. Skizze Keller/Turm/Halle: schwarzer Balken an den Türöffnungen.
3. „Raster aus“ wirkte bei den Skizzen nicht; bei „Raster an“ lagen zwei Raster übereinander.
4. Nebelstrich sah nach dem Neuladen minimal anders aus als beim Malen.
5. „Alles verdecken“ löschte die Nebel-Arbeit ohne Rückgängig.
6. Raum-Rechteck deckte von Feldmitte zu Feldmitte nur 2×2 statt 3×3 Felder auf.
7. Lineal: falsche Felderzahl bei freien Endpunkten (5-10-5).
8. Karte „Die Gegend“ (ohne Raster): keine Figuren möglich.
9. „Szene starten“ blieb auf der letzten Karte der Szene statt der ersten; die Kartenliste zeigte eine andere Karte als das Bild; nach dem Neuladen sprang die Karte zurück.
10. Beamer: Stimmungsbild konnte nach dem Bild-Eintreffen im Standardbild hängen bleiben; Schrift in den Medaillons erst beim zweiten Zeichnen; „AM ZUG“ ragte aus der Kampfleiste; Kampfleiste lag über Pause und Handout.
11. Panik-Knopf: Atmosphäre kam nach der Ausblendung zurück.
12. Effekte und Szenenton übersteuerten.
13. Ein Klick auf die Ablagefläche öffnete den Datei-Dialog zweimal; eine daneben fallen gelassene Datei hätte die Seite verlassen.
14. Atmosphäre-Plätze rutschten zusammen (Spur 2 wurde Spur 1).
15. Export: sehr große Projekte stürzten ab; Import: bei Fehler blieb das Speichern abgeschaltet.
16. Spieltisch auf Handy und iPad hochkant 932 px breit (Werkzeugleiste lief über), ebenso „Wissen“ und „Vorbereiten“ auf dem Handy.
17. Kontrast unter AA an mehreren Stellen (Standard und Kerzenlicht), aktiver Reiter im Kerzenlicht kaum lesbar.

## Von Hand zu prüfen (geht in der Cloud nicht)

- Chrome **und** Edge mit `file://`-Doppelklick, echter zweiter Monitor oder Beamer: Fenster hinüberziehen, F für Vollbild, Cursor verschwindet nach 2,5 s.
- Echte Lautsprecher: klingen die neuen Klangteppiche und Effekte gut? Das ist Geschmack, gemessen sind nur Pegel (kein Übersteuern, keine Lücken).
- Pop-up-Blocker im echten Browser: erscheint der Hinweis, und klappt der zweite Klick nach dem Erlauben?
- Spieltisch mit dem Finger und dem Stift auf dem iPad (die Ereignisse sind getestet, das Gefühl nicht).
- Ein kompletter Abend nach der Abnahme im Handoff: Szene 1 (Herbstfest) von „Szene starten“ bis Pause-Bild.

## Anforderungen und Tests

Die Tests liegen in `tests/cases/` und laufen mit `npm test`. Sie prüfen die Datei in Chromium (Playwright), in der Cloud mit Pegelmesser am Audio-Ausgang.

| Anforderung | Test |
|---|---|
| A1, A2 Start, Reiter | `00-start`, `70-scene-keys` |
| A3 v5-Funktionen (Kampf, Welle 2, Würfel) | `70-scene-keys`, `30-vtt` |
| A4 Responsive, AA, Fokusring, reduced motion, Touch/Stift | `80-a11y` |
| A5 Tasten, A6 Kopfleiste | `70-scene-keys` |
| B1 bis B8 Beamer | `10-beamer`, `20-maps`, `30-vtt`, `70-scene-keys` |
| C1 bis C11 Spieltisch | `20-maps`, `30-vtt`, `31-vtt-scenes` |
| D1 bis D5 Karten und Bilder | `60-prep` |
| E1 bis E4 Szene starten | `70-scene-keys` |
| F1 bis F9 Sound | `40-sound`, `70-scene-keys` |
| G1, G2 Export/Import | `50-export` |

## Nächste Schritte (nicht Teil dieses Auftrags)

- **Unterlagen für die Spielerinnen** (Vorschlag, wartet auf Zustimmung): zwei Seiten „So funktioniert D&D“ in einfachem Deutsch und fünf einseitige Heldinnen-Bögen aus den vorhandenen Werten (`HEROES`), als neuer Reiter „Drucken“ (A4, schwarz-weiß tauglich). Eigene Texte, weil die offiziellen 2024er-Bögen englisch und nicht ausfüllbar sind und die kostenlosen 2024-Regeln nur auf Englisch vorliegen.
- Beschriftungen der Skizzen mit Spoiler-Charakter (z. B. „Falltür“ in Halle und Keller) prüfen: sie stehen im Bild und werden sichtbar, sobald der Nebel dort offen ist.
