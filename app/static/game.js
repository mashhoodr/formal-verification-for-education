/**
 * The Proof Architect's Tower (/game) — Client Engine
 * High-performance, accessible vanilla JavaScript game studio.
 * All variables, functions, and dataset fields adhere to strict camelCase.
 */

// Global Game State
const gameState = {
  buildings: [],
  activeBuildingId: "kstTower",
  activeFloorId: null,
  playerXp: 0,
  certifiedFloorIds: new Set(),
  sandboxMode: false,
  currentWidgetState: {},
  activeCrackedElementIds: [],
  lastBuildResponse: null,
  selectedSabotageOptionId: null,
  crackedFloorIds: new Set(),
};

// Storage Keys
const STORAGE_KEY_XP = "proofTower_playerXp";
const STORAGE_KEY_CERTIFIED = "proofTower_certifiedFloorIds";
const STORAGE_KEY_SANDBOX = "proofTower_sandboxMode";

/**
 * Initialize the Proof Architect's Tower on DOMContentLoaded
 */
document.addEventListener("DOMContentLoaded", () => {
  loadStoredProgress();
  setupGlobalEventListeners();
  fetchGameBuildings();
});

/**
 * Load persisted progress from localStorage
 */
function loadStoredProgress() {
  try {
    const storedXp = localStorage.getItem(STORAGE_KEY_XP);
    if (storedXp !== null) {
      gameState.playerXp = parseInt(storedXp, 10) || 0;
    }

    const storedCertified = localStorage.getItem(STORAGE_KEY_CERTIFIED);
    if (storedCertified) {
      const parsedArray = JSON.parse(storedCertified);
      if (Array.isArray(parsedArray)) {
        gameState.certifiedFloorIds = new Set(parsedArray);
      }
    }

    const storedSandbox = localStorage.getItem(STORAGE_KEY_SANDBOX);
    gameState.sandboxMode = (storedSandbox === "true");
    const sandboxCheckbox = document.getElementById("sandboxModeCheckbox");
    if (sandboxCheckbox) {
      sandboxCheckbox.checked = gameState.sandboxMode;
    }
  } catch (err) {
    console.error("Failed to load stored game progress:", err);
  }
}

/**
 * Persist current progress to localStorage
 */
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY_XP, gameState.playerXp.toString());
    localStorage.setItem(
      STORAGE_KEY_CERTIFIED,
      JSON.stringify(Array.from(gameState.certifiedFloorIds))
    );
    localStorage.setItem(STORAGE_KEY_SANDBOX, gameState.sandboxMode.toString());
  } catch (err) {
    console.error("Failed to save progress:", err);
  }
}

/**
 * Reset all player progress
 */
function resetAllProgress() {
  if (confirm("Reset all game progress, structural XP, and floor certifications?")) {
    gameState.playerXp = 0;
    gameState.certifiedFloorIds.clear();
    gameState.crackedFloorIds.clear();
    saveProgress();
    updateHudStats();
    renderBuildingElevation();
    if (gameState.activeFloorId) {
      loadFloor(gameState.activeFloorId);
    }
  }
}

/**
 * Wire global action event listeners
 */
