"""Verify the local question database against the final PDF's master section and answer key.

Usage: python scripts/verify-pdf.py path/to/final.pdf
Requires pypdf. The PDF is a verification input, not a runtime asset.
"""
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
pdf = PdfReader(sys.argv[1])
data = json.loads((root / "questions.json").read_text(encoding="utf-8"))
master = "\n".join(page.extract_text() for page in pdf.pages[1:132])
key_text = "\n".join(page.extract_text() for page in pdf.pages[132:135])
ids = [int(value) for value in re.findall(r"問題(\d+)\s*\n", master)]
keys = {int(number): "①②③".index(mark) for number, mark in re.findall(r"問題(\d+)\s*([①②③])", key_text)}
assert len(ids) == 379 and sorted(ids) == list(range(1, 380)), "Master question markers differ"
assert len(keys) == 379 and sorted(keys) == list(range(1, 380)), "Answer key is incomplete"
assert all(keys[q["id"]] == q["correctIndex"] for q in data), "Correct answer differs from PDF"
assert len(re.findall(r"【画像", master)) == 71, "PDF image labels differ"
assert sum(q["image"] is not None for q in data) == 71, "Question image mapping differs"
print("PDF verification passed: 379 master question markers, 379 matching answer keys, 71 image labels.")
