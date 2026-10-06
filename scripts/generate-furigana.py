"""Generate an auditable furigana map without changing canonical question text.

Requires fugashi/unidic-lite, sudachipy/sudachidict_core, and pykakasi for
offline generation. The deployed app needs none of those packages.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import json
import re
import sys
import unicodedata as ud

from fugashi import Tagger
from pykakasi.kanji import Kanwa
from sudachipy import dictionary

REPO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else REPO / 'furigana.json'
AUDIT = Path(sys.argv[3]) if len(sys.argv) > 3 else REPO / 'scripts' / 'furigana-audit.json'
UI_SEEDS = Path(sys.argv[4]) if len(sys.argv) > 4 else REPO / 'scripts' / 'furigana-ui-seeds.json'

tagger = Tagger()
kanwa = Kanwa()
sudachi = dictionary.Dictionary().create()

READING_OVERRIDES = {
    '腹痛': 'ふくつう', '何分': 'なんぷん', '日本': 'にほん',
    '正しく': 'ただしく', '取り除け': 'とりのぞけ', '手': 'て',
}
SPLIT_OVERRIDES = {
    '一般': ['いっ', 'ぱん'], '受入': ['うけ', 'いれ'],
    '受入れ': ['うけ', 'い', None], '大豆': ['だい', 'ず'],
    '履物': ['はき', 'もの'], '指差': ['ゆび', 'さし'],
    '文字': ['も', 'じ'], '時計': ['と', 'けい'],
    '脚立': ['きゃ', 'たつ'], '腰痛': ['よう', 'つう'],
    '腹痛': ['ふく', 'つう'], '自然': ['し', 'ぜん'],
    '財布': ['さい', 'ふ'], '鉛筆': ['えん', 'ぴつ'],
    '何分': ['なん', 'ぷん'], '日本': ['に', 'ほん'],
    '１日': [None, 'ついたち'],
    '受付': ['うけ', 'つけ'],
}
GROUP_EXCEPTIONS = {
    '一人': 'ひとり', '二人': 'ふたり', '炒飯': 'ちゃーはん',
    '牡蠣': 'かき',
}


def hira(s: str) -> str:
    return ''.join(chr(ord(c) - 0x60) if '\u30a1' <= c <= '\u30f6' else c for c in s)


def is_kanji(c: str) -> bool:
    return ('\u3400' <= c <= '\u9fff') or c in '々〆ヶ﨑髙𠮷'


def candidates(c: str, remaining: str, noninitial=False, after_n=False) -> list[str]:
    table = kanwa.load(c) or {}
    got = []
    for key, readings in table.items():
        if key == c:
            got.extend(hira(x) for x, _ in readings)
        elif key.startswith(c) and len(key) > 1 and remaining.startswith(key) and all(not is_kanji(x) for x in key[1:]):
            tail = hira(key[1:])
            got.extend(hira(x)[:-len(tail)] for x, _ in readings if hira(x).endswith(tail) and len(hira(x)) > len(tail))
    for val in list(got):
        if val.endswith(('く', 'つ', 'ち', 'き')):
            got.append(val[:-1] + 'っ')
        if noninitial and val:
            voiced = {'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご',
                      'さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
                      'た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど',
                      'は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ'}
            if val[0] in voiced:
                got.append(voiced[val[0]] + val[1:])
        if after_n and val.startswith('お'):
            got.append('の' + val[1:])
    return list(dict.fromkeys(got))


def align(surface: str, reading: str) -> list[tuple[tuple[str, str | None], ...]]:
    surface = ud.normalize('NFC', surface)
    reading = hira(reading)
    if surface in GROUP_EXCEPTIONS:
        return [((surface, GROUP_EXCEPTIONS[surface]),)]
    if surface in SPLIT_OVERRIDES:
        vals = SPLIT_OVERRIDES[surface]
        assert len(vals) == len(surface)
        return [tuple(zip(surface, vals))]
    cache = {}

    def solve(i, j):
        if (i, j) in cache:
            return cache[i, j]
        if i == len(surface):
            return [()] if j == len(reading) else []
        c = surface[i]
        solutions = []
        if is_kanji(c):
            opts = candidates(c, surface[i:], i > 0, j > 0 and reading[j-1] == 'ん')
            if sum(is_kanji(x) for x in surface) == 1:
                for end in range(j + 1, len(reading) + 1):
                    for rest in solve(i + 1, end):
                        solutions.append(((c, reading[j:end]),) + rest)
            else:
                for val in opts:
                    if reading.startswith(val, j):
                        for rest in solve(i + 1, j + len(val)):
                            solutions.append(((c, val),) + rest)
        else:
            match = hira(c)
            if reading.startswith(match, j):
                for rest in solve(i + 1, j + len(match)):
                    solutions.append(((c, None),) + rest)
        cache[i, j] = solutions[:50]
        return cache[i, j]
    return solve(0, 0)


def compact(parts):
    out = []
    for base, reading in parts:
        if reading is None and out and out[-1][1] is None:
            out[-1][0] += base
        else:
            out.append([base, reading])
    return out


def annotate(text: str, issues: dict, stats: Counter, term_reads: dict):
    parts = []
    cursor = 0
    sud_by_span = {}
    scursor = 0
    for token in sudachi.tokenize(text):
        surf = token.surface()
        at = text.find(surf, scursor)
        if at >= 0:
            sud_by_span[(at, at + len(surf))] = token.reading_form()
            scursor = at + len(surf)
    for token in tagger(text):
        surface = token.surface
        at = text.find(surface, cursor)
        if at < 0:
            raise AssertionError((surface, text, cursor))
        if at > cursor:
            parts.append((text[cursor:at], None))
        cursor = at + len(surface)
        if not any(is_kanji(c) for c in surface):
            parts.append((surface, None))
            continue
        stats['kanji_tokens'] += 1
        stats['kanji_characters'] += sum(is_kanji(c) for c in surface)
        kana = READING_OVERRIDES.get(surface, getattr(token.feature, 'kana', None))
        if surface == '月' and at > 0 and text[at - 1].isdigit():
            kana = 'がつ'
        if surface == '分' and at > 0 and text[at - 1].isdigit():
            m = re.search(r'[0-9０-９]+$', text[:at])
            number = int(ud.normalize('NFKC', m.group()))
            kana = 'ぷん' if number % 10 in (0, 1, 3, 6, 8) else 'ふん'
        if not kana:
            issues['no_reading'].append([surface, text])
            parts.append((surface, None))
            continue
        options = align(surface, kana)
        if not options:
            issues['unaligned'].append([surface, hira(kana), text])
            parts.append((surface, None))
            continue
        if len(options) > 1:
            issues['ambiguous_split'].append([surface, hira(kana), [list(x) for x in options[:4]], text])
        parts.extend(options[0])
        term_reads[surface][tuple(options[0])] += 1
        sr = sud_by_span.get((at, at + len(surface)))
        if sr and sr != 'キゴウ' and hira(sr) != hira(kana):
            issues['dictionary_disagreement'].append([surface, hira(kana), hira(sr), text])
    if cursor < len(text):
        parts.append((text[cursor:], None))
    out = compact(parts)
    if ''.join(p[0] for p in out) != text:
        raise AssertionError(('base_changed', text))
    return out


questions = json.loads((REPO / 'questions.json').read_text(encoding='utf-8'))
strings = set()
for q in questions:
    for key in ('section', 'category', 'question', 'source', 'explanation'):
        strings.add(q[key])
    strings.update(q['choices'])
strings.update(json.loads(UI_SEEDS.read_text(encoding='utf-8')))

issues = defaultdict(list)
stats = Counter()
term_reads = defaultdict(Counter)
data = {s: annotate(s, issues, stats, term_reads) for s in sorted(strings)}
term_conflicts = {}
terms = {}
for surface, variants in term_reads.items():
    parts, _ = variants.most_common(1)[0]
    terms[surface] = compact(parts)
    if len(variants) > 1:
        term_conflicts[surface] = [[list(map(list, variant)), n] for variant, n in variants.most_common()]
OUT.write_text(json.dumps({'texts': data, 'terms': terms}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
AUDIT.write_text(json.dumps({
    'stats': stats,
    'issues': issues,
    'issue_counts': {k: len(v) for k, v in issues.items()},
    'unique_strings': len(strings),
    'term_conflicts': term_conflicts,
    'ruby_elements': sum(p[1] is not None for v in data.values() for p in v),
    'uncovered_kanji': sum(is_kanji(c) for v in data.values() for p in v if p[1] is None for c in p[0]),
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('strings', len(strings), 'terms', len(terms), 'stats', stats)
print('issues', {k: len(v) for k, v in issues.items()})
print('term_conflicts', len(term_conflicts), list(term_conflicts.items())[:10])
for key, values in issues.items():
    print(key, 'unique', len({str(x[0:2]) for x in values}), 'sample', values[:15])