function setupGlobalEventListeners() {
  const sandboxCheckbox = document.getElementById("sandboxModeCheckbox");
  if (sandboxCheckbox) {
    sandboxCheckbox.addEventListener("change", (event) => {
      gameState.sandboxMode = event.target.checked;
      saveProgress();
      renderBuildingElevation();
      const currentFloor = getActiveFloor();
      if (currentFloor) {
        updateBeat2LockState(currentFloor);
      }
    });
  }

  const resetBtn = document.getElementById("resetProgressBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllProgress);
  }

  const stressTestBtn = document.getElementById("runStressTestBtn");
  if (stressTestBtn) {
    stressTestBtn.addEventListener("click", handleRunStressTest);
  }

  const resetStarterBtn = document.getElementById("resetStarterBtn");
  if (resetStarterBtn) {
    resetStarterBtn.addEventListener("click", handleResetStarterState);
  }

  const snapSolutionBtn = document.getElementById("snapSolutionBtn");
  if (snapSolutionBtn) {
    snapSolutionBtn.addEventListener("click", handleSnapToSolution);
  }

  const toggleBlueprintBtn = document.getElementById("toggleBlueprintBtn");
  if (toggleBlueprintBtn) {
    toggleBlueprintBtn.addEventListener("click", handleToggleBlueprint);
  }

  const focusStep1Btn = document.getElementById("focusStep1Btn");
  if (focusStep1Btn) {
    focusStep1Btn.addEventListener("click", () => {
      const step1 = document.getElementById("beat1Section");
      if (step1) {
        step1.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  const submitSabotageBtn = document.getElementById("submitSabotageBtn");
  if (submitSabotageBtn) {
    submitSabotageBtn.addEventListener("click", handleSubmitSabotageChallenge);
  }

  const ascendNextFloorBtn = document.getElementById("ascendNextFloorBtn");
  if (ascendNextFloorBtn) {
    ascendNextFloorBtn.addEventListener("click", handleAscendToNextFloor);
  }
}

/**
 * Fetch buildings and floors declarative registry from the backend
 */
async function fetchGameBuildings() {
  try {
    const response = await fetch("/api/game/buildings");
    if (!response.ok) {
      throw new Error(`Failed to load buildings (status ${response.status})`);
    }
    const data = await response.json();
    gameState.buildings = data.buildings || [];

    if (gameState.buildings.length === 0) {
      console.warn("No game buildings returned from backend.");
      return;
    }

    renderBuildingTabs();
    selectBuilding(gameState.activeBuildingId || gameState.buildings[0].buildingId);
    updateHudStats();
  } catch (err) {
    console.error("Error fetching game buildings:", err);
    const container = document.getElementById("puzzleWidgetContainer");
    if (container) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--unsat-color);">
          <p><strong>⚠️ Unable to connect to Proof Architect's Engine.</strong></p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${err.message}</p>
        </div>
      `;
    }
  }
}

/**
 * Get active building pack object
 */
function getActiveBuilding() {
  return gameState.buildings.find((b) => b.buildingId === gameState.activeBuildingId) || null;
}

/**
 * Get active floor spec object
 */
function getActiveFloor() {
  const building = getActiveBuilding();
  if (!building) return null;
  return building.floors.find((f) => f.floorId === gameState.activeFloorId) || null;
}

/**
 * Render the building switcher tabs in the top header
 */
function renderBuildingTabs() {
  const tabsContainer = document.getElementById("buildingTabs");
  if (!tabsContainer) return;

  tabsContainer.innerHTML = "";

  gameState.buildings.forEach((building, idx) => {
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.className = "buildingTabBtn";
    if (building.buildingId === gameState.activeBuildingId) {
      tabBtn.classList.add("activeTab");
    }

    const certifiedCount = building.floors.filter((f) =>
      gameState.certifiedFloorIds.has(f.floorId)
    ).length;
    const isCompleted = certifiedCount === building.floors.length;

    tabBtn.innerHTML = `
      <span aria-hidden="true">${building.icon || "🏛️"}</span>
      <span>${building.title}</span>
      <span class="badgeNumeric">(${certifiedCount}/${building.floors.length}${isCompleted ? " ✅" : ""})</span>
    `;

    tabBtn.addEventListener("click", () => {
      selectBuilding(building.buildingId);
    });

    tabsContainer.appendChild(tabBtn);
  });
}

/**
 * Switch active building
 */
function selectBuilding(buildingId) {
  gameState.activeBuildingId = buildingId;

  // Update tab active classes
  const tabButtons = document.querySelectorAll(".buildingTabBtn");
  const buildingIndex = gameState.buildings.findIndex((b) => b.buildingId === buildingId);
  tabButtons.forEach((btn, idx) => {
    btn.classList.toggle("activeTab", idx === buildingIndex);
  });

  const building = getActiveBuilding();
  if (!building) return;

  // Update building metadata in the left elevation header
  const titleEl = document.getElementById("towerBuildingTitle");
  const subtitleEl = document.getElementById("towerBuildingSubtitle");
  const descEl = document.getElementById("towerBuildingDesc");
  const iconEl = document.getElementById("towerBuildingIcon");

  if (titleEl) titleEl.textContent = building.title;
  if (subtitleEl) subtitleEl.textContent = building.subtitle || "";
  if (descEl) descEl.textContent = building.description || "";
  if (iconEl) iconEl.textContent = building.icon || "🏛️";

  // Pick first uncertified floor, or Floor 1
  let targetFloor = building.floors.find((f) => !gameState.certifiedFloorIds.has(f.floorId));
  if (!targetFloor && building.floors.length > 0) {
    targetFloor = building.floors[0];
  }

  if (targetFloor) {
    loadFloor(targetFloor.floorId);
  }

  renderBuildingElevation();
  updateHudStats();
}

/**
 * Render the stacked architectural elevation in the left pane (Floor 1 at bottom)
 */
function renderBuildingElevation() {
  const stackContainer = document.getElementById("towerStackContainer");
  if (!stackContainer) return;

  stackContainer.innerHTML = "";
  const building = getActiveBuilding();
  if (!building) return;

  building.floors.forEach((floor, idx) => {
    const isCertified = gameState.certifiedFloorIds.has(floor.floorId);
    const isCracked = gameState.crackedFloorIds.has(floor.floorId);
    const isActive = floor.floorId === gameState.activeFloorId;

    // Floor is unlocked if:
    // 1. Sandbox mode is on
    // 2. It is Floor 1
    // 3. The previous floor is certified
    // 4. This floor is already certified
    const prevFloor = idx > 0 ? building.floors[idx - 1] : null;
    const isUnlocked =
      gameState.sandboxMode ||
      idx === 0 ||
      isCertified ||
      (prevFloor && gameState.certifiedFloorIds.has(prevFloor.floorId));

    const card = document.createElement("div");
    card.className = "elevationFloorCard";
    card.setAttribute("role", "listitem");
    card.dataset.floorId = floor.floorId;

    if (isActive) card.classList.add("activeFloor");
    if (isCertified) card.classList.add("certified");
    if (isCracked) card.classList.add("cracked");
    if (!isUnlocked) card.classList.add("locked");

    let statusPillClass = "locked";
    let statusPillContent = "🔒 LOCKED";

    if (isCertified) {
      statusPillClass = "certified";
      statusPillContent = "✅ CERTIFIED (SAT)";
    } else if (isCracked) {
      statusPillClass = "cracked";
      statusPillContent = "⚡ CRACKED (UNSAT)";
    } else if (isActive) {
      statusPillClass = "active";
      statusPillContent = "🛠️ ACTIVE FLOOR";
    } else if (isUnlocked) {
      statusPillClass = "active";
      statusPillContent = "🔓 UNLOCKED";
    }

    card.innerHTML = `
      <div class="floorCardRowTop">
        <div class="floorCardBadgeGroup">
          <span class="floorNumberPill">Floor ${floor.floorNumber}</span>
          <span class="floorElementTag">${floor.architecturalElement || "Slab"}</span>
        </div>
        <span class="floorStatusPill ${statusPillClass}">${statusPillContent}</span>
      </div>
      <div class="floorCardTitle">${floor.title}</div>
      <div class="floorCardBottom">
        <span>Mechanic: ${formatMechanicName(floor.mechanicType)}</span>
        <span class="floorCardXp">+${floor.xpReward || 100} XP</span>
      </div>
    `;

    card.addEventListener("click", () => {
      if (isUnlocked) {
        loadFloor(floor.floorId);
      } else {
        alert(
          `Floor ${floor.floorNumber} is locked! Complete Floor ${idx} first, or toggle Sandbox Mode in the top header.`
        );
      }
    });

    stackContainer.appendChild(card);
  });
}

/**
 * Helper to make mechanic names human friendly
 */
function formatMechanicName(mechanicType) {
  switch (mechanicType) {
    case "set_lattice_builder":
      return "Set Lattice";
    case "graph_wiring_board":
      return "Prereq Graph";
    case "rule_inspector_gate":
      return "Rule Inspector";
    case "polytope_tuner":
      return "Polytope Tuner";
    default:
      return mechanicType || "Puzzle";
  }
}

/**
 * Load a specific floor into the hands-on workbench (Right Pane)
 */
function loadFloor(floorId) {
  gameState.activeFloorId = floorId;
  gameState.activeCrackedElementIds = [];
  gameState.lastBuildResponse = null;
  gameState.selectedSabotageOptionId = null;

  const building = getActiveBuilding();
  const floor = getActiveFloor();
  if (!floor) return;

  // Update workbench header
  const elementPill = document.getElementById("floorElementPill");
  const indexBadge = document.getElementById("floorIndexBadge");
  const mechanicBadge = document.getElementById("floorMechanicBadge");
  const statusBadge = document.getElementById("floorStatusBadge");
  const titleEl = document.getElementById("floorMainTitle");

  if (elementPill) elementPill.textContent = floor.architecturalElement || "Slab";
  if (indexBadge) indexBadge.textContent = `Floor ${floor.floorNumber} of ${building.floors.length}`;
  if (mechanicBadge) mechanicBadge.textContent = `🧩 ${formatMechanicName(floor.mechanicType)}`;
  if (titleEl) titleEl.textContent = floor.title;

  const isCertified = gameState.certifiedFloorIds.has(floor.floorId);
  if (statusBadge) {
    if (isCertified) {
      statusBadge.className = "floorStatusBadge";
      statusBadge.style.background = "var(--sat-bg)";
      statusBadge.style.color = "var(--sat-color)";
      statusBadge.style.border = "1px solid var(--sat-border)";
      statusBadge.textContent = "✅ Certified (SAT)";
    } else {
      statusBadge.className = "floorStatusBadge";
      statusBadge.style.background = "var(--active-bg)";
      statusBadge.style.color = "var(--active-color)";
      statusBadge.style.border = "1px solid var(--active-border)";
      statusBadge.textContent = "🛠️ Active Floor";
    }
  }

  // Set 1-sentence prompt
  const promptText = document.getElementById("tryItPromptText");
  if (promptText) {
    promptText.textContent = floor.tryItPrompt || "Test this structure against live Z3 SMT constraints!";
  }

  // Reset feedback card
  hideBuildFeedback();

  // Populate blueprint card
  populateBlueprintCard(floor.blueprintCard);

  // Initialize widget with initialState
  initializeWidgetState(floor);
  renderActiveWidget();

  // Setup Beat 2
  setupBeat2Challenge(floor);

  // Re-render elevation to highlight active floor
  renderBuildingElevation();
}

/**
 * Initialize current widget state from floor.puzzleConfig.initialState
 */
function initializeWidgetState(floor) {
  const config = floor.puzzleConfig || {};
  const initial = config.initialState || {};

  switch (floor.mechanicType) {
    case "set_lattice_builder": {
      const initialSelected =
        initial.selectedStates ||
        initial.selectedSets ||
        initial.selectedIds ||
        initial.selected ||
        [];
      gameState.currentWidgetState = {
        selectedStates: new Set(initialSelected),
      };
      break;
    }
    case "graph_wiring_board": {
      const initialEdges = initial.edges || initial.selectedEdges || [];
      // Store edges as array of { from, to }
      gameState.currentWidgetState = {
        edges: JSON.parse(JSON.stringify(initialEdges)),
      };
      break;
    }
    case "rule_inspector_gate": {
      const initialAccepted =
        initial.acceptedBlockIds ||
        initial.acceptedIds ||
        [];
      gameState.currentWidgetState = {
        acceptedBlockIds: new Set(initialAccepted),
      };
      break;
    }
    case "polytope_tuner": {
      const sliderValues = {};
      const sliders = config.sliders || config.parameters || [];
      sliders.forEach((s) => {
        const id = s.id || s.key;
        if (id in initial) {
          sliderValues[id] = initial[id];
        } else if ("initialValue" in s) {
          sliderValues[id] = s.initialValue;
        } else {
          sliderValues[id] = s.min || 0;
        }
      });
      gameState.currentWidgetState = {
        sliderValues: sliderValues,
      };
      break;
    }
    default:
      gameState.currentWidgetState = JSON.parse(JSON.stringify(initial));
  }
}

/**
 * Render the interactive puzzle widget based on floor.mechanicType
 */
function renderActiveWidget() {
  const container = document.getElementById("puzzleWidgetContainer");
  if (!container) return;

  const floor = getActiveFloor();
  if (!floor) return;

  container.innerHTML = "";

  switch (floor.mechanicType) {
    case "set_lattice_builder":
      renderSetLatticeBuilder(floor, container);
      break;
    case "graph_wiring_board":
      renderGraphWiringBoard(floor, container);
      break;
    case "rule_inspector_gate":
      renderRuleInspectorGate(floor, container);
      break;
    case "polytope_tuner":
      renderPolytopeTuner(floor, container);
      break;
    default:
      container.innerHTML = `<p>Unknown puzzle mechanic: ${floor.mechanicType}</p>`;
  }
}

/* ==========================================================================
   Mechanic 1: set_lattice_builder
   ========================================================================== */
function renderSetLatticeBuilder(floor, container) {
  const config = floor.puzzleConfig || {};
  const rawCandidates =
    config.candidateStates ||
    config.candidates ||
    config.subsets ||
    config.options ||
    config.items ||
    [];

  const stateGrid = document.createElement("div");
  stateGrid.className = "setLatticeGrid";

  rawCandidates.forEach((candidate) => {
    // Normalize candidate representation
    const stateId = typeof candidate === "string" ? candidate : candidate.id;
    const stateLabel =
      typeof candidate === "string"
        ? candidate
        : candidate.label || candidate.title || candidate.id;
    const stateDesc =
      typeof candidate === "object"
        ? candidate.description || candidate.desc || ""
        : "";
    const itemsList =
      typeof candidate === "object" && Array.isArray(candidate.items)
        ? candidate.items
        : [];

    const isSelected = gameState.currentWidgetState.selectedStates.has(stateId);
    const isCracked = gameState.activeCrackedElementIds.includes(stateId);

    const card = document.createElement("div");
    card.className = "latticeStateCard";
    if (isSelected) card.classList.add("selected");
    if (isCracked) card.classList.add("crackedHighlight");

    card.innerHTML = `
      <div class="stateCardHeader">
        <span class="stateLabel">${stateLabel}</span>
        <span class="stateCheckboxPill">${isSelected ? "✓ Included" : "✗ Excluded"}</span>
      </div>
      ${stateDesc ? `<p class="stateCardDesc">${stateDesc}</p>` : ""}
      ${
        itemsList.length > 0
          ? `
        <div class="stateItemsList">
          ${itemsList.map((it) => `<span class="itemPill">${it}</span>`).join("")}
        </div>
      `
          : ""
      }
      ${isCracked ? `<div style="font-size:0.75rem; color:var(--unsat-color); font-weight:700;">⚡ CRACK IDENTIFIED</div>` : ""}
    `;

    card.addEventListener("click", () => {
      if (gameState.currentWidgetState.selectedStates.has(stateId)) {
        gameState.currentWidgetState.selectedStates.delete(stateId);
      } else {
        gameState.currentWidgetState.selectedStates.add(stateId);
      }
      // Clear crack indicator on interaction
      gameState.activeCrackedElementIds = [];
      renderActiveWidget();
    });

    stateGrid.appendChild(card);
  });

  container.appendChild(stateGrid);
}

/* ==========================================================================
   Mechanic 2: graph_wiring_board
   ========================================================================== */
function renderGraphWiringBoard(floor, container) {
  const config = floor.puzzleConfig || {};
  const nodes = config.nodes || [];
  const candidateEdges = config.candidateEdges || config.edges || [];

  const wrapper = document.createElement("div");
  wrapper.className = "graphWiringContainer";

  // Nodes Display Row
  const nodesRow = document.createElement("div");
  nodesRow.className = "graphNodesRow";
  nodes.forEach((node) => {
    const nodeEl = document.createElement("div");
    nodeEl.className = "graphNodeBadge";
    nodeEl.innerHTML = `
      <span>${node.label || node.id}</span>
      ${node.grade ? `<span class="nodeGradePill">Grade ${node.grade}</span>` : ""}
    `;
    nodesRow.appendChild(nodeEl);
  });
  wrapper.appendChild(nodesRow);

  // Directed Prerequisite Wiring Grid
  const edgesGrid = document.createElement("div");
  edgesGrid.className = "wiringEdgesGrid";

  candidateEdges.forEach((edge) => {
    const fromId = edge.from;
    const toId = edge.to;
    const edgeKey = `${fromId}->${toId}`;

    const isConnected = gameState.currentWidgetState.edges.some(
      (e) => e.from === fromId && e.to === toId
    );

    const isCracked =
      gameState.activeCrackedElementIds.includes(edgeKey) ||
      gameState.activeCrackedElementIds.includes(`${fromId}_to_${toId}`) ||
      gameState.activeCrackedElementIds.includes(fromId) ||
      gameState.activeCrackedElementIds.includes(toId);

    const card = document.createElement("div");
    card.className = "wiringEdgeCard";
    if (isConnected) card.classList.add("connected");
    if (isCracked) card.classList.add("crackedHighlight");

    const fromNode = nodes.find((n) => n.id === fromId) || { id: fromId };
    const toNode = nodes.find((n) => n.id === toId) || { id: toId };

    card.innerHTML = `
      <div class="edgeDirection">
        <span>${fromNode.id}</span>
        <span class="edgeArrow">──►</span>
        <span>${toNode.id}</span>
      </div>
      <span class="edgeStatusBadge">
        ${isConnected ? "✓ Connected" : "✗ Broken"}
      </span>
    `;

    card.addEventListener("click", () => {
      if (isConnected) {
        gameState.currentWidgetState.edges = gameState.currentWidgetState.edges.filter(
          (e) => !(e.from === fromId && e.to === toId)
        );
      } else {
        gameState.currentWidgetState.edges.push({ from: fromId, to: toId });
      }
      gameState.activeCrackedElementIds = [];
      renderActiveWidget();
    });

    edgesGrid.appendChild(card);
  });

  wrapper.appendChild(edgesGrid);
  container.appendChild(wrapper);
}

/* ==========================================================================
   Mechanic 3: rule_inspector_gate
   ========================================================================== */
function renderRuleInspectorGate(floor, container) {
  const config = floor.puzzleConfig || {};
  const blocks =
    config.candidateBlocks ||
    config.blocks ||
    config.candidates ||
    config.items ||
    [];

  const grid = document.createElement("div");
  grid.className = "ruleInspectorContainer";

  blocks.forEach((block) => {
    const isAccepted = gameState.currentWidgetState.acceptedBlockIds.has(block.id);
    const isCracked = gameState.activeCrackedElementIds.includes(block.id);

    const card = document.createElement("div");
    card.className = "contractorBlockCard";
    if (isAccepted) card.classList.add("accepted");
    else card.classList.add("rejected");

    if (isCracked) card.classList.add("crackedHighlight");

    let metaHtml = "";
    if (block.claimedComplexity !== undefined && block.actualComplexity !== undefined) {
      const isMismatch = block.claimedComplexity !== block.actualComplexity;
      metaHtml += `
        <div class="metaRow">
          <span class="metaKey">Claimed Complexity:</span>
          <span class="metaVal ${isMismatch ? "mismatch" : "ok"}">${block.claimedComplexity}</span>
        </div>
        <div class="metaRow">
          <span class="metaKey">Actual AST Depth:</span>
          <span class="metaVal ${isMismatch ? "mismatch" : "ok"}">${block.actualComplexity}</span>
        </div>
      `;
    }

    if (block.verbCount !== undefined) {
      const isTwin = block.verbCount > 1;
      metaHtml += `
        <div class="metaRow">
          <span class="metaKey">Cognitive Verbs:</span>
          <span class="metaVal ${isTwin ? "mismatch" : "ok"}">${block.verbCount} ${isTwin ? "(Conjoined Blob!)" : "(Atomic)"}</span>
        </div>
      `;
    }

    if (block.catalogGrounded !== undefined) {
      metaHtml += `
        <div class="metaRow">
          <span class="metaKey">Catalog Grounded:</span>
          <span class="metaVal ${block.catalogGrounded ? "ok" : "mismatch"}">${block.catalogGrounded ? "Brown & Burton (1978)" : "Hallucinated AI Bug"}</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="blockCardTop">
        <h4 class="blockTitle">${block.label || block.title || block.id}</h4>
      </div>
      <p class="blockDesc">${block.description || ""}</p>
      ${metaHtml ? `<div class="blockMetaList">${metaHtml}</div>` : ""}
      <div class="blockToggleActions">
        <button type="button" class="blockToggleBtn ${isAccepted ? "activeAccept" : ""}" data-action="accept">
          ✓ Accept Block
        </button>
        <button type="button" class="blockToggleBtn ${!isAccepted ? "activeReject" : ""}" data-action="reject">
          ❌ Reject (Fake)
        </button>
      </div>
      ${isCracked ? `<div style="font-size:0.75rem; color:var(--unsat-color); font-weight:700;">⚡ PROOF THEATER CRACK: This block violates the invariant!</div>` : ""}
    `;

    const acceptBtn = card.querySelector('[data-action="accept"]');
    const rejectBtn = card.querySelector('[data-action="reject"]');

    acceptBtn.addEventListener("click", () => {
      gameState.currentWidgetState.acceptedBlockIds.add(block.id);
      gameState.activeCrackedElementIds = [];
      renderActiveWidget();
    });

    rejectBtn.addEventListener("click", () => {
      gameState.currentWidgetState.acceptedBlockIds.delete(block.id);
      gameState.activeCrackedElementIds = [];
      renderActiveWidget();
    });

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

/* ==========================================================================
   Mechanic 4: polytope_tuner
   ========================================================================== */
function renderPolytopeTuner(floor, container) {
  const config = floor.puzzleConfig || {};
  const sliders = config.sliders || config.parameters || [];
  const sliderValues = gameState.currentWidgetState.sliderValues || {};

  const wrapper = document.createElement("div");
  wrapper.className = "polytopeContainer";

  // Calculate live metric for the gauge
  let liveGaugeHtml = "";
  if (config.formula && config.corridor) {
    // Flesch-Kincaid formula: FK = 0.39 * W_S + 11.8 * S_W - 15.59
    const ws = parseFloat(sliderValues.avgWordsPerSentence || 20.0);
    const sw = parseFloat(sliderValues.avgSyllablesPerWord || 1.8);
    const fkVal = 0.39 * ws + 11.8 * sw - 15.59;
    const inCorridor = fkVal >= config.corridor.min && fkVal <= config.corridor.max && ws <= 15.0;

    liveGaugeHtml = `
      <div class="polytopeGaugeCard">
        <div class="gaugeHeader">
          <span class="gaugeTitle">Flesch-Kincaid Readability Polytope (𝒫_SAT)</span>
          <span class="gaugeStatusPill ${inCorridor ? "inSat" : "outSat"}">
            ${inCorridor ? "✅ INSIDE SAT POLYTOPE" : "⚡ OUTSIDE FEASIBLE REGION"}
          </span>
        </div>
        <div class="gaugeReadout">
          FK Grade Level: <span style="color: ${inCorridor ? "var(--sat-color)" : "var(--unsat-color)"}; font-variant-numeric: tabular-nums;">${fkVal.toFixed(2)}</span>
          <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">
            (Grade 3 Corridor: [${config.corridor.min}, ${config.corridor.max}])
          </span>
        </div>
        <div class="gaugeFormula">Formula: ${config.formula}</div>
      </div>
    `;
  } else if (config.maxSpreadAllowed !== undefined) {
    // Distractor lengths: spread = max - min
    const vals = Object.values(sliderValues).map((v) => parseInt(v, 10));
    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);
    const spread = maxVal - minVal;
    const inSat = spread <= config.maxSpreadAllowed;

    liveGaugeHtml = `
      <div class="polytopeGaugeCard">
        <div class="gaugeHeader">
          <span class="gaugeTitle">Distractor Word Spread Invariant</span>
          <span class="gaugeStatusPill ${inSat ? "inSat" : "outSat"}">
            ${inSat ? "✅ BALANCED (SPREAD ≤ 3)" : "⚡ GIVEAWAY OUTLIER DETECTED"}
          </span>
        </div>
        <div class="gaugeReadout">
          Current Spread: <span style="color: ${inSat ? "var(--sat-color)" : "var(--unsat-color)"}; font-variant-numeric: tabular-nums;">${spread} words</span>
          <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">
            (Max Spread Allowed: ${config.maxSpreadAllowed})
          </span>
        </div>
      </div>
    `;
  } else if (sliderValues.sentenceWords !== undefined && sliderValues.observableVariables !== undefined) {
    // Working memory chunks
    const words = parseInt(sliderValues.sentenceWords, 10);
    const vars = parseInt(sliderValues.observableVariables, 10);
    const inSat = words <= 15 && vars <= 3;

    liveGaugeHtml = `
      <div class="polytopeGaugeCard">
        <div class="gaugeHeader">
          <span class="gaugeTitle">Grade 3 Working Memory Polytope</span>
          <span class="gaugeStatusPill ${inSat ? "inSat" : "outSat"}">
            ${inSat ? "✅ INSIDE MEMORY CEILING" : "⚡ COGNITIVE OVERLOAD"}
          </span>
        </div>
        <div class="gaugeReadout">
          Words: <span style="color: ${words <= 15 ? "var(--sat-color)" : "var(--unsat-color)"};">${words}/15</span> • 
          Variables: <span style="color: ${vars <= 3 ? "var(--sat-color)" : "var(--unsat-color)"};">${vars}/3</span>
        </div>
      </div>
    `;
  }

  if (liveGaugeHtml) {
    const gaugeContainer = document.createElement("div");
    gaugeContainer.innerHTML = liveGaugeHtml;
    wrapper.appendChild(gaugeContainer.firstElementChild);
  }

  // Sliders Grid
  const slidersGrid = document.createElement("div");
  slidersGrid.className = "slidersGrid";

  sliders.forEach((slider) => {
    const sliderId = slider.id || slider.key;
    const currentVal = sliderValues[sliderId] !== undefined ? sliderValues[sliderId] : slider.min;

    const card = document.createElement("div");
    card.className = "sliderItemCard";

    card.innerHTML = `
      <div class="sliderHeader">
        <label for="slider_${sliderId}" class="sliderLabel">${slider.label}</label>
        <span class="sliderValDisplay" id="val_${sliderId}">${currentVal}</span>
      </div>
      <input
        type="range"
        id="slider_${sliderId}"
        class="sliderInput"
        min="${slider.min}"
        max="${slider.max}"
        step="${slider.step || 1}"
        value="${currentVal}"
      />
      <div class="sliderBounds">
        <span>Min: ${slider.min}</span>
        ${slider.targetCeiling ? `<span>Ceiling: ≤ ${slider.targetCeiling}</span>` : ""}
        <span>Max: ${slider.max}</span>
      </div>
    `;

    const input = card.querySelector("input");
    input.addEventListener("input", (e) => {
      const newVal = parseFloat(e.target.value);
      gameState.currentWidgetState.sliderValues[sliderId] = newVal;
      const display = card.querySelector(`#val_${sliderId}`);
      if (display) display.textContent = newVal;
      // Re-evaluate live gauge
      renderActiveWidget();
    });

    slidersGrid.appendChild(card);
  });

  wrapper.appendChild(slidersGrid);
  container.appendChild(wrapper);
}

