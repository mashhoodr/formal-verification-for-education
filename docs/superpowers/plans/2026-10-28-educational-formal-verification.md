# Educational Content Formal Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a formal verification engine and interactive web playground for K-12 assessments that pairs deterministic linguistic extraction and Microsoft's Z3 SMT solver (`z3-solver`) with a counterexample-guided LLM auto-repair loop.

**Architecture:** A modular Python FastAPI backend extracts deterministic sentence, syllable, readability, scaffolding, and reading-time metrics from assessment JSON, compiles them alongside plain-English Grade Band Specifications into named `z3.Solver` assertions (`assert_and_track`), and uses `z3.Optimize` to compute minimal repair target bounds whenever an assessment is `UNSAT`. A vanilla HTML/CSS/JS frontend (using strict `camelCase` conventions) lets educators inspect the Z3 `SMT-LIB2` proof, view `UNSAT Core` counterexamples, and step through automatic repairs.

**Tech Stack:** Python 3.11+, `FastAPI`, `Pydantic` v2, `z3-solver`, `pytest`, `httpx`, Vanilla HTML5/CSS3/JS.

**Spec:** `docs/superpowers/specs/2026-10-28-educational-formal-verification-design.md`

## Global Constraints

- All backend API JSON responses MUST use `camelCase` keys (`alias_generator = to_camel`, `populate_by_name = True`, `by_alias = True`).
- All frontend JavaScript variables and functions MUST use `camelCase`.
- The formal verification kernel MUST use `z3-solver` (`z3.Solver`, `assert_and_track`, `unsat_core`, `z3.Optimize`) and return inspectable `SMT-LIB2` output.
- The auto-repair loop MUST have a hard upper bound on iterations (`1 <= maxIterations <= 5`, default `3`).

---

### Task 1: Project Setup, `camelCase` Models & Grade Specifications

**Files:**
- Create: `requirements.txt`
- Create: `app/__init__.py`
- Create: `app/models.py`
- Create: `app/verifier/__init__.py`
- Create: `app/verifier/grade_specs.py`
- Test: `tests/test_models_and_specs.py`

**Interfaces:**
- Consumes: None (foundational models and specifications)
- Produces:
  - `app.models`: `CamelModel`, `QuestionItem`, `Assessment`, `GradeSpec`, `SentenceMetric`, `QuestionMetrics`, `AssessmentMetrics`, `ConstraintViolation`, `RepairPrescription`, `VerificationResult`, `VerifyRequest`, `IterationRecord`, `LlmConfig`, `GenerateAndVerifyRequest`, `RepairLoopResponse`
  - `app.verifier.grade_specs`: `DEFAULT_GRADE_SPECS: dict[str, GradeSpec]`, `get_grade_spec(grade_band_id: str) -> GradeSpec`, `list_grade_specs() -> list[GradeSpec]`

- [ ] **Step 1: Write the failing test for `camelCase` serialization and default Grade Specs**

Create `tests/test_models_and_specs.py`:

```python
from app.models import Assessment, GradeSpec, QuestionItem
from app.verifier.grade_specs import get_grade_spec, list_grade_specs


def test_models_serialize_to_camel_case():
    question = QuestionItem(
        question_id="q1",
        stem="Water turns into vapor when heated.",
        options=["Evaporation", "Condensation", "Precipitation", "Collection"],
        correct_option_index=0,
        explanation="Heat causes liquid water to evaporate.",
    )
    assessment = Assessment(
        title="Water Cycle Quiz",
        grade_band_id="primaryG3G5",
        questions=[question],
    )
    dumped = assessment.model_dump(by_alias=True)
    assert "gradeBandId" in dumped
    assert "correctOptionIndex" in dumped["questions"][0]
    assert "questionId" in dumped["questions"][0]
    assert "grade_band_id" not in dumped


def test_default_grade_specs_cover_primary_and_secondary():
    specs = list_grade_specs()
    band_ids = [s.grade_band_id for s in specs]
    assert band_ids == [
        "primaryG1G2",
        "primaryG3G5",
        "secondaryG6G8",
        "secondaryG9G12",
    ]
    g3_spec = get_grade_spec("primaryG3G5")
    assert isinstance(g3_spec, GradeSpec)
    assert g3_spec.max_words_per_sentence == 14
    assert g3_spec.max_syllables_per_word == 3
    dumped_spec = g3_spec.model_dump(by_alias=True)
    assert dumped_spec["maxWordsPerSentence"] == 14
    assert dumped_spec["topicAllowlist"] == []
```

- [ ] **Step 2: Set up Python virtual environment, `requirements.txt`, and verify test fails**

Create `requirements.txt`:

```text
fastapi>=0.110.0
uvicorn>=0.29.0
pydantic>=2.7.0
z3-solver>=4.13.0.0
httpx>=0.27.0
pytest>=8.1.0
```

Run:
```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest tests/test_models_and_specs.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Implement `app/models.py` and `app/verifier/grade_specs.py`**

Create empty `app/__init__.py` and `app/verifier/__init__.py`.

Create `app/models.py`:

```python
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class QuestionItem(CamelModel):
    question_id: str = Field(..., min_length=1)
    stem: str = Field(..., min_length=1)
    options: list[str] = Field(..., min_length=2)
    correct_option_index: int = Field(..., ge=0)
    explanation: str = Field(default="")


class Assessment(CamelModel):
    title: str = Field(..., min_length=1)
    grade_band_id: str = Field(..., min_length=1)
    questions: list[QuestionItem] = Field(..., min_length=1)


class GradeSpec(CamelModel):
    grade_band_id: str
    label: str
    max_words_per_sentence: int = Field(..., gt=0)
    max_syllables_per_word: int = Field(..., gt=0)
    flesch_kincaid_min: float
    flesch_kincaid_max: float
    max_option_word_spread: int = Field(..., ge=0)
    max_backward_complexity_drop: int = Field(default=6, ge=0)
    reading_speed_wpm: int = Field(..., gt=0)
    per_question_think_seconds: int = Field(..., ge=0)
    quiz_duration_minutes: int = Field(..., gt=0)
    topic_allowlist: list[str] = Field(default_factory=list)


class QuestionMetrics(CamelModel):
    question_id: str
    stem_word_count: int
    stem_sentence_count: int
    stem_max_sentence_words: int
    stem_complex_words: list[str]
    option_word_counts: list[int]
    option_max_sentence_words: list[int]
    option_complex_words: list[list[str]]
    option_word_spread: int
    explanation_word_count: int
    explanation_max_sentence_words: int
    explanation_complex_words: list[str]
    complexity_score: int


class AssessmentMetrics(CamelModel):
    total_words: int
    total_sentences: int
    total_syllables: int
    flesch_kincaid_grade: float
    estimated_completion_seconds: float
    question_metrics: list[QuestionMetrics]


class ConstraintViolation(CamelModel):
    tracker_id: str
    rule_category: str
    location: str
    message: str
    actual_value: float
    limit_value: float
    offending_tokens: list[str] = Field(default_factory=list)


class RepairPrescription(CamelModel):
    tracker_id: str
    location: str
    target_metric: str
    current_value: float
    target_min: float
    target_max: float
    instruction: str


class VerificationResult(CamelModel):
    status: Literal["sat", "unsat"]
    certificate_hash: Optional[str] = None
    smt_lib2_script: str
    unsat_core: list[str]
    violations: list[ConstraintViolation]
    prescriptions: list[RepairPrescription]
    metrics: AssessmentMetrics


class VerifyRequest(CamelModel):
    assessment: Assessment
    grade_spec: GradeSpec


class LlmConfig(CamelModel):
    provider: Literal["gemini", "openai", "anthropic"] = "gemini"
    api_key: str = ""
    model: Optional[str] = None


class GenerateAndVerifyRequest(CamelModel):
    scenario_id: Optional[str] = None
    topic: Optional[str] = None
    grade_spec: GradeSpec
    max_iterations: int = Field(default=3, ge=1, le=5)
    llm_config: Optional[LlmConfig] = None


class IterationRecord(CamelModel):
    iteration_index: int
    assessment: Assessment
    verification_result: VerificationResult
    repair_summary: str


class RepairLoopResponse(CamelModel):
    final_status: Literal["sat", "unverifiedAfterRetries"]
    total_iterations: int
    iterations: list[IterationRecord]
```

Create `app/verifier/grade_specs.py`:

```python
from app.models import GradeSpec

DEFAULT_GRADE_SPECS: dict[str, GradeSpec] = {
    "primaryG1G2": GradeSpec(
        grade_band_id="primaryG1G2",
        label="Primary School (Grades 1–2 / Ages 6–8)",
        max_words_per_sentence=10,
        max_syllables_per_word=2,
        flesch_kincaid_min=0.5,
        flesch_kincaid_max=3.2,
        max_option_word_spread=3,
        max_backward_complexity_drop=5,
        reading_speed_wpm=80,
        per_question_think_seconds=20,
        quiz_duration_minutes=5,
        topic_allowlist=[],
    ),
    "primaryG3G5": GradeSpec(
        grade_band_id="primaryG3G5",
        label="Primary School (Grades 3–5 / Ages 8–11)",
        max_words_per_sentence=14,
        max_syllables_per_word=3,
        flesch_kincaid_min=2.5,
        flesch_kincaid_max=5.8,
        max_option_word_spread=5,
        max_backward_complexity_drop=6,
        reading_speed_wpm=115,
        per_question_think_seconds=25,
        quiz_duration_minutes=8,
        topic_allowlist=[],
    ),
    "secondaryG6G8": GradeSpec(
        grade_band_id="secondaryG6G8",
        label="Lower Secondary (Grades 6–8 / Ages 11–14)",
        max_words_per_sentence=20,
        max_syllables_per_word=4,
        flesch_kincaid_min=5.5,
        flesch_kincaid_max=8.8,
        max_option_word_spread=7,
        max_backward_complexity_drop=8,
        reading_speed_wpm=150,
        per_question_think_seconds=30,
        quiz_duration_minutes=10,
        topic_allowlist=[],
    ),
    "secondaryG9G12": GradeSpec(
        grade_band_id="secondaryG9G12",
        label="Upper Secondary (Grades 9–12 / Ages 14–18)",
        max_words_per_sentence=26,
        max_syllables_per_word=5,
        flesch_kincaid_min=8.0,
        flesch_kincaid_max=12.8,
        max_option_word_spread=10,
        max_backward_complexity_drop=10,
        reading_speed_wpm=185,
        per_question_think_seconds=40,
        quiz_duration_minutes=15,
        topic_allowlist=[],
    ),
}


def get_grade_spec(grade_band_id: str) -> GradeSpec:
    spec = DEFAULT_GRADE_SPECS.get(grade_band_id)
    if spec is None:
        raise KeyError(f"Unknown gradeBandId: {grade_band_id}")
    return spec.model_copy(deep=True)


def list_grade_specs() -> list[GradeSpec]:
    return [spec.model_copy(deep=True) for spec in DEFAULT_GRADE_SPECS.values()]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_models_and_specs.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit Task 1**

```bash
git add requirements.txt app/__init__.py app/models.py app/verifier/__init__.py app/verifier/grade_specs.py tests/test_models_and_specs.py
git commit -m "feat: add camelCase Pydantic models and default K-12 grade specs"
```

---

### Task 2: Deterministic Linguistic Analyzer (`app/verifier/linguistic_analyzer.py`)

**Files:**
- Create: `app/verifier/linguistic_analyzer.py`
- Test: `tests/test_linguistic_analyzer.py`

