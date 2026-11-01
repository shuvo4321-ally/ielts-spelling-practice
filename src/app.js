(function () {
'use strict';
const D = window.SP, N = D.words.length;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const app = $('#app');

/* ================================================================ saved state (this browser only) */
const KEY = 'ielts-spelling-lab-v1';
const DEF = { w: {}, err: {}, days: {}, exam: [], set: { voice: '', rate: 0.8, prompt: 'hear', flash: 2, size: 40 } };
let S = JSON.parse(JSON.stringify(DEF));
try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw) { S = Object.assign(S, raw); S.set = Object.assign({}, DEF.set, raw.set || {}); } } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const pad = n => ('0' + n).slice(-2);
const dstr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dstr(new Date());
const inDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return dstr(d); };
const INT = [0, 1, 3, 7, 14, 30], MASTER = 3;
const get = id => S.w[id] || null;
const mastered = id => { const r = get(id); return !!r && r.b >= MASTER; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const catOf = id => D.catOf[id];

/* ================================================================ words, answers, error analysis */
const target = id => D.show[id] || D.words[id];
const forms = id => [target(id)].concat(D.alt[id] || []);
const norm = s => String(s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const isCorrect = (id, typed) => forms(id).some(f => norm(f) === norm(typed));
function lev(a, b) { const m = a.length, n = b.length; let p = []; for (let j = 0; j <= n; j++) p[j] = j; for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
const closest = (id, typed) => forms(id).slice().sort((x, y) => lev(norm(typed), norm(x)) - lev(norm(typed), norm(y)))[0];
function align(a, b) {
  const m = a.length, n = b.length, d = [];
  for (let i = 0; i <= m; i++) { d[i] = []; for (let j = 0; j <= n; j++) d[i][j] = i === 0 ? j : j === 0 ? i : 0; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const ops = []; let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { ops.push({ t: a[i - 1] === b[j - 1] ? 'm' : 's', a: a[i - 1], b: b[j - 1] }); i--; j--; }
    else if (j > 0 && d[i][j] === d[i][j - 1] + 1) { ops.push({ t: 'd', b: b[j - 1] }); j--; }
    else { ops.push({ t: 'i', a: a[i - 1] }); i--; }
  }
  return ops.reverse();
}
function diffHTML(typed, cor) {
  const ops = align(norm(typed), norm(cor)); let u = '', c = '';
  ops.forEach(o => {
    if (o.t === 'm') { u += esc(o.a); c += esc(o.b); }
    else if (o.t === 's') { u += '<span class="x">' + esc(o.a) + '</span>'; c += '<span class="g">' + esc(o.b) + '</span>'; }
    else if (o.t === 'i') u += '<span class="xs">' + esc(o.a) + '</span>';
    else { u += '<span class="gap">_</span>'; c += '<span class="g">' + esc(o.b) + '</span>'; }
  });
  return '<div class="diff"><span class="lbl">You typed</span>' + (u || '<span class="gap">(nothing)</span>') + '</div><div class="diff"><span class="lbl">Correct</span>' + c + '</div>';
}
/* silent letters: [regex, index of the silent letter inside the match] */
const SILENT = [
  [/(?:clim|plum|crum|thum|dum|num(?!ber)|com|bom|lam|lim|tom|wom)b/g, m => m[0].length - 1], [/(?:de|dou|su)b(?=t)/g, m => m[0].length - 1],
  [/(?:autum|colum|condem|solem|hym)n/g, m => m[0].length - 1], [/(?:gover|enviro)n(?=ment)/g, m => m[0].length - 1],
  [/^k(?=n)/g, () => 0], [/^w(?=r)/g, () => 0], [/^g(?=n)/g, () => 0], [/^p(?=s|n)/g, () => 0], [/^h(?=on|our|eir)/g, () => 0], [/rh/g, () => 1],
  [/sc(?=[eiy])/g, () => 1], [/s(t)(?=le$|en$|ens$|ening$|led$|ling$)/g, () => 1], [/we(d)nesday/g, () => 2], [/d(?=ge)/g, () => 0],
  [/[aeiou]g(?=n(?:$|ed|ing|s|ment|er|e$))/g, () => 1], [/a(l)(?=[mk])/g, () => 1], [/o(l)(?=k)/g, () => 1], [/g(u)(?=[aeiy])/g, () => 1],
  [/[bc]u(?=i)/g, () => 1], [/feb(r)uary/g, () => 3]
];
function silentSet(w) { const s = new Set(); SILENT.forEach(p => { p[0].lastIndex = 0; let m; while ((m = p[0].exec(w))) { s.add(m.index + p[1](m)); if (m[0].length === 0) p[0].lastIndex++; } }); return s; }
function traps(word) {
  const w = word.toLowerCase(), cls = {}, doubles = [], silent = [];
  for (let i = 0; i < w.length - 1; i++) if (w[i] === w[i + 1] && /[a-z]/.test(w[i])) { if (!cls[i]) { doubles.push(w[i] + w[i]); } cls[i] = cls[i + 1] = 'd'; i++; }
  silentSet(w).forEach(i => { if (!cls[i]) { cls[i] = 's'; silent.push(w[i]); } });
  let ending = ''; const sm = w.match(/(ance|ence|ancy|ency|ant|ent|able|ible|ary|ery|ory)$/);
  if (sm && w.length > sm[0].length + 2) { const i = w.length - sm[0].length; if (!cls[i]) cls[i] = 'v'; ending = sm[0]; }
  const pairs = []; const pr = /ie|ei/g; let pm; while ((pm = pr.exec(w))) { if (!cls[pm.index] && !cls[pm.index + 1]) { cls[pm.index] = cls[pm.index + 1] = 'p'; pairs.push(pm[0]); } }
  let h = '';
  for (let i = 0; i < w.length; i++) h += cls[i] ? '<span class="t-' + cls[i] + '">' + esc(w[i].toUpperCase()) + '</span>' : esc(w[i]);
  const leg = [];
  if (doubles.length) leg.push('<span><i style="background:var(--bad)"></i>Doubled: ' + doubles.join(', ') + '</span>');
  if (silent.length) leg.push('<span><i style="background:var(--same-edge)"></i>Silent letter: ' + silent.join(', ') + '</span>');
  if (ending) leg.push('<span><i style="background:#FFE08A"></i>Vowel in the ending: -' + ending + '</span>');
  if (pairs.length) leg.push('<span><i style="background:var(--qn)"></i>' + pairs.join(', ') + ' (i before e, except after c)</span>');
  return { html: h, legend: leg.join('') };
}
const TIPS = {
  double: 'Doubled letters are the biggest source of lost marks. Say the word slowly and count each double letter.',
  silent: 'This word has a silent letter. Pronounce it in your head as you spell, like Wed-NES-day or en-vi-ron-ment.',
  swap: 'Two letters are in the wrong order. Remember: i before e, except after c.',
  vowel: 'Unstressed vowels all sound like “uh”, so sound will not help. Learn which vowel this word uses.',
  suffix: 'The endings -ance / -ence, -ant / -ent and -able / -ible sound the same. Learn the ending as part of the word.',
  missing: 'A letter is missing. Say the word in syllables and write each syllable.',
  extra: 'You added a letter that is not in the word.',
  sub: 'One letter is wrong. Check each sound against the letters.',
  many: 'Several letters differ. Break the word into syllables and spell one syllable at a time.',
  none: 'You did not type an answer. Look at the word, then fix it with the drill below.'
};
const LABEL = { double: 'Doubled letter', silent: 'Silent letter', swap: 'Letters swapped', vowel: 'Unstressed vowel', suffix: 'Ending (-ance / -ence …)', missing: 'Missing letter', extra: 'Extra letter', sub: 'Wrong letter', many: 'Several letters', none: 'No answer' };
const SUF = [['ance', 'ence'], ['ant', 'ent'], ['able', 'ible'], ['ary', 'ery'], ['ary', 'ory'], ['ery', 'ory'], ['er', 'or'], ['ar', 'er'], ['ar', 'or'], ['ise', 'ize'], ['cy', 'sy']];
function classify(typedRaw, corRaw) {
  const a = norm(typedRaw).replace(/[^a-z]/g, ''), b = norm(corRaw).replace(/[^a-z]/g, '');
  if (!a) return { type: 'none' };
  for (let i = 0; i < Math.min(a.length, b.length) - 1; i++) if (a[i] !== b[i]) { if (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)) return { type: 'swap', d: b[i] + b[i + 1] }; break; }
  for (let k = 0; k < SUF.length; k++) for (let r = 0; r < 2; r++) { const x = SUF[k][r], y = SUF[k][1 - r]; if (a.endsWith(x) && b.endsWith(y) && a.slice(0, -x.length) === b.slice(0, -y.length)) return { type: 'suffix', d: '-' + y }; }
  const col = s => s.replace(/(.)\1+/g, '$1');
  if (a !== b && col(a) === col(b)) return { type: 'double', d: a.length < b.length ? 'You missed a doubled letter.' : 'You doubled a letter that is single.' };
  const ops = align(a, b), ed = ops.filter(o => o.t !== 'm');
  if (ed.length === 1) {
    const o = ed[0]; let bi = 0; for (const p of ops) { if (p === o) break; if (p.t !== 'i') bi++; }
    if (o.t === 'd') return silentSet(b).has(bi) ? { type: 'silent', d: 'Missing silent letter: ' + o.b } : { type: 'missing', d: 'Missing: ' + o.b };
    if (o.t === 'i') return { type: 'extra', d: 'Extra: ' + o.a };
    return /[aeiou]/.test(o.a) && /[aeiou]/.test(o.b) ? { type: 'vowel', d: 'You wrote ' + o.a + ', it is ' + o.b } : { type: 'sub', d: 'You wrote ' + o.a + ', it is ' + o.b };
  }
  if (ed.length === 2 && ed.every(o => (o.a && /[aeiou]/.test(o.a)) || (o.b && /[aeiou]/.test(o.b)))) return { type: 'vowel' };
  return { type: 'many' };
}

/* ================================================================ speech */
const TTS = { ok: 'speechSynthesis' in window };
function voices() { return TTS.ok ? speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)) : []; }
function pickVoice() {
  const vs = voices(); if (!vs.length) return null;
  if (S.set.voice) { const f = vs.find(v => v.voiceURI === S.set.voice); if (f) return f; }
  const score = v => (/en[-_]GB/i.test(v.lang) ? 10 : /en[-_]AU/i.test(v.lang) ? 6 : /en[-_]US/i.test(v.lang) ? 4 : 1) + (/natural|online/i.test(v.name) ? 5 : 0) + (/google/i.test(v.name) ? 2 : 0);
  return vs.slice().sort((x, y) => score(y) - score(x))[0];
}
function say(text, rate) {
  if (!TTS.ok) return false;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text), v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB'; u.rate = rate || S.set.rate; speechSynthesis.speak(u); return true; } catch (e) { return false; }
}
if (TTS.ok) try { speechSynthesis.onvoiceschanged = () => {}; } catch (e) {}
const SPK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';

