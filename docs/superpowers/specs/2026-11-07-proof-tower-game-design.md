# The Proof Architect's Tower (`/game`) — Design Specification

## 1. Purpose & Core Pedagogical Philosophy: "Learn Through Failure First"
Traditional math explanations front-load abstract definitions and notation before the learner ever experiences *why* those rules exist. **The Proof Architect's Tower** reverses this:
- **Zero Wall-of-Text Up Front**: Every Floor drops the player directly into a hands-on construction or sabotage puzzle with a 1-sentence plain-English prompt.
- **Productive Failure & Visual Cracks (`UNSAT`)**: Players test their intuitive guesses against a live **Z3 SMT Structural Physics Engine**. When an intuitive guess fails (e.g., forgetting the empty set $\emptyset$, allowing `{Traffic}` without `{Steering}`, missing the union state `{Steering, Clutch}`, or trusting a Lazy AI's fake `complexity: 4` label), the floor visibly cracks and Z3 isolates the exact concrete counterexample that broke it.
- **Just-in-Time Blueprint ("Aha!" Unlock)**: Only *after* the player sees the structural crack (or solves the build) does the concise mathematical rule & notation card unlock—anchoring the formal symbol ($\subseteq, \cup, \preceq, \text{rank}(u) < \text{rank}(v)$) to the concrete failure they just witnessed.

---

## 2. Generic Pluggable Shell Architecture (`ProofBuildingPack`)
The game engine at `/game` is a **generic shell** driven by declarative `ProofBuildingPack` schemas so any formal proof in education (Knowledge Space Theory, Anti-"Proof Theater" Curriculum Grounding, Psychometric Polytopes, or future proofs) fits cleanly without custom engine rewrites.

### Three Initial Buildings (Proof Packs)
1. **🏛️ Building 1: The Knowledge Space Tower (Doignon & Falmagne / Birkhoff Proof — 5 Floors)**
   - **Floor 1 (Bedrock)**: *The Empty & Full Foundation ($\emptyset$ and $Q$)* — Why every valid knowledge structure needs a ground floor ($\emptyset$) and a roof ($Q$), and how one bad state cracks a set family.
   - **Floor 2 (Pillars)**: *Downward Closure (Prerequisite Gravity)* — Prune impossible states ($2^{|Q|} \to |\mathcal{K}|$) so no skill floats in mid-air without its prerequisites.
   - **Floor 3 (Cross-Beams)**: *Union-Closure ($\cup$) & The Misconception Crack* — Discover why $\{S\} \in \mathcal{K} \land \{C\} \in \mathcal{K} \implies \{S, C\} \in \mathcal{K}$, and actively break a structure using school timetable streams or student misconceptions.
   - **Floor 4 (Load-Bearing Arches)**: *Quasi-Orders ($\preceq$) & Equivalence "Notions" ($x \sim y$)* — Wire prerequisite beams and bundle co-learned skills (like Left/Right or Improper $\leftrightarrow$ Mixed fractions) into Notions.
   - **Floor 5 (The Birkhoff Penthouse)**: *1-to-1 Bijection & Outer Fringe ZPD Navigation* — Translate states $\leftrightarrow$ prerequisites and pinpoint the exact next skill to teach any student.

2. **🏰 Building 2: The Anti-"Proof Theater" Citadel (Curriculum Grounding — 4 Floors)**
   - **Floor 1 (Foundation)**: *The Renumbering Cheat (AST Complexity vs. Fake Labels)* — Catch a Lazy AI Contractor who changes `complexity: 2 -> 4` without changing the math.
   - **Floor 2 (Walls)**: *The Conjoined Twin Blob (Single-Verb Atomicity)* — Split multi-verb KC blobs so student failures are diagnostically isolated.
   - **Floor 3 (Turrets)**: *The Label Lie & Hallucinated Bugs (Lexical & Catalog Grounding)* — Block fake standard tags and unaccredited misconceptions using Brown & Burton (1978) / Siegler (2013) catalogs.
   - **Floor 4 (Citadel Keep)**: *Vertical Grade DAGs ($G-1 \to G \to G+1$)* — Wire Pakistan NCP Fractions across Grades 2–4 with zero cycles and zero cross-grade collisions.

3. **🗼 Building 3: The Psychometric Assessment Observatory (Coupled Polytopes — 3 Floors)**
   - **Floor 1 (Base)**: *Working Memory & Sentence Ceilings* — Balance cognitive chunks against grade-band working memory limits.
   - **Floor 2 (Observatory Dome)**: *The Coupled Flesch-Kincaid Polytope ($\mathcal{P}_{\text{SAT}}$)* — Tune word, sentence, and syllable sliders to land inside the 2D Z3 feasible region.
   - **Floor 3 (Spire)**: *Minimal-Perturbation Distractor Balance (`z3.Optimize`)* — Balance MCQ option lengths and non-degenerate arithmetic bug outputs.

---

## 3. Universal 2-Beat Hands-On Floor Loop & 4 Puzzle Mechanics
Each Floor runs two fast, tactile beats:

### Beat 1: `🧱 Try & Break It (Hands-On Z3 Construction)`
Loads one of the **4 Universal Puzzle Widgets**:
1. `set_lattice_builder`: Toggle/snap subset tiles into the floor's foundation slots and hit **⚡ Run Z3 Stress-Test**.
2. `graph_wiring_board`: Click to connect skill nodes with directed prerequisite beams ($u \preceq v$) or bundle equivalent nodes into Notions ($x \sim y$).
3. `rule_inspector_gate`: Inspect incoming contractor blocks and toggle **Accept / Reject** + select the catching audit rule.
4. `polytope_tuner`: Drag coupled numerical sliders to move the live design point into the green Z3 feasible polytope $\mathcal{P}_{\text{SAT}}$.

- **Failure Feedback (The Teacher)**: When Z3 returns `UNSAT`, the widget highlights the exact offending tile/edge in crimson, plays a structural crack animation, and shows a plain-English **Counterexample Card** explaining *why* it cracked.
- **Just-in-Time Blueprint Card**: Unlocks automatically after the first attempt (or via a compact drawer) showing the 2-sentence everyday analogy and the formal mathematical rule.

### Beat 2: `🔨 Sabotage / Spot-the-Crack Challenge (Assessment to Certify)`
- Presents a "Lazy Contractor's Structure" or "Real-World Edge Case" (e.g., Misconception Replacement or Timetable Bottleneck) and asks the player to **click the exact counterexample or flaw that breaks the proof**.
- Passing Beat 2 stamps the floor **✅ Certified (`SAT`)**, raises the animated building elevation in the Left Pane, awards Structural XP, and unlocks the next floor up!

---

## 4. Backend & Frontend Interfaces (`camelCase` Contract)
- **Routes in `app/main.py`**:
  - `GET /game`: Serves `app/static/game.html`.
  - `GET /api/game/buildings`: Returns all `ProofBuildingPack` definitions (buildings, floors, initial puzzle configs, and stress-test challenges) in strict `camelCase`.
  - `POST /api/game/verify-floor-build`: Evaluates the player's current widget state (`buildingId`, `floorId`, `mechanicType`, `playerState`) using Z3 (`with Z3_MUTEX:`), returning `isSat`, `statusTitle`, `counterexampleWitness`, `crackedElementIds`, `justInTimeBlueprint`, and `z3CertificateHash`.
  - `POST /api/game/verify-sabotage-challenge`: Evaluates the player's selected counterexample/flaw in Beat 2 (`buildingId`, `floorId`, `selectedOptionId`), returning `correct`, `explanation`, and `z3UnsatTrace`.
- **Files**:
  - `app/verifier/proof_game_engine.py`: Declarative buildings/floors registry + Z3 evaluation logic for all 4 universal mechanics.
  - `app/models.py`: Pydantic `CamelModel` schemas for `GameFloorSpec`, `GameBuildingPack`, `GameBuildVerifyRequest`, `GameBuildVerifyResponse`, `GameSabotageRequest`, `GameSabotageResponse`.
  - `app/static/game.html`, `app/static/game.css`, `app/static/game.js`: Standalone interactive game studio with a navigation link back to `/` (and a "🏢 Play Proof Tower Game" launch button added to `/` in `app/static/index.html`).
  - `tests/test_proof_game_engine.py`: Comprehensive pytest suite testing all buildings, floors, failure counterexamples, and Z3 `SAT`/`UNSAT` transitions.
