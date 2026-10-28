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

ABBREVIATIONS = (
    "mr.",
    "mrs.",
    "ms.",
    "dr.",
    "prof.",
    "sr.",
    "jr.",
    "vs.",
    "e.g.",
    "i.e.",
    "fig.",
    "vol.",
    "approx.",
)
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
        pattern = re.compile(r"\b" + re.escape(abbr), re.IGNORECASE)
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
