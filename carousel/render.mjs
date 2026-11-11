// Rendert ein Carousel aus einer JSON-Spec in einzelne PNGs (1080x1350, 4:5).
// Nutzung: node carousel/render.mjs posts/<slug>/spec.json
// Output:  posts/<slug>/slides/slide-01.png ... + caption.md
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
// Playwright ist global vorinstalliert, CJS require findet es von überall
const { chromium } = createRequire(import.meta.url)('playwright');

const specPath = process.argv[2];
if (!specPath) { console.error('Usage: node carousel/render.mjs <spec.json>'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const outDir = path.join(path.dirname(specPath), 'slides');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const W = 1080, H = 1350;
const accent = spec.accent || '#FF6B2C';
const brand = spec.brand || 'OEZ AI';
const handle = spec.handle || '@oez.ai';
const total = spec.slides.length;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// **text** => Akzent-Hervorhebung, \n => Zeilenumbruch
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>').replace(/\n/g, '<br>');

const css = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px}
body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
.s{width:${W}px;height:${H}px;position:relative;padding:96px 88px;display:flex;flex-direction:column;overflow:hidden}
.dark{background:#16181D;color:#F5F3EF}
.light{background:#F5F3EF;color:#16181D}
.hl{color:${accent}}
.top{display:flex;justify-content:space-between;align-items:center;font-size:26px;font-weight:600;letter-spacing:.02em;opacity:.55}
.brand{display:flex;align-items:center;gap:14px}
.dot{width:18px;height:18px;border-radius:50%;background:${accent};opacity:1}
.body{flex:1;display:flex;flex-direction:column;justify-content:center}
.kicker{font-size:30px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${accent};margin-bottom:36px}
h1{font-family:'Inter Display','Inter',sans-serif;font-weight:800;font-size:104px;line-height:1.02;letter-spacing:-.035em}
h2{font-family:'Inter Display','Inter',sans-serif;font-weight:800;font-size:76px;line-height:1.06;letter-spacing:-.03em}
.sub{font-size:38px;line-height:1.4;font-weight:400;margin-top:44px;opacity:.78;max-width:860px}
.text{font-size:40px;line-height:1.45;margin-top:44px;opacity:.85}
.rule{width:120px;height:8px;background:${accent};margin:44px 0 0}
.stat{font-family:'Inter Display','Inter',sans-serif;font-weight:800;font-size:260px;line-height:.9;letter-spacing:-.05em;color:${accent}}
ul{list-style:none;margin-top:52px;display:flex;flex-direction:column;gap:30px}
li{display:flex;gap:28px;font-size:38px;line-height:1.35;align-items:flex-start}
.num{flex:none;width:64px;height:64px;border-radius:50%;border:3px solid ${accent};color:${accent};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:28px;margin-top:-6px}
.ex{margin-top:52px;border-left:6px solid ${accent};padding:8px 0 8px 32px;font-size:34px;line-height:1.45;opacity:.9}
.ex b{display:block;font-size:24px;letter-spacing:.14em;text-transform:uppercase;color:${accent};margin-bottom:10px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:56px}
.col{border-radius:24px;padding:40px 36px}
.dark .col{background:#22252C}.light .col{background:#E9E5DE}
.col.on{outline:4px solid ${accent}}
.col h3{font-size:26px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:24px;opacity:.6}
.col.on h3{color:${accent};opacity:1}
.col p{font-size:34px;line-height:1.4}
.quote{font-family:'Inter Display','Inter',sans-serif;font-size:70px;font-weight:700;line-height:1.15;letter-spacing:-.025em}
.qm{font-size:200px;line-height:.6;color:${accent};font-weight:800;height:100px}
.bottom{display:flex;justify-content:space-between;align-items:center;font-size:26px;font-weight:600}
.bottom .h{opacity:.55}
.swipe{display:flex;align-items:center;gap:14px;color:${accent}}
.bar{position:absolute;left:0;bottom:0;height:10px;background:${accent}}
.cta{margin-top:56px;display:inline-flex;align-self:flex-start;background:${accent};color:#16181D;font-weight:700;font-size:36px;padding:26px 44px;border-radius:999px}
`;

function slideHTML(sl, i) {
  const n = i + 1;
  const theme = sl.theme || (sl.type === 'cover' || sl.type === 'takeaway' ? 'dark' : (sl.type === 'cta' ? 'dark' : 'light'));
  const isLast = n === total;
  let inner = '';
  const k = sl.kicker ? `<div class="kicker">${fmt(sl.kicker)}</div>` : '';
  switch (sl.type) {
    case 'cover':
      inner = `${k}<h1>${fmt(sl.title)}</h1>${sl.sub ? `<div class="sub">${fmt(sl.sub)}</div>` : ''}<div class="rule"></div>`;
      break;
    case 'stat':
      inner = `${k}<div class="stat">${fmt(sl.stat)}</div><h2 style="margin-top:40px">${fmt(sl.title)}</h2>${sl.text ? `<div class="text">${fmt(sl.text)}</div>` : ''}`;
      break;
    case 'list':
      inner = `${k}<h2>${fmt(sl.title)}</h2><ul>${sl.items.map((it, j) => `<li><span class="num">${j + 1}</span><span>${fmt(it)}</span></li>`).join('')}</ul>`;
      break;
    case 'compare':
      inner = `${k}<h2>${fmt(sl.title)}</h2><div class="cols">${sl.cols.map(c => `<div class="col ${c.on ? 'on' : ''}"><h3>${fmt(c.label)}</h3><p>${fmt(c.text)}</p></div>`).join('')}</div>${sl.text ? `<div class="text">${fmt(sl.text)}</div>` : ''}`;
      break;
    case 'quote':
    case 'takeaway':
      inner = `${k}<div class="qm">“</div><div class="quote">${fmt(sl.title)}</div>${sl.text ? `<div class="text">${fmt(sl.text)}</div>` : ''}<div class="rule"></div>`;
      break;
    case 'cta':
      inner = `${k}<h2>${fmt(sl.title)}</h2>${sl.text ? `<div class="text">${fmt(sl.text)}</div>` : ''}${sl.button ? `<div class="cta">${fmt(sl.button)}</div>` : ''}`;
      break;
    default: // text
      inner = `${k}<h2>${fmt(sl.title)}</h2>${sl.text ? `<div class="text">${fmt(sl.text)}</div>` : ''}${sl.example ? `<div class="ex"><b>${esc(sl.exampleLabel || 'Aus der Praxis')}</b>${fmt(sl.example)}</div>` : ''}`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="s ${theme}">
  <div class="top"><div class="brand"><span class="dot"></span>${esc(brand)}</div><div>${n}/${total}</div></div>
  <div class="body">${inner}</div>
  <div class="bottom"><span class="h">${esc(handle)}</span>${isLast ? '' : `<span class="swipe">Swipe →</span>`}</div>
  <div class="bar" style="width:${(n / total) * 100}%"></div>
</div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (let i = 0; i < total; i++) {
  await page.setContent(slideHTML(spec.slides[i], i), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(file);
}
await browser.close();

if (spec.caption) {
  const cap = path.join(path.dirname(specPath), 'caption.md');
  const parts = [];
  if (spec.caption.instagram) parts.push(`# Instagram Caption\n\n${spec.caption.instagram}`);
  if (spec.caption.linkedin) parts.push(`# LinkedIn Caption\n\n${spec.caption.linkedin}`);
  if (spec.caption.firstComment) parts.push(`# 1. Kommentar\n\n${spec.caption.firstComment}`);
  if (spec.source) parts.push(`---\nQuelle: ${spec.source}`);
  fs.writeFileSync(cap, parts.join('\n\n') + '\n');
  console.log(cap);
}
