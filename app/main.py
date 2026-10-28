from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from app.models import GenerateAndVerifyRequest, VerifyRequest
from app.verifier.grade_specs import list_grade_specs
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
