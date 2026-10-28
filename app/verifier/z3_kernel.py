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
    n = len(option_word_counts)
    if n == 0:
        return []

    opt = z3.Optimize()
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

    # Metadata map so any tracker in unsat_core maps cleanly to a structured violation and Z3 prescription
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
        t_min, t_max = solved_bounds[0] if solved_bounds else (1, max(1, grade_spec.max_option_word_spread))
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

    # When unsat, capture ALL violated constraint trackers deterministically
    raw_core = set(str(item) for item in solver.unsat_core())
    sub = z3.Solver()
    sub.add(solver.assertions())
    for tid in tracker_meta.keys():
        if tid not in raw_core:
            if sub.check(z3.Bool(tid)) == z3.unsat:
                raw_core.add(tid)

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
