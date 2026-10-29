import pytest
from app.models import GenerateAndVerifyRequest

pytestmark = pytest.mark.filterwarnings(r"ignore:Using `httpx` with `starlette\.testclient`.*")



from app.verifier.grade_specs import get_grade_spec
from app.verifier.repair_orchestrator import (
    DEMO_SCENARIOS,
    list_demo_scenarios,
    run_generate_and_verify_loop,
)
from app.verifier.z3_kernel import verify_assessment


def test_list_demo_scenarios_returns_three_scenarios():
    scenarios = list_demo_scenarios()
    assert len(scenarios) == 3
    scenario_ids = [s["scenarioId"] for s in scenarios]
    assert "waterCycleG3" in scenario_ids
    assert "fractionsRatiosG7" in scenario_ids
    assert "habitatsExitTicketG2" in scenario_ids

    # Verify required keys in scenario summary
    for s in scenarios:
        assert "scenarioId" in s
        assert "title" in s
        assert "gradeBandId" in s
        assert "defaultAllowlist" in s
        assert "description" in s


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


def test_repair_orchestrator_drives_fractions_ratios_g7_to_sat():
    spec = get_grade_spec("secondaryG6G8")
    spec.topic_allowlist = ["proportional", "equivalent"]
    req = GenerateAndVerifyRequest(
        scenario_id="fractionsRatiosG7",
        grade_spec=spec,
        max_iterations=3,
    )

    response = run_generate_and_verify_loop(req)
    assert response.final_status == "sat"
    assert response.total_iterations >= 2
    assert response.iterations[0].verification_result.status == "unsat"
    assert len(response.iterations[0].verification_result.unsat_core) > 0
    final_iter = response.iterations[-1]
    assert final_iter.verification_result.status == "sat"
    assert final_iter.verification_result.certificate_hash is not None


def test_repair_orchestrator_drives_habitats_exit_ticket_g2_to_sat():
    spec = get_grade_spec("primaryG1G2")
    spec.topic_allowlist = ["habitat"]
    req = GenerateAndVerifyRequest(
        scenario_id="habitatsExitTicketG2",
        grade_spec=spec,
        max_iterations=3,
    )

    response = run_generate_and_verify_loop(req)
    assert response.final_status == "sat"
    assert response.total_iterations >= 2
    assert response.iterations[0].verification_result.status == "unsat"
    assert len(response.iterations[0].verification_result.unsat_core) > 0
    final_iter = response.iterations[-1]
    assert final_iter.verification_result.status == "sat"
    assert final_iter.verification_result.certificate_hash is not None


def test_all_demo_scenarios_step_zero_unsat_and_final_step_sat():
    for scenario_id, data in DEMO_SCENARIOS.items():
        grade_band_id = data["gradeBandId"]
        spec = get_grade_spec(grade_band_id)
        spec.topic_allowlist = list(data.get("defaultAllowlist", []))

        steps = data["steps"]
        assert len(steps) >= 2, f"Scenario {scenario_id} must have at least 2 steps"

        # Step 0 MUST be unsat
        step0_res = verify_assessment(steps[0]["assessment"], spec)
        assert step0_res.status == "unsat", (
            f"Scenario {scenario_id} step 0 expected unsat, got {step0_res.status}"
        )
        assert len(step0_res.unsat_core) > 0

        # Final step MUST be sat
        final_res = verify_assessment(steps[-1]["assessment"], spec)
        assert final_res.status == "sat", (
            f"Scenario {scenario_id} final step expected sat, got {final_res.status} "
            f"with violations: {[v.message for v in final_res.violations]}"
        )
        assert final_res.certificate_hash is not None


def test_repair_orchestrator_respects_max_iterations_bound():
    spec = get_grade_spec("primaryG3G5")
    spec.topic_allowlist = ["evaporation", "condensation"]
    # waterCycleG3 takes 2 repair passes (iterations 0, 1, 2) to reach SAT.
    # Limiting max_iterations to 1 allows iteration 0 and 1, stopping before step 2.
    req = GenerateAndVerifyRequest(
        scenario_id="waterCycleG3",
        grade_spec=spec,
        max_iterations=1,
    )

    response = run_generate_and_verify_loop(req)
    assert response.final_status == "unverifiedAfterRetries"
    assert response.total_iterations == 2  # iteration 0 + 1 retry
    assert len(response.iterations) == 2


def test_repair_loop_response_serialization_camel_case():
    spec = get_grade_spec("primaryG3G5")
    spec.topic_allowlist = ["evaporation", "condensation"]
    req = GenerateAndVerifyRequest(
        scenario_id="waterCycleG3",
        grade_spec=spec,
        max_iterations=3,
    )

    response = run_generate_and_verify_loop(req)
    dumped = response.model_dump(by_alias=True)
    assert "finalStatus" in dumped
    assert "totalIterations" in dumped
    assert "iterations" in dumped
    first_iter = dumped["iterations"][0]
    assert "iterationIndex" in first_iter
    assert "verificationResult" in first_iter
    assert "repairSummary" in first_iter
    assert "unsatCore" in first_iter["verificationResult"]