**Interfaces:**
- Consumes: `Assessment`, `GradeSpec`, `AssessmentMetrics`, `QuestionMetrics` from `app.models`
- Produces:
  - `count_syllables(word: str) -> int`
  - `split_sentences(text: str) -> list[str]`
  - `extract_words(text: str) -> list[str]`
  - `analyze_assessment(assessment: Assessment, grade_spec: GradeSpec) -> AssessmentMetrics`

- [ ] **Step 1: Write the failing tests for syllable counting, sentence splitting, allowlist filtering, and assessment metrics**

Create `tests/test_linguistic_analyzer.py`:

```python
from app.models import Assessment, QuestionItem
from app.verifier.grade_specs import get_grade_spec
from app.verifier.linguistic_analyzer import (
    analyze_assessment,
    count_syllables,
    extract_words,
    split_sentences,
)


def test_count_syllables_deterministic():
    assert count_syllables("cat") == 1
    assert count_syllables("water") == 2
    assert count_syllables("energy") == 3
    assert count_syllables("evaporation") == 5
    assert count_syllables("photosynthesis") == 5


def test_split_sentences_handles_abbreviations_and_punctuation():
    text = "Mr. Smith heated the water. Did it boil? Yes, it turned into steam!"
    sentences = split_sentences(text)
    assert len(sentences) == 3
    assert len(extract_words(sentences[0])) == 5


def test_analyze_assessment_respects_topic_allowlist():
    spec = get_grade_spec("primaryG3G5")
    spec.topic_allowlist = ["evaporation"]

    assessment = Assessment(
        title="Water Quiz",
        grade_band_id="primaryG3G5",
        questions=[
            QuestionItem(
                question_id="q1",
                stem="What causes evaporation when sunlight warms a shallow puddle?",
                options=[
                    "Heat from the sun",
                    "Cold winter wind",
                    "Dark clouds above",
                    "Heavy falling rain",
                ],
                correct_option_index=0,
                explanation="Sunlight warms the water continuously.",
            )
        ],
    )

    metrics = analyze_assessment(assessment, spec)
    q1 = metrics.question_metrics[0]
    # "evaporation" has 5 syllables (> 3) but is in topic_allowlist, so stem_complex_words is empty
    assert q1.stem_complex_words == []
    # "continuously" in explanation is not in allowlist and has > 3 syllables
    assert "continuously" in q1.explanation_complex_words
    assert q1.option_word_spread == 1
    assert metrics.total_words > 0
    assert metrics.estimated_completion_seconds > 25
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_linguistic_analyzer.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.verifier.linguistic_analyzer'`

- [ ] **Step 3: Implement `app/verifier/linguistic_analyzer.py`**

Create `app/verifier/linguistic_analyzer.py`:

```python
import re
from app.models import Assessment, AssessmentMetrics, GradeSpec, QuestionMetrics

SYLLABLE_OVERRIDES: dict[str, int] = {
    "area": 3,
    "business": 2,
    "camera": 3,
    "chocolate": 3,
    "comfortable": 3,
    "continuously": 5,
    "different": 3,
    "ecosystem": 4,
    "electricity": 5,
    "energy": 3,
    "environment": 4,
    "evaporate": 4,
    "evaporation": 5,
    "every": 2,
    "family": 3,
    "favorite": 3,
    "general": 3,
    "history": 3,
    "idea": 3,
    "interesting": 3,
    "laboratory": 4,
    "mathematics": 4,
    "molecule": 3,
    "molecules": 3,
    "natural": 3,
    "oxygen": 3,
    "photosynthesis": 5,
    "photosynthetic": 5,
    "poem": 2,
    "precipitation": 5,
    "quiet": 2,
    "science": 2,
    "scientific": 4,
    "separate": 3,
    "several": 3,
    "simultaneously": 6,
    "temperature": 4,
    "transformation": 4,
    "uncharacteristically": 8,
    "usually": 4,
    "vegetable": 3,
    "vegetables": 3,
}

ABBREVIATIONS = ("mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.", "vs.", "e.g.", "i.e.")
WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")


def extract_words(text: str) -> list[str]:
    return WORD_RE.findall(text)


def count_syllables(word: str) -> int:
    cleaned = re.sub(r"[^a-z]", "", word.lower())
    if not cleaned:
        return 0
    if cleaned in SYLLABLE_OVERRIDES:
        return SYLLABLE_OVERRIDES[cleaned]
    if len(cleaned) <= 3:
        return 1

    # Remove silent trailing 'e', 'es', 'ed' unless preceded by specific consonants
    work = cleaned
    if work.endswith("e"):
        if not (work.endswith("le") and len(work) > 2 and work[-3] not in "aeiouy"):
            work = work[:-1]
    elif work.endswith("es") and not work.endswith(("ses", "zes", "xes", "ches", "shes")):
        work = work[:-2]
    elif work.endswith("ed") and not work.endswith(("ted", "ded")):
        work = work[:-2]

    vowel_groups = re.findall(r"[aeiouy]+", work)
    count = len(vowel_groups)

    # Adjustments for common diphthongs/triphthongs and syllabic suffixes
    if cleaned.endswith("ia") or cleaned.endswith("io") or cleaned.endswith("ius"):
        count += 1
    if cleaned.endswith("ism"):
        count += 1
    if re.search(r"[aeiou]{2}ing$", cleaned):
        count += 1

    return max(1, count)


def split_sentences(text: str) -> list[str]:
    stripped = text.strip()
    if not stripped:
        return []
    protected = stripped
    for abbr in ABBREVIATIONS:
        pattern = re.compile(re.escape(abbr), re.IGNORECASE)
        protected = pattern.sub(lambda m: m.group(0).replace(".", "<DOT>"), protected)

    raw_parts = re.split(r"[.!?]+", protected)
    sentences = [
        part.replace("<DOT>", ".").strip()
        for part in raw_parts
        if part.replace("<DOT>", ".").strip()
    ]
    return sentences if sentences else [stripped]


def _analyze_text_segment(
    text: str, max_syllables: int, allowlist: set[str]
) -> tuple[int, int, int, int, list[str]]:
    sentences = split_sentences(text)
    words = extract_words(text)
    word_count = len(words)
    sentence_count = max(1, len(sentences)) if word_count > 0 else 0

    max_sentence_words = 0
    for sentence in sentences:
        s_words = extract_words(sentence)
        if len(s_words) > max_sentence_words:
            max_sentence_words = len(s_words)

    total_syllables = 0
    complex_words: list[str] = []
    for w in words:
        syl = count_syllables(w)
        total_syllables += syl
        w_lower = w.lower()
        if syl > max_syllables and w_lower not in allowlist:
            if w_lower not in [cw.lower() for cw in complex_words]:
                complex_words.append(w)

    return word_count, sentence_count, max_sentence_words, total_syllables, complex_words


def analyze_assessment(assessment: Assessment, grade_spec: GradeSpec) -> AssessmentMetrics:
    allowlist = {w.strip().lower() for w in grade_spec.topic_allowlist if w.strip()}
    max_syl = grade_spec.max_syllables_per_word

    total_words = 0
    total_sentences = 0
    total_syllables = 0
    question_metrics_list: list[QuestionMetrics] = []

    for q in assessment.questions:
        (
            stem_words,
            stem_sentences,
            stem_max_sent_words,
            stem_syllables,
            stem_complex,
        ) = _analyze_text_segment(q.stem, max_syl, allowlist)

        total_words += stem_words
        total_sentences += stem_sentences
        total_syllables += stem_syllables

        opt_word_counts: list[int] = []
        opt_max_sent_words: list[int] = []
        opt_complex_words: list[list[str]] = []

        for opt in q.options:
            o_words, o_sents, o_max_sent, o_syls, o_complex = _analyze_text_segment(
                opt, max_syl, allowlist
            )
            opt_word_counts.append(o_words)
            opt_max_sent_words.append(o_max_sent)
            opt_complex_words.append(o_complex)
            total_words += o_words
            total_sentences += max(1, o_sents) if o_words > 0 else 0
            total_syllables += o_syls

        (
            exp_words,
            exp_sents,
            exp_max_sent_words,
            exp_syllables,
            exp_complex,
        ) = _analyze_text_segment(q.explanation, max_syl, allowlist)
        total_words += exp_words
        total_sentences += exp_sents
        total_syllables += exp_syllables

        spread = (
            max(opt_word_counts) - min(opt_word_counts) if opt_word_counts else 0
        )
        total_q_complex = (
            len(stem_complex)
            + sum(len(c) for c in opt_complex_words)
            + len(exp_complex)
        )
        complexity_score = stem_words + sum(opt_word_counts) + (3 * total_q_complex)

        question_metrics_list.append(
            QuestionMetrics(
                question_id=q.question_id,
                stem_word_count=stem_words,
                stem_sentence_count=stem_sentences,
                stem_max_sentence_words=stem_max_sent_words,
                stem_complex_words=stem_complex,
                option_word_counts=opt_word_counts,
                option_max_sentence_words=opt_max_sent_words,
                option_complex_words=opt_complex_words,
                option_word_spread=spread,
                explanation_word_count=exp_words,
                explanation_max_sentence_words=exp_max_sent_words,
                explanation_complex_words=exp_complex,
                complexity_score=complexity_score,
            )
        )

    safe_words = max(1, total_words)
    safe_sentences = max(1, total_sentences)
    fk_grade = round(
        0.39 * (safe_words / safe_sentences)
        + 11.8 * (total_syllables / safe_words)
        - 15.59,
        2,
    )
    fk_grade = max(0.0, fk_grade)

    reading_seconds = (total_words / grade_spec.reading_speed_wpm) * 60.0
    think_seconds = len(assessment.questions) * grade_spec.per_question_think_seconds
    estimated_seconds = round(reading_seconds + think_seconds, 1)

    return AssessmentMetrics(
        total_words=total_words,
        total_sentences=total_sentences,
        total_syllables=total_syllables,
        flesch_kincaid_grade=fk_grade,
        estimated_completion_seconds=estimated_seconds,
        question_metrics=question_metrics_list,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_linguistic_analyzer.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit Task 2**

```bash
git add app/verifier/linguistic_analyzer.py tests/test_linguistic_analyzer.py
git commit -m "feat: add deterministic linguistic analyzer for K-12 assessments"
```

---

### Task 3: Z3 Formal Verification Kernel & Optimizer (`app/verifier/z3_kernel.py`)

**Files:**
- Create: `app/verifier/z3_kernel.py`
- Test: `tests/test_z3_kernel.py`

**Interfaces:**
- Consumes: `Assessment`, `GradeSpec`, `VerificationResult`, `ConstraintViolation`, `RepairPrescription` from `app.models`; `analyze_assessment` from `app.verifier.linguistic_analyzer`
- Produces: `verify_assessment(assessment: Assessment, grade_spec: GradeSpec) -> VerificationResult`

- [ ] **Step 1: Write the failing formal verification tests covering `SAT`, `UNSAT Core`, and `z3.Optimize` prescriptions**

Create `tests/test_z3_kernel.py`:

```python
from app.models import Assessment, QuestionItem
from app.verifier.grade_specs import get_grade_spec
from app.verifier.z3_kernel import verify_assessment


