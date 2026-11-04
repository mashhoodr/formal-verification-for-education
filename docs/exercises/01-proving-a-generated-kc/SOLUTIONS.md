# Solutions

Open only after writing your own answer for the part.

---

## Part 1

A reasonable decomposition of `M-02-A-30` gives five KCs from three verbs.

| Candidate KC | Rule | A real wrong answer |
| :-- | :-- | :-- |
| Recognise that the parts must be equal | Reject a picture with unequal pieces as showing a fraction | Accepts a circle cut into three unequal pieces as thirds |
| Count parts to form the denominator | Total parts go on the bottom | Writes the shaded count on the bottom |
| Count shaded to form the numerator | Shaded parts go on the top | Writes shaded over unshaded, 3/2 for 3 of 5 |
| Classify unit versus non-unit | Top is 1 or not | Calls 2/4 a unit fraction because it equals a half |
| Classify a pair as like or unlike | Compare the bottoms | Calls 1/4 and 2/4 unlike because the tops differ |

"Name" and "write" are the same rule in two output forms, so they merge. "Identify" hides the first two rules. Verb count and KC count disagree, which is why verb counting is a weak proxy for atomicity.

## Part 2

Worked against the five KCs from Part 1. Label them A to E.

| | KC |
| :-- | :-- |
| A | Recognise that the parts must be equal |
| B | Count the parts to form the denominator |
| C | Count the shaded parts to form the numerator |
| D | Classify a fraction as unit or non-unit |
| E | Classify a pair of fractions as like or unlike |

### Test 1. Can a child know half of it?

| KC | Answer | Evidence |
| :-- | :-- | :-- |
| A | No | Either the child checks equality of parts or does not. There is no partial state. |
| B | No, alone | But see the pair B and C below. |
| C | No, alone | |
| B and C together | **Yes** | A child shown 3 shaded of 5 writes 3/2. The top is right, the bottom is wrong. The child has C and lacks B. This is the strongest signal in the whole table. |
| D | No | Binary classification on one feature. |
| E | No | Binary classification on one feature. |

Consequence: if you had written B and C as one KC, "write the fraction for a picture", the half-knowing test splits it. Whether you keep the split depends on grain size, see the verdicts.

### Test 2. Can you name two or three real wrong answers?

| KC | Wrong answers a Grade 2 child produces |
| :-- | :-- |
| A | Accepts a circle cut into three unequal pieces as thirds. Shades the biggest piece and calls it one third. Counts pieces regardless of size. |
| B | Writes the unshaded count on the bottom: 3/2 for 3 of 5. Writes the shaded count on the bottom: 5/3. |
| C | Writes the unshaded count on the top: 2/5 for 3 of 5. Writes the total on the top: 5/5. |
| D | Calls 2/4 a unit fraction because it equals a half. Calls 3/1 a unit fraction because there is a 1. Thinks "unit" means the whole. |
| E | Compares the tops: says 1/4 and 2/4 are unlike. Says only identical fractions are like. Says 2/4 and 1/2 are like because they are equal in value. |

All five pass. Every KC has a concrete, nameable error set, which is what makes each one measurable.

### Test 3. Two items differing only in surface: is there a principled reason to pass one and fail the other?

| KC | Item pair | Principled reason? | What it means |
| :-- | :-- | :-- | :-- |
| A | A bar cut into unequal pieces versus a set of 4 marbles of different sizes | **Yes.** For a shape, equal means equal area. For a set, each object is one part regardless of size. A child can hold one and not the other. | Representation is a KC boundary for A. The NCP clause says "discrete set of objects using pictorial representations", so the set version is the in-grade one. |
| B, C | 5 parts in a row versus 5 parts in a circle | No. Same counting act. | Keep. |
| B, C | A bar with 6 parts versus a set of 6 apples | **Yes**, same reason as A. | Representation again. Treat it as a difficulty factor across the whole clause, not as five extra KCs. |
| D | Given as the symbol 1/4 versus given as a picture with 1 of 4 shaded | **Yes, but not a KC boundary.** The picture version requires B and C first. | This is a purity problem, not a split. Write D items in symbol form so a failure on D is a failure on D. |
| E | Pair with the same tops and different bottoms, 2/3 and 2/5, versus different tops and the same bottom, 1/4 and 3/4 | **Yes, but it is the misconception, not a boundary.** The first pair exposes the child who compares tops. | A surface variation that separates bugs is item design. A variation that separates rules is a KC boundary. Learn to tell them apart. |