def test_build_repair_prompt_contains_constraints_and_prescriptions():
    from app.verifier.repair_orchestrator import _build_repair_prompt
    spec = get_grade_spec("primaryG3G5")
    spec.topic_allowlist = ["evaporation"]
    step0 = DEMO_SCENARIOS["waterCycleG3"]["steps"][0]["assessment"]
    ver = verify_assessment(step0, spec)
    prompt = _build_repair_prompt(step0, spec, ver)

    assert "maxWordsPerSentence: 14" in prompt
    assert "maxSyllablesPerWord: 3" in prompt
    assert "evaporation" in prompt
    assert "Z3 UNSAT CORE & PRESCRIPTIONS:" in prompt
    assert "Return ONLY valid JSON matching the Assessment schema" in prompt


def test_clean_json_text_handles_markdown_blocks_and_whitespace():
    from app.verifier.repair_orchestrator import _clean_json_text
    raw = '```json\n{"title": "Test Quiz", "questions": []}\n```'
    cleaned = _clean_json_text(raw)
    assert cleaned == '{"title": "Test Quiz", "questions": []}'

    raw2 = 'Here is the quiz: {"title": "Test Quiz"} hope it helps!'
    cleaned2 = _clean_json_text(raw2)
    assert cleaned2 == '{"title": "Test Quiz"}'


def test_call_live_llm_json_empty_api_key_raises_value_error():
    from app.models import LlmConfig
    from app.verifier.repair_orchestrator import _call_live_llm_json

    cfg = LlmConfig(provider="gemini", api_key="   ")
    with pytest.raises(ValueError, match="Live LLM mode requires a non-empty apiKey."):
        _call_live_llm_json("prompt", cfg)


def test_call_live_llm_json_mocked_providers(monkeypatch):
    import httpx
    from app.models import LlmConfig
    from app.verifier.repair_orchestrator import _call_live_llm_json

    # Mock gemini
    def mock_post_gemini(url, **kwargs):
        class MockResp:
            def raise_for_status(self): pass
            def json(self):
                return {
                    "candidates": [
                        {"content": {"parts": [{"text": '{"result": "geminiOk"}'}]}}
                    ]
                }
        return MockResp()

    monkeypatch.setattr(httpx, "post", mock_post_gemini)
    res_gemini = _call_live_llm_json("prompt", LlmConfig(provider="gemini", api_key="test-key"))
    assert res_gemini == {"result": "geminiOk"}

    # Mock openai
    def mock_post_openai(url, **kwargs):
        class MockResp:
            def raise_for_status(self): pass
            def json(self):
                return {
                    "choices": [
                        {"message": {"content": '{"result": "openaiOk"}'}}
                    ]
                }
        return MockResp()

    monkeypatch.setattr(httpx, "post", mock_post_openai)
    res_openai = _call_live_llm_json("prompt", LlmConfig(provider="openai", api_key="test-key"))
    assert res_openai == {"result": "openaiOk"}

    # Mock anthropic
    def mock_post_anthropic(url, **kwargs):
        class MockResp:
            def raise_for_status(self): pass
            def json(self):
                return {
                    "content": [
                        {"text": '```json\n{"result": "anthropicOk"}\n```'}
                    ]
                }
        return MockResp()

    monkeypatch.setattr(httpx, "post", mock_post_anthropic)
    res_anthropic = _call_live_llm_json("prompt", LlmConfig(provider="anthropic", api_key="test-key"))
    assert res_anthropic == {"result": "anthropicOk"}


def test_deterministic_auto_repair_fallback():
    from app.verifier.repair_orchestrator import _deterministic_auto_repair_fallback
    from app.models import Assessment, QuestionItem
    spec = get_grade_spec("primaryG1G2")  # max 10 words per sentence
    quiz = Assessment(
        title="Long Stem Quiz",
        grade_band_id="primaryG1G2",
        questions=[
            QuestionItem(
                question_id="q1",
                stem="This is an excessively long question stem that definitely exceeds ten words in a single sentence.",
                options=["A", "B"],
                correct_option_index=0,
            )
        ],
    )
    ver = verify_assessment(quiz, spec)
    repaired = _deterministic_auto_repair_fallback(quiz, spec, ver)
    words = repaired.questions[0].stem.split()
    assert len(words) <= spec.max_words_per_sentence
    assert repaired.questions[0].stem.endswith("?")


def test_api_specs_and_verify_endpoints_return_camel_case():
    from fastapi.testclient import TestClient
    from app.main import app

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
    assert "smtPipelineDiagram" in index_resp.text
    assert "smtTrackerMatrix" in index_resp.text
    assert "smtProofSliceInspector" in index_resp.text
    assert "symbolExplainerDialog" in index_resp.text
    assert "tabFeasibleMapBtn" in index_resp.text
    assert "feasibleMapPane" in index_resp.text
    assert "feasibleSpaceSvg" in index_resp.text
    assert "smtFilterBar" in index_resp.text
    assert "smtInteractiveViewer" in index_resp.text



