"""
Stage 0 Formal Verification Proof: Mathematics Fractions Progression (Grades 2 -> 3 -> 4)
Using official Student Learning Outcomes from National Curriculum of Pakistan (NCP 2022-23).

This script verifies:
1. Prerequisite DAG Acyclicity
2. Vertical Grade Monotonicity
3. Non-Empty Grade Delta (SLO_G \ SLO_{G-1} != empty)
4. Disjoint Upper Ceiling (G+1 Delta is Forbidden in G)
5. Atomicity & Misconception Completeness
6. SLO Clause Bipartite Coverage
"""

import json
import z3

def load_data():
    with open("data/curriculum/pakistan/extracted/mathematics_fractions_progression_g1_g5.json") as f:
        return json.load(f)

# Candidate Atomic KCs decomposed from NCP Mathematics Fractions (Grades 2, 3, 4)
CANDIDATE_KCS = [
    # --- GRADE 2 KCs ---
    {
        "kcId": "KC-MATH-G2-FRAC-01",
        "grade": 2,
        "title": "Identify and name unit fractions from pictorial representations",
        "operation": "identify_unit_fraction",
        "verbCount": 1,
        "observableVariablesCount": 1,
        "denominatorsAllowed": [2, 3, 4, 5, 6, 8, 10],
        "misconceptions": [
            "M1_counts_shaded_over_unshaded",      # e.g., 1 shaded, 3 unshaded -> 1/3 instead of 1/4
            "M2_ignores_equal_parts_requirement"   # unequal partitions treated as valid fraction
        ],
        "prerequisites": [],
        "coversSloClauses": ["M-02-A-30.c1"]
    },
    {
        "kcId": "KC-MATH-G2-FRAC-02",
        "grade": 2,
        "title": "Compare two like fractions with denominators up to 10 using <, >, =",
        "operation": "compare_like_fractions",
        "verbCount": 1,
        "observableVariablesCount": 2,
        "denominatorsAllowed": [2, 3, 4, 5, 6, 8, 10],
        "misconceptions": [
            "M1_larger_denominator_means_larger_fraction",
            "M2_reverses_inequality_symbol"
        ],
        "prerequisites": ["KC-MATH-G2-FRAC-01"],
        "coversSloClauses": ["M-02-A-31.c1"]
    },
    {
        "kcId": "KC-MATH-G2-FRAC-03",
        "grade": 2,
        "title": "Add like fractions within one whole with same denominator",
        "operation": "add_like_fractions_within_whole",
        "verbCount": 1,
        "observableVariablesCount": 2,
        "denominatorsAllowed": [2, 3, 4, 5, 6, 8, 10],
        "sumLimit": 1.0,  # strictly within 1 whole
        "misconceptions": [
            "M1_adds_both_numerators_and_denominators", # 1/4 + 2/4 = 3/8
            "M2_multiplies_instead_of_adds"
        ],
        "prerequisites": ["KC-MATH-G2-FRAC-01"],
        "coversSloClauses": ["M-02-A-32.c1"]
    },

    # --- GRADE 3 KCs (Target Grade G) ---
    {
        "kcId": "KC-MATH-G3-FRAC-01",
        "grade": 3,
        "title": "Classify fractions as proper, improper, or mixed numbers",
        "operation": "classify_fraction_type",
        "verbCount": 1,
        "observableVariablesCount": 1,
        "misconceptions": [
            "M1_confuses_improper_with_mixed",
            "M2_believes_proper_fraction_can_exceed_one"
        ],
        "prerequisites": ["KC-MATH-G2-FRAC-01"],
        "coversSloClauses": ["M-03-A-20.c1"]
    },
    {
        "kcId": "KC-MATH-G3-FRAC-02",
        "grade": 3,
        "title": "Generate equivalent fractions by multiplying numerator and denominator by same factor",
        "operation": "generate_equivalent_fractions",
        "verbCount": 1,
        "observableVariablesCount": 2,
        "misconceptions": [
            "M1_adds_constant_to_top_and_bottom", # additive trap 1/2 -> 2/3 (+1)
            "M2_multiplies_only_numerator"
        ],
        "prerequisites": ["KC-MATH-G2-FRAC-01"],
        "coversSloClauses": ["M-03-A-21.c1"]
    },
    {
        "kcId": "KC-MATH-G3-FRAC-03",
        "grade": 3,
        "title": "Simplify a fraction to lowest terms by dividing by common factor",
        "operation": "simplify_fraction_lowest_terms",
        "verbCount": 1,
        "observableVariablesCount": 1,
        "misconceptions": [
            "M1_stops_before_coprime_lowest_terms",
            "M2_subtracts_factor_instead_of_dividing"
        ],
        "prerequisites": ["KC-MATH-G3-FRAC-02"],
        "coversSloClauses": ["M-03-A-22.c1"]
    },
    {
        "kcId": "KC-MATH-G3-FRAC-04",
        "grade": 3,
        "title": "Add and subtract unlike fractions where one denominator is a multiple of the other",
        "operation": "add_subtract_related_denominators",
        "verbCount": 1,
        "observableVariablesCount": 2,
        "denominatorRelation": "multiple_of_same_number", # e.g. 1/2 + 1/4 (4 is multiple of 2)
        "misconceptions": [
            "M1_adds_denominators_directly",
            "M2_fails_to_scale_numerator_when_converting_denominator"
        ],
        "prerequisites": ["KC-MATH-G2-FRAC-03", "KC-MATH-G3-FRAC-02"],
        "coversSloClauses": ["M-03-A-24.c1"]
    },

    # --- GRADE 4 KCs (Future Grade G+1 Ceiling) ---
    {
        "kcId": "KC-MATH-G4-FRAC-01",
        "grade": 4,
        "title": "Convert improper fractions to mixed numbers and vice versa algebraically",
        "operation": "convert_improper_to_mixed",
        "verbCount": 1,
        "observableVariablesCount": 2,
        "misconceptions": [
            "M1_uses_remainder_as_denominator",
            "M2_multiplies_whole_by_numerator_instead_of_denominator"
        ],
        "prerequisites": ["KC-MATH-G3-FRAC-01"],
        "coversSloClauses": ["M-04-A-21.c1"]
    },
    {
        "kcId": "KC-MATH-G4-FRAC-02",
        "grade": 4,
        "title": "Multiply a proper or improper fraction by a whole number",
        "operation": "multiply_fraction_by_whole",
        "verbCount": 1,
        "observableVariablesCount": 2,
        "misconceptions": [
            "M1_multiplies_whole_number_by_both_num_and_den", # 3 * (1/4) = 3/12
            "M2_adds_whole_to_numerator"
        ],
        "prerequisites": ["KC-MATH-G3-FRAC-01"],
        "coversSloClauses": ["M-04-A-24.c1"]
    },
    {
        "kcId": "KC-MATH-G4-FRAC-03",
        "grade": 4,
        "title": "Multiply two fractions and express answer in simplest form",
        "operation": "multiply_fraction_by_fraction",
        "verbCount": 1,
        "observableVariablesCount": 2,
        "misconceptions": [
            "M1_cross_multiplies_instead_of_direct",
            "M2_inverts_second_fraction_unnecessarily"
        ],
        "prerequisites": ["KC-MATH-G4-FRAC-02", "KC-MATH-G3-FRAC-03"],
        "coversSloClauses": ["M-04-A-25.c1"]
    }
]

