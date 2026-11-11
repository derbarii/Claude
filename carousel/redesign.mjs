// Schreibt eine Carousel-Spec als Post in den lokalen Redesign-Editor (github.com/Nodewave-io/redesign)
// und exportiert die Slides als PNG (2160x2700, 4:5) über dessen Export-Route.
//
// Nutzung: node carousel/redesign.mjs posts/<slug>/spec.json [--url http://127.0.0.1:3000]
// Voraussetzung: `redesign start` läuft.
// Ergebnis: posts/<slug>/slides/slide-XX.png, caption.md, redesign.json (post id + editor url)
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const specPath = process.argv[2];
if (!specPath) { console.error('Usage: node carousel/redesign.mjs <spec.json> [--url URL]'); process.exit(1); }
const ui = process.argv.indexOf('--url');
const BASE = ui > -1 ? process.argv[ui + 1] : (process.env.REDESIGN_URL || 'http://127.0.0.1:3000');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const dir = path.dirname(specPath);

const W = 1000, H = 1250, PX = 82, PY = 88;
const A = spec.accent || '#FF6B2C';
const DARK = '#16181D', LIGHT = '#F5F3EF', CARD_D = '#22252C', CARD_L = '#E9E5DE';
const FONT = spec.font || 'Inter';
const DISPLAY = spec.displayFont || 'Inter Display';
const total = spec.slides.length;

// ---------- JSX Helfer ----------
const S = o => JSON.stringify(o);                       // style-Objekt als JSX-Literal
const T = s => `{${JSON.stringify(String(s))}}`;         // Text sicher als JSX-Ausdruck
// "**wort**" => Akzent-Span, "\n" => <br/>
function rich(s) {
  return String(s ?? '').split(/(\*\*.+?\*\*)/g).filter(Boolean).map(part => {
    const hl = part.startsWith('**') && part.endsWith('**');
    const txt = hl ? part.slice(2, -2) : part;
    const lines = txt.split('\n').map(T).join('<br/>');
    return hl ? `<span style={${S({ color: A })}}>${lines}</span>` : lines;
  }).join('');
}
const el = (tag, style, children = '') => `<${tag} style={${S(style)}}>${children}</${tag}>`;

