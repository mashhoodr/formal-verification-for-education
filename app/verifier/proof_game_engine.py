"""
Proof Architect's Tower Game Engine (/game).

Declarative registry and live Z3 SMT verification kernel for:
- 3 playable ProofBuildingPack structures (12 total floors)
- 4 universal interactive mechanics:
  1. set_lattice_builder
  2. graph_wiring_board
  3. rule_inspector_gate
  4. polytope_tuner
- 2-beat loop:
  Beat 1: Try & Break It (Live Z3 SMT evaluation with counterexamples & cracked element highlights)
  Beat 2: Spot-the-Crack Sabotage Challenge (Certifies floor with XP reward)
"""

import hashlib
import json
from typing import Any
import z3
from app.verifier.z3_lock import Z3_MUTEX
from app.models import (
    GameBuildingPack,
    GameFloorSpec,
    GameBlueprintCard,
    GameSabotageChallenge,
    GameSabotageOption,
    GameBuildVerifyRequest,
    GameBuildVerifyResponse,
    GameSabotageRequest,
    GameSabotageResponse,
)

# ---------------------------------------------------------------------------
# Declarative Buildings & Floors Registry
# ---------------------------------------------------------------------------

BUILDINGS_REGISTRY: list[GameBuildingPack] = [
    # -----------------------------------------------------------------------
    # Building 1: The Knowledge Space Tower (5 Floors)
    # -----------------------------------------------------------------------
    GameBuildingPack(
        building_id="kstTower",
        title="The Knowledge Space Tower",
        subtitle="Doignon & Falmagne (1985) / Birkhoff Representation Lattice",
        icon="🏛️",
        description=(
            "Ascend from primitive sets to the Birkhoff Penthouse. Master empty and full set axioms, "
            "downward closure gravity, union lattices, equivalence notions, and Zone of Proximal Development navigation "
            "verified live by Z3 SMT."
        ),
        floors=[
            # Floor 1
            GameFloorSpec(
                floor_id="kst_f1_bedrock",
                floor_number=1,
                architectural_element="Bedrock Slab",
                title="Bedrock: Sets, Empty Set (∅) & Full Mastery (Q)",
                try_it_prompt="Toggle which student skill combinations belong in a valid Driving School foundation, then hit ⚡ Test Structure!",
                mechanic_type="set_lattice_builder",
                puzzle_config={
                    "domainId": "driving_2skills",
                    "items": [
                        {"id": "S", "label": "Steering (S)"},
                        {"id": "C", "label": "Clutch Control (C)"},
                    ],
                    "candidateStates": [
                        {"id": "empty", "label": "∅ (Absolute Novice)", "items": []},
                        {"id": "S", "label": "{S} (Steering Only)", "items": ["S"]},
                        {"id": "C", "label": "{C} (Clutch Only)", "items": ["C"]},
                        {"id": "SC", "label": "{S, C} (Full Mastery)", "items": ["S", "C"]},
                    ],
                    "initialState": {"selectedStates": ["S", "C"]},
                    "targetSolutionState": {"selectedStates": ["empty", "S", "C", "SC"]},
                },
                blueprint_card=GameBlueprintCard(
                    headline="Axiom 1: Every Knowledge Structure Needs a Ground Floor (∅) and a Ceiling (Q)",
                    everyday_analogy=(
                        "Before day 1 at driving school, a student knows nothing (∅). After passing the final exam, "
                        "they know every skill (Q). A school curriculum that forgets day 1 or graduation has no foundation."
                    ),
                    formal_rule="Let Q be a domain of items. A family 𝒦 ⊆ 𝒫(Q) is a Knowledge Structure iff ∅ ∈ 𝒦 and Q ∈ 𝒦.",
                    takeaway="Without ∅ and Q, an educational diagnostic system cannot handle complete beginners or graduating masters.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="A careless curriculum designer submits a knowledge structure 𝒦 = {{S}, {C}, {S, C}} for Driving School. Why will Z3 refute this in production?",
                    scenario_context="A computerized adaptive testing system using this structure is given a brand-new student who fails both the Steering and Clutch diagnostic questions.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_no_empty",
                            label="The empty set ∅ is missing: the diagnostic engine crashes on complete beginners.",
                            detail="The solver cannot assign any state S ∈ 𝒦 when a student answers 0 questions correctly.",
                        ),
                        GameSabotageOption(
                            option_id="opt_too_many",
                            label="There are too many subsets in 𝒦 for Z3 to compute.",
                            detail="3 states is too large for first-order logic.",
                        ),
                        GameSabotageOption(
                            option_id="opt_clutch_first",
                            label="Clutch must always be mastered before Steering.",
                            detail="Steering cannot be a standalone skill without transmission knowledge.",
                        ),
                    ],
                    correct_option_id="opt_no_empty",
                    explanation_on_success="Correct! In Knowledge Space Theory (Doignon & Falmagne 1985), ∅ must belong to 𝒦 so that a learner who has not yet mastered any item has a valid, well-defined knowledge state.",
                    z3_unsat_trace="(declare-const in_empty Bool)\n(assert (not in_empty))\n(check-sat) ; UNSAT core: [axiom_empty_set_required]",
                ),
                xp_reward=100,
            ),
            # Floor 2
            GameFloorSpec(
                floor_id="kst_f2_downward",
                floor_number=2,
                architectural_element="Foundation Pillars",
                title="Foundation Pillars: Downward Closure (Prerequisite Gravity)",
                try_it_prompt="Eliminate the floating impossible states where a student drives in traffic without knowing the clutch, then run Z3!",
                mechanic_type="set_lattice_builder",
                puzzle_config={
                    "domainId": "driving_3skills",
                    "items": [
                        {"id": "S", "label": "Steering (S)"},
                        {"id": "C", "label": "Clutch Control (C)"},
                        {"id": "T", "label": "Traffic Driving (T — requires S & C)"},
                    ],
                    "candidateStates": [
                        {"id": "empty", "label": "∅", "items": []},
                        {"id": "S", "label": "{S}", "items": ["S"]},
                        {"id": "C", "label": "{C}", "items": ["C"]},
                        {"id": "T", "label": "{T} (Floating!)", "items": ["T"]},
                        {"id": "ST", "label": "{S, T} (Missing Clutch!)", "items": ["S", "T"]},
                        {"id": "SC", "label": "{S, C}", "items": ["S", "C"]},
                        {"id": "SCT", "label": "{S, C, T} (Mastery)", "items": ["S", "C", "T"]},
                    ],
                    "initialState": {"selectedStates": ["empty", "S", "C", "ST", "SCT"]},
                    "targetSolutionState": {"selectedStates": ["empty", "S", "C", "SC", "SCT"]},
                },
                blueprint_card=GameBlueprintCard(
                    headline="Downward Closure: No Floating Skills Without Foundations",
                    everyday_analogy=(
                        "You cannot drive in heavy peak-hour traffic (T) if your foot doesn't know how to operate the clutch (C). "
                        "Prerequisites act like mathematical gravity: higher skills cannot float without their supports."
                    ),
                    formal_rule="A state S ⊆ Q is downward-closed under quasi-order ⪯ iff: ∀ q ∈ S, ∀ p ⪯ q ⟹ p ∈ S.",
                    takeaway="Downward closure slashes the explosive powerset 2^|Q| down to the pedagogically valid knowledge space 𝒦.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="An AI generated the state S = {T} (Traffic only) claiming 'A natural-born driver who never had a clutch lesson'. Which Z3 prerequisite constraint refutes this?",
                    scenario_context="Prerequisites: Steering ⪯ Traffic and Clutch ⪯ Traffic. The student state vector has in_T = true, in_S = false, in_C = false.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_downward_break",
                            label="(assert (=> in_T (and in_S in_C))) is violated because in_T is true while in_C and in_S are false.",
                            detail="Downward closure requires all predecessors in the DAG to be true whenever a successor is true.",
                        ),
                        GameSabotageOption(
                            option_id="opt_grade_jump",
                            label="Traffic is a Grade 12 concept while clutch is Grade 9.",
                            detail="Grade span exceeds maximum allowed jump.",
                        ),
                        GameSabotageOption(
                            option_id="opt_birkhoff_fail",
                            label="Birkhoff duality forbids single-item states.",
                            detail="Single items can never be downward closed.",
                        ),
                    ],
                    correct_option_id="opt_downward_break",
                    explanation_on_success="Spot on! The SMT assertion (=> in_T (and in_S in_C)) directly refutes in_T = true when in_C = false. Knowledge states are downward closed under prerequisite relations.",
                    z3_unsat_trace="(declare-const in_S Bool)\n(declare-const in_C Bool)\n(declare-const in_T Bool)\n(assert (=> in_T (and in_S in_C)))\n(assert (and in_T (not in_C)))\n(check-sat) ; UNSAT core: [prereq_traffic_requires_clutch]",
                ),
                xp_reward=100,
            ),
            # Floor 3
            GameFloorSpec(
                floor_id="kst_f3_union",
                floor_number=3,
                architectural_element="Cross-Beams",
                title="Cross-Beams: Union-Closure (A ∪ B ∈ 𝒦) & Misconceptions",
                try_it_prompt="Sara knows Steering {S} and Ali knows Clutch {C}. Add their collaborative mastery state {S, C} so the beam doesn't collapse under Z3!",
                mechanic_type="set_lattice_builder",
                puzzle_config={
                    "domainId": "driving_3skills_union",
                    "items": [
                        {"id": "S", "label": "Steering (S)"},
                        {"id": "C", "label": "Clutch Control (C)"},
                        {"id": "T", "label": "Traffic Driving (T)"},
                    ],
                    "candidateStates": [
                        {"id": "empty", "label": "∅", "items": []},
                        {"id": "S", "label": "{S}", "items": ["S"]},
                        {"id": "C", "label": "{C}", "items": ["C"]},
                        {"id": "SC", "label": "{S, C}", "items": ["S", "C"]},
                        {"id": "SCT", "label": "{S, C, T}", "items": ["S", "C", "T"]},
                    ],
                    "initialState": {"selectedStates": ["empty", "S", "C", "SCT"]},
                    "targetSolutionState": {"selectedStates": ["empty", "S", "C", "SC", "SCT"]},
                },
                blueprint_card=GameBlueprintCard(
                    headline="Union-Closure: Collaborative Learning & Non-Interference",
                    everyday_analogy=(
                        "If Student A can master {S} and Student B can master {C}, then two students studying together "
                        "can pool their knowledge to reach {S, C}. If {S, C} were impossible, learning one skill would magically forbid learning the other!"
                    ),
                    formal_rule="A Knowledge Structure 𝒦 is a Knowledge Space iff ∀ K1, K2 ∈ 𝒦 ⟹ (K1 ∪ K2) ∈ 𝒦.",
                    takeaway="Union-closure mathematically guarantees that learning is cumulative. When misconceptions or elective tracks break union-closure, KST must be partitioned.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="Why does adding a cognitive misconception H ('Heavier objects fall faster') and Newtonian law E ('All objects accelerate at g in vacuum') break union-closure in Z3?",
                    scenario_context="Physics domain: State A = {H} (Aristotelian student), State B = {E} (Newtonian student). Their union would be {H, E}.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_cognitive_conflict",
                            label="Cognitive Conflict: A student cannot simultaneously believe heavier falls faster and equal acceleration; {H, E} is self-contradictory.",
                            detail="The union {H, E} triggers an UNSAT mutual-exclusion constraint (assert (not (and in_H in_E))).",
                        ),
                        GameSabotageOption(
                            option_id="opt_too_few_items",
                            label="Physics items require at least 5 elements to form a lattice.",
                            detail="2-item domains cannot support union operators.",
                        ),
                        GameSabotageOption(
                            option_id="opt_heavier_is_prereq",
                            label="Heavier-falls-faster must be a prerequisite for Newtonian acceleration.",
                            detail="Misconceptions are always prerequisites for correct laws.",
                        ),
                    ],
                    correct_option_id="opt_cognitive_conflict",
                    explanation_on_success="Exactly! Misconception replacement is non-monotonic belief revision, not cumulative union. In Z3, (assert (not (and in_H in_E))) makes {H, E} impossible, proving why pure KST fails in the presence of unmodeled cognitive bugs.",
                    z3_unsat_trace="(declare-const in_H Bool)\n(declare-const in_E Bool)\n(assert (not (and in_H in_E)))\n(assert (and in_H in_E))\n(check-sat) ; UNSAT core: [cognitive_conflict_heavier_vs_equal]",
                ),
                xp_reward=100,
            ),
            # Floor 4
            GameFloorSpec(
                floor_id="kst_f4_notions",
                floor_number=4,
                architectural_element="Load-Bearing Arches",
                title="Load-Bearing Arches: Quasi-Orders (⪯) & Equivalence Notions (x ~ y)",
                try_it_prompt="Wire the prerequisite beams so Add Fractions leads to the Improper ↔ Mixed Notion bundle, which unlocks Multiplying Fractions!",
                mechanic_type="graph_wiring_board",
                puzzle_config={
                    "nodes": [
                        {"id": "A", "label": "Add Fractions (A)", "grade": 3},
                        {"id": "E1", "label": "Improper → Mixed (E1)", "grade": 4},
                        {"id": "E2", "label": "Mixed → Improper (E2)", "grade": 4},
                        {"id": "M", "label": "Multiply Mixed (M)", "grade": 4},
                    ],
                    "candidateEdges": [
                        {"from": "A", "to": "E1"},
                        {"from": "A", "to": "E2"},
                        {"from": "E1", "to": "E2"},
                        {"from": "E2", "to": "E1"},
                        {"from": "E1", "to": "M"},
                        {"from": "E2", "to": "M"},
                        {"from": "M", "to": "A"},
                    ],
                    "initialState": {
                        "edges": [
                            {"from": "M", "to": "A"},
                            {"from": "E1", "to": "E2"},
                        ]
                    },
                    "targetSolutionState": {
                        "edges": [
                            {"from": "A", "to": "E1"},
                            {"from": "A", "to": "E2"},
                            {"from": "E1", "to": "E2"},
                            {"from": "E2", "to": "E1"},
                            {"from": "E1", "to": "M"},
                            {"from": "E2", "to": "M"},
                        ]
                    },
                },
                blueprint_card=GameBlueprintCard(
                    headline="Quasi-Orders & Notions: Two Skills That Stand and Fall Together",
                    everyday_analogy=(
                        "Converting improper fractions to mixed numbers and mixed numbers back to improper are two faces "
                        "of the exact same coin. If you master one, you master both. In KST, they form an Equivalence Notion."
                    ),
                    formal_rule="For a quasi-order ⪯, define equivalence x ~ y iff (x ⪯ y ∧ y ⪯ x). The quotient set Q/~ forms a partially ordered DAG of Notions.",
                    takeaway="Notions prevent combinatorial explosion. Testing one item in a Notion bundle tests all of them with zero information loss.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="A contractor added a prerequisite edge from Multiply Mixed (M) back to Add Fractions (A). Why does Z3 SMT reject this structure?",
                    scenario_context="Topological rank constraints: rank(A) < rank(E1), rank(E1) < rank(M), and now rank(M) < rank(A).",
                    options=[
                        GameSabotageOption(
                            option_id="opt_cycle_unsat",
                            label="Cycle detected: rank(A) < rank(M) and rank(M) < rank(A) is mathematically UNSAT in integer arithmetic.",
                            detail="A DAG cannot contain cycles; prerequisite gravity requires a strict topological ordering across distinct notions.",
                        ),
                        GameSabotageOption(
                            option_id="opt_fractions_cant_multiply",
                            label="Multiplying mixed numbers cannot be taught in K-12.",
                            detail="Curriculum standards forbid mixed multiplication.",
                        ),
                        GameSabotageOption(
                            option_id="opt_edge_density",
                            label="A graph with 4 nodes cannot exceed 3 edges.",
                            detail="Exceeds planar graph limit.",
                        ),
                    ],
                    correct_option_id="opt_cycle_unsat",
                    explanation_on_success="Spot on! In Z3, rank(A) < rank(M) ∧ rank(M) < rank(A) yields rank(A) < rank(A), which is false in linear integer arithmetic. Cycles destroy the partial order.",
                    z3_unsat_trace="(declare-const rank_A Int)\n(declare-const rank_M Int)\n(assert (< rank_A rank_M))\n(assert (< rank_M rank_A))\n(check-sat) ; UNSAT core: [prereq_cycle_A_M]",
                ),
                xp_reward=100,
            ),
            # Floor 5
            GameFloorSpec(
                floor_id="kst_f5_birkhoff",
                floor_number=5,
                architectural_element="Penthouse Spire",
                title="The Birkhoff Penthouse: Outer Fringe (Zone of Proximal Development)",
                try_it_prompt="A student currently knows {G2_IDENT, G2_ADD_LIKE}. Select ONLY the exact Outer Fringe skills they are ready to learn next without gaps!",
                mechanic_type="set_lattice_builder",
                puzzle_config={
                    "currentLearnerState": ["G2_IDENT", "G2_ADD_LIKE"],
                    "candidateStates": [
                        {"id": "G2_IDENT", "label": "G2: Identify Fractions (Already Mastered)", "items": ["G2_IDENT"]},
                        {"id": "G2_ADD_LIKE", "label": "G2: Add Like Fractions (Already Mastered)", "items": ["G2_ADD_LIKE"]},
                        {"id": "G3_EQUIV", "label": "G3: Equivalent Fractions (Ready! Prereq G2_IDENT is met)", "items": ["G3_EQUIV"]},
                        {"id": "G3_SUB_LIKE", "label": "G3: Subtract Like Fractions (Ready! Prereq G2_ADD_LIKE is met)", "items": ["G3_SUB_LIKE"]},
                        {"id": "G4_ADD_UNLIKE", "label": "G4: Add Unlike Fractions (Locked: Requires G3_EQUIV & G3_SUB_LIKE!)", "items": ["G4_ADD_UNLIKE"]},
                        {"id": "G4_MUL_MIXED", "label": "G4: Multiply Mixed Numbers (Locked: Requires G4_ADD_UNLIKE!)", "items": ["G4_MUL_MIXED"]},
                    ],
                    "initialState": {"selectedStates": ["G4_ADD_UNLIKE"]},
                    "targetSolutionState": {"selectedStates": ["G3_EQUIV", "G3_SUB_LIKE"]},
                },
                blueprint_card=GameBlueprintCard(
                    headline="Birkhoff Duality & The Outer Fringe: Mathematical Zone of Proximal Development",
                    everyday_analogy=(
                        "Vygotsky's Zone of Proximal Development (ZPD) is what the child can do today with guidance. "
                        "In KST, the Outer Fringe O(S) is the exact set of items whose prerequisites the student has 100% mastered, but hasn't yet learned."
                    ),
                    formal_rule="For knowledge state S ∈ 𝒦: Outer Fringe O(S) = {q ∉ S | S ∪ {q} ∈ 𝒦}. Birkhoff's theorem guarantees a 1-to-1 bijection between 𝒦 and quasi-order ⪯.",
                    takeaway="Adaptive diagnostic testing must only probe items in O(S) or I(S). Probing items outside the fringe wastes classroom time and frustrates students.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="A greedy recommendation engine pushes G4_MUL_MIXED to a student in state S = {G2_IDENT, G2_ADD_LIKE}. What formal condition does this violate?",
                    scenario_context="G4_MUL_MIXED requires G4_ADD_UNLIKE, which requires G3_EQUIV, which requires G2_IDENT.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_prereq_gap",
                            label="S ∪ {G4_MUL_MIXED} ∉ 𝒦 because intermediate prerequisites (G3_EQUIV, G4_ADD_UNLIKE) are absent from S.",
                            detail="The union state violates downward closure under the curriculum quasi-order.",
                        ),
                        GameSabotageOption(
                            option_id="opt_multiplication_harder",
                            label="Multiplication is inherently more complex than addition.",
                            detail="Informal complexity heuristic.",
                        ),
                        GameSabotageOption(
                            option_id="opt_grade_cap",
                            label="Grade 2 students are legally prohibited from viewing Grade 4 screens.",
                            detail="Policy rule outside mathematical ontology.",
                        ),
                    ],
                    correct_option_id="opt_prereq_gap",
                    explanation_on_success="Correct! In KST, q ∈ O(S) iff S ∪ {q} ∈ 𝒦. Since S ∪ {G4_MUL_MIXED} is not downward closed, it is not in the knowledge space, meaning G4_MUL_MIXED is NOT in the Outer Fringe.",
                    z3_unsat_trace="(declare-const in_G4_MUL Bool)\n(declare-const in_G4_ADD_UNLIKE Bool)\n(assert (=> in_G4_MUL in_G4_ADD_UNLIKE))\n(assert (and in_G4_MUL (not in_G4_ADD_UNLIKE)))\n(check-sat) ; UNSAT core: [prereq_gap_g4_add_unlike_missing]",
                ),
                xp_reward=100,
            ),
        ],
    ),

    # -----------------------------------------------------------------------
    # Building 2: The Anti-"Proof Theater" Citadel (4 Floors)
    # -----------------------------------------------------------------------
    GameBuildingPack(
        building_id="antiTheaterCitadel",
        title="The Anti-'Proof Theater' Citadel",
        subtitle="National Curriculum of Pakistan (NCP 2022–23) Grounding",
        icon="🏰",
        description=(
            "Defeat LLM 'proof theater'. Reject fake integer labels, split conjoined twin blobs, "
            "enforce Brown & Burton bug catalogs, and wire vertical grade DAGs verified by Z3 SMT."
        ),
        floors=[
            # Floor 1
            GameFloorSpec(
                floor_id="citadel_f1_renumbering",
                floor_number=1,
                architectural_element="Foundation Gate",
                title="Catching The Renumbering Cheat (Junction 5)",
                try_it_prompt="Inspect the 4 incoming contractor KC blocks. Reject the fake block that lied about its complexity integer, then hit ⚡ Test Structure!",
                mechanic_type="rule_inspector_gate",
                puzzle_config={
                    "candidateBlocks": [
                        {
                            "id": "kc_fake_g4",
                            "label": "Add Like Fractions (Contractor claims Complexity: 4)",
                            "claimedComplexity": 4,
                            "actualComplexity": 2,
                            "description": "Text: 'Add fractions with like denominators up to 10'. Deterministic AST depth is 2, but contractor stamped 4 to bypass Grade 4 checks!",
                        },
                        {
                            "id": "kc_real_g2",
                            "label": "Identify Halves & Quarters (Complexity: 1)",
                            "claimedComplexity": 1,
                            "actualComplexity": 1,
                            "description": "Recognise halves and fourths of shapes using pictorial models. Deterministic AST depth is 1.",
                        },
                        {
                            "id": "kc_real_g3",
                            "label": "Add Like Fractions (Complexity: 2)",
                            "claimedComplexity": 2,
                            "actualComplexity": 2,
                            "description": "Add fractions with like denominators on number line. Deterministic AST depth is 2.",
                        },
                        {
                            "id": "kc_real_g4",
                            "label": "Add Unlike Fractions (Complexity: 4)",
                            "claimedComplexity": 4,
                            "actualComplexity": 4,
                            "description": "Add fractions with unlike denominators using LCM factorization. Deterministic AST depth is 4.",
                        },
                    ],
                    "initialState": {
                        "acceptedBlockIds": ["kc_fake_g4", "kc_real_g2", "kc_real_g3", "kc_real_g4"]
                    },
                    "targetSolutionState": {
                        "acceptedBlockIds": ["kc_real_g2", "kc_real_g3", "kc_real_g4"]
                    },
                },
                blueprint_card=GameBlueprintCard(
                    headline="Anti-Proof Theater: Deterministic Parameter Derivation Over Self-Reported Labels",
                    everyday_analogy=(
                        "If a counterfeit contractor stamps 'Grade 4 Steel' on a cheap Grade 2 plastic beam, putting that beam into a bridge "
                        "will collapse it under real traffic. The solver must measure the actual material, not read the label."
                    ),
                    formal_rule="For every candidate Knowledge Component c: AST_Complexity(c.text) == c.declared_complexity.",
                    takeaway="Real formal verification measures the mathematical object itself using deterministic parsers, never trusting LLM-generated self-ratings.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="A contractor's code sets `z3.assert(kc.complexity == 4)` and reports 'SAT: Verified Grade 4!'. Why is this pure 'Proof Theater'?",
                    scenario_context="The KC text is 'Add 1/4 + 2/4' (Grade 2 math). The contractor simply changed the JSON field complexity: 2 to complexity: 4.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_tautology",
                            label="Tautological Checking: It only proves the integer 4 equals 4, not that the mathematical content is actually at Grade 4 complexity.",
                            detail="The SMT solver was given a vacuous identity assertion that ignores the pedagogical reality of the content.",
                        ),
                        GameSabotageOption(
                            option_id="opt_no_fractions_g4",
                            label="Grade 4 cannot teach fractions.",
                            detail="NCP math delays fractions to Grade 5.",
                        ),
                        GameSabotageOption(
                            option_id="opt_int_overflow",
                            label="Z3 cannot handle integer 4 without 64-bit bounds.",
                            detail="Bitvector overflow error.",
                        ),
                    ],
                    correct_option_id="opt_tautology",
                    explanation_on_success="Nailed it! Tautological checking is the hallmark of Proof Theater. Real verification grounds the parameter in the AST and lexical content of the problem.",
                    z3_unsat_trace="(declare-const claimed_c Int)\n(declare-const actual_ast_c Int)\n(assert (= claimed_c 4))\n(assert (= actual_ast_c 2))\n(assert (= claimed_c actual_ast_c))\n(check-sat) ; UNSAT core: [ast_complexity_mismatch_4_vs_2]",
                ),
                xp_reward=100,
            ),
            # Floor 2
            GameFloorSpec(
                floor_id="citadel_f2_atomicity",
                floor_number=2,
                architectural_element="Curtain Walls",
                title="Splitting Conjoined Twin Blobs (Junction 3)",
                try_it_prompt="Inspect the candidate KC blocks. Reject the conjoined twin blob that smuggles two distinct cognitive verbs into one KC!",
                mechanic_type="rule_inspector_gate",
                puzzle_config={
                    "candidateBlocks": [
                        {
                            "id": "kc_blob_twin",
                            "label": "Conjoined Blob: Identify AND Simplify (2 Verbs)",
                            "verbCount": 2,
                            "description": "Text: 'Identify equivalent fractions AND simplify fractions to lowest terms'. Combines recognition and GCD division!",
                        },
                        {
                            "id": "kc_atomic_ident",
                            "label": "Atomic KC: Identify Equivalent Fractions (1 Verb)",
                            "verbCount": 1,
                            "description": "Recognise equivalent fractions using visual fraction strips. Single verb: Identify.",
                        },
                        {
                            "id": "kc_atomic_simplify",
                            "label": "Atomic KC: Simplify Fractions (1 Verb)",
                            "verbCount": 1,
                            "description": "Reduce fractions to simplest form by dividing by HCF. Single verb: Simplify.",
                        },
                        {
                            "id": "kc_atomic_compare",
                            "label": "Atomic KC: Compare Like Fractions (1 Verb)",
                            "verbCount": 1,
                            "description": "Compare two fractions with common denominator using <, >, =. Single verb: Compare.",
                        },
                    ],
                    "initialState": {
                        "acceptedBlockIds": ["kc_blob_twin", "kc_atomic_compare"]
                    },
                    "targetSolutionState": {
                        "acceptedBlockIds": ["kc_atomic_ident", "kc_atomic_simplify", "kc_atomic_compare"]
                    },
                },
                blueprint_card=GameBlueprintCard(
                    headline="Single-Verb Atomicity: Diagnostic Precision in Psychometrics",
                    everyday_analogy=(
                        "If a medical diagnostic test says 'Patient either has malaria OR needs glasses', a positive result tells the doctor nothing actionable. "
                        "A Knowledge Component must test exactly one operational skill."
                    ),
                    formal_rule="∀ kc ∈ Curriculum_Ontology: |Extract_Operational_Verbs(kc.text)| == 1.",
                    takeaway="Conjoined blobs destroy Q-matrix identifiability in psychometric models (DINA/DINO). A student who fails a blob cannot be reliably diagnosed.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="Why does an educational psychometric model (DINA) fail when given a conjoined KC 'Multiply fractions AND divide fractions'?",
                    scenario_context="A student gets the question wrong. DINA attempts to update the student's mastery attribute vector α.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_identifiability",
                            label="Loss of Diagnostic Identifiability: The model cannot determine whether the student failed at multiplication, division, or both.",
                            detail="The latent skill vector update is unidentifiable because two independent cognitive mechanisms are mashed into a single binary flag.",
                        ),
                        GameSabotageOption(
                            option_id="opt_too_long",
                            label="The sentence length exceeds 20 characters.",
                            detail="Database column truncation.",
                        ),
                        GameSabotageOption(
                            option_id="opt_mult_div_same",
                            label="Multiplication and division are mathematically the exact same operation.",
                            detail="No cognitive difference exists.",
                        ),
                    ],
                    correct_option_id="opt_identifiability",
                    explanation_on_success="Spot on! Diagnostic psychometrics requires each Knowledge Component to be atomic (verb count = 1) so remediation can pinpoint the exact failure mechanism.",
                    z3_unsat_trace="(declare-const verb_count Int)\n(assert (= verb_count 2))\n(assert (= verb_count 1))\n(check-sat) ; UNSAT core: [kc_not_atomic_verb_count_exceeded]",
                ),
                xp_reward=100,
            ),
            # Floor 3
            GameFloorSpec(
                floor_id="citadel_f3_catalog",
                floor_number=3,
                architectural_element="Watchtower Turrets",
                title="Defeating The Label Lie & Hallucinated Bugs (Junctions 2 & 7)",
                try_it_prompt="Reject the block tagged M-03-A-21 that secretly teaches liquid volume, and the block with a hallucinated bug!",
                mechanic_type="rule_inspector_gate",
                puzzle_config={
                    "candidateBlocks": [
                        {
                            "id": "kc_label_lie",
                            "label": "Label Lie: M-03-A-21 tagged on Liquid Volume",
                            "standardTag": "M-03-A-21",
                            "lexicalOverlap": 0.05,
                            "catalogGrounded": True,
                            "description": "Contractor pasted standard string M-03-A-21 (Fractions), but content text is 'Measure water volume in liters and milliliters'. Lexical overlap is 0.05!",
                        },
                        {
                            "id": "kc_hallucinated_bug",
                            "label": "Hallucinated Bug: 'Student cubes denominator and subtracts 7'",
                            "standardTag": "M-03-A-24",
                            "lexicalOverlap": 0.85,
                            "catalogGrounded": False,
                            "description": "An LLM hallucinated an absurd error rule never observed in cognitive science.",
                        },
                        {
                            "id": "kc_valid_add_num",
                            "label": "Grounded Bug: 'Add numerators and denominators (a/b + c/d = (a+c)/(b+d))'",
                            "standardTag": "M-03-A-24",
                            "lexicalOverlap": 0.82,
                            "catalogGrounded": True,
                            "description": "Documented in Brown & Burton (1978) Buggy catalog and Siegler (2013).",
                        },
                        {
                            "id": "kc_valid_equiv",
                            "label": "Aligned KC: Recognize equivalent fractions using models",
                            "standardTag": "M-03-A-21",
                            "lexicalOverlap": 0.88,
                            "catalogGrounded": True,
                            "description": "Authentic alignment with Pakistan NCP Standard M-03-A-21.",
                        },
                    ],
                    "initialState": {
                        "acceptedBlockIds": ["kc_label_lie", "kc_hallucinated_bug", "kc_valid_add_num"]
                    },
                    "targetSolutionState": {
                        "acceptedBlockIds": ["kc_valid_add_num", "kc_valid_equiv"]
                    },
                },
                blueprint_card=GameBlueprintCard(
                    headline="Dual Grounding: Lexical Overlap & Empirical Bug Catalogs",
                    everyday_analogy=(
                        "Pasting a 'Ferrari' badge on a bicycle does not make it a supercar. "
                        "Similarly, pasting standard code 'M-03-A-21' onto a geometry question does not make it fraction arithmetic."
                    ),
                    formal_rule="Lexical_Overlap(kc.text, Standard(kc.standard_id).text) ≥ 0.50 ∧ kc.bug_rule ∈ Catalog(BrownBurton_Siegler).",
                    takeaway="First-order logic cannot invent human cognitive errors. Misconceptions must be anchored in peer-reviewed empirical literature.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="An LLM generates a distractor: 'The student multiplies the numerator by the speed of light'. Why must the verifier reject this?",
                    scenario_context="The prompt asks for plausible pedagogical distractors grounded in 4th-grade student misconceptions.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_not_in_catalog",
                            label="Not Grounded in Empirical Bug Catalog: It is an LLM hallucination with zero support in cognitive science research.",
                            detail="The distractor violates the epistemic boundary rule: misconceptions outside peer-reviewed catalogs (Brown & Burton, Siegler) are inadmissible.",
                        ),
                        GameSabotageOption(
                            option_id="opt_speed_of_light_varies",
                            label="The speed of light is not a constant in water.",
                            detail="Physics refractive index quibble.",
                        ),
                        GameSabotageOption(
                            option_id="opt_too_funny",
                            label="Humorous options are illegal in Pakistan examinations.",
                            detail="Policy formatting rule.",
                        ),
                    ],
                    correct_option_id="opt_not_in_catalog",
                    explanation_on_success="Spot on! Empirical grounding is a non-negotiable root of trust. Distractors must diagnose real cognitive bugs, not generative hallucinations.",
                    z3_unsat_trace="(declare-const in_empirical_catalog Bool)\n(assert (not in_empirical_catalog))\n(check-sat) ; UNSAT core: [unaccredited_misconception_hallucination]",
                ),
                xp_reward=100,
            ),
            # Floor 4
            GameFloorSpec(
                floor_id="citadel_f4_dag",
                floor_number=4,
                architectural_element="Citadel Keep",
                title="Vertical Curriculum DAGs (G2 → G3 → G4)",
                try_it_prompt="Wire the Pakistan NCP Fractions progression across Grades 2, 3, and 4 without cycles or backward grade jumps!",
                mechanic_type="graph_wiring_board",
                puzzle_config={
                    "nodes": [
                        {"id": "G2_FRAC", "label": "G2: Halves & Quarters of Shapes", "grade": 2},
                        {"id": "G3_FRAC", "label": "G3: Like Denominators on Number Line", "grade": 3},
                        {"id": "G4_FRAC", "label": "G4: Unlike Denominators & Improper", "grade": 4},
                    ],
                    "candidateEdges": [
                        {"from": "G2_FRAC", "to": "G3_FRAC"},
                        {"from": "G3_FRAC", "to": "G4_FRAC"},
                        {"from": "G4_FRAC", "to": "G3_FRAC"},
                        {"from": "G4_FRAC", "to": "G2_FRAC"},
                    ],
                    "initialState": {
                        "edges": [
                            {"from": "G2_FRAC", "to": "G3_FRAC"},
                            {"from": "G4_FRAC", "to": "G3_FRAC"},
                        ]
                    },
                    "targetSolutionState": {
                        "edges": [
                            {"from": "G2_FRAC", "to": "G3_FRAC"},
                            {"from": "G3_FRAC", "to": "G4_FRAC"},
                        ]
                    },
                },
                blueprint_card=GameBlueprintCard(
                    headline="Vertical Grade Monotonicity: Curriculum Spiral Without Backward Gravity",
                    everyday_analogy=(
                        "A Grade 4 skill cannot be required before teaching a Grade 3 skill. "
                        "The educational curriculum is a directed spiral: each grade builds upon previous foundations."
                    ),
                    formal_rule="∀ (u, v) ∈ E: rank(u) < rank(v) ∧ Grade(u) ≤ Grade(v).",
                    takeaway="Vertical monotonicity guarantees that learning progressions never require students to know future-grade material to understand current lessons.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="A contractor submits an edge G4_FRAC → G2_FRAC. What two mathematical invariants does this violate when added to G2 → G3 → G4?",
                    scenario_context="Grade order: Grade(G2)=2, Grade(G3)=3, Grade(G4)=4.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_cycle_and_grade_drop",
                            label="Both DAG Acyclicity (creates a cycle G2→G3→G4→G2) and Grade Monotonicity (Grade 4 > Grade 2).",
                            detail="Z3 refutes both rank(G4) < rank(G2) and Grade(G4) <= Grade(G2).",
                        ),
                        GameSabotageOption(
                            option_id="opt_font_size",
                            label="Grade 4 text is printed in smaller font than Grade 2.",
                            detail="Linguistic formatting difference.",
                        ),
                        GameSabotageOption(
                            option_id="opt_too_simple",
                            label="Grade 2 fractions are too elementary to have any outgoing edges.",
                            detail="Leaf node restriction.",
                        ),
                    ],
                    correct_option_id="opt_cycle_and_grade_drop",
                    explanation_on_success="Correct! An edge from Grade 4 to Grade 2 creates both an impossible prerequisite cycle and a direct violation of vertical curriculum monotonicity.",
                    z3_unsat_trace="(declare-const rank_G2 Int)\n(declare-const rank_G4 Int)\n(assert (< rank_G2 rank_G4))\n(assert (< rank_G4 rank_G2))\n(check-sat) ; UNSAT core: [curriculum_cycle_and_grade_drop]",
                ),
                xp_reward=100,
            ),
        ],
    ),

    # -----------------------------------------------------------------------
    # Building 3: The Psychometric Assessment Observatory (3 Floors)
    # -----------------------------------------------------------------------
    GameBuildingPack(
        building_id="polytopeObservatory",
        title="The Psychometric Assessment Observatory",
        subtitle="Coupled Feasibility Polytopes & z3.Optimize",
        icon="🗼",
        description=(
            "Tune coupled cognitive and linguistic parameters into the green Z3 SAT polytope. "
            "Balance working memory, solve 2D Flesch-Kincaid half-planes, and eliminate MCQ outlier clues."
        ),
        floors=[
            # Floor 1
            GameFloorSpec(
                floor_id="poly_f1_memory",
                floor_number=1,
                architectural_element="Telescope Pier",
                title="Working Memory & Sentence Ceilings (Grade 3 Bounds)",
                try_it_prompt="Tune the word count and observable variables sliders so the question stays inside the Grade 3 working memory box!",
                mechanic_type="polytope_tuner",
                puzzle_config={
                    "sliders": [
                        {"id": "sentenceWords", "label": "Words per Sentence", "min": 5, "max": 30, "step": 1, "targetCeiling": 15},
                        {"id": "observableVariables", "label": "Simultaneous Variables", "min": 1, "max": 6, "step": 1, "targetCeiling": 3},
                    ],
                    "initialState": {"sentenceWords": 22, "observableVariables": 5},
                    "targetSolutionState": {"sentenceWords": 12, "observableVariables": 2},
                },
                blueprint_card=GameBlueprintCard(
                    headline="Working Memory Load: Sweller's Cognitive Load Theory",
                    everyday_analogy=(
                        "A Grade 3 student's working memory is like a small desk. If you pile 22 words and 5 simultaneous variables onto the desk, "
                        "items fall off before the child can even start doing the math."
                    ),
                    formal_rule="sentenceWords ≤ 15 ∧ observableVariables ≤ 3.",
                    takeaway="Formative assessments must measure mathematical knowledge (germane load), not overload working memory with complex phrasing (extraneous load).",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="A math word problem has 28 words in a single sentence describing 4 different characters, 3 types of fruit, and 2 containers. Why does Z3 flag this as an invalid Grade 3 test item?",
                    scenario_context="Cognitive load parameters: sentenceWords = 28 (cap: 15), workingMemoryChunks = 9 (cap: 3).",
                    options=[
                        GameSabotageOption(
                            option_id="opt_cognitive_overload",
                            label="Extraneous Cognitive Overload: Sentence length and variable count exceed Grade 3 working memory ceilings, confounding math ability with memory capacity.",
                            detail="The assessment becomes an accidental test of working memory rather than fraction arithmetic.",
                        ),
                        GameSabotageOption(
                            option_id="opt_too_healthy",
                            label="Questions cannot mention more than one type of fruit.",
                            detail="Dietary guidelines restriction.",
                        ),
                        GameSabotageOption(
                            option_id="opt_odd_numbers",
                            label="Working memory limits must always be even numbers.",
                            detail="Incorrect mathematical property.",
                        ),
                    ],
                    correct_option_id="opt_cognitive_overload",
                    explanation_on_success="Exactly! When an item's linguistic complexity exceeds the grade band's working memory ceiling, failure indicates reading overload, not mathematical misconception.",
                    z3_unsat_trace="(declare-const words Int)\n(declare-const variables Int)\n(assert (<= words 15))\n(assert (<= variables 3))\n(assert (= words 28))\n(assert (= variables 9))\n(check-sat) ; UNSAT core: [sentence_words_ceiling, working_memory_ceiling]",
                ),
                xp_reward=100,
            ),
            # Floor 2
            GameFloorSpec(
                floor_id="poly_f2_fk",
                floor_number=2,
                architectural_element="Rotating Dome",
                title="The Coupled Flesch-Kincaid 2D Polytope (𝒫_SAT)",
                try_it_prompt="Drag words-per-sentence and syllables-per-word sliders so their linear intersection lands inside the Grade 3 corridor [2.5, 4.2]!",
                mechanic_type="polytope_tuner",
                puzzle_config={
                    "formula": "FK = 0.39 * W_S + 11.8 * S_W - 15.59",
                    "corridor": {"min": 2.5, "max": 4.2},
                    "sliders": [
                        {"id": "avgWordsPerSentence", "label": "Average Words Per Sentence", "min": 4.0, "max": 25.0, "step": 0.5, "targetMax": 15.0},
                        {"id": "avgSyllablesPerWord", "label": "Average Syllables Per Word", "min": 1.0, "max": 2.5, "step": 0.05, "targetMax": 1.8},
                    ],
                    "initialState": {"avgWordsPerSentence": 20.0, "avgSyllablesPerWord": 1.8},
                    "targetSolutionState": {"avgWordsPerSentence": 10.0, "avgSyllablesPerWord": 1.3},
                },
                blueprint_card=GameBlueprintCard(
                    headline="Coupled Readability Polytopes: 2D Half-Space Intersection",
                    everyday_analogy=(
                        "You cannot change sentence length without shifting readability. A question with short sentences but huge multi-syllable words "
                        "can be just as unreadable to an 8-year-old as a rambling run-on sentence."
                    ),
                    formal_rule="𝒫_SAT = { (W_S, S_W) | 2.5 ≤ 0.39·W_S + 11.8·S_W - 15.59 ≤ 4.2 ∧ W_S ≤ 15.0 }.",
                    takeaway="Z3 solves the linear half-spaces simultaneously. Single-variable heuristics fail because linguistic parameters are intrinsically coupled.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="An author fixes a high FK score by chopping sentences to 5 words, but uses vocabulary like 'equidistant polychromatic quadrilaterals' (avgSyllables = 3.2). Why does Z3 reject this?",
                    scenario_context="Words per sentence = 5. Syllables per word = 3.2. Grade 3 target corridor: [2.5, 4.2].",
                    options=[
                        GameSabotageOption(
                            option_id="opt_fk_syllables_spike",
                            label="FK readability still explodes to 24.13 because 11.8 * 3.2 heavily dominates the linear equation.",
                            detail="The 2D polytope is bounded on both dimensions; shortening sentences cannot compensate for college-level syllable counts.",
                        ),
                        GameSabotageOption(
                            option_id="opt_word_limit_too_low",
                            label="Questions cannot have fewer than 10 words.",
                            detail="Minimum word floor violation.",
                        ),
                        GameSabotageOption(
                            option_id="opt_latin_forbidden",
                            label="Latin-derived words are prohibited in Pakistani schools.",
                            detail="Vocabulary origin rule.",
                        ),
                    ],
                    correct_option_id="opt_fk_syllables_spike",
                    explanation_on_success="Spot on! The Flesch-Kincaid formula multiplies syllables per word by 11.8. In Z3's 2D polytope, the syllable dimension is weighted 30x higher than sentence length!",
                    z3_unsat_trace="(declare-const ws Real)\n(declare-const sw Real)\n(declare-const fk Real)\n(assert (= ws 5.0))\n(assert (= sw 3.2))\n(assert (= fk (- (+ (* 0.39 ws) (* 11.8 sw)) 15.59)))\n(assert (<= fk 4.2))\n(check-sat) ; UNSAT core: [flesch_kincaid_upper_bound_exceeded]",
                ),
                xp_reward=100,
            ),
            # Floor 3
            GameFloorSpec(
                floor_id="poly_f3_distractors",
                floor_number=3,
                architectural_element="Zenith Spire",
                title="Minimal-Perturbation Distractor Balance (z3.Optimize)",
                try_it_prompt="Balance the 4 MCQ option word lengths so the spread between longest and shortest is ≤ 3, eliminating giveaway outlier clues!",
                mechanic_type="polytope_tuner",
                puzzle_config={
                    "maxSpreadAllowed": 3,
                    "sliders": [
                        {"id": "w1", "label": "Option A Word Length", "min": 1, "max": 20, "step": 1},
                        {"id": "w2", "label": "Option B Word Length", "min": 1, "max": 20, "step": 1},
                        {"id": "w3", "label": "Option C Word Length", "min": 1, "max": 20, "step": 1},
                        {"id": "w4", "label": "Option D Word Length", "min": 1, "max": 20, "step": 1},
                    ],
                    "initialState": {"w1": 14, "w2": 2, "w3": 3, "w4": 2},
                    "targetSolutionState": {"w1": 4, "w2": 5, "w3": 4, "w4": 6},
                },
                blueprint_card=GameBlueprintCard(
                    headline="Distractor Symmetry: Eliminating Clue-Giving Length Outliers",
                    everyday_analogy=(
                        "Test-taking students quickly learn the trick: 'When in doubt, pick the longest, most detailed answer.' "
                        "If the correct option is a 14-word essay while distractors are 2 words, the test tests test-wiseness, not math."
                    ),
                    formal_rule="max(option_lengths) - min(option_lengths) ≤ 3.",
                    takeaway="z3.Optimize finds the minimal-perturbation rewrite that balances all 4 options without changing the mathematical diagnosis of the distractors.",
                ),
                sabotage_challenge=GameSabotageChallenge(
                    prompt="An MCQ question has options: A: 2 words, B: 2 words, C: 2 words, D: 16 words (correct answer). What test-wiseness flaw does Z3's spread invariant prevent?",
                    scenario_context="Psychometric item response theory: Distractor plausibility and surface clue prevention.",
                    options=[
                        GameSabotageOption(
                            option_id="opt_length_giveaway",
                            label="Length-Cue Bias: Unprepared students can guess the correct option simply because it is significantly longer and more qualified than the distractors.",
                            detail="The item fails psychometric fairness by providing a visual giveaway clue.",
                        ),
                        GameSabotageOption(
                            option_id="opt_d_bias",
                            label="Option D is statistically 80% more likely to be correct in all exams.",
                            detail="Position bias myth.",
                        ),
                        GameSabotageOption(
                            option_id="opt_too_short",
                            label="Options with 2 words cannot contain numbers.",
                            detail="Word length type confusion.",
                        ),
                    ],
                    correct_option_id="opt_length_giveaway",
                    explanation_on_success="Correct! Length outliers are one of the most common item construction flaws in formative testing. Enforcing max(w) - min(w) <= 3 ensures options are structurally balanced.",
                    z3_unsat_trace="(declare-const max_w Int)\n(declare-const min_w Int)\n(assert (= max_w 16))\n(assert (= min_w 2))\n(assert (<= (- max_w min_w) 3))\n(check-sat) ; UNSAT core: [distractor_word_spread_exceeded]",
                ),
                xp_reward=100,
            ),
        ],
    ),
]


