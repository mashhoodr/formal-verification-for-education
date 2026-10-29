# Pillar 1: K–12 Formative Assessment Formal Verification

## Purpose of an In-Class Formative Assessment

Unlike a high-stakes end-of-year summative exam (which ranks students on a bell curve across an entire course), an **in-class formative assessment** (exit ticket, hinge check, or 10-minute concept check) has one primary job:

> **Diagnose, within 5–12 minutes of classroom time, which specific Atomic Knowledge Components (KCs) a student has mastered, whether they can transfer those KCs beyond memorized classroom examples, and which exact misconception is blocking them if they fail.**

---

## The 6 Formal Verification Dimensions for Formative Assessments

Each dimension below has its own dedicated specification and mathematical formulation document:

1. **[Dimension 1: Student Learning Outcomes (SLOs), Atomic KCs & Item Sufficiency (`01-slo-and-atomic-kc-mastery.md`)](01-slo-and-atomic-kc-mastery.md)**
   - Why 2–3 questions cannot measure a full SLO, how to decompose `Domain → SLO → Sub-SLO → Atomic KC`, and how item formats (`MCQ`, `Short Answer`, `Match-the-Column`, `Comprehension`, `Long Answer`) alter guessing probability $P(\text{guess})$ and required item counts.
2. **[Dimension 2: Cognitive Rigor — Bloom's Taxonomy $\times$ Webb's Depth of Knowledge (`02-cognitive-rigor-bloom-dok.md`)](02-cognitive-rigor-bloom-dok.md)**
   - Modeling Bloom ($1..6$) and Webb's DoK ($1..4$) as a 2D Hess Cognitive Rigor Matrix, proving non-decreasing cognitive scaffolding, and enforcing minimum thinking-time floors per DoK level.
3. **[Dimension 3: Classroom Alignment — "Seen vs. Unseen" Transfer (`03-seen-vs-unseen-transfer.md`)](03-seen-vs-unseen-transfer.md)**
   - Formalizing what was taught in class (`workedExamplesSeen`) vs. novel transfer contexts (`UNSEEN`), and proving the **Transfer Validity Theorem** ($\text{DoK} \ge 2 \implies \text{UNSEEN}$).
4. **[Dimension 4: Language Load vs. Cognitive Load (`04-language-vs-cognitive-load.md`)](04-language-vs-cognitive-load.md)**
   - Preventing **Construct-Irrelevant Variance** by proving that extraneous language load ($L_{\text{lang}}$: Flesch-Kincaid, sentence length, negations) stays strictly below grade ceilings even as intrinsic cognitive load ($C_{\text{cog}}$: $\text{DoK}$, working memory steps) rises.
5. **[Dimension 5: K–12 Developmental Stage Guardrails (`05-k12-developmental-stages.md`)](05-k12-developmental-stages.md)**
   - Treating developmental stage (`K-2`, `G3-5`, `G6-8`, `G9-12`) as a hyper-parameter that governs working memory chunk limits ($M_{\max}$), option count caps ($3$ vs. $4\text{--}5$), reading speed ($\text{WPM}$), and concrete vs. abstract reasoning bounds.
6. **[Dimension 6: Diagnostic Distractors & Multi-Format Item Design (`06-diagnostic-distractors-and-item-types.md`)](06-diagnostic-distractors-and-item-types.md)**
   - Proving **Misconception Bijection** ($\text{Distinct}(m_1, m_2, m_3)$) for MCQ distractors, banning construct-invalid meta-options (*"All of the above"*), and specifying formal invariants for Short Answer, Match-the-Column, and Comprehension sets.
7. **[Dimension 7: Stage 0 Formal Proof of KC Generation & Epistemic Boundaries (`07-stage0-kc-ontology-proof-and-boundaries.md`)](07-stage0-kc-ontology-proof-and-boundaries.md)**
   - Proving the 6 Stage 0 Z3 theorems on candidate KC decompositions from the **National Curriculum of Pakistan (NCP)** across Grades $G-1 \to G \to G+1$, and explicitly documenting the **6 epistemic boundaries that are NOT tested by the Stage 0 Z3 proof**.

---

## Summary Table: Provable Invariants Across the 6 Dimensions

| Dimension | Core Z3 Theorem Tracker Category | What Happens When Violated (`UNSAT Core`) |
| :--- | :--- | :--- |
| **1. KC Sufficiency** | `kc_false_mastery_risk_bound`, `kc_prereq_coverage` | Too few items on a target KC ($P(\text{guess}) > 0.10$) or missing prerequisite KC check. |
| **2. Bloom $\times$ DoK** | `quiz_dok_distribution`, `q_cognitive_scaffolding` | Quiz is $100\%$ rote recall ($\text{DoK } 1$) or places a $\text{DoK } 3$ item before $\text{DoK } 1$ warmup. |
| **3. Seen vs. Unseen** | `q_transfer_novelty_validity`, `quiz_seen_unseen_balance` | Item claims $\text{DoK } 2+$ application but reuses a verbatim `SEEN` classroom example. |
| **4. Language vs. Cognitive** | `q_extraneous_language_decoupling`, `q_dok3_zero_negation` | High reading complexity or double negatives confound a Science/Math reasoning item. |
| **5. Developmental Stage** | `q_working_memory_cap`, `q_stage_option_count` | Grade 1–2 item requires tracking 4+ working-memory chunks or uses 5 MCQ options. |
| **6. Diagnostic Distractors** | `q_distractor_misconception_distinct`, `q_distractor_word_spread` | Two distractors map to the same misconception, or correct option is a length giveaway. |
