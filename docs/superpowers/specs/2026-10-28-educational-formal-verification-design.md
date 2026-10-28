# Formal Verification for Primary & Secondary Educational Content (Assessments & Quizzes) — Design Specification

**Date:** 2026-10-28  
**Status:** Draft for User Review  
**Stack:** Python 3.11+ (`FastAPI`, `z3-solver`, `Pydantic` with `camelCase` serialization) + Interactive Web Playground (HTML/CSS/JS with `camelCase` variables)

---

## 1. Purpose & Problem Statement

Large Language Models (LLMs) generate primary and secondary school educational materials quickly, but frequently violate pedagogical, readability, and structural constraints—for example, using Grade 9 vocabulary in a Grade 3 quiz, writing 25-word sentences for 8-year-olds, or making the correct multiple-choice option three times longer than the distractors. Using another LLM to judge output ("LLM-as-a-judge") is probabilistic and unreliable.

Inspired by Anthropic's research on Formal Verification, this project pairs a probabilistic LLM generator/repair loop with a **deterministic mathematical verification kernel powered by Microsoft's Z3 SMT solver (`z3-solver`)**. Educators configure rules in plain English/numbers without needing any mathematics background, while Z3 formally proves whether an assessment satisfies all local and global constraints simultaneously (`SAT`) or extracts a **Minimal Unsatisfiable Core (`UNSAT Core`)** with exact mathematical repair bounds (`z3.Optimize`) to guide automatic LLM self-correction.

---

## 2. System Architecture & Module Boundaries

```mermaid
flowchart LR
    A["1. Teacher Input\n(Topic + Grade Spec)"] --> B["2. LLM Generator\n(Live API or Demo Draft)"]
    B --> C["3. Linguistic Analyzer\n(Deterministic Metrics)"]
    C --> D["4. Z3 Formal Kernel\n(z3.Solver + z3.Optimize)"]
    D -->|SAT (Verified)| E["5. Proof Certificate\n+ SMT-LIB2 Transcript"]
    D -->|UNSAT (Violations)| F["6. Counterexample Prescription\n(Unsat Core + Target Bounds)"]
    F -->|Surgical Repair Prompt| B
```

### Project Directory Layout

```text
educationformalverification/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI application & routes
│   ├── models.py                    # CamelCase Pydantic models for API requests/responses
│   ├── verifier/
│   │   ├── __init__.py
│   │   ├── grade_specs.py           # Pre-built Grade Band Specifications (G1-2, G3-5, G6-8, G9-12)
│   │   ├── linguistic_analyzer.py   # Deterministic word, sentence, syllable, and readability extractor
│   │   ├── z3_kernel.py             # Z3 SMT solver & optimizer encoding all 6 formal rule categories
│   │   └── repair_orchestrator.py   # Bounded Generate -> Verify -> Repair loop (Demo + Live LLM modes)
│   └── static/
│       ├── index.html               # Interactive two-column Web Playground
│       ├── styles.css               # Clean educational verification UI styling
│       └── app.js                   # Frontend interaction logic (strictly camelCase variables)
├── tests/
│   ├── test_linguistic_analyzer.py  # Unit tests for deterministic text metrics & allowlist exemptions
│   ├── test_z3_kernel.py            # Formal proof tests (SAT, UNSAT core trackers, Optimize bounds)
│   └── test_api_and_repair.py       # FastAPI endpoint & auto-repair loop integration tests
├── requirements.txt
└── README.md
```

### Module Responsibilities

1. **`app/models.py` (Schema & `camelCase` Contract):**
   - Defines `CamelModel(BaseModel)` using `alias_generator = to_camel` and `populate_by_name = True` so all JSON payloads returned by the backend strictly follow `camelCase` naming conventions.
   - Core models: `Assessment`, `QuestionItem`, `GradeSpec`, `QuestionMetrics`, `AssessmentMetrics`, `ConstraintViolation`, `RepairPrescription`, `VerificationResult`, `RepairLoopResponse`.

