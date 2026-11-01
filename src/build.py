"""Build index.html for the IELTS Spelling Lab.

Reads cats.json (the 1,128 words parsed from the PDF, in 18 categories) plus curated.py, checks them, and writes the page.
Checks: exactly 1,128 words with no duplicates; every alternative/correction refers to a real word; every word is letters only.
"""
import json, os, re, sys
from curated import SHORT, SHOW, ALT, TRAPS, PROTOCOL

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "index.html")
cats = json.load(open(os.path.join(HERE, "cats.json"), encoding="utf-8"))
problems = []

words, cat_of, cat_meta, start = [], [], [], 0
for i, c in enumerate(cats):
    for w in c["words"]:
        words.append(w.lower())
        cat_of.append(i)
    intro = re.sub(r"\(Source:[^)]*\)", "", c["intro"]).strip()
    intro = re.sub(r"\s+", " ", intro)
    cat_meta.append(dict(title=c["title"], short=SHORT[c["n"]], intro=intro, start=start, end=start + len(c["words"])))
    start += len(c["words"])

if len(words) != 1128:
    problems.append(f"expected 1128 words, found {len(words)}")
dups = sorted({w for w in words if words.count(w) > 1})
if dups:
    problems.append(f"duplicate words: {dups}")
for w in words:
    if not re.fullmatch(r"[a-z]{4,20}", w):
        problems.append(f"unexpected characters in {w!r}")
index = {w: i for i, w in enumerate(words)}

show, alt, notes = {}, {}, {}
for w, (form, extra, note) in SHOW.items():
    if w not in index:
        problems.append(f"SHOW word not in list: {w}")
        continue
    show[str(index[w])] = form
    if extra:
        alt[str(index[w])] = extra
    notes[str(index[w])] = note
for w, forms in ALT.items():
    if w not in index:
        problems.append(f"ALT word not in list: {w}")
        continue
    if str(index[w]) in alt:
        alt[str(index[w])] += forms
    else:
        alt[str(index[w])] = forms
    if any(f == w for f in forms):
        problems.append(f"ALT of {w} repeats itself")

if problems:
    print("PROBLEMS:")
    for p in problems:
        print("  -", p)
    sys.exit(1)

data = dict(cats=cat_meta, words=words, catOf=cat_of, show=show, alt=alt, notes=notes, traps=TRAPS, protocol=PROTOCOL)
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
css = open(os.path.join(HERE, "style.css"), encoding="utf-8").read()
js = open(os.path.join(HERE, "app.js"), encoding="utf-8").read()
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="description" content="IELTS Listening spelling practice: 1,128 words. Hear each word and type it. Mistakes are explained, fixed and brought back until they stick.">\n'
        '<title>IELTS Spelling Lab</title>\n<style>\n' + css + '</style>\n</head>\n<body>\n'
        '<header class="top"><a class="brand" href="#home">IELTS Spelling Lab</a><nav id="nav"></nav><button type="button" class="gear" id="setbtn">Settings</button></header>\n'
        '<main id="app"></main>\n<script>window.SP=' + blob + ';</script>\n<script>\n' + js + '\n</script>\n</body>\n</html>\n')
open(OUT, "w", encoding="utf-8").write(page)
print(f"OK  {len(words)} words in {len(cats)} categories · {len(alt)} words with accepted alternatives · {len(show)} corrected · page {len(page) // 1024} KB")