### Test 4. Sibling test: A without B, and B without A?

| Pair | First without second? | Second without first? | Relation |
| :-- | :-- | :-- | :-- |
| A, B | Yes. Knows parts must be equal, still writes the wrong denominator. | Yes. Writes 1/3 for three unequal pieces: counts fine, never checked equality. | Both directions exist, so they are distinct KCs. The NCP teaches A first, so draw the edge, but know it is an instructional ordering and not a logical dependency. |
| B, C | Yes. Correct bottom, unshaded on top. | Yes. Correct top, unshaded on bottom. | Siblings. |
| D, E | Yes. | Yes. | Siblings. |
| B, D | No. A child cannot classify a fraction they cannot read. | Yes. | B is a genuine prerequisite of D. |
| B, E | No. | Yes. | B is a genuine prerequisite of E. |

### Test 5. Can you teach it with one worked example?

All five: yes. A single unequal-versus-equal picture for A. A single 3-of-5 picture for B and C. A single sorting of four fractions for D or E. None needs two examples of different kinds.

### Verdicts

| KC | Verdict | Reason |
| :-- | :-- | :-- |
| A | Keep. Split by representation only if items will use both shapes and sets. | Test 3 |
| B, C | Keep separate error models. For a ten-minute quiz, merge into one reported KC "write the fraction for a picture" with the four bugs attached. | Test 1 says they are separable. Grain size says the teacher does not need two scores. The error model preserves the diagnosis either way. |
| D | Keep. Items in symbol form. | Test 3, purity |
| E | Keep. | All tests pass |
| Edges | A before B and C, instructional. B and C before D and E, logical. | Test 4 |

Which test changed the most minds: test 3. It is the one your generator is most likely to fail, because an LLM writing KC titles never asks whether a picture of marbles and a picture of a bar are the same skill.

## Part 3

### The method

For each theorem, find two lines in `app/verifier/kc_ontology_kernel.py`: the line that binds the fact into Z3, and the line that asserts the theorem over it. Then ask one question of the binding line: could the generator write a different number here without changing the KC's content? If yes, the theorem checks a label.

### Working

**0.1 DAG acyclicity.** The rank variable is bounded but never fixed. Lines 205 and 206 say rank is between 1 and the KC count, nothing more. Line 291 asserts rank of the prerequisite is less than rank of the dependent, for every edge. Z3 must find one assignment satisfying all edges at once. The generator supplies only the edges, and an edge is content: removing it changes the graph. Verdict: genuine.

**0.2 Grade monotonicity.** Line 207 binds grade to the KC's grade field. Line 308 asserts prerequisite grade is at most dependent grade. The grade field comes from the SLO code the KC claims, and that claim is checked by 0.6B. Verdict: ground fact, honest, because the number is not free.

**0.2B Spiral bridge.** Line 367 counts cross-grade edges in Python. Line 375 binds the count. Line 377 asserts it is at least 1. Edges are structure, so honest, but Z3 is checking a number Python already computed. Verdict: ground fact, honest, no search.

**0.3 Envelope disjointness and progression.** Line 209 binds the mechanism variable to the hand-written `mechanism_complexity` field. Line 334 asserts no two cross-grade KCs share operation and mechanism. Lines 396 to 398 bind per-grade maxima of the same field and line 406 asserts strict progression. Now ask the question. Can the generator change the integer without changing the KC? Yes. The grounding module tries to defend this at `curriculum_grounding.py:35` by deriving complexity from keywords in the title, but line 69 returns the self-reported integer when no keyword matches, and line 129 then compares that derived value to the label. When the fallback fires, the audit compares the label to itself. Verdict: label-dependent.

**0.4 Single verb and working memory.** Line 210 binds the verb variable to the `verb_count` field. Line 211 binds the working memory variable to `observable_variables_count`. Lines 216 and 230 assert the bounds. No parser produces either number anywhere in the repo. Verdict: label-dependent.

**0.5 Misconception minimum.** Line 202 counts distinct lowercase strings. Line 212 binds the count. Line 245 asserts the minimum. The strings are IDs like `M1_adds_both_num_and_den`. Nothing compares them to `misconception_catalog.json`. Three distinct nonsense strings pass. Verdict: label-dependent.

