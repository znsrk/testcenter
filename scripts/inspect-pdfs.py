"""Inspect local task PDFs without changing the originals (requires pypdf)."""
import sys
import re
from pathlib import Path
from pypdf import PdfReader

sys.stdout.reconfigure(encoding="utf-8")
for path in sorted(Path("Tasks").rglob("*.pdf")):
    if "--national" in sys.argv and "Respublika" not in str(path):
        continue
    print(f"\n=== {path} ===")
    reader = PdfReader(path)
    for number, page in enumerate(reader.pages, 1):
        text = page.extract_text() or "[No text layer; OCR required]"
        if "--outline" in sys.argv:
            lines = text.splitlines()
            markers = re.compile(r"task|time|score|points|words|listen|writ|match|true|false|complete|choose|question|gap|form|read", re.I)
            text = "\n".join(line for line in lines if markers.search(line))
            text = text[:3000]
        print(f"--- Page {number} ---\n{text}")