/* ================================================================ learning record */
function note(id, ok, firstTry, hinted, typed) {
  const r = S.w[id] || (S.w[id] = { b: 0, due: today(), s: 0, c: 0, x: 0, bad: [], e: {} });
  const t = today();
  if (firstTry) { r.s++; S.days[t] = (S.days[t] || 0) + 1; }
  if (ok) {
    if (firstTry && !hinted) { r.c++; r.b = Math.min(5, r.b + 1); r.due = inDays(INT[r.b]); }
    else if (firstTry) { r.due = inDays(1); }
  } else {
    r.x++; r.b = 1; r.due = t;
    const bad = (typed || '').trim(); if (bad) { r.bad = [bad].concat((r.bad || []).filter(x => x !== bad)).slice(0, 4); }
    const cl = classify(typed, closest(id, typed || ''));
    r.e = r.e || {}; r.e[cl.type] = (r.e[cl.type] || 0) + 1; S.err[cl.type] = (S.err[cl.type] || 0) + 1;
  }
  r.last = Date.now(); save();
}
const stats = () => {
  let seen = 0, mast = 0, wrongNow = 0, dueN = 0; const t = today();
  for (let i = 0; i < N; i++) { const r = get(i); if (!r || !r.s) continue; seen++; if (r.b >= MASTER) mast++; if (r.x && r.b < MASTER) wrongNow++; if (r.due <= t) dueN++; }
  let streak = 0; const d = new Date(); if (!S.days[dstr(d)]) d.setDate(d.getDate() - 1);
  while (S.days[dstr(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return { seen, mast, wrongNow, dueN, streak, today: S.days[t] || 0 };
};
const mistakeIds = () => { const a = []; for (let i = 0; i < N; i++) { const r = get(i); if (r && r.x && r.b < MASTER) a.push(i); } return a.sort((x, y) => (get(y).last || 0) - (get(x).last || 0)); };

/* ================================================================ choosing words */
function pickSmart(n) {
  const t = today(), due = [], fresh = [], rest = [];
  for (let i = 0; i < N; i++) { const r = get(i); if (!r || !r.s) fresh.push(i); else if (r.due <= t) due.push(i); else rest.push(i); }
  due.sort((a, b) => get(a).b - get(b).b || get(b).x - get(a).x);
  let out = due.slice(0, n); if (out.length < n) out = out.concat(shuffle(fresh).slice(0, n - out.length)); if (out.length < n) out = out.concat(shuffle(rest).slice(0, n - out.length));
  return shuffle(out);
}
function pickCat(c, count, order) {
  const cat = D.cats[c]; let ids = []; for (let i = cat.start; i < cat.end; i++) ids.push(i);
  if (order === 'abc') return ids.slice(0, count);
  if (order === 'random') return shuffle(ids).slice(0, count);
  const bad = ids.filter(i => { const r = get(i); return r && r.x && r.b < MASTER; }), fresh = ids.filter(i => !get(i) || !get(i).s), others = ids.filter(i => bad.indexOf(i) < 0 && fresh.indexOf(i) < 0);
  return shuffle(bad).concat(shuffle(fresh), shuffle(others)).slice(0, count);
}

/* ================================================================ session engine */
let sess = null, timer = null;
const promptMode = () => (sess && sess.exam ? (TTS.ok ? 'hear' : 'see') : (TTS.ok ? S.set.prompt : 'see'));
function startSession(mode, ids, opt) {
  clearTimeout(timer);
  if (!ids.length) return;
  sess = Object.assign({ mode, ids, queue: ids.map(id => ({ id, retry: false })), total: ids.length, correct: 0, first: {}, rows: [], t0: Date.now(), phase: 'ask', exam: mode === 'exam', replays: 0, hint: 0, hinted: false, cur: null, fix: null, slow: false, wrongCount: 0 }, opt || {});
  if (location.hash !== '#test') { sess.skipRoute = true; location.hash = '#test'; }
  nextWord();
}
function nextWord() {
  clearTimeout(timer);
  if (!sess.queue.length) { sess.phase = 'done'; renderSession(); return; }
  sess.cur = sess.queue.shift(); sess.phase = 'ask'; sess.hint = 0; sess.hinted = false; sess.replays = 0; sess.shown = false; sess.slow = false; sess.typed = '';
  renderSession();
}
function submit(typed, dontKnow) {
  if (sess.phase !== 'ask') return;
  const id = sess.cur.id, retry = sess.cur.retry, ok = !dontKnow && isCorrect(id, typed), first = !retry;
  clearTimeout(timer);
  if (first) { sess.first[id] = ok && !sess.hinted; if (ok && !sess.hinted) sess.correct++; sess.rows.push({ id, typed: dontKnow ? '' : typed, ok: ok && !sess.hinted, hinted: sess.hinted && ok }); }
  note(id, ok, first, sess.hinted, dontKnow ? '' : typed);
  if (ok) {
    sess.phase = 'ok'; sess.accepted = closest(id, typed);
    if (sess.exam) { nextWord(); return; }
    renderSession(); timer = setTimeout(nextWord, retry ? 900 : 750);
  } else {
    sess.wrongCount++; sess.lastTyped = dontKnow ? '' : typed;
    if (sess.exam) { nextWord(); return; }
    sess.phase = 'fb'; renderSession();
  }
}
function startFix() { sess.phase = 'fix'; sess.fix = { n: 0, peeked: false, bad: null }; renderSession(); }
function fixSubmit(typed) {
  const id = sess.cur.id, f = sess.fix;
  if (isCorrect(id, typed)) { f.n++; f.bad = null; f.peeked = false; if (f.n >= 3) { sess.phase = 'fixdone'; renderSession(); return; } renderSession(); }
  else { f.bad = typed; renderSession(); }
}
function afterFix() { sess.queue.splice(Math.min(4, sess.queue.length), 0, { id: sess.cur.id, retry: true }); nextWord(); }

/* ================================================================ views */
const NAV = [['home', 'Home'], ['mistakes', 'My mistakes'], ['rules', 'Rules and tips'], ['browse', 'Word list']];
function head(active) {
  $('#nav').innerHTML = NAV.map(n => '<a href="#' + n[0] + '"' + (active === n[0] ? ' class="on"' : '') + '>' + n[1] + '</a>').join('');
}
function catBar(c) {
  const cat = D.cats[c]; let m = 0, l = 0, n = cat.end - cat.start;
  for (let i = cat.start; i < cat.end; i++) { const r = get(i); if (r && r.s) { if (r.b >= MASTER) m++; else l++; } }
  return { m, l, n, html: '<div class="bar"><i class="m" style="width:' + (m / n * 100) + '%"></i><i class="l" style="width:' + (l / n * 100) + '%"></i></div>' };
}
function viewHome() {
  head('home'); const s = stats(), mi = mistakeIds().length, size = S.set.size;
  app.innerHTML = '<div class="hero"><h1>IELTS Spelling Lab</h1><p class="sub">' + N.toLocaleString('en') + ' words from your list. You type every answer. Every mistake is shown, explained, fixed and brought back until it sticks.</p></div>' +
    '<div class="stats"><div class="stat"><div class="n">' + s.mast + '<span class="small"> / ' + N.toLocaleString('en') + '</span></div><div class="t">Mastered</div></div><div class="stat"><div class="n">' + s.seen + '</div><div class="t">Words tried</div></div>' +
    '<div class="stat"><div class="n">' + mi + '</div><div class="t">To fix</div></div><div class="stat"><div class="n">' + s.dueN + '</div><div class="t">Due today</div></div><div class="stat"><div class="n">' + s.streak + '</div><div class="t">Day streak</div></div></div>' +
    '<div class="modes"><button class="mode" id="m-smart"><b>Daily review (' + size + ' words)</b>Your mistakes and due words first, then new ones. Do this every day.<span class="small">Listen and type</span></button>' +
    '<button class="mode gold" id="m-exam"><b>Exam test (40 words)</b>Like the real test: each word is said once, one replay, no hints, no feedback. Results and fixes at the end.<span class="small">Best score: ' + (S.exam.length ? Math.max.apply(null, S.exam) + ' / 40' : 'not taken yet') + '</span></button>' +
    '<button class="mode red" id="m-mist"' + (mi ? '' : ' disabled') + '><b>Retest my mistakes</b>' + (mi ? mi + ' word' + (mi > 1 ? 's' : '') + ' you got wrong and have not mastered yet.' : 'Nothing to fix yet. Mistakes appear here.') + '<span class="small">Type each one again</span></button></div>' +
    '<h2>Practise by category</h2><div class="cats">' + D.cats.map((c, i) => { const b = catBar(i); return '<button class="cat" data-cat="' + i + '"><span class="ct"><i>' + (i + 1) + '</i>' + esc(c.short) + '</span>' + b.html + '<span class="cn">' + b.m + ' mastered · ' + b.n + ' words</span></button>'; }).join('') + '</div>' +
    errBlock() + '<p class="small" style="margin-top:18px">Your progress is saved in this browser only. Words come from your PDF “IELTS Listening Spelling Mastery”.</p>';
  $('#m-smart').onclick = () => startSession('smart', pickSmart(S.set.size));
  $('#m-exam').onclick = () => startSession('exam', pickSmart(40), { exam: true });
  const mm = $('#m-mist'); if (mm && !mm.disabled) mm.onclick = () => startSession('mistakes', mistakeIds().slice(0, 40));
  $$('[data-cat]').forEach(b => { b.onclick = () => { location.hash = '#setup/' + b.dataset.cat; }; });
}
function errBlock() {
  const t = Object.keys(S.err).sort((a, b) => S.err[b] - S.err[a]); if (!t.length) return '';
  const mx = S.err[t[0]];
  return '<h2>Your most common errors</h2><div class="card"><div class="errs">' + t.slice(0, 6).map(k => '<div class="erow"><span>' + (LABEL[k] || k) + '</span><span class="bar"><i style="width:' + (S.err[k] / mx * 100) + '%"></i></span><b>' + S.err[k] + '</b></div>').join('') + '</div><p class="small" style="margin:10px 0 0">' + TIPS[t[0]] + '</p></div>';
}
function viewSetup(c) {
  head('home'); const cat = D.cats[c], b = catBar(c);
  app.innerHTML = '<div class="hero"><h1>' + (c + 1) + '. ' + esc(cat.short) + '</h1><p class="sub">' + esc(cat.title) + '</p></div>' +
    (cat.intro ? '<div class="box tech"><span class="lab">Why this category matters</span><p>' + esc(cat.intro) + '</p></div>' : '') +
    '<div class="card"><p><b>' + b.m + '</b> mastered, <b>' + b.l + '</b> learning, <b>' + (b.n - b.m - b.l) + '</b> new (of ' + b.n + ' words).</p>' +
    '<h3>How many words?</h3><div class="seg" id="s-n">' + [10, 20, 40, b.n].map((n, i) => '<button data-v="' + n + '"' + (i === 1 ? ' class="on"' : '') + '>' + (i === 3 ? 'All ' + n : n) + '</button>').join('') + '</div>' +
    '<h3>Which words first?</h3><div class="seg" id="s-o"><button data-v="weak" class="on">My mistakes and new words</button><button data-v="random">Random</button><button data-v="abc">A to Z</button></div>' +
    '<div class="actions"><button class="primary" id="go">Start typing</button><a class="ghost" style="text-decoration:none" href="#home">Back</a></div></div>';
  let n = 20, o = 'weak';
  $$('#s-n button').forEach(x => { x.onclick = () => { $$('#s-n button').forEach(y => y.classList.remove('on')); x.classList.add('on'); n = +x.dataset.v; }; });
  $$('#s-o button').forEach(x => { x.onclick = () => { $$('#s-o button').forEach(y => y.classList.remove('on')); x.classList.add('on'); o = x.dataset.v; }; });
  $('#go').onclick = () => startSession('cat', pickCat(c, n, o), { cat: c });
}

function hintText(id) {
  const t = target(id), h = sess.hint; if (!h) return '';
  return t.split('').map((ch, i) => (ch === ' ' || ch === '-') ? ch : (i < h - 1 ? ch : '_')).join(' ');
}
function renderSession() {
  head('');
  if (!sess) { location.hash = '#home'; return; }
  const ph = sess.phase;
  if (ph === 'done') { viewResults(); return; }
  const id = sess.cur.id, answered = sess.rows.length, shownN = sess.cur.retry ? answered : Math.min(sess.total, answered + 1), mode = promptMode();
  let h = '<div class="test"><div class="tprog"><span><b>' + shownN + '</b> of ' + sess.total + (sess.cur.retry ? ' · second chance' : '') + '</span><span class="pb"><i style="width:' + (answered / sess.total * 100) + '%"></i></span><span>' + sess.correct + ' correct</span><button class="ghost sm" id="quit">' + (sess.exam ? 'Stop test' : 'Finish') + '</button></div>';
  if (ph === 'ask') {
    h += '<div class="say">' + (mode !== 'see' ? '<button class="spk" id="spk" aria-label="Hear the word again">' + SPK + '</button><div class="side"><button class="ghost sm" id="slow">Slow</button></div>' : '') + '</div>';
    if (mode !== 'hear') h += '<div class="flash" id="flash">' + esc(target(id)) + '</div>';
    h += '<div class="cue">' + (sess.mode === 'cat' ? esc(D.cats[sess.cat].short) + ' · ' : '') + (mode === 'see' ? 'Look at the word, then type it from memory.' : 'Type the word you hear.') + '</div>' +
      '<input class="ans" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type the word" value="' + esc(sess.typed || '') + '"><div class="hintline" id="hint">' + esc(hintText(id)) + '</div>' +
      '<div class="row"><button class="primary" id="chk">Check ↵</button>' + (sess.exam ? '' : '<button class="ghost" id="hintb">Hint</button>') + '<button class="ghost" id="dk">' + (sess.exam ? 'Skip' : "I don't know") + '</button></div>' +
      '<div class="kbd">Enter = check · Ctrl+Space = replay' + (sess.exam ? ' · one replay allowed' : '') + '</div>';
  } else if (ph === 'ok') {
    const alt = sess.accepted && norm(sess.accepted) !== norm(target(id));
    h += '<div class="pop">✓ ' + (sess.cur.retry ? 'Got it this time' : 'Correct') + '</div><div class="trap" style="text-align:center">' + esc(sess.accepted || target(id)) + '</div>' + (alt ? '<p class="small" style="text-align:center">Accepted. The list spells it “' + esc(target(id)) + '”.</p>' : '') +
      (D.notes[id] ? '<p class="small" style="text-align:center">' + esc(D.notes[id]) + '</p>' : '') + '<div class="row"><button class="ghost" id="nx">Next ↵</button></div>';
  } else if (ph === 'fb') {
    const best = closest(id, sess.lastTyped || ''), cl = classify(sess.lastTyped || '', best), tr = traps(best), cat = D.cats[catOf(id)];
    h += '<div class="fb"><p style="text-align:center;margin:0"><span class="etype">' + (LABEL[cl.type] || 'Mistake') + '</span><b>Not quite.</b></p>' + diffHTML(sess.lastTyped || '', best) +
      '<div class="box same"><span class="lab">What went wrong</span><p>' + (cl.d ? esc(cl.d.replace(/\.$/, '')) + '. ' : '') + esc(TIPS[cl.type]) + '</p></div>' +
      '<div class="box get"><span class="lab">The word, with the trap letters marked</span><div class="trap">' + tr.html + '</div><div class="legend">' + tr.legend + '</div>' +
      (D.notes[id] ? '<p class="small" style="margin:6px 0 0"><b>Note:</b> ' + esc(D.notes[id]) + '</p>' : '') + '</div>' +
      (cat.intro ? '<details class="small"><summary>Why ' + esc(cat.short.toLowerCase()) + ' words are tricky</summary><p style="margin-top:6px">' + esc(cat.intro) + '</p></details>' : '') +
      '<div class="row"><button class="ghost" id="hear2">' + (TTS.ok ? 'Hear it again' : '') + '</button><button class="primary" id="fixb">Fix it: type it 3 times ↵</button></div></div>';
  } else if (ph === 'fix') {
    const f = sess.fix, tr = traps(target(id)), hide = f.n > 0 && !f.peeked;
    h += '<div class="fb"><h3 style="text-align:center;margin-top:6px">Fix it</h3><div class="copies">' + [0, 1, 2].map(i => '<span class="dot' + (i < f.n ? ' done' : i === f.n ? ' on' : '') + '">' + (i < f.n ? '✓' : i + 1) + '</span>').join('') + '</div>' +
      (hide ? '<div class="flash hidden">Word covered. Type it from memory.</div><div class="row"><button class="ghost sm" id="peek">Peek</button></div>' : '<div class="trap" style="text-align:center">' + tr.html + '</div><div class="legend" style="justify-content:center">' + tr.legend + '</div>') +
      (f.bad != null ? '<div class="box warn"><span class="lab">Not quite. Look at the word again.</span>' + diffHTML(f.bad, closest(id, f.bad)) + '</div>' : '') +
      '<div class="cue">' + (f.n === 0 ? 'Copy 1 of 3: type it while you look at it.' : 'Copy ' + (f.n + 1) + ' of 3: cover it and type it from memory.') + '</div>' +
      '<input class="ans" id="fans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type the word"><div class="row"><button class="primary" id="fchk">Check ↵</button></div></div>';
  } else if (ph === 'fixdone') {
    h += '<div class="fb"><div class="pop">✓ Fixed. ' + esc(target(id)) + '</div><p class="small" style="text-align:center">This word will come back in a few words so you can prove you remember it.</p><div class="row"><button class="primary" id="cont">Continue ↵</button></div></div>';
  }
  h += '</div>'; app.innerHTML = h;
  bindSession(id, mode);
}
function bindSession(id, mode) {
  const ph = sess.phase, ans = $('#ans'), q = $('#quit');
  if (q) q.onclick = () => { clearTimeout(timer); if (sess.exam || sess.rows.length) { sess.queue = []; sess.phase = 'done'; renderSession(); } else { sess = null; location.hash = '#home'; } };
  if (ph === 'ask') {
    const speak = () => {
      if (!sess || sess.phase !== 'ask' || sess.cur.id !== id || mode === 'see') return;
      if (sess.exam && sess.replays > 1) return;
      say(target(id), sess.slow ? 0.55 : S.set.rate);
    };
    if (ans) { ans.focus(); ans.setSelectionRange(ans.value.length, ans.value.length); }
    const spk = $('#spk'); if (spk) spk.onclick = () => { if (sess.exam) { if (sess.replays >= 1) { spk.disabled = true; return; } sess.replays++; } sess.slow = false; say(target(id), S.set.rate); ans.focus(); };
    const sl = $('#slow'); if (sl) { if (sess.exam) sl.hidden = true; sl.onclick = () => { say(target(id), 0.5); ans.focus(); }; }
    $('#chk').onclick = () => { if (ans.value.trim()) submit(ans.value, false); else ans.focus(); };
    $('#dk').onclick = () => submit('', true);
    const hb = $('#hintb'); if (hb) hb.onclick = () => { sess.hint = Math.min(target(id).length, sess.hint + 1); sess.hinted = true; sess.typed = ans.value; $('#hint').textContent = hintText(id); ans.focus(); };
    if (mode !== 'hear') { const fl = $('#flash'); if (fl) { timer = setTimeout(() => { fl.classList.add('hidden'); fl.innerHTML = '<span style="cursor:pointer" id="show2">Word hidden. Click to show it again (counts as a hint).</span>'; const s2 = $('#show2'); if (s2) s2.onclick = () => { sess.hinted = true; fl.classList.remove('hidden'); fl.textContent = target(id); }; }, Math.max(1, S.set.flash) * 1000); } }
    if (mode !== 'see') { timer = timer || null; setTimeout(speak, 200); }
  } else if (ph === 'ok') { const n = $('#nx'); if (n) n.onclick = () => { clearTimeout(timer); nextWord(); }; }
  else if (ph === 'fb') { const f = $('#fixb'); f.onclick = startFix; f.focus(); const h2 = $('#hear2'); if (h2) { if (!TTS.ok) h2.hidden = true; h2.onclick = () => say(target(id), S.set.rate); } }
  else if (ph === 'fix') {
    const fa = $('#fans'); fa.focus(); const go = () => { if (fa.value.trim()) fixSubmit(fa.value); }; $('#fchk').onclick = go;
    const pk = $('#peek'); if (pk) pk.onclick = () => { sess.fix.peeked = true; renderSession(); };
  } else if (ph === 'fixdone') { const c = $('#cont'); c.onclick = afterFix; c.focus(); }
}
document.addEventListener('keydown', e => {
  if (!sess || location.hash !== '#test') return;
  const ph = sess.phase;
  if (e.key === 'Enter') {
    if (ph === 'ask') { const a = $('#ans'); if (a && a.value.trim()) { e.preventDefault(); submit(a.value, false); } }
    else if (ph === 'ok') { e.preventDefault(); clearTimeout(timer); nextWord(); }
    else if (ph === 'fb') { e.preventDefault(); startFix(); }
    else if (ph === 'fix') { const f = $('#fans'); if (f && f.value.trim()) { e.preventDefault(); fixSubmit(f.value); } }
    else if (ph === 'fixdone') { e.preventDefault(); afterFix(); }
  }
  if (e.ctrlKey && e.code === 'Space' && ph === 'ask') { e.preventDefault(); const s = $('#spk'); if (s) s.click(); }
});

function viewResults() {
  head(''); clearTimeout(timer);
  const done = sess.rows.length, ok = sess.rows.filter(r => r.ok).length, miss = sess.rows.filter(r => !r.ok), mins = Math.max(1, Math.round((Date.now() - sess.t0) / 60000));
  if (sess.exam && done) { S.exam.push(ok); S.exam = S.exam.slice(-20); save(); }
  const pct = done ? Math.round(ok / done * 100) : 0, cls = pct >= 90 ? 'good' : pct >= 70 ? 'mid' : 'low';
  const types = {}; miss.forEach(r => { const best = closest(r.id, r.typed || ''), c = classify(r.typed || '', best); types[c.type] = (types[c.type] || 0) + 1; });
  let h = '<div class="hero"><h1>' + (sess.exam ? 'Exam test results' : 'Session complete') + '</h1></div><div class="result ' + cls + '"><span class="big">' + ok + '<span> / ' + done + '</span></span> &nbsp; first-time correct (' + pct + '%) · about ' + mins + ' min' +
    (sess.exam ? '<br><span class="small">In the real test every misspelled word scores zero, so this is your Listening spelling score.</span>' : '') + '</div>';
  if (Object.keys(types).length) h += '<div class="card"><b>What went wrong</b><div class="errs" style="margin-top:8px">' + Object.keys(types).sort((a, b) => types[b] - types[a]).map(k => '<div class="erow"><span>' + LABEL[k] + '</span><span class="bar"><i style="width:' + (types[k] / miss.length * 100) + '%"></i></span><b>' + types[k] + '</b></div>').join('') + '</div></div>';
  if (miss.length) {
    h += '<h2>Words to fix (' + miss.length + ')</h2>' + miss.map(r => { const best = closest(r.id, r.typed || ''), tr = traps(best); return '<div class="card"><div class="trap">' + tr.html + '</div><div class="legend">' + tr.legend + '</div>' + (r.hinted ? '<p class="small" style="margin:0">You needed a hint on this one, so it counts as a word to practise.</p>' : diffHTML(r.typed || '', best)) + '</div>'; }).join('');
  } else h += '<div class="box get"><span class="lab">Perfect</span><p>Every word was right first time.</p></div>';
  if (sess.exam && done) h += '<h2>All answers</h2><div class="tablewrap"><table><tr><th>#</th><th>Word</th><th>You typed</th></tr>' + sess.rows.map((r, i) => '<tr><td>' + (i + 1) + '</td><td class="k mono">' + esc(target(r.id)) + '</td><td class="mono" style="color:' + (r.ok ? 'var(--ok)' : 'var(--bad)') + '">' + (r.typed ? esc(r.typed) : '<i>no answer</i>') + (r.ok ? ' ✓' : '') + '</td></tr>').join('') + '</table></div>';
  h += '<div class="actions">' + (miss.length ? '<button class="primary" id="again">Practise the ' + miss.length + ' missed word' + (miss.length > 1 ? 's' : '') + ' now</button>' : '') + '<a class="ghost" style="text-decoration:none" href="#home">Back to home</a></div>';
  app.innerHTML = h;
  const again = $('#again'); if (again) again.onclick = () => startSession('mistakes', miss.map(r => r.id));
  sess = null;
}

function viewMistakes() {
  head('mistakes'); const ids = mistakeIds(), fixed = []; for (let i = 0; i < N; i++) { const r = get(i); if (r && r.x && r.b >= MASTER) fixed.push(i); }
  let h = '<div class="hero"><h1>My mistakes</h1><p class="sub">Every word you got wrong, with the wrong versions you typed. A word leaves this list when you have recalled it correctly three times over several days.</p></div>';
  h += '<div class="stats"><div class="stat"><div class="n">' + ids.length + '</div><div class="t">To fix</div></div><div class="stat"><div class="n">' + fixed.length + '</div><div class="t">Fixed</div></div></div>';
  if (ids.length) h += '<div class="actions"><button class="primary" id="rt">Retest these words (' + Math.min(40, ids.length) + ')</button></div>';
  h += errBlock();
  h += '<h2>To fix</h2>' + (ids.length ? ids.map(id => { const r = get(id), tags = Object.keys(r.e || {}).map(k => LABEL[k]).join(', '); return '<div class="mrow"><button class="sp" data-say="' + id + '" aria-label="Hear it">' + SPK + '</button><div><span class="w">' + esc(target(id)) + '</span>' + (r.bad || []).map(b => '<span class="bad">' + esc(b) + '</span>').join('') + '</div><span class="small">wrong ' + r.x + '×</span><div class="tags">' + esc(D.cats[catOf(id)].short) + (tags ? ' · ' + esc(tags) : '') + '</div></div>'; }).join('') : '<p class="small">No mistakes to fix. Take the daily review or the exam test and they will appear here.</p>');
  app.innerHTML = h;
  const rt = $('#rt'); if (rt) rt.onclick = () => startSession('mistakes', ids.slice(0, 40));
  $$('[data-say]').forEach(b => { b.onclick = () => say(target(+b.dataset.say), S.set.rate); });
}
function viewRules() {
  head('rules');
  app.innerHTML = '<div class="hero"><h1>Rules and tips</h1><p class="sub">The five trap families from your PDF, and how this lab uses them.</p></div>' +
    '<div class="tablewrap"><table><tr><th>Trap</th><th>Common mistake</th><th>Correct spelling</th><th>Memory tip</th></tr>' + D.traps.map(t => '<tr><td class="k">' + esc(t[0]) + '</td><td class="mono" style="color:var(--bad)">' + esc(t[1]) + '</td><td class="mono"><b>' + esc(t[2]) + '</b></td><td>' + esc(t[3]) + '</td></tr>').join('') + '</table></div>' +
    '<h2>The three-step routine</h2>' + D.protocol.map((p, i) => '<div class="box ' + ['tech', 'same', 'get'][i] + '"><span class="lab">' + (i + 1) + '. ' + esc(p[0]) + '</span><p>' + esc(p[1]) + '</p></div>').join('') +
    '<h2>How the lab applies it</h2><div class="card"><ol><li><b>Dictation:</b> the daily review and the exam test say a word and you type it.</li><li><b>Trap highlighting:</b> after every mistake the word is shown with its doubled letters, silent letters and ending vowels marked, then you type it three times.</li><li><b>Transfer check:</b> the lab accepts British and American spellings, so check which one you use and keep it consistent in a test.</li></ol></div>' +
    '<h2>Spellings the lab accepts</h2><div class="card"><p>Both of these are accepted (the first is the spelling in your list):</p><p class="mono small">' + Object.keys(D.alt).map(k => esc(D.words[k]) + ' / ' + esc(D.alt[k].join(' / '))).join(' · ') + '</p>' +
    '<p class="small">Three entries in the PDF are written as one word but are normally two: <b>air conditioner</b>, <b>board game</b>, <b>bed sheet</b>. The lab teaches the two-word forms.</p></div>';
}
function viewBrowse() {
  head('browse');
  app.innerHTML = '<div class="hero"><h1>Word list</h1><p class="sub">All ' + N + ' words for reference. Tap a word to hear it. Coloured dots show your progress.</p></div><input class="search" id="q" placeholder="Search words…" autocomplete="off" spellcheck="false"><div id="wl"></div>';
  const draw = () => {
    const q = norm($('#q').value); let h = '';
    D.cats.forEach((c, ci) => {
      let ws = ''; for (let i = c.start; i < c.end; i++) { const t = target(i); if (q && t.toLowerCase().indexOf(q) < 0) continue; const r = get(i); const k = r && r.x && r.b < MASTER ? 'x' : r && r.b >= MASTER ? 'm' : r && r.s ? 'l' : ''; ws += '<span class="wchip" data-say="' + i + '"><span class="dotk ' + k + '"></span>' + esc(t) + '</span>'; }
      if (ws) h += '<h3>' + (ci + 1) + '. ' + esc(c.short) + '</h3><div>' + ws + '</div>';
    });
    $('#wl').innerHTML = h || '<p class="small">No word matches.</p>';
    $$('#wl [data-say]').forEach(b => { b.onclick = () => say(target(+b.dataset.say), S.set.rate); });
  };
  $('#q').oninput = draw; draw();
}
function settings() {
  const vs = voices(), m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = '<div class="box2"><h2 style="margin-top:0">Settings</h2><div class="row2"><label for="sv">Voice</label><select id="sv"><option value="">Automatic (best match)</option>' + vs.map(v => '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === S.set.voice ? ' selected' : '') + '>' + esc(v.name + ' · ' + v.lang) + '</option>').join('') + '</select>' + (TTS.ok ? '' : '<span class="small">This browser cannot speak. The lab will flash each word instead.</span>') + '</div>' +
    '<div class="row2"><label for="sr">Speed</label><select id="sr">' + [[0.6, 'Slow'], [0.8, 'Normal for spelling'], [1, 'Natural']].map(r => '<option value="' + r[0] + '"' + (+S.set.rate === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select></div>' +
    '<div class="row2"><label>How each word is given</label><div class="seg" id="sp">' + [['hear', 'Hear it'], ['see', 'See it briefly'], ['both', 'Both']].map(p => '<button data-v="' + p[0] + '"' + (S.set.prompt === p[0] ? ' class="on"' : '') + '>' + p[1] + '</button>').join('') + '</div><span class="small">The exam test always uses audio.</span></div>' +
    '<div class="row2"><label for="sf">Seconds the word stays visible</label><select id="sf">' + [1, 2, 3, 5].map(n => '<option' + (+S.set.flash === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>' +
    '<div class="row2"><label for="sz">Words in the daily review</label><select id="sz">' + [20, 40, 60].map(n => '<option' + (+S.set.size === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>' +
    '<div class="actions"><button class="ghost sm" id="tv">Test the voice</button><button class="primary sm" id="ok">Done</button><button class="danger sm" id="rs">Reset all progress</button></div></div>';
  document.body.appendChild(m);
  $('#sv', m).onchange = e => { S.set.voice = e.target.value; save(); }; $('#sr', m).onchange = e => { S.set.rate = +e.target.value; save(); };
  $('#sf', m).onchange = e => { S.set.flash = +e.target.value; save(); }; $('#sz', m).onchange = e => { S.set.size = +e.target.value; save(); };
  $$('#sp button', m).forEach(b => { b.onclick = () => { S.set.prompt = b.dataset.v; save(); $$('#sp button', m).forEach(x => x.classList.toggle('on', x === b)); }; });
  $('#tv', m).onclick = () => say('accommodation', S.set.rate);
  $('#ok', m).onclick = () => { m.remove(); route(); };
  let armed = false; $('#rs', m).onclick = e => { if (!armed) { armed = true; e.target.textContent = 'Click again to erase everything'; return; } S = JSON.parse(JSON.stringify(DEF)); save(); m.remove(); sess = null; location.hash = '#home'; route(); };
  m.onclick = e => { if (e.target === m) m.remove(); };
}
function route() {
  const h = (location.hash || '#home').slice(1).split('/');
  if (h[0] === 'test' && sess && sess.skipRoute) { sess.skipRoute = false; return; }
  clearTimeout(timer);
  if (h[0] === 'test') { if (sess) { renderSession(); return; } location.hash = '#home'; return; }
  if (sess && h[0] !== 'test') sess = null;
  if (h[0] === 'setup' && D.cats[+h[1]]) viewSetup(+h[1]);
  else if (h[0] === 'mistakes') viewMistakes();
  else if (h[0] === 'rules') viewRules();
  else if (h[0] === 'browse') viewBrowse();
  else viewHome();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
$('#setbtn').onclick = settings;
window.SPLAB = { classify, traps, isCorrect, closest, target, forms, silentSet };
route();
})();
