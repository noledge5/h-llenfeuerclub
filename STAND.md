# Stand: Eulenbach DM-Helfer
Zuletzt aktualisiert: 2026-10-15
HTML-Seite: keine

## Ziel
Eine einzelne HTML-Datei (offline, Doppelklick in Chrome/Edge) als DM-Helfer, Spieltisch, Soundboard und Beamer-Fenster
für das Abenteuer „Die Laterne von Eulenbach“ (D&D 2024, Stufe 1). Anforderungen A–G mit Abnahme: `HANDOFF_ClaudeCode.md`.

## Aktueller Stand
- `Eulenbach_DM-Helfer_2.0.html` gebaut; zuletzt (12.10.2026) die Funde des Reviews behoben und v5-Tests ergänzt.
- 15 beim Durchspielen gefundene Fehler behoben (Liste in `docs/roadmap.md`).
- 2026-10-15: Arbeitsweise von noledge5/based auf noledge5/hierarchie umgestellt (Skills, Worker, UTS, diese Datei).

## Offene Punkte
- Offen für die Spielleitung: Sollen die Spielerinnen die Markierungen der Skizzen sehen? Dann eine Zeile in `src/m1_store.js` (`docs/roadmap.md`).

## Entscheidungen
- Entscheidungen mit Begründung stehen in `docs/roadmap.md` (Beamer als `#beamer`-Seite, nur Nachrichten zwischen den Fenstern …).
- Abenteuertexte und Regelwerte aus `ref/eulenbach_dm_helfer_v5.html` bleiben unverändert.

## Nächste Schritte
1. Die Spielleitung entscheidet die Frage zu den Skizzen-Markierungen.

## Befunde
- Der Standard-Branch des Repos ist `claude/gifted-dirac-u824z0`, nicht `main`.