def _make_valid_g3_quiz() -> Assessment:
    return Assessment(
        title="Grade 3 Water Cycle Quiz",
        grade_band_id="primaryG3G5",
        questions=[
            QuestionItem(
                question_id="q1",
                stem="What warms water in lakes so it rises into the air?",
                options=[
                    "Bright sunlight warms the water",
                    "Cold snow freezes the lake",
                    "Strong wind pushes the rocks",
                    "Small fish swim near shore",
                ],
                correct_option_index=0,
                explanation="The sun heats liquid water so it turns into gas.",
            ),
            QuestionItem(
                question_id="q2",
                stem="What forms high in the sky when warm water vapor cools down?",
                options=[
                    "White clouds made of tiny drops",
                    "Dry sand blowing across the ground",
                    "Deep roots growing under a tree",
                    "Smooth stones resting on a beach",
                ],
                correct_option_index=0,
                explanation="Cooling water vapor gathers into small drops that make clouds.",
            ),
        ],
    )


def test_verify_assessment_proves_sat_for_compliant_quiz():
    spec = get_grade_spec("primaryG3G5")
    quiz = _make_valid_g3_quiz()

    result = verify_assessment(quiz, spec)
    assert result.status == "sat"
    assert result.unsat_core == []
    assert result.violations == []
    assert result.prescriptions == []
    assert result.certificate_hash is not None
    assert len(result.certificate_hash) == 64
    assert "(check-sat)" in result.smt_lib2_script


def test_verify_assessment_catches_sentence_length_complex_words_and_distractor_spread():
    spec = get_grade_spec("primaryG3G5")
    flawed_quiz = Assessment(
        title="Flawed Grade 3 Quiz",
        grade_band_id="primaryG3G5",
        questions=[
            QuestionItem(
                question_id="q1",
                stem=(
                    "When solar radiation simultaneously illuminates a shallow body of liquid water "
                    "during an uncharacteristically warm afternoon, what transformation occurs?"
                ),
                options=[
                    "Water turns into vapor and rises upward into the atmosphere above the warm earth",
                    "Cold snow",
                    "Dry wind",
                    "Hard ice",
                ],
                correct_option_index=0,
                explanation="Solar heat causes liquid water to evaporate.",
            )
        ],
    )

    result = verify_assessment(flawed_quiz, spec)
    assert result.status == "unsat"
    assert "q1_stem_sentence_words" in result.unsat_core
    assert "q1_stem_complex_words" in result.unsat_core
    assert "q1_distractor_word_spread" in result.unsat_core
    assert result.certificate_hash is None
    assert len(result.prescriptions) >= 3
    stem_presc = next(
        p for p in result.prescriptions if p.tracker_id == "q1_stem_sentence_words"
    )
    assert stem_presc.target_max == spec.max_words_per_sentence


def test_verify_assessment_catches_scaffolding_and_reading_time_violations():
    spec = get_grade_spec("primaryG1G2")
    spec.quiz_duration_minutes = 1  # 60 seconds total budget

    # Q1 is much more complex than Q2 (violates progressive scaffolding) and total time exceeds 60s
    quiz = Assessment(
        title="Habitat Exit Ticket",
        grade_band_id="primaryG1G2",
        questions=[
            QuestionItem(
                question_id="q1",
                stem="Where do big brown bears sleep during cold winter days?",
                options=[
                    "Inside a warm dark cave",
                    "Under the deep blue sea",
                    "High on a thin branch",
                    "Inside a small bird nest",
                ],
                correct_option_index=0,
                explanation="Bears sleep in caves in winter.",
            ),
            QuestionItem(
                question_id="q2",
                stem="Who swims in water?",
                options=["A fish", "A dog", "A cat", "A bird"],
                correct_option_index=0,
                explanation="Fish swim.",
            ),
            QuestionItem(
                question_id="q3",
                stem="What gives light in the day?",
                options=["The sun", "A rock", "A tree", "A shoe"],
                correct_option_index=0,
                explanation="The sun shines.",
            ),
        ],
    )

    result = verify_assessment(quiz, spec)
    assert result.status == "unsat"
    assert "q1_to_q2_scaffolding_order" in result.unsat_core
    assert "quiz_reading_time_budget" in result.unsat_core
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_z3_kernel.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.verifier.z3_kernel'`

- [ ] **Step 3: Implement `app/verifier/z3_kernel.py` using `z3.Solver` and `z3.Optimize`**

Create `app/verifier/z3_kernel.py`:

