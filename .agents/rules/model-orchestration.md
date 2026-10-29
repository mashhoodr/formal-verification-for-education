---
trigger: always_on
description: Model tiering rules enforcing Gemini 4 Argon for formal proof logic and Gemini 3.8 Flash for orchestration and development
---

# Multi-Tier Subagent Model Orchestration Rule

To conserve quota on the limited flagship reasoning model (**Gemini 4 Argon**), all work in this repository must strictly adhere to the following model tiering architecture:

## 1. Main Orchestrator
- **Model:** `Gemini 3.8 Flash`
- **Role:** High-level planning, workflow coordination, user conversation, task decomposition, and dispatching specialized subagents.

## 2. Proof Logic & Theorem Proving Subagents (Gemini 4 Argon / `Model="pro"`)
When delegating ANY task involving formal verification logic, you **MUST** invoke the subagent with `Model="pro"`:
- **Eligible Tasks:**
  - Designing and formalizing mathematical theorems and pedagogical invariants.
  - Formulating Z3 SMT constraints, half-plane inequalities, and `assert_and_track` statements.
  - Designing SMT-LIB2 scripts, proof certificates, and UNSAT core reduction strategies.
  - Writing `z3.Optimize` objective functions and counterexample-guided repair mathematics.
  - Analyzing epistemic proof boundaries and soundness limits.
- **Invocation Pattern:**
  ```python
  invoke_subagent(
      TypeName="proof-architect",  # or "self"
      Role="Formal Proof Architect",
      Model="pro",                 # Strictly Gemini 4 Argon
      Prompt="Formalize the vertical grade boundary theorems in Z3 SMT-LIB2..."
  )
  ```

## 3. Development, UI & Test Subagents (Gemini 3.8 Flash / `Model="flash"`)
All standard software engineering tasks **MUST** use `Model="flash"`:
- **Eligible Tasks:**
  - Writing FastAPI routes, Pydantic data models (`app/models.py`), and serializers.
  - Implementing HTML5, CSS3, and DOM JavaScript UI components (`app/static/`).
  - Writing unit tests and integration tests with `pytest` (`tests/`).
  - Curriculum PDF text extraction, OCR, regex parsing, and JSON transformations (`data/`).
  - Updating markdown documentation, README, and git hygiene.
- **Invocation Pattern:**
  ```python
  invoke_subagent(
      TypeName="dev-implementer",  # or "self"
      Role="Feature Developer",
      Model="flash",               # Strictly Gemini 3.8 Flash
      Prompt="Implement the FastAPI router and corresponding pytest tests..."
  )
  ```

## Model Allocation Matrix
| Capability | Model | Subagent `Model` Flag | Typical Tasks |
| :--- | :--- | :--- | :--- |
| **Main Orchestrator** | Gemini 3.8 Flash | N/A (Session Default) | Planning, Task Decomposition, User Interaction |
| **Proof Specialist** | Gemini 4 Argon | `Model="pro"` | Z3 Theorems, SMT-LIB2, `assert_and_track`, `z3.Optimize` |
| **Dev Specialist** | Gemini 3.8 Flash | `Model="flash"` | FastAPI, JavaScript UI, HTML/CSS, Pytest Suites, Docs |
