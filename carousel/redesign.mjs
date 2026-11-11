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
const MONO = 'DejaVu Sans Mono, ui-monospace, monospace';
// "**wort**" => Akzent-Span, "\n" => <br/>
function rich(s, hl = A) {
  return String(s ?? '').split(/(\*\*.+?\*\*)/g).filter(Boolean).map(part => {
    const isHl = part.startsWith('**') && part.endsWith('**');
    const txt = isHl ? part.slice(2, -2) : part;
    const lines = txt.split('\n').map(T).join('<br/>');
    return isHl ? `<span style={${S({ color: hl })}}>${lines}</span>` : lines;
  }).join('');
}
const el = (tag, style, children = '') => `<${tag} style={${S(style)}}>${children}</${tag}>`;
const ic = (name, size, color, sw = 2.2) => `<Icons.${name} size={${size}} color={${JSON.stringify(color)}} strokeWidth={${sw}} />`;

// Farbkontext pro Theme: dark, light, accent
function palette(theme) {
  if (theme === 'dark') return { bg: DARK, fg: LIGHT, hl: A, card: CARD_D, card2: '#2E323A', line: 'rgba(255,255,255,0.08)', dots: 'rgba(255,255,255,0.07)', shadow: '0 30px 80px rgba(0,0,0,0.45)', chrome: A };
  if (theme === 'accent') return { bg: A, fg: DARK, hl: '#FFFFFF', card: '#FFFFFF', card2: '#F1EFEB', line: 'rgba(22,24,29,0.08)', dots: 'rgba(22,24,29,0.10)', shadow: '0 30px 80px rgba(22,24,29,0.28)', chrome: DARK };
  return { bg: LIGHT, fg: DARK, hl: A, card: '#FFFFFF', card2: '#EEECE8', line: 'rgba(22,24,29,0.08)', dots: 'rgba(22,24,29,0.09)', shadow: '0 24px 70px rgba(22,24,29,0.13)', chrome: A };
}

// ---------- Grafik Bausteine ----------
const pill = (text, { bg, color, icon, size = 22 }) => el('div', { display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 999, background: bg, color, fontSize: size, fontWeight: 700 }, (icon ? ic(icon, size + 2, color) : '') + T(text));

function cardBox(p, inner, extra = {}) {
  // Karten sind immer hell auf hellem/akzent Grund, dunkel auf dunklem Grund
  return el('div', { background: p.card, color: p.bg === DARK ? LIGHT : DARK, borderRadius: 28, boxShadow: p.shadow, border: `1px solid ${p.line}`, overflow: 'hidden', ...extra }, inner);
}

function chatUI(v, p) {
  const dark = p.bg === DARK;
  const fg = dark ? LIGHT : DARK;
  const top = el('div', { display: 'flex', alignItems: 'center', gap: 14, padding: '22px 28px', borderBottom: `1px solid ${p.line}` },
    el('div', { width: 40, height: 40, borderRadius: 999, background: dark ? LIGHT : DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }, ic('Sparkles', 22, dark ? DARK : LIGHT))
    + el('div', { fontSize: 26, fontWeight: 700 }, T('ChatGPT'))
    + el('div', { flex: 1 }) + el('div', { display: 'flex', gap: 8 }, [0, 1, 2].map(() => el('div', { width: 9, height: 9, borderRadius: 9, background: fg, opacity: 0.25 })).join('')));
  const user = el('div', { alignSelf: 'flex-end', background: p.card2, borderRadius: 26, padding: '18px 26px', fontSize: 28, lineHeight: 1.35, maxWidth: '82%' }, rich(v.q));
  const avatar = el('div', { flex: 'none', width: 46, height: 46, borderRadius: 999, background: v.agent ? A : (dark ? '#3A3F48' : '#E4E1DB'), display: 'flex', alignItems: 'center', justifyContent: 'center' }, ic(v.agent ? 'Building2' : 'Sparkles', 24, v.agent ? DARK : fg));
  const tag = v.tag ? pill(v.tag, v.tagType === 'ok' ? { bg: A, color: DARK, icon: 'BadgeCheck' } : { bg: dark ? '#3A2A22' : '#FCE3D6', color: dark ? '#FFB28A' : '#B8441A', icon: 'TriangleAlert' }) : '';
  const answer = el('div', { display: 'flex', gap: 18, alignItems: 'flex-start' }, avatar
    + el('div', { display: 'flex', flexDirection: 'column', gap: 14, flex: 1 },
      (v.name ? el('div', { fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: A }, T(v.name)) : '')
      + el('div', { fontSize: 30, lineHeight: 1.4 }, rich(v.a)) + tag));
  return cardBox(p, top + el('div', { display: 'flex', flexDirection: 'column', gap: 26, padding: '30px 30px 34px' }, user + answer), v.tilt ? { transform: `rotate(${v.tilt}deg)` } : {});
}

