import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.verifier.proof_game_engine import (
    list_game_buildings,
    get_game_building,
    get_game_floor,
    verify_floor_build,
    verify_sabotage_challenge,
)
from app.models import GameBuildVerifyRequest, GameSabotageRequest

pytestmark = pytest.mark.filterwarnings(r"ignore:Using `httpx` with `starlette\.testclient`.*")

client = TestClient(app)


def test_game_studio_page_serves_html():
    response = client.get("/game")
    assert response.status_code == 200
    assert "Proof Architect's Tower" in response.text
    # Verify version bump and audio/visual architectural markup
    assert "/static/game.css?v=2" in response.text
    assert "/static/game.js?v=2" in response.text
    assert "toggleSoundBtn" in response.text
    assert "playerRankBadge" in response.text
    assert "towerIntegrityPercent" in response.text
    assert "hudProgressBarFill" in response.text
    assert "skylineStars" in response.text
    assert "craneRig" in response.text
    assert "summitBeaconBeam" in response.text
    assert "gameFxOverlay" in response.text


def test_game_studio_static_assets_contain_audio_and_modern_web_guidance():
    # Verify CSS contains modern web linear easing custom properties, 3D blocks, FX and reduced motion
    css_res = client.get("/static/game.css")
    assert css_res.status_code == 200
    assert "--spring-easing:" in css_res.text
    assert "--bounce-easing:" in css_res.text
    assert "prefers-reduced-motion" in css_res.text
    assert "workbenchEarthquakeShake" in css_res.text
    assert "rubberStampSlam" in css_res.text
    assert "tileCrackOverlay" in css_res.text
    assert "latticeTileCard" in css_res.text
    assert "edgeToggleCard" in css_res.text

    # Verify JS contains procedural Web Audio API synthesizer and particle burst FX
    js_res = client.get("/static/game.js")
    assert js_res.status_code == 200
    assert "class SoundEngine" in js_res.text
    assert "playClickSound" in js_res.text
    assert "playWireSnapSound" in js_res.text
    assert "playStressTestChargeSound" in js_res.text
    assert "playCrackEarthquakeSound" in js_res.text
    assert "playSatChimeSound" in js_res.text
    assert "playLevelUpFanfareSound" in js_res.text
    assert "spawnParticles" in js_res.text
    assert "summitBeaconBeam" in js_res.text


def test_api_game_buildings_endpoint_returns_3_buildings_and_12_floors():
    response = client.get("/api/game/buildings")
    assert response.status_code == 200
    data = response.json()
    assert "buildings" in data
    buildings = data["buildings"]
    assert len(buildings) == 3

    building_ids = [b["buildingId"] for b in buildings]
    assert building_ids == ["kstTower", "antiTheaterCitadel", "polytopeObservatory"]

    expected_floor_counts = {
        "kstTower": 5,
        "antiTheaterCitadel": 4,
        "polytopeObservatory": 3,
    }

    total_floors = 0
    for b in buildings:
        bid = b["buildingId"]
        floors = b["floors"]
        assert len(floors) == expected_floor_counts[bid]
        total_floors += len(floors)

        # Check strict camelCase fields on Building
        assert "buildingId" in b
        assert "title" in b
        assert "subtitle" in b
        assert "icon" in b
        assert "description" in b
        assert "floors" in b

        for f in floors:
            # Check strict camelCase fields on Floor
            assert "floorId" in f
            assert "floorNumber" in f
            assert "architecturalElement" in f
            assert "title" in f
            assert "tryItPrompt" in f
            assert "mechanicType" in f
            assert "puzzleConfig" in f
            assert "blueprintCard" in f
            assert "sabotageChallenge" in f
            assert "xpReward" in f

            # Check puzzleConfig has both initialState and targetSolutionState
            cfg = f["puzzleConfig"]
            assert "initialState" in cfg, f"Floor {f['floorId']} missing initialState"
            assert "targetSolutionState" in cfg, f"Floor {f['floorId']} missing targetSolutionState"

            # Check blueprint card
            bp = f["blueprintCard"]
            assert "headline" in bp
            assert "everydayAnalogy" in bp
            assert "formalRule" in bp
            assert "takeaway" in bp

            # Check sabotage challenge
            sc = f["sabotageChallenge"]
            assert "prompt" in sc
            assert "scenarioContext" in sc
            assert "options" in sc
            assert len(sc["options"]) >= 2
            assert "correctOptionId" in sc
            assert "explanationOnSuccess" in sc
            assert "z3UnsatTrace" in sc

            option_ids = [opt["optionId"] for opt in sc["options"]]
            assert sc["correctOptionId"] in option_ids

    assert total_floors == 12


