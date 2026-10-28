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


class SentenceMetric(CamelModel):
    text: str = ""
    word_count: int = 0
    syllable_count: int = 0
    complex_words: list[str] = Field(default_factory=list)


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