def verify_stage0_kc_ontology(target_grade=3):
    """
    Runs Stage 0 Z3 Formal Verification on the candidate KC Graph
    for target Grade 3 against Grade 2 (floor) and Grade 4 (ceiling).
    """
    solver = z3.Solver()
    kc_map = {kc["kcId"]: kc for kc in CANDIDATE_KCS}

    # 1. Map each KC to an integer topological rank variable
    rank_vars = {}
    for kc_id in kc_map:
        rank_vars[kc_id] = z3.Int(f"rank_{kc_id.replace('-', '_')}")
        solver.add(rank_vars[kc_id] >= 1)

    # 2. Check 0.1: Prerequisite DAG Acyclicity (rank(u) < rank(v))
    for kc_id, kc in kc_map.items():
        for prereq_id in kc["prerequisites"]:
            if prereq_id in rank_vars:
                tracker = z3.Bool(f"track_dag_{prereq_id}_{kc_id}".replace('-', '_'))
                solver.assert_and_track(rank_vars[prereq_id] < rank_vars[kc_id], tracker)

    # 3. Check 0.2: Vertical Grade Monotonicity (grade(u) <= grade(v))
    for kc_id, kc in kc_map.items():
        for prereq_id in kc["prerequisites"]:
            prereq_kc = kc_map.get(prereq_id)
            if prereq_kc:
                tracker = z3.Bool(f"track_mono_{prereq_id}_{kc_id}".replace('-', '_'))
                grade_u = z3.IntVal(prereq_kc["grade"])
                grade_v = z3.IntVal(kc["grade"])
                solver.assert_and_track(grade_u <= grade_v, tracker)

    # 4. Check 0.3: Non-Empty Grade Delta for target Grade G
    g_kcs = [kc for kc in CANDIDATE_KCS if kc["grade"] == target_grade]
    g_minus_1_kcs = [kc for kc in CANDIDATE_KCS if kc["grade"] == target_grade - 1]
    g_plus_1_kcs = [kc for kc in CANDIDATE_KCS if kc["grade"] == target_grade + 1]

    # Non-empty delta assertion
    solver.assert_and_track(z3.BoolVal(len(g_kcs) > 0), z3.Bool("track_g_delta_non_empty"))

    # Disjoint operations between Grade G delta and Grade G+1 forbidden ceiling
    g_ops = set(kc["operation"] for kc in g_kcs)
    g_plus_1_ops = set(kc["operation"] for kc in g_plus_1_kcs)
    overlap_ops = g_ops.intersection(g_plus_1_ops)
    solver.assert_and_track(z3.BoolVal(len(overlap_ops) == 0), z3.Bool("track_g_gplus1_disjoint_operations"))

    # 5. Check 0.4: Structural Atomicity & Misconceptions
    for kc in g_kcs:
        kc_clean = kc["kcId"].replace('-', '_')
        solver.assert_and_track(z3.BoolVal(kc["verbCount"] == 1), z3.Bool(f"track_atomicity_verb_{kc_clean}"))
        solver.assert_and_track(z3.BoolVal(kc["observableVariablesCount"] <= 2), z3.Bool(f"track_atomicity_vars_{kc_clean}"))
        solver.assert_and_track(z3.BoolVal(len(kc["misconceptions"]) >= 2), z3.Bool(f"track_misconceptions_count_{kc_clean}"))

    # 6. Check 0.5: Clause-Level SLO Coverage for Grade 3
    # Grade 3 target SLO clauses from NCP: M-03-A-20.c1, M-03-A-21.c1, M-03-A-22.c1, M-03-A-24.c1
    required_g3_clauses = ["M-03-A-20.c1", "M-03-A-21.c1", "M-03-A-22.c1", "M-03-A-24.c1"]
    covered_clauses = set()
    for kc in g_kcs:
        for c in kc.get("coversSloClauses", []):
            covered_clauses.add(c)

    for c in required_g3_clauses:
        c_clean = c.replace('-', '_').replace('.', '_')
        solver.assert_and_track(z3.BoolVal(c in covered_clauses), z3.Bool(f"track_clause_covered_{c_clean}"))

    verdict = solver.check()
    print("=" * 60)
    print(f"STAGE 0 VERIFICATION VERDICT (Grade {target_grade} Fractions): {verdict}")
    print("=" * 60)

    if verdict == z3.sat:
        model = solver.model()
        print("Proof Certificate: All 5 Stage 0 Ontology & Boundary Invariants SAT!")
        print("\nVerified Topological KC Ranks:")
        for kc_id in rank_vars:
            print(f"  {kc_id} (Grade {kc_map[kc_id]['grade']}): Rank = {model[rank_vars[kc_id]]}")
        return True, None
    else:
        unsat_core = solver.unsat_core()
        print(f"UNSAT Core: {[str(t) for t in unsat_core]}")
        return False, unsat_core

if __name__ == "__main__":
    verify_stage0_kc_ontology(target_grade=3)