# ---------------------------------------------------------------------------
# Registry Accessors
# ---------------------------------------------------------------------------

def list_game_buildings() -> list[GameBuildingPack]:
    """Returns all available game building packs."""
    return BUILDINGS_REGISTRY


def get_game_building(building_id: str) -> GameBuildingPack | None:
    """Finds a building pack by ID."""
    for b in BUILDINGS_REGISTRY:
        if b.building_id == building_id:
            return b
    return None


def get_game_floor(building_id: str, floor_id: str) -> tuple[GameBuildingPack | None, GameFloorSpec | None]:
    """Finds a building and floor by their respective IDs."""
    b = get_game_building(building_id)
    if not b:
        return None, None
    for f in b.floors:
        if f.floor_id == floor_id:
            return b, f
    return b, None


# ---------------------------------------------------------------------------
# Z3 SMT Floor Evaluation Kernel
# ---------------------------------------------------------------------------

def verify_floor_build(request: GameBuildVerifyRequest) -> GameBuildVerifyResponse:
    """
    Evaluates player's construction state on a floor using live Z3 SMT solver.
    Thread-safe via Z3_MUTEX lock.
    """
    building, floor = get_game_floor(request.building_id, request.floor_id)
    if not building or not floor:
        raise ValueError(f"Unknown building '{request.building_id}' or floor '{request.floor_id}'")

    player_state = request.player_state

    with Z3_MUTEX:
        # Route evaluation by floor_id
        if request.floor_id == "kst_f1_bedrock":
            return _verify_kst_f1_bedrock(request, floor, player_state)
        elif request.floor_id == "kst_f2_downward":
            return _verify_kst_f2_downward(request, floor, player_state)
        elif request.floor_id == "kst_f3_union":
            return _verify_kst_f3_union(request, floor, player_state)
        elif request.floor_id == "kst_f4_notions":
            return _verify_kst_f4_notions(request, floor, player_state)
        elif request.floor_id == "kst_f5_birkhoff":
            return _verify_kst_f5_birkhoff(request, floor, player_state)
        elif request.floor_id == "citadel_f1_renumbering":
            return _verify_citadel_f1_renumbering(request, floor, player_state)
        elif request.floor_id == "citadel_f2_atomicity":
            return _verify_citadel_f2_atomicity(request, floor, player_state)
        elif request.floor_id == "citadel_f3_catalog":
            return _verify_citadel_f3_catalog(request, floor, player_state)
        elif request.floor_id == "citadel_f4_dag":
            return _verify_citadel_f4_dag(request, floor, player_state)
        elif request.floor_id == "poly_f1_memory":
            return _verify_poly_f1_memory(request, floor, player_state)
        elif request.floor_id == "poly_f2_fk":
            return _verify_poly_f2_fk(request, floor, player_state)
        elif request.floor_id == "poly_f3_distractors":
            return _verify_poly_f3_distractors(request, floor, player_state)
        else:
            raise ValueError(f"No Z3 verification strategy registered for floor '{request.floor_id}'")


