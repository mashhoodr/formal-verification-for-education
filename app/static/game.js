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
const STORAGE_KEY_AUDIO = "proofTower_audioEnabled";

/**
 * Procedural Web Audio API Sound Synthesizer
 * 100% zero external dependencies, wrapped in try/catch for headless/offline safety.
 */
class SoundEngine {
  constructor() {
    this.audioContext = null;
    this.audioEnabled = true;
  }

  ensureContext() {
    if (!this.audioEnabled) return null;
    try {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
      return this.audioContext;
    } catch (err) {
      console.warn("Web Audio context initialization suppressed:", err);
      return null;
    }
  }

  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
    try {
      localStorage.setItem(STORAGE_KEY_AUDIO, this.audioEnabled.toString());
    } catch (e) {}
    return this.audioEnabled;
  }

  /**
   * Crisp two-tone wood/stone mechanical block snap (triangle 320Hz -> 580Hz, 60ms)
   */
  playClickSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (err) {}
  }

  /**
   * Electric beam connection zap (sine 440Hz -> 880Hz pitch sweep, 90ms)
   */
  playWireSnapSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (err) {}
  }

  /**
   * Brief rising turbine hum (sawtooth 180Hz -> 420Hz, 180ms)
   */
  playStressTestChargeSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.17);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (err) {}
  }

  /**
   * Low sub-bass rumble + filtered white-noise stone fracture crunch (450ms)
   */
  playCrackEarthquakeSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // Sub-bass rumble
      const osc = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.45);
      rumbleGain.gain.setValueAtTime(0.32, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(rumbleGain);
      rumbleGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      // Noise fracture crunch
      const bufferLength = Math.floor(ctx.sampleRate * 0.45);
      const noiseBuffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.45);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.26, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.45);
    } catch (err) {}
  }

  /**
   * Bright ascending major arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
   */
  playSatChimeSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const stepDuration = 0.08;

      notes.forEach((freq, idx) => {
        const startTime = now + idx * stepDuration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch (err) {}
  }

  /**
   * Triumphant 4-note brass/synth fanfare (G4 -> C5 -> E5 -> G5) + heavy stamp thud
   */
  playLevelUpFanfareSound() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 392.00, start: 0.0, dur: 0.12 },
        { freq: 523.25, start: 0.12, dur: 0.12 },
        { freq: 659.25, start: 0.24, dur: 0.14 },
        { freq: 783.99, start: 0.38, dur: 0.45 }
      ];

      notes.forEach((n) => {
        const startTime = now + n.start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(n.freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + n.dur);
      });

      // Heavy stamp thud at the end
      const stampTime = now + 0.38;
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = "sine";
      thudOsc.frequency.setValueAtTime(140, stampTime);
      thudOsc.frequency.exponentialRampToValueAtTime(35, stampTime + 0.35);

      thudGain.gain.setValueAtTime(0.38, stampTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, stampTime + 0.35);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(stampTime);
      thudOsc.stop(stampTime + 0.35);
    } catch (err) {}
  }
}

const soundEngine = new SoundEngine();

/**
 * Spawn full-screen visual arcade game effects (particles, camera shakes, rubber stamp, crack flash)
 */
