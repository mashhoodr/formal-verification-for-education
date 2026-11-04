# Exercise 1: Proving a Generated KC Is Valid

A self-paced exercise in eight parts. Each part has a **hand task** you do before reading anything, a **run** step, and a **reflect** step. Do not open [`SOLUTIONS.md`](SOLUTIONS.md) until you have written your own answer down. The background reading for each part is in [`NOTES.md`](NOTES.md).

Time: about three hours if done properly. Everything runs with the repo venv:

```bash
.venv/bin/python docs/exercises/01-proving-a-generated-kc/fractions_proof.py
.venv/bin/python docs/exercises/01-proving-a-generated-kc/lexical_anchor.py
.venv/bin/python docs/exercises/01-proving-a-generated-kc/main_idea_proof.py
```

What must be true when you finish: you can state what a KC is in one sentence, decompose an SLO by hand, say which of the seven Stage 1 theorems in this repo are genuine proofs, and explain to someone else why `UNSAT` in the two proof scripts is a statement about the KC and not about an item.

---

## Part 1. What a KC is

**Hand task.** Take this real NCP Grade 2 clause, code `M-02-A-30`:

> Identify, name and write unit and like fractions of a discrete set of objects using pictorial representations.

1. Write five tasks a child would be given under this clause.
2. Solve each one slowly and write every step you take.
3. Circle each step that uses its own rule. Those are your candidate KCs.
4. For each candidate, write one wrong answer a real child would give.

**Reflect.** How many KCs did you get? How many verbs does the clause have? Are those two numbers the same, and if not, why not?

Read: NOTES section 1 and 2.

---

## Part 2. The desk tests

**Hand task.** For each candidate KC from Part 1, answer the five questions in the table and record the verdict.

| KC | Can a child know half of it? | Can you name 2 to 3 real wrong answers? | Two surface-different items: principled reason to pass one and fail the other? | Sibling test: A without B, B without A? | One worked example enough? | Verdict |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |

Verdicts are one of: keep, split along a named dimension, merge with a named sibling, make a prerequisite edge.

**Reflect.** Which test changed your mind most often? That test is the one your generator is most likely to fail.

Read: NOTES section 3.

---

## Part 3. Layer 1 audit of this repo

**Hand task.** Open `app/verifier/kc_ontology_kernel.py` and read the function that builds the solver. For each theorem, decide whether its input is derived from content by a process the generator cannot influence, or whether it is a label the generator supplies.

| Theorem | Where does the input come from? | Genuine or label-dependent? |
| :-- | :-- | :-- |
| 0.1 DAG acyclicity | | |
| 0.2 Grade monotonicity | | |
| 0.2B Spiral bridge | | |
| 0.3 Envelope disjointness and complexity progression | | |
| 0.4 Single verb and working memory | | |
| 0.5 Misconception minimum | | |
| 0.6 Clause coverage and no orphans | | |

**Discovery task.** In the demo scenario data in the same file, find a Grade 2 KC whose title contains two action verbs but whose verb count is 1. Then open `app/verifier/curriculum_grounding.py` and find every junction audit whose pass flag is a literal `True`.

**Reflect.** Write one sentence describing the single property that separates a genuine proxy from proof theater.

Read: NOTES section 4.

---

## Part 4. Layer 2, the lexical anchor

**Hand task.** Before running anything, predict PASS or FAIL for each case and say why.

| Case | Clause | Candidate KC titles | Your prediction |
| :-- | :-- | :-- | :-- |
| 1 | Add and subtract like fractions within one whole | Add like fractions within one whole; Subtract like fractions within one whole | |
| 2 | Identify equivalent fractions and show families of equivalent fractions | Measure length in centimetres | |
| 3 | Add and subtract like fractions within one whole | Add unlike fractions within one whole | |
| 4 | Add and subtract like fractions within one whole | Add like fractions; Subtract like fractions | |
| 5 | Identify equivalent fractions and show families of equivalent fractions | Identify fractions | |

**Run.** `lexical_anchor.py`. Compare.

**Reflect.** Case 3 and case 5 each defeat a naive similarity score. Explain what each direction of the check catches. Then write down one KC title that would pass this check and still be wrong.

Read: NOTES section 5.

---

## Part 5. The procedural proof (fractions)

