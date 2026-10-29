import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import CandidateKcItem
from app.verifier.curriculum_grounding import (
    derive_mathematical_complexity,
    get_stage0_grounding_report,
    load_misconception_catalog,
    simulate_cheat_demo,
)
from app.verifier.kc_ontology_kernel import _get_ncp_scenarios_data


@pytest.fixture
def client():
    return TestClient(app)


def test_load_misconception_catalog():
    """Test load_misconception_catalog loads 9 accredited bugs from Brown & Burton / Siegler."""
    bugs = load_misconception_catalog()
    assert len(bugs) == 9, f"Expected 9 accredited bugs, found {len(bugs)}"

    # Check key citations
    citations = " ".join([b.primary_citation for b in bugs])
    assert "Brown, J. S., & Burton, R. R. (1978)" in citations
    assert "Siegler, R. S." in citations

    # Validate model field integrity
    for bug in bugs:
        assert bug.bug_id.startswith("BUG_")
        assert len(bug.grades) >= 1
        assert 0.0 < bug.empirical_prevalence <= 1.0
        assert bug.formal_operator


def test_derive_mathematical_complexity():
    """Test derive_mathematical_complexity handles equal denominators (level 2) vs multiple denominators (level 4)."""
    kc_equal_denominators = CandidateKcItem(
        kc_id="KC_M02_ADD_LIKE",
        grade=2,
        title="Add and subtract like fractions within one whole",
        operation_code="add_subtract_fractions",
        mechanism_complexity=2,
        verb_count=1,
        observable_variables_count=2,
        misconceptions=["BUG_FRAC_ADD_BOTH"],
        prerequisites=[],
        covered_clause_ids=["M-02-A-32.c1"],
    )
    assert derive_mathematical_complexity(kc_equal_denominators) == 2

    kc_multiple_denominators = CandidateKcItem(
        kc_id="KC_M03_ADD_RELATED",
        grade=3,
        title="Add and subtract like and unlike fractions with denominators that are multiples of the same number",
        operation_code="add_subtract_fractions",
        mechanism_complexity=4,
        verb_count=1,
        observable_variables_count=3,
        misconceptions=["BUG_FRAC_KEEP_DENOM_CROSS_SCALE"],
        prerequisites=["KC_M02_ADD_LIKE"],
        covered_clause_ids=["M-03-A-24.c1"],
    )
    assert derive_mathematical_complexity(kc_multiple_denominators) == 4

    # Extra edge cases: pictorial identification (1) and mixed conversion (5)
    kc_pictorial = CandidateKcItem(
        kc_id="KC_M02_PICTORIAL",
        grade=2,
        title="Identify unit and like fractions of a discrete set of objects using pictorial representations",
        operation_code="identify_fractions",
        mechanism_complexity=1,
        verb_count=1,
        observable_variables_count=1,
        misconceptions=[],
        prerequisites=[],
        covered_clause_ids=[],
    )
    assert derive_mathematical_complexity(kc_pictorial) == 1


def test_get_stage0_grounding_report():
    """Test get_stage0_grounding_report returns all 8 junctions, with status and audits."""
    report = get_stage0_grounding_report("ncpMathFractionsG2G4")

    assert report.triad_id == "ncpMathFractionsG2G4"
    assert report.verb_audit_passed is True
    assert "100%" in report.verb_audit_details
    assert report.overall_grounding_status == "grounded"

    # Must verify all 8 generative junctions
    assert len(report.junction_audits) == 8
    junction_numbers = [j.junction_number for j in report.junction_audits]
    assert junction_numbers == [1, 2, 3, 4, 5, 6, 7, 8]

    # Verify each junction has non-empty audit details and proper status
    for junction in report.junction_audits:
        assert junction.name.startswith(f"Junction {junction.junction_number}:")
        assert junction.status in ["proven", "grounded", "proofTheaterRisk"]
        assert junction.status_label
        assert junction.cheat_risk_description
        assert junction.rigorous_proof_solution
        assert junction.audit_details
        assert junction.audit_passed is True

    # Check accredited bugs used
    assert len(report.accredited_bugs_used) > 0


def test_simulate_cheat_demo_all_types():
    """
    Test simulate_cheat_demo for all 4 cheat types, confirming they properly flag
    caught: True and explain the anti-proof-theater violation.
    """
    cheat_types = ["renumberingCheat", "labelLie", "conjoinedTwinBlob", "hallucinatedBug"]

    for cheat in cheat_types:
        res = simulate_cheat_demo(cheat)
        assert res.caught is True, f"Cheat {cheat} was not flagged as caught!"
        assert res.cheat_type == cheat
        assert len(res.title) > 0
        assert "SAT" in res.naive_checker_verdict
        assert "REJECTED" in res.stage0_grounding_verdict
        assert res.caught_by_audit
        assert len(res.mathematical_proof_explanation) > 0
        assert len(res.pedagogical_significance) > 0


def test_stage0_api_endpoints(client):
    """Test GET /api/stage0/grounding-report and POST /api/stage0/simulate-cheat."""
    resp = client.get("/api/stage0/grounding-report")
    assert resp.status_code == 200
    data = resp.json()
    assert data["triadId"] == "ncpMathFractionsG2G4"
    assert data["verbAuditPassed"] is True
    assert len(data["junctionAudits"]) == 8
    assert data["overallGroundingStatus"] == "grounded"

    for cheat in ["renumberingCheat", "labelLie", "conjoinedTwinBlob", "hallucinatedBug"]:
        resp_cheat = client.post("/api/stage0/simulate-cheat", json={"cheatType": cheat})
        assert resp_cheat.status_code == 200
        cheat_data = resp_cheat.json()
        assert cheat_data["caught"] is True
        assert cheat_data["cheatType"] == cheat
        assert "SAT" in cheat_data["naiveCheckerVerdict"]
        assert "REJECTED" in cheat_data["stage0GroundingVerdict"]


def test_stage1_alias_endpoints(client):
    """Test Stage 1 alias endpoints route to existing ontology kernel."""
    resp_scen = client.get("/api/stage1/scenarios")
    assert resp_scen.status_code == 200
    scenarios = resp_scen.json()["scenarios"]
    assert len(scenarios) >= 2

    resp_repair = client.post("/api/stage1/repair-loop", json={"scenarioId": "ncpMathFractionsG2G4"})
    assert resp_repair.status_code == 200
    data = resp_repair.json()
    assert data["finalStatus"] == "sat"
    assert len(data["iterations"]) >= 1

    # Verify endpoint alias
    raw_scenarios = _get_ncp_scenarios_data()
    verified_triad = raw_scenarios["ncpMathFractionsG2G4"]["steps"][-1][0]
    resp_verify = client.post(
        "/api/stage1/verify",
        json={"triadSpec": verified_triad.model_dump(by_alias=True)},
    )
    assert resp_verify.status_code == 200
    assert resp_verify.json()["status"] == "sat"