function spawnParticles(originX, originY, mode) {
  const overlay = document.getElementById("gameFxOverlay");
  if (!overlay) return;

  const defaultX = originX !== null && originX !== undefined ? originX : window.innerWidth / 2;
  const defaultY = originY !== null && originY !== undefined ? originY : window.innerHeight / 2;

  if (mode === "crack") {
    // 1. Earthquake camera shake on workbench
    const workbench = document.getElementById("workbenchPane");
    if (workbench) {
      workbench.classList.remove("workbenchEarthquakeShake");
      void workbench.offsetWidth;
      workbench.classList.add("workbenchEarthquakeShake");
      setTimeout(() => workbench.classList.remove("workbenchEarthquakeShake"), 450);
    }

    // 2. Flash jagged SVG crack screen banner
    const crackBanner = document.createElement("div");
    crackBanner.className = "crackBannerFlash";
    crackBanner.innerHTML = `
      <svg class="crackBannerSvg" viewBox="0 0 800 200" preserveAspectRatio="none">
        <path d="M 0,100 L 180,60 L 320,130 L 480,40 L 620,140 L 800,80" stroke="#ef4444" stroke-width="6" fill="none" stroke-linejoin="round"/>
        <path d="M 180,60 L 230,120 M 320,130 L 370,80 M 480,40 L 530,110" stroke="#fca5a5" stroke-width="3" fill="none"/>
      </svg>
    `;
    overlay.appendChild(crackBanner);
    setTimeout(() => crackBanner.remove(), 450);

    // 3. Spawn 24 flying red/amber rubble & spark particles
    const particleColors = ["#ef4444", "#f87171", "#dc2626", "#f59e0b", "#fbbf24", "#7f1d1d"];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement("div");
      p.className = "gameParticle";
      const size = Math.floor(Math.random() * 8) + 4;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = particleColors[i % particleColors.length];
      p.style.left = `${defaultX}px`;
      p.style.top = `${defaultY}px`;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 160 + 60;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance + (Math.random() * 40);
      const rot = (Math.random() * 720 - 360) + "deg";

      p.style.setProperty("--tx", `${tx}px`);
      p.style.setProperty("--ty", `${ty}px`);
      p.style.setProperty("--rot", rot);

      overlay.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  } else if (mode === "certified" || mode === "sat") {
    // 1. Spawn 40 golden/emerald star & confetti particles
    const confettiColors = ["#10b981", "#34d399", "#fbbf24", "#f59e0b", "#38bdf8", "#ffffff"];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("div");
      p.className = "gameParticle";
      const size = Math.floor(Math.random() * 9) + 5;
      p.style.width = `${size}px`;
      p.style.height = (i % 2 === 0 ? size : size * 1.6) + "px";
      p.style.backgroundColor = confettiColors[i % confettiColors.length];
      p.style.borderRadius = i % 3 === 0 ? "50%" : "2px";
      p.style.left = `${defaultX}px`;
      p.style.top = `${defaultY}px`;

      const angle = (Math.random() * Math.PI * 2);
      const distance = Math.random() * 220 + 80;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 20;
      const rot = (Math.random() * 720 - 360) + "deg";

      p.style.setProperty("--tx", `${tx}px`);
      p.style.setProperty("--ty", `${ty}px`);
      p.style.setProperty("--rot", rot);

      overlay.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }

    if (mode === "certified") {
      // 2. Rubber-Stamp Slam Animation
      const stamp = document.createElement("div");
      stamp.className = "rubberStampSlam";
      stamp.textContent = "✅ FLOOR CERTIFIED!";
      overlay.appendChild(stamp);
      setTimeout(() => stamp.remove(), 850);

      // 3. Floating +100 XP popup toward HUD
      const xpPopup = document.createElement("div");
      xpPopup.className = "xpArcadePopup";
      xpPopup.textContent = "+100 XP";
      xpPopup.style.left = `${defaultX - 40}px`;
      xpPopup.style.top = `${defaultY - 60}px`;
      overlay.appendChild(xpPopup);
      setTimeout(() => xpPopup.remove(), 1250);
    }
  }
}

/**
 * Update top header sound toggle button UI
 */