/**
 * Build the exact playerState payload for POST /api/game/verify-floor-build
 */
function getPlayerStatePayload(floor) {
  switch (floor.mechanicType) {
    case "set_lattice_builder": {
      const selectedArr = Array.from(gameState.currentWidgetState.selectedStates || []);
      return {
        selectedStates: selectedArr,
        selectedSets: selectedArr,
        selectedIds: selectedArr,
        selected: selectedArr,
      };
    }
    case "graph_wiring_board": {
      const edgesArr = gameState.currentWidgetState.edges || [];
      return {
        edges: edgesArr,
        selectedEdges: edgesArr,
      };
    }
    case "rule_inspector_gate": {
      const acceptedArr = Array.from(gameState.currentWidgetState.acceptedBlockIds || []);
      const allBlocks = floor.puzzleConfig.candidateBlocks || floor.puzzleConfig.blocks || [];
      const rejectedArr = allBlocks
        .map((b) => b.id)
        .filter((id) => !gameState.currentWidgetState.acceptedBlockIds.has(id));

      return {
        acceptedBlockIds: acceptedArr,
        rejectedBlockIds: rejectedArr,
        acceptedIds: acceptedArr,
        rejectedIds: rejectedArr,
      };
    }
    case "polytope_tuner": {
      const values = gameState.currentWidgetState.sliderValues || {};
      return {
        ...values,
        values: values,
        sliders: values,
      };
    }
    default:
      return gameState.currentWidgetState;
  }
}

