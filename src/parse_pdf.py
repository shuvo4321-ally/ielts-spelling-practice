"""Rebuild cats.json from the source PDF (needs PyMuPDF):  python parse_pdf.py path/to/ielts_listening_1000_spelling_words.pdf

The PDF lists words in numbered 4-column tables under 18 headings like "1. Title (64 Words)". Each category is read by its
own number range, so the drill table at the end of the PDF is never mistaken for words.
"""
import fitz, json, os, re, sys

pdf = sys.argv[1]
text = "\n".join(p.get_text() for p in fitz.open(pdf))
heads = list(re.finditer(r"^(\d{1,2})\.\s+(.+?)\s*\((\d+)\s*Words\)", text, re.M))
cats, start = [], 1
for i, m in enumerate(heads):
    count = int(m.group(3))
    end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
    body = text[m.end():end]
    items = [(int(a), b) for a, b in re.findall(r"(?<!\d)(\d{1,4})\.\s*\n?\s*([A-Za-z][A-Za-z'’\-]*)", body) if start <= int(a) < start + count]
    assert [a for a, _ in items] == list(range(start, start + count)), f"category {m.group(1)}: numbering is not {start}..{start + count - 1}"
    intro = re.sub(r"\s+", " ", body.split("Column 1")[0]).strip()
    cats.append(dict(n=int(m.group(1)), title=re.sub(r"\s+", " ", m.group(2)), intro=intro, words=[w for _, w in items]))
    start += count
json.dump(cats, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{sum(len(c['words']) for c in cats)} words in {len(cats)} categories")
