# Eulenbach DM-Helfer

Spielleiter-Werkzeug für „Die Laterne von Eulenbach“ (D&D 2024, Stufe 1) als **eine HTML-Datei**: Spielhilfe, Spieltisch mit Nebel und Figuren, Soundboard und Beamer-Fenster. Läuft offline, kein Server, kein Konto.

## Benutzen
1. `Eulenbach_DM-Helfer_2.0.html` per Doppelklick in Chrome oder Edge öffnen.
2. Oben auf **Beamer** tippen: ein zweites Fenster öffnet sich. Auf den Beamer ziehen, dort **F** drücken (Vollbild).
3. Bei der Szene **Szene starten** tippen: Ton, Karte und Beamer stellen sich um.
4. Unter **Vorbereiten → Sichern und Übertragen** kannst du alles in einer Datei sichern und auf einem anderen Rechner wieder einspielen.

Schließt du das Beamer-Fenster oder lädst eine der Seiten neu, verbindet sich alles von selbst wieder (oder nochmal auf „Beamer“ tippen).

## Für Entwicklung
- `src/` Quellen, `python3 build.py` baut die Datei, `ref/` das Original v5 (Texte und Regeln bleiben unverändert).
- `npm ci`, dann `npm test` (Playwright, Chromium). `npm run check` baut und prüft die Syntax.
- Siehe `CLAUDE.md` (Regeln), `HANDOFF_ClaudeCode.md` (Anforderungen) und `docs/roadmap.md` (Entscheidungen und Stand).
