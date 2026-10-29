# Pedagogical Formal Verification Knowledge Base (Progressive Disclosure Index)

Welcome to the architecture and pedagogical reference for **Formal Verification of K–12 Educational Content Generation**.

## Mission & Scope

This system applies **neuro-symbolic formal verification**—pairing LLM extraction and generation with **Microsoft's Z3 SMT Theorem Prover (`z3-solver`)**—to guarantee that generated educational materials are mathematically, psychometrically, and developmentally valid before they ever reach a classroom.

While our current interactive implementation focuses on **K–12 Formative Assessments**, the verification architecture is designed around reusable pedagogical primitives (**Atomic Knowledge Components**, **Classroom Context Graphs**, **Language vs. Cognitive Load Decoupling**, and **Developmental Stage Guardrails**) that extend across four core educational pillars:

1. **[Pillar 1: K–12 Formative Assessments (Active Focus)](domains/01-formative-assessments/README.md)**
2. **[Pillar 2: Lesson Planning & Instructional Design](domains/02-lesson-planning/README.md)**
3. **[Pillar 3: Teacher Training, Coaching & Evaluation](domains/03-teacher-coaching-and-evaluation/README.md)**
4. **[Pillar 4: Foundational Literacy & Numeracy (EGRA / EGMA)](domains/04-foundational-literacy-egra/README.md)**

---

## Progressive Disclosure Context Router

Use the table below to pull in **only the specific context document** needed for your current task or research question:

| If you are working on... | Read this document first | Key Formal Concepts Covered |
| :--- | :--- | :--- |
| **Why Z3 SMT is more rigorous than `if/else` code** | [`formal-verification-vs-if-else.md`](formal-verification-vs-if-else.md) | 2D Feasible Polytope ($\mathcal{P}_{\text{SAT}}$), coupled linear half-planes, vacuity detection, minimal-perturbation repair |
| **Where the LLM ends and the Z3 Proof begins** | [`architecture/neuro-symbolic-pedagogical-ir.md`](architecture/neuro-symbolic-pedagogical-ir.md) | 2-Layer Contract: Typed Pedagogical IR (LLM/Analyzer facts) $\to$ Z3 SMT-LIB2 Theorem Kernel |
| **Overview of Formative Assessment Verification** | [`domains/01-formative-assessments/README.md`](domains/01-formative-assessments/README.md) | Master map of the 6 pedagogical & psychometric proof dimensions for in-class quizzes |
| **SLOs, Micro-Skills, Mastery & Item Sufficiency** | [`01-slo-and-atomic-kc-mastery.md`](domains/01-formative-assessments/01-slo-and-atomic-kc-mastery.md) | 4-level hierarchy (`Domain → SLO → Sub-SLO → Atomic KC`), guessing/slip bounds, item formats (`MCQ`, `Short Answer`, `Match`, `Comprehension`) |
| **Bloom's Taxonomy & Webb's Depth of Knowledge** | [`02-cognitive-rigor-bloom-dok.md`](domains/01-formative-assessments/02-cognitive-rigor-bloom-dok.md) | Orthogonal 2D Hess Cognitive Rigor Matrix ($B \times \text{DoK}$), non-decreasing scaffolding, time-per-DoK floors |
| **Classroom Alignment ("Seen vs. Unseen" Transfer)** | [`03-seen-vs-unseen-transfer.md`](domains/01-formative-assessments/03-seen-vs-unseen-transfer.md) | Classroom Context Graph, rote recall collapse when $\text{DoK} \ge 2$ uses a `SEEN` classroom example |
| **Language Load vs. Cognitive Load** | [`04-language-vs-cognitive-load.md`](domains/01-formative-assessments/04-language-vs-cognitive-load.md) | Construct-Irrelevant Variance, keeping extraneous reading load below grade level while $\text{DoK}$ rises |
| **K–12 Developmental Stages (`K-2` to `G9-12`)** | [`05-k12-developmental-stages.md`](domains/01-formative-assessments/05-k12-developmental-stages.md) | Working memory chunk caps ($M_{\max}$), option count limits ($3$ vs. $4\text{--}5$), concrete vs. abstract reasoning |
| **Designing Diagnostic MCQ Distractors & Multi-Format Items** | [`06-diagnostic-distractors-and-item-types.md`](domains/01-formative-assessments/06-diagnostic-distractors-and-item-types.md) | Bijective misconception mapping (`Distinct`), banning meta-options, structural rules for non-MCQ formats |
| **Stage 0 KC Generation Proof & What Is NOT Tested** | [`07-stage0-kc-ontology-proof-and-boundaries.md`](domains/01-formative-assessments/07-stage0-kc-ontology-proof-and-boundaries.md) | 6 Stage 0 Z3 theorems on Pakistan NCP triads (`G-1 → G → G+1`) + the 6 epistemic boundaries outside Z3 |
| **Generative Junctions, Anti-"Proof Theater" Rigor & Missing Proofs** | [`08-generative-junctions-and-missing-proofs.md`](domains/01-formative-assessments/08-generative-junctions-and-missing-proofs.md) | Inventory of the 8 generative points in KC creation, eliminating "proof theater" shortcuts, and formalizing the 5 missing proofs |
| **Future Pillar: Lesson Planning Verification** | [`domains/02-lesson-planning/README.md`](domains/02-lesson-planning/README.md) | `I-Do / We-Do / You-Do` pacing, prerequisite KC sequencing, feeding `SEEN` examples to assessment generators |
| **Future Pillar: Teacher Coaching & Evaluation** | [`domains/03-teacher-coaching-and-evaluation/README.md`](domains/03-teacher-coaching-and-evaluation/README.md) | Observation rubric consistency, actionable coaching feedback loops, evidence-to-claim alignment |
| **Future Pillar: Foundational Literacy (EGRA)** | [`domains/04-foundational-literacy-egra/README.md`](domains/04-foundational-literacy-egra/README.md) | Grapheme-phoneme scope & sequence, $95\%+$ decodability proofs, CWPM fluency subtasks |
