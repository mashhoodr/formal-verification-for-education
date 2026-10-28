import pytest
from pydantic import ValidationError
from app.models import (
    Assessment,
    AssessmentMetrics,
    CamelModel,
    ConstraintViolation,
    GenerateAndVerifyRequest,
    GradeSpec,
    IterationRecord,
    LlmConfig,
    QuestionItem,
    QuestionMetrics,
    RepairLoopResponse,
    RepairPrescription,
    SentenceMetric,
    VerificationResult,
    VerifyRequest,
)
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


def test_get_grade_spec_unknown_raises_key_error():
    with pytest.raises(KeyError, match="Unknown gradeBandId: invalidBand"):
        get_grade_spec("invalidBand")


def test_grade_specs_are_isolated_copies():
    spec1 = get_grade_spec("primaryG1G2")
    spec1.max_words_per_sentence = 999
    spec2 = get_grade_spec("primaryG1G2")
    assert spec2.max_words_per_sentence == 10

    specs_list = list_grade_specs()
    specs_list[0].max_words_per_sentence = 888
    spec3 = get_grade_spec("primaryG1G2")
    assert spec3.max_words_per_sentence == 10


def test_model_validations():
    with pytest.raises(ValidationError):
        QuestionItem(
            question_id="",  # min_length=1
            stem="Test stem",
            options=["A", "B"],
            correct_option_index=0,
        )

    with pytest.raises(ValidationError):
        QuestionItem(
            question_id="q1",
            stem="Test stem",
            options=["Only one option"],  # min_length=2
            correct_option_index=0,
        )

    with pytest.raises(ValidationError):
        Assessment(
            title="",
            grade_band_id="primaryG1G2",
            questions=[],  # min_length=1
        )


def test_verification_result_and_metrics_camel_case():
    violation = ConstraintViolation(
        tracker_id="track_max_words",
        rule_category="readability",
        location="q1.stem",
        message="Sentence too long",
        actual_value=18.0,
        limit_value=14.0,
        offending_tokens=["long", "sentence"],
    )
    prescription = RepairPrescription(
        tracker_id="track_max_words",
        location="q1.stem",
        target_metric="maxWordsPerSentence",
        current_value=18.0,
        target_min=1.0,
        target_max=14.0,
        instruction="Split into shorter sentences",
    )
    q_metrics = QuestionMetrics(
        question_id="q1",
        stem_word_count=18,
        stem_sentence_count=1,
        stem_max_sentence_words=18,
        stem_complex_words=["sentence"],
        option_word_counts=[1, 1, 1, 1],
        option_max_sentence_words=[1, 1, 1, 1],
        option_complex_words=[[], [], [], []],
        option_word_spread=0,
        explanation_word_count=5,
        explanation_max_sentence_words=5,
        explanation_complex_words=[],
        complexity_score=19,
    )
    metrics = AssessmentMetrics(
        total_words=27,
        total_sentences=2,
        total_syllables=35,
        flesch_kincaid_grade=6.2,
        estimated_completion_seconds=35.0,
        question_metrics=[q_metrics],
    )
    res = VerificationResult(
        status="unsat",
        smt_lib2_script="(check-sat)",
        unsat_core=["track_max_words"],
        violations=[violation],
        prescriptions=[prescription],
        metrics=metrics,
    )

    dumped = res.model_dump(by_alias=True)
    assert dumped["status"] == "unsat"
    assert "unsatCore" in dumped
    assert "violations" in dumped
    assert dumped["violations"][0]["trackerId"] == "track_max_words"
    assert dumped["violations"][0]["ruleCategory"] == "readability"
    assert dumped["violations"][0]["offendingTokens"] == ["long", "sentence"]
    assert dumped["prescriptions"][0]["targetMetric"] == "maxWordsPerSentence"
    assert dumped["metrics"]["questionMetrics"][0]["stemMaxSentenceWords"] == 18

    # Check SentenceMetric
    sent = SentenceMetric(text="Hello world.", word_count=2, syllable_count=3, complex_words=[])
    sent_dump = sent.model_dump(by_alias=True)
    assert sent_dump["wordCount"] == 2
    assert sent_dump["syllableCount"] == 3
    assert sent_dump["complexWords"] == []