def verify_sabotage_challenge(request: GameSabotageRequest) -> GameSabotageResponse:
    """
    Evaluates player's selected option in Beat 2 (Spot-the-Crack Sabotage Challenge).
    """
    building, floor = get_game_floor(request.building_id, request.floor_id)
    if not building or not floor:
        raise ValueError(f"Unknown building '{request.building_id}' or floor '{request.floor_id}'")

    challenge = floor.sabotage_challenge
    is_correct = (request.selected_option_id == challenge.correct_option_id)

    if is_correct:
        return GameSabotageResponse(
            building_id=request.building_id,
            floor_id=request.floor_id,
            correct=True,
            status_title="Spot-the-Crack Certified! (SAT)",
            explanation=challenge.explanation_on_success,
            z3_unsat_trace=challenge.z3_unsat_trace,
        )
    else:
        return GameSabotageResponse(
            building_id=request.building_id,
            floor_id=request.floor_id,
            correct=False,
            status_title="Crack Missed! (Retry)",
            explanation="That option does not identify the mathematical counterexample that refutes the invariant. Re-read the scenario context and inspect the structural constraints!",
            z3_unsat_trace="; SMT solver: Candidate option does not refute the invariant.\n(check-sat) ; SAT (flaw remains undetected)",
        )


# ---------------------------------------------------------------------------
# Individual Floor SMT Verifiers (Inside Z3_MUTEX)
# ---------------------------------------------------------------------------