function searchUI(v, p) {
  const bar = el('div', { display: 'flex', alignItems: 'center', gap: 16, background: '#F1EFEB', borderRadius: 999, padding: '20px 26px', fontSize: 27, color: DARK }, ic('Search', 28, DARK) + T(v.q));
  const res = el('div', { display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 },
    el('div', { flex: 'none', width: 78, height: 78, borderRadius: 20, background: '#E9E5DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }, ic('Building2', 38, DARK, 1.8))
    + el('div', { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }, el('div', { fontSize: 30, fontWeight: 800 }, T(v.name)) + el('div', { fontSize: 22, opacity: 0.55 }, T(v.meta || '')))
    + pill(v.status || 'Nicht beansprucht', { bg: '#FCE3D6', color: '#B8441A', icon: 'CircleAlert', size: 20 }));
  return cardBox(p, el('div', { padding: 28 }, bar + res), { transform: `rotate(${v.tilt ?? -2.5}deg)` });
}

function dnsUI(v, p) {
  const head = el('div', { display: 'flex', alignItems: 'center', gap: 14, padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 24, fontWeight: 700, color: LIGHT },
    ic('Server', 26, A) + T(v.title || 'DNS Einstellungen') + el('div', { flex: 1 }) + el('div', { fontFamily: MONO, fontSize: 20, opacity: 0.5, fontWeight: 400 }, T(v.domain || 'deinhotel.de')));
  const cell = (k, val, hl) => el('div', { display: 'flex', flexDirection: 'column', gap: 10 }, el('div', { fontSize: 18, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.45 }, T(k)) + el('div', { fontFamily: MONO, fontSize: 28, color: hl ? A : LIGHT }, T(val)));
  const row = el('div', { display: 'grid', gridTemplateColumns: '110px 90px 1fr', gap: 24, padding: '28px', background: 'rgba(255,107,44,0.08)', boxShadow: `inset 4px 0 0 ${A}` },
    (v.rows || []).map(([k, val, hl]) => cell(k, val, hl)).join(''));
  const ok = el('div', { display: 'flex', alignItems: 'center', gap: 12, padding: '22px 28px', fontSize: 24, fontWeight: 700, color: A }, ic('CircleCheck', 28, A) + T(v.status || 'Domain verifiziert'));
  return el('div', { background: '#101216', color: LIGHT, borderRadius: 28, overflow: 'hidden', boxShadow: '0 30px 80px rgba(22,24,29,0.35)' }, head + row + ok);
}

function profileCard(c, p) {
  const on = !!c.on;
  const fg = DARK;
  const badge = on ? pill('Verifiziert', { bg: A, color: DARK, icon: 'BadgeCheck', size: 18 }) : pill('Nicht beansprucht', { bg: '#E9E5DE', color: '#6B6B6B', icon: 'CircleHelp', size: 18 });
  const rows = (c.rows || []).map(r => el('div', { display: 'flex', alignItems: 'center', gap: 12, fontSize: 25, lineHeight: 1.3 }, ic(on ? 'Check' : 'CircleHelp', 26, on ? A : '#9A9A9A', 2.6) + el('span', { opacity: on ? 1 : 0.6 }, rich(r)))).join('');
  return el('div', { display: 'flex', flexDirection: 'column', gap: 18 },
    el('div', { fontSize: 22, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: on ? A : p.fg, opacity: on ? 1 : 0.55 }, rich(c.label))
    + el('div', { background: '#FFFFFF', color: fg, borderRadius: 26, padding: '30px 26px', display: 'flex', flexDirection: 'column', gap: 18, boxShadow: on ? `0 0 0 4px ${A}, ${p.shadow}` : 'none', border: on ? 'none' : '2px dashed rgba(22,24,29,0.18)', opacity: on ? 1 : 0.85, transform: on ? 'rotate(1.5deg)' : 'none' },
      el('div', { width: 72, height: 72, borderRadius: 999, background: on ? A : '#E9E5DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }, ic('Building2', 36, on ? DARK : '#8A8A8A', 1.9))
      + el('div', { fontSize: 30, fontWeight: 800, lineHeight: 1.1 }, T(c.name || 'Hotel Seeblick')) + badge
      + el('div', { height: 1, background: 'rgba(22,24,29,0.08)' }) + rows));
}

function syncUI(v, p) {
  const center = el('div', { alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 16, background: DARK, color: LIGHT, borderRadius: 22, padding: '22px 32px', fontSize: 28, fontWeight: 800, boxShadow: p.shadow }, ic('Database', 32, A) + T(v.center || 'Eine Datenquelle'));
  const n = v.nodes.length;
  const bar = el('div', { position: 'relative', height: 70, margin: `0 ${100 / n / 2}%` },
    el('div', { position: 'absolute', left: '50%', top: 0, width: 4, height: 35, background: A, marginLeft: -2 })
    + el('div', { position: 'absolute', left: 0, right: 0, top: 33, height: 4, background: A })
    + Array.from({ length: n }, (_, i) => el('div', { position: 'absolute', left: `${(i / (n - 1)) * 100}%`, top: 35, width: 4, height: 35, background: A, marginLeft: -2 })).join(''));
  const nodes = el('div', { display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 14 }, v.nodes.map(nd => el('div', { background: nd.on ? A : '#FFFFFF', color: DARK, borderRadius: 20, padding: '22px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, fontSize: 21, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, boxShadow: p.shadow }, ic(nd.icon, 34, DARK, 1.9) + rich(nd.label))).join(''));
  return el('div', { display: 'flex', flexDirection: 'column' }, center + bar + nodes);
}

function visual(v, p) {
  if (!v) return '';
  switch (v.type) {
    case 'chat': return chatUI(v, p);
    case 'search': return searchUI(v, p);
    case 'dns': return dnsUI(v, p);
    case 'sync': return syncUI(v, p);
    default: return '';
  }
}

function sticker(st, p) {
  if (!st) return '';
  return el('div', { position: 'absolute', top: st.y ?? 150, right: st.x ?? 70, width: st.size ?? 180, height: st.size ?? 180, borderRadius: 999, background: st.bg || DARK, color: st.color || A, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: st.fontSize ?? 30, fontWeight: 800, lineHeight: 1.05, letterSpacing: '0.04em', textTransform: 'uppercase', transform: `rotate(${st.rotate ?? 12}deg)`, boxShadow: '0 16px 40px rgba(0,0,0,0.25)', zIndex: 5 }, rich(st.text, '#FFFFFF'));
}

// ---------- Slide Inhalt (ein Code Layer pro Slide, volle Fläche) ----------
function content(sl, p, idx) {
  const kicker = sl.kicker ? el('div', { alignSelf: 'flex-start', fontSize: 24, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: p.bg === A ? A : DARK, background: p.bg === A ? DARK : A, padding: '10px 18px', borderRadius: 10, marginBottom: 30 }, rich(sl.kicker, '#FFFFFF')) : '';
  const h1 = t => el('div', { fontFamily: DISPLAY, fontWeight: 800, fontSize: sl.titleSize || 92, lineHeight: 1.0, letterSpacing: '-0.04em' }, rich(t, p.hl));
  const h2 = t => el('div', { fontFamily: DISPLAY, fontWeight: 800, fontSize: sl.titleSize || 68, lineHeight: 1.04, letterSpacing: '-0.035em' }, rich(t, p.hl));
  const text = (t, mt = 30) => t ? el('div', { fontSize: sl.textSize || 34, lineHeight: 1.42, marginTop: mt, opacity: 0.82 }, rich(t, p.hl)) : '';
  const vis = sl.visual ? el('div', { marginTop: sl.visualGap ?? 52 }, visual(sl.visual, p)) : '';
  const note = sl.example ? el('div', { marginTop: 40, display: 'flex', gap: 18, alignItems: 'flex-start', background: p.bg === DARK ? CARD_D : '#FFFFFF', borderRadius: 22, padding: '24px 26px', fontSize: 27, lineHeight: 1.42, boxShadow: p.bg === DARK ? 'none' : p.shadow },
    el('div', { flex: 'none', width: 48, height: 48, borderRadius: 14, background: A, display: 'flex', alignItems: 'center', justifyContent: 'center' }, ic(sl.exampleIcon || 'Lightbulb', 26, DARK))
    + el('div', {}, el('div', { fontSize: 19, letterSpacing: '0.14em', textTransform: 'uppercase', color: A, marginBottom: 8, fontWeight: 800 }, T(sl.exampleLabel || 'Aus der Praxis')) + rich(sl.example, p.hl))) : '';
  let body = '';
  switch (sl.type) {
    case 'cover':
      body = kicker + h1(sl.title) + (sl.sub ? el('div', { fontSize: 32, lineHeight: 1.4, marginTop: 30, opacity: 0.8, maxWidth: 760 }, rich(sl.sub, p.hl)) : '') + vis; break;
    case 'stat':
      body = kicker + el('div', { fontFamily: DISPLAY, fontWeight: 800, fontSize: 240, lineHeight: 0.9, letterSpacing: '-0.05em', color: A }, rich(sl.stat)) + el('div', { marginTop: 36 }, h2(sl.title)) + text(sl.text) + vis; break;
    case 'list':
      body = kicker + h2(sl.title) + el('div', { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 44 },
        sl.items.map((it, j) => el('div', { display: 'flex', gap: 22, alignItems: 'center', background: p.bg === DARK ? CARD_D : '#FFFFFF', borderRadius: 22, padding: '18px 26px 18px 18px', boxShadow: p.bg === DARK ? 'none' : '0 10px 30px rgba(22,24,29,0.07)' },
          el('div', { flex: 'none', width: 70, height: 70, borderRadius: 18, background: A, display: 'flex', alignItems: 'center', justifyContent: 'center' }, ic((sl.icons || [])[j] || 'Check', 34, DARK, 2))
          + el('div', { flex: 1, fontSize: 30, lineHeight: 1.3 }, rich(it, p.hl))
          + el('div', { fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, opacity: 0.18 }, T(String(j + 1).padStart(2, '0'))))).join('')); break;
    case 'compare':
      body = kicker + h2(sl.title) + el('div', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 50, alignItems: 'start' }, sl.cols.map(c => c.rows ? profileCard(c, p)
        : el('div', { borderRadius: 22, padding: '36px 32px', background: p.card, boxShadow: c.on ? `inset 0 0 0 4px ${A}` : 'none' }, el('div', { fontSize: 24, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 22, color: c.on ? A : p.fg }, rich(c.label)) + el('div', { fontSize: 31, lineHeight: 1.4 }, rich(c.text)))).join('')) + text(sl.text); break;
    case 'quote': case 'takeaway':
      body = kicker + (sl.visual ? '' : el('div', { fontSize: 190, lineHeight: 0.6, color: A, fontWeight: 800, height: 92 }, T('“')))
        + el('div', { fontFamily: DISPLAY, fontSize: sl.titleSize || 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.035em' }, rich(sl.title, p.hl)) + text(sl.text) + vis; break;
    case 'cta':
      body = kicker + (sl.icon ? el('div', { width: 120, height: 120, borderRadius: 32, background: p.bg === A ? DARK : A, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 44, transform: 'rotate(-6deg)' }, ic(sl.icon, 64, p.bg === A ? A : DARK, 2)) : '')
        + h2(sl.title) + text(sl.text) + (sl.button ? el('div', { marginTop: 50, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 14, background: p.bg === A ? DARK : A, color: p.bg === A ? LIGHT : DARK, fontWeight: 800, fontSize: 32, padding: '26px 40px', borderRadius: 999 }, ic('Bookmark', 32, p.bg === A ? A : DARK) + rich(sl.button)) : ''); break;
    default:
      body = kicker + h2(sl.title) + text(sl.text) + vis + note;
  }
  // Hintergrund: Punkteraster + großer Index als Wasserzeichen
  const watermark = sl.watermark !== false && !['cover', 'cta'].includes(sl.type)
    ? el('div', { position: 'absolute', right: 40, bottom: 70, fontFamily: DISPLAY, fontWeight: 800, fontSize: 380, lineHeight: 1, letterSpacing: '-0.06em', color: 'transparent', WebkitTextStroke: `2px ${p.fg}`, opacity: 0.07 }, T(String(idx + 1).padStart(2, '0'))) : '';
  return el('div', { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', color: p.fg, fontFamily: FONT, backgroundColor: p.bg, backgroundImage: `radial-gradient(${p.dots} 1.6px, transparent 1.7px)`, backgroundSize: '30px 30px' },
    watermark + sticker(sl.sticker, p)
    + el('div', { position: 'absolute', left: PX, right: PX, top: 165, bottom: 150, display: 'flex', flexDirection: 'column', justifyContent: sl.align || 'center' }, body));
}

// ---------- Post bauen ----------
const slides = [], layers = [];
spec.slides.forEach((sl, i) => {
  const theme = sl.theme || (['cover', 'takeaway', 'cta'].includes(sl.type) ? 'dark' : 'light');
  const p = palette(theme);
  const fg = p.fg;
  slides.push({ id: randomUUID(), background: p.bg });
  const base = { slideIndex: i, spans: 1 };
  // Inhalt zuerst (liegt unten), voll editierbarer Code Layer über die ganze Fläche
  layers.push({ id: randomUUID(), kind: 'code', ...base, x: 0, y: 0, w: W, h: H, source: content(sl, p, i) });
  const txt = (x, y, w, h, text, extra = {}) => layers.push({ id: randomUUID(), kind: 'text', ...base, x, y, w, h, text, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: fg, align: 'left', opacity: 0.6, ...extra });
  // Kopfzeile
  layers.push({ id: randomUUID(), kind: 'shape', ...base, x: PX, y: PY + 8, w: 17, h: 17, shape: 'circle', fill: p.chrome });
  txt(PX + 30, PY, 400, 34, spec.brand || 'OEZ AI', { letterSpacing: 0.5, opacity: 1 });
  txt(W - PX - 200, PY, 200, 34, `${i + 1}/${total}`, { align: 'right' });
  // Fußzeile
  txt(PX, H - PY - 34, 400, 34, spec.handle || '@oez.ai');
  if (i < total - 1) txt(W - PX - 240, H - PY - 34, 240, 34, 'Swipe →', { align: 'right', color: p.chrome, opacity: 1 });
  layers.push({ id: randomUUID(), kind: 'shape', ...base, x: 0, y: H - 10, w: W * (i + 1) / total, h: 10, shape: 'rect', fill: p.chrome });
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
  await api(`/api/posts/${prev.postId}`, { method: 'PATCH', body: JSON.stringify({ patch: postBody }) });
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
