# Proof Architect's Tower (`/game`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone `/game` interactive Proof Architect's Tower learning game with a generic `ProofBuildingPack` shell, 3 playable buildings (12 total floors), 4 universal Z3 puzzle mechanics, and a "Learn Through Failure First" loop.

**Architecture:** A declarative Python game engine (`app/verifier/proof_game_engine.py`) defines 3 `GameBuildingPack` cartridges (KST Foundations, Anti-"Proof Theater" Citadel, Assessment Polytope Observatory) evaluated live by Z3 (`with Z3_MUTEX:`). A dedicated frontend studio (`app/static/game.html`, `game.css`, `game.js`) renders the living building elevation on the left and the 2-beat hands-on floor workbench (Beat 1: Try & Break Z3 Puzzle -> Just-in-Time Blueprint; Beat 2: Sabotage/Spot-the-Crack Challenge) on the right.

**Tech Stack:** Python 3.13, FastAPI, Pydantic (`CamelModel`), `z3-solver`, Vanilla HTML5/CSS3/ES6 JavaScript.

**Spec:** `docs/superpowers/specs/2026-11-07-proof-tower-game-design.md`

## Global Constraints
- All backend Pydantic models and JSON responses MUST inherit from `CamelModel` and serialize with `by_alias=True` (`camelCase`).
- All frontend JavaScript variables, functions, and dataset fields MUST follow strict `camelCase`.
- All Z3 solver invocations MUST acquire `with Z3_MUTEX:` from `app.verifier.z3_lock`.
- Maintain >= 4.5:1 text contrast and never use color alone to convey state (always include icons and text labels).

---

### Task 1: Backend Game Engine, Pydantic Schemas, FastAPI Routes & Pytest Suite

**Files:**
- Modify: `app/models.py`
- Create: `app/verifier/proof_game_engine.py`
- Modify: `app/main.py`
- Create: `tests/test_proof_game_engine.py`

- [x] **Step 1: Add Game Pydantic models to `app/models.py`**
- [x] **Step 2: Implement `app/verifier/proof_game_engine.py` with 3 Buildings, 12 Floors, and live Z3 verification for all 4 universal mechanics**
- [x] **Step 3: Wire `/game`, `/api/game/buildings`, `/api/game/verify-floor-build`, and `/api/game/verify-sabotage-challenge` in `app/main.py`**
- [x] **Step 4: Write and run `tests/test_proof_game_engine.py` ensuring both failure (`UNSAT` counterexample cracks) and success (`SAT` certification) paths pass**

---

### Task 2: Frontend Proof Architect's Tower Studio (`/game`) & Cross-Navigation

**Files:**
- Create: `app/static/game.html`
- Create: `app/static/game.css`
- Create: `app/static/game.js`
- Modify: `app/static/index.html`

- [x] **Step 1: Build `app/static/game.html` and `app/static/game.css` with 2-pane Building Elevation + Hands-On Floor Studio**
- [x] **Step 2: Build `app/static/game.js` implementing the 4 universal puzzle widgets (`set_lattice_builder`, `graph_wiring_board`, `rule_inspector_gate`, `polytope_tuner`), failure crack feedback, Just-in-Time Blueprint unlock, and Beat 2 Sabotage Challenge**
- [x] **Step 3: Add a prominent "🏢 Play Proof Tower Game" button in `app/static/index.html` linking `/` and `/game`**
- [x] **Step 4: Verify live in Chrome DevTools MCP (`http://127.0.0.1:8000/game`), confirm 0 console errors, run full pytest suite, and commit**