```python
import hashlib
import json
import z3
from app.models import (
    Assessment,
    ConstraintViolation,
    GradeSpec,
    RepairPrescription,
    VerificationResult,
)
from app.verifier.linguistic_analyzer import analyze_assessment


def _z3_abs(expr: z3.ArithRef) -> z3.ArithRef:
    return z3.If(expr >= 0, expr, -expr)


def _solve_target_option_bounds(
    option_word_counts: list[int], max_spread: int, max_sent_words: int
) -> list[tuple[int, int]]:
    """Uses z3.Optimize to compute minimal word-count adjustments for options to satisfy max_spread."""
    opt = z3.Optimize()
    n = len(option_word_counts)
    targets = [z3.Int(f"opt_target_{j}") for j in range(n)]
    min_var = z3.Int("opt_min")
    max_var = z3.Int("opt_max")

    total_delta = z3.IntVal(0)
    for j, current in enumerate(option_word_counts):
        opt.add(targets[j] >= 1)
        opt.add(targets[j] <= max_sent_words)
        opt.add(targets[j] >= min_var)
        opt.add(targets[j] <= max_var)
        total_delta = total_delta + _z3_abs(targets[j] - current)

    opt.add(max_var - min_var <= max_spread)
    opt.minimize(total_delta)

    if opt.check() == z3.sat:
        model = opt.model()
        solved_min = model.eval(min_var).as_long()
        solved_max = min(solved_min + max_spread, max_sent_words)
        return [(max(1, solved_min), solved_max) for _ in range(n)]

    return [(1, max(1, max_spread)) for _ in range(n)]


def verify_assessment(assessment: Assessment, grade_spec: GradeSpec) -> VerificationResult:
    metrics = analyze_assessment(assessment, grade_spec)
    solver = z3.Solver()

    # Metadata map so anytracker in unsat_core maps cleanly to a structured violation and Z3 prescription
    tracker_meta: dict[str, tuple[ConstraintViolation, RepairPrescription]] = {}

    def add_tracked_rule(
        tracker_id: str,
        z3_constraint: z3.BoolRef,
        violation: ConstraintViolation,
        prescription: RepairPrescription,
    ) -> None:
        tracker_bool = z3.Bool(tracker_id)
        solver.assert_and_track(z3_constraint, tracker_bool)
        tracker_meta[tracker_id] = (violation, prescription)

    # 1-4. Per-question local & relational constraints
    for q_idx, q_m in enumerate(metrics.question_metrics):
        qid = q_m.question_id

        # Rule 1a: Question stem sentence length
        stem_sent_var = z3.Int(f"{qid}_stem_max_sentence_words_val")
        solver.add(stem_sent_var == q_m.stem_max_sentence_words)
        stem_sent_tracker = f"{qid}_stem_sentence_words"
        add_tracked_rule(
            stem_sent_tracker,
            stem_sent_var <= grade_spec.max_words_per_sentence,
            ConstraintViolation(
                tracker_id=stem_sent_tracker,
                rule_category="sentenceLength",
                location=f"questions[{q_idx}].stem",
                message=(
                    f"Question {qid} stem has a {q_m.stem_max_sentence_words}-word sentence "
                    f"(max allowed for {grade_spec.grade_band_id} is {grade_spec.max_words_per_sentence})."
                ),
                actual_value=float(q_m.stem_max_sentence_words),
                limit_value=float(grade_spec.max_words_per_sentence),
            ),
            RepairPrescription(
                tracker_id=stem_sent_tracker,
                location=f"questions[{q_idx}].stem",
                target_metric="maxWordsPerSentence",
                current_value=float(q_m.stem_max_sentence_words),
                target_min=4.0,
                target_max=float(grade_spec.max_words_per_sentence),
                instruction=(
                    f"Rewrite {qid} stem so every sentence has between 4 and "
                    f"{grade_spec.max_words_per_sentence} words (currently {q_m.stem_max_sentence_words} words)."
                ),
            ),
        )

        # Rule 2a: Question stem lexical complexity (syllables + allowlist)
        stem_complex_var = z3.Int(f"{qid}_stem_complex_word_count_val")
        solver.add(stem_complex_var == len(q_m.stem_complex_words))
        stem_complex_tracker = f"{qid}_stem_complex_words"
        add_tracked_rule(
            stem_complex_tracker,
            stem_complex_var == 0,
            ConstraintViolation(
                tracker_id=stem_complex_tracker,
                rule_category="lexicalComplexity",
                location=f"questions[{q_idx}].stem",
                message=(
                    f"Question {qid} stem contains {len(q_m.stem_complex_words)} word(s) exceeding "
                    f"{grade_spec.max_syllables_per_word} syllables not in topicAllowlist: "
                    f"{', '.join(q_m.stem_complex_words)}."
                ),
                actual_value=float(len(q_m.stem_complex_words)),
                limit_value=0.0,
                offending_tokens=q_m.stem_complex_words,
            ),
            RepairPrescription(
                tracker_id=stem_complex_tracker,
                location=f"questions[{q_idx}].stem",
                target_metric="complexWordCount",
                current_value=float(len(q_m.stem_complex_words)),
                target_min=0.0,
                target_max=0.0,
                instruction=(
                    f"Replace complex word(s) {q_m.stem_complex_words} in {qid} stem with synonyms "
                    f"of at most {grade_spec.max_syllables_per_word} syllables."
                ),
            ),
        )

        # Rules 1b & 2b: Options sentence length and complex words
        for opt_idx, (opt_sent_words, opt_complex) in enumerate(
            zip(q_m.option_max_sentence_words, q_m.option_complex_words)
        ):
            opt_sent_var = z3.Int(f"{qid}_opt{opt_idx}_sentence_words_val")
            solver.add(opt_sent_var == opt_sent_words)
            opt_sent_tracker = f"{qid}_opt{opt_idx}_sentence_words"
            add_tracked_rule(
                opt_sent_tracker,
                opt_sent_var <= grade_spec.max_words_per_sentence,
                ConstraintViolation(
                    tracker_id=opt_sent_tracker,
                    rule_category="sentenceLength",
                    location=f"questions[{q_idx}].options[{opt_idx}]",
                    message=(
                        f"Question {qid} option {opt_idx + 1} has {opt_sent_words} words in a sentence "
                        f"(max {grade_spec.max_words_per_sentence})."
                    ),
                    actual_value=float(opt_sent_words),
                    limit_value=float(grade_spec.max_words_per_sentence),
                ),
                RepairPrescription(
                    tracker_id=opt_sent_tracker,
                    location=f"questions[{q_idx}].options[{opt_idx}]",
                    target_metric="maxWordsPerSentence",
                    current_value=float(opt_sent_words),
                    target_min=1.0,
                    target_max=float(grade_spec.max_words_per_sentence),
                    instruction=(
                        f"Shorten {qid} option {opt_idx + 1} to at most "
                        f"{grade_spec.max_words_per_sentence} words."
                    ),
                ),
            )

            opt_complex_var = z3.Int(f"{qid}_opt{opt_idx}_complex_words_val")
            solver.add(opt_complex_var == len(opt_complex))
            opt_complex_tracker = f"{qid}_opt{opt_idx}_complex_words"
            add_tracked_rule(
                opt_complex_tracker,
                opt_complex_var == 0,
                ConstraintViolation(
                    tracker_id=opt_complex_tracker,
                    rule_category="lexicalComplexity",
                    location=f"questions[{q_idx}].options[{opt_idx}]",
                    message=(
                        f"Question {qid} option {opt_idx + 1} uses complex word(s) exceeding "
                        f"{grade_spec.max_syllables_per_word} syllables: {', '.join(opt_complex)}."
                    ),
                    actual_value=float(len(opt_complex)),
                    limit_value=0.0,
                    offending_tokens=opt_complex,
                ),
                RepairPrescription(
                    tracker_id=opt_complex_tracker,
                    location=f"questions[{q_idx}].options[{opt_idx}]",
                    target_metric="complexWordCount",
                    current_value=float(len(opt_complex)),
                    target_min=0.0,
                    target_max=0.0,
                    instruction=(
                        f"Replace complex word(s) {opt_complex} in {qid} option {opt_idx + 1} "
                        f"with words having <= {grade_spec.max_syllables_per_word} syllables."
                    ),
                ),
            )

        # Rules 1c & 2c: Explanation sentence length and complex words
        exp_sent_var = z3.Int(f"{qid}_explanation_sentence_words_val")
        solver.add(exp_sent_var == q_m.explanation_max_sentence_words)
        exp_sent_tracker = f"{qid}_explanation_sentence_words"
        add_tracked_rule(
            exp_sent_tracker,
            exp_sent_var <= grade_spec.max_words_per_sentence,
            ConstraintViolation(
                tracker_id=exp_sent_tracker,
                rule_category="sentenceLength",
                location=f"questions[{q_idx}].explanation",
                message=(
                    f"Question {qid} explanation has a {q_m.explanation_max_sentence_words}-word sentence "
                    f"(max {grade_spec.max_words_per_sentence})."
                ),
                actual_value=float(q_m.explanation_max_sentence_words),
                limit_value=float(grade_spec.max_words_per_sentence),
            ),
            RepairPrescription(
                tracker_id=exp_sent_tracker,
                location=f"questions[{q_idx}].explanation",
                target_metric="maxWordsPerSentence",
                current_value=float(q_m.explanation_max_sentence_words),
                target_min=3.0,
                target_max=float(grade_spec.max_words_per_sentence),
                instruction=(
                    f"Shorten sentences in {qid} explanation to at most "
                    f"{grade_spec.max_words_per_sentence} words."
                ),
            ),
        )

        exp_complex_var = z3.Int(f"{qid}_explanation_complex_words_val")
        solver.add(exp_complex_var == len(q_m.explanation_complex_words))
        exp_complex_tracker = f"{qid}_explanation_complex_words"
        add_tracked_rule(
            exp_complex_tracker,
            exp_complex_var == 0,
            ConstraintViolation(
                tracker_id=exp_complex_tracker,
                rule_category="lexicalComplexity",
                location=f"questions[{q_idx}].explanation",
                message=(
                    f"Question {qid} explanation uses complex word(s) exceeding "
                    f"{grade_spec.max_syllables_per_word} syllables: "
                    f"{', '.join(q_m.explanation_complex_words)}."
                ),
                actual_value=float(len(q_m.explanation_complex_words)),
                limit_value=0.0,
                offending_tokens=q_m.explanation_complex_words,
            ),
            RepairPrescription(
                tracker_id=exp_complex_tracker,
                location=f"questions[{q_idx}].explanation",
                target_metric="complexWordCount",
                current_value=float(len(q_m.explanation_complex_words)),
                target_min=0.0,
                target_max=0.0,
                instruction=(
                    f"Replace complex word(s) {q_m.explanation_complex_words} in {qid} explanation "
                    f"with simpler words (<= {grade_spec.max_syllables_per_word} syllables)."
                ),
            ),
        )

        # Rule 4: Distractor word spread balance
        spread_var = z3.Int(f"{qid}_option_word_spread_val")
        solver.add(spread_var == q_m.option_word_spread)
        spread_tracker = f"{qid}_distractor_word_spread"
        solved_bounds = _solve_target_option_bounds(
            q_m.option_word_counts,
            grade_spec.max_option_word_spread,
            grade_spec.max_words_per_sentence,
        )
        t_min, t_max = solved_bounds[0]
        add_tracked_rule(
            spread_tracker,
            spread_var <= grade_spec.max_option_word_spread,
            ConstraintViolation(
                tracker_id=spread_tracker,
                rule_category="distractorBalance",
                location=f"questions[{q_idx}].options",
                message=(
                    f"Question {qid} option word counts {q_m.option_word_counts} have a spread of "
                    f"{q_m.option_word_spread} words (max allowed spread is {grade_spec.max_option_word_spread})."
                ),
                actual_value=float(q_m.option_word_spread),
                limit_value=float(grade_spec.max_option_word_spread),
            ),
            RepairPrescription(
                tracker_id=spread_tracker,
                location=f"questions[{q_idx}].options",
                target_metric="optionWordCount",
                current_value=float(q_m.option_word_spread),
                target_min=float(t_min),
                target_max=float(t_max),
                instruction=(
                    f"Balance {qid} answer options so every option is between {t_min} and {t_max} words "
                    f"(max spread <= {grade_spec.max_option_word_spread} words)."
                ),
            ),
        )

    # Rule 3: Whole-quiz Flesch-Kincaid Grade Level bounds
    fk_var = z3.Real("quiz_flesch_kincaid_val")
    solver.add(fk_var == z3.RealVal(str(metrics.flesch_kincaid_grade)))
    fk_min_tracker = "quiz_flesch_kincaid_min"
    add_tracked_rule(
        fk_min_tracker,
        fk_var >= z3.RealVal(str(grade_spec.flesch_kincaid_min)),
        ConstraintViolation(
            tracker_id=fk_min_tracker,
            rule_category="readabilityBand",
            location="assessment",
            message=(
                f"Overall Flesch-Kincaid Grade ({metrics.flesch_kincaid_grade}) is below the "
                f"minimum {grade_spec.flesch_kincaid_min} for {grade_spec.grade_band_id}."
            ),
            actual_value=metrics.flesch_kincaid_grade,
            limit_value=grade_spec.flesch_kincaid_min,
        ),
        RepairPrescription(
            tracker_id=fk_min_tracker,
            location="assessment",
            target_metric="fleschKincaidGrade",
            current_value=metrics.flesch_kincaid_grade,
            target_min=grade_spec.flesch_kincaid_min,
            target_max=grade_spec.flesch_kincaid_max,
            instruction=(
                f"Use complete descriptive sentences so overall Flesch-Kincaid Grade falls within "
                f"[{grade_spec.flesch_kincaid_min}, {grade_spec.flesch_kincaid_max}]."
            ),
        ),
    )

    fk_max_tracker = "quiz_flesch_kincaid_max"
    add_tracked_rule(
        fk_max_tracker,
        fk_var <= z3.RealVal(str(grade_spec.flesch_kincaid_max)),
        ConstraintViolation(
            tracker_id=fk_max_tracker,
            rule_category="readabilityBand",
            location="assessment",
            message=(
                f"Overall Flesch-Kincaid Grade ({metrics.flesch_kincaid_grade}) exceeds the "
                f"maximum {grade_spec.flesch_kincaid_max} for {grade_spec.grade_band_id}."
            ),
            actual_value=metrics.flesch_kincaid_grade,
            limit_value=grade_spec.flesch_kincaid_max,
        ),
        RepairPrescription(
            tracker_id=fk_max_tracker,
            location="assessment",
            target_metric="fleschKincaidGrade",
            current_value=metrics.flesch_kincaid_grade,
            target_min=grade_spec.flesch_kincaid_min,
            target_max=grade_spec.flesch_kincaid_max,
            instruction=(
                f"Simplify sentences and multi-syllable words so overall Flesch-Kincaid Grade drops "
                f"from {metrics.flesch_kincaid_grade} into [{grade_spec.flesch_kincaid_min}, {grade_spec.flesch_kincaid_max}]."
            ),
        ),
    )

    # Rule 5: Progressive scaffolding across sequential questions
    for idx in range(len(metrics.question_metrics) - 1):
        curr_q = metrics.question_metrics[idx]
        next_q = metrics.question_metrics[idx + 1]
        c_curr = z3.Int(f"{curr_q.question_id}_complexity_val")
        c_next = z3.Int(f"{next_q.question_id}_complexity_val")
        solver.add(c_curr == curr_q.complexity_score)
        solver.add(c_next == next_q.complexity_score)

        scaf_tracker = f"{curr_q.question_id}_to_{next_q.question_id}_scaffolding_order"
        min_allowed_next = max(1, curr_q.complexity_score - grade_spec.max_backward_complexity_drop)
        add_tracked_rule(
            scaf_tracker,
            c_next + grade_spec.max_backward_complexity_drop >= c_curr,
            ConstraintViolation(
                tracker_id=scaf_tracker,
                rule_category="progressiveScaffolding",
                location=f"questions[{idx}]->questions[{idx + 1}]",
                message=(
                    f"Complexity drops sharply from {curr_q.question_id} ({curr_q.complexity_score}) "
                    f"to {next_q.question_id} ({next_q.complexity_score}), exceeding tolerance of "
                    f"{grade_spec.max_backward_complexity_drop}."
                ),
                actual_value=float(curr_q.complexity_score - next_q.complexity_score),
                limit_value=float(grade_spec.max_backward_complexity_drop),
            ),
            RepairPrescription(
                tracker_id=scaf_tracker,
                location=f"questions[{idx}]->questions[{idx + 1}]",
                target_metric="questionComplexity",
                current_value=float(next_q.complexity_score),
                target_min=float(min_allowed_next),
                target_max=float(curr_q.complexity_score + 10),
                instruction=(
                    f"Order questions from simpler to harder: either simplify {curr_q.question_id} "
                    f"or expand {next_q.question_id} so complexity does not drop by more than "
                    f"{grade_spec.max_backward_complexity_drop} points."
                ),
            ),
        )

    # Rule 6: Grade reading & thinking time budget
    time_budget_seconds = float(grade_spec.quiz_duration_minutes * 60)
    time_var = z3.Real("quiz_estimated_seconds_val")
    solver.add(time_var == z3.RealVal(str(metrics.estimated_completion_seconds)))
    time_tracker = "quiz_reading_time_budget"

    think_total = len(assessment.questions) * grade_spec.per_question_think_seconds
    max_words_for_budget = max(
        10,
        int(((time_budget_seconds - think_total) / 60.0) * grade_spec.reading_speed_wpm),
    )

    add_tracked_rule(
        time_tracker,
        time_var <= z3.RealVal(str(time_budget_seconds)),
        ConstraintViolation(
            tracker_id=time_tracker,
            rule_category="readingTimeBudget",
            location="assessment",
            message=(
                f"Estimated completion time ({metrics.estimated_completion_seconds}s) exceeds "
                f"budget of {time_budget_seconds:.0f}s ({grade_spec.quiz_duration_minutes} min) "
                f"at {grade_spec.reading_speed_wpm} wpm."
            ),
            actual_value=metrics.estimated_completion_seconds,
            limit_value=time_budget_seconds,
        ),
        RepairPrescription(
            tracker_id=time_tracker,
            location="assessment",
            target_metric="totalWords",
            current_value=float(metrics.total_words),
            target_min=10.0,
            target_max=float(max_words_for_budget),
            instruction=(
                f"Reduce total quiz word count to <= {max_words_for_budget} words (or reduce question count) "
                f"so students reading at {grade_spec.reading_speed_wpm} wpm finish within "
                f"{grade_spec.quiz_duration_minutes} minutes."
            ),
        ),
    )

    check_res = solver.check()
    smt_script = solver.sexpr() + "\n(check-sat)\n"

    if check_res == z3.sat:
        canonical_payload = json.dumps(
            {
                "assessment": assessment.model_dump(by_alias=True),
                "gradeSpec": grade_spec.model_dump(by_alias=True),
            },
            sort_keys=True,
        )
        cert_hash = hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()
        return VerificationResult(
            status="sat",
            certificate_hash=cert_hash,
            smt_lib2_script=smt_script,
            unsat_core=[],
            violations=[],
            prescriptions=[],
            metrics=metrics,
        )

    raw_core = [str(item) for item in solver.unsat_core()]
    # Preserve deterministic ordering matching tracker insertion order
    ordered_core = [t for t in tracker_meta.keys() if t in raw_core]
    violations = [tracker_meta[t][0] for t in ordered_core]
    prescriptions = [tracker_meta[t][1] for t in ordered_core]

    return VerificationResult(
        status="unsat",
        certificate_hash=None,
        smt_lib2_script=smt_script,
        unsat_core=ordered_core,
        violations=violations,
        prescriptions=prescriptions,
        metrics=metrics,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_z3_kernel.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit Task 3**

```bash
git add app/verifier/z3_kernel.py tests/test_z3_kernel.py
git commit -m "feat: implement Z3 formal verification kernel with unsat_core and optimizer bounds"
```

---

### Task 4: Counterexample-Guided Auto-Repair Orchestrator & Demo Scenarios (`app/verifier/repair_orchestrator.py`)

**Files:**
- Create: `app/verifier/repair_orchestrator.py`
- Test: `tests/test_api_and_repair.py`

**Interfaces:**
- Consumes: `Assessment`, `GradeSpec`, `GenerateAndVerifyRequest`, `IterationRecord`, `RepairLoopResponse`, `QuestionItem` from `app.models`; `verify_assessment` from `app.verifier.z3_kernel`
- Produces:
  - `DEMO_SCENARIOS: dict[str, dict]`
  - `list_demo_scenarios() -> list[dict]`
  - `run_generate_and_verify_loop(request: GenerateAndVerifyRequest) -> RepairLoopResponse`

- [ ] **Step 1: Write the failing test for the counterexample-guided auto-repair loop across demo scenarios**

Create `tests/test_api_and_repair.py`:

```python
from app.models import GenerateAndVerifyRequest
from app.verifier.grade_specs import get_grade_spec
from app.verifier.repair_orchestrator import (
    list_demo_scenarios,
    run_generate_and_verify_loop,
)


