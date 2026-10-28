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
                stem="What warms liquid water in lakes so that it rises into the air?",
                options=[
                    "Bright sunlight gently warms the liquid water",
                    "Cold winter snow quickly freezes the deep lake",
                    "Strong mountain wind pushes against large heavy rocks",
                    "Small brown fish swim rapidly near the shore",
                ],
                correct_option_index=0,
                explanation="Warm sunlight heats liquid water until it slowly turns into vapor.",
            ),
            QuestionItem(
                question_id="q2",
                stem="What forms high in the sky when warm water vapor cools down?",
                options=[
                    "Fluffy white clouds formed from tiny water droplets",
                    "Dry desert sand blowing across the flat ground",
                    "Deep tree roots spreading far beneath the earth",
                    "Smooth gray stones resting together along the beach",
                ],
                correct_option_index=0,
                explanation="Cooling water vapor gathers into droplets that form visible clouds.",
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


def test_verify_assessment_catches_option_sentence_length_and_explanation_complex_words():
    spec = get_grade_spec("primaryG1G2")
    # primaryG1G2: max_words_per_sentence=10, max_syllables_per_word=2
    quiz = Assessment(
        title="Plant Quiz",
        grade_band_id="primaryG1G2",
        questions=[
            QuestionItem(
                question_id="q1",
                stem="What do plants need?",
                options=[
                    "Plants need sunshine and clear clean water every single day of the spring season",
                    "Mud",
                    "Rocks",
                    "Toys",
                ],
                correct_option_index=0,
                explanation="Photosynthesis transforms radiant energy into chemical nourishment for organisms.",
            )
        ],
    )

    result = verify_assessment(quiz, spec)
    assert result.status == "unsat"
    assert "q1_opt0_sentence_words" in result.unsat_core
    assert "q1_explanation_complex_words" in result.unsat_core


def test_verify_assessment_catches_flesch_kincaid_bounds():
    spec = get_grade_spec("primaryG3G5")
    # Set impossible FK min to force flesch_kincaid_min violation
    spec.flesch_kincaid_min = 12.0
    quiz = _make_valid_g3_quiz()

    result = verify_assessment(quiz, spec)
    assert result.status == "unsat"
    assert "quiz_flesch_kincaid_min" in result.unsat_core

    # Set impossible FK max to force flesch_kincaid_max violation
    spec2 = get_grade_spec("primaryG3G5")
    spec2.flesch_kincaid_max = 1.0
    result2 = verify_assessment(quiz, spec2)
    assert result2.status == "unsat"
    assert "quiz_flesch_kincaid_max" in result2.unsat_core
