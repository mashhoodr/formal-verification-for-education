# Pillar 4: Foundational Literacy & Numeracy (EGRA / EGMA) Formal Verification (Charter)

> **Status:** Architectural Charter — Specializes our deterministic linguistic + SMT verification kernel for **Early Grade Reading Assessments (EGRA)** and decodable text generation.

## 1. Why Foundational Literacy (EGRA) Is Ideal for Formal Verification

In early literacy (**Science of Reading** & **EGRA — Early Grade Reading Assessment**), every single letter, phoneme, and word in a student's reading passage or assessment subtask is governed by a strict **Grapheme-Phoneme Correspondence (GPC) Scope & Sequence**.

When an LLM is asked to *"Write a 50-word story for a Grade 1 child who has only learned short vowels (`a, i, o`) and consonants (`m, s, t, p, n, c`),"* LLMs routinely hallucinate untaught vowel teams (`"rain"`, `"boat"`), silent-e words (`"time"`), or irregular sight words—ruining the diagnostic validity of the reading check.

---

## 2. Core Provable Invariants for EGRA & Decodable Text

1. **Strict Grapheme-Phoneme Scope & Sequence Closure (`gpc_decodability_bound`):**
   - Let $\mathcal{G}_{\text{taught}} = \{g_1, g_2, \dots, g_m\}$ be the exact set of grapheme-phoneme rules taught up to Lesson $L$, and let $\mathcal{H}_{\text{taught}}$ be the set of explicitly taught high-frequency irregular ("heart") words.
   - Every word $w$ in a generated passage is decomposed into its phoneme-grapheme sequence $\text{gpc}(w)$.
   - Z3 proves that:
     $$\forall w \in \text{Passage}, \quad \text{gpc}(w) \subseteq \mathcal{G}_{\text{taught}} \;\lor\; w \in \mathcal{H}_{\text{taught}}$$
     or enforces a strict **$\ge 95\%$ decodability ratio** with zero untaught multi-syllabic words.
2. **EGRA Subtask Structural Invariants:**
   - **Subtask 1 (Letter-Sound Identification):** 100 items balanced across uppercase/lowercase frequency distribution with no adjacent identical letters.
   - **Subtask 2 (Invented / Non-Word Decoding):** 50 pronounceable CVC / CCVC pseudowords (`"lat"`, `"mip"`) proven to have **zero overlap with real dictionary words** ($w \notin \mathcal{D}_{\text{real}}$) while strictly obeying $\text{gpc}(w) \subseteq \mathcal{G}_{\text{taught}}$ and English phonotactic constraints.
   - **Subtask 3 (Oral Reading Fluency — CWPM & Comprehension):** A 60-word narrative passage calibrated to target **Correct Words Per Minute (CWPM)** benchmarks, paired with 4 literal retrieval ($\text{DoK } 1$) and 1 inferential ($\text{DoK } 2$) comprehension questions ordered chronologically by where the answer appears in the text (so a student who reads 30 words in 60 seconds is only scored on questions covering words $1..30$!).
