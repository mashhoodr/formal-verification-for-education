# K-12 Educational Content Formal Verification Playground

> **Built with [Google Antigravity](https://antigravity.google) and Gemini 4 Argon.**

Inspired by [Anthropic's Formal Verification Research](https://www.anthropic.com/research/formal-verification), this project brings **Formal Verification** to Primary and Secondary School educational content (assessments and quizzes) without requiring educators to have a mathematics background.

Instead of relying on probabilistic "LLM-as-a-judge" checks, this system pairs an LLM generator with a **deterministic linguistic analyzer** and **Microsoft's Z3 SMT Theorem Prover (`z3-solver`)**:

1. **Plain-English Grade Specifications ("Theorems"):** Configurable grade-band profiles (`Primary Grades 1–2`, `Primary Grades 3–5`, `Lower Secondary Grades 6–8`, `Upper Secondary Grades 9–12`) + curriculum `topicAllowlist` terms.
2. **Formal SMT-LIB2 Verification (`z3.Solver` + `assert_and_track`):** Verifies 6 formal constraint categories simultaneously:
   - Sentence length upper bounds (`maxWordsPerSentence`)
   - Lexical syllable complexity with curriculum allowlists (`maxSyllablesPerWord` + `topicAllowlist`)
   - Whole-assessment Flesch-Kincaid Grade Level band (`[fleschKincaidMin, fleschKincaidMax]`)
   - Multiple-choice distractor length fairness (`maxOptionWordSpread`)
   - Progressive question complexity scaffolding (`maxBackwardComplexityDrop`)
   - Student reading & thinking time budget (`quizDurationMinutes` at grade `readingSpeedWpm`)
3. **Counterexample-Guided Auto-Repair (`UNSAT Core` + `z3.Optimize`):** When an assessment fails verification (`UNSAT`), Z3 extracts the minimal unsatisfiable core and solves for the exact target word/syllable bounds needed to guide automatic LLM self-repair until `SAT` (100% verified) is achieved.

---

## Interactive Playground & Proof Visualizations

### 1. Counterexample Detection & Z3 Optimizer Prescriptions (`Draft: UNSAT`)

When an initial LLM draft is evaluated against the **Primary School (Grades 3–5)** specification, Z3 flags all violated theorem constraints simultaneously and uses `z3.Optimize` (Manhattan-distance minimization) to prescribe exact numerical repair targets:

![Playground Overview — Initial Draft UNSAT](docs/screenshots/playground-overview-unsat.png)

---

### 2. Deep SMT-LIB2 Proof Inspector: Understanding an `UNSAT` Proof (`q1_distractor_word_spread`)

Clicking the **SMT-LIB2 Formal Proof Script** tab and selecting any proof item in the **`assert_and_track` Proof Matrix** (such as `q1_distractor_word_spread`) opens the **Deep Proof Inspector**, which breaks down how Z3 proves a counterexample from the raw assessment text to the final SMT contradiction:

![Deep Proof Inspector — Distractor Word Spread UNSAT Closeup](docs/screenshots/deep-proof-inspector-distractor-spread-closeup.png)

#### How the `q1_distractor_word_spread` `UNSAT` Proof Works Step-by-Step:

1. **Source Text & Linguistic Measurement (`max(13) - min(2) = 11 words`):**
   - In the flawed Grade 3 draft, the correct answer (Option 1) has **13 words** (`"Evaporation occurs as liquid water warms up and changes into rising water vapor"`), while the three distractors (Options 2–4) have only **2 words** each (`"Cold snow"`, `"Dry wind"`, `"Hard ice"`).
   - This is a classic multiple-choice "length giveaway" flaw: students can guess Option 1 purely by its length. The deterministic analyzer measures `spread = 13 - 2 = 11` words.
2. **Z3 Ground-Truth Variable Binding:**
   - The measured spread is bound to an SMT integer constant:
     ```lisp
     (declare-fun q1_option_word_spread_val () Int)
     (assert (= q1_option_word_spread_val 11))
     ```
   - The Grade 3–5 theorem requires `maxOptionWordSpread <= 5`, guarded by the boolean tracker `q1_distractor_word_spread`:
     ```lisp
     (declare-fun q1_distractor_word_spread () Bool)
     (assert (=> q1_distractor_word_spread (<= q1_option_word_spread_val 5)))
     ```
3. **Variable Substitution & Modus Ponens Contradiction (`⊥ UNSAT CORE`):**
   - **Step A (Symbolic Assertion):** `(assert (=> q1_distractor_word_spread (<= q1_option_word_spread_val 5)))`
   - **Step B (Variables Populated with Actual Values):** Substituting `q1_distractor_word_spread := true` and `q1_option_word_spread_val := 11` yields:
     ```lisp
     (assert (=> true (<= 11 5)))
     ```
   - **Step C (Boolean Reduction):** Because `(<= 11 5)` evaluates to `false`, the implication reduces to `(assert (=> true false))` $\equiv$ `(assert false)` $\Rightarrow$ **`⊥ CONTRADICTION`**, placing `q1_distractor_word_spread` into Z3's **`UNSAT Core`**.
4. **Z3 Optimizer Repair Prescription (`z3.Optimize`):**
   - Rather than merely rejecting the question, `z3.Optimize` solves for target option lengths $L'_1, \dots, L'_4$ minimizing $\sum |L'_j - L_j|$ subject to $\max(L') - \min(L') \le 5$, prescribing:
     > *"Balance q1 answer options so every option is between 2 and 7 words (max spread <= 5 words)."*

Full-page view of the **SMT-LIB2 Formal Proof Script** tab during `UNSAT` analysis:

![Full SMT-LIB2 Proof Tab — UNSAT](docs/screenshots/smt-proof-distractor-spread-unsat.png)

---

### 3. Verified Assessment & Cryptographic Proof Certificate (`Repair 2: SAT`)

After counterexample-guided auto-repair balances all four options to **5 words each** (`spread = 5 - 5 = 0 <= 5`), simplifies sentences to `<= 14 words`, and replaces unapproved `>3`-syllable words, `(check-sat)` resolves to **`SAT` (`30/30 Verified`)** and issues a SHA-256 proof certificate:

![Full SMT-LIB2 Proof Tab — Verified SAT](docs/screenshots/smt-proof-verified-sat.png)

---

## Quick Start

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest -v
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Then open `http://localhost:8000` in your browser.

## Attribution

Designed, planned, and implemented autonomously using **Google Antigravity** powered by **Gemini 4 Argon**.