def test_every_floor_initial_state_triggers_productive_failure_crack():
    """
    'Learn Through Failure First' invariant:
    For every floor across all 3 buildings, testing puzzle_config['initialState']
    MUST yield isSat == False, a non-empty counterexampleWitness, and non-empty crackedElementIds.
    """
    buildings = list_game_buildings()
    for b in buildings:
        for f in b.floors:
            req_payload = {
                "buildingId": b.building_id,
                "floorId": f.floor_id,
                "playerState": f.puzzle_config["initialState"],
            }
            res = client.post("/api/game/verify-floor-build", json=req_payload)
            assert res.status_code == 200, f"Floor {f.floor_id} verify request failed: {res.text}"
            data = res.json()

            assert data["buildingId"] == b.building_id
            assert data["floorId"] == f.floor_id
            assert data["isSat"] is False, (
                f"Floor {f.floor_id} initial state should be UNSAT but returned SAT!"
            )
            assert data["counterexampleWitness"] != "", (
                f"Floor {f.floor_id} counterexample witness must not be empty on failure"
            )
            assert len(data["crackedElementIds"]) > 0, (
                f"Floor {f.floor_id} crackedElementIds must identify offending elements"
            )
            assert data["z3CertificateHash"] is None
            assert "blueprintCard" in data
            assert data["blueprintCard"]["headline"] == f.blueprint_card.headline


def test_every_floor_target_solution_achieves_sat_and_z3_certificate():
    """
    Formal certification invariant:
    For every floor across all 3 buildings, testing puzzle_config['targetSolutionState']
    MUST yield isSat == True, empty crackedElementIds, and a valid z3CertificateHash.
    """
    buildings = list_game_buildings()
    for b in buildings:
        for f in b.floors:
            req_payload = {
                "buildingId": b.building_id,
                "floorId": f.floor_id,
                "playerState": f.puzzle_config["targetSolutionState"],
            }
            res = client.post("/api/game/verify-floor-build", json=req_payload)
            assert res.status_code == 200, f"Floor {f.floor_id} verify request failed: {res.text}"
            data = res.json()

            assert data["buildingId"] == b.building_id
            assert data["floorId"] == f.floor_id
            assert data["isSat"] is True, (
                f"Floor {f.floor_id} target solution was expected to be SAT! Witness: {data.get('counterexampleWitness')}"
            )
            assert data["crackedElementIds"] == []
            assert data["counterexampleWitness"] == ""
            assert data["z3CertificateHash"] is not None
            assert len(data["z3CertificateHash"]) == 16
            assert "blueprintCard" in data


def test_verify_sabotage_challenge_endpoint_success_and_retry():
    """
    Beat 2 certification test:
    Verify that correct option certifies with explanation and z3UnsatTrace,
    while wrong option returns correct=False.
    """
    buildings = list_game_buildings()
    for b in buildings:
        for f in b.floors:
            # Correct answer
            correct_payload = {
                "buildingId": b.building_id,
                "floorId": f.floor_id,
                "selectedOptionId": f.sabotage_challenge.correct_option_id,
            }
            res_correct = client.post("/api/game/verify-sabotage-challenge", json=correct_payload)
            assert res_correct.status_code == 200
            data_correct = res_correct.json()
            assert data_correct["correct"] is True
            assert "Certified" in data_correct["statusTitle"]
            assert data_correct["explanation"] == f.sabotage_challenge.explanation_on_success
            assert data_correct["z3UnsatTrace"] == f.sabotage_challenge.z3_unsat_trace

            # Wrong answer
            wrong_payload = {
                "buildingId": b.building_id,
                "floorId": f.floor_id,
                "selectedOptionId": "completely_wrong_option_id",
            }
            res_wrong = client.post("/api/game/verify-sabotage-challenge", json=wrong_payload)
            assert res_wrong.status_code == 200
            data_wrong = res_wrong.json()
            assert data_wrong["correct"] is False
            assert "Retry" in data_wrong["statusTitle"] or "Missed" in data_wrong["statusTitle"]


def test_building_and_floor_lookup_helpers():
    building = get_game_building("kstTower")
    assert building is not None
    assert building.building_id == "kstTower"

    assert get_game_building("nonExistent") is None

    b, f = get_game_floor("kstTower", "kst_f1_bedrock")
    assert b is not None
    assert f is not None
    assert f.floor_id == "kst_f1_bedrock"

    b_none, f_none = get_game_floor("nonExistent", "nonExistent")
    assert b_none is None
    assert f_none is None

    b_valid, f_invalid = get_game_floor("kstTower", "nonExistentFloor")
    assert b_valid is not None
    assert f_invalid is None


def test_unknown_floor_or_building_raises_error():
    with pytest.raises(ValueError, match="Unknown building"):
        verify_floor_build(
            GameBuildVerifyRequest(
                building_id="bogusBuilding",
                floor_id="bogusFloor",
                player_state={},
            )
        )

    with pytest.raises(ValueError, match="Unknown building"):
        verify_sabotage_challenge(
            GameSabotageRequest(
                building_id="bogusBuilding",
                floor_id="bogusFloor",
                selected_option_id="opt_1",
            )
        )