The KC is "Add like fractions within one whole", item form `a/b + c/b`, Grade 2 denominators 2, 3, 4, 5, 6, 8, 10.

**Hand task.** Compute the correct answer and the answer from each of these two wrong rules for the three items below.

- Rule "add tops and add bottoms": `(a+c)/(b+b)`
- Rule "multiply the tops": `(a·c)/b`

| Item | Correct | Add both | Multiply tops | Does the item diagnose? |
| :-- | :-- | :-- | :-- | :-- |
| 1/4 + 2/4 | | | | |
| 1/2 + 1/2 | | | | |
| 2/4 + 2/4 | | | | |

**Write the proof yourself before reading the reference.** Using `z3`, declare `a`, `b`, `c` as integers, constrain them to the envelope, and assert that every pair of rules gives a different number. Fractions compare by cross-multiplying. Check satisfiability. Then try it with denominators restricted to `[2]`.

**Run.** `fractions_proof.py`. Read all four runs.

**Reflect.**

1. Run 1 printed the number of items in the envelope. The proof covered all of them without listing them. What single fact lets it do that?
2. Run 2 is `UNSAT`. State in one plain sentence what has been proven, and what must change: the item, or the KC.
3. Run 3 tested every pair. One pair is `UNSAT` in the full envelope. What does that say about the misconception list?
4. Run 4 is a pointwise check of one generated item. What must change here: the item, or the KC?
5. Only one of the two wrong rules above, plus the renamed duplicate in run 3, is in `data/curriculum/pakistan/misconception_catalog.json`. What should the Junction 7 audit do with the other two?

Read: NOTES section 6.

---

## Part 6. The interpretive proof (main idea)

The KC is NCP Grade 3 `E-03-B2-01`: identify the main idea in a paragraph with an explicit topic sentence.

**Hand task.** Write a four-sentence paragraph for a Grade 3 child with the topic sentence second. Write a four-option MCQ for it: the key as a paraphrase of the topic sentence, one distractor copied from sentence 1, one distractor that is just the topic noun, one distractor that is true but broader than the paragraph. Now play four children who do not have the KC: one picks the first sentence, one picks the longest option, one picks the option sharing the most words with the paragraph, one picks the option that appears word for word. Which option does each child pick?

**Run.** `main_idea_proof.py`. Read both runs.

**Reflect.**

1. The variables in this script are positions, lengths and counts. Why are there no words?
2. Read the `UNSAT` core of the second run aloud in plain words. What has been proven about the KC in a curriculum where the topic sentence always comes first?
3. The proof separates "has the KC" from "has a shortcut". Does it separate "detail-confuser" from "verbatim-matcher"? Why does that matter less here than in Part 5?

**Extend.** Do at least two.

- Add a fifth shortcut, "pick the last sentence", and the constraint that defeats it. Does the problem stay `SAT`?
- Add a fourth error category from the catalog or the literature, with its own structural signature.
- Model three items for the same KC and add a quiz-level constraint that the topic sentence position is not the same in all three. Why is this the same shape as the Seen versus Unseen rule?

Read: NOTES section 7.

---

## Part 7. Epistemic boundaries

**Hand task.** For each proof, write two columns: what it proves, and what it does not prove. Then for each thing it does not prove, name the cheapest check that covers it.

| Proof | Proves | Does not prove | Cheapest covering check |
| :-- | :-- | :-- | :-- |
| Fractions diagnosability | | | |
| Main idea structure | | | |
| Lexical anchor | | | |

**Reflect.** Compare your table with the six boundaries in `docs/domains/01-formative-assessments/07-stage0-kc-ontology-proof-and-boundaries.md`. Which of the six does your work cover, and which did you find that the document does not list?

---

## Part 8. Synthesis

**Hand task.** Answer in writing.

1. If the cognitive rule inside a KC is universal and only the grain, sequencing and surface are local, what should the generator produce, and what should it never produce?
2. Which of the three proofs in this exercise could replace the hardcoded `True` audits in `curriculum_grounding.py` today, and which theorem in the kernel would they strengthen?
3. Describe the fractions KC as a cell in a lattice of difficulty factors. Name the axes. Which cells are in Grade 2 and which are in Grade 3 under the NCP?

**Reflect.** Write the one-paragraph answer to the question that started this: how do I check whether a generated KC is valid?

Read: NOTES section 8.