def test_list_demo_scenarios_returns_three_scenarios():
    scenarios = list_demo_scenarios()
    scenario_ids = [s["scenarioId"] for s in scenarios]
    assert "waterCycleG3" in scenario_ids
    assert "fractionsRatiosG7" in scenario_ids
    assert "habitatsExitTicketG2" in scenario_ids


def test_repair_orchestrator_drives_flawed_g3_quiz_from_unsat_to_sat():
    spec = get_grade_spec("primaryG3G5")
    spec.topic_allowlist = ["evaporation", "condensation"]
    req = GenerateAndVerifyRequest(
        scenario_id="waterCycleG3",
        grade_spec=spec,
        max_iterations=3,
    )

    response = run_generate_and_verify_loop(req)
    assert response.final_status == "sat"
    assert response.total_iterations >= 2
    # Iteration 0 is the flawed LLM draft (unsat)
    assert response.iterations[0].verification_result.status == "unsat"
    assert len(response.iterations[0].verification_result.unsat_core) > 0
    # Final iteration is formally verified (sat) with a SHA-256 certificate
    final_iter = response.iterations[-1]
    assert final_iter.verification_result.status == "sat"
    assert final_iter.verification_result.certificate_hash is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_api_and_repair.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.verifier.repair_orchestrator'`

- [ ] **Step 3: Implement `app/verifier/repair_orchestrator.py`**

Create `app/verifier/repair_orchestrator.py`:

