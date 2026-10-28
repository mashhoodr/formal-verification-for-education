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