function updateAudioButtonUI() {
  const toggleSoundBtn = document.getElementById("toggleSoundBtn");
  if (!toggleSoundBtn) return;
  const isEnabled = soundEngine.audioEnabled;
  toggleSoundBtn.setAttribute("aria-pressed", isEnabled ? "true" : "false");
  toggleSoundBtn.innerHTML = isEnabled
    ? `<span class="soundIcon" aria-hidden="true">🔊</span><span class="soundText" id="soundToggleText">Audio: ON</span>`
    : `<span class="soundIcon" aria-hidden="true">🔇</span><span class="soundText" id="soundToggleText">Audio: MUTED</span>`;
}

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

    const storedAudio = localStorage.getItem(STORAGE_KEY_AUDIO);
    if (storedAudio !== null) {
      soundEngine.audioEnabled = (storedAudio === "true");
    }
    updateAudioButtonUI();
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
    soundEngine.playClickSound();
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
  const toggleSoundBtn = document.getElementById("toggleSoundBtn");
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener("click", () => {
      const isEnabled = soundEngine.toggleAudio();
      updateAudioButtonUI();
      if (isEnabled) {
        soundEngine.playClickSound();
      }
    });
  }

  const sandboxCheckbox = document.getElementById("sandboxModeCheckbox");
  if (sandboxCheckbox) {
    sandboxCheckbox.addEventListener("change", (event) => {
      soundEngine.playClickSound();
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
      soundEngine.playClickSound();
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

  // Activate Summit Energy Beacon Beam when entire building is certified
  const buildingCertifiedCount = building.floors.filter((f) =>
    gameState.certifiedFloorIds.has(f.floorId)
  ).length;
  const isBuildingCertified = buildingCertifiedCount === building.floors.length && building.floors.length > 0;

  const beaconBeamEl = document.getElementById("summitBeaconBeam");
  if (beaconBeamEl) {
    if (isBuildingCertified) {
      beaconBeamEl.classList.remove("hidden");
    } else {
      beaconBeamEl.classList.add("hidden");
    }
  }

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
    let windowClass = "windowLitLocked";

    if (isCertified) {
      statusPillClass = "certified";
      statusPillContent = "✅ CERTIFIED (SAT)";
      windowClass = "windowLitSat";
    } else if (isCracked) {
      statusPillClass = "cracked";
      statusPillContent = "⚡ CRACKED (UNSAT)";
      windowClass = "windowLitUnsat";
    } else if (isActive) {
      statusPillClass = "active";
      statusPillContent = "🛠️ ACTIVE FLOOR";
      windowClass = "windowLitActive";
    } else if (isUnlocked) {
      statusPillClass = "active";
      statusPillContent = "🔓 UNLOCKED";
      windowClass = "windowLitActive";
    }

    card.innerHTML = `
      <div class="floorCorniceBeam floorCorniceBeamTop"></div>
      <div class="floorPillar floorPillarLeft" aria-hidden="true"></div>
      <div class="floorPillar floorPillarRight" aria-hidden="true"></div>

      <div class="floorStoryFacade">
        <div class="floorWindowsRow" aria-hidden="true">
          <span class="floorArchWindow ${windowClass}"></span>
          <span class="floorArchWindow ${windowClass}"></span>
          <span class="floorArchWindow ${windowClass}"></span>
          <span class="floorArchWindow ${windowClass}"></span>
          <span class="floorArchWindow ${windowClass}"></span>
          <span class="floorArchWindow ${windowClass}"></span>
        </div>

        ${isCertified ? `
          <div class="z3SealMedallion" aria-hidden="true">
            <span class="sealEmbossIcon">✅</span>
            <span class="sealEmbossText">Z3 SAT</span>
          </div>
        ` : ""}

        ${isCracked ? `
          <svg class="floorCrackSvg" viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 0,28 L 50,42 L 85,16 L 140,46 L 180,18 L 240,36" stroke="#ef4444" stroke-width="3" fill="none" stroke-linejoin="round"/>
            <path d="M 85,16 L 110,32" stroke="#fca5a5" stroke-width="1.8" fill="none"/>
            <path d="M 140,46 L 165,55" stroke="#fca5a5" stroke-width="1.8" fill="none"/>
          </svg>
        ` : ""}

        ${isActive ? `
          <div class="scaffoldingOverlay" aria-hidden="true">
            <div class="scaffoldingHazardStripes"></div>
            <div class="weldingSparkContainer">
              <span class="weldingSpark"></span>
              <span class="weldingSpark"></span>
            </div>
          </div>
        ` : ""}

        ${!isUnlocked ? `
          <div class="blueprintBlueprintOverlay" aria-hidden="true">
            <span class="dimMarker">↕ h_grade</span>
            <span class="dimMarker">L_req</span>
          </div>
        ` : ""}

        <div class="floorStoryContent">
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
        </div>
      </div>

      <div class="floorCorniceBeam floorCorniceBeamBottom"></div>
    `;

    card.addEventListener("click", () => {
      soundEngine.playClickSound();
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
    card.className = "latticeStateCard latticeTileCard";
    if (isSelected) card.classList.add("selected");
    if (isCracked) card.classList.add("crackedHighlight");

    card.innerHTML = `
      ${isCracked ? `
        <svg class="tileCrackOverlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 50,0 L 45,35 L 60,50 L 35,75 L 50,100" stroke="#ef4444" stroke-width="3" fill="none" stroke-linejoin="round"/>
          <path d="M 45,35 L 25,45 M 60,50 L 75,65" stroke="#fca5a5" stroke-width="1.8" fill="none"/>
        </svg>
      ` : ""}
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
      soundEngine.playClickSound();
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
    card.className = "wiringEdgeCard edgeToggleCard";
    if (isConnected) card.classList.add("connected");
    if (isCracked) card.classList.add("crackedHighlight");

    const fromNode = nodes.find((n) => n.id === fromId) || { id: fromId };
    const toNode = nodes.find((n) => n.id === toId) || { id: toId };

    card.innerHTML = `
      ${isCracked ? `
        <svg class="tileCrackOverlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 50,0 L 45,35 L 60,50 L 35,75 L 50,100" stroke="#ef4444" stroke-width="3" fill="none" stroke-linejoin="round"/>
          <path d="M 45,35 L 25,45 M 60,50 L 75,65" stroke="#fca5a5" stroke-width="1.8" fill="none"/>
        </svg>
      ` : ""}
      <div class="edgeDirection">
        <span class="nodeSocketDot" aria-hidden="true"></span>
        <span>${fromNode.id}</span>
        <span class="edgeArrow">──►</span>
        <span>${toNode.id}</span>
        <span class="nodeSocketDot" aria-hidden="true"></span>
      </div>
      <span class="edgeStatusBadge">
        ${isConnected ? "✓ Connected" : "✗ Broken"}
      </span>
    `;

    card.addEventListener("click", () => {
      soundEngine.playWireSnapSound();
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
    card.className = "contractorBlockCard inspectorBlockCard";
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
      ${isCracked ? `
        <svg class="tileCrackOverlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 50,0 L 45,35 L 60,50 L 35,75 L 50,100" stroke="#ef4444" stroke-width="3" fill="none" stroke-linejoin="round"/>
          <path d="M 45,35 L 25,45 M 60,50 L 75,65" stroke="#fca5a5" stroke-width="1.8" fill="none"/>
        </svg>
      ` : ""}
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
      soundEngine.playClickSound();
      gameState.currentWidgetState.acceptedBlockIds.add(block.id);
      gameState.activeCrackedElementIds = [];
      renderActiveWidget();
    });

    rejectBtn.addEventListener("click", () => {
      soundEngine.playClickSound();
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
      soundEngine.playClickSound();
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

  soundEngine.playStressTestChargeSound();

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

    // Audio & FX triggers
    if (result.isSat) {
      soundEngine.playSatChimeSound();
      spawnParticles(null, null, "sat");
    } else {
      soundEngine.playCrackEarthquakeSound();
      spawnParticles(null, null, "crack");
    }

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
        soundEngine.playClickSound();
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

    // Audio fanfare & confetti + stamp celebration
    soundEngine.playLevelUpFanfareSound();
    spawnParticles(null, null, "certified");

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

    // Sub-bass crunch and crack rubble particle burst
    soundEngine.playCrackEarthquakeSound();
    spawnParticles(null, null, "crack");

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
 * Update top HUD stats counters, rank badge, and progress bar
 */
function updateHudStats() {
  const xpEl = document.getElementById("playerXpDisplay");
  if (xpEl) {
    xpEl.textContent = `${gameState.playerXp} XP`;
  }

  // Calculate rank
  const rankBadgeEl = document.getElementById("playerRankBadge");
  if (rankBadgeEl) {
    let rankTitle = "🔨 Apprentice";
    if (gameState.playerXp >= 1100) {
      rankTitle = "🏆 Master Proof Architect";
    } else if (gameState.playerXp >= 700) {
      rankTitle = "🏛️ Senior Architect";
    } else if (gameState.playerXp >= 300) {
      rankTitle = "📐 Journeyman";
    }
    rankBadgeEl.textContent = rankTitle;
  }

  let totalFloors = 0;
  gameState.buildings.forEach((b) => {
    totalFloors += b.floors.length;
  });
  const certifiedCount = gameState.certifiedFloorIds.size;

  const certifiedEl = document.getElementById("certifiedFloorsDisplay");
  if (certifiedEl) {
    certifiedEl.textContent = `${certifiedCount} / ${totalFloors || 12}`;
  }

  // Update Tower Integrity Progress Bar
  const integrityPercentEl = document.getElementById("towerIntegrityPercent");
  const progressBarFillEl = document.getElementById("hudProgressBarFill");
  const progressBarTrackEl = document.getElementById("hudProgressBarTrack");
  const totalCount = totalFloors || 12;
  const pct = Math.min(100, Math.round((certifiedCount / totalCount) * 100));

  if (integrityPercentEl) {
    integrityPercentEl.textContent = `${pct}%`;
  }
  if (progressBarFillEl) {
    progressBarFillEl.style.width = `${pct}%`;
  }
  if (progressBarTrackEl) {
    progressBarTrackEl.setAttribute("aria-valuenow", pct.toString());
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
