from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
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

    @model_validator(mode="after")
    def validate_correct_option_index(self) -> "QuestionItem":
        if self.correct_option_index >= len(self.options):
            raise ValueError(
                f"correctOptionIndex ({self.correct_option_index}) must be less than options count ({len(self.options)})"
            )
        return self



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


class SloClauseItem(CamelModel):
    clause_id: str
    slo_code: str
    grade: int
    text: str


class CandidateKcItem(CamelModel):
    kc_id: str
    grade: int
    title: str
    operation_code: str
    mechanism_complexity: int
    verb_count: int = 1
    observable_variables_count: int = 1
    misconceptions: list[str] = Field(default_factory=list)
    prerequisites: list[str] = Field(default_factory=list)
    covered_clause_ids: list[str] = Field(default_factory=list)


class VerticalTriadSpec(CamelModel):
    triad_id: str
    title: str
    subject: str
    prior_grade: int
    target_grade: int
    next_grade: int
    slo_clauses: list[SloClauseItem]
    candidate_kcs: list[CandidateKcItem]


class EpistemicBoundaryItem(CamelModel):
    boundary_id: str
    title: str
    why_untested_by_z3: str
    failure_example: str
    mitigation_strategy: str


class Stage0Metrics(CamelModel):
    total_kcs: int
    prior_grade_kcs: int
    target_grade_kcs: int
    next_grade_kcs: int
    total_slo_clauses: int
    covered_slo_clauses: int
    total_prerequisite_edges: int
    total_tracked_theorems: int


class Stage0VerificationResult(CamelModel):
    status: Literal["sat", "unsat"]
    certificate_hash: Optional[str] = None
    smt_lib2_script: str
    unsat_core: list[str]
    violations: list[ConstraintViolation]
    prescriptions: list[RepairPrescription]
    topological_ranks: dict[str, int] = Field(default_factory=dict)
    metrics: Stage0Metrics
    untested_epistemic_boundaries: list[EpistemicBoundaryItem] = Field(default_factory=list)


class Stage0IterationRecord(CamelModel):
    iteration_index: int
    triad_spec: VerticalTriadSpec
    verification_result: Stage0VerificationResult
    repair_summary: str


class Stage0RepairResponse(CamelModel):
    final_status: Literal["sat", "unverifiedAfterRetries"]
    total_iterations: int
    iterations: list[Stage0IterationRecord]


class Stage0RepairRequest(CamelModel):
    scenario_id: str = "ncpMathFractionsG2G4"


class Stage0VerifyRequest(CamelModel):
    triad_spec: VerticalTriadSpec


class CognitiveBugItem(CamelModel):
    bug_id: str
    subject: str
    domain: str
    name: str
    formal_operator: str
    grades: list[int]
    primary_citation: str
    empirical_prevalence: float
    description: str


class JunctionAuditItem(CamelModel):
    junction_id: str
    junction_number: int
    name: str
    status: Literal["proven", "grounded", "proofTheaterRisk"]
    status_label: str
    cheat_risk_description: str
    rigorous_proof_solution: str
    audit_passed: bool
    audit_details: str


class Stage0GroundingReport(CamelModel):
    triad_id: str
    raw_pdf_text_snippet: str
    total_official_clauses: int
    verb_audit_passed: bool
    verb_audit_details: str
    junction_audits: list[JunctionAuditItem]
    accredited_bugs_used: list[CognitiveBugItem]
    overall_grounding_status: Literal["grounded", "unverifiedCheatDetected"]


class CheatSimulationRequest(CamelModel):
    cheat_type: Literal["renumberingCheat", "labelLie", "conjoinedTwinBlob", "hallucinatedBug"]


class CheatSimulationResponse(CamelModel):
    cheat_type: str
    title: str
    what_lazy_ai_did: str
    naive_checker_verdict: str
    stage0_grounding_verdict: str
    caught: bool = True
    caught_by_audit: str
    mathematical_proof_explanation: str
    pedagogical_significance: str