2. **`app/verifier/grade_specs.py` (Grade-Band Specifications):**
   - Provides 4 default specifications covering Primary and Secondary school:
     - `primaryG1G2` (Grades 1–2, Ages 6–8)
     - `primaryG3G5` (Grades 3–5, Ages 8–11)
     - `secondaryG6G8` (Grades 6–8, Ages 11–14)
     - `secondaryG9G12` (Grades 9–12, Ages 14–18)
   - Each `GradeSpec` defines:
     - `gradeBandId`: string identifier
     - `label`: human-readable title
     - `maxWordsPerSentence`: integer upper bound on sentence length
     - `maxSyllablesPerWord`: integer upper bound on word syllable count (for words not in `topicAllowlist`)
     - `fleschKincaidMin` / `fleschKincaidMax`: float bounds for whole-assessment Flesch-Kincaid Grade Level
     - `maxOptionWordSpread`: integer maximum allowed difference (`max(optionWords) - min(optionWords)`) within any question's multiple-choice options
     - `maxBackwardComplexityDrop`: integer tolerance for question-to-question complexity scaffolding (`questionComplexity[i+1] + tolerance >= questionComplexity[i]`)
     - `readingSpeedWpm`: integer average grade reading speed in words per minute
     - `perQuestionThinkSeconds`: integer thinking time per question
     - `quizDurationMinutes`: integer total time budget for the assessment
     - `topicAllowlist`: list of lowercase curriculum terms exempt from `maxSyllablesPerWord`

3. **`app/verifier/linguistic_analyzer.py` (Deterministic Feature Extraction):**
   - Pure, repeatable Python text analysis with zero randomness:
     - Splits text into sentences on `.`, `!`, `?` while ignoring common abbreviations (`Mr.`, `Mrs.`, `Dr.`, `e.g.`, `i.e.`).
     - Extracts alphabetic word tokens and counts syllables deterministically using a rule-based English vowel-group + suffix-adjustment algorithm with a deterministic dictionary override table for common irregular educational words.
     - Identifies `complexWords` (words with `syllableCount > spec.maxSyllablesPerWord` and `word.lower() not in spec.topicAllowlist`).
     - Computes whole-quiz Flesch-Kincaid Grade Level:
       $$\text{FKRA} = 0.39 \times \left(\frac{\text{totalWords}}{\text{totalSentences}}\right) + 11.8 \times \left(\frac{\text{totalSyllables}}{\text{totalWords}}\right) - 15.59$$
     - Computes per-question complexity score (`stemWordCount + sum(optionWordCounts) + 3 * complexWordCount`) and total estimated completion time in seconds.

4. **`app/verifier/z3_kernel.py` (Formal SMT Verification & Optimizer):**
   - Instantiates a fresh `z3.Solver()` context for every verification call.
   - Declares Z3 symbolic constants (`z3.Int`, `z3.Real`) bound to the extracted assessment metrics and asserts the grade specification rules using `solver.assert_and_track(constraint, tracker_name)` across 6 formal categories:
     1. **Sentence Length Bounds:** `q{i}_stem_sentence_words`, `q{i}_opt{j}_sentence_words`, `q{i}_explanation_sentence_words`
     2. **Lexical Syllable & Allowlist Bounds:** `q{i}_stem_complex_words`, `q{i}_opt{j}_complex_words`, `q{i}_explanation_complex_words`
     3. **Whole-Quiz Flesch-Kincaid Readability Band:** `quiz_flesch_kincaid_min`, `quiz_flesch_kincaid_max`
     4. **Distractor Length Balance:** `q{i}_distractor_word_spread` (`maxOptionWords - minOptionWords <= spec.maxOptionWordSpread`)
     5. **Progressive Scaffolding Ordering:** `q{i}_to_q{i+1}_scaffolding_order` (`complexity[i+1] + spec.maxBackwardComplexityDrop >= complexity[i]`)
     6. **Grade Reading-Time Budget:** `quiz_reading_time_budget` (`estimatedSeconds <= spec.quizDurationMinutes * 60`)
   - **When `solver.check() == z3.sat`:**
     - Generates the `smtLib2Script` via `solver.sexpr()` plus `(check-sat)`.
     - Computes a deterministic SHA-256 `certificateHash` over the canonical JSON of the assessment + `GradeSpec`.
   - **When `solver.check() == z3.unsat`:**
     - Extracts `unsatCore` tracker names from `solver.unsat_core()`.
     - Runs a `z3.Optimize()` pass with symbolic target variables (`targetStemWords`, `targetOptionWords`, `targetComplexWords`) minimizing Manhattan distance (`|target - current|`) to compute exact numerical `RepairPrescription` instructions for each failed tracker.

