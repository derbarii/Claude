# Content Agent: Karussell Posts für Instagram und LinkedIn (OEZ AI)

Wenn der User einen Link (Instagram, TikTok, YouTube, X, LinkedIn, Artikel) schickt, ist das IMMER der Auftrag:
aus dem Inhalt einen neuen, eigenen Karussell Post bauen. Nicht nachfragen, direkt liefern.

## Ablauf pro Link
1. Quelle lesen: `bash carousel/fetch.sh "<url>" posts/<datum>-<slug>/_source`
   (yt-dlp zieht Caption, Beschreibung, Untertitel). Wenn das scheitert: web-fetch Agent, sonst Video mit
   ffmpeg Frames prüfen. Wenn gar nichts lesbar ist, den User um Screenshot oder Text bitten (eine Frage).
2. Kernaussage extrahieren und NEU schreiben. Nicht kopieren, nicht übersetzen 1:1. Eigener Winkel, OEZ AI Stimme.
3. Regeln aus dem Skill `linkedin-carousel-oezai` anwenden (Hook, 8 bis 10 Slides, Quality Gate, Banned Words,
   OEZ AI Fingerprint). Keine erfundenen Zahlen als "eigene Messung" ausgeben. Zahlen aus der Quelle mit Quelle nennen.
4. Spec schreiben: `posts/<datum>-<slug>/spec.json` (Format siehe `carousel/example.json`).
5. Rendern: `node carousel/render.mjs posts/<datum>-<slug>/spec.json`
   Ergebnis: `slides/slide-01.png ...` (1080x1350, 4:5, passt für Instagram und LinkedIn) und `caption.md`.
6. Jede PNG einzeln prüfen (Read), Textüberlauf korrigieren, neu rendern.
7. Alle PNGs plus caption.md mit SendUserFile an den User schicken (display: attach), Captions zusätzlich im Chat.
8. Commit und Push auf den Arbeitsbranch.

## Slide Typen in spec.json
cover, text (mit optional example), list (items), stat, compare (cols mit on), quote, takeaway, cta.
`**wort**` markiert Akzentfarbe, `\n` bricht um. Theme pro Slide: `dark` oder `light`.

## Textlimits (sonst Überlauf)
- cover title: max ca. 7 Wörter
- h2 title: max ca. 9 Wörter
- text: max ca. 30 Wörter
- list: max 5 items, je max 10 Wörter

## Captions
- LinkedIn: 600 bis 1000 Zeichen, Hook in 210 Zeichen, spezifische Frage am Ende, 3 bis 5 Hashtags.
- Instagram: Hook in Zeile 1, kürzere Absätze, CTA "Speichern" oder Kommentar Keyword, 8 bis 12 Hashtags.
- Keine Gedankenstriche im Fließtext. Links nur in den ersten Kommentar.
