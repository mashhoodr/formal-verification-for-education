import pytest
from app.models import (
    SloClauseItem,
    CandidateKcItem,
    VerticalTriadSpec,
    Stage0VerificationResult,
)
from app.verifier.kc_ontology_kernel import (
    verify_kc_ontology,
    list_stage0_scenarios,
    run_stage0_repair_loop,
)


def _build_valid_fractions_triad() -> VerticalTriadSpec:
    return VerticalTriadSpec(
        triad_id="testFractionsG2G4",
        title="Pakistan NCP Mathematics: Fractions (Grades 2-4)",
        subject="Mathematics",
        prior_grade=2,
        target_grade=3,
        next_grade=4,
        slo_clauses=[
            SloClauseItem(
                clause_id="M-02-A-30.c1",
                slo_code="M-02-A-30",
                grade=2,
                text="Identify, name and write unit and like fractions using pictorial representations.",
            ),
            SloClauseItem(
                clause_id="M-02-A-32.c1",
                slo_code="M-02-A-32",
                grade=2,
                text="Add and subtract like fractions within one whole.",
            ),
            SloClauseItem(
                clause_id="M-03-A-20.c1",
                slo_code="M-03-A-20",
                grade=3,
                text="Recognise among proper fractions, improper fractions, and mixed numbers.",
            ),
            SloClauseItem(
                clause_id="M-03-A-21.c1",
                slo_code="M-03-A-21",
                grade=3,
                text="Identify equivalent fractions and show families of equivalent fractions.",
            ),
            SloClauseItem(
                clause_id="M-03-A-24.c1",
                slo_code="M-03-A-24",
                grade=3,
                text="Add and subtract like and unlike fractions with denominators that are multiples of the same number.",
            ),
            SloClauseItem(
                clause_id="M-04-A-21.c1",
                slo_code="M-04-A-21",
                grade=4,
                text="Convert improper fractions to mixed numbers and vice versa.",
            ),
            SloClauseItem(
                clause_id="M-04-A-25.c1",
                slo_code="M-04-A-25",
                grade=4,
                text="Multiply two fractions and/or mixed numbers and express the answer in its simplest form.",
            ),
        ],
        candidate_kcs=[
            CandidateKcItem(
                kc_id="KC-G2-01",
                grade=2,
                title="Identify unit and like fractions from shaded pictorial sets",
                operation_code="identify_fractions",
                mechanism_complexity=1,
                verb_count=1,
                observable_variables_count=1,
                misconceptions=["M1_shaded_over_unshaded", "M2_ignores_equal_parts"],
                prerequisites=[],
                covered_clause_ids=["M-02-A-30.c1"],
            ),
            CandidateKcItem(
                kc_id="KC-G2-02",
                grade=2,
                title="Add like fractions within one whole",
                operation_code="add_subtract_fractions",
                mechanism_complexity=2,
                verb_count=1,
                observable_variables_count=2,
                misconceptions=["M1_adds_denominators", "M2_multiplies_numerators"],
                prerequisites=["KC-G2-01"],
                covered_clause_ids=["M-02-A-32.c1"],
            ),
            CandidateKcItem(
                kc_id="KC-G3-01",
                grade=3,
                title="Classify proper fractions, improper fractions, and mixed numbers",
                operation_code="classify_fraction_types",
                mechanism_complexity=2,
                verb_count=1,
                observable_variables_count=1,
                misconceptions=[
                    "M1_confuses_improper_with_mixed",
                    "M2_treats_num_eq_den_as_proper",
                    "M3_ignores_whole_part",
                ],
                prerequisites=["KC-G2-01"],
                covered_clause_ids=["M-03-A-20.c1"],
            ),
            CandidateKcItem(
                kc_id="KC-G3-02",
                grade=3,
                title="Generate equivalent fractions by multiplicative scaling",
                operation_code="equivalent_fractions",
                mechanism_complexity=3,
                verb_count=1,
                observable_variables_count=2,
                misconceptions=[
                    "M1_adds_constant_to_num_and_den",
                    "M2_scales_numerator_only",
                    "M3_scales_denominator_only",
                ],
                prerequisites=["KC-G2-01"],
                covered_clause_ids=["M-03-A-21.c1"],
            ),
            CandidateKcItem(
                kc_id="KC-G3-03",
                grade=3,
                title="Add and subtract unlike fractions with related multiple denominators",
                operation_code="add_subtract_fractions",
                mechanism_complexity=4,
                verb_count=1,
                observable_variables_count=2,
                misconceptions=[
                    "M1_adds_denominators_directly",
                    "M2_forgets_to_scale_numerator",
                    "M3_subtracts_smaller_num_from_larger_regardless_of_order",
                ],
                prerequisites=["KC-G2-02", "KC-G3-02"],
                covered_clause_ids=["M-03-A-24.c1"],
            ),
            CandidateKcItem(
                kc_id="KC-G4-01",
                grade=4,
                title="Convert improper fractions to mixed numbers via division with remainder",
                operation_code="convert_improper_mixed",
                mechanism_complexity=5,
                verb_count=1,
                observable_variables_count=2,
                misconceptions=[
                    "M1_swaps_quotient_and_remainder",
                    "M2_uses_quotient_as_new_denominator",
                    "M3_adds_whole_to_numerator_without_multiplying",
                ],
                prerequisites=["KC-G3-01"],
                covered_clause_ids=["M-04-A-21.c1"],
            ),
            CandidateKcItem(
                kc_id="KC-G4-02",
                grade=4,
                title="Multiply two fractions and reduce to simplest form",
                operation_code="multiply_fractions",
                mechanism_complexity=6,
                verb_count=1,
                observable_variables_count=2,
                misconceptions=[
                    "M1_cross_multiplies_numerators_and_denominators",
                    "M2_finds_common_denominator_and_keeps_it",
                    "M3_inverts_second_fraction_like_division",
                ],
                prerequisites=["KC-G3-03", "KC-G4-01"],
                covered_clause_ids=["M-04-A-25.c1"],
            ),
        ],
    )


