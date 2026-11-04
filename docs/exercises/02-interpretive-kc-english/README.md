# Exercise 2: Decomposing and Auditing an Interpretive KC (English, Grade 3)

Parts 1 to 3 of [Exercise 1](../01-proving-a-generated-kc/README.md), redone for an interpretive KC. The background reading is the same [`NOTES.md`](../01-proving-a-generated-kc/NOTES.md). Do each hand task before opening [`SOLUTIONS.md`](SOLUTIONS.md).

The clause is NCP Grade 3, code `E-03-B2-01`:

> Identify the main idea and key supporting details in a paragraph with an explicit topic sentence.

What is different this time. In fractions, each step of the procedure was visible in the working. Here the "steps" are judgments a reader makes silently, so you will have to catch yourself making them. The verb trap also runs the other way: the clause has one verb, and you will find it hides several rules.

What must be true when you finish: you can name the rules a child needs to find a main idea, say which of them the demo KC in this repo actually covers, and point to the exact line where the Grade 3 and Grade 4 boundary is decided by an integer that Z3 never derives.

---

## Part 1. Decompose the clause

**Hand task.**

1. Write five tasks a Grade 3 child would be given under this clause. At least one must be about supporting details, not the main idea.
2. Write a four-sentence informational paragraph suitable for Grade 3 with the topic sentence second. Solve each of your five tasks on it, slowly, and write down every judgment you made. Be honest about the ones that felt automatic.
3. Circle each judgment that uses its own rule. Those are your candidate KCs.
4. For each candidate, write one wrong answer a real Grade 3 child would give. Two of them should come from `data/curriculum/pakistan/misconception_catalog.json`.
5. List the dimensions along which a paragraph could vary that would change which rules a child needs. Mark the ones the clause text already fixes.

**Reflect.** The clause has one verb. How many KCs did you get? What did the verb count tell you about atomicity, and in which direction was it wrong?

---

## Part 2. The desk tests

**Hand task.** Run the five tests from Exercise 1 on each candidate KC. Record the verdict.

| KC | Can a child know half of it? | Two or three real wrong answers? | Surface-different items: principled reason to pass one and fail the other? | Sibling test | One worked example? | Verdict |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |

In test 3, for every "yes", classify the reason as one of three kinds: a KC boundary, a bug-exposing item design, or a shortcut confound. The third kind did not appear in fractions.

**Reflect.** Which of your KCs does the repo's demo KC "Identify main idea of a text" cover, and which does it silently drop? Which test exposed that?

---

## Part 3. Layer 1 audit of the English triad

**Hand task.** Open `app/verifier/kc_ontology_kernel.py` and find the English scenario, `ncpEnglishReadingG2G4`. Read the Step 0 draft and the Step 1 repair. Then open `app/verifier/curriculum_grounding.py` and read the `main_idea` branch of the complexity derivation.

Answer in writing.

1. The Grade 3 and Grade 4 main idea KCs share an operation code. What single value decides whether Theorem 0.3 holds between them, and where does that value come from?
2. The Step 1 repair changes three things on the Grade 3 KC. Which of the three does Z3 read?
3. The complexity derivation for main idea works by keywords. Write one KC title that would derive to complexity 2 and is obviously a Grade 4 skill, and one that derives to 4 and is obviously Grade 3.
4. The repair adds a third misconception string. Is it in the catalog? Does the kernel care?
5. The Grade 3 KC has `observable_variables_count=2`. What are the two variables? If you cannot name them, what does that say about applying Theorem 0.4 to interpretive KCs?
6. Fill in the audit table for this triad.

| Theorem | Input source in the English triad | Genuine or label-dependent? | What a derived input would look like for an interpretive KC |
| :-- | :-- | :-- | :-- |
| 0.1 DAG acyclicity | | | |
| 0.2 Grade monotonicity and bridge | | | |
| 0.3 Disjointness and progression | | | |
| 0.4 Single verb and working memory | | | |
| 0.5 Misconception minimum | | | |
| 0.6 Coverage and no orphans | | | |

**Try it.** Keep the Step 1 title and set `mechanism_complexity` back to 4. Run the Stage 0 verification. Then restore 2 and change the title back to "Identify main idea of a text". Run again. Which run goes `UNSAT`?

**Reflect.** The real Grade 3 to Grade 4 boundary in the NCP is explicit versus implied and single paragraph versus multi-paragraph. Both are properties of the stimulus text. Write the two measurable stimulus parameters that should replace the integer, and say which one of them the linguistic analyzer can already compute.
