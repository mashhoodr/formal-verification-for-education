import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.verifier.proof_theater_eval import run_proof_theater_eval
from app.verifier.curriculum_grounding import (
    derive_verb_count,
    compute_clause_lexical_overlap,
    validate_canonical_operation,
    validate_accredited_misconceptions,
    load_misconception_catalog,
)
from app.models import CandidateKcItem, SloClauseItem


@pytest.fixture
def client():
    return TestClient(app)


def test_proof_theater_evaluation_report():
    """
    Test that run_proof_theater_eval() executes the 8 adversarial mutants,
    confirming Naïve catches 2/8 (25.0%) and Grounded catches 8/8 (100.0%).
    """
    report = run_proof_theater_eval()

    assert report.eval_id == "proof_theater_red_team_eval_2026"
    assert report.total_mutants == 8
    assert report.naive_caught_count == 2
    assert report.naive_kill_rate_pct == 25.0
    assert report.grounded_caught_count == 8
    assert report.grounded_kill_rate_pct == 100.0

    # Summary diagnosis checks
    assert "25.0%" in report.summary_diagnosis
    assert "100.0%" in report.summary_diagnosis
    assert len(report.how_eval_works_steps) == 4

    # Mutant structure checks
    assert len(report.mutants) == 8
    numbers = [m.mutant_number for m in report.mutants]
    assert numbers == [1, 2, 3, 4, 5, 6, 7, 8]

    # Verify each mutant has complete diagnostic trace
    for m in report.mutants:
        assert m.mutant_id.startswith("MUTANT-")
        assert len(m.title) > 0
        assert len(m.category) > 0
        assert len(m.lazy_ai_sabotage) > 0
        assert len(m.mutated_json_snippet) > 0
        assert len(m.catching_layer) > 0
        assert len(m.pedagogical_risk_if_missed) > 0
        assert m.grounded_caught is True
        assert "UNSAT" in m.grounded_verdict

    # Check exactly which mutants Naïve caught: Mutants 7 (cycles) and 8 (backward grade leap)
    caught_by_naive = [m.mutant_number for m in report.mutants if m.naive_caught]
    assert caught_by_naive == [7, 8]


def test_derive_verb_count_atomicity():
    """Test deterministic verb count derivation against single-verb and conjoined composite KCs."""
    # Atomic KCs -> 1
    assert derive_verb_count("Identify unit and like fractions from shaded pictorial representations") == 1
    assert derive_verb_count("Add and subtract like fractions within one whole") == 1
    assert derive_verb_count("Recognise proper, improper, and mixed fractions") == 1
    assert derive_verb_count("Generate equivalent fractions by multiplying numerator and denominator by same factor") == 1
    assert derive_verb_count("Simplify a fraction to lowest terms by dividing by highest common factor") == 1
    assert derive_verb_count("Convert improper fractions to mixed numbers and vice versa") == 1
    assert derive_verb_count("Multiply two fractions and express in simplest form") == 1

    # Conjoined Twin Blob -> 2
    assert derive_verb_count("Identify equivalent fractions AND simplify fractions to lowest terms") == 2
    assert derive_verb_count("Solve two-step word problems and graph the linear equation") == 2


def test_compute_clause_lexical_overlap():
    """Test lexical anchor projection detecting 'The Label Lie'."""
    clauses = [
        SloClauseItem(
            clause_id="M-03-A-21.c1",
            slo_code="M-03-A-21",
            grade=3,
            text="Identify equivalent fractions and show families of equivalent fractions.",
        )
    ]

    # Aligned KC
    aligned_kc = CandidateKcItem(
        kc_id="KC_ALIGNED",
        grade=3,
        title="Generate equivalent fractions by multiplying numerator and denominator by same factor",
        operation_code="equivalent_fractions",
        mechanism_complexity=3,
        covered_clause_ids=["M-03-A-21.c1"],
    )
    passed, overlap = compute_clause_lexical_overlap(aligned_kc, clauses)
    assert passed is True
    assert overlap >= 0.25

    # Label Lie KC: mentions volume and water instead of fractions
    cheat_kc = CandidateKcItem(
        kc_id="KC_CHEAT",
        grade=3,
        title="Measure volume of water in milliliters",
        operation_code="measure_volume",
        mechanism_complexity=3,
        covered_clause_ids=["M-03-A-21.c1"],
    )
    passed, overlap = compute_clause_lexical_overlap(cheat_kc, clauses)
    assert passed is False
    assert overlap < 0.25


def test_validate_canonical_operation():
    """Test canonical operation code validation detecting 'Synonym Camouflage'."""
    assert validate_canonical_operation("identify_fractions") is True
    assert validate_canonical_operation("add_subtract_fractions") is True
    assert validate_canonical_operation("convert_improper_mixed") is True

    # Hallucinated synonym codes
    assert validate_canonical_operation("sum_fractions_pseudo_op") is False
    assert validate_canonical_operation("magic_fraction_hack") is False


def test_validate_accredited_misconceptions():
    """Test cognitive misconception validation detecting hallucinated bugs."""
    catalog = load_misconception_catalog()

    # Valid accredited KC
    valid_kc = CandidateKcItem(
        kc_id="KC_VALID",
        grade=3,
        title="Add and subtract fractions",
        operation_code="add_subtract_fractions",
        mechanism_complexity=4,
        misconceptions=["BUG_FRAC_ADD_BOTH", "BUG_FRAC_KEEP_DENOM_CROSS_SCALE"],
    )
    assert validate_accredited_misconceptions(valid_kc, catalog) is True

    # Hallucinated bug KC
    hallucinated_kc = CandidateKcItem(
        kc_id="KC_HALLUCINATED",
        grade=3,
        title="Add and subtract fractions",
        operation_code="add_subtract_fractions",
        mechanism_complexity=4,
        misconceptions=["Student cubes denominator and subtracts 7", "Student eats pencil eraser"],
    )
    assert validate_accredited_misconceptions(hallucinated_kc, catalog) is False


def test_proof_theater_eval_api_endpoint(client):
    """Test GET /api/proof-theater/eval-report returns the full evaluated report in camelCase."""
    resp = client.get("/api/proof-theater/eval-report")
    assert resp.status_code == 200
    data = resp.json()

    assert data["evalId"] == "proof_theater_red_team_eval_2026"
    assert data["totalMutants"] == 8
    assert data["naiveCaughtCount"] == 2
    assert data["naiveKillRatePct"] == 25.0
    assert data["groundedCaughtCount"] == 8
    assert data["groundedKillRatePct"] == 100.0
    assert len(data["mutants"]) == 8
    assert "summaryDiagnosis" in data