function content(sl, fg, dark) {
  const muted = { opacity: 0.8 };
  const kicker = sl.kicker ? el('div', { fontSize: 26, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 32 }, rich(sl.kicker)) : '';
  const h1 = t => el('div', { fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, lineHeight: 1.02, letterSpacing: '-0.035em' }, rich(t));
  const h2 = t => el('div', { fontFamily: DISPLAY, fontWeight: 800, fontSize: 70, lineHeight: 1.06, letterSpacing: '-0.03em' }, rich(t));
  const text = t => t ? el('div', { fontSize: 37, lineHeight: 1.45, marginTop: 40, ...muted }, rich(t)) : '';
  const rule = el('div', { width: 110, height: 8, background: A, marginTop: 40 });
  let body = '';
  switch (sl.type) {
    case 'cover':
      body = kicker + h1(sl.title) + (sl.sub ? el('div', { fontSize: 35, lineHeight: 1.4, marginTop: 40, opacity: 0.78 }, rich(sl.sub)) : '') + rule; break;
    case 'stat':
      body = kicker + el('div', { fontFamily: DISPLAY, fontWeight: 800, fontSize: 240, lineHeight: 0.9, letterSpacing: '-0.05em', color: A }, rich(sl.stat))
        + el('div', { marginTop: 36 }, h2(sl.title)) + text(sl.text); break;
    case 'list':
      body = kicker + h2(sl.title) + el('div', { display: 'flex', flexDirection: 'column', gap: 28, marginTop: 48 },
        sl.items.map((it, j) => el('div', { display: 'flex', gap: 26, alignItems: 'flex-start', fontSize: 35, lineHeight: 1.35 },
          el('div', { flex: 'none', width: 58, height: 58, borderRadius: 999, border: `3px solid ${A}`, color: A, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26, marginTop: -5 }, T(j + 1))
          + el('div', {}, rich(it)))).join('')); break;
    case 'compare':
      body = kicker + h2(sl.title) + el('div', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, marginTop: 50 },
        sl.cols.map(c => el('div', { borderRadius: 22, padding: '36px 32px', background: dark ? CARD_D : CARD_L, boxShadow: c.on ? `inset 0 0 0 4px ${A}` : 'none' },
          el('div', { fontSize: 24, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 22, color: c.on ? A : fg, opacity: c.on ? 1 : 0.6 }, rich(c.label))
          + el('div', { fontSize: 31, lineHeight: 1.4 }, rich(c.text)))).join('')) + text(sl.text); break;
    case 'quote': case 'takeaway':
      body = kicker + el('div', { fontSize: 190, lineHeight: 0.6, color: A, fontWeight: 800, height: 92 }, T('“'))
        + el('div', { fontFamily: DISPLAY, fontSize: 66, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.025em' }, rich(sl.title)) + text(sl.text) + rule; break;
    case 'cta':
      body = kicker + h2(sl.title) + text(sl.text) + (sl.button ? el('div', { marginTop: 52, alignSelf: 'flex-start', background: A, color: DARK, fontWeight: 700, fontSize: 33, padding: '24px 40px', borderRadius: 999 }, rich(sl.button)) : ''); break;
    default:
      body = kicker + h2(sl.title) + text(sl.text) + (sl.example ? el('div', { marginTop: 48, borderLeft: `6px solid ${A}`, padding: '6px 0 6px 30px', fontSize: 31, lineHeight: 1.45, opacity: 0.92 },
        el('div', { fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 10, fontWeight: 700 }, T(sl.exampleLabel || 'Aus der Praxis')) + rich(sl.example)) : '');
  }
  return el('div', { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: fg, fontFamily: FONT }, body);
}

// ---------- Post bauen ----------
const slides = [], layers = [];
spec.slides.forEach((sl, i) => {
  const theme = sl.theme || (['cover', 'takeaway', 'cta'].includes(sl.type) ? 'dark' : 'light');
  const dark = theme === 'dark';
  const fg = dark ? LIGHT : DARK;
  slides.push({ id: randomUUID(), background: dark ? DARK : LIGHT });
  const base = { slideIndex: i, spans: 1 };
  const txt = (x, y, w, h, text, extra = {}) => layers.push({ id: randomUUID(), kind: 'text', ...base, x, y, w, h, text, fontFamily: FONT, fontSize: 24, fontWeight: 600, color: fg, align: 'left', opacity: 0.55, ...extra });
  // Kopfzeile
  layers.push({ id: randomUUID(), kind: 'shape', ...base, x: PX, y: PY + 8, w: 17, h: 17, shape: 'circle', fill: A });
  txt(PX + 30, PY, 400, 34, spec.brand || 'OEZ AI', { letterSpacing: 0.5 });
  txt(W - PX - 200, PY, 200, 34, `${i + 1}/${total}`, { align: 'right' });
  // Inhalt (editierbarer Code-Layer)
  layers.push({ id: randomUUID(), kind: 'code', ...base, x: PX, y: PY + 70, w: W - 2 * PX, h: H - 2 * PY - 140, source: content(sl, fg, dark) });
  // Fußzeile
  txt(PX, H - PY - 34, 400, 34, spec.handle || '@oez.ai');
  if (i < total - 1) txt(W - PX - 240, H - PY - 34, 240, 34, 'Swipe →', { align: 'right', color: A, opacity: 1 });
  layers.push({ id: randomUUID(), kind: 'shape', ...base, x: 0, y: H - 10, w: W * (i + 1) / total, h: 10, shape: 'rect', fill: A });
});

async function api(p, opts = {}) {
  const r = await fetch(BASE + p, { headers: { 'content-type': 'application/json' }, ...opts });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${await r.text()}`);
  return r;
}

const cols = await (await api('/api/collections')).json();
const colName = spec.collection || 'OEZ AI';
let col = cols.find(c => c.name === colName);
if (!col) col = await (await api('/api/collections', { method: 'POST', body: JSON.stringify({ name: colName }) })).json();

const metaPath = path.join(dir, 'redesign.json');
const prev = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
const postBody = { collection_id: col.id, title: spec.title || path.basename(dir), page_count: total, aspect_ratio: '4:5', theme: 'dark', slides, layers };
let postId;
if (prev?.postId && (await fetch(`${BASE}/api/posts/${prev.postId}`)).ok) {
  await api(`/api/posts/${prev.postId}`, { method: 'PATCH', body: JSON.stringify(postBody) });
  postId = prev.postId;
} else {
  postId = (await (await api('/api/posts', { method: 'POST', body: JSON.stringify(postBody) })).json()).id;
}
fs.writeFileSync(metaPath, JSON.stringify({ postId, collection: col.id, editor: `${BASE}/edit/${postId}` }, null, 2));
console.log('post', postId);

// ---------- Export ----------
const zipBuf = Buffer.from(await (await api('/api/media/export', { method: 'POST', body: JSON.stringify({ postId }) })).arrayBuffer());
const outDir = path.join(dir, 'slides');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const zipPath = path.join(dir, 'export.zip');
fs.writeFileSync(zipPath, zipBuf);
execFileSync('python3', ['-I', '-c', `
import zipfile,sys,os,re
z=zipfile.ZipFile(sys.argv[1]);names=sorted([n for n in z.namelist() if n.lower().endswith('.png')],key=lambda n:int(re.findall(r'\\d+',os.path.basename(n))[-1]) if re.findall(r'\\d+',os.path.basename(n)) else 0)
for i,n in enumerate(names,1):
  open(os.path.join(sys.argv[2],'slide-%02d.png'%i),'wb').write(z.read(n)); print(os.path.join(sys.argv[2],'slide-%02d.png'%i))
`, zipPath, outDir], { stdio: 'inherit' });
fs.rmSync(zipPath);

if (spec.caption) {
  const parts = [];
  if (spec.caption.instagram) parts.push(`# Instagram Caption\n\n${spec.caption.instagram}`);
  if (spec.caption.linkedin) parts.push(`# LinkedIn Caption\n\n${spec.caption.linkedin}`);
  if (spec.caption.firstComment) parts.push(`# 1. Kommentar\n\n${spec.caption.firstComment}`);
  if (spec.source) parts.push(`---\nQuelle: ${spec.source}`);
  fs.writeFileSync(path.join(dir, 'caption.md'), parts.join('\n\n') + '\n');
}