**0.6 Coverage and no orphans.** Line 265 binds, per KC, the number of its claimed clauses that exist for its grade, and line 267 asserts at least one. Line 432 asserts every clause has at least one claiming KC. The links are structural, so "did any clause get forgotten" is honest. But whether a link is true is never checked: `curriculum_grounding.py:96` is the Junction 2 audit and its pass flag is the literal `True`. Verdict: genuine for forgetting, theater for truth.

### The try-it test

Open the demo scenario, take `KC-G2-FRAC-02` at line 610, and change its title to "Identify, name, write and compare fractions" while leaving `verb_count=1` at line 615. Run the Stage 0 verification. It stays `SAT`. Now take any KC and add a prerequisite edge that forms a cycle. It goes `UNSAT`. That difference is the whole of Part 3. A theorem whose verdict survives a content change it was meant to catch is checking a label.

### Discovery answers

- Line 612: the title is "Add and subtract like fractions within one whole". Line 615: `verb_count=1`. Two verbs, count of one, and the kernel cannot see it.
- Lines 639 and 654 are the planted demo bugs, and both are planted as labels: a `verb_count=2` and a `mechanism_complexity=2`. The repairs at lines 705 and 706 and lines 710 to 745 are honest. Step 1 rewrites the title to "Add and subtract unlike fractions with related multiple denominators" and raises the integer to 4. Step 2 genuinely splits the blob into two KCs with new titles and new error lists. But look at what Z3 actually consumes. Of the Step 1 repair, only line 706, the integer, reaches the solver. Line 705, the title, is invisible to it. The demo would have gone `SAT` with the integer alone. The showcase does the right thing, and the proof cannot tell that it did. That is the precise meaning of label-dependent.
- `curriculum_grounding.py` lines 96, 118 and 140 are the literal `True` passes for Junctions 2, 4 and 6. Line 85, Junction 1, passes if there are at least seven clauses, which is a count threshold and not a coverage audit. Line 151, Junction 7, counts strings and never opens the catalog it says it is bound to.

### The separating property

A proxy holds when its input is derived from content by a process the generator cannot influence, or when the generator's choice is structural so that faking it visibly changes the artifact. Edges and clause links are structural. Verb counts, complexity integers, variable counts and misconception strings are not, until something derives them.

## Part 4

| Case | Result | Why |
| :-- | :-- | :-- |
| 1 | PASS | No additions, nothing dropped |
| 2 | FAIL | Three additions, five dropped words, weight 12.81 |
| 3 | FAIL | "unlike" is an addition; "like" and "subtract" dropped |
| 4 | FAIL | "within one whole" dropped, weight 9.59 |
| 5 | FAIL | "equivalent", "families", "show" dropped, weight 9.59 |

KC-to-clause catches additions (case 3). Clause-to-KCs catches dropped scope (cases 4 and 5). Rarity weighting is what makes case 5 fail hard: "fractions" appears in every clause and is cheap to keep, "equivalent" appears in one and is expensive to lose.

A title that passes and is still wrong: "Identify equivalent fractions and show families" attached to a KC whose items actually test simplification to lowest terms. The anchor prints PASS because every word is in the clause. The skill is not. Only an expert read or the items themselves expose it.

## Part 5

Hand table.

| Item | Correct | Add both | Multiply tops | Diagnoses? |
| :-- | :-- | :-- | :-- | :-- |
| 1/4 + 2/4 | 3/4 | 3/8 | 2/4 | Yes, three different numbers |
| 1/2 + 1/2 | 2/2 | 2/4 | 1/2 | No, both bugs give one half |
| 2/4 + 2/4 | 4/4 | 4/8 | 4/4 | No, multiply-tops gets it right |

Script output to compare against.

- Envelope size: 108 items.
- Run 1: `SAT`, witness 2/8 + 6/8 giving 8/8, 8/16, 12/8.
- Run 2 (denominator 2 only): `UNSAT`, core is the single constraint that add-both and multiply-tops differ. With halves only, the two bugs always collide.
- Run 3: every pair `SAT` except add-both versus add-bottoms, which is `UNSAT` in the full envelope. They are the same formula under two names.
- Run 4: item 2/4 + 2/4 collides correct with multiply-tops.

Reflection answers.