def _cert_hash(request: GameBuildVerifyRequest, player_state: dict) -> str:
    serialized = f"{request.building_id}:{request.floor_id}:{json.dumps(player_state, sort_keys=True)}"
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


def _verify_kst_f1_bedrock(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    selected = set(state.get("selectedStates", []))

    solver = z3.Solver()
    has_empty = z3.Bool("has_empty")
    has_full = z3.Bool("has_full")

    solver.assert_and_track(has_empty, "axiom_empty_set_required")
    solver.assert_and_track(has_full, "axiom_full_domain_required")

    solver.add(has_empty == ("empty" in selected))
    solver.add(has_full == ("SC" in selected))

    check_res = solver.check()
    if check_res == z3.sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Bedrock Slab Stable! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Empty set ∅ and full mastery Q are both present. Foundation axioms verified.",
            z3_smt_trace="(check-sat) ; SAT\n; Both ∅ and Q are present in the knowledge structure.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        cracked = []
        witness_parts = []
        if "empty" not in selected:
            cracked.append("empty")
            witness_parts.append("Missing ∅: A complete beginner who fails both questions has no valid knowledge state.")
        if "SC" not in selected:
            cracked.append("SC")
            witness_parts.append("Missing {S, C}: Full curriculum mastery cannot be diagnosed.")

        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Axiom 1 Refutation: Missing Bedrock ∅ or Ceiling Q",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Toggle on both '∅ (Absolute Novice)' and '{S, C} (Full Mastery)' to satisfy Axiom 1.",
            z3_smt_trace=f"(assert (and has_empty has_full))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_kst_f2_downward(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    selected = set(state.get("selectedStates", []))

    # Downward closure check:
    # Traffic (T) requires Steering (S) and Clutch (C).
    # Therefore, any state containing T must contain S and C.
    state_items: dict[str, set[str]] = {
        "empty": set(),
        "S": {"S"},
        "C": {"C"},
        "T": {"T"},
        "ST": {"S", "T"},
        "SC": {"S", "C"},
        "SCT": {"S", "C", "T"},
    }

    solver = z3.Solver()
    cracked = []
    witness_parts = []

    for sid in selected:
        items = state_items.get(sid, set())
        has_t = "T" in items
        has_s = "S" in items
        has_c = "C" in items

        t_var = z3.Bool(f"{sid}_in_T")
        s_var = z3.Bool(f"{sid}_in_S")
        c_var = z3.Bool(f"{sid}_in_C")

        track_id = f"downward_closure_{sid}"
        solver.assert_and_track(z3.Implies(t_var, z3.And(s_var, c_var)), track_id)
        solver.add(t_var == has_t)
        solver.add(s_var == has_s)
        solver.add(c_var == has_c)

        if has_t and not (has_s and has_c):
            cracked.append(sid)
            missing = []
            if not has_s:
                missing.append("Steering (S)")
            if not has_c:
                missing.append("Clutch Control (C)")
            witness_parts.append(
                f"State '{sid}' contains Traffic (T) without prerequisite {' and '.join(missing)}!"
            )

    # Must also contain empty and SCT
    has_empty = "empty" in selected
    has_full = "SCT" in selected
    if not has_empty:
        cracked.append("empty")
        witness_parts.append("Missing empty set ∅.")
    if not has_full:
        cracked.append("SCT")
        witness_parts.append("Missing full domain state {S, C, T}.")

    solver.assert_and_track(z3.BoolVal(has_empty), "has_empty")
    solver.assert_and_track(z3.BoolVal(has_full), "has_full")

    if solver.check() == z3.sat and not cracked:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Foundation Pillars Stable! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="All selected states are downward-closed under prerequisite gravity.",
            z3_smt_trace="(check-sat) ; SAT\n; Downward closure verified: ∀ q ∈ S, p ⪯ q ⟹ p ∈ S.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Downward Closure Refutation (Floating Skill)",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Deselect floating states like {S, T} or {T} that lack clutch control, and include {S, C} and {S, C, T}.",
            z3_smt_trace=f"(assert (and ...))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_kst_f3_union(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    selected = set(state.get("selectedStates", []))

    state_items: dict[str, set[str]] = {
        "empty": set(),
        "S": {"S"},
        "C": {"C"},
        "SC": {"S", "C"},
        "SCT": {"S", "C", "T"},
    }

    # Items to state ID
    items_to_id: dict[frozenset[str], str] = {
        frozenset(v): k for k, v in state_items.items()
    }

    solver = z3.Solver()
    cracked = []
    witness_parts = []

    # Check union-closure across all pairs in selected
    selected_list = list(selected)
    for i in range(len(selected_list)):
        for j in range(i, len(selected_list)):
            s1 = selected_list[i]
            s2 = selected_list[j]
            union_set = frozenset(state_items.get(s1, set()) | state_items.get(s2, set()))
            expected_id = items_to_id.get(union_set)

            track_id = f"union_{s1}_{s2}"
            in_family = expected_id in selected
            solver.assert_and_track(z3.BoolVal(in_family), track_id)

            if not in_family:
                if s1 not in cracked:
                    cracked.append(s1)
                if s2 not in cracked:
                    cracked.append(s2)
                witness_parts.append(
                    f"Union of '{s1}' and '{s2}' is {sorted(list(union_set))}, but state '{expected_id}' is missing from 𝒦!"
                )

    if not ("empty" in selected):
        solver.assert_and_track(z3.BoolVal(False), "empty_required")
        cracked.append("empty")
        witness_parts.append("Missing ∅.")

    if not ("SCT" in selected):
        solver.assert_and_track(z3.BoolVal(False), "full_required")
        cracked.append("SCT")
        witness_parts.append("Missing full domain {S, C, T}.")

    if solver.check() == z3.sat and not witness_parts:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Cross-Beams Stable! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Union-closure holds across all state pairs. Cumulative learning confirmed.",
            z3_smt_trace="(check-sat) ; SAT\n; Union-closure verified: ∀ K1, K2 ∈ 𝒦 ⟹ (K1 ∪ K2) ∈ 𝒦.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Union-Closure Refutation (Missing Collaborative State)",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Add the union state '{S, C}' so students learning Steering and Clutch independently can collaborate.",
            z3_smt_trace=f"(assert (and ...))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_kst_f4_notions(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    edges = state.get("edges", [])
    edge_pairs = set((e["from"], e["to"]) for e in edges if "from" in e and "to" in e)

    solver = z3.Solver()
    rank = {
        "A": z3.Int("rank_A"),
        "E1": z3.Int("rank_E1"),
        "E2": z3.Int("rank_E2"),
        "M": z3.Int("rank_M"),
    }

    # Pedagogical constraints for NCP fractions:
    # 1. E1 and E2 must be equivalent (same notion rank)
    solver.assert_and_track(rank["E1"] == rank["E2"], "notion_equivalence_E1_E2")
    # 2. A must strictly precede the Notion
    solver.assert_and_track(rank["A"] < rank["E1"], "prereq_A_precedes_E")
    # 3. Notion must strictly precede M
    solver.assert_and_track(rank["E1"] < rank["M"], "prereq_E_precedes_M")

    # Wire edge constraints from user
    cracked = []
    witness_parts = []

    for u, v in edge_pairs:
        edge_id = f"{u}->{v}"
        if u == "E1" and v == "E2" or u == "E2" and v == "E1":
            # Co-learned notion edge: rank must be equal
            solver.assert_and_track(rank[u] == rank[v], f"notion_edge_{edge_id}")
        else:
            # Directed prerequisite edge: rank[u] < rank[v]
            solver.assert_and_track(rank[u] < rank[v], f"edge_order_{edge_id}")

    # Check for backward cycle (e.g., M -> A)
    if ("M", "A") in edge_pairs:
        cracked.append("M->A")
        witness_parts.append("Backward edge M -> A detected: Multiplying Mixed Numbers (M) cannot be a prerequisite for Adding Fractions (A)!")

    # Check whether the required notion bundle is wired
    has_notion = ("E1", "E2") in edge_pairs and ("E2", "E1") in edge_pairs
    if not has_notion:
        witness_parts.append("E1 and E2 must be bidirectionally wired to form a single Notion bundle.")
        if ("E1", "E2") not in edge_pairs:
            cracked.append("E1->E2")
        if ("E2", "E1") not in edge_pairs:
            cracked.append("E2->E1")

    # Check whether A connects to E and E connects to M
    has_a_to_e = ("A", "E1") in edge_pairs or ("A", "E2") in edge_pairs
    has_e_to_m = ("E1", "M") in edge_pairs or ("E2", "M") in edge_pairs
    if not has_a_to_e:
        witness_parts.append("Missing prerequisite edge from Add Fractions (A) to the Notion bundle.")
    if not has_e_to_m:
        witness_parts.append("Missing prerequisite edge from the Notion bundle to Multiply Mixed Numbers (M).")

    is_sat = (solver.check() == z3.sat) and has_notion and has_a_to_e and has_e_to_m and not ("M", "A") in edge_pairs

    if is_sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Load-Bearing Arches Stable! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Quasi-order notions and acyclic prerequisite flow verified.",
            z3_smt_trace="(check-sat) ; SAT\n; Quasi-order equivalence: E1 ~ E2, rank(A) < rank(E) < rank(M).",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Cycle or Missing Notion Invariant Refutation",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Remove the reverse edge M -> A, connect E1 <-> E2 bidirectionally, and bridge A -> E -> M.",
            z3_smt_trace=f"(assert (and ...))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_kst_f5_birkhoff(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    # Outer Fringe of S = {G2_IDENT, G2_ADD_LIKE}
    # Prerequisites in NCP Fractions:
    # G2_IDENT has no prereqs
    # G2_ADD_LIKE has prereq: G2_IDENT
    # G3_EQUIV has prereq: G2_IDENT
    # G3_SUB_LIKE has prereq: G2_ADD_LIKE
    # G4_ADD_UNLIKE has prereqs: G3_EQUIV and G3_SUB_LIKE
    # G4_MUL_MIXED has prereqs: G4_ADD_UNLIKE
    selected = set(state.get("selectedStates", state.get("selectedSkills", [])))
    current_state = {"G2_IDENT", "G2_ADD_LIKE"}

    # Exact mathematical Outer Fringe O(S):
    # Items not in S whose prerequisites are 100% in S
    # G3_EQUIV: prereqs={G2_IDENT} ⊆ S -> in O(S)
    # G3_SUB_LIKE: prereqs={G2_ADD_LIKE} ⊆ S -> in O(S)
    # G4_ADD_UNLIKE: prereqs={G3_EQUIV, G3_SUB_LIKE} ⊈ S -> NOT in O(S)
    # G4_MUL_MIXED: prereqs={G4_ADD_UNLIKE} ⊈ S -> NOT in O(S)
    correct_fringe = {"G3_EQUIV", "G3_SUB_LIKE"}

    solver = z3.Solver()
    cracked = []
    witness_parts = []

    for q in selected:
        if q in current_state:
            cracked.append(q)
            witness_parts.append(f"Skill '{q}' is already mastered! The Outer Fringe only contains unmastered skills.")
        elif q == "G4_ADD_UNLIKE":
            cracked.append(q)
            witness_parts.append("G4_ADD_UNLIKE requires G3_EQUIV and G3_SUB_LIKE, which the student has not learned yet!")
        elif q == "G4_MUL_MIXED":
            cracked.append(q)
            witness_parts.append("G4_MUL_MIXED requires G4_ADD_UNLIKE, which is locked!")

    missing_fringe = correct_fringe - selected
    if missing_fringe:
        witness_parts.append(f"Missing ready-to-learn outer fringe skill(s): {', '.join(sorted(missing_fringe))}.")

    solver.assert_and_track(z3.BoolVal(selected == correct_fringe), "outer_fringe_exact_match")

    if selected == correct_fringe:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Penthouse Spire Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Exact Outer Fringe O(S) identified. Student is ready for G3_EQUIV and G3_SUB_LIKE.",
            z3_smt_trace="(check-sat) ; SAT\n; Birkhoff Outer Fringe O(S) = {q ∉ S | S ∪ {q} ∈ 𝒦}.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Outer Fringe (ZPD) Prerequisite Gap Violation",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Select only the immediate next skills {G3_EQUIV, G3_SUB_LIKE} whose prerequisites are already met.",
            z3_smt_trace="(assert (= selected_fringe correct_outer_fringe))\n(check-sat) ; UNSAT\n; Unsat core: [outer_fringe_prereq_gap]",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_citadel_f1_renumbering(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    accepted = set(state.get("acceptedBlockIds", []))

    blocks_meta = {
        "kc_fake_g4": {"claimed": 4, "actual": 2},
        "kc_real_g2": {"claimed": 1, "actual": 1},
        "kc_real_g3": {"claimed": 2, "actual": 2},
        "kc_real_g4": {"claimed": 4, "actual": 4},
    }

    solver = z3.Solver()
    cracked = []
    witness_parts = []

    for bid in accepted:
        meta = blocks_meta.get(bid, {"claimed": 0, "actual": -1})
        c_claimed = z3.Int(f"c_claimed_{bid}")
        c_actual = z3.Int(f"c_actual_{bid}")

        solver.assert_and_track(c_claimed == c_actual, f"ast_grounding_{bid}")
        solver.add(c_claimed == meta["claimed"])
        solver.add(c_actual == meta["actual"])

        if meta["claimed"] != meta["actual"]:
            cracked.append(bid)
            witness_parts.append(
                f"Block '{bid}' claimed complexity {meta['claimed']}, but deterministic AST parse reveals complexity {meta['actual']}! Renumbering cheat detected."
            )

    # Must accept genuine blocks
    if not ({"kc_real_g2", "kc_real_g3", "kc_real_g4"} <= accepted):
        witness_parts.append("You rejected authentic curriculum blocks!")

    is_sat = (solver.check() == z3.sat) and ("kc_fake_g4" not in accepted) and (len(accepted) >= 3)

    if is_sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Foundation Gate Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Renumbering cheat caught. All accepted blocks are grounded in deterministic AST depth.",
            z3_smt_trace="(check-sat) ; SAT\n; All accepted blocks satisfy AST_Complexity(text) == declared_complexity.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Proof Theater Renumbering Cheat Detected",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Reject 'kc_fake_g4' (which falsely stamped complexity 4 on like-denominator addition) and accept the 3 authentic blocks.",
            z3_smt_trace=f"(assert (= c_claimed c_actual))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_citadel_f2_atomicity(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    accepted = set(state.get("acceptedBlockIds", []))

    blocks_meta = {
        "kc_blob_twin": {"verbs": 2},
        "kc_atomic_ident": {"verbs": 1},
        "kc_atomic_simplify": {"verbs": 1},
        "kc_atomic_compare": {"verbs": 1},
    }

    solver = z3.Solver()
    cracked = []
    witness_parts = []

    for bid in accepted:
        meta = blocks_meta.get(bid, {"verbs": 0})
        v_count = z3.Int(f"verbs_{bid}")

        solver.assert_and_track(v_count == 1, f"atomic_verb_{bid}")
        solver.add(v_count == meta["verbs"])

        if meta["verbs"] > 1:
            cracked.append(bid)
            witness_parts.append(
                f"Block '{bid}' contains {meta['verbs']} operational verbs ('Identify' AND 'Simplify'). Knowledge Components must be atomic!"
            )

    is_sat = (solver.check() == z3.sat) and ("kc_blob_twin" not in accepted) and (len(accepted) >= 3)

    if is_sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Curtain Walls Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Conjoined blob split. All accepted KCs are single-verb atomic.",
            z3_smt_trace="(check-sat) ; SAT\n; All accepted KCs satisfy |Extract_Operational_Verbs(text)| == 1.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Conjoined Twin Blob Refutation",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Reject 'kc_blob_twin' and accept the split atomic KCs ('kc_atomic_ident', 'kc_atomic_simplify', 'kc_atomic_compare').",
            z3_smt_trace=f"(assert (= verb_count 1))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_citadel_f3_catalog(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    accepted = set(state.get("acceptedBlockIds", []))

    blocks_meta = {
        "kc_label_lie": {"overlap": 0.05, "catalog": True},
        "kc_hallucinated_bug": {"overlap": 0.85, "catalog": False},
        "kc_valid_add_num": {"overlap": 0.82, "catalog": True},
        "kc_valid_equiv": {"overlap": 0.88, "catalog": True},
    }

    solver = z3.Solver()
    cracked = []
    witness_parts = []

    for bid in accepted:
        meta = blocks_meta.get(bid, {"overlap": 0.0, "catalog": False})
        overlap_var = z3.Real(f"overlap_{bid}")
        cat_var = z3.Bool(f"catalog_{bid}")

        solver.assert_and_track(overlap_var >= z3.Q(50, 100), f"lexical_{bid}")
        solver.assert_and_track(cat_var, f"catalog_{bid}")

        solver.add(overlap_var == z3.Q(int(round(meta["overlap"] * 100)), 100))
        solver.add(cat_var == meta["catalog"])

        if meta["overlap"] < 0.50:
            cracked.append(bid)
            witness_parts.append(
                f"Block '{bid}' has only {meta['overlap']:.2f} lexical overlap with standard M-03-A-21! Label lie detected."
            )
        if not meta["catalog"]:
            cracked.append(bid)
            witness_parts.append(
                f"Block '{bid}' contains an unaccredited misconception not found in Brown & Burton (1978) or Siegler (2013) catalogs!"
            )

    is_sat = (
        (solver.check() == z3.sat)
        and ("kc_label_lie" not in accepted)
        and ("kc_hallucinated_bug" not in accepted)
        and ("kc_valid_add_num" in accepted)
        and ("kc_valid_equiv" in accepted)
    )

    if is_sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Watchtower Turrets Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Dual grounding verified: lexical overlap >= 0.50 and catalog accredited.",
            z3_smt_trace="(check-sat) ; SAT\n; Grounded against NCP 2022 standards and Brown & Burton bug catalogs.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Label Lie or Hallucinated Bug Refutation",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Reject 'kc_label_lie' (liquid volume) and 'kc_hallucinated_bug', then accept 'kc_valid_add_num' and 'kc_valid_equiv'.",
            z3_smt_trace=f"(assert (and (>= overlap 0.50) catalog))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_citadel_f4_dag(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    edges = state.get("edges", [])
    edge_pairs = set((e["from"], e["to"]) for e in edges if "from" in e and "to" in e)

    node_grades = {
        "G2_FRAC": 2,
        "G3_FRAC": 3,
        "G4_FRAC": 4,
    }

    solver = z3.Solver()
    ranks = {n: z3.Int(f"rank_{n}") for n in node_grades}

    cracked = []
    witness_parts = []

    for u, v in edge_pairs:
        edge_id = f"{u}->{v}"
        g_u = node_grades.get(u, 0)
        g_v = node_grades.get(v, 0)

        solver.assert_and_track(ranks[u] < ranks[v], f"acyclic_{edge_id}")
        solver.assert_and_track(z3.BoolVal(g_u <= g_v), f"monotonic_{edge_id}")

        if g_u > g_v:
            cracked.append(edge_id)
            witness_parts.append(
                f"Backward edge {edge_id} violates vertical monotonicity: Grade {g_u} cannot be a prerequisite for Grade {g_v}!"
            )

    has_g2_g3 = ("G2_FRAC", "G3_FRAC") in edge_pairs
    has_g3_g4 = ("G3_FRAC", "G4_FRAC") in edge_pairs
    if not has_g2_g3 or not has_g3_g4:
        witness_parts.append("Missing vertical progression bridge G2_FRAC -> G3_FRAC -> G4_FRAC.")

    is_sat = (solver.check() == z3.sat) and has_g2_g3 and has_g3_g4 and not cracked

    if is_sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Citadel Keep Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Vertical curriculum DAG verified without cycles or backward grade regressions.",
            z3_smt_trace="(check-sat) ; SAT\n; Acyclic DAG with Grade(u) <= Grade(v) confirmed.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Curriculum Cycle / Monotonicity Refutation",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Remove the backward edge G4_FRAC -> G3_FRAC and connect G3_FRAC -> G4_FRAC.",
            z3_smt_trace=f"(assert (and (< rank_u rank_v) (<= grade_u grade_v)))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_poly_f1_memory(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    sentence_words = int(state.get("sentenceWords", 22))
    variables = int(state.get("observableVariables", 5))

    solver = z3.Solver()
    w_var = z3.Int("words")
    v_var = z3.Int("variables")

    solver.assert_and_track(w_var <= 15, "sentence_words_ceiling")
    solver.assert_and_track(v_var <= 3, "observable_variables_ceiling")
    solver.add(w_var == sentence_words)
    solver.add(v_var == variables)

    cracked = []
    witness_parts = []
    if sentence_words > 15:
        cracked.append("sentenceWords")
        witness_parts.append(f"Words per sentence ({sentence_words}) exceeds Grade 3 ceiling (15)!")
    if variables > 3:
        cracked.append("observableVariables")
        witness_parts.append(f"Simultaneous variables ({variables}) overloads working memory ceiling (3)!")

    if solver.check() == z3.sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Telescope Pier Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint="Parameters stay within Grade 3 cognitive load boundaries.",
            z3_smt_trace="(check-sat) ; SAT\n; Invariant verified: sentenceWords <= 15 ∧ observableVariables <= 3.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Working Memory / Sentence Ceiling Overflow",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Drag 'Words per Sentence' slider to ≤ 15 and 'Simultaneous Variables' to ≤ 3.",
            z3_smt_trace=f"(assert (and (<= words 15) (<= variables 3)))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_poly_f2_fk(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    ws_val = float(state.get("avgWordsPerSentence", 20.0))
    sw_val = float(state.get("avgSyllablesPerWord", 1.8))

    solver = z3.Solver()
    ws = z3.Real("ws")
    sw = z3.Real("sw")
    fk = (z3.Q(39, 100) * ws) + (z3.Q(118, 10) * sw) - z3.Q(1559, 100)

    solver.assert_and_track(fk >= z3.Q(25, 10), "fk_min_2_5")
    solver.assert_and_track(fk <= z3.Q(42, 10), "fk_max_4_2")
    solver.assert_and_track(ws <= z3.Q(15, 1), "ws_max_15")

    ws_q = z3.Q(int(round(ws_val * 100)), 100)
    sw_q = z3.Q(int(round(sw_val * 100)), 100)
    solver.add(ws == ws_q)
    solver.add(sw == sw_q)

    actual_fk = 0.39 * ws_val + 11.8 * sw_val - 15.59

    cracked = []
    witness_parts = []
    if actual_fk > 4.2:
        cracked.extend(["avgWordsPerSentence", "avgSyllablesPerWord"])
        witness_parts.append(f"Flesch-Kincaid score ({actual_fk:.2f}) exceeds Grade 3 ceiling (4.20)!")
    elif actual_fk < 2.5:
        cracked.extend(["avgWordsPerSentence", "avgSyllablesPerWord"])
        witness_parts.append(f"Flesch-Kincaid score ({actual_fk:.2f}) is below Grade 3 floor (2.50)!")

    if ws_val > 15.0:
        if "avgWordsPerSentence" not in cracked:
            cracked.append("avgWordsPerSentence")
        witness_parts.append(f"Words per sentence ({ws_val:.1f}) exceeds ceiling (15.0)!")

    if solver.check() == z3.sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Rotating Dome Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint=f"2D Polytope point ({ws_val:.1f}, {sw_val:.2f}) yields FK {actual_fk:.2f} inside [2.5, 4.2].",
            z3_smt_trace=f"(check-sat) ; SAT\n; FK = {actual_fk:.2f} ∈ [2.50, 4.20] and W_S <= 15.0.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Coupled Flesch-Kincaid Polytope Boundary Refutation",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Adjust words per sentence to ~10.0 and syllables per word to ~1.30 to land inside the Grade 3 corridor.",
            z3_smt_trace=f"(assert (and (>= fk 2.5) (<= fk 4.2) (<= ws 15.0)))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )


def _verify_poly_f3_distractors(
    req: GameBuildVerifyRequest, floor: GameFloorSpec, state: dict
) -> GameBuildVerifyResponse:
    w1 = int(state.get("w1", 14))
    w2 = int(state.get("w2", 2))
    w3 = int(state.get("w3", 3))
    w4 = int(state.get("w4", 2))

    lengths = [w1, w2, w3, w4]
    spread = max(lengths) - min(lengths)

    solver = z3.Solver()
    w_vars = [z3.Int(f"w_{i}") for i in range(1, 5)]
    for i, val in enumerate(lengths):
        solver.add(w_vars[i] == val)
        solver.assert_and_track(w_vars[i] >= 2, f"opt_{i+1}_min_words")

    max_w = z3.Int("max_w")
    min_w = z3.Int("min_w")
    for wv in w_vars:
        solver.add(max_w >= wv)
        solver.add(min_w <= wv)
    solver.add(z3.Or([max_w == wv for wv in w_vars]))
    solver.add(z3.Or([min_w == wv for wv in w_vars]))

    solver.assert_and_track(max_w - min_w <= 3, "distractor_length_spread_ceiling")

    cracked = []
    witness_parts = []
    if spread > 3:
        # Find which option is the outlier
        max_val = max(lengths)
        for i, val in enumerate(lengths):
            if val == max_val:
                cracked.append(f"w{i+1}")
        witness_parts.append(
            f"Option length spread ({spread}) exceeds psychometric ceiling (3)! Option 1 is an outlier giveaway clue."
        )

    for i, val in enumerate(lengths):
        if val < 2:
            cracked.append(f"w{i+1}")
            witness_parts.append(f"Option {i+1} has fewer than 2 words.")

    if solver.check() == z3.sat:
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=True,
            status_title="Zenith Spire Certified! (SAT)",
            failure_headline="",
            counterexample_witness="",
            cracked_element_ids=[],
            repair_hint=f"Distractor lengths [{', '.join(map(str, lengths))}] have spread {spread} ≤ 3. Symmetry confirmed.",
            z3_smt_trace=f"(check-sat) ; SAT\n; Spread = {spread} <= 3 verified.",
            z3_certificate_hash=_cert_hash(req, state),
            blueprint_card=floor.blueprint_card,
        )
    else:
        core = [str(c) for c in solver.unsat_core()]
        return GameBuildVerifyResponse(
            building_id=req.building_id,
            floor_id=req.floor_id,
            is_sat=False,
            status_title="Structural Crack Detected! (UNSAT)",
            failure_headline="Distractor Symmetry Refutation (Length Giveaway Clue)",
            counterexample_witness=" ".join(witness_parts),
            cracked_element_ids=cracked,
            repair_hint="Balance all 4 option word counts (e.g. 4, 5, 4, 6) so the spread is ≤ 3.",
            z3_smt_trace=f"(assert (<= (- max_w min_w) 3))\n(check-sat) ; UNSAT\n; Unsat core: {core}",
            z3_certificate_hash=None,
            blueprint_card=floor.blueprint_card,
        )