/**
 * Handle Step 1 Z3 Stress-Test execution
 */
async function handleRunStressTest() {
  const floor = getActiveFloor();
  if (!floor) return;

  const testBtn = document.getElementById("runStressTestBtn");
  if (testBtn) {
    testBtn.disabled = true;
    testBtn.innerHTML = `<span class="btnIcon" aria-hidden="true">⏳</span> Evaluating SMT Kernel...`;
  }

  try {
    const playerState = getPlayerStatePayload(floor);

    const response = await fetch("/api/game/verify-floor-build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingId: gameState.activeBuildingId,
        floorId: floor.floorId,
        playerState: playerState,
      }),
    });

    if (!response.ok) {
      throw new Error(`Z3 Server Error (${response.status})`);
    }

    const result = await response.json();
    gameState.lastBuildResponse = result;
    gameState.activeCrackedElementIds = result.crackedElementIds || [];

    displayBuildFeedback(result);

    // Update left elevation tower
    if (result.isSat) {
      gameState.crackedFloorIds.delete(floor.floorId);
    } else {
      gameState.crackedFloorIds.add(floor.floorId);
    }
    renderBuildingElevation();

    // Re-render widget to show crack highlights
    renderActiveWidget();

    // Auto-reveal JIT blueprint card so the math explains the failure/success
    revealBlueprintCard();

    // Update Beat 2 Lock State
    updateBeat2LockState(floor);
  } catch (err) {
    console.error("Stress-test error:", err);
    alert(`Z3 Stress-Test failed: ${err.message}`);
  } finally {
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.innerHTML = `<span class="btnIcon" aria-hidden="true">⚡</span> Run Z3 Structural Stress-Test`;
    }
  }
}

