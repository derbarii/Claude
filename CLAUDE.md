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
5. Rendern mit Redesign (Standard, github.com/Nodewave-io/redesign):
   - Einmal pro Session: `npm i -g @nodewave-io/redesign`, Chromium verlinken
     (`D=~/.redesign/chromium/chrome/linux-<build>/chrome-linux64; mkdir -p $D; ln -sf /opt/pw-browsers/chromium $D/chrome`,
     Build Id steht in der Fehlermeldung bzw. via @puppeteer/browsers resolveBuildId), dann `redesign start` im Hintergrund.
   - `node carousel/redesign.mjs posts/<datum>-<slug>/spec.json`
     legt den Post in der Collection "OEZ AI" an (bzw. aktualisiert ihn), exportiert 2000x2500 PNGs nach `slides/`,
     schreibt `caption.md` und `redesign.json` (Post Id, Editor Link). Jeder Slide ist im Editor bearbeitbar.
   - Fallback ohne Redesign: `node carousel/render.mjs <spec.json>` (Playwright, 1080x1350, gleiches Design).
   - Die MCP Tools von Redesign (`.mcp.json`) stehen erst nach einem Neustart der Session zur Verfügung.
     Wenn sie da sind, dürfen sie für Feinschliff genutzt werden (media_get_post, Screenshot, Layer Edits).
6. Jede PNG einzeln prüfen (Read), Textüberlauf korrigieren, neu rendern.
7. Alle PNGs plus caption.md mit SendUserFile an den User schicken (display: attach), Captions zusätzlich im Chat.
8. Commit und Push auf den Arbeitsbranch.

## Slide Typen in spec.json
cover, text (mit optional example), list (items, icons), stat, compare (cols mit on, optional rows/name als Profilkarte), quote, takeaway, cta (icon).
`**wort**` markiert Akzentfarbe, `\n` bricht um. Theme pro Slide: `dark`, `light` oder `accent` (volle Akzentfläche, gut für Cover und CTA).

## Design Pflicht: jeder Post braucht Grafik
Reine Textfolien wirken wie KI Content. Pro Post mindestens 5 Slides mit Grafik:
- `visual` auf cover/text/takeaway/stat: `chat` (q, a, tag, tagType ok, agent, name), `search` (q, name, meta, status),
  `dns` (domain, rows [[label, wert, hl]]), `sync` (center, nodes [{icon, label, on}]).
- `list.icons`: Lucide Icon Namen pro Item (Globe, Search, Server, Mail, IdCard, Phone, MapPin ...).
- `sticker` (text, x, y, size, rotate) für Badges wie "Neu".
- `example` mit `exampleLabel` und `exampleIcon` wird als Karte gerendert (OEZ AI Fingerprint).
- Visuelle Klammer: Grafik aus Slide 2 in Slide 8 aufgelöst zeigen (z.B. Chat ungeprüft, dann verifiziert).
- Beispielnamen im Mockup als Beispiel kennzeichnen, keine echten Hotels.
- Fallback render.mjs kann keine visuals, nur Redesign.

## Textlimits (sonst Überlauf)
- cover title: max ca. 7 Wörter
- h2 title: max ca. 9 Wörter
- text: max ca. 30 Wörter
- list: max 5 items, je max 10 Wörter

## Captions
- LinkedIn: 600 bis 1000 Zeichen, Hook in 210 Zeichen, spezifische Frage am Ende, 3 bis 5 Hashtags.
- Instagram: Hook in Zeile 1, kürzere Absätze, CTA "Speichern" oder Kommentar Keyword, 8 bis 12 Hashtags.
- Keine Gedankenstriche im Fließtext. Links nur in den ersten Kommentar.
