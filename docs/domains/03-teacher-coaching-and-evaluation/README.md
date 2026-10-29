# Pillar 3: Teacher Training, Coaching & Evaluation Formal Verification (Charter)

> **Status:** Architectural Charter — Connects classroom observation transcripts, lesson plans ([Pillar 2](../02-lesson-planning/README.md)), and student formative diagnostic data ([Pillar 1](../01-formative-assessments/README.md)).

## 1. Objective

AI coaching and teacher-evaluation tools frequently suffer from **vague, generic, or internally contradictory feedback** (e.g., praising a teacher for high student engagement while simultaneously noting that $80\%$ of class time was uninterrupted teacher monologue, or recommending 5 coaching action steps for a single week).

Formal verification ensures that generated teacher evaluations, coaching rubrics (such as **Danielson Framework**, **CLASS**, or **Teach Primary**), and professional development plans satisfy strict evidentiary and cognitive constraints.

---

## 2. Core Provable Invariants for Teacher Coaching & Evaluation

1. **Evidence-to-Rubric Score Consistency (`rubric_evidence_consistency`):**
   - Quantitative classroom observation metrics (e.g., `teacherTalkRatio = 0.82`, `waitTimeAvgSeconds = 0.8`, `dok2PlusQuestionsAsked = 0`) are bound as SMT facts.
   - Z3 proves that the assigned rubric score on *"Questioning & Discussion"* cannot be rated `Proficient (3/4)` or `Distinguished (4/4)` when `waitTimeAvgSeconds < 2.5` or `dok2PlusQuestionsAsked == 0`.
2. **Single High-Leverage Action Step ("Bite-Sized Coaching" Constraint):**
   - Instructional coaching research (Jim Knight; Bambrick-Santoyo's *Leverage Leadership*) shows teachers cannot implement 4 simultaneous behavioral changes at once.
   - Z3 enforces that a post-observation coaching plan prescribes **at most $1\text{--}2$ prioritized, observable action steps**, anchored to the lowest-scoring prerequisite teaching competency in the coaching DAG.
3. **Closed-Loop Alignment with Student Formative Data:**
   - If Pillar 1's formative exit ticket shows $65\%$ of students failed the `UNSEEN` transfer probe while passing the `SEEN` recall probe, Z3 verifies that the coaching recommendation targets **varied representation / conceptual transfer modeling** rather than basic vocabulary repetition.