/**
 * Display live Z3 feedback card
 */
function displayBuildFeedback(result) {
  const card = document.getElementById("z3BuildFeedbackCard");
  if (!card) return;

  card.classList.remove("hidden", "unsat", "sat");

  const iconEl = document.getElementById("feedbackIcon");
  const titleEl = document.getElementById("feedbackTitle");
  const verdictEl = document.getElementById("feedbackVerdictBadge");
  const headlineBox = document.getElementById("failureHeadlineBox");
  const headlineEl = document.getElementById("failureHeadlineText");
  const counterexampleBox = document.getElementById("counterexampleBox");
  const counterexampleEl = document.getElementById("counterexampleText");
  const hintBox = document.getElementById("repairHintBox");
  const hintEl = document.getElementById("repairHintText");
  const traceEl = document.getElementById("traceCodeBlock");

  if (result.isSat) {
    card.classList.add("sat");
    if (iconEl) iconEl.textContent = "✅";
    if (titleEl) titleEl.textContent = result.statusTitle || "Structure Holds! (SAT Proven)";
    if (verdictEl) verdictEl.textContent = "Z3 SAT";

    if (headlineBox) headlineBox.classList.add("hidden");

    if (counterexampleBox) {
      counterexampleBox.classList.remove("hidden");
      if (counterexampleEl) {
        counterexampleEl.textContent =
          result.counterexampleWitness ||
          "All formal SMT axioms and pedagogical invariants are satisfied.";
      }
    }

    if (hintBox) {
      hintBox.classList.remove("hidden");
      if (hintEl) {
        hintEl.textContent =
          result.repairHint ||
          "Structure is structurally sound! Proceed below to Beat 2 to spot the flaw and certify this floor.";
      }
    }
  } else {
    card.classList.add("unsat");
    if (iconEl) iconEl.textContent = "⚡";
    if (titleEl) titleEl.textContent = result.statusTitle || "Structural Crack Detected! (UNSAT)";
    if (verdictEl) verdictEl.textContent = "Z3 UNSAT";

    if (headlineBox) {
      headlineBox.classList.remove("hidden");
      if (headlineEl) headlineEl.textContent = result.failureHeadline || "Axiomatic refutation detected.";
    }

    if (counterexampleBox) {
      counterexampleBox.classList.remove("hidden");
      if (counterexampleEl) {
        counterexampleEl.textContent =
          result.counterexampleWitness || "Z3 solver isolated a counterexample witness.";
      }
    }

    if (hintBox) {
      hintBox.classList.remove("hidden");
      if (hintEl) headlineHintText(hintEl, result.repairHint);
    }
  }

  if (traceEl) {
    traceEl.textContent = result.z3SmtTrace || "; No trace returned.";
  }

  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function headlineHintText(element, text) {
  element.textContent = text || "Inspect the cracked elements above and adjust your configuration.";
}

/**
 * Hide build feedback card
 */
function hideBuildFeedback() {
  const card = document.getElementById("z3BuildFeedbackCard");
  if (card) card.classList.add("hidden");
}

/**
 * Reset to flawed starter state
 */
function handleResetStarterState() {
  const floor = getActiveFloor();
  if (!floor) return;
  initializeWidgetState(floor);
  gameState.activeCrackedElementIds = [];
  hideBuildFeedback();
  renderActiveWidget();
}

/**
 * Snap widget to valid target solution (Hint)
 */
function handleSnapToSolution() {
  const floor = getActiveFloor();
  if (!floor || !floor.puzzleConfig.targetSolutionState) {
    alert("No target solution hint registered for this floor.");
    return;
  }

  const target = floor.puzzleConfig.targetSolutionState;

  switch (floor.mechanicType) {
    case "set_lattice_builder": {
      const targetSelected =
        target.selectedStates ||
        target.selectedSets ||
        target.selectedIds ||
        target.selected ||
        [];
      gameState.currentWidgetState.selectedStates = new Set(targetSelected);
      break;
    }
    case "graph_wiring_board": {
      const targetEdges = target.edges || target.selectedEdges || [];
      gameState.currentWidgetState.edges = JSON.parse(JSON.stringify(targetEdges));
      break;
    }
    case "rule_inspector_gate": {
      const targetAccepted =
        target.acceptedBlockIds ||
        target.acceptedIds ||
        [];
      gameState.currentWidgetState.acceptedBlockIds = new Set(targetAccepted);
      break;
    }
    case "polytope_tuner": {
      const sliderValues = {};
      const sliders = floor.puzzleConfig.sliders || floor.puzzleConfig.parameters || [];
      sliders.forEach((s) => {
        const id = s.id || s.key;
        if (id in target) {
          sliderValues[id] = target[id];
        }
      });
      gameState.currentWidgetState.sliderValues = sliderValues;
      break;
    }
    default:
      gameState.currentWidgetState = JSON.parse(JSON.stringify(target));
  }

  gameState.activeCrackedElementIds = [];
  renderActiveWidget();
}

/**
 * Toggle blueprint card collapse
 */
function handleToggleBlueprint() {
  const card = document.getElementById("jitBlueprintCard");
  if (!card) return;
  card.classList.toggle("hidden");
  if (!card.classList.contains("hidden")) {
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/**
 * Reveal blueprint card
 */
function revealBlueprintCard() {
  const card = document.getElementById("jitBlueprintCard");
  if (card) {
    card.classList.remove("hidden");
  }
}

/**
 * Populate JIT blueprint card
 */
function populateBlueprintCard(blueprint) {
  if (!blueprint) return;
  const headlineEl = document.getElementById("blueprintHeadline");
  const analogyEl = document.getElementById("blueprintEverydayAnalogy");
  const ruleEl = document.getElementById("blueprintFormalRule");
  const takeawayEl = document.getElementById("blueprintTakeaway");

  if (headlineEl) headlineEl.textContent = blueprint.headline || "";
  if (analogyEl) analogyEl.textContent = blueprint.everydayAnalogy || "";
  if (ruleEl) ruleEl.textContent = blueprint.formalRule || "";
  if (takeawayEl) takeawayEl.textContent = blueprint.takeaway || "";
}

/* ==========================================================================
   Beat 2: Spot-the-Crack Sabotage Challenge (Certify Floor)
   ========================================================================== */

/**
 * Setup Beat 2 Sabotage Challenge
 */
function setupBeat2Challenge(floor) {
  const challenge = floor.sabotage_challenge || floor.sabotageChallenge;
  if (!challenge) return;

  const scenarioEl = document.getElementById("sabotageScenarioText");
  const promptEl = document.getElementById("sabotagePromptText");
  const optionsGrid = document.getElementById("sabotageOptionsGrid");
  const submitBtn = document.getElementById("submitSabotageBtn");
  const hintEl = document.getElementById("selectionHint");
  const feedbackCard = document.getElementById("sabotageFeedbackCard");
  const xpBadge = document.getElementById("beatXpBadge");

  if (xpBadge) xpBadge.textContent = `+${floor.xpReward || 100} Structural XP`;
  if (scenarioEl) scenarioEl.textContent = challenge.scenarioContext || "";
  if (promptEl) promptEl.textContent = challenge.prompt || "";

  if (feedbackCard) feedbackCard.classList.add("hidden");
  if (submitBtn) submitBtn.disabled = true;
  if (hintEl) hintEl.textContent = "Select an option above to test with Z3";

  if (optionsGrid) {
    optionsGrid.innerHTML = "";
    const options = challenge.options || [];

    options.forEach((opt) => {
      const card = document.createElement("label");
      card.className = "sabotageOptionCard";

      card.innerHTML = `
        <input
          type="radio"
          name="sabotageOption"
          class="optionRadio"
          value="${opt.optionId}"
        />
        <div class="optionContent">
          <span class="optionLabel">${opt.label}</span>
          ${opt.detail ? `<span class="optionDetail">${opt.detail}</span>` : ""}
        </div>
      `;

      card.addEventListener("click", () => {
        gameState.selectedSabotageOptionId = opt.optionId;
        const allOptionCards = optionsGrid.querySelectorAll(".sabotageOptionCard");
        allOptionCards.forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");

        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        if (submitBtn) submitBtn.disabled = false;
        if (hintEl) hintEl.textContent = `Selected: "${opt.label.slice(0, 35)}..."`;
      });

      optionsGrid.appendChild(card);
    });
  }

  updateBeat2LockState(floor);
}

/**
 * Update Beat 2 locked vs active state
 */
function updateBeat2LockState(floor) {
  const lockedOverlay = document.getElementById("beat2LockedOverlay");
  const activeContainer = document.getElementById("beat2ActiveContainer");
  if (!lockedOverlay || !activeContainer) return;

  const isBeat1Sat = gameState.lastBuildResponse && gameState.lastBuildResponse.isSat;
  const isFloorCertified = gameState.certifiedFloorIds.has(floor.floorId);

  // Unlocked if Sandbox mode, or if floor is already certified, or if Beat 1 was proven SAT
  const isUnlocked = gameState.sandboxMode || isFloorCertified || isBeat1Sat;

  if (isUnlocked) {
    lockedOverlay.classList.add("hidden");
    activeContainer.classList.remove("hidden");
  } else {
    lockedOverlay.classList.remove("hidden");
    activeContainer.classList.add("hidden");
  }
}

/**
 * Submit Beat 2 Sabotage Counterexample to Z3
 */
async function handleSubmitSabotageChallenge() {
  const floor = getActiveFloor();
  if (!floor || !gameState.selectedSabotageOptionId) return;

  const submitBtn = document.getElementById("submitSabotageBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="btnIcon" aria-hidden="true">⏳</span> Testing Refutation...`;
  }

  try {
    const response = await fetch("/api/game/verify-sabotage-challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingId: gameState.activeBuildingId,
        floorId: floor.floorId,
        selectedOptionId: gameState.selectedSabotageOptionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Z3 Server Error (${response.status})`);
    }

    const result = await response.json();
    displaySabotageFeedback(result, floor);
  } catch (err) {
    console.error("Sabotage error:", err);
    alert(`Sabotage challenge failed: ${err.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="btnIcon" aria-hidden="true">⚡</span> Submit Counterexample to Z3`;
    }
  }
}

/**
 * Display Beat 2 Sabotage verification feedback
 */
function displaySabotageFeedback(result, floor) {
  const card = document.getElementById("sabotageFeedbackCard");
  if (!card) return;

  card.classList.remove("hidden", "success", "failure");

  const iconEl = document.getElementById("sabotageResultIcon");
  const titleEl = document.getElementById("sabotageResultTitle");
  const badgeEl = document.getElementById("sabotageResultBadge");
  const explanationEl = document.getElementById("sabotageExplanationText");
  const traceEl = document.getElementById("sabotageTraceCodeBlock");
  const ascendRow = document.getElementById("ascendRow");

  if (result.correct) {
    card.classList.add("success");
    if (iconEl) iconEl.textContent = "✅";
    if (titleEl) titleEl.textContent = result.statusTitle || "Spot-the-Crack Certified! (SAT)";
    if (badgeEl) badgeEl.textContent = `✅ +${floor.xpReward || 100} XP`;

    // Award XP if floor wasn't certified previously
    if (!gameState.certifiedFloorIds.has(floor.floorId)) {
      gameState.certifiedFloorIds.add(floor.floorId);
      gameState.playerXp += floor.xpReward || 100;
      saveProgress();
      updateHudStats();
    }

    gameState.crackedFloorIds.delete(floor.floorId);
    renderBuildingElevation();
    renderBuildingTabs();

    if (ascendRow) ascendRow.classList.remove("hidden");
  } else {
    card.classList.add("failure");
    if (iconEl) iconEl.textContent = "❌";
    if (titleEl) titleEl.textContent = result.statusTitle || "Crack Missed! (Retry)";
    if (badgeEl) badgeEl.textContent = "Retry";

    if (ascendRow) ascendRow.classList.add("hidden");
  }

  if (explanationEl) {
    explanationEl.textContent = result.explanation || "";
  }

  if (traceEl) {
    traceEl.textContent = result.z3UnsatTrace || "; No refutation trace returned.";
  }

  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * Handle "🚀 Ascend to Next Floor Up →"
 */
function handleAscendToNextFloor() {
  const building = getActiveBuilding();
  if (!building) return;

  const currentIdx = building.floors.findIndex((f) => f.floorId === gameState.activeFloorId);
  if (currentIdx >= 0 && currentIdx < building.floors.length - 1) {
    const nextFloor = building.floors[currentIdx + 1];
    loadFloor(nextFloor.floorId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    // Current building completed! Check next building
    const bIdx = gameState.buildings.findIndex((b) => b.buildingId === gameState.activeBuildingId);
    if (bIdx >= 0 && bIdx < gameState.buildings.length - 1) {
      const nextBuilding = gameState.buildings[bIdx + 1];
      alert(`🎉 Congratulations! You have fully certified ${building.title}!\n\nAscending to ${nextBuilding.title}...`);
      selectBuilding(nextBuilding.buildingId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      alert(`🏆 MASTER ARCHITECT ACHIEVED!\n\nYou have certified all 12 floors across all 3 buildings in The Proof Architect's Tower!\nTotal Structural XP: ${gameState.playerXp} XP`);
    }
  }
}

/**
 * Update top HUD stats counters
 */
function updateHudStats() {
  const xpEl = document.getElementById("playerXpDisplay");
  if (xpEl) {
    xpEl.textContent = `${gameState.playerXp} XP`;
  }

  const certifiedEl = document.getElementById("certifiedFloorsDisplay");
  if (certifiedEl) {
    let totalFloors = 0;
    gameState.buildings.forEach((b) => {
      totalFloors += b.floors.length;
    });
    const certifiedCount = gameState.certifiedFloorIds.size;
    certifiedEl.textContent = `${certifiedCount} / ${totalFloors || 12}`;
  }

  const buildingProgressEl = document.getElementById("buildingProgressDisplay");
  const building = getActiveBuilding();
  if (buildingProgressEl && building) {
    const buildingCertified = building.floors.filter((f) =>
      gameState.certifiedFloorIds.has(f.floorId)
    ).length;
    buildingProgressEl.textContent = `${buildingCertified} / ${building.floors.length}`;
  }
}
