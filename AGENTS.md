# Core Principles & Engineering Guidelines for AI Agents

> **Project Mission:** Building mathematically rigorous, neuro-symbolic formal verification for K-12 pedagogical content (curriculum ontologies, formative assessments, lesson plans, and coaching). Grounded in the **National Curriculum of Pakistan (NCP 2022–23)** and cognitive science.

---

## 1. The Anti-"Proof Theater" Principle (Rigor Over Shortcuts)

> [!CAUTION]
> **A proof that merely verifies a self-fulfilling tautology is worse than useless—it is dangerous.**
> If an agent adds an SMT assertion just to produce a green `SAT` check without testing a genuine mathematical invariant or pedagogical ground truth, it violates the core mission of this project.

### What is "Proof Theater"?
- **Tautological Checking:** Asking an LLM to generate an integer label (e.g. `complexity: 3`), and then having Z3 assert `complexity == 3`. This proves nothing about whether the content is actually at complexity level 3; it only proves that the integer 3 equals the integer 3!
- **Renumbering Shortcuts:** When an LLM encounters an `UNSAT` boundary collision (e.g. Grade 3 collides with Grade 2), "fixing" it by changing the integer label from 2 to 3 without modifying the actual linguistic or cognitive content.
- **Label-Matching Illusions:** Asserting that a candidate Knowledge Component satisfies an official standard simply because the LLM pasted the string `M-03-A-21` into a JSON array, without verifying semantic alignment.

### What Real Rigor Demands:
1. **Existential & Structural Solving:** Proofs must force the solver to search a genuine mathematical space (e.g. Theorem 0.1 finding a global topological rank vector $\text{rank}(u) < \text{rank}(v)$ that simultaneously satisfies all prerequisite edges without cycles).
2. **Deterministic Parameter Derivation:** Wherever possible, metrics must be derived deterministically from the content itself (e.g., verb counting from dependency parse trees, complexity envelopes from numerical ranges and AST depth), NOT trusted from LLM self-reporting.
3. **Refutation Must Hurt:** An invalid draft must reliably trigger `UNSAT Core`. If a buggy or degraded curriculum decomposition can slip through as `SAT`, the proof specification is incomplete and must be strengthened.
4. **Transparent Epistemic Boundaries:** When an educational reality cannot be proven by deductive first-order logic (e.g. human classroom error frequencies), **never fake a proof**. Formally document it as an Epistemic Boundary and pair it with empirical psychometrics (DINA, BKT, Item Calibration).

---

## 2. Model Tiering & Quota Discipline

To conserve quota on the limited flagship reasoning model (**Gemini 4 Argon**), all work must strictly adhere to:

| Tier | Model | Subagent `Model` Flag | Enforced Scope |
| :--- | :--- | :--- | :--- |
| **Main Orchestrator** | Gemini 3.8 Flash | *Default* | High-level planning, workflow coordination, task decomposition, and dispatching subagents. |
| **Formal Proof Specialist** | Gemini 4 Argon | `Model="pro"` | Designing mathematical theorems, Z3 SMT constraint formulations, `assert_and_track` invariants, SMT-LIB2 theorem scripts, and `z3.Optimize` repair objectives. |
| **Full-Stack Developer** | Gemini 3.8 Flash | `Model="flash"` | FastAPI endpoints, Pydantic schemas, HTML/CSS/JS frontend UI, pytest suites, curriculum OCR/parsing, and git hygiene. |

---

## 3. Epistemic Transparency: What We Prove vs. What We Must Ground

Every formal proof in this repository must clearly articulate its **Root of Trust**:
1. **Inside the Proof (Deductive Certainty):** DAG acyclicity, grade monotonicity, envelope disjointness, verb atomicity, bipartite clause coverage, distractor distinctness.
2. **Outside the Proof (Empirical Grounding Required):**
   - Procedural misconceptions must be grounded in peer-reviewed catalogs (Brown & Burton 1978, Siegler 2013).
   - SLO clause coverage must be anchored by deterministic lexical token overlap.
   - Cognitive transfer along prerequisite edges must be validated via classroom diagnostic models (DINA / Q-matrix).

---

## 4. Code & Architecture Standards

1. **Strict camelCase Convention:**
   - All backend JSON responses and Pydantic models must use `CamelModel` with `by_alias=True`.
   - All frontend JavaScript variables, functions, and dataset fields must follow strict `camelCase`.
2. **Deterministic Fallbacks:** The system must never enter an infinite LLM repair loop. The Z3 kernel must always prescribe concrete numerical targets for repair.
3. **Documentation Integrity:** Preserve existing docstrings, mathematical formulas, and architectural markdown records. Never remove comments explaining theorem rationales.
