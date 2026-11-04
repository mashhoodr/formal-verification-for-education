# Notes: Validating a Generated Knowledge Component

Reference material for [the exercise](README.md). Read each section when the exercise points to it, not before.

---

## 1. What a KC is

A knowledge component is an acquired unit of cognitive function or structure that can be inferred from performance on a set of related tasks (Koedinger, Corbett and Perfetti, the Knowledge-Learning-Instruction framework). Three words carry the definition. *Acquired*: it is learned, so its error rate falls with practice. *Unit*: it is used whole or not at all. *Inferred from performance*: it is a latent variable, never observed directly.

Operationally a KC is a condition-action pair. IF the situation has these features THEN produce this response. For measurement it lives in a Q-matrix: one row per task, one column per KC, a 1 where the task needs the KC. A student is a vector of mastered and unmastered KCs. A decomposition is valid to the extent that this model predicts real student data better than rival decompositions with different splits and merges.

The consequence for checking: a KC is a hypothesis about what is in a child's head, not a fact about curriculum text. Every pre-data check is a proxy for "does it predict who gets what right".

## 2. How an expert decomposes an SLO

This is cognitive task analysis.

1. Write down the tasks the clause implies.
2. Solve each one slowly and record every step.
3. Each step that uses its own rule is a candidate KC.
4. Vary the tasks along surface dimensions. Where the steps change, that is a KC boundary.
5. Collect the real errors children make on each step. A step with no plausible errors is not worth measuring alone.
6. Order steps by which uses the output of which. That is the prerequisite graph.
7. Choose grain size for the purpose. A ten-minute formative check needs two or three items per KC.
8. Write each KC as a card: condition, action, example item, non-example item, error list.

The verb trap: SLO verbs are a poor guide to KCs. In `M-02-A-30`, "name" and "write" are one rule in two output forms. "Identify" hides two rules, recognising equal parts and counting them. This is why single-verb counting is a weak atomicity proxy even when the count is derived honestly.

The expert blind spot: experts chunk skills novices have not chunked, and LLMs are trained on expert text. Koedinger and Nathan found teachers confidently predicting that story problems would be harder than symbolic equations for beginning algebra students, and the data showed the reverse. Generated KCs inherit this bias and are too coarse along exactly the dimensions that matter to children.

## 3. How experts validate without AI

- **Two-rater tagging.** Two experts independently assign KCs to items. Disagreement marks an unclear KC.
- **Think-aloud with five children.** Watch where they stumble. Brown and Burton's subtraction bug catalog came from this kind of observation.
- **Error analysis of marked work.** If predicted errors never appear and unpredicted ones do, the KC is wrong.
- **Difficulty factors assessment.** Matched items differing in one feature. A performance gap means that feature is a KC boundary.
- **Learning curves.** Error rate against attempt number. A smooth fall is one skill. A fall, a jump, and another fall is two skills bundled.
- **Model comparison.** Fit the Q-matrix, then fit alternatives with one split or merge, and compare. In the Cognitive Tutor work this search routinely improved expert models.
- **Instructional experiment.** Teach the KC in isolation and confirm performance rises on its items and not on unrelated ones. The strongest evidence.

The five desk tests used in the exercise are the pre-data versions of local independence and discriminability from this list.

## 4. The three layers of checkability, and this repo's Layer 1

| Layer | Question | Status in this repo |
| :-- | :-- | :-- |
| 1 Structural | One verb, acyclic, clauses covered, enough misconception slots | Z3 kernel exists. Two of seven theorems are genuine. |
| 2 Content fidelity | Does the KC mean what the clause means | Junction 2 audit is a hardcoded pass. Not built. |
| 3 Empirical | Does the decomposition predict who gets what right | Needs pilot data. Not started. |

A proxy holds when its input is derived from content by a process the generator cannot influence, or when the generator's choice is structural so that faking it visibly changes the artifact. DAG acyclicity holds because ranks are free variables and edges are structure. Grade holds because it comes from the SLO code. Verb count, working memory count, mechanism complexity and misconception count are hand-authored integers, so the theorems over them check labels. Clause coverage is genuine for "no clause forgotten given honest tags" and theater for whether the tags are true.

The demo scenario carries a Grade 2 KC titled "Add and subtract like fractions within one whole" with a verb count of 1. The complexity derivation falls back to the self-reported label when no keyword matches, and the Junction 5 audit then compares the label to itself.

## 5. Layer 2: the lexical anchor

Lowercase, drop stop words, stem, keep content words. Then two directions.

- **KC to clause.** Every content word of the KC must appear in the clause or an approved synonym list. Anything else is an addition.
- **Clause to KCs.** Take the union of all KCs claiming the clause. Every content word of the clause must appear in that union. Anything missing is dropped scope.

