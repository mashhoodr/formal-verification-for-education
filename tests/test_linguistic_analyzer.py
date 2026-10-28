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


def test_count_syllables_edge_cases():
    assert count_syllables("") == 0
    assert count_syllables("a") == 1
    assert count_syllables("the") == 1
    assert count_syllables("game") == 1
    assert count_syllables("bottle") == 2
    assert count_syllables("prism") == 2
    assert count_syllables("organism") == 4
    assert count_syllables("seeing") == 2


def test_split_sentences_edge_cases():
    assert split_sentences("") == []
    assert split_sentences("   ") == []
    assert split_sentences("Single sentence without punctuation") == ["Single sentence without punctuation"]
    assert split_sentences("Dr. Watson and Prof. Moriarty met.") == ["Dr. Watson and Prof. Moriarty met"]


def test_assessment_metrics_serialization():
    spec = get_grade_spec("primaryG3G5")
    assessment = Assessment(
        title="Quick Quiz",
        grade_band_id="primaryG3G5",
        questions=[
            QuestionItem(
                question_id="q1",
                stem="Is ice solid?",
                options=["Yes", "No", "Maybe", "Never"],
                correct_option_index=0,
                explanation="Ice is solid water.",
            )
        ],
    )
    metrics = analyze_assessment(assessment, spec)
    dumped = metrics.model_dump(by_alias=True)
    assert "totalWords" in dumped
    assert "fleschKincaidGrade" in dumped
    assert "estimatedCompletionSeconds" in dumped
    assert "questionMetrics" in dumped
    assert dumped["questionMetrics"][0]["questionId"] == "q1"
    assert "stemWordCount" in dumped["questionMetrics"][0]

