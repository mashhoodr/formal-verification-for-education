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
