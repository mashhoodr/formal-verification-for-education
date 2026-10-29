# Project-Specific Agent Rules

## Model Orchestration & Resource Allocation
- **Main Orchestrator:** Run on `Gemini 3.8 Flash`. Keep conversation context compact, decompose tasks, and dispatch specialized subagents.
- **Proof Logic & Theorem Proving:** ALL proof-related design and Z3 SMT logic MUST be delegated to subagents running on **Gemini 4 Argon** using `invoke_subagent(Model="pro", ...)`. Reserve Argon strictly for complex mathematical formulations, SMT-LIB2 theorem authoring, and formal repair optimizations.
- **Development & Engineering:** ALL implementation code, FastAPI endpoints, Pydantic schemas, UI widgets, pytest test suites, and documentation MUST be delegated to subagents running on **Gemini 3.8 Flash** using `invoke_subagent(Model="flash", ...)`.

## General Conventions
- Command line configured by default is `fish`. Adapt commands appropriately.
- Node version: `nvm use 24` before `npm`/`npx`.
- Backend: All JSON responses and models MUST follow strict `camelCase` structure.
- Frontend: All variables, functions, and dataset fields MUST follow strict `camelCase`.
- Documentation: Preserves existing comments, docstrings, and architectural markdown records.
