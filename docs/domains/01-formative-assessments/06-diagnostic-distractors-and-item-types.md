# Dimension 6: Diagnostic Distractors & Multi-Format Item Design

## 1. What Makes a Great MCQ Distractor in a Formative Assessment?

In a summative exam, distractors are often designed just to make the question "harder." In an **in-class formative assessment**, a distractor has a completely different purpose:

> **Every wrong option in a formative MCQ must be a diagnostic sensor for a specific, actionable student misconception.**

If a student selects Option B, the teacher (or adaptive tutoring system) should know **why** the student selected B without having to interview them.

---

## 2. The 4 Formal Invariants of Rigorous MCQ Distractors

### Invariant 1: Bijective Misconception Mapping (`q_distractor_misconception_distinct`)
Let $\mathcal{M}_k = \{m_1, m_2, \dots, m_r\}$ be the catalog of known student misconceptions for target Atomic KC $k$.
- *Example ($\text{KC}$: Adding fractions $\frac{1}{4} + \frac{2}{4}$):*
  - $m_1$: Adds both numerators and denominators ($\frac{1+2}{4+4} = \frac{3}{8}$).
  - $m_2$: Multiplies numerators instead of adding ($\frac{1 \times 2}{4} = \frac{2}{4}$).
  - $m_3$: Adds denominator to numerator ($\frac{1+4+2}{4} = \frac{7}{4}$).

For an MCQ with $D$ distractors $\{d_1, \dots, d_D\}$, each distractor must map to a misconception $f(d_j) \in \mathcal{M}_k$:

$$\forall j \in \{1..D\}, \quad f(d_j) \neq \text{NULL\_MISCONCEPTION} \quad \land \quad \text{Distinct}\big(f(d_1), \dots, f(d_D)\big)$$

- **Why this catches the #1 LLM MCQ flaw:** LLMs routinely generate 1 plausible distractor and 2 "silly/throwaway" distractors (`NULL_MISCONCEPTION`), or 2 distractors that represent the exact same error. If 2 out of 4 options are obviously silly, a 4-option MCQ secretly degrades into a 2-option coin flip ($P(\text{guess}) = 0.50$ instead of $0.25$)!

### Invariant 2: Surface Length & Grammatical Symmetry (`q_distractor_word_spread`)
Students quickly learn the test-wise heuristic: *"When in doubt, pick the longest, most qualified option."*
Z3 enforces:
$$\max_{j}(\text{words}(o_j)) - \min_{j}(\text{words}(o_j)) \le S_{\max}(\text{Grade})$$
and requires all options to match in grammatical category and modality (no hedging words like *"always"* / *"never"* isolated to distractors while *"sometimes"* / *"usually"* appears only in the key).

### Invariant 3: Zero Meta-Options (`q_zero_meta_options`)
Phrases like *"All of the above"*, *"None of the above"*, *"Both A and B"*, or *"Only C"* are **formally banned** in K–12 formative assessments:
- *"All of the above"* allows a student who only recognizes 2 of the 3 choices to get full credit without testing the 3rd choice.
- *"None of the above"* tells the teacher that the student rejected A, B, and C, but **fails to diagnose what the student actually believes the answer is**.

### Invariant 4: Zero Stem-to-Key Lexical Cueing (`q_zero_lexical_echo`)
The correct option must not uniquely echo rare content words from the stem (or share a unique morphological root) unless at least one distractor also shares that lexical feature.

---

## 3. Formal Verification Invariants for Non-MCQ Item Types

As we expand beyond MCQs to **Short Answer, Match-the-Column, Comprehension Sets, and Long Answer**, each item type compiles into its own Z3 constraint block:

| Item Format | Structural & Pedagogical Invariants Verified by Z3 |
| :--- | :--- |
| **Match-the-Column ($N$ Premises $\times M$ Responses)** | 1. **Asymmetric Target Pool ($M = N + 1$ or $N + 2$):** Prevents solving the final pair by process of elimination!<br>2. **Category Homogeneity:** All $N$ premises and $M$ responses must belong to the same semantic ontological type (e.g., all 4 premises are *Water Cycle Processes*, not 3 processes + 1 temperature number—which gives away the number pair for free). |
| **Short Answer / Fill-in-the-Blank** | 1. **Blank Position & Unique Determinacy:** The blank must target the primary Atomic KC term/value (not a trivial function word) and have an explicit equivalence class of accepted answers.<br>2. **Response Time Allocation:** Allocates $2.5\times$ the response production time of an MCQ (writing/typing overhead for grade level). |
| **Reading / Science Comprehension Set** | 1. **Stimulus Amortization Bound:** A shared passage of $W_p$ words must be paired with $3 \le n_{\text{sub}} \le 5$ linked items so reading time isn't wasted on a single question.<br>2. **Item-to-Item Independence (No Domino Failure):** The answer to Q2 in the passage set must **not** depend on getting Q1 right (or Q2's stem must not accidentally reveal the answer to Q1!). |
| **Long Answer / Constructed Explanation** | 1. **Explicit Atomic KC Rubric Decomposition:** The scoring rubric must map each point $p_r$ to an explicit Atomic KC or causal link in the Prerequisite DAG.<br>2. **Stage Writing Speed Feasibility:** Expected word count $W_{\text{expected}}$ divided by grade-band writing speed ($\text{WPM}_{\text{write}} \approx 8\text{--}20\text{ WPM}$) must fit inside the quiz time budget. |
