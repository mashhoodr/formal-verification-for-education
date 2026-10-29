from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from app.models import (
    CheatSimulationRequest,
    GenerateAndVerifyRequest,
    VerifyRequest,
    Stage0RepairRequest,
    Stage0VerifyRequest,
)
from app.verifier.curriculum_grounding import (
    get_stage0_grounding_report,
    simulate_cheat_demo,
)
from app.verifier.grade_specs import list_grade_specs
from app.verifier.kc_ontology_kernel import (
    list_stage0_scenarios,
    run_stage0_repair_loop,
    verify_kc_ontology,
)
from app.verifier.repair_orchestrator import (
    DEMO_SCENARIOS,
    list_demo_scenarios,
    run_generate_and_verify_loop,
)
from app.verifier.z3_kernel import verify_assessment

app = FastAPI(
    title="K-12 Educational Content Formal Verification Kernel",
    version="1.0.0",
)

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def serve_playground() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/api/specs")
def get_specs_and_scenarios() -> JSONResponse:
    specs = [s.model_dump(by_alias=True) for s in list_grade_specs()]
    scenarios = list_demo_scenarios()
    return JSONResponse(
        content={
            "gradeSpecs": specs,
            "demoScenarios": scenarios,
            "initialDrafts": {
                k: v["steps"][0]["assessment"].model_dump(by_alias=True)
                for k, v in DEMO_SCENARIOS.items()
            },
        }
    )


@app.post("/api/verify")
def verify_endpoint(payload: VerifyRequest) -> JSONResponse:
    result = verify_assessment(payload.assessment, payload.grade_spec)
    return JSONResponse(content=result.model_dump(by_alias=True))


@app.post("/api/generate-and-verify")
def generate_and_verify_endpoint(payload: GenerateAndVerifyRequest) -> JSONResponse:
    response = run_generate_and_verify_loop(payload)
    return JSONResponse(content=response.model_dump(by_alias=True))


@app.get("/api/stage0/grounding-report")
def get_stage0_grounding_report_endpoint(scenario_id: str = "ncpMathFractionsG2G4") -> JSONResponse:
    report = get_stage0_grounding_report(scenario_id)
    return JSONResponse(content=report.model_dump(by_alias=True))


@app.post("/api/stage0/simulate-cheat")
def stage0_simulate_cheat_endpoint(payload: CheatSimulationRequest) -> JSONResponse:
    result = simulate_cheat_demo(payload.cheat_type)
    return JSONResponse(content=result.model_dump(by_alias=True))


@app.get("/api/stage0/scenarios")
def get_stage0_scenarios_endpoint() -> JSONResponse:
    scenarios = list_stage0_scenarios()
    return JSONResponse(content={"scenarios": scenarios})


@app.post("/api/stage0/repair-loop")
def stage0_repair_loop_endpoint(payload: Stage0RepairRequest) -> JSONResponse:
    response = run_stage0_repair_loop(payload.scenario_id)
    return JSONResponse(content=response.model_dump(by_alias=True))


@app.post("/api/stage0/verify")
def stage0_verify_endpoint(payload: Stage0VerifyRequest) -> JSONResponse:
    result = verify_kc_ontology(payload.triad_spec)
    return JSONResponse(content=result.model_dump(by_alias=True))


# Stage 1 Alias Endpoints (Curriculum Graph & Ontology Verification)
@app.get("/api/stage1/scenarios")
def get_stage1_scenarios_endpoint() -> JSONResponse:
    scenarios = list_stage0_scenarios()
    return JSONResponse(content={"scenarios": scenarios})


@app.post("/api/stage1/repair-loop")
def stage1_repair_loop_endpoint(payload: Stage0RepairRequest) -> JSONResponse:
    response = run_stage0_repair_loop(payload.scenario_id)
    return JSONResponse(content=response.model_dump(by_alias=True))


@app.post("/api/stage1/verify")
def stage1_verify_endpoint(payload: Stage0VerifyRequest) -> JSONResponse:
    result = verify_kc_ontology(payload.triad_spec)
    return JSONResponse(content=result.model_dump(by_alias=True))