5. **`app/verifier/repair_orchestrator.py` (Counterexample-Guided Auto-Repair Loop):**
   - Executes up to `maxIterations = 3` repair passes:
     - **Iteration 0:** Verifies the initial assessment draft via `z3_kernel.verify_assessment(assessment, spec)`.
     - **Iterations 1..3 (if `UNSAT`):** Builds a surgical repair prompt containing only the `unsatCore` trackers and Z3's `RepairPrescription` target bounds, invokes the repair provider, and re-verifies with `z3_kernel`.
   - Supports two providers:
     - **Built-in Deterministic Demo Provider:** Ships with 3 realistic primary/secondary school quiz scenarios (`waterCycleG3`, `fractionsRatiosG7`, `habitatsExitTicketG2`) that start with genuine LLM flaws (`UNSAT`) and step through realistic counterexample-guided repairs to `SAT` without requiring an external API key.
     - **Live LLM Provider:** Calls Gemini / OpenAI / Anthropic via REST using a user-supplied API key in the request header/payload to generate and repair custom topics live.

---

## 3. API Endpoints (All `camelCase` JSON)

1. **`GET /api/specs`**
   - Returns all built-in `GradeSpec` profiles (`primaryG1G2`, `primaryG3G5`, `secondaryG6G8`, `secondaryG9G12`) and the list of pre-built demo scenarios.
2. **`POST /api/verify`**
   - Request: `{ "assessment": Assessment, "gradeSpec": GradeSpec }`
   - Response: `VerificationResult` (`status`: `"sat"` | `"unsat"`, `certificateHash`, `smtLib2Script`, `unsatCore`, `violations`, `prescriptions`, `metrics`).
3. **`POST /api/generate-and-verify`**
   - Request: `{ "scenarioId"?: string, "topic"?: string, "gradeSpec": GradeSpec, "maxIterations": number, "llmConfig"?: { "provider": string, "apiKey": string, "model"?: string } }`
   - Response: `RepairLoopResponse` (`finalStatus`: `"sat"` | `"unverifiedAfterRetries"`, `totalIterations`, `iterations`: list of `{ iterationIndex, assessment, verificationResult, repairSummary }`).

---

## 4. Error Handling & Edge Cases

- **Bounded Termination:** `maxIterations` is clamped to `1..5` (default `3`). If still `unsat` after the final iteration, returns `finalStatus: "unverifiedAfterRetries"` with the full trace.
- **Degenerate Text Inputs:** Empty questions or 0-word strings are caught by Pydantic validation (`min_length=1`) and guarded against division-by-zero in `linguistic_analyzer.py`.
- **Correct Answer Index Integrity:** Validates that each question has at least 2 options and `0 <= correctOptionIndex < len(options)`.

---

## 5. Testing Strategy

1. **`tests/test_linguistic_analyzer.py`:**
   - Verifies deterministic syllable counts on simple and multi-syllable words.
   - Verifies `topicAllowlist` exempts allowed domain vocabulary from `complexWords`.
   - Verifies sentence splitting and Flesch-Kincaid Grade Level calculation.
2. **`tests/test_z3_kernel.py`:**
   - Verifies a compliant Grade 3 assessment returns `status == "sat"`, empty `unsatCore`, non-empty `certificateHash`, and valid `smtLib2Script`.
   - Verifies each of the 6 formal constraint categories independently triggers `status == "unsat"`, populates the exact expected tracker in `unsatCore`, and produces valid `z3.Optimize` target bounds in `prescriptions`.
3. **`tests/test_api_and_repair.py`:**
   - Verifies all API endpoints return HTTP 200 and strictly `camelCase` JSON keys.
   - Verifies the auto-repair orchestrator takes each flawed demo scenario from `unsat` (Iteration 0) to `sat` (Verified) with a complete iteration history.