Weight words by rarity across the whole clause set, so dropping "equivalent" costs more than dropping "fractions". Containment, not similarity, is the point: "Add unlike fractions" scores high on similarity and still fails because "unlike" is an addition and "like" is dropped.

This is a filter. It catches gross lies and dropped qualifiers mechanically. It does not catch a KC that uses the right words for the wrong skill. That needs an expert read.

## 6. The procedural proof

**The single most important thing to check in a generated KC is whether it comes with an executable error model**: can each claimed misconception be written as a concrete wrong procedure that, run on an item, gives a predicted wrong answer distinct from the key and from the other misconceptions. Four reasons it outranks everything else. It is the definition made testable, since a KC is inferred from the pattern of right and wrong answers. It forces the other properties for free, since writing the bug forces you to write the rule, a bug that breaks half the rule reveals two KCs, and a bug found in no catalog is probably invented. It is the only check tied to the purpose, since a formative quiz exists to tell a teacher which misconception is blocking a child. And it is the one place Z3 searches rather than records.

For a procedural KC every rule, correct or wrong, is a function from the item's parameters to an answer. The proof leaves the parameters free, constrains them to the grade envelope, and asserts every pair of rules differs. Fractions are compared by cross-multiplying so Z3 stays in integers.

Two levels, and which one fails decides what changes.

- **KC level.** No separating item exists anywhere in the envelope. The KC or its misconception list is wrong. Change the decomposition.
- **Item level.** These specific numbers collide. The KC is fine. Change the numbers. This is the ordinary pointwise check Stage 2 should run on every generated item.

Pairwise separability decides merges. If no item in the envelope separates two bugs, they are observationally identical at that grade and listing both is false precision.

This is the one place Z3 does real search before any pilot. The only thing the generator supplies is which catalog bugs apply. Formulas come from the catalog, the envelope from the NCP, the search from Z3.

## 7. The interpretive proof

An interpretive KC has no computable wrong output. "Picks a detail instead of the main idea" is not a formula. Two things are still computable: the structure of the passage (positions, lengths, overlap counts, verbatim flags) and the shortcut heuristics a child can use without the KC (first sentence, longest option, most shared words, verbatim match). The shortcuts are the computable bugs.

Error categories become typed distractors with distinct structural signatures. A detail is a copied non-topic sentence. A topic is a bare noun phrase. A broad option is absent from the passage. The key is anchored to the topic sentence but not copied. Shortcuts become immunity constraints: each must select a distractor, never the key.

The witness is not an item. It is a specification an LLM fills, after which the generated item is measured pointwise against the same inequalities.

The refutation: force the topic sentence to position 1 and the problem is `UNSAT` with a three-constraint core. In a curriculum where the topic sentence is always first, no item can distinguish a child who identifies main ideas from one who picks the first sentence. The KC collapses into a positional heuristic. That is the interpretive analog of the 2/4 + 2/4 degeneracy.

What it does not prove: that the key really paraphrases the topic sentence, that the detail really supports it, that the broad option really is broader, or which misconception a child who picks the detail holds. Mastery is diagnosed. Misconception is not. Label that as a weaker guarantee than the procedural case.

The two-by-two: procedural versus interpretive on one axis, subject on the other. The existence proof covers the procedural column in every subject, which includes phonics, spelling rules, agreement, plurals and tense in NCP English Grades 1 to 5. The interpretive column gets structural checks plus empirical grounding in every subject, including "explain why the shallow puddle dries faster" in science.

## 8. Existing banks and how local a KC really is

Banks exist. The PSLC DataShop holds hundreds of datasets with expert KC models. ASSISTments has an open skill list. Confrey's learning trajectories, Clements and Sarama for early number, England's Ready-to-Progress criteria, and the Achieve the Core coherence map are published progressions. Brown and Burton's subtraction bugs, Minstrell's physics facets, the AAAS science misconception bank and Eedi's diagnostic question bank are published error catalogs.

Split the KC into layers and locality differs per layer.

- **The cognitive rule** is universal. Adding like fractions is the same operation everywhere, and whole-number bias replicates across countries. Reuse, do not generate.
- **Grain and sequencing** are curriculum-specific. NCP Grade 2 allows denominators to 10; Common Core Grade 3 restricts to 2, 3, 4, 6, 8. Same lattice of cells, different cells in grade.
- **Surface context** is school and region specific. It affects items, not KCs.
- **Literacy** is the exception. Phonics and reading KCs are language-specific.

The practical consequence: stop generating KCs and start aligning. Map each NCP clause onto an existing lattice and an existing catalog, let the generator produce only the mapping and the items, and make the lexical anchor the central proof rather than a side check.