1. Z3 treats a, b, c as unknowns and solves the inequalities symbolically, so one search covers all 108 items without enumerating them.
2. Proven: no item built from halves can separate the two bugs. The KC's misconception list is not diagnosable at that envelope. The KC changes, not the item.
3. Two listed misconceptions are one misconception. Merge them. Pairwise separability is the mechanical version of the sibling test.
4. The item changes. Pick different numbers. The KC is unaffected.
5. Refuse them, or route them to a human to add to the catalog with a citation. A count-based audit cannot tell the difference, which is why the current Junction 7 audit is theater.

## Part 6

Hand task. With the topic sentence second, the first-sentence child picks the detail distractor, the longest-option child picks whichever you made longest (so do not make it the key), the most-shared-words child picks the copied detail, and the verbatim child picks the copied detail. None pick the key, so the item separates "has the KC" from "has a shortcut".

Script output to compare against.

- Run 1: `SAT`. Three sentences, topic sentence at position 2, detail copied from sentence 1, key three words with overlap 3, detail four words with overlap 4, topic one word, broad one word with overlap 0.
- Run 2: `UNSAT`, core of three constraints: the detail is a real non-topic sentence, the detail is sentence 1, the topic sentence is position 1.

Reflection answers.

1. The meaning of the words is not computable, but the structure is. Positions, lengths and counts are what the linguistic analyzer can measure and what shortcuts operate on.
2. If the topic sentence must be first, then sentence 1 is the topic sentence, so the detail cannot be sentence 1, so the first-sentence shortcut lands on the key. No item in that curriculum can distinguish the KC from the shortcut.
3. No. A child who picks the detail could be a detail-confuser or a verbatim-matcher. Both lack the KC, so mastery is diagnosed. In Part 5 the bugs had distinct outputs, so the misconception was diagnosed too. Interpretive KCs give the weaker guarantee and the boundary should say so.

Extensions. Adding "pick the last sentence" with the constraint that the last sentence is not the topic sentence stays `SAT` with three sentences and topic position 2. A fourth category, "true but not in the passage", needs a signature distinct from "broad": for instance overlap of at most 1 and a required content word absent from the passage, which the model cannot express without a vocabulary variable, so it becomes an anchor check rather than a Z3 constraint. The three-item version adds a constraint that the three topic positions are not all equal, which is a constraint over the set, exactly like requiring at least one `UNSEEN` item per KC.

## Part 7

| Proof | Proves | Does not prove | Cheapest covering check |
| :-- | :-- | :-- | :-- |
| Fractions | A separating item exists in the envelope; which bug pairs are distinguishable | That real children hold these bugs; that the KC reads the clause correctly | Catalog membership with citation; lexical anchor |
| Main idea | The structure separates KC from shortcuts; error categories are structurally distinct | Key paraphrases the topic sentence; detail supports it; broad is broader; which misconception a child holds | Overlap anchors for the first three; pick rates for the last |
| Lexical anchor | No additions, no dropped scope | The right words describe the right skill | Expert read; item-writing stress test |

Boundaries the document does not list: shortcut confounding (a child can pass without the KC), and misconception observational equivalence (two listed bugs that no item can separate). Both are now provable rather than merely stated.

## Part 8

1. Produce the mapping from clause to lattice cell, the choice of catalog bugs, and the items. Never produce the cognitive rule, the bug formulas, or integer difficulty labels.
2. The lexical anchor replaces the Junction 2 pass and strengthens Theorem 0.6. Pairwise separability replaces the Junction 7 count and strengthens Theorem 0.5. Parameter-derived complexity from lattice coordinates replaces the keyword fallback and strengthens Theorem 0.3.
3. Axes: operation (add, subtract, compare, equivalent, simplify), representation (pictorial, symbolic), denominator relation (like, related by a multiple, unrelated), range (within one whole, beyond). Grade 2 under the NCP is add or subtract, pictorial or symbolic, like, within one whole. Grade 3 adds related denominators and removes the within-one-whole restriction.

The paragraph. A KC is a hypothesis about a child's head, so validity is whether it predicts who gets what right. Before data, check three layers. Structure, with inputs derived from content so the proofs are not label checks. Fidelity, with a two-direction lexical anchor against the clause. Diagnosability, by proving an item exists in the grade's envelope that separates the correct rule from every listed misconception and the misconceptions from each other, where for interpretive KCs the misconceptions are replaced by shortcut heuristics. The last check is the one that matters most, because it is the only one tied to what a formative quiz is for, and the only one where the solver searches rather than records.