def test_stage0_proves_sat_for_valid_pakistan_ncp_triad():
    triad = _build_valid_fractions_triad()
    res: Stage0VerificationResult = verify_kc_ontology(triad)
    assert res.status == "sat"
    assert res.certificate_hash is not None
    assert len(res.unsat_core) == 0
    assert len(res.topological_ranks) == len(triad.candidate_kcs)
    assert res.topological_ranks["KC-G2-01"] < res.topological_ranks["KC-G3-02"]
    assert res.topological_ranks["KC-G3-02"] < res.topological_ranks["KC-G3-03"]
    assert len(res.untested_epistemic_boundaries) >= 6


def test_stage0_catches_dag_cycle_and_backward_grade_dependency():
    triad = _build_valid_fractions_triad()
    # Create a cycle and backward grade edge: KC-G3-01 depends on KC-G4-01 (Grade 4 > Grade 3, and cycle with KC-G4-01 -> KC-G3-01)
    triad.candidate_kcs[2].prerequisites.append("KC-G4-01")
    res = verify_kc_ontology(triad)
    assert res.status == "unsat"
    assert any("dag_edge" in t or "vertical_mono" in t for t in res.unsat_core)


def test_stage0_catches_cross_grade_envelope_collision_and_blob_kc():
    triad = _build_valid_fractions_triad()
    # Make KC-G3-03 have the exact same operation_code + mechanism_complexity as KC-G2-02 (cross-grade collision!)
    triad.candidate_kcs[4].mechanism_complexity = 2
    # Also make KC-G3-01 a composite blob KC (verb_count = 2) with only 1 misconception
    triad.candidate_kcs[2].verb_count = 2
    triad.candidate_kcs[2].misconceptions = ["only_one_misconception"]

    res = verify_kc_ontology(triad)
    assert res.status == "unsat"
    core_str = " ".join(res.unsat_core)
    assert "boundary_disjoint" in core_str
    assert "atomicity_verb" in core_str
    assert "misconceptions_min" in core_str


def test_stage0_catches_uncovered_slo_clause_and_orphan_kc():
    triad = _build_valid_fractions_triad()
    # Drop coverage of M-03-A-21.c1 and make KC-G3-02 cover nothing (orphan KC!)
    triad.candidate_kcs[3].covered_clause_ids = []
    res = verify_kc_ontology(triad)
    assert res.status == "unsat"
    core_str = " ".join(res.unsat_core)
    assert "clause_covered_M_03_A_21_c1" in core_str
    assert "no_orphan_KC_G3_02" in core_str


def test_stage0_catches_disconnected_spiral_bridge():
    triad = _build_valid_fractions_triad()
    # Remove every Grade 3 -> Grade 4 prerequisite edge
    triad.candidate_kcs[5].prerequisites = []
    triad.candidate_kcs[6].prerequisites = ["KC-G4-01"]
    res = verify_kc_ontology(triad)
    assert res.status == "unsat"
    assert "kc_vertical_bridge_target_to_next" in res.unsat_core


def test_stage0_catches_empty_grade_delta_progression():
    triad = _build_valid_fractions_triad()
    # Flatten Grade 3 complexity below Grade 2's max (2) while keeping ops distinct from Grade 2
    for kc in triad.candidate_kcs:
        if kc.grade == 3:
            kc.mechanism_complexity = 1
            kc.operation_code = kc.operation_code + "_g3"
    res = verify_kc_ontology(triad)
    assert res.status == "unsat"
    assert "kc_grade_delta_progression_prior_lt_target" in res.unsat_core


def test_stage0_repair_loop_drives_ncp_scenarios_from_unsat_to_sat():
    scenarios = list_stage0_scenarios()
    assert len(scenarios) >= 2
    for scen in scenarios:
        loop_res = run_stage0_repair_loop(scen["scenarioId"])
        assert loop_res.final_status == "sat"
        assert loop_res.iterations[0].verification_result.status == "unsat"
        assert loop_res.iterations[-1].verification_result.status == "sat"
        dumped = loop_res.model_dump(by_alias=True)
        assert "finalStatus" in dumped
        assert "untestedEpistemicBoundaries" in dumped["iterations"][0]["verificationResult"]
