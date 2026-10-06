# Furigana review

The canonical `questions.json` and all 24 JPEG assets are unchanged. Readings
are stored separately. Removing `<rt>` from rendered text yields the original
base text. The local validator checks 379 question records, 1,627 distinct
question strings, 112 UI seeds, and 15,358 ruby elements across 1,731 distinct
strings. No kanji in these strings is left without a reading.

## Whole-word ruby exceptions

These readings cannot be split reliably per character, so each word receives
one ruby element. Counts are occurrences in distinct stored strings.

| Base | Reading | Count |
| --- | --- | ---: |
| 一人 | ひとり | 13 |
| 二人 | ふたり | 6 |
| 牡蠣 | かき | 1 |
| 炒飯 | ちゃーはん | 1 |

## Readings reviewed in context

Fugashi/UniDic and Sudachi disagreed 40 times across eight surface forms:
`分`, `何分`, `手`, `頭`, `目`, `腹痛`, `身近`, and `正しく`.
The readings were reviewed in their sentences, including numeric minutes
(`10分` → `じゅっぷん`; the ruby is `ぷん` above 分), `何分` → `なんぷん`,
`手` → `て`, `頭` → `あたま`, `目` → `め`, `腹痛` → `ふくつう`,
`身近` → `みぢか`, and `正しく` → `ただしく`.
Additional explicit splits cover sound changes such as `一般` →
`いっ` + `ぱん` and `大豆` → `だい` + `ず`.

References: [漢字ペディア: 腹痛](https://www.kanjipedia.jp/kotoba/0006118400),
[漢字ペディア: 牡蠣](https://www.kanjipedia.jp/kotoba/0006321300),
[国立国語研究所: 正しい](https://www2.ninjal.ac.jp/dictionaries/IPALBA/pdf_dir/%E3%81%9F%E3%81%A0%E3%81%97%E3%81%84.pdf),
[Kotobank: 身近](https://kotobank.jp/word/%E8%BA%AB%E8%BF%91-638480),
[Kotobank: 炒飯](https://kotobank.jp/word/%E3%81%A1%E3%82%84%E3%83%BC%E3%81%AF%E3%82%93-3159141).

## Image text

All 24 distinct JPEGs were reviewed. The app references them in 71 question
records. Existing readings inside the images are retained. The five JPEGs
below have unannotated kanji; `image-furigana.json` adds readings over their
display without changing the original files:

| Asset | Reading labels |
| --- | ---: |
| `page-14.jpg` | 3 |
| `page-59.jpg` | 2 |
| `page-68.jpg` | 28 |
| `page-69.jpg` | 54 |
| `page-70.jpg` | 15 |

Total: 102 image reading labels. No unresolved reading or uncovered kanji
remains in the audited text and images.