```python
import json
import httpx
from app.models import (
    Assessment,
    GenerateAndVerifyRequest,
    GradeSpec,
    IterationRecord,
    LlmConfig,
    QuestionItem,
    RepairLoopResponse,
    VerificationResult,
)
from app.verifier.z3_kernel import verify_assessment


DEMO_SCENARIOS: dict[str, dict] = {
    "waterCycleG3": {
        "scenarioId": "waterCycleG3",
        "title": "Grade 3 Science: The Water Cycle (Vocabulary & Distractor Bugs)",
        "gradeBandId": "primaryG3G5",
        "defaultAllowlist": ["evaporation", "condensation"],
        "description": (
            "LLM draft uses 22-word compound sentences, unapproved 5-syllable words "
            "('simultaneously', 'transformation'), and unbalanced answer option lengths."
        ),
        "steps": [
            {
                "summary": "Initial LLM draft generated from prompt: 'Create a 2-question Grade 3 quiz on the Water Cycle.'",
                "assessment": Assessment(
                    title="Grade 3 Science: The Water Cycle",
                    grade_band_id="primaryG3G5",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem=(
                                "When solar radiation simultaneously warms a shallow lake during the afternoon, "
                                "what physical transformation happens to the surface water?"
                            ),
                            options=[
                                "Evaporation occurs as liquid water warms up and changes into rising water vapor",
                                "Cold snow",
                                "Dry wind",
                                "Hard ice",
                            ],
                            correct_option_index=0,
                            explanation="Solar heat causes evaporation continuously throughout the day.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem="What happens when rising water vapor cools high up in the sky?",
                            options=[
                                "Condensation forms tiny water drops that gather into clouds",
                                "Warm rain falls down into the deep blue ocean",
                                "Bright sunlight dries the wet soil in the garden",
                                "Strong winds push tall waves across the wide lake",
                            ],
                            correct_option_index=0,
                            explanation="Cooling vapor turns back into tiny drops through condensation.",
                        ),
                    ],
                ),
            },
            {
                "summary": (
                    "Auto-Repair Pass 1: Shortened Q1 stem to 11 words and replaced 'simultaneously'/'transformation', "
                    "balanced Q1 options to 4–6 words each, but kept 'continuously' (5 syllables) in Q1 explanation."
                ),
                "assessment": Assessment(
                    title="Grade 3 Science: The Water Cycle",
                    grade_band_id="primaryG3G5",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem="What happens to lake water when bright sunlight warms it up?",
                            options=[
                                "Evaporation turns water into vapor",
                                "Cold snow freezes the lake",
                                "Strong wind blows the rocks",
                                "Heavy ice sinks down low",
                            ],
                            correct_option_index=0,
                            explanation="Sunlight warms the water continuously so evaporation happens.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem="What happens when warm water vapor cools high in the sky?",
                            options=[
                                "Condensation makes tiny cloud drops",
                                "Warm rain fills the ocean",
                                "Sunlight dries the wet soil",
                                "Wind pushes waves on lakes",
                            ],
                            correct_option_index=0,
                            explanation="Cooling vapor forms tiny cloud drops through condensation.",
                        ),
                    ],
                ),
            },
            {
                "summary": (
                    "Auto-Repair Pass 2: Replaced 'continuously' in Q1 explanation with 'all day' (<= 3 syllables). "
                    "All 6 Z3 constraint categories now prove SAT."
                ),
                "assessment": Assessment(
                    title="Grade 3 Science: The Water Cycle",
                    grade_band_id="primaryG3G5",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem="What happens to lake water when bright sunlight warms it up?",
                            options=[
                                "Evaporation turns water into vapor",
                                "Cold snow freezes the lake",
                                "Strong wind blows the rocks",
                                "Heavy ice sinks down low",
                            ],
                            correct_option_index=0,
                            explanation="Sunlight warms the water all day so evaporation happens.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem="What happens when warm water vapor cools high in the sky?",
                            options=[
                                "Condensation makes tiny cloud drops",
                                "Warm rain fills the ocean",
                                "Sunlight dries the wet soil",
                                "Wind pushes waves on lakes",
                            ],
                            correct_option_index=0,
                            explanation="Cooling vapor forms tiny cloud drops through condensation.",
                        ),
                    ],
                ),
            },
        ],
    },
    "fractionsRatiosG7": {
        "scenarioId": "fractionsRatiosG7",
        "title": "Grade 7 Maths: Ratios & Proportions (Distractor Giveaway & Scaffolding Bug)",
        "gradeBandId": "secondaryG6G8",
        "defaultAllowlist": ["proportional", "equivalent"],
        "description": (
            "LLM draft places the hardest question first (backwards scaffolding) and makes the correct "
            "option in Q1 14 words long while distractors are 2 words each."
        ),
        "steps": [
            {
                "summary": "Initial LLM draft with backwards complexity ordering and a 12-word distractor spread on Q1.",
                "assessment": Assessment(
                    title="Grade 7 Maths: Ratios & Proportions",
                    grade_band_id="secondaryG6G8",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem=(
                                "A baker mixes 6 cups of flour with 3 cups of milk for bread dough. "
                                "How do you verify whether 10 cups of flour and 5 cups of milk form an equivalent ratio?"
                            ),
                            options=[
                                "Divide both quantities to confirm each batch uses exactly two cups of flour per cup of milk",
                                "Add them",
                                "Multiply ten",
                                "Subtract five",
                            ],
                            correct_option_index=0,
                            explanation="Both ratios simplify to a unit rate of 2 cups of flour per 1 cup of milk.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem="Which ratio is equivalent to 2 to 1?",
                            options=[
                                "4 to 2",
                                "3 to 2",
                                "1 to 2",
                                "5 to 3",
                            ],
                            correct_option_index=0,
                            explanation="Multiplying both terms of 2:1 by 2 gives the equivalent ratio 4:2.",
                        ),
                    ],
                ),
            },
            {
                "summary": (
                    "Auto-Repair Pass 1: Re-ordered scaffolding so Q1 introduces equivalent ratios and Q2 applies "
                    "proportional unit rates, and balanced option lengths within the 7-word spread limit."
                ),
                "assessment": Assessment(
                    title="Grade 7 Maths: Ratios & Proportions",
                    grade_band_id="secondaryG6G8",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem="A recipe uses 4 cups of flour for every 2 cups of milk. Which ratio is equivalent?",
                            options=[
                                "6 cups flour to 3 cups milk",
                                "5 cups flour to 2 cups milk",
                                "4 cups flour to 4 cups milk",
                                "2 cups flour to 4 cups milk",
                            ],
                            correct_option_index=0,
                            explanation="Both 4:2 and 6:3 simplify to a proportional rate of 2 cups of flour per cup of milk.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem=(
                                "A baker mixes 6 cups of flour with 3 cups of milk. "
                                "How can you prove that 10 cups of flour and 5 cups of milk are proportional?"
                            ),
                            options=[
                                "Both batches simplify to 2 cups of flour per cup of milk",
                                "Both batches add up to the same total number of cups",
                                "The second batch uses exactly four more cups of each item",
                                "Multiplying the two numbers in each batch gives thirty cups",
                            ],
                            correct_option_index=0,
                            explanation="Dividing flour by milk in both batches yields an equivalent unit rate of 2.",
                        ),
                    ],
                ),
            },
        ],
    },
    "habitatsExitTicketG2": {
        "scenarioId": "habitatsExitTicketG2",
        "title": "Grade 2 Science: Animal Homes (Sentence Length & Reading Time Overrun)",
        "gradeBandId": "primaryG1G2",
        "defaultAllowlist": ["habitat"],
        "description": (
            "LLM draft uses 16-word sentences and 3-syllable words ('temperature', 'environment') "
            "that violate Primary Grades 1–2 constraints."
        ),
        "steps": [
            {
                "summary": "Initial LLM draft with 16-word sentences and Grade 5 vocabulary ('temperature', 'environment').",
                "assessment": Assessment(
                    title="Grade 2 Science: Animal Homes",
                    grade_band_id="primaryG1G2",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem=(
                                "Why do polar bears have thick white fur when they live in a freezing Arctic environment "
                                "with low temperature?"
                            ),
                            options=[
                                "Thick fur keeps the bear warm on cold ice",
                                "White fur helps the bear swim under hot sand",
                                "Thick fur makes the bear fly high in trees",
                                "White fur lets the bear eat dry desert rocks",
                            ],
                            correct_option_index=0,
                            explanation="Thick fur keeps polar bears warm in their cold habitat.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem="Where does a frog live so its skin stays wet and safe every day?",
                            options=[
                                "Near a wet pond with green plants",
                                "On top of a dry sandy hill",
                                "Inside a hot oven in town",
                                "High up on an icy mountain",
                            ],
                            correct_option_index=0,
                            explanation="Frogs live near wet ponds because a pond is their natural habitat.",
                        ),
                    ],
                ),
            },
            {
                "summary": (
                    "Auto-Repair Pass 1: Simplified Q1 & Q2 stems to <= 10 words per sentence and replaced "
                    "'environment', 'temperature', and 'natural' with Grade 2 words."
                ),
                "assessment": Assessment(
                    title="Grade 2 Science: Animal Homes",
                    grade_band_id="primaryG1G2",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem="Why do polar bears have thick fur in their habitat?",
                            options=[
                                "Thick fur keeps them warm on ice",
                                "White fur helps them dig in sand",
                                "Thick fur makes them fly in trees",
                                "White fur lets them eat dry rocks",
                            ],
                            correct_option_index=0,
                            explanation="Thick fur keeps bears warm in a cold habitat.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem="Where does a green frog live to stay wet?",
                            options=[
                                "Near a quiet pond with green plants",
                                "On top of a dry sandy hill",
                                "Inside a dark cave with big bears",
                                "High up on a cold snowy peak",
                            ],
                            correct_option_index=0,
                            explanation="Frogs live by wet ponds because that is their habitat.",
                        ),
                    ],
                ),
            },
        ],
    },
}


def list_demo_scenarios() -> list[dict]:
    return [
        {
            "scenarioId": item["scenarioId"],
            "title": item["title"],
            "gradeBandId": item["gradeBandId"],
            "defaultAllowlist": item["defaultAllowlist"],
            "description": item["description"],
        }
        for item in DEMO_SCENARIOS.values()
    ]


def _build_repair_prompt(
    assessment: Assessment,
    grade_spec: GradeSpec,
    verification: VerificationResult,
) -> str:
    prescriptions_text = "\n".join(
        f"- [{p.tracker_id}] ({p.location}): {p.instruction}"
        for p in verification.prescriptions
    )
    return (
        f"You are repairing a K-12 assessment so it passes Z3 formal verification for {grade_spec.label}.\n"
        f"Hard constraints:\n"
        f"- maxWordsPerSentence: {grade_spec.max_words_per_sentence}\n"
        f"- maxSyllablesPerWord: {grade_spec.max_syllables_per_word} (allowlist: {grade_spec.topic_allowlist})\n"
        f"- fleschKincaidBand: [{grade_spec.flesch_kincaid_min}, {grade_spec.flesch_kincaid_max}]\n"
        f"- maxOptionWordSpread: {grade_spec.max_option_word_spread}\n\n"
        f"Z3 UNSAT CORE & PRESCRIPTIONS:\n{prescriptions_text}\n\n"
        f"Current Assessment JSON:\n{assessment.model_dump_json(by_alias=True, indent=2)}\n\n"
        f"Return ONLY valid JSON matching the Assessment schema with camelCase keys."
    )


def _call_live_llm_json(prompt: str, llm_config: LlmConfig) -> dict:
    api_key = llm_config.api_key.strip()
    if not api_key:
        raise ValueError("Live LLM mode requires a non-empty apiKey.")

    if llm_config.provider == "gemini":
        model = llm_config.model or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        resp = httpx.post(url, json=payload, timeout=30.0)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)

    if llm_config.provider == "openai":
        model = llm_config.model or "gpt-4o-mini"
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        text = resp.json()["choices"][0]["message"]["content"]
        return json.loads(text)

    model = llm_config.model or "claude-3-5-sonnet-latest"
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": model,
            "max_tokens": 2048,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    text = resp.json()["content"][0]["text"]
    start = text.find("{")
    end = text.rfind("}")
    return json.loads(text[start : end + 1])


def _deterministic_auto_repair_fallback(
    assessment: Assessment, grade_spec: GradeSpec, verification: VerificationResult
) -> Assessment:
    """Deterministic surgical fallback repair when running custom topics without an external API key."""
    repaired_questions: list[QuestionItem] = []
    for q in assessment.questions:
        words = q.stem.split()
        if len(words) > grade_spec.max_words_per_sentence:
            stem = " ".join(words[: grade_spec.max_words_per_sentence - 1]).rstrip(".!?") + "?"
        else:
            stem = q.stem
        repaired_questions.append(
            QuestionItem(
                question_id=q.question_id,
                stem=stem,
                options=q.options,
                correct_option_index=q.correct_option_index,
                explanation=q.explanation,
            )
        )
    return Assessment(
        title=assessment.title,
        grade_band_id=grade_spec.grade_band_id,
        questions=repaired_questions,
    )


def run_generate_and_verify_loop(
    request: GenerateAndVerifyRequest,
) -> RepairLoopResponse:
    scenario_key = request.scenario_id or "waterCycleG3"
    use_live_llm = bool(request.llm_config and request.llm_config.api_key.strip())

    iterations: list[IterationRecord] = []

    if not use_live_llm and scenario_key in DEMO_SCENARIOS:
        scenario = DEMO_SCENARIOS[scenario_key]
        steps = scenario["steps"]
        max_steps = min(len(steps), request.max_iterations + 1)

        for idx in range(max_steps):
            step_data = steps[idx]
            current_assessment: Assessment = step_data["assessment"].model_copy(deep=True)
            ver_result = verify_assessment(current_assessment, request.grade_spec)
            iterations.append(
                IterationRecord(
                    iteration_index=idx,
                    assessment=current_assessment,
                    verification_result=ver_result,
                    repair_summary=step_data["summary"],
                )
            )
            if ver_result.status == "sat":
                return RepairLoopResponse(
                    final_status="sat",
                    total_iterations=len(iterations),
                    iterations=iterations,
                )

        return RepairLoopResponse(
            final_status="unverifiedAfterRetries",
            total_iterations=len(iterations),
            iterations=iterations,
        )

    # Live LLM Mode (or custom topic fallback)
    topic = request.topic or "The Water Cycle"
    if use_live_llm and request.llm_config is not None:
        init_prompt = (
            f"Create a 2-question multiple-choice quiz on '{topic}' for {request.grade_spec.label}. "
            f"Return JSON matching: {{\"title\": str, \"gradeBandId\": \"{request.grade_spec.grade_band_id}\", "
            f"\"questions\": [{{\"questionId\": \"q1\", \"stem\": str, \"options\": [str, str, str, str], "
            f"\"correctOptionIndex\": 0, \"explanation\": str}}]}}"
        )
        raw_draft = _call_live_llm_json(init_prompt, request.llm_config)
        current_assessment = Assessment.model_validate(raw_draft)
    else:
        current_assessment = DEMO_SCENARIOS["waterCycleG3"]["steps"][0]["assessment"].model_copy(deep=True)

    for idx in range(request.max_iterations + 1):
        ver_result = verify_assessment(current_assessment, request.grade_spec)
        summary = (
            "Initial LLM draft generated."
            if idx == 0
            else f"Auto-Repair Pass {idx} guided by {len(iterations[-1].verification_result.unsat_core)} Z3 counterexamples."
        )
        iterations.append(
            IterationRecord(
                iteration_index=idx,
                assessment=current_assessment,
                verification_result=ver_result,
                repair_summary=summary,
            )
        )
        if ver_result.status == "sat":
            return RepairLoopResponse(
                final_status="sat",
                total_iterations=len(iterations),
                iterations=iterations,
            )

        if idx < request.max_iterations:
            if use_live_llm and request.llm_config is not None:
                repair_prompt = _build_repair_prompt(
                    current_assessment, request.grade_spec, ver_result
                )
                repaired_raw = _call_live_llm_json(repair_prompt, request.llm_config)
                current_assessment = Assessment.model_validate(repaired_raw)
            else:
                current_assessment = _deterministic_auto_repair_fallback(
                    current_assessment, request.grade_spec, ver_result
                )

    return RepairLoopResponse(
        final_status="unverifiedAfterRetries",
        total_iterations=len(iterations),
        iterations=iterations,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_api_and_repair.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit Task 4**

```bash
git add app/verifier/repair_orchestrator.py tests/test_api_and_repair.py
git commit -m "feat: add counterexample-guided repair orchestrator and K-12 demo scenarios"
```

---

### Task 5: FastAPI Application & Interactive Web Playground (`app/main.py`, `app/static/*`)

**Files:**
- Create: `app/main.py`
- Create: `app/static/index.html`
- Create: `app/static/styles.css`
- Create: `app/static/app.js`
- Create: `README.md`
- Modify: `tests/test_api_and_repair.py`

**Interfaces:**
- Consumes: `VerifyRequest`, `GenerateAndVerifyRequest` from `app.models`; `list_grade_specs` from `app.verifier.grade_specs`; `verify_assessment` from `app.verifier.z3_kernel`; `list_demo_scenarios`, `run_generate_and_verify_loop` from `app.verifier.repair_orchestrator`
- Produces:
  - FastAPI `app` in `app.main` serving:
    - `GET /` (Interactive Web Playground)
    - `GET /api/specs` (All Grade Specs + Demo Scenarios in `camelCase`)
    - `POST /api/verify` (Direct Z3 verification + SMT-LIB2 proof in `camelCase`)
    - `POST /api/generate-and-verify` (Full Generate $\rightarrow$ Z3 Verify $\rightarrow$ Auto-Repair loop in `camelCase`)

- [ ] **Step 1: Add failing API integration tests to `tests/test_api_and_repair.py`**

Modify `tests/test_api_and_repair.py` to append FastAPI `TestClient` tests:

```python
from fastapi.testclient import TestClient
from app.main import app


def test_api_specs_and_verify_endpoints_return_camel_case():
    client = TestClient(app)

    specs_resp = client.get("/api/specs")
    assert specs_resp.status_code == 200
    specs_json = specs_resp.json()
    assert "gradeSpecs" in specs_json
    assert "demoScenarios" in specs_json
    assert specs_json["gradeSpecs"][0]["gradeBandId"] == "primaryG1G2"

    loop_resp = client.post(
        "/api/generate-and-verify",
        json={
            "scenarioId": "waterCycleG3",
            "gradeSpec": {
                **specs_json["gradeSpecs"][1],
                "topicAllowlist": ["evaporation", "condensation"],
            },
            "maxIterations": 3,
        },
    )
    assert loop_resp.status_code == 200
    loop_json = loop_resp.json()
    assert loop_json["finalStatus"] == "sat"
    assert loop_json["iterations"][0]["verificationResult"]["status"] == "unsat"
    assert loop_json["iterations"][-1]["verificationResult"]["status"] == "sat"
    assert "smtLib2Script" in loop_json["iterations"][-1]["verificationResult"]

    # Direct /api/verify check on the repaired assessment
    repaired_assessment = loop_json["iterations"][-1]["assessment"]
    verify_resp = client.post(
        "/api/verify",
        json={
            "assessment": repaired_assessment,
            "gradeSpec": {
                **specs_json["gradeSpecs"][1],
                "topicAllowlist": ["evaporation", "condensation"],
            },
        },
    )
    assert verify_resp.status_code == 200
    verify_json = verify_resp.json()
    assert verify_json["status"] == "sat"
    assert verify_json["certificateHash"] is not None

    index_resp = client.get("/")
    assert index_resp.status_code == 200
    assert "Formal Verification" in index_resp.text
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_api_and_repair.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.main'`

- [ ] **Step 3: Implement `app/main.py` and the Interactive Web Playground (`app/static/*` + `README.md`)**

Create `app/main.py`:

```python
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from app.models import GenerateAndVerifyRequest, VerifyRequest
from app.verifier.grade_specs import list_grade_specs
from app.verifier.repair_orchestrator import (
    DEMO_SCENARIOS,
    list_demo_scenarios,
    run_generate_and_verify_loop,
)
from app.verifier.z3_kernel import verify_assessment

app = FastAPI(
    title="K-12 Educational Content Formal Verification Kernel",
    version="1.0.0",
)

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def serve_playground() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/api/specs")
def get_specs_and_scenarios() -> JSONResponse:
    specs = [s.model_dump(by_alias=True) for s in list_grade_specs()]
    scenarios = list_demo_scenarios()
    return JSONResponse(
        content={
            "gradeSpecs": specs,
            "demoScenarios": scenarios,
            "initialDrafts": {
                k: v["steps"][0]["assessment"].model_dump(by_alias=True)
                for k, v in DEMO_SCENARIOS.items()
            },
        }
    )


@app.post("/api/verify")
def verify_endpoint(payload: VerifyRequest) -> JSONResponse:
    result = verify_assessment(payload.assessment, payload.grade_spec)
    return JSONResponse(content=result.model_dump(by_alias=True))


@app.post("/api/generate-and-verify")
def generate_and_verify_endpoint(payload: GenerateAndVerifyRequest) -> JSONResponse:
    response = run_generate_and_verify_loop(payload)
    return JSONResponse(content=response.model_dump(by_alias=True))
```

Create `app/static/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>K-12 Educational Formal Verification Playground (Z3 SMT Kernel)</title>
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body>
  <header class="topHeader">
    <div class="headerContent">
      <div>
        <span class="badgePill">Z3 SMT Formal Kernel + Auto-Repair</span>
        <h1>K-12 Assessment Formal Verification Playground</h1>
        <p class="subtitle">
          Plain-English grade theorems compiled into mathematical Z3 assertions (<code>SAT</code> / <code>UNSAT Core</code>) with counterexample-guided LLM repair.
        </p>
      </div>
    </div>
  </header>

  <main class="mainGrid">
    <!-- Left Column: Grade Theorem & Input Controls -->
    <section class="panelCard">
      <h2>1. Select Scenario & Grade Specification ("Theorem")</h2>

      <div class="fieldGroup">
        <label for="scenarioSelect">Demo Scenario (Flawed LLM Draft &rarr; Z3 Auto-Repair)</label>
        <select id="scenarioSelect"></select>
        <p id="scenarioDescription" class="helperText"></p>
      </div>

      <div class="fieldGroup">
        <label for="gradeBandSelect">Target Grade Band</label>
        <select id="gradeBandSelect"></select>
      </div>

      <div class="rulesGrid">
        <div class="ruleField">
          <label for="maxWordsInput">Max Words / Sentence</label>
          <input type="number" id="maxWordsInput" min="4" max="40" />
        </div>
        <div class="ruleField">
          <label for="maxSyllablesInput">Max Syllables / Word</label>
          <input type="number" id="maxSyllablesInput" min="1" max="8" />
        </div>
        <div class="ruleField">
          <label for="fkMinInput">Flesch-Kincaid Min</label>
          <input type="number" id="fkMinInput" step="0.1" min="0" max="15" />
        </div>
        <div class="ruleField">
          <label for="fkMaxInput">Flesch-Kincaid Max</label>
          <input type="number" id="fkMaxInput" step="0.1" min="1" max="18" />
        </div>
        <div class="ruleField">
          <label for="optionSpreadInput">Max Option Word Spread</label>
          <input type="number" id="optionSpreadInput" min="1" max="20" />
        </div>
        <div class="ruleField">
          <label for="quizDurationInput">Quiz Time Budget (min)</label>
          <input type="number" id="quizDurationInput" min="1" max="60" />
        </div>
      </div>

      <div class="fieldGroup">
        <label for="allowlistInput">Curriculum Topic Allowlist (comma-separated words exempt from syllable cap)</label>
        <input type="text" id="allowlistInput" placeholder="e.g., evaporation, condensation" />
      </div>

      <div class="buttonRow">
        <button id="runRepairBtn" class="primaryBtn">Run Generate &rarr; Z3 Verify &rarr; Auto-Repair Loop</button>
        <button id="verifyJsonBtn" class="secondaryBtn">Verify Edited JSON Only</button>
      </div>

      <div class="fieldGroup editorSection">
        <label for="assessmentJsonEditor">Assessment JSON (Editable for Live Z3 Probing)</label>
        <textarea id="assessmentJsonEditor" rows="14" spellcheck="false"></textarea>
      </div>
    </section>

    <!-- Right Column: Verification Proof & Repair Trace -->
    <section class="panelCard">
      <div class="traceHeader">
        <h2>2. Z3 Formal Verification & Counterexample Trace</h2>
        <div id="iterationTabs" class="iterationTabs"></div>
      </div>

      <div id="statusBanner" class="statusBanner"></div>
      <div id="repairSummaryBox" class="repairSummaryBox"></div>

      <div class="metricsBar" id="metricsBar"></div>

      <div class="viewToggleRow">
        <button id="tabVisualBtn" class="tabBtn activeTab">Visual Counterexamples & Prescriptions</button>
        <button id="tabSmtBtn" class="tabBtn">SMT-LIB2 Formal Proof Script</button>
      </div>

      <div id="visualProofPane">
        <div id="prescriptionsContainer"></div>
        <div id="questionsContainer"></div>
      </div>

      <div id="smtProofPane" class="hiddenPane">
        <div id="certificateBox" class="certificateBox"></div>
        <pre id="smtScriptPre" class="codePre"></pre>
      </div>
    </section>
  </main>

  <script src="/static/app.js"></script>
</body>
</html>
```

Create `app/static/styles.css`:

```css
:root {
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --text-main: #0f172a;
  --text-muted: #475569;
  --border-color: #e2e8f0;
  --accent-blue: #2563eb;
  --accent-blue-hover: #1d4ed8;
  --sat-green-bg: #ecfdf5;
  --sat-green-border: #10b981;
  --sat-green-text: #065f46;
  --unsat-red-bg: #fef2f2;
  --unsat-red-border: #ef4444;
  --unsat-red-text: #991b1b;
  --warn-amber-bg: #fffbeb;
  --warn-amber-border: #f59e0b;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg-page);
  color: var(--text-main);
  line-height: 1.5;
}

.topHeader {
  background: #0f172a;
  color: #ffffff;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid #1e293b;
}

.headerContent {
  max-width: 1440px;
  margin: 0 auto;
}

.badgePill {
  display: inline-block;
  background: #1e3a8a;
  color: #93c5fd;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.topHeader h1 {
  margin: 0.4rem 0 0.25rem;
  font-size: 1.45rem;
}

.subtitle {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.92rem;
}

.mainGrid {
  max-width: 1440px;
  margin: 1.5rem auto;
  padding: 0 1.5rem;
  display: grid;
  grid-template-columns: 460px 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .mainGrid {
    grid-template-columns: 1fr;
  }
}

.panelCard {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.35rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.panelCard h2 {
  margin-top: 0;
  font-size: 1.1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.6rem;
}

.fieldGroup {
  margin-bottom: 1rem;
}

.fieldGroup label,
.ruleField label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.3rem;
}

select,
input[type="text"],
input[type="number"],
textarea {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.88rem;
  background: #fff;
  color: var(--text-main);
}

textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  resize: vertical;
}

.helperText {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.rulesGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
  background: #f8fafc;
  padding: 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.buttonRow {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.primaryBtn,
.secondaryBtn {
  padding: 0.6rem 0.9rem;
  border-radius: 7px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease;
}

.primaryBtn {
  flex: 1;
  background: var(--accent-blue);
  color: #ffffff;
}

.primaryBtn:hover {
  background: var(--accent-blue-hover);
}

.secondaryBtn {
  background: #e2e8f0;
  color: #1e293b;
}

.secondaryBtn:hover {
  background: #cbd5e1;
}

.traceHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.iterationTabs {
  display: flex;
  gap: 0.4rem;
}

.iterStepBtn {
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.iterStepBtn.activeIter {
  border-color: var(--accent-blue);
  background: #eff6ff;
  color: var(--accent-blue);
}

.statusBanner {
  padding: 0.85rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.statusSat {
  background: var(--sat-green-bg);
  border: 1px solid var(--sat-green-border);
  color: var(--sat-green-text);
}

.statusUnsat {
  background: var(--unsat-red-bg);
  border: 1px solid var(--unsat-red-border);
  color: var(--unsat-red-text);
}

.repairSummaryBox {
  font-size: 0.86rem;
  color: var(--text-muted);
  margin-bottom: 0.9rem;
  padding: 0.55rem 0.75rem;
  background: #f1f5f9;
  border-radius: 6px;
}

.metricsBar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.metricTile {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
}

.metricLabel {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.metricValue {
  font-size: 1.05rem;
  font-weight: 700;
}

.viewToggleRow {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.tabBtn {
  background: transparent;
  border: none;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
}

.tabBtn.activeTab {
  background: #e0e7ff;
  color: #1d4ed8;
}

.hiddenPane {
  display: none;
}

.prescriptionCard {
  background: var(--warn-amber-bg);
  border-left: 4px solid var(--warn-amber-border);
  padding: 0.7rem 0.9rem;
  border-radius: 6px;
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
}

.questionCard {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.9rem;
  margin-bottom: 0.85rem;
}

.optionItem {
  padding: 0.35rem 0.6rem;
  margin: 0.25rem 0;
  border-radius: 5px;
  background: #f8fafc;
  font-size: 0.86rem;
  display: flex;
  justify-content: space-between;
}

.optionCorrect {
  border-left: 3px solid #10b981;
  font-weight: 600;
}

.codePre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.78rem;
  max-height: 460px;
}

.certificateBox {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  margin-bottom: 0.6rem;
  padding: 0.6rem;
  background: #f1f5f9;
  border-radius: 6px;
  word-break: break-all;
}
```

Create `app/static/app.js` (strictly following the frontend `camelCase` variable rule):

```javascript
let gradeSpecsById = {};
let demoScenariosList = [];
let initialDraftsById = {};
let currentIterations = [];
let selectedIterationIndex = 0;

const scenarioSelect = document.getElementById("scenarioSelect");
const scenarioDescription = document.getElementById("scenarioDescription");
const gradeBandSelect = document.getElementById("gradeBandSelect");
const maxWordsInput = document.getElementById("maxWordsInput");
const maxSyllablesInput = document.getElementById("maxSyllablesInput");
const fkMinInput = document.getElementById("fkMinInput");
const fkMaxInput = document.getElementById("fkMaxInput");
const optionSpreadInput = document.getElementById("optionSpreadInput");
const quizDurationInput = document.getElementById("quizDurationInput");
const allowlistInput = document.getElementById("allowlistInput");
const assessmentJsonEditor = document.getElementById("assessmentJsonEditor");
const runRepairBtn = document.getElementById("runRepairBtn");
const verifyJsonBtn = document.getElementById("verifyJsonBtn");
const iterationTabs = document.getElementById("iterationTabs");
const statusBanner = document.getElementById("statusBanner");
const repairSummaryBox = document.getElementById("repairSummaryBox");
const metricsBar = document.getElementById("metricsBar");
const prescriptionsContainer = document.getElementById("prescriptionsContainer");
const questionsContainer = document.getElementById("questionsContainer");
const certificateBox = document.getElementById("certificateBox");
const smtScriptPre = document.getElementById("smtScriptPre");
const tabVisualBtn = document.getElementById("tabVisualBtn");
const tabSmtBtn = document.getElementById("tabSmtBtn");
const visualProofPane = document.getElementById("visualProofPane");
const smtProofPane = document.getElementById("smtProofPane");

function populateSpecInputs(gradeSpec, allowlistOverride) {
  maxWordsInput.value = gradeSpec.maxWordsPerSentence;
  maxSyllablesInput.value = gradeSpec.maxSyllablesPerWord;
  fkMinInput.value = gradeSpec.fleschKincaidMin;
  fkMaxInput.value = gradeSpec.fleschKincaidMax;
  optionSpreadInput.value = gradeSpec.maxOptionWordSpread;
  quizDurationInput.value = gradeSpec.quizDurationMinutes;
  const allowWords = allowlistOverride || gradeSpec.topicAllowlist || [];
  allowlistInput.value = allowWords.join(", ");
}

function readCurrentGradeSpec() {
  const bandId = gradeBandSelect.value;
  const baseSpec = gradeSpecsById[bandId];
  const allowlist = allowlistInput.value
    .split(",")
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0);

  return {
    ...baseSpec,
    maxWordsPerSentence: parseInt(maxWordsInput.value, 10),
    maxSyllablesPerWord: parseInt(maxSyllablesInput.value, 10),
    fleschKincaidMin: parseFloat(fkMinInput.value),
    fleschKincaidMax: parseFloat(fkMaxInput.value),
    maxOptionWordSpread: parseInt(optionSpreadInput.value, 10),
    quizDurationMinutes: parseInt(quizDurationInput.value, 10),
    topicAllowlist: allowlist,
  };
}

function renderIterationView(iterationRecord) {
  const verificationResult = iterationRecord.verificationResult;
  const assessment = iterationRecord.assessment;
  const metrics = verificationResult.metrics;

  assessmentJsonEditor.value = JSON.stringify(assessment, null, 2);
  repairSummaryBox.textContent = iterationRecord.repairSummary;

  if (verificationResult.status === "sat") {
    statusBanner.className = "statusBanner statusSat";
    statusBanner.innerHTML =
      "<strong>Z3 FORMAL PROOF: SAT (100% Verified)</strong> &mdash; All 6 grade specification constraints satisfied.";
    certificateBox.textContent = `SHA-256 Proof Certificate: ${verificationResult.certificateHash}`;
  } else {
    statusBanner.className = "statusBanner statusUnsat";
    statusBanner.innerHTML = `<strong>Z3 FORMAL PROOF: UNSAT (${verificationResult.unsatCore.length} Counterexamples in Unsat Core)</strong> &mdash; Click through repair iterations or see Z3 Optimizer bounds below.`;
    certificateBox.textContent = `UNSAT Core Trackers: [${verificationResult.unsatCore.join(", ")}]`;
  }

  metricsBar.innerHTML = `
    <div class="metricTile">
      <div class="metricLabel">Flesch-Kincaid Grade</div>
      <div class="metricValue">${metrics.fleschKincaidGrade}</div>
    </div>
    <div class="metricTile">
      <div class="metricLabel">Total Words</div>
      <div class="metricValue">${metrics.totalWords}</div>
    </div>
    <div class="metricTile">
      <div class="metricLabel">Est. Completion Time</div>
      <div class="metricValue">${metrics.estimatedCompletionSeconds}s</div>
    </div>
    <div class="metricTile">
      <div class="metricLabel">Unsat Core Size</div>
      <div class="metricValue">${verificationResult.unsatCore.length}</div>
    </div>
  `;

  if (verificationResult.prescriptions.length === 0) {
    prescriptionsContainer.innerHTML = "";
  } else {
    const itemsHtml = verificationResult.prescriptions
      .map(
        (presc) => `
        <div class="prescriptionCard">
          <strong>[${presc.trackerId}] (${presc.location})</strong><br/>
          ${presc.instruction}
        </div>
      `
      )
      .join("");
    prescriptionsContainer.innerHTML = `<h3>Z3 Optimizer Repair Prescriptions</h3>${itemsHtml}`;
  }

  const questionsHtml = assessment.questions
    .map((question, qIndex) => {
      const qMetrics = metrics.questionMetrics[qIndex];
      const optionsHtml = question.options
        .map((optText, optIndex) => {
          const isCorrect = optIndex === question.correctOptionIndex;
          const wordCount = qMetrics.optionWordCounts[optIndex];
          return `
            <div class="optionItem ${isCorrect ? "optionCorrect" : ""}">
              <span>${isCorrect ? "✓ " : ""}${optText}</span>
              <span>${wordCount} words</span>
            </div>
          `;
        })
        .join("");

      return `
        <div class="questionCard">
          <div><strong>${question.questionId.toUpperCase()}:</strong> ${question.stem}
            <span style="color:#64748b;font-size:0.8rem;">(Max sentence: ${qMetrics.stemMaxSentenceWords} words | Complexity: ${qMetrics.complexityScore})</span>
          </div>
          <div style="margin-top:0.5rem;">${optionsHtml}</div>
          <div style="margin-top:0.45rem;font-size:0.82rem;color:#475569;">
            <strong>Explanation:</strong> ${question.explanation}
          </div>
        </div>
      `;
    })
    .join("");

  questionsContainer.innerHTML = `<h3>Assessment Items & Metrics</h3>${questionsHtml}`;
  smtScriptPre.textContent = verificationResult.smtLib2Script;
}

function renderIterationTabs() {
  iterationTabs.innerHTML = "";
  currentIterations.forEach((iterRecord, idx) => {
    const btn = document.createElement("button");
    const statusBadge = iterRecord.verificationResult.status.toUpperCase();
    btn.className = `iterStepBtn ${idx === selectedIterationIndex ? "activeIter" : ""}`;
    btn.textContent = idx === 0 ? `Draft (${statusBadge})` : `Repair ${idx} (${statusBadge})`;
    btn.addEventListener("click", () => {
      selectedIterationIndex = idx;
      renderIterationTabs();
      renderIterationView(currentIterations[selectedIterationIndex]);
    });
    iterationTabs.appendChild(btn);
  });
}

async function executeRepairLoop() {
  const scenarioId = scenarioSelect.value;
  const gradeSpec = readCurrentGradeSpec();
  const response = await fetch("/api/generate-and-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenarioId,
      gradeSpec,
      maxIterations: 3,
    }),
  });
  const resultData = await response.json();
  currentIterations = resultData.iterations;
  selectedIterationIndex = 0;
  renderIterationTabs();
  renderIterationView(currentIterations[0]);
}

async function executeVerifyEditedJson() {
  try {
    const parsedAssessment = JSON.parse(assessmentJsonEditor.value);
    const gradeSpec = readCurrentGradeSpec();
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessment: parsedAssessment,
        gradeSpec,
      }),
    });
    const verificationResult = await response.json();
    currentIterations = [
      {
        iterationIndex: 0,
        assessment: parsedAssessment,
        verificationResult,
        repairSummary: "Direct Z3 verification of custom edited Assessment JSON.",
      },
    ];
    selectedIterationIndex = 0;
    renderIterationTabs();
    renderIterationView(currentIterations[0]);
  } catch (err) {
    statusBanner.className = "statusBanner statusUnsat";
    statusBanner.textContent = `Invalid Assessment JSON: ${err.message}`;
  }
}

async function initializePlayground() {
  const response = await fetch("/api/specs");
  const specData = await response.json();

  specData.gradeSpecs.forEach((spec) => {
    gradeSpecsById[spec.gradeBandId] = spec;
    const option = document.createElement("option");
    option.value = spec.gradeBandId;
    option.textContent = spec.label;
    gradeBandSelect.appendChild(option);
  });

  demoScenariosList = specData.demoScenarios;
  initialDraftsById = specData.initialDrafts;

  demoScenariosList.forEach((scenario) => {
    const option = document.createElement("option");
    option.value = scenario.scenarioId;
    option.textContent = scenario.title;
    scenarioSelect.appendChild(option);
  });

  scenarioSelect.addEventListener("change", () => {
    const selectedScenario = demoScenariosList.find(
      (s) => s.scenarioId === scenarioSelect.value
    );
    if (selectedScenario) {
      scenarioDescription.textContent = selectedScenario.description;
      gradeBandSelect.value = selectedScenario.gradeBandId;
      populateSpecInputs(
        gradeSpecsById[selectedScenario.gradeBandId],
        selectedScenario.defaultAllowlist
      );
      executeRepairLoop();
    }
  });

  gradeBandSelect.addEventListener("change", () => {
    const spec = gradeSpecsById[gradeBandSelect.value];
    if (spec) {
      populateSpecInputs(spec, []);
    }
  });

  tabVisualBtn.addEventListener("click", () => {
    tabVisualBtn.classList.add("activeTab");
    tabSmtBtn.classList.remove("activeTab");
    visualProofPane.classList.remove("hiddenPane");
    smtProofPane.classList.add("hiddenPane");
  });

  tabSmtBtn.addEventListener("click", () => {
    tabSmtBtn.classList.add("activeTab");
    tabVisualBtn.classList.remove("activeTab");
    smtProofPane.classList.remove("hiddenPane");
    visualProofPane.classList.add("hiddenPane");
  });

  runRepairBtn.addEventListener("click", executeRepairLoop);
  verifyJsonBtn.addEventListener("click", executeVerifyEditedJson);

  // Trigger initial scenario load
  scenarioSelect.value = demoScenariosList[0].scenarioId;
  scenarioSelect.dispatchEvent(new Event("change"));
}

initializePlayground();
```

Create `README.md`:

```markdown
# K-12 Educational Content Formal Verification Playground

Inspired by [Anthropic's Formal Verification Research](https://www.anthropic.com/research/formal-verification), this application pairs a deterministic linguistic analyzer and Microsoft's **Z3 Theorem Prover (`z3-solver`)** with a counterexample-guided LLM repair loop to formally verify primary and secondary school assessments.

## Quick Start

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest -v
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Then open `http://localhost:8000` in your browser.
```

- [ ] **Step 4: Run the full test suite to verify all tests pass**

Run: `.venv/bin/pytest -v`
Expected: PASS (all tests across `test_models_and_specs.py`, `test_linguistic_analyzer.py`, `test_z3_kernel.py`, and `test_api_and_repair.py` pass)

- [ ] **Step 5: Commit Task 5**

```bash
git add app/main.py app/static/index.html app/static/styles.css app/static/app.js README.md tests/test_api_and_repair.py
git commit -m "feat: add FastAPI endpoints and interactive Z3 verification web playground"
```
