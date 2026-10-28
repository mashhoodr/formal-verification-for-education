import json
from typing import Any
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


DEMO_SCENARIOS: dict[str, dict[str, Any]] = {
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
                    "proportional unit rates, balanced option lengths, and calibrated vocabulary to secondary grade bounds."
                ),
                "assessment": Assessment(
                    title="Grade 7 Maths: Ratios & Proportions",
                    grade_band_id="secondaryG6G8",
                    questions=[
                        QuestionItem(
                            question_id="q1",
                            stem="A bakery recipe combines four cups of flour for every two cups of milk. Which ratio is equivalent?",
                            options=[
                                "Six cups of flour to three cups of milk",
                                "Five cups of flour to two cups of milk",
                                "Four cups of flour to four cups of milk",
                                "Two cups of flour to four cups of milk",
                            ],
                            correct_option_index=0,
                            explanation="Both numerical ratios simplify directly to an equivalent proportional rate of two to one.",
                        ),
                        QuestionItem(
                            question_id="q2",
                            stem=(
                                "A commercial baker mixes six cups of flour with three cups of milk. "
                                "How can you demonstrate that ten cups of flour and five cups of milk remain proportional?"
                            ),
                            options=[
                                "Both ingredient combinations simplify directly to two cups of flour per cup of milk",
                                "Both ingredient combinations sum to exactly fifteen total measurement units",
                                "The second mixture requires four additional cups of each recipe ingredient",
                                "Multiplying the two quantities in each recipe batch results in thirty measurements",
                            ],
                            correct_option_index=0,
                            explanation="Dividing flour quantities by milk quantities establishes an identical proportional constant of two.",
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


def list_demo_scenarios() -> list[dict[str, Any]]:
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


def _clean_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def _call_live_llm_json(prompt: str, llm_config: LlmConfig) -> dict[str, Any]:
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
        raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(_clean_json_text(raw_text))

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
        raw_text = resp.json()["choices"][0]["message"]["content"]
        return json.loads(_clean_json_text(raw_text))

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
    raw_text = resp.json()["content"][0]["text"]
    return json.loads(_clean_json_text(raw_text))


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
    max_retries = max(1, min(5, request.max_iterations))

    iterations: list[IterationRecord] = []

    if not use_live_llm and scenario_key in DEMO_SCENARIOS:
        scenario = DEMO_SCENARIOS[scenario_key]
        grade_spec = request.grade_spec.model_copy(deep=True)
        # Apply defaultAllowlist if grade_spec.topic_allowlist is empty
        if not grade_spec.topic_allowlist and scenario.get("defaultAllowlist"):
            grade_spec.topic_allowlist = list(scenario["defaultAllowlist"])

        steps = scenario["steps"]
        max_steps = min(len(steps), max_retries + 1)

        for idx in range(max_steps):
            step_data = steps[idx]
            current_assessment: Assessment = step_data["assessment"].model_copy(deep=True)
            ver_result = verify_assessment(current_assessment, grade_spec)
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
    grade_spec = request.grade_spec.model_copy(deep=True)

    if use_live_llm and request.llm_config is not None:
        init_prompt = (
            f"Create a 2-question multiple-choice quiz on '{topic}' for {grade_spec.label}. "
            f"Return JSON matching: {{\"title\": str, \"gradeBandId\": \"{grade_spec.grade_band_id}\", "
            f"\"questions\": [{{\"questionId\": \"q1\", \"stem\": str, \"options\": [str, str, str, str], "
            f"\"correctOptionIndex\": 0, \"explanation\": str}}]}}"
        )
        raw_draft = _call_live_llm_json(init_prompt, request.llm_config)
        current_assessment = Assessment.model_validate(raw_draft)
    else:
        current_assessment = DEMO_SCENARIOS["waterCycleG3"]["steps"][0]["assessment"].model_copy(deep=True)

    for idx in range(max_retries + 1):
        ver_result = verify_assessment(current_assessment, grade_spec)
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

        if idx < max_retries:
            if use_live_llm and request.llm_config is not None:
                repair_prompt = _build_repair_prompt(
                    current_assessment, grade_spec, ver_result
                )
                repaired_raw = _call_live_llm_json(repair_prompt, request.llm_config)
                current_assessment = Assessment.model_validate(repaired_raw)
            else:
                current_assessment = _deterministic_auto_repair_fallback(
                    current_assessment, grade_spec, ver_result
                )

    return RepairLoopResponse(
        final_status="unverifiedAfterRetries",
        total_iterations=len(iterations),
        iterations=iterations,
    )
