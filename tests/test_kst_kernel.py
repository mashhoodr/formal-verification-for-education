import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.verifier.kst_kernel import (
    KST_DOMAINS,
    get_kst_domain_report,
    probe_knowledge_state,
    compute_quasi_order_closure,
    enumerate_valid_states,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_compute_quasi_order_closure():
    """Test reflexive-transitive closure computation for drivingSchool."""
    items = ["S", "C", "T", "P"]
    prereqs = [["S", "T"], ["C", "T"], ["S", "P"]]
    closure = compute_quasi_order_closure(items, prereqs)

    # Reflexivity: all (x, x)
    for x in items:
        assert (x, x) in closure

    # Direct edges
    assert ("S", "T") in closure
    assert ("C", "T") in closure
    assert ("S", "P") in closure

    # Non-edges
    assert ("T", "S") not in closure
    assert ("P", "C") not in closure


def test_kst_domain_reports_and_birkhoff_proofs():
    """Test all 3 KST domains: states enumeration, union closure, intersection closure, and Birkhoff bijection."""
    for domain_id in ["drivingSchool", "tinyMaths", "ncpFractionsG2G4"]:
        report = get_kst_domain_report(domain_id)

        assert report.domain_id == domain_id
        assert len(report.items) >= 4
        assert len(report.valid_states) > 0

        # Mathematical theorems formally proven in Z3
        assert report.union_closed_proven is True, f"Union closure proof failed for {domain_id}"
        assert report.intersection_closed_proven is True, f"Intersection closure proof failed for {domain_id}"
        assert report.birkhoff_bijection_proven is True, f"Birkhoff bijection proof failed for {domain_id}"

        # Hash and SMT snippet presence
        assert len(report.z3_certificate_hash) == 64  # SHA256 length
        assert "(set-logic" in report.smt_snippet or "assert" in report.smt_snippet

        # State space bounds: valid states must be strictly <= 2^|Q|
        assert report.valid_state_count <= report.total_possible_subsets

        # 5 Rungs present
        assert len(report.rungs) == 5
        rung_numbers = [r.rung_number for r in report.rungs]
        assert rung_numbers == [1, 2, 3, 4, 5]
        for r in report.rungs:
            assert r.title
            assert r.plain_english_summary
            assert r.everyday_analogy
            assert r.formal_definition
            assert r.key_takeaway

        # 3 Educational closure counterexamples present
        assert len(report.closure_counterexamples) == 3
        cx_ids = [c.counterexample_id for c in report.closure_counterexamples]
        assert cx_ids == ["missingIntermediateState", "schoolStreamTimetable", "misconceptionReplacement"]
        for c in report.closure_counterexamples:
            assert c.title
            assert c.domain_description
            assert c.why_union_fails
            assert "UNSAT" in c.z3_unsat_witness
            assert c.architectural_takeaway


def test_driving_school_state_lattice_details():
    """Verify specific mathematical lattice structure for drivingSchool (8 states)."""
    report = get_kst_domain_report("drivingSchool")
    assert report.total_possible_subsets == 16
    assert report.valid_state_count == 8

    state_tuples = [tuple(sorted(s.item_ids)) for s in report.valid_states]
    expected_states = [
        (),
        ("C",),
        ("S",),
        ("C", "S"),
        ("P", "S"),
        ("C", "P", "S"),
        ("C", "S", "T"),
        ("C", "P", "S", "T"),
    ]
    for exp in expected_states:
        assert exp in state_tuples

    # Empty state has empty inner fringe, outer fringe is root skills ['C', 'S']
    empty_state = next(s for s in report.valid_states if len(s.item_ids) == 0)
    assert empty_state.inner_fringe == []
    assert set(empty_state.outer_fringe) == {"C", "S"}

    # Full state has leaf skills in inner fringe, outer fringe is empty
    full_state = next(s for s in report.valid_states if len(s.item_ids) == 4)
    assert full_state.outer_fringe == []
    assert "T" in full_state.inner_fringe
    assert "P" in full_state.inner_fringe


def test_probe_knowledge_state_valid_and_invalid():
    """Test probe_knowledge_state distinguishes valid downward-closed states from prerequisite gaps."""
    # 1. Valid intermediate state: {S, C}
    resp_valid = probe_knowledge_state("drivingSchool", ["S", "C"])
    assert resp_valid.is_valid_state is True
    assert resp_valid.status_title == "VALID KNOWLEDGE STATE"
    assert resp_valid.missing_prerequisites == []
    assert "SAT" in resp_valid.z3_verdict
    assert set(resp_valid.outer_fringe) == {"P", "T"}  # Student ready to learn Parking & Traffic!
    assert set(resp_valid.inner_fringe) == {"C", "S"}

    # 2. Invalid state: {T} without {S, C}
    resp_invalid = probe_knowledge_state("drivingSchool", ["T"])
    assert resp_invalid.is_valid_state is False
    assert "GAP" in resp_invalid.status_title or "IMPOSSIBLE" in resp_invalid.status_title
    assert "S" in resp_invalid.missing_prerequisites
    assert "C" in resp_invalid.missing_prerequisites
    assert "UNSAT" in resp_invalid.z3_verdict
    assert resp_invalid.inner_fringe == []
    assert resp_invalid.outer_fringe == []

    # 3. Invalid state: {P} without {S}
    resp_invalid_p = probe_knowledge_state("drivingSchool", ["P"])
    assert resp_invalid_p.is_valid_state is False
    assert "S" in resp_invalid_p.missing_prerequisites

    # 4. Valid empty state
    resp_empty = probe_knowledge_state("drivingSchool", [])
    assert resp_empty.is_valid_state is True
    assert set(resp_empty.outer_fringe) == {"C", "S"}


def test_kst_api_endpoints(client):
    """Test HTTP endpoints for KST domains, reports, and probe state."""
    # GET /api/kst/domains
    resp = client.get("/api/kst/domains")
    assert resp.status_code == 200
    domains = resp.json()["domains"]
    assert len(domains) == 3
    domain_ids = [d["domainId"] for d in domains]
    assert "drivingSchool" in domain_ids
    assert "tinyMaths" in domain_ids
    assert "ncpFractionsG2G4" in domain_ids

    # GET /api/kst/domain-report
    resp_report = client.get("/api/kst/domain-report?domain_id=tinyMaths")
    assert resp_report.status_code == 200
    data = resp_report.json()
    assert data["domainId"] == "tinyMaths"
    assert data["unionClosedProven"] is True
    assert data["intersectionClosedProven"] is True
    assert data["birkhoffBijectionProven"] is True
    assert len(data["rungs"]) == 5
    assert len(data["closureCounterexamples"]) == 3

    # POST /api/kst/probe-state (valid)
    resp_probe = client.post(
        "/api/kst/probe-state",
        json={"domainId": "drivingSchool", "selectedItemIds": ["S", "C"]},
    )
    assert resp_probe.status_code == 200
    probe_data = resp_probe.json()
    assert probe_data["isValidState"] is True
    assert "SAT" in probe_data["z3Verdict"]

    # POST /api/kst/probe-state (invalid gap)
    resp_probe_gap = client.post(
        "/api/kst/probe-state",
        json={"domainId": "drivingSchool", "selectedItemIds": ["T"]},
    )
    assert resp_probe_gap.status_code == 200
    gap_data = resp_probe_gap.json()
    assert gap_data["isValidState"] is False
    assert "S" in gap_data["missingPrerequisites"]
    assert "C" in gap_data["missingPrerequisites"]
