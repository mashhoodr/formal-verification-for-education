"""
Exercise Part 4 reference solution: the Layer 2 lexical anchor check.

Two directions, both deterministic:
  KC -> clause : every content word of the KC title must appear in the clause
                 (or in a small approved synonym list). Extra words are ADDITIONS.
  clause -> KCs: every content word of the clause must appear in the union of
                 the KC titles that claim it. Missing words are DROPPED SCOPE.
Words are weighted by rarity across the whole clause set, so dropping
"equivalent" costs more than dropping "fractions".

Run:  .venv/bin/python docs/exercises/01-proving-a-generated-kc/lexical_anchor.py
"""
import math
import re
from collections import Counter

STOP = {"a", "an", "the", "and", "or", "of", "to", "in", "on", "with", "using", "e", "g",
        "its", "their", "that", "are", "is", "be", "by", "for", "from", "as", "at", "into"}
SYNONYMS = {"recognise": "identify", "recognize": "identify", "sum": "add", "fractions": "fraction",
            "lowest": "simplest", "term": "form", "terms": "form"}

def stem(w: str) -> str:
    """Crude suffix stripper. Stems are keys for matching, not words: "centimetr" is expected."""
    w = SYNONYMS.get(w, w)
    for suf in ("ies", "ing", "ed", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            w = w[: -len(suf)] + ("y" if suf == "ies" else "")
            break
    return SYNONYMS.get(w, w)

def content_words(text: str) -> set[str]:
    toks = re.findall(r"[a-zA-Z]+", text.lower())
    return {stem(t) for t in toks if t not in STOP and len(t) > 1}

def rarity_weights(all_clause_texts: list[str]) -> dict[str, float]:
    df = Counter(w for t in all_clause_texts for w in content_words(t))
    n = len(all_clause_texts)
    return {w: math.log((n + 1) / (c)) + 1.0 for w, c in df.items()}

def anchor_check(clause_text: str, kc_titles: list[str], weights: dict[str, float],
                 max_dropped_weight: float = 1.5) -> dict:
    cw = content_words(clause_text)
    union = set().union(*(content_words(t) for t in kc_titles))
    additions = {t: content_words(t) - cw for t in kc_titles}
    dropped = cw - union
    dropped_weight = sum(weights.get(w, 2.0) for w in dropped)
    passed = all(not a for a in additions.values()) and dropped_weight <= max_dropped_weight
    return {"passed": passed, "additions": {t: sorted(a) for t, a in additions.items() if a},
            "dropped": sorted(dropped), "droppedWeight": round(dropped_weight, 2)}

CLAUSES = {
    "M-02-A-30": "Identify, name and write unit and like fractions of a discrete set of objects using pictorial representations.",
    "M-02-A-32": "Add and subtract like fractions within one whole.",
    "M-03-A-20": "Recognise among proper fractions, improper fractions, and mixed numbers.",
    "M-03-A-21": "Identify equivalent fractions and show families of equivalent fractions.",
    "M-03-A-22": "Simplify fractions to the lowest term.",
    "M-03-A-24": "Add and subtract like and unlike fractions with denominators that are multiples of the same number.",
    "M-04-A-21": "Convert improper fractions to mixed numbers and vice versa.",
    "M-04-A-25": "Multiply two fractions and/or mixed numbers and express the answer in its simplest form.",
}

CASES = [
    ("good: faithful split",        "M-02-A-32", ["Add like fractions within one whole", "Subtract like fractions within one whole"]),
    ("label lie: wrong domain",     "M-03-A-21", ["Measure length in centimetres"]),
    ("addition: unlike smuggled in","M-02-A-32", ["Add unlike fractions within one whole"]),
    ("dropped qualifier",           "M-02-A-32", ["Add like fractions", "Subtract like fractions"]),
    ("dropped the only rare word",  "M-03-A-21", ["Identify fractions"]),
]

if __name__ == "__main__":
    weights = rarity_weights(list(CLAUSES.values()))
    for name, code, titles in CASES:
        res = anchor_check(CLAUSES[code], titles, weights)
        print(f"\n{name}\n  clause {code}: {CLAUSES[code]}\n  KCs: {titles}\n  -> {'PASS' if res['passed'] else 'FAIL'}  {res}")
