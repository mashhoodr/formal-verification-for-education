let gradeSpecsById = {};
let demoScenariosList = [];
let initialDraftsById = {};
let currentIterations = [];
let selectedIterationIndex = 0;

const scenarioSelect = document.getElementById("scenarioSelect");
const scenarioDescription = document.getElementById("scenarioDescription");
const gradeBandSelect = document.getElementById("gradeBandSelect");
const maxWordsInput = document.getElementById("maxWordsInput");
const maxSyllablesInput = document.getElementById("maxSyllablesInput");
const fkMinInput = document.getElementById("fkMinInput");
const fkMaxInput = document.getElementById("fkMaxInput");
const optionSpreadInput = document.getElementById("optionSpreadInput");
const quizDurationInput = document.getElementById("quizDurationInput");
const allowlistInput = document.getElementById("allowlistInput");
const assessmentJsonEditor = document.getElementById("assessmentJsonEditor");
const runRepairBtn = document.getElementById("runRepairBtn");
const verifyJsonBtn = document.getElementById("verifyJsonBtn");
const iterationTabs = document.getElementById("iterationTabs");
const statusBanner = document.getElementById("statusBanner");
const repairSummaryBox = document.getElementById("repairSummaryBox");
const metricsBar = document.getElementById("metricsBar");
const prescriptionsContainer = document.getElementById("prescriptionsContainer");
const questionsContainer = document.getElementById("questionsContainer");
const certificateBox = document.getElementById("certificateBox");
const smtPipelineDiagram = document.getElementById("smtPipelineDiagram");
const smtTrackerMatrix = document.getElementById("smtTrackerMatrix");
const smtProofSliceInspector = document.getElementById("smtProofSliceInspector");
const smtFilterBar = document.getElementById("smtFilterBar");
const smtInteractiveViewer = document.getElementById("smtInteractiveViewer");
const smtScriptPre = document.getElementById("smtScriptPre");
const smtScriptCode = document.getElementById("smtScriptCode");
const specSummaryPills = document.getElementById("specSummaryPills");
const activeGradeBandBadge = document.getElementById("activeGradeBandBadge");
const tabVisualBtn = document.getElementById("tabVisualBtn");
const tabSmtBtn = document.getElementById("tabSmtBtn");
const tabFeasibleMapBtn = document.getElementById("tabFeasibleMapBtn");
const visualProofPane = document.getElementById("visualProofPane");
const smtProofPane = document.getElementById("smtProofPane");
const feasibleMapPane = document.getElementById("feasibleMapPane");
const feasibleVerdictStrip = document.getElementById("feasibleVerdictStrip");
const feasibleSpaceSvg = document.getElementById("feasibleSpaceSvg");
const feasibleMathExplainer = document.getElementById("feasibleMathExplainer");
const probeWordsSlider = document.getElementById("probeWordsSlider");
const probeSyllablesSlider = document.getElementById("probeSyllablesSlider");
const probeWordsValLabel = document.getElementById("probeWordsValLabel");
const probeSyllablesValLabel = document.getElementById("probeSyllablesValLabel");
const presetDraftBtn = document.getElementById("presetDraftBtn");
const presetNaiveBtn = document.getElementById("presetNaiveBtn");
const presetSatBtn = document.getElementById("presetSatBtn");
const presetImpossibleBtn = document.getElementById("presetImpossibleBtn");
const symbolExplainerDialog = document.getElementById("symbolExplainerDialog");
const explainerDialogTitle = document.getElementById("explainerDialogTitle");
const explainerDialogBody = document.getElementById("explainerDialogBody");

let activeSmtFilter = "all";
let highlightedTrackerId = null;
let impossibleSpecOverride = false;

const syllableOverridesMap = {
  evaporation: 5,
  condensation: 4,
  precipitation: 5,
  simultaneously: 5,
  transformation: 4,
  continuously: 5,
  photosynthesis: 5,
  biodiversity: 6,
  ecosystem: 4,
  temperature: 4,
  atmosphere: 3,
  denominator: 5,
  numerator: 4,
  equivalent: 4,
  proportional: 4,
  simplification: 5,
  characterization: 6,
  subterranean: 5,
  camouflage: 3,
  predator: 3,
  environment: 4,
  adaptation: 4,
  area: 3,
  idea: 3,
  science: 2,
  ratio: 3,
  every: 2,
  water: 2,
  changes: 2,
  causes: 2,
};

function estimateWordSyllablesClient(rawWord) {
  const cleaned = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) {
    return { count: 0, method: "empty", vowelGroups: [] };
  }
  if (syllableOverridesMap[cleaned] !== undefined) {
    const groups = cleaned.match(/[aeiouy]+/g) || [];
    return {
      count: syllableOverridesMap[cleaned],
      method: "SYLLABLE_OVERRIDES lookup + vowel-group scan",
      vowelGroups: groups,
    };
  }
  if (cleaned.length <= 3) {
    return { count: 1, method: "short-word rule (<=3 chars)", vowelGroups: [cleaned] };
  }
  let stemmed = cleaned;
  if (stemmed.endsWith("es") || stemmed.endsWith("ed")) {
    if (!stemmed.endsWith("ted") && !stemmed.endsWith("ded") && !stemmed.endsWith("ses")) {
      stemmed = stemmed.slice(0, -2);
    }
  } else if (stemmed.endsWith("e") && !stemmed.endsWith("le")) {
    stemmed = stemmed.slice(0, -1);
  }
  const vowelGroups = stemmed.match(/[aeiouy]+/g) || [];
  return {
    count: Math.max(1, vowelGroups.length),
    method: "regex [aeiouy]+ vowel-cluster scan (silent-e stripped)",
    vowelGroups,
  };
}

function populateSpecInputs(gradeSpec, allowlistOverride) {
  maxWordsInput.value = gradeSpec.maxWordsPerSentence;
  maxSyllablesInput.value = gradeSpec.maxSyllablesPerWord;
  fkMinInput.value = gradeSpec.fleschKincaidMin;
  fkMaxInput.value = gradeSpec.fleschKincaidMax;
  optionSpreadInput.value = gradeSpec.maxOptionWordSpread;
  quizDurationInput.value = gradeSpec.quizDurationMinutes;
  const allowWords = allowlistOverride || gradeSpec.topicAllowlist || [];
  allowlistInput.value = allowWords.join(", ");
  renderSpecSummaryPills();
}

function renderSpecSummaryPills() {
  if (!specSummaryPills) {
    return;
  }
  const spec = readCurrentGradeSpec();
  if (activeGradeBandBadge && spec.label) {
    activeGradeBandBadge.textContent = spec.label;
  }
  const allowCount = spec.topicAllowlist ? spec.topicAllowlist.length : 0;
  const allowPreview =
    allowCount > 0 ? spec.topicAllowlist.slice(0, 3).join(", ") : "None";
  specSummaryPills.innerHTML = `
    <span class="specSummaryPill">Sentence: <strong>&le; ${spec.maxWordsPerSentence} words</strong></span>
    <span class="specSummaryPill">Word Cap: <strong>&le; ${spec.maxSyllablesPerWord} syllables</strong></span>
    <span class="specSummaryPill">FK Grade: <strong>${spec.fleschKincaidMin}&ndash;${spec.fleschKincaidMax}</strong></span>
    <span class="specSummaryPill">Option Spread: <strong>&le; ${spec.maxOptionWordSpread} words</strong></span>
    <span class="specSummaryPill">Time: <strong>&le; ${spec.quizDurationMinutes}m</strong></span>
    <span class="specSummaryPill">Allowlist: <strong>${allowPreview}</strong></span>
  `;
}

function readCurrentGradeSpec() {
  const bandId = gradeBandSelect.value;
  const baseSpec = gradeSpecsById[bandId];
  const allowlist = allowlistInput.value
    .split(",")
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0);

  return {
    ...baseSpec,
    maxWordsPerSentence: parseInt(maxWordsInput.value, 10),
    maxSyllablesPerWord: parseInt(maxSyllablesInput.value, 10),
    fleschKincaidMin: parseFloat(fkMinInput.value),
    fleschKincaidMax: parseFloat(fkMaxInput.value),
    maxOptionWordSpread: parseInt(optionSpreadInput.value, 10),
    quizDurationMinutes: parseInt(quizDurationInput.value, 10),
    topicAllowlist: allowlist,
  };
}

function renderIterationView(iterationRecord) {
  const verificationResult = iterationRecord.verificationResult;
  const assessment = iterationRecord.assessment;
  const metrics = verificationResult.metrics;

  assessmentJsonEditor.value = JSON.stringify(assessment, null, 2);
  repairSummaryBox.textContent = iterationRecord.repairSummary;

  if (verificationResult.status === "sat") {
    statusBanner.className = "statusBanner statusSat";
    statusBanner.innerHTML =
      "<strong>Z3 FORMAL PROOF: SAT (100% Verified)</strong> &mdash; All 6 grade specification constraints satisfied.";
    certificateBox.textContent = `SHA-256 Proof Certificate: ${verificationResult.certificateHash}`;
  } else {
    statusBanner.className = "statusBanner statusUnsat";
    statusBanner.innerHTML = `<strong>Z3 FORMAL PROOF: UNSAT (${verificationResult.unsatCore.length} Counterexamples in Unsat Core)</strong> &mdash; Click through repair iterations or see Z3 Optimizer bounds below.`;
    certificateBox.textContent = `UNSAT Core Trackers: [${verificationResult.unsatCore.join(", ")}]`;
  }

  metricsBar.innerHTML = `
    <div class="metricTile">
      <div class="metricLabel">Flesch-Kincaid Grade</div>
      <div class="metricValue">${metrics.fleschKincaidGrade}</div>
    </div>
    <div class="metricTile">
      <div class="metricLabel">Total Words</div>
      <div class="metricValue">${metrics.totalWords}</div>
    </div>
    <div class="metricTile">
      <div class="metricLabel">Est. Completion Time</div>
      <div class="metricValue">${metrics.estimatedCompletionSeconds}s</div>
    </div>
    <div class="metricTile">
      <div class="metricLabel">Unsat Core Size</div>
      <div class="metricValue">${verificationResult.unsatCore.length}</div>
    </div>
  `;

  if (verificationResult.prescriptions.length === 0) {
    prescriptionsContainer.innerHTML = "";
  } else {
    const itemsHtml = verificationResult.prescriptions
      .map(
        (presc) => `
        <div class="prescriptionCard">
          <strong>[${presc.trackerId}] (${presc.location})</strong><br/>
          ${presc.instruction}
        </div>
      `
      )
      .join("");
    prescriptionsContainer.innerHTML = `<h3>Z3 Optimizer Repair Prescriptions</h3>${itemsHtml}`;
  }

  const questionsHtml = assessment.questions
    .map((question, qIndex) => {
      const qMetrics = metrics.questionMetrics[qIndex];
      const optionsHtml = question.options
        .map((optText, optIndex) => {
          const isCorrect = optIndex === question.correctOptionIndex;
          const wordCount = qMetrics.optionWordCounts[optIndex];
          return `
            <div class="optionItem ${isCorrect ? "optionCorrect" : ""}">
              <span>${isCorrect ? "✓ " : ""}${optText}</span>
              <span>${wordCount} words</span>
            </div>
          `;
        })
        .join("");

      return `
        <div class="questionCard">
          <div><strong>${question.questionId.toUpperCase()}:</strong> ${question.stem}
            <span style="color:#64748b;font-size:0.8rem;">(Max sentence: ${qMetrics.stemMaxSentenceWords} words | Complexity: ${qMetrics.complexityScore})</span>
          </div>
          <div style="margin-top:0.5rem;">${optionsHtml}</div>
          <div style="margin-top:0.45rem;font-size:0.82rem;color:#475569;">
            <strong>Explanation:</strong> ${question.explanation}
          </div>
        </div>
      `;
    })
    .join("");

  questionsContainer.innerHTML = `<h3>Assessment Items & Metrics</h3>${questionsHtml}`;
  if (smtScriptCode) {
    smtScriptCode.textContent = verificationResult.smtLib2Script;
  } else if (smtScriptPre) {
    smtScriptPre.textContent = verificationResult.smtLib2Script;
  }
  renderSmtVisualization(verificationResult, assessment);

  if (probeWordsSlider && probeSyllablesSlider) {
    const safeSentences = Math.max(1, metrics.totalSentences || 1);
    const safeWords = Math.max(1, metrics.totalWords || 1);
    const iterWordsPerSent = Number((safeWords / safeSentences).toFixed(1));
    const iterSylPerWord = Number((metrics.totalSyllables / safeWords).toFixed(2));
    probeWordsSlider.value = Math.min(25, Math.max(4, iterWordsPerSent)).toString();
    probeSyllablesSlider.value = Math.min(2.2, Math.max(1.05, iterSylPerWord)).toString();
    impossibleSpecOverride = false;
  }
  renderFeasibleProofSpace();
}

function clipPolygonWithHalfPlane(polyPoints, aCoeff, bCoeff, cConst) {
  // Keeps points where aCoeff * x + bCoeff * y + cConst >= -1e-9
  if (!polyPoints || polyPoints.length === 0) {
    return [];
  }
  const outputList = [];
  const evalHalfPlane = (pt) => aCoeff * pt.x + bCoeff * pt.y + cConst;

  for (let idx = 0; idx < polyPoints.length; idx += 1) {
    const currentPt = polyPoints[idx];
    const prevPt = polyPoints[(idx + polyPoints.length - 1) % polyPoints.length];
    const currVal = evalHalfPlane(currentPt);
    const prevVal = evalHalfPlane(prevPt);
    const currInside = currVal >= -1e-9;
    const prevInside = prevVal >= -1e-9;

    if (currInside) {
      if (!prevInside) {
        const tRatio = prevVal / (prevVal - currVal);
        outputList.push({
          x: prevPt.x + tRatio * (currentPt.x - prevPt.x),
          y: prevPt.y + tRatio * (currentPt.y - prevPt.y),
        });
      }
      outputList.push(currentPt);
    } else if (prevInside) {
      const tRatio = prevVal / (prevVal - currVal);
      outputList.push({
        x: prevPt.x + tRatio * (currentPt.x - prevPt.x),
        y: prevPt.y + tRatio * (currentPt.y - prevPt.y),
      });
    }
  }
  return outputList;
}

function renderFeasibleProofSpace() {
  if (!feasibleSpaceSvg || !feasibleVerdictStrip || !feasibleMathExplainer) {
    return;
  }

  const currentSpec = readCurrentGradeSpec();
  const maxSentWords = impossibleSpecOverride
    ? 9.0
    : Number.isFinite(currentSpec.maxWordsPerSentence)
      ? currentSpec.maxWordsPerSentence
      : 14.0;
  const fkMin = impossibleSpecOverride
    ? 7.2
    : Number.isFinite(currentSpec.fleschKincaidMin)
      ? currentSpec.fleschKincaidMin
      : 2.5;
  const fkMax = impossibleSpecOverride
    ? 8.2
    : Number.isFinite(currentSpec.fleschKincaidMax)
      ? currentSpec.fleschKincaidMax
      : 4.5;
  const sylCap = impossibleSpecOverride ? 1.38 : 1.72;

  const probeX = parseFloat(probeWordsSlider ? probeWordsSlider.value : "14");
  const probeY = parseFloat(probeSyllablesSlider ? probeSyllablesSlider.value : "1.45");

  if (probeWordsValLabel) {
    probeWordsValLabel.textContent = `${probeX.toFixed(1)} words/sent`;
  }
  if (probeSyllablesValLabel) {
    probeSyllablesValLabel.textContent = `${probeY.toFixed(2)} syl/word`;
  }

  const probeFk = 0.39 * probeX + 11.8 * probeY - 15.59;
  const inSentWall = probeX <= maxSentWords + 1e-6;
  const inFkMinWall = probeFk >= fkMin - 1e-6;
  const inFkMaxWall = probeFk <= fkMax + 1e-6;
  const inSylWall = probeY <= sylCap + 1e-6;
  const isProbeInside = inSentWall && inFkMinWall && inFkMaxWall && inSylWall;

  // Coordinate space bounds: X in [2, 26], Y in [1.0, 2.35]
  const xMinDomain = 2.0;
  const xMaxDomain = 26.0;
  const yMinDomain = 1.0;
  const yMaxDomain = 2.35;

  const padLeft = 64;
  const padRight = 32;
  const padTop = 28;
  const padBottom = 50;
  const plotWidth = 780 - padLeft - padRight;
  const plotHeight = 430 - padTop - padBottom;

  const mapXToSvg = (xVal) =>
    padLeft + ((xVal - xMinDomain) / (xMaxDomain - xMinDomain)) * plotWidth;
  const mapYToSvg = (yVal) =>
    padTop + plotHeight - ((yVal - yMinDomain) / (yMaxDomain - yMinDomain)) * plotHeight;

  // Compute feasible polygon P_SAT via Sutherland-Hodgman half-plane clipping
  let feasiblePoly = [
    { x: 4.0, y: 1.05 },
    { x: xMaxDomain, y: 1.05 },
    { x: xMaxDomain, y: yMaxDomain },
    { x: 4.0, y: yMaxDomain },
  ];
  // 1) x <= maxSentWords  => -1*x + 0*y + maxSentWords >= 0
  feasiblePoly = clipPolygonWithHalfPlane(feasiblePoly, -1.0, 0.0, maxSentWords);
  // 2) y <= sylCap => 0*x - 1*y + sylCap >= 0
  feasiblePoly = clipPolygonWithHalfPlane(feasiblePoly, 0.0, -1.0, sylCap);
  // 3) 0.39x + 11.8y - 15.59 >= fkMin => 0.39x + 11.8y - (15.59 + fkMin) >= 0
  feasiblePoly = clipPolygonWithHalfPlane(feasiblePoly, 0.39, 11.8, -(15.59 + fkMin));
  // 4) 0.39x + 11.8y - 15.59 <= fkMax => -0.39x - 11.8y + (15.59 + fkMax) >= 0
  feasiblePoly = clipPolygonWithHalfPlane(feasiblePoly, -0.39, -11.8, 15.59 + fkMax);

  const isPolyEmpty = feasiblePoly.length < 3;

  // Find closest point in feasiblePoly to probe (or centroid) for Z3 vector demonstration
  let targetSatPt = { x: Math.min(maxSentWords - 1.5, 11.5), y: 1.48 };
  if (!isPolyEmpty) {
    const sumX = feasiblePoly.reduce((acc, pt) => acc + pt.x, 0);
    const sumY = feasiblePoly.reduce((acc, pt) => acc + pt.y, 0);
    targetSatPt = {
      x: sumX / feasiblePoly.length,
      y: sumY / feasiblePoly.length,
    };
  }

  // Update verdict strip
  if (isPolyEmpty) {
    feasibleVerdictStrip.className = "feasibleVerdictStrip statusUnsat";
    feasibleVerdictStrip.innerHTML = `
      <div>
        <strong>GLOBAL SPEC CONTRADICTION (<code>P_SAT = ∅</code>):</strong>
        Sentence Cap (<code>x ≤ ${maxSentWords}</code>), Syllable Cap (<code>y ≤ ${sylCap}</code>), and FK Floor (<code>FK ≥ ${fkMin}</code>) have <strong>zero overlap</strong>!
        An <code>if/else</code> loop will reject forever; <strong>Z3</strong> proves in 1 step that no valid quiz can exist.
      </div>
      <span class="smtStatusChip chipViolated">UNSAT FOR ALL QUIZZES</span>
    `;
  } else if (isProbeInside) {
    feasibleVerdictStrip.className = "feasibleVerdictStrip statusSat";
    feasibleVerdictStrip.innerHTML = `
      <div>
        <strong>Probe <code>P(${probeX.toFixed(1)}, ${probeY.toFixed(2)})</code> is INSIDE <code>P_SAT</code> (FK = ${probeFk.toFixed(2)}):</strong>
        Both <code>if/else</code> and <code>Z3</code> return <strong>PASS / SAT</strong> because all 4 linear half-planes are satisfied simultaneously.
      </div>
      <span class="smtStatusChip chipSat">INSIDE P_SAT (SAT)</span>
    `;
  } else {
    const failedNames = [];
    if (!inSentWall) failedNames.push(`x ≤ ${maxSentWords}`);
    if (!inFkMaxWall) failedNames.push(`FK ≤ ${fkMax}`);
    if (!inFkMinWall) failedNames.push(`FK ≥ ${fkMin}`);
    if (!inSylWall) failedNames.push(`y ≤ ${sylCap}`);
    feasibleVerdictStrip.className = "feasibleVerdictStrip statusUnsat";
    feasibleVerdictStrip.innerHTML = `
      <div>
        <strong>Probe <code>P(${probeX.toFixed(1)}, ${probeY.toFixed(2)})</code> is OUTSIDE <code>P_SAT</code> (FK = ${probeFk.toFixed(2)}):</strong>
        Violates <code>${failedNames.join(", ")}</code>.
        <code>if/else</code> is blind outside its pinhole; <strong>Z3</strong> computes the exact vector toward <code>(${targetSatPt.x.toFixed(1)}, ${targetSatPt.y.toFixed(2)})</code> inside the green region.
      </div>
      <span class="smtStatusChip chipViolated">OUTSIDE P_SAT (UNSAT)</span>
    `;
  }

  // Build SVG elements
  const xTicks = [4, 8, 12, 16, 20, 24];
  const yTicks = [1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3];

  const gridLinesSvg = [
    ...xTicks.map((xTick) => {
      const sx = mapXToSvg(xTick);
      return `
        <line x1="${sx}" y1="${padTop}" x2="${sx}" y2="${padTop + plotHeight}" stroke="#1e293b" stroke-width="1" />
        <text x="${sx}" y="${padTop + plotHeight + 18}" fill="#94a3b8" font-size="11" text-anchor="middle">${xTick}</text>
      `;
    }),
    ...yTicks.map((yTick) => {
      const sy = mapYToSvg(yTick);
      return `
        <line x1="${padLeft}" y1="${sy}" x2="${padLeft + plotWidth}" y2="${sy}" stroke="#1e293b" stroke-width="1" />
        <text x="${padLeft - 10}" y="${sy + 4}" fill="#94a3b8" font-size="11" text-anchor="end">${yTick.toFixed(1)}</text>
      `;
    }),
  ].join("");

  // Diagonal line helper for 0.39x + 11.8y - 15.59 = fkTarget => y = (fkTarget + 15.59 - 0.39x) / 11.8
  const fkYAtX = (fkTarget, xVal) => (fkTarget + 15.59 - 0.39 * xVal) / 11.8;

  const fkMaxX1 = xMinDomain;
  const fkMaxY1 = fkYAtX(fkMax, fkMaxX1);
  const fkMaxX2 = xMaxDomain;
  const fkMaxY2 = fkYAtX(fkMax, fkMaxX2);

  const fkMinX1 = xMinDomain;
  const fkMinY1 = fkYAtX(fkMin, fkMinX1);
  const fkMinX2 = xMaxDomain;
  const fkMinY2 = fkYAtX(fkMin, fkMinX2);

  const sentWallSvgX = mapXToSvg(maxSentWords);
  const sylWallSvgY = mapYToSvg(sylCap);

  const polyPointsAttr = feasiblePoly
    .map((pt) => `${mapXToSvg(pt.x).toFixed(1)},${mapYToSvg(pt.y).toFixed(1)}`)
    .join(" ");

  // Plot currentIterations trajectory points if available
  const trajectoryDotsSvg = currentIterations
    .map((iterItem, idx) => {
      const m = iterItem.verificationResult.metrics;
      const sxWords = Math.max(1, m.totalWords) / Math.max(1, m.totalSentences);
      const sySyl = m.totalSyllables / Math.max(1, m.totalWords);
      const clampedX = Math.min(xMaxDomain - 0.5, Math.max(xMinDomain + 0.5, sxWords));
      const clampedY = Math.min(yMaxDomain - 0.05, Math.max(yMinDomain + 0.05, sySyl));
      const cx = mapXToSvg(clampedX);
      const cy = mapYToSvg(clampedY);
      const isSatIter = iterItem.verificationResult.status === "SAT";
      const labelText = idx === 0 ? "Draft 0" : `Repair ${idx}`;
      return `
        <circle cx="${cx}" cy="${cy}" r="5.5" fill="${isSatIter ? "#22c55e" : "#f97316"}" stroke="#0f172a" stroke-width="1.5" />
        <text x="${cx + 8}" y="${cy - 7}" fill="#cbd5e1" font-size="10.5" font-weight="600">${labelText}</text>
      `;
    })
    .join("");

  const probeSvgX = mapXToSvg(probeX);
  const probeSvgY = mapYToSvg(probeY);
  const targetSvgX = mapXToSvg(targetSatPt.x);
  const targetSvgY = mapYToSvg(targetSatPt.y);

  const z3GuidanceVectorSvg =
    !isProbeInside && !isPolyEmpty
      ? `
      <line x1="${probeSvgX}" y1="${probeSvgY}" x2="${targetSvgX}" y2="${targetSvgY}"
        stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="6,4" marker-end="url(#z3ArrowHead)" />
      <text x="${(probeSvgX + targetSvgX) / 2}" y="${Math.min(probeSvgY, targetSvgY) - 12}"
        fill="#38bdf8" font-size="11" font-weight="700" text-anchor="middle">
        Z3 Optimal Vector (Δx=${(targetSatPt.x - probeX).toFixed(1)}, Δy=${(targetSatPt.y - probeY).toFixed(2)})
      </text>
    `
      : "";

  const probeLabelSvgY = probeSvgY > targetSvgY ? probeSvgY + 30 : probeSvgY - 24;

  const emptyPolyWarningSvg = isPolyEmpty
    ? `
      <rect x="${padLeft + 110}" y="${padTop + 95}" width="460" height="86" rx="10"
        fill="rgba(127, 29, 29, 0.92)" stroke="#f87171" stroke-width="2" />
      <text x="${padLeft + 340}" y="${padTop + 130}" fill="#fecaca" font-size="14" font-weight="700" text-anchor="middle">
        P_SAT = ∅ (Empty Feasible Polytope — Spec Contradiction!)
      </text>
      <text x="${padLeft + 340}" y="${padTop + 154}" fill="#fca5a5" font-size="11.5" text-anchor="middle">
        Max FK at (x=${maxSentWords}, y=${sylCap}) is ${(0.39 * maxSentWords + 11.8 * sylCap - 15.59).toFixed(2)}, which is below FK Floor ${fkMin.toFixed(1)}.
      </text>
    `
    : "";

  feasibleSpaceSvg.innerHTML = `
    <defs>
      <clipPath id="plotAreaClip">
        <rect x="${padLeft}" y="${padTop}" width="${plotWidth}" height="${plotHeight}" />
      </clipPath>
      <marker id="z3ArrowHead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#38bdf8" />
      </marker>
    </defs>

    <!-- Grid and Axes -->
    ${gridLinesSvg}
    <rect x="${padLeft}" y="${padTop}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#334155" stroke-width="1.5" />

    <!-- Clipped Geometric Layers -->
    <g clip-path="url(#plotAreaClip)">
      ${
        !isPolyEmpty
          ? `<polygon points="${polyPointsAttr}" fill="rgba(34, 197, 94, 0.25)" stroke="#22c55e" stroke-width="2.5" />`
          : ""
      }

      <!-- Diagonal FK Ceiling Wall -->
      <line x1="${mapXToSvg(fkMaxX1)}" y1="${mapYToSvg(fkMaxY1)}" x2="${mapXToSvg(fkMaxX2)}" y2="${mapYToSvg(fkMaxY2)}"
        stroke="#f97316" stroke-width="2.2" stroke-dasharray="7,5" />

      <!-- Diagonal FK Floor Wall -->
      <line x1="${mapXToSvg(fkMinX1)}" y1="${mapYToSvg(fkMinY1)}" x2="${mapXToSvg(fkMinX2)}" y2="${mapYToSvg(fkMinY2)}"
        stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="7,5" />

      <!-- Horizontal Syllable Ceiling Wall -->
      <line x1="${padLeft}" y1="${sylWallSvgY}" x2="${padLeft + plotWidth}" y2="${sylWallSvgY}"
        stroke="#a855f7" stroke-width="1.8" stroke-dasharray="4,4" />

      <!-- Vertical Sentence Cap Wall -->
      <line x1="${sentWallSvgX}" y1="${padTop}" x2="${sentWallSvgX}" y2="${padTop + plotHeight}"
        stroke="#ef4444" stroke-width="2.5" />

      <!-- Labels on Walls -->
      <text x="${sentWallSvgX + 6}" y="${padTop + 22}" fill="#f87171" font-size="11" font-weight="700">
        Sentence Cap (x ≤ ${maxSentWords})
      </text>
      <text x="${padLeft + 14}" y="${sylWallSvgY - 7}" fill="#c084fc" font-size="11" font-weight="700">
        Lexical Syllable Cap (y ≤ ${sylCap.toFixed(2)})
      </text>
      <text x="${mapXToSvg(7.5)}" y="${mapYToSvg(fkYAtX(fkMax, 7.5)) - 8}" fill="#fb923c" font-size="11" font-weight="700">
        FK Ceiling (0.39x + 11.8y - 15.59 ≤ ${fkMax.toFixed(1)})
      </text>
      <text x="${mapXToSvg(14.5)}" y="${mapYToSvg(fkYAtX(fkMin, 14.5)) + 16}" fill="#38bdf8" font-size="11" font-weight="700">
        FK Floor (0.39x + 11.8y - 15.59 ≥ ${fkMin.toFixed(1)})
      </text>

      ${
        !isPolyEmpty
          ? `<text x="${targetSvgX}" y="${targetSvgY + 4}" fill="#86efac" font-size="12" font-weight="800" text-anchor="middle">P_SAT</text>`
          : ""
      }

      ${trajectoryDotsSvg}
      ${z3GuidanceVectorSvg}

      <!-- Pinhole Flashlight Halo (what if/else sees: only the local point P) -->
      <circle cx="${probeSvgX}" cy="${probeSvgY}" r="18"
        fill="${isProbeInside ? "rgba(34, 197, 94, 0.22)" : "rgba(250, 204, 21, 0.18)"}"
        stroke="#facc15" stroke-width="1.5" stroke-dasharray="3,3" />
      <circle cx="${probeSvgX}" cy="${probeSvgY}" r="6.5"
        fill="#facc15" stroke="#0f172a" stroke-width="2" />
      <text x="${probeSvgX}" y="${probeLabelSvgY}" fill="#fef08a" font-size="11.5" font-weight="700" text-anchor="middle">
        Probe P(${probeX.toFixed(1)}, ${probeY.toFixed(2)}) [FK=${probeFk.toFixed(2)}]
      </text>

      ${emptyPolyWarningSvg}
    </g>

    <!-- Axis Titles -->
    <text x="${padLeft + plotWidth / 2}" y="418" fill="#cbd5e1" font-size="12.5" font-weight="700" text-anchor="middle">
      X-Axis: Average Words per Sentence (x = W / S)
    </text>
    <text x="18" y="${padTop + plotHeight / 2}" fill="#cbd5e1" font-size="12.5" font-weight="700" text-anchor="middle"
      transform="rotate(-90 18 ${padTop + plotHeight / 2})">
      Y-Axis: Average Syllables per Word (y = Y / W)
    </text>
  `;

  // Render Mathematical Notations & Plain-English Explanations below the graph
  feasibleMathExplainer.innerHTML = `
    <h4>Mathematical Formulation &amp; Plain-English Breakdown</h4>
    <div class="mathCardGrid">
      <div class="mathNotationCard">
        <div class="mathCardTitle">1. The Feasible Polytope (<code>P_SAT</code>) as Linear Half-Planes</div>
        <div class="mathFormulaBox">
          P_SAT = { (x, y) ∈ ℝ² |
            4.0 ≤ x ≤ ${maxSentWords.toFixed(1)}                           (H₁: Sentence Length Cap)
            ∧ 1.05 ≤ y ≤ ${sylCap.toFixed(2)}                         (H₂: Lexical Syllable Density)
            ∧ ${fkMin.toFixed(1)} ≤ 0.39x + 11.8y - 15.59 ≤ ${fkMax.toFixed(1)}   (H₃ ∩ H₄: Flesch-Kincaid Corridor)
          }
        </div>
        <p class="mathPlainExplanation">
          <strong>Simple explanation:</strong> Every rule in our specification is a straight boundary line on the 2D graph.
          Each inequality (<code>≤</code> or <code>≥</code>) shades one side of that line (a <em>half-plane</em>).
          A valid quiz must sit in the green polygon <code>P_SAT</code> where <strong>all four shaded regions overlap at once</strong>.
        </p>
      </div>

      <div class="mathNotationCard">
        <div class="mathCardTitle">2. Why <code>if/else</code> (Point Evaluation) ≠ <code>Z3</code> (Symbolic Polytope Solving)</div>
        <div class="mathFormulaBox">
          • Imperative if/else (Pointwise Membership Test):
            eval(p₀) : ℝ² → {True, False},   checks only whether fixed point p₀ = (${probeX.toFixed(1)}, ${probeY.toFixed(2)}) ∈ P_SAT

          • Z3 SMT Kernel + Optimizer (Existential &amp; Minimal-Repair Solving):
            1. Satisfiability:  ∃ p ∈ ℝ² such that p ∈ P_SAT ?   (Is the green polygon non-empty?)
            2. Minimal Repair:  p* = argmin_{p ∈ P_SAT} ( |x - x₀| + |y - y₀| )
        </div>
        <p class="mathPlainExplanation">
          <strong>Simple explanation:</strong> An <code>if/else</code> statement only plugs your current quiz numbers <code>(${probeX.toFixed(1)}, ${probeY.toFixed(2)})</code> into the formula and outputs <code>True</code> or <code>False</code>. It has no idea <em>where</em> the green region is—or that splitting a sentence reduces <code>x</code> while leaving <code>y</code> unchanged, causing Flesch-Kincaid to drop below the blue floor!
          <strong>Z3</strong> solves all lines simultaneously as algebraic equations: it knows the exact coordinates of the green polygon and calculates the shortest arrow <code>p₀ → p*</code> to land inside it.
        </p>
      </div>
    </div>

    <div class="mathNotationCard" style="margin-top:0.85rem;">
      <div class="mathCardTitle">3. Live Half-Plane Inequality Evaluation at Probe Point <code>P(${probeX.toFixed(1)}, ${probeY.toFixed(2)})</code></div>
      <table class="proofValueTable">
        <thead>
          <tr>
            <th>Half-Plane Constraint</th>
            <th>Linear Inequality Formula</th>
            <th>Plugged-In Probe Value</th>
            <th>Boundary Limit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>H₁: max_sentence_words</code></td>
            <td><code>x ≤ W_max</code></td>
            <td><code>x = ${probeX.toFixed(1)}</code></td>
            <td><code>≤ ${maxSentWords.toFixed(1)}</code></td>
            <td><span class="smtStatusChip ${inSentWall ? "chipSat" : "chipViolated"}">${inSentWall ? "SAT" : "VIOLATED"}</span></td>
          </tr>
          <tr>
            <td><code>H₂: lexical_syllable_cap</code></td>
            <td><code>y ≤ Y_max</code></td>
            <td><code>y = ${probeY.toFixed(2)}</code></td>
            <td><code>≤ ${sylCap.toFixed(2)}</code></td>
            <td><span class="smtStatusChip ${inSylWall ? "chipSat" : "chipViolated"}">${inSylWall ? "SAT" : "VIOLATED"}</span></td>
          </tr>
          <tr>
            <td><code>H₃: flesch_kincaid_max</code></td>
            <td><code>0.39x + 11.8y - 15.59 ≤ FK_max</code></td>
            <td><code>0.39(${probeX.toFixed(1)}) + 11.8(${probeY.toFixed(2)}) - 15.59 = ${probeFk.toFixed(2)}</code></td>
            <td><code>≤ ${fkMax.toFixed(1)}</code></td>
            <td><span class="smtStatusChip ${inFkMaxWall ? "chipSat" : "chipViolated"}">${inFkMaxWall ? "SAT" : "VIOLATED"}</span></td>
          </tr>
          <tr>
            <td><code>H₄: flesch_kincaid_min</code></td>
            <td><code>0.39x + 11.8y - 15.59 ≥ FK_min</code></td>
            <td><code>0.39(${probeX.toFixed(1)}) + 11.8(${probeY.toFixed(2)}) - 15.59 = ${probeFk.toFixed(2)}</code></td>
            <td><code>≥ ${fkMin.toFixed(1)}</code></td>
            <td><span class="smtStatusChip ${inFkMinWall ? "chipSat" : "chipViolated"}">${inFkMinWall ? "SAT" : "VIOLATED"}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function parseSmtStatements(smtText) {
  const statements = [];
  let parenDepth = 0;
  let currentBuffer = "";

  for (let charIdx = 0; charIdx < smtText.length; charIdx += 1) {
    const ch = smtText[charIdx];
    if (ch === "(") {
      if (parenDepth === 0) {
        currentBuffer = "";
      }
      parenDepth += 1;
      currentBuffer += ch;
    } else if (ch === ")") {
      parenDepth -= 1;
      currentBuffer += ch;
      if (parenDepth === 0 && currentBuffer.trim().length > 0) {
        statements.push(currentBuffer.replace(/\s+/g, " ").trim());
        currentBuffer = "";
      }
    } else if (parenDepth > 0) {
      currentBuffer += ch;
    }
  }
  return statements;
}

function formatSmtRationalOrValue(rawExpr) {
  const trimmed = rawExpr.trim();
  const divMatch = trimmed.match(/^\(\/\s+([0-9.]+)\s+([0-9.]+)\)$/);
  if (divMatch) {
    const num = parseFloat(divMatch[1]);
    const den = parseFloat(divMatch[2]);
    if (den !== 0) {
      return Number((num / den).toFixed(2)).toString();
    }
  }
  const toRealMatch = trimmed.match(/^\(to_real\s+([0-9.]+)\)$/);
  if (toRealMatch) {
    return toRealMatch[1];
  }
  return trimmed;
}

function classifyTrackerCategory(trackerId) {
  if (trackerId.includes("_sentence_words")) {
    return { key: "sentenceLength", label: "1. Sentence Length Bounds" };
  }
  if (trackerId.includes("_complex_words")) {
    return { key: "lexicalComplexity", label: "2. Lexical Syllable & Allowlist" };
  }
  if (trackerId.includes("flesch_kincaid")) {
    return { key: "readabilityBand", label: "3. Flesch-Kincaid Grade Band" };
  }
  if (trackerId.includes("_distractor_word_spread")) {
    return { key: "distractorBalance", label: "4. Distractor Length Fairness" };
  }
  if (trackerId.includes("_scaffolding_order")) {
    return { key: "scaffoldingProgression", label: "5. Progressive Scaffolding" };
  }
  return { key: "timeBudget", label: "6. Reading & Thinking Time Budget" };
}

function escapeHtmlText(rawStr) {
  if (rawStr === null || rawStr === undefined) return "";
  return String(rawStr)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegexLiteral(rawStr) {
  return rawStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSmtSyntax(stmtText, trackedIdsSet) {
  let escaped = escapeHtmlText(stmtText);
  escaped = escaped.replace(
    /\b(declare-fun|assert|check-sat|Int|Real|Bool|to_real)\b/g,
    '<span class="smtKw">$1</span>'
  );
  escaped = escaped.replace(
    /(=&gt;|&lt;=|&gt;=|\s=\s)/g,
    '<span class="smtOp">$1</span>'
  );
  trackedIdsSet.forEach((trackerName) => {
    const safePattern = new RegExp(`\\b(${escapeRegexLiteral(trackerName)})\\b`, "g");
    escaped = escaped.replace(
      safePattern,
      '<span class="smtTrackerSym">$1</span>'
    );
  });
  return escaped;
}

function buildSourceTextVisualHtml(trackerObj, verificationResult, assessment, gradeSpec) {
  const trackerId = trackerObj.trackerId;
  const metrics = verificationResult.metrics;
  const qMatch = trackerId.match(/^q(\d+)_/);
  const qIndex = qMatch ? parseInt(qMatch[1], 10) - 1 : 0;
  const questionObj =
    assessment && assessment.questions && assessment.questions[qIndex]
      ? assessment.questions[qIndex]
      : null;
  const qMetrics =
    metrics && metrics.questionMetrics && metrics.questionMetrics[qIndex]
      ? metrics.questionMetrics[qIndex]
      : null;

  let targetText = "";
  let locationLabel = "Whole Assessment";
  let complexWordsList = [];

  if (questionObj && qMetrics) {
    if (trackerId.includes("_stem_")) {
      targetText = questionObj.stem;
      locationLabel = `Question ${questionObj.questionId.toUpperCase()} Stem`;
      complexWordsList = qMetrics.stemComplexWords || [];
    } else if (trackerId.includes("_explanation_")) {
      targetText = questionObj.explanation;
      locationLabel = `Question ${questionObj.questionId.toUpperCase()} Explanation`;
      complexWordsList = qMetrics.explanationComplexWords || [];
    } else if (trackerId.includes("_opt")) {
      const optMatch = trackerId.match(/_opt(\d+)_/);
      const optIdx = optMatch ? parseInt(optMatch[1], 10) : 0;
      targetText = questionObj.options[optIdx] || "";
      locationLabel = `Question ${questionObj.questionId.toUpperCase()} Option ${optIdx + 1}`;
      complexWordsList =
        (qMetrics.optionComplexWords && qMetrics.optionComplexWords[optIdx]) || [];
    }
  }

  if (trackerObj.categoryKey === "sentenceLength" && targetText) {
    const wordsArr = targetText.match(/[A-Za-z0-9']+/g) || [];
    const maxAllowed = gradeSpec.maxWordsPerSentence;
    const pillsHtml = wordsArr
      .map((word, wIdx) => {
        const wordNum = wIdx + 1;
        const isOver = wordNum > maxAllowed;
        return `
          <span class="wordPill ${isOver ? "wordPillOver" : "wordPillOk"}">
            <span class="wordIdxTag">#${wordNum}</span>
            <span>${escapeHtmlText(word)}</span>
          </span>
        `;
      })
      .join("");
    return `
      <div class="sliceSectionHeading">
        <span>1. Source Text &amp; Word Count Tokenizer (${locationLabel})</span>
        <span>${wordsArr.length} words vs &le; ${maxAllowed} limit</span>
      </div>
      <div class="wordTokenStream">${pillsHtml}</div>
      <div style="font-size:0.74rem;color:#475569;margin-top:0.4rem;">
        Green pills (#1&ndash;#${maxAllowed}) are within the grade sentence cap; red pills (#${
      maxAllowed + 1
    }+) exceed <code>maxWordsPerSentence = ${maxAllowed}</code>.
      </div>
    `;
  }

  if (trackerObj.categoryKey === "lexicalComplexity" && targetText) {
    const wordsArr = targetText.match(/[A-Za-z0-9']+/g) || [];
    const complexSet = new Set(complexWordsList.map((w) => w.toLowerCase()));
    const allowSet = new Set((gradeSpec.topicAllowlist || []).map((w) => w.toLowerCase()));
    const pillsHtml = wordsArr
      .map((word) => {
        const lower = word.toLowerCase();
        if (complexSet.has(lower)) {
          return `<span class="wordPill wordPillOver">${escapeHtmlText(
            word
          )} <span class="wordIdxTag">(&gt;${gradeSpec.maxSyllablesPerWord} syl &bull; VIOLATION)</span></span>`;
        }
        if (allowSet.has(lower)) {
          return `<span class="wordPill wordPillAllow">${escapeHtmlText(
            word
          )} <span class="wordIdxTag">(allowlisted)</span></span>`;
        }
        return `<span class="wordPill wordPillOk">${escapeHtmlText(word)}</span>`;
      })
      .join("");
    return `
      <div class="sliceSectionHeading">
        <span>1. Lexical Complexity &amp; Allowlist Scanner (${locationLabel})</span>
        <span>${complexWordsList.length} unapproved complex words (target = 0)</span>
      </div>
      <div class="wordTokenStream">${pillsHtml}</div>
      <div style="font-size:0.74rem;color:#475569;margin-top:0.4rem;">
        Words exceeding <code>maxSyllablesPerWord = ${
          gradeSpec.maxSyllablesPerWord
        }</code> are flagged in red unless exempted by <code>topicAllowlist</code> (blue).
      </div>
    `;
  }

  if (trackerObj.categoryKey === "distractorBalance" && questionObj && qMetrics) {
    const counts = qMetrics.optionWordCounts || [];
    const maxCount = Math.max(...counts, 1);
    const minCount = Math.min(...counts);
    const spreadVal = qMetrics.optionWordSpread;
    const barsHtml = questionObj.options
      .map((optText, idx) => {
        const wCount = counts[idx] || 0;
        const widthPct = Math.max(8, Math.round((wCount / Math.max(maxCount, 15)) * 100));
        const isExtreme =
          spreadVal > gradeSpec.maxOptionWordSpread && (wCount === maxCount || wCount === minCount);
        return `
          <div class="optionBarRow">
            <strong>Option ${idx + 1}${idx === questionObj.correctOptionIndex ? " ✓" : ""}</strong>
            <div class="optionBarTrack">
              <div
                class="optionBarFill"
                style="width:${widthPct}%;background:${isExtreme ? "#ef4444" : "#10b981"};"
              ></div>
            </div>
            <span><strong>${wCount}</strong> words</span>
          </div>
        `;
      })
      .join("");
    return `
      <div class="sliceSectionHeading">
        <span>1. Distractor Word-Length Spread (${questionObj.questionId.toUpperCase()} Options)</span>
        <span>max(${maxCount}) &minus; min(${minCount}) = ${spreadVal} words (limit &le; ${
      gradeSpec.maxOptionWordSpread
    })</span>
      </div>
      <div class="optionSpreadBars">${barsHtml}</div>
    `;
  }

  if (trackerObj.categoryKey === "readabilityBand") {
    return `
      <div class="sliceSectionHeading">
        <span>1. Flesch-Kincaid Grade Formula Derivation</span>
        <span>FK = ${metrics.fleschKincaidGrade} (Band [${gradeSpec.fleschKincaidMin}, ${gradeSpec.fleschKincaidMax}])</span>
      </div>
      <div class="wordTokenStream" style="font-family:ui-monospace,monospace;font-size:0.76rem;">
        0.39 &times; (${metrics.totalWords} words / ${metrics.totalSentences} sentences) + 11.8 &times; (${metrics.totalSyllables} syllables / ${metrics.totalWords} words) &minus; 15.59 = <strong>${metrics.fleschKincaidGrade}</strong>
      </div>
    `;
  }

  if (trackerObj.categoryKey === "scaffoldingProgression") {
    const q1Score =
      metrics.questionMetrics[0] ? metrics.questionMetrics[0].complexityScore : 0;
    const q2Score =
      metrics.questionMetrics[1] ? metrics.questionMetrics[1].complexityScore : 0;
    return `
      <div class="sliceSectionHeading">
        <span>1. Sequential Complexity Scaffolding (Q1 &rarr; Q2)</span>
        <span>Tolerance: drop &le; ${gradeSpec.maxBackwardComplexityDrop} pts</span>
      </div>
      <div class="wordTokenStream" style="font-family:ui-monospace,monospace;font-size:0.76rem;">
        Q1 Complexity = <strong>${q1Score}</strong> &bull; Q2 Complexity = <strong>${q2Score}</strong> &bull; Condition: (${q2Score} + ${gradeSpec.maxBackwardComplexityDrop}) &ge; ${q1Score}
      </div>
    `;
  }

  const numQuestions = assessment && assessment.questions ? assessment.questions.length : 2;
  return `
    <div class="sliceSectionHeading">
      <span>1. Student Reading &amp; Thinking Time Derivation</span>
      <span>${metrics.estimatedCompletionSeconds}s vs ${gradeSpec.quizDurationMinutes * 60}s budget</span>
    </div>
    <div class="wordTokenStream" style="font-family:ui-monospace,monospace;font-size:0.76rem;">
      (${metrics.totalWords} words / ${gradeSpec.readingSpeedWpm} wpm) &times; 60s + (${numQuestions} questions &times; ${gradeSpec.perQuestionThinkSeconds}s think time) = <strong>${metrics.estimatedCompletionSeconds}s</strong>
    </div>
  `;
}

function buildProofSliceInspectorHtml(
  selectedTracker,
  declareTypeMap,
  factBindingsMap,
  factRawStmtMap,
  verificationResult,
  assessment,
  gradeSpec
) {
  const trackerId = selectedTracker.trackerId;
  const isUnsat = selectedTracker.isUnsat;

  // Identify all variables referenced inside this tracker's constraint expression
  const referencedVars = [];
  Object.keys(factBindingsMap).forEach((varName) => {
    const varRegex = new RegExp(`\\b${escapeRegexLiteral(varName)}\\b`);
    if (varRegex.test(selectedTracker.exprBody)) {
      referencedVars.push({
        varName,
        varType: declareTypeMap[varName] || "Int",
        actualValue: factBindingsMap[varName],
        factStmt: factRawStmtMap[varName] || `(assert (= ${varName} ${factBindingsMap[varName]}))`,
      });
    }
  });

  // Build populated S-expression with highlighted actual value chips
  let populatedChipExpr = escapeHtmlText(selectedTracker.exprBody);
  referencedVars.forEach((vInfo) => {
    const safeVarRegex = new RegExp(`\\b${escapeRegexLiteral(vInfo.varName)}\\b`, "g");
    populatedChipExpr = populatedChipExpr.replace(
      safeVarRegex,
      `<span class="populatedValChip" title="${vInfo.varName} = ${vInfo.actualValue}">${vInfo.actualValue}</span>`
    );
  });
  populatedChipExpr = populatedChipExpr.replace(
    /\(\/\s+([0-9.]+)\s+([0-9.]+)\)/g,
    (fullMatch) => formatSmtRationalOrValue(fullMatch)
  );

  // Build Variable Binding Table rows
  const varRowsHtml = referencedVars
    .map(
      (vInfo) => `
      <tr>
        <td class="varSymCell">
          <button type="button" class="clickableVarBtn explainSymbolTrigger" data-symbol-name="${vInfo.varName}">
            ${vInfo.varName} &#9432;
          </button>
        </td>
        <td><code>${vInfo.varType}</code></td>
        <td><span class="varValCell">${vInfo.actualValue}</span></td>
        <td><code>${escapeHtmlText(vInfo.factStmt)}</code></td>
      </tr>
    `
    )
    .join("");

  const matchingPrescription = (verificationResult.prescriptions || []).find(
    (p) => p.trackerId === trackerId
  );

  // Assemble complete isolated SMT-LIB2 proof slice with populated value comments
  const sliceLines = [
    `<span class="smtCommentLine">;; === Complete Isolated Z3 Sub-Proof for [${trackerId}] ===</span>`,
    `<span class="smtCommentLine">;; 1. Symbolic Declarations</span>`,
    ...referencedVars.map(
      (vInfo) =>
        `(declare-fun ${vInfo.varName} () ${vInfo.varType}) <span class="smtCommentLine">; measured variable</span>`
    ),
    `(declare-fun <span class="smtTrackerSym">${trackerId}</span> () Bool) <span class="smtCommentLine">; assert_and_track guard</span>`,
    ``,
    `<span class="smtCommentLine">;; 2. Ground-Truth Fact Bindings (Populated from Assessment)</span>`,
    ...referencedVars.map(
      (vInfo) =>
        `${escapeHtmlText(vInfo.factStmt)} <span class="smtCommentLine">; &rArr; ${vInfo.varName} := ${vInfo.actualValue}</span>`
    ),
    ``,
    `<span class="smtCommentLine">;; 3. Theorem Implication Rule (Symbolic &rarr; Populated)</span>`,
    `(assert (=&gt; <span class="smtTrackerSym">${trackerId}</span> ${escapeHtmlText(
      selectedTracker.exprBody
    )}))`,
    `<span class="smtCommentLine">;; &rArr; Populated with actual values:</span>`,
    `<span class="smtCommentLine">;;    (assert (=&gt; true ${escapeHtmlText(
      selectedTracker.concreteExpr
    )})) &rArr; (assert ${isUnsat ? "false" : "true"})</span>`,
    ``,
    `<span class="smtCommentLine">;; 4. Solver Resolution Under Tracker Assumption</span>`,
    `(check-sat-assuming (<span class="smtTrackerSym">${trackerId}</span>)) <span class="smtCommentLine">; &rArr; ${
      isUnsat ? "UNSAT (Added to Unsat Core!)" : "SAT (Constraint Verified!)"
    }</span>`,
  ];

  const sourceVisualHtml = buildSourceTextVisualHtml(
    selectedTracker,
    verificationResult,
    assessment,
    gradeSpec
  );

  return `
    <div class="sliceHeaderBar ${isUnsat ? "sliceHeaderUnsat" : "sliceHeaderSat"}">
      <div class="sliceHeaderTitle">
        <span class="trackerStatusTag ${isUnsat ? "tagUnsat" : "tagSat"}">
          ${isUnsat ? "✗ UNSAT CORE CONFLICT" : "✓ PROVEN SAT"}
        </span>
        <span>Deep Proof Inspector: <code>${trackerId}</code></span>
        <span style="font-size:0.8rem;font-weight:500;color:#475569;">(${
          selectedTracker.categoryLabel
        })</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;">
        <button type="button" class="explainTriggerBtn explainSymbolTrigger" data-symbol-name="${trackerId}">
          &#9432; How Is This Calculated? (Library &amp; Proof Explainer)
        </button>
      </div>
    </div>

    <div class="sliceBodyGrid">
      <div class="sliceSectionBox">
        ${sourceVisualHtml}
      </div>

      <div class="sliceSectionBox">
        <div class="sliceSectionHeading">
          <span>2. Z3 Variable Bindings (Actual Values Populated)</span>
          <span>${referencedVars.length} bound variable(s)</span>
        </div>
        <table class="varBindingTable">
          <thead>
            <tr>
              <th>Z3 Symbol</th>
              <th>Sort</th>
              <th>Actual Value</th>
              <th>SMT Fact Assertion</th>
            </tr>
          </thead>
          <tbody>
            ${varRowsHtml}
            <tr>
              <td class="varSymCell">${trackerId}</td>
              <td><code>Bool</code></td>
              <td><span class="varValCell">true</span></td>
              <td><code>Assumed by assert_and_track</code></td>
            </tr>
          </tbody>
        </table>
        ${
          matchingPrescription
            ? `<div class="prescriptionCard" style="margin:0;">
                <strong>Z3 Optimizer Repair Prescription:</strong> ${escapeHtmlText(
                  matchingPrescription.instruction
                )}
               </div>`
            : `<div style="font-size:0.76rem;color:#065f46;font-weight:600;">
                ✓ Value satisfies the formal theorem bound with zero repair required.
               </div>`
        }
      </div>

      <div class="sliceSectionBox sliceSectionBoxFull">
        <div class="sliceSectionHeading">
          <span>3. Step-by-Step Variable Substitution &amp; Modus Ponens Proof</span>
          <span>How Z3 Evaluates <code>${trackerId}</code></span>
        </div>
        <div class="substitutionStepsGrid">
          <div class="subStepCard">
            <div class="subStepLabel">Step A &bull; Symbolic Theorem Assertion</div>
            <div class="subStepCode">
              (assert (=&gt; <span class="smtTrackerSym">${trackerId}</span> ${escapeHtmlText(
    selectedTracker.exprBody
  )}))
            </div>
          </div>
          <div class="subStepCard subStepPopulated">
            <div class="subStepLabel">Step B &bull; Variables Populated with Actual Values</div>
            <div class="subStepCode">
              (assert (=&gt; <span class="populatedValChip">true</span> ${populatedChipExpr}))
            </div>
          </div>
          <div class="subStepCard ${isUnsat ? "subStepResultUnsat" : "subStepResultSat"}">
            <div class="subStepLabel">Step C &bull; Boolean Reduction &amp; Z3 Verdict</div>
            <div class="subStepCode">
              (assert (=&gt; true <strong>${isUnsat ? "false" : "true"}</strong>)) &rArr; ${
    isUnsat
      ? "<strong>&perp; CONTRADICTION (UNSAT CORE)</strong>"
      : "<strong>&#8868; VALID (PROVEN SAT)</strong>"
  }
            </div>
          </div>
        </div>
      </div>

      <div class="sliceSectionBox sliceSectionBoxFull">
        <div class="sliceSectionHeading">
          <span>4. Complete Isolated SMT-LIB2 Sub-Proof Script (With Populated Values)</span>
          <span>Self-contained Z3 proof slice for <code>${trackerId}</code></span>
        </div>
        <pre class="sliceSmtBlock">${sliceLines.join("\n")}</pre>
      </div>
    </div>
  `;
}

function openSymbolExplainerModal(
  selectedTracker,
  declareTypeMap,
  factBindingsMap,
  factRawStmtMap,
  verificationResult,
  assessment,
  gradeSpec
) {
  const trackerId = selectedTracker.trackerId;
  const metrics = verificationResult.metrics;
  const qMatch = trackerId.match(/^q(\d+)_/);
  const qIndex = qMatch ? parseInt(qMatch[1], 10) - 1 : 0;
  const questionObj =
    assessment && assessment.questions && assessment.questions[qIndex]
      ? assessment.questions[qIndex]
      : null;

  let targetText = "";
  let fieldDesc = "Assessment-wide text";
  if (questionObj) {
    if (trackerId.includes("_stem_")) {
      targetText = questionObj.stem;
      fieldDesc = `assessment.questions[${qIndex}].stem`;
    } else if (trackerId.includes("_explanation_")) {
      targetText = questionObj.explanation;
      fieldDesc = `assessment.questions[${qIndex}].explanation`;
    } else if (trackerId.includes("_opt")) {
      const optMatch = trackerId.match(/_opt(\d+)_/);
      const optIdx = optMatch ? parseInt(optMatch[1], 10) : 0;
      targetText = questionObj.options[optIdx] || "";
      fieldDesc = `assessment.questions[${qIndex}].options[${optIdx}]`;
    }
  }

  const referencedVars = [];
  Object.keys(factBindingsMap).forEach((varName) => {
    const varRegex = new RegExp(`\\b${escapeRegexLiteral(varName)}\\b`);
    if (varRegex.test(selectedTracker.exprBody)) {
      referencedVars.push({
        varName,
        varType: declareTypeMap[varName] || "Int",
        actualValue: factBindingsMap[varName],
        factStmt: factRawStmtMap[varName] || `(assert (= ${varName} ${factBindingsMap[varName]}))`,
      });
    }
  });

  const primaryVar = referencedVars[0] || {
    varName: `${trackerId}_val`,
    varType: "Int",
    actualValue: "0",
    factStmt: "",
  };

  explainerDialogTitle.innerHTML = `How <code>${trackerId}</code> &amp; <code>${primaryVar.varName}</code> Are Calculated`;

  let preProofDetailHtml = "";
  if (selectedTracker.categoryKey === "lexicalComplexity" && targetText) {
    const wordsArr = targetText.match(/[A-Za-z0-9']+/g) || [];
    const allowSet = new Set((gradeSpec.topicAllowlist || []).map((w) => w.toLowerCase()));
    const rowsHtml = wordsArr
      .map((word) => {
        const lower = word.toLowerCase();
        const sylInfo = estimateWordSyllablesClient(lower);
        const isAllowlisted = allowSet.has(lower);
        const exceedsCap = sylInfo.count > gradeSpec.maxSyllablesPerWord;
        const isFlagged = exceedsCap && !isAllowlisted;
        return `
          <tr style="${isFlagged ? "background:#fef2f2;font-weight:700;" : ""}">
            <td><code>"${escapeHtmlText(word)}"</code></td>
            <td><strong>${sylInfo.count}</strong> syllables</td>
            <td><code>${escapeHtmlText(sylInfo.method)}</code> (clusters: <code>${sylInfo.vowelGroups.join("-")}</code>)</td>
            <td>${
              isAllowlisted
                ? `<span class="trackerStatusTag tagSat">Exempt (in topicAllowlist)</span>`
                : exceedsCap
                ? `<span class="trackerStatusTag tagUnsat">&gt; ${gradeSpec.maxSyllablesPerWord} syl &rarr; FLAGGED (+1)</span>`
                : `<span class="trackerStatusTag tagSat">&le; ${gradeSpec.maxSyllablesPerWord} syl (OK)</span>`
            }</td>
          </tr>
        `;
      })
      .join("");

    preProofDetailHtml = `
      <div class="sliceSectionBox">
        <div class="sliceSectionHeading">
          <span>Step-by-Step Word &amp; Syllable Trace in Python (BEFORE Z3 Runs)</span>
          <span>Source: <code>${fieldDesc}</code></span>
        </div>
        <p style="margin:0 0 0.55rem;font-size:0.8rem;color:#334155;">
          <strong>Important Architecture Distinction:</strong> Z3 does not know English phonetics. Before Z3 starts,
          <code>count_syllables(word)</code> in <code>app/verifier/linguistic_analyzer.py</code> (using Python's built-in
          <code>re</code> regex engine + the <code>SYLLABLE_OVERRIDES</code> dictionary) scans each word in
          <code>"${escapeHtmlText(targetText)}"</code>:
        </p>
        <table class="syllableBreakdownTable">
          <thead>
            <tr>
              <th>Token</th>
              <th>Syllable Count</th>
              <th>Python Detection Rule (<code>linguistic_analyzer.py</code>)</th>
              <th>Cap Check (<code>maxSyllablesPerWord = ${gradeSpec.maxSyllablesPerWord}</code>)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top:0.55rem;font-size:0.8rem;font-weight:700;color:#0f172a;">
          &rArr; Python Output: <code>len(complex_words) = ${primaryVar.actualValue}</code> &mdash; passed into Z3 as integer constant <code>${primaryVar.varName} == ${primaryVar.actualValue}</code>.
        </div>
      </div>
    `;
  } else if (selectedTracker.categoryKey === "sentenceLength" && targetText) {
    const wordsArr = targetText.match(/[A-Za-z0-9']+/g) || [];
    preProofDetailHtml = `
      <div class="sliceSectionBox">
        <div class="sliceSectionHeading">
          <span>Step-by-Step Sentence &amp; Word Tokenization in Python (BEFORE Z3 Runs)</span>
          <span>Source: <code>${fieldDesc}</code></span>
        </div>
        <p style="margin:0;font-size:0.8rem;color:#334155;">
          <code>split_sentences()</code> and <code>extract_words()</code> in <code>app/verifier/linguistic_analyzer.py</code>
          use Python's standard <code>re</code> regex module (<code>WORD_RE = re.compile(r"[A-Za-z0-9']+")</code>) to tokenize
          <code>"${escapeHtmlText(targetText)}"</code> into <strong>${wordsArr.length} words</strong>.
          That integer (<code>${primaryVar.actualValue}</code>) is then bound to Z3 variable <code>${primaryVar.varName}</code>.
        </p>
      </div>
    `;
  } else {
    preProofDetailHtml = `
      <div class="sliceSectionBox">
        <div class="sliceSectionHeading">
          <span>Pre-Proof Deterministic Metric Calculation (BEFORE Z3 Runs)</span>
          <span>Module: <code>app/verifier/linguistic_analyzer.py</code></span>
        </div>
        <p style="margin:0;font-size:0.8rem;color:#334155;">
          <code>analyze_assessment()</code> deterministically computes the numeric metric from the assessment text
          (${referencedVars.map((v) => `<code>${v.varName} = ${v.actualValue}</code>`).join(", ")})
          using pure Python arithmetic and passes the exact number into Microsoft's <code>z3-solver</code>.
        </p>
      </div>
    `;
  }

  explainerDialogBody.innerHTML = `
    <div class="phaseBannerGrid">
      <div class="phaseCard phaseCardPython">
        <div class="phaseTag">Phase 1 &bull; Pre-Proof Extraction (Before Z3)</div>
        <div class="phaseTitle">Deterministic Linguistic Analyzer</div>
        <span class="phaseLibraryPill">Library: Python stdlib <code>re</code> + <code>linguistic_analyzer.py</code></span>
        <div style="font-size:0.79rem;color:#334155;">
          Tokenizes sentences, counts syllables via vowel clusters + <code>SYLLABLE_OVERRIDES</code>, filters out
          <code>topicAllowlist</code> terms, and outputs raw numeric facts (e.g., <code>${primaryVar.varName} = ${primaryVar.actualValue}</code>).
        </div>
      </div>
      <div class="pipelineArrow">&rarr;</div>
      <div class="phaseCard phaseCardZ3">
        <div class="phaseTag">Phase 2 &bull; Formal SMT Proof (Inside Z3)</div>
        <div class="phaseTitle">Z3 Theorem Prover &amp; Optimizer</div>
        <span class="phaseLibraryPill">Library: Microsoft <code>z3-solver</code> (C++ SMT Kernel)</span>
        <div style="font-size:0.79rem;color:#334155;">
          Declares symbolic variables (<code>z3.Int</code> / <code>z3.Real</code>), binds Phase 1's numbers as ground-truth axioms,
          and proves whether <code>${trackerId}</code> holds via <code>solver.assert_and_track()</code>.
        </div>
      </div>
    </div>

    ${preProofDetailHtml}

    <div class="sliceSectionBox">
      <div class="sliceSectionHeading">
        <span>Exact Python Z3 Code vs. Compiled SMT-LIB2 Proof</span>
        <span>Module: <code>app/verifier/z3_kernel.py</code></span>
      </div>
      <pre class="sliceSmtBlock"><span class="smtCommentLine"># --- Python (app/verifier/z3_kernel.py using z3-solver) ---</span>
solver = z3.Solver()
${referencedVars
  .map(
    (v) =>
      `${v.varName} = z3.${v.varType}("${v.varName}")\nsolver.add(${v.varName} == ${v.actualValue})  <span class="smtCommentLine"># Ground-truth value from Phase 1</span>`
  )
  .join("\n")}
solver.assert_and_track(
    <span class="smtCommentLine"># Formal theorem constraint:</span>
    ${escapeHtmlText(selectedTracker.exprBody)},
    "${trackerId}"
)
result = solver.check()  <span class="smtCommentLine"># &rArr; z3.${
    selectedTracker.isUnsat ? "unsat (contradiction proven!)" : "sat (verified!)"
  }</span>

<span class="smtCommentLine">;; --- Compiled SMT-LIB2 S-Expressions Sent to Z3 Kernel ---</span>
${referencedVars.map((v) => `(declare-fun ${v.varName} () ${v.varType})\n${escapeHtmlText(v.factStmt)}`).join("\n")}
(declare-fun <span class="smtTrackerSym">${trackerId}</span> () Bool)
(assert (=&gt; <span class="smtTrackerSym">${trackerId}</span> ${escapeHtmlText(
    selectedTracker.exprBody
  )}))
<span class="smtCommentLine">;; Populated inside Z3: (assert (=&gt; true ${escapeHtmlText(
    selectedTracker.concreteExpr
  )})) &rArr; ${selectedTracker.isUnsat ? "FALSE (UNSAT CORE)" : "TRUE (SAT)"}</span></pre>
    </div>
  `;

  symbolExplainerDialog.showModal();
}

function renderSmtVisualization(verificationResult, assessmentOverride) {
  const currentAssessment =
    assessmentOverride ||
    (currentIterations[selectedIterationIndex] &&
      currentIterations[selectedIterationIndex].assessment);
  const currentGradeSpec = readCurrentGradeSpec();
  const rawStatements = parseSmtStatements(verificationResult.smtLib2Script);
  const unsatSet = new Set(verificationResult.unsatCore || []);
  const declareTypeMap = {};
  const factBindingsMap = {};
  const factRawStmtMap = {};
  const trackedList = [];
  const trackedIdsSet = new Set();
  const structuredRows = [];

  rawStatements.forEach((stmt, idx) => {
    const declareMatch = stmt.match(/^\(declare-fun\s+([^\s()]+)\s+\(\)\s+([^\s()]+)\)$/);
    if (declareMatch) {
      const symName = declareMatch[1];
      const symType = declareMatch[2];
      declareTypeMap[symName] = symType;
      structuredRows.push({
        lineNumber: idx + 1,
        kind: "declare",
        symbolName: symName,
        symbolType: symType,
        rawStmt: stmt,
      });
      return;
    }

    const trackedMatch = stmt.match(/^\(assert\s+\(=>\s+([^\s()]+)\s+(.+)\)\)$/);
    if (trackedMatch) {
      const trackerId = trackedMatch[1];
      const exprBody = trackedMatch[2];
      const isUnsat = unsatSet.has(trackerId);
      const categoryInfo = classifyTrackerCategory(trackerId);
      trackedIdsSet.add(trackerId);

      const trackerObj = {
        lineNumber: idx + 1,
        trackerId,
        exprBody,
        isUnsat,
        categoryKey: categoryInfo.key,
        categoryLabel: categoryInfo.label,
      };
      trackedList.push(trackerObj);
      structuredRows.push({
        lineNumber: idx + 1,
        kind: "tracked",
        trackerId,
        exprBody,
        isUnsat,
        rawStmt: stmt,
      });
      return;
    }

    const factLeftMatch = stmt.match(/^\(assert\s+\(=\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(.+)\)\)$/);
    const factRightMatch = !factLeftMatch
      ? stmt.match(/^\(assert\s+\(=\s+(.+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\)\)$/)
      : null;

    if (factLeftMatch || factRightMatch) {
      const varName = factLeftMatch ? factLeftMatch[1] : factRightMatch[2];
      const rawVal = factLeftMatch ? factLeftMatch[2] : factRightMatch[1];
      const cleanVal = formatSmtRationalOrValue(rawVal);
      factBindingsMap[varName] = cleanVal;
      factRawStmtMap[varName] = stmt;
      structuredRows.push({
        lineNumber: idx + 1,
        kind: "fact",
        varName,
        cleanVal,
        rawStmt: stmt,
      });
      return;
    }

    structuredRows.push({
      lineNumber: idx + 1,
      kind: stmt.includes("check-sat") ? "checkSat" : "other",
      rawStmt: stmt,
    });
  });

  // Substitute measured ground-truth facts into each tracked theorem formula
  const trackedById = {};
  trackedList.forEach((item) => {
    let concreteExpr = item.exprBody;
    Object.keys(factBindingsMap).forEach((varKey) => {
      const valStr = factBindingsMap[varKey];
      concreteExpr = concreteExpr.replace(
        new RegExp(`\\b${escapeRegexLiteral(varKey)}\\b`, "g"),
        valStr
      );
    });
    concreteExpr = concreteExpr.replace(/\(\/\s+([0-9.]+)\s+([0-9.]+)\)/g, (fullMatch) =>
      formatSmtRationalOrValue(fullMatch)
    );
    item.concreteExpr = concreteExpr;
    trackedById[item.trackerId] = item;
  });

  // Default highlightedTrackerId to first UNSAT tracker (or first tracker if all SAT)
  if (!highlightedTrackerId || !trackedById[highlightedTrackerId]) {
    const firstUnsat = trackedList.find((t) => t.isUnsat);
    highlightedTrackerId = firstUnsat
      ? firstUnsat.trackerId
      : trackedList[0]
      ? trackedList[0].trackerId
      : null;
  }

  const totalFacts = Object.keys(factBindingsMap).length;
  const totalTracked = trackedList.length;
  const totalUnsat = unsatSet.size;
  const totalSat = totalTracked - totalUnsat;
  const isOverallSat = verificationResult.status === "sat";

  // 1. Render 3-Stage Z3 Pipeline Diagram
  smtPipelineDiagram.innerHTML = `
    <div class="pipelineStageCard">
      <div>
        <div class="pipelineStageStep">Stage 1 &bull; Linguistic Facts</div>
        <div class="pipelineStageTitle">${totalFacts} Ground-Truth Bindings</div>
        <div class="pipelineStageDesc">
          Deterministic analyzer measures words, syllables, FK grade, and reading time and binds them as Z3 constants.
        </div>
      </div>
      <div class="pipelineStageFormula">(assert (= metric_var measured_val))</div>
    </div>
    <div class="pipelineArrow">&rarr;</div>
    <div class="pipelineStageCard">
      <div>
        <div class="pipelineStageStep">Stage 2 &bull; Theorem Guardrails</div>
        <div class="pipelineStageTitle">${totalTracked} Tracked Implications</div>
        <div class="pipelineStageDesc">
          Each pedagogical rule is guarded by a named boolean tracker (<code>assert_and_track</code>) across 6 categories.
        </div>
      </div>
      <div class="pipelineStageFormula">(assert (=&gt; tracker_id (constraint)))</div>
    </div>
    <div class="pipelineArrow">&rarr;</div>
    <div class="pipelineStageCard ${isOverallSat ? "stageSat" : "stageUnsat"}">
      <div>
        <div class="pipelineStageStep">Stage 3 &bull; Z3 Solver Verdict</div>
        <div class="pipelineStageTitle">
          ${isOverallSat ? `SAT (${totalSat}/${totalTracked} Verified)` : `UNSAT (${totalUnsat} Core Conflicts)`}
        </div>
        <div class="pipelineStageDesc">
          ${
            isOverallSat
              ? "Every implication holds simultaneously. Cryptographic SHA-256 proof certificate issued."
              : `Z3 proved ${totalUnsat} tracker(s) contradict the measured facts and extracted the Unsat Core.`
          }
        </div>
      </div>
      <div class="pipelineStageFormula">(check-sat) &rarr; ${verificationResult.status.toUpperCase()}</div>
    </div>
  `;

  // 2. Render 6-Category Interactive Tracker Matrix
  const categoryOrder = [
    { key: "sentenceLength", label: "1. Sentence Length Bounds" },
    { key: "lexicalComplexity", label: "2. Lexical Syllable & Allowlist" },
    { key: "readabilityBand", label: "3. Flesch-Kincaid Grade Band" },
    { key: "distractorBalance", label: "4. Distractor Length Fairness" },
    { key: "scaffoldingProgression", label: "5. Progressive Scaffolding" },
    { key: "timeBudget", label: "6. Reading & Thinking Time Budget" },
  ];

  const categoryCardsHtml = categoryOrder
    .map((cat) => {
      const catItems = trackedList.filter((t) => t.categoryKey === cat.key);
      if (catItems.length === 0) {
        return "";
      }
      const passedCount = catItems.filter((t) => !t.isUnsat).length;
      const allPassed = passedCount === catItems.length;
      const pct = Math.round((passedCount / catItems.length) * 100);

      const chipsHtml = catItems
        .map((t) => {
          const isSelected = highlightedTrackerId === t.trackerId;
          return `
            <button
              type="button"
              class="trackerChipBtn ${t.isUnsat ? "trackerChipUnsat" : "trackerChipSat"} ${
            isSelected ? "trackerChipActive" : ""
          }"
              data-tracker-id="${t.trackerId}"
            >
              <div class="trackerChipTop">
                <span class="trackerChipName">${t.trackerId}</span>
                <span class="trackerStatusTag ${t.isUnsat ? "tagUnsat" : "tagSat"}">
                  ${t.isUnsat ? "✗ UNSAT CORE" : "✓ SAT"}
                </span>
              </div>
              <div class="trackerFormulaRow">
                <span>Eval: <code>${escapeHtmlText(t.concreteExpr)}</code></span>
                <span class="trackerEvalBadge">${t.isUnsat ? "&rarr; False" : "&rarr; True"}</span>
              </div>
            </button>
          `;
        })
        .join("");

      return `
        <div class="categoryCard">
          <div class="categoryCardHeader">
            <span class="categoryTitle">${cat.label}</span>
            <span class="categoryCountBadge ${allPassed ? "badgeAllSat" : "badgeHasUnsat"}">
              ${passedCount}/${catItems.length} SAT
            </span>
          </div>
          <div class="categoryProgressTrack">
            <div
              class="categoryProgressFill"
              style="width:${pct}%;background:${allPassed ? "#10b981" : "#ef4444"};"
            ></div>
          </div>
          <div class="trackerChipsList">${chipsHtml}</div>
        </div>
      `;
    })
    .join("");

  smtTrackerMatrix.innerHTML = `
    <div class="matrixHeaderRow">
      <h3>Interactive Z3 <code>assert_and_track</code> Proof Matrix</h3>
      <span class="matrixHint">Click any proof item below to inspect its complete isolated proof &amp; populated variables</span>
    </div>
    <div class="categoryGrid">${categoryCardsHtml}</div>
  `;

  // 2b. Render Deep Single-Tracker Proof Slice Inspector
  const selectedTrackerObj = trackedById[highlightedTrackerId];
  if (selectedTrackerObj) {
    smtProofSliceInspector.className = `smtProofSliceInspector ${
      selectedTrackerObj.isUnsat ? "sliceUnsat" : "sliceSat"
    }`;
    smtProofSliceInspector.innerHTML = buildProofSliceInspectorHtml(
      selectedTrackerObj,
      declareTypeMap,
      factBindingsMap,
      factRawStmtMap,
      verificationResult,
      currentAssessment,
      currentGradeSpec
    );
    smtProofSliceInspector.querySelectorAll(".explainSymbolTrigger").forEach((triggerBtn) => {
      triggerBtn.addEventListener("click", () => {
        openSymbolExplainerModal(
          selectedTrackerObj,
          declareTypeMap,
          factBindingsMap,
          factRawStmtMap,
          verificationResult,
          currentAssessment,
          currentGradeSpec
        );
      });
    });
  } else {
    smtProofSliceInspector.innerHTML = "";
  }

  smtTrackerMatrix.querySelectorAll(".trackerChipBtn").forEach((chipBtn) => {
    chipBtn.addEventListener("click", () => {
      const clickedId = chipBtn.getAttribute("data-tracker-id");
      highlightedTrackerId = clickedId;
      renderSmtVisualization(verificationResult, currentAssessment);
      smtProofSliceInspector.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  // 3. Render Filter Bar & Annotated SMT-LIB2 Code Viewer (with Populated Values inline)
  const filterOptions = [
    { id: "all", label: `All SMT Statements (${structuredRows.length})` },
    { id: "unsatOnly", label: `UNSAT Core Conflicts (${totalUnsat})` },
    { id: "trackedOnly", label: `Theorem Implications (${totalTracked})` },
    { id: "factsOnly", label: `Fact Bindings (${totalFacts})` },
    { id: "declaresOnly", label: "Variable Declarations" },
  ];

  smtFilterBar.innerHTML = filterOptions
    .map(
      (opt) => `
      <button
        type="button"
        class="smtFilterBtn ${activeSmtFilter === opt.id ? "activeFilter" : ""}"
        data-filter-id="${opt.id}"
      >
        ${opt.label}
      </button>
    `
    )
    .join("");

  smtFilterBar.querySelectorAll(".smtFilterBtn").forEach((fBtn) => {
    fBtn.addEventListener("click", () => {
      activeSmtFilter = fBtn.getAttribute("data-filter-id");
      renderSmtVisualization(verificationResult, currentAssessment);
    });
  });

  const filteredRows = structuredRows.filter((row) => {
    if (activeSmtFilter === "unsatOnly") {
      return row.kind === "tracked" && row.isUnsat;
    }
    if (activeSmtFilter === "trackedOnly") {
      return row.kind === "tracked";
    }
    if (activeSmtFilter === "factsOnly") {
      return row.kind === "fact";
    }
    if (activeSmtFilter === "declaresOnly") {
      return row.kind === "declare";
    }
    return true;
  });

  if (filteredRows.length === 0) {
    smtInteractiveViewer.innerHTML = `
      <div style="padding:1rem;color:#94a3b8;text-align:center;">
        No SMT-LIB2 statements match this filter (0 conflicts when proof is SAT).
      </div>
    `;
    return;
  }

  smtInteractiveViewer.innerHTML = filteredRows
    .map((row) => {
      let rowClass = "smtLineRow";
      let badgeHtml = "";
      let trackerAttr = "";
      let populatedSublineHtml = "";

      if (row.kind === "tracked") {
        rowClass += row.isUnsat ? " smtLineUnsat" : " smtLineSat";
        if (highlightedTrackerId === row.trackerId) {
          rowClass += " smtLineFlash";
        }
        trackerAttr = `data-line-tracker="${row.trackerId}"`;
        const tItem = trackedById[row.trackerId];
        if (tItem) {
          populatedSublineHtml = `<span class="smtPopulatedSubline">&rdsh; Populated values: (assert (=&gt; true ${escapeHtmlText(
            tItem.concreteExpr
          )})) &rArr; ${row.isUnsat ? "FALSE (UNSAT)" : "TRUE (SAT)"}</span>`;
        }
        badgeHtml = row.isUnsat
          ? `<span class="smtLineAnnotation annotUnsat">✗ UNSAT CORE</span>`
          : `<span class="smtLineAnnotation annotSat">✓ SAT</span>`;
      } else if (row.kind === "fact") {
        rowClass += " smtLineFact";
        badgeHtml = `<span class="smtLineAnnotation annotFact">${escapeHtmlText(
          row.varName
        )} := ${escapeHtmlText(row.cleanVal)}</span>`;
      } else if (row.kind === "checkSat") {
        rowClass += " smtLineCheck";
        badgeHtml = `<span class="smtLineAnnotation ${
          isOverallSat ? "annotSat" : "annotUnsat"
        }">&rarr; ${verificationResult.status.toUpperCase()}</span>`;
      } else if (row.kind === "declare" && highlightedTrackerId === row.symbolName) {
        rowClass += " smtLineFlash";
      }

      return `
        <div class="${rowClass}" ${trackerAttr}>
          <span class="smtLineNum">${row.lineNumber}</span>
          <span class="smtLineCode">
            ${highlightSmtSyntax(row.rawStmt, trackedIdsSet)}
            ${populatedSublineHtml}
          </span>
          ${badgeHtml}
        </div>
      `;
    })
    .join("");
}

function renderIterationTabs() {
  iterationTabs.innerHTML = "";
  currentIterations.forEach((iterRecord, idx) => {
    if (idx > 0) {
      const connector = document.createElement("div");
      connector.className = "iterConnector";
      connector.setAttribute("aria-hidden", "true");
      connector.textContent = "↓";
      iterationTabs.appendChild(connector);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    const statusBadge = iterRecord.verificationResult.status.toUpperCase();
    const unsatCount = iterRecord.verificationResult.unsatCore.length;
    const isSatStep = statusBadge === "SAT";
    btn.className = `iterStepBtn ${idx === selectedIterationIndex ? "activeIter" : ""}`;
    const stepLabel = idx === 0 ? "Step 0: Initial Draft" : `Step ${idx}: Auto-Repair ${idx}`;
    const detailBadge = isSatStep ? "SAT (Verified)" : `UNSAT (${unsatCount} issues)`;
    btn.innerHTML = `<span>${stepLabel}</span> <span class="smtStatusChip ${isSatStep ? "chipSat" : "chipViolated"}" style="padding:0.1rem 0.42rem;font-size:0.68rem;">${detailBadge}</span>`;
    btn.addEventListener("click", () => {
      selectedIterationIndex = idx;
      renderIterationTabs();
      renderIterationView(currentIterations[selectedIterationIndex]);
    });
    iterationTabs.appendChild(btn);
  });
}

async function executeRepairLoop() {
  try {
    const scenarioId = scenarioSelect.value;
    const gradeSpec = readCurrentGradeSpec();
    const response = await fetch("/api/generate-and-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId,
        gradeSpec,
        maxIterations: 3,
      }),
    });
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const resultData = await response.json();
    currentIterations = resultData.iterations;
    selectedIterationIndex = 0;
    renderIterationTabs();
    renderIterationView(currentIterations[0]);
  } catch (err) {
    statusBanner.className = "statusBanner statusUnsat";
    statusBanner.textContent = `Repair Loop Error: ${err.message}`;
  }
}

async function executeVerifyEditedJson() {
  try {
    const parsedAssessment = JSON.parse(assessmentJsonEditor.value);
    const gradeSpec = readCurrentGradeSpec();
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessment: parsedAssessment,
        gradeSpec,
      }),
    });
    const verificationResult = await response.json();
    currentIterations = [
      {
        iterationIndex: 0,
        assessment: parsedAssessment,
        verificationResult,
        repairSummary: "Direct Z3 verification of custom edited Assessment JSON.",
      },
    ];
    selectedIterationIndex = 0;
    renderIterationTabs();
    renderIterationView(currentIterations[0]);
  } catch (err) {
    statusBanner.className = "statusBanner statusUnsat";
    statusBanner.textContent = `Invalid Assessment JSON: ${err.message}`;
  }
}

// ============================================================================
// STAGE 0: CURRICULUM SLO -> ATOMIC KC ONTOLOGY PROOF CONTROLLER
// ============================================================================
let currentStage = 0; // 0 for Stage 0, 1 for Stage 1
let stage0ScenariosList = [];
let currentStage0Iterations = [];
let selectedStage0IterationIndex = 0;
let stage0ActiveView = "kcs"; // "kcs" | "smt" | "boundaries"
let highlightedStage0TrackerId = null;

const stage0ToggleBtn = document.getElementById("stage0ToggleBtn");
const stage1ToggleBtn = document.getElementById("stage1ToggleBtn");
const stage0Container = document.getElementById("stage0Container");
const stage1Container = document.getElementById("stage1Container");

const scenarioSelectStage0 = document.getElementById("scenarioSelectStage0");
const scenarioDescriptionStage0 = document.getElementById("scenarioDescriptionStage0");
const triadSummaryCardStage0 = document.getElementById("triadSummaryCardStage0");
const triadGradeBandBadgeStage0 = document.getElementById("triadGradeBandBadgeStage0");
const triadSummaryPillsStage0 = document.getElementById("triadSummaryPillsStage0");
const runStage0RepairBtn = document.getElementById("runStage0RepairBtn");
const iterationTabsStage0 = document.getElementById("iterationTabsStage0");
const repairSummaryBoxStage0 = document.getElementById("repairSummaryBoxStage0");
const sloClausesContainerStage0 = document.getElementById("sloClausesContainerStage0");
const stage0JsonEditor = document.getElementById("stage0JsonEditor");
const verifyStage0JsonBtn = document.getElementById("verifyStage0JsonBtn");

const tabStage0KcsBtn = document.getElementById("tabStage0KcsBtn");
const tabStage0SmtBtn = document.getElementById("tabStage0SmtBtn");
const tabStage0BoundariesBtn = document.getElementById("tabStage0BoundariesBtn");

const statusBannerStage0 = document.getElementById("statusBannerStage0");
const metricsBarStage0 = document.getElementById("metricsBarStage0");
const stage0KcsPane = document.getElementById("stage0KcsPane");
const stage0SmtPane = document.getElementById("stage0SmtPane");
const stage0BoundariesPane = document.getElementById("stage0BoundariesPane");
const kcPrescriptionsContainerStage0 = document.getElementById("kcPrescriptionsContainerStage0");
const stage0KcsGrid = document.getElementById("stage0KcsGrid");
const certificateBoxStage0 = document.getElementById("certificateBoxStage0");
const smtTrackerMatrixStage0 = document.getElementById("smtTrackerMatrixStage0");
const smtProofSliceInspectorStage0 = document.getElementById("smtProofSliceInspectorStage0");
const stage0PipelineDiagram = document.getElementById("stage0PipelineDiagram");
const stage0SmtFilterBar = document.getElementById("stage0SmtFilterBar");
const stage0SmtInteractiveViewer = document.getElementById("stage0SmtInteractiveViewer");
const stage0SmtScriptPre = document.getElementById("stage0SmtScriptPre");
const stage0SmtScriptCode = document.getElementById("stage0SmtScriptCode");
const epistemicBoundariesList = document.getElementById("epistemicBoundariesList");

function switchStage(stageNum) {
  currentStage = stageNum;
  if (stageNum === 0) {
    stage0ToggleBtn.classList.add("activeStage");
    stage1ToggleBtn.classList.remove("activeStage");
    stage0Container.classList.remove("hiddenPane");
    stage1Container.classList.add("hiddenPane");
  } else {
    stage0ToggleBtn.classList.remove("activeStage");
    stage1ToggleBtn.classList.add("activeStage");
    stage0Container.classList.add("hiddenPane");
    stage1Container.classList.remove("hiddenPane");
  }
}

function switchStage0View(viewName) {
  stage0ActiveView = viewName;
  tabStage0KcsBtn.classList.toggle("activeTab", viewName === "kcs");
  tabStage0SmtBtn.classList.toggle("activeTab", viewName === "smt");
  tabStage0BoundariesBtn.classList.toggle("activeTab", viewName === "boundaries");

  stage0KcsPane.classList.toggle("hiddenPane", viewName !== "kcs");
  stage0SmtPane.classList.toggle("hiddenPane", viewName !== "smt");
  stage0BoundariesPane.classList.toggle("hiddenPane", viewName !== "boundaries");
}

async function loadStage0Scenarios() {
  try {
    const resp = await fetch("/api/stage0/scenarios");
    const data = await resp.json();
    stage0ScenariosList = data.scenarios || [];

    scenarioSelectStage0.innerHTML = "";
    stage0ScenariosList.forEach((scen) => {
      const opt = document.createElement("option");
      opt.value = scen.scenarioId;
      opt.textContent = scen.title;
      scenarioSelectStage0.appendChild(opt);
    });

    if (stage0ScenariosList.length > 0) {
      scenarioSelectStage0.value = stage0ScenariosList[0].scenarioId;
      await runStage0Repair(stage0ScenariosList[0].scenarioId);
    }
  } catch (err) {
    console.error("Failed to load Stage 0 scenarios:", err);
  }
}

async function runStage0Repair(scenarioId) {
  runStage0RepairBtn.disabled = true;
  runStage0RepairBtn.textContent = "Solving Stage 0 SMT Proofs & Repairing...";

  try {
    const resp = await fetch("/api/stage0/repair-loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    });
    const data = await resp.json();
    currentStage0Iterations = data.iterations || [];

    const scenMeta = stage0ScenariosList.find((s) => s.scenarioId === scenarioId);
    if (scenMeta) {
      scenarioDescriptionStage0.textContent = scenMeta.description;
    }

    renderStage0TimelineTabs();
    selectStage0Iteration(0); // Start at Step 0 to show flawed LLM draft first
  } catch (err) {
    console.error("Stage 0 repair loop failed:", err);
  } finally {
    runStage0RepairBtn.disabled = false;
    runStage0RepairBtn.textContent = "Run Stage 0 Z3 Auto-Repair Loop";
  }
}

function renderStage0TimelineTabs() {
  iterationTabsStage0.innerHTML = "";
  currentStage0Iterations.forEach((iter, idx) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `iterationTabVertical ${idx === selectedStage0IterationIndex ? "active" : ""}`;
    const status = iter.verificationResult.status;
    const isSat = status === "sat";
    const statusBadge = isSat
      ? '<span class="iterBadge sat">SAT &#10003;</span>'
      : `<span class="iterBadge unsat">UNSAT (${iter.verificationResult.unsatCore.length})</span>`;

    tab.innerHTML = `
      <div class="iterTabTitleRow">
        <span class="iterTabTitle">Step ${idx}</span>
        ${statusBadge}
      </div>
      <div class="iterTabSummary">${escapeHtmlText(iter.repairSummary.slice(0, 95))}...</div>
    `;
    tab.addEventListener("click", () => selectStage0Iteration(idx));
    iterationTabsStage0.appendChild(tab);
  });
}

function selectStage0Iteration(index) {
  selectedStage0IterationIndex = index;
  renderStage0TimelineTabs();

  const iter = currentStage0Iterations[index];
  if (!iter) return;

  repairSummaryBoxStage0.innerHTML = `
    <strong>Step ${index} Repair Log:</strong> ${escapeHtmlText(iter.repairSummary)}
  `;

  renderStage0IterationView(iter);
}

function renderStage0IterationView(iteration) {
  const spec = iteration.triadSpec;
  const ver = iteration.verificationResult;

  // Triad summary header
  triadGradeBandBadgeStage0.textContent = `Grades ${spec.priorGrade} -> ${spec.targetGrade} -> ${spec.nextGrade}`;
  triadSummaryPillsStage0.innerHTML = `
    <span class="specPill">Subject: <strong>${escapeHtmlText(spec.subject)}</strong></span>
    <span class="specPill">Official SLO Clauses: <strong>${spec.sloClauses.length}</strong></span>
    <span class="specPill">Candidate KCs: <strong>${spec.candidateKcs.length}</strong></span>
  `;

  // Status banner
  const isSat = ver.status === "sat";
  statusBannerStage0.className = `statusBanner ${isSat ? "statusSat" : "statusUnsat"}`;
  statusBannerStage0.innerHTML = `
    <div class="statusTitleRow">
      <span class="statusVerdictText">Stage 0 Verdict: ${isSat ? "PROVEN SAT (Ontology Verified)" : "UNSAT (Consistency Violations Detected)"}</span>
      <span class="statusBadgeTag ${isSat ? "tagSat" : "tagUnsat"}">${isSat ? "FORMALLY PROVEN" : "UNSAT CORE ACTIVE"}</span>
    </div>
    <p class="statusExplainText">
      ${
        isSat
          ? "All 6 Stage 0 curriculum ontology theorems proven SAT by Z3 SMT solver. The candidate KC graph is a topologically valid, grade-monotonic, envelope-disjoint DAG with complete official SLO coverage and diagnostic misconception sufficiency."
          : `Z3 refuted the candidate KC ontology with ${ver.unsatCore.length} unsatisfiable core trackers. Topological rank assignment, vertical bridge continuity, or envelope boundaries failed.`
      }
    </p>
  `;

  // Metrics Bar
  const metrics = ver.metrics || {};
  metricsBarStage0.innerHTML = `
    <div class="metricCard">
      <span class="metricLabel">Candidate KCs</span>
      <span class="metricValue">${metrics.totalCandidateKcs || spec.candidateKcs.length}</span>
    </div>
    <div class="metricCard">
      <span class="metricLabel">SLO Clause Coverage</span>
      <span class="metricValue">${metrics.clauseCoverageRatio ? Math.round(metrics.clauseCoverageRatio * 100) : 100}%</span>
    </div>
    <div class="metricCard">
      <span class="metricLabel">Prerequisite Edges</span>
      <span class="metricValue">${metrics.totalPrerequisiteEdges || 0}</span>
    </div>
    <div class="metricCard">
      <span class="metricLabel">Tracked Theorems</span>
      <span class="metricValue">${metrics.totalTrackedTheorems || 0}</span>
    </div>
    <div class="metricCard">
      <span class="metricLabel">Epistemic Boundaries</span>
      <span class="metricValue">6 Documented</span>
    </div>
  `;

  // SLO Clauses Container
  renderStage0SloClauses(spec.sloClauses);

  // JSON Editor
  stage0JsonEditor.value = JSON.stringify(spec, null, 2);

  // Render KCs
  renderStage0Kcs(spec, ver);

  // Render SMT tracker matrix & certificate
  renderStage0SmtMatrix(ver);

  // Render Epistemic Boundaries
  renderStage0EpistemicBoundaries(ver.untestedEpistemicBoundaries || []);
}

function renderStage0SloClauses(clauses) {
  sloClausesContainerStage0.innerHTML = "";
  clauses.forEach((c) => {
    const div = document.createElement("div");
    div.className = "sloClauseItemBox";
    div.innerHTML = `
      <div class="sloClauseHeader">
        <span class="sloClauseCode">${escapeHtmlText(c.clauseId)}</span>
        <span class="specBandBadge">Grade ${c.grade}</span>
      </div>
      <div style="color:#334155;line-height:1.35;">${escapeHtmlText(c.text)}</div>
    `;
    sloClausesContainerStage0.appendChild(div);
  });
}

function renderStage0Kcs(spec, ver) {
  // Render Prescriptions if any
  kcPrescriptionsContainerStage0.innerHTML = "";
  if (ver.prescriptions && ver.prescriptions.length > 0) {
    const rxBox = document.createElement("div");
    rxBox.className = "prescriptionsBox";
    rxBox.innerHTML = `
      <h3 style="margin:0 0 0.5rem;font-size:0.92rem;color:#991b1b;">
        Z3 SMT Prescriptions for LLM Repair (${ver.prescriptions.length}):
      </h3>
      <ul style="margin:0;padding-left:1.2rem;font-size:0.82rem;color:#7f1d1d;">
        ${ver.prescriptions.map((p) => `<li><strong>[${escapeHtmlText(p.trackerId || p.targetMetric)}]:</strong> ${escapeHtmlText(p.instruction || p.action)} &mdash; <em>Target: ${escapeHtmlText(p.location || p.targetElement)}</em></li>`).join("")}
      </ul>
    `;
    kcPrescriptionsContainerStage0.appendChild(rxBox);
  }

  // Partition KCs by Grade
  const grades = [spec.priorGrade, spec.targetGrade, spec.nextGrade];
  const gradeLabels = {
    [spec.priorGrade]: `Prior Grade (${spec.priorGrade}) &bull; Foundational Envelopes`,
    [spec.targetGrade]: `Target Grade (${spec.targetGrade}) &bull; Active Instruction SLO Decomposition`,
    [spec.nextGrade]: `Next Grade (${spec.nextGrade}) &bull; Vertical Spiral Bridges`,
  };

  stage0KcsGrid.innerHTML = "";

  grades.forEach((gradeNum) => {
    const kcsInGrade = spec.candidateKcs.filter((kc) => kc.grade === gradeNum);
    const section = document.createElement("div");
    section.className = "kcGradeSection";

    section.innerHTML = `
      <div class="kcGradeSectionHeader">
        <span class="kcGradeTitle">
          <span class="specBandBadge">Grade ${gradeNum}</span>
          ${gradeLabels[gradeNum] || `Grade ${gradeNum}`}
        </span>
        <span style="font-size:0.78rem;color:#64748b;font-weight:600;">${kcsInGrade.length} Candidate KCs</span>
      </div>
      <div class="kcCardsGrid" id="kcCardsGrid_g${gradeNum}"></div>
    `;
    stage0KcsGrid.appendChild(section);

    const cardsContainer = section.querySelector(`#kcCardsGrid_g${gradeNum}`);
    kcsInGrade.forEach((kc) => {
      const card = renderSingleKcCard(kc, spec, ver);
      cardsContainer.appendChild(card);
    });
  });
}

function renderSingleKcCard(kc, spec, ver) {
  const card = document.createElement("div");
  const isViolated = ver.violations && ver.violations.some((v) => v.targetElement === kc.kcId || (v.details && v.details.includes(kc.kcId)));
  card.className = `kcCard ${isViolated ? "kcViolation" : ""}`;

  const topRank = ver.topologicalRanks && ver.topologicalRanks[kc.kcId] !== undefined ? ver.topologicalRanks[kc.kcId] : null;

  const isVerbAtomic = kc.verbCount === 1;
  const verbPill = isVerbAtomic
    ? `<span class="kcMetaPill kcMetaGood">&#10003; 1 Verb (Atomic)</span>`
    : `<span class="kcMetaPill kcMetaWarn">&#9888; ${kc.verbCount} Verbs (Composite Blob!)</span>`;

  const minMis = kc.grade <= 2 ? 2 : 3;
  const hasEnoughMis = kc.misconceptions.length >= minMis;
  const misPill = hasEnoughMis
    ? `<span class="kcMetaPill kcMetaGood">&#10003; ${kc.misconceptions.length} Misconceptions (&ge;${minMis})</span>`
    : `<span class="kcMetaPill kcMetaWarn">&#9888; ${kc.misconceptions.length} Misconceptions (Needs &ge;${minMis})</span>`;

  const rankBadge = topRank !== null
    ? `<span class="kcMetaPill" style="background:#f3e8ff;color:#6b21a8;font-weight:700;">Topological Rank: ${topRank}</span>`
    : "";

  card.innerHTML = `
    <div class="kcCardHeader">
      <div>
        <span class="kcIdBadge">${escapeHtmlText(kc.kcId)}</span>
        <span class="specBandBadge" style="margin-left:0.35rem;">Grade ${kc.grade}</span>
      </div>
      ${isViolated ? '<span class="statusBadgeTag tagUnsat">VIOLATION</span>' : '<span class="statusBadgeTag tagSat">SAT</span>'}
    </div>

    <h4 class="kcTitle">${escapeHtmlText(kc.title)}</h4>

    <div class="kcMetaRow">
      <span class="kcMetaPill">Op: <strong>${escapeHtmlText(kc.operationCode)}</strong></span>
      <span class="kcMetaPill">Complexity: <strong>${kc.mechanismComplexity}</strong></span>
      ${verbPill}
      ${misPill}
      <span class="kcMetaPill">Vars: <strong>${kc.observableVariablesCount}</strong></span>
      ${rankBadge}
    </div>

    <div class="kcDetailSection">
      <span class="kcDetailLabel">Prerequisites (${kc.prerequisites.length}):</span>
      <div class="kcChipRow">
        ${
          kc.prerequisites.length > 0
            ? kc.prerequisites.map((pId) => {
                const targetKc = spec.candidateKcs.find((k) => k.kcId === pId);
                const isCross = targetKc && targetKc.grade < kc.grade;
                return `<span class="prereqChip ${isCross ? "prereqCrossGrade" : ""}">${escapeHtmlText(pId)} ${isCross ? `(G${targetKc.grade} Spiral Bridge)` : ""}</span>`;
              }).join("")
            : '<span style="font-size:0.75rem;color:#94a3b8;font-style:italic;">None (Foundational Root)</span>'
        }
      </div>
    </div>

    <div class="kcDetailSection">
      <span class="kcDetailLabel">Covered Official NCP SLO Clauses (${kc.coveredClauseIds.length}):</span>
      <div class="kcChipRow">
        ${
          kc.coveredClauseIds.length > 0
            ? kc.coveredClauseIds.map((cId) => `<span class="sloCoverageChip">${escapeHtmlText(cId)}</span>`).join("")
            : '<span style="font-size:0.75rem;color:#ef4444;font-weight:700;">Zero Coverage (Orphan Hallucination!)</span>'
        }
      </div>
    </div>

    <div class="kcDetailSection">
      <span class="kcDetailLabel">Diagnostic Misconceptions (${kc.misconceptions.length}):</span>
      <ul class="kcMisconceptionsList">
        ${kc.misconceptions.map((m) => `<li>${escapeHtmlText(m)}</li>`).join("")}
      </ul>
    </div>
  `;

  return card;
}

function renderStage0SmtMatrix(ver) {
  if (ver.status === "sat" && ver.certificateHash) {
    certificateBoxStage0.className = "certificateBox certValid";
    certificateBoxStage0.innerHTML = `
      <div class="certHeader">
        <span class="certTitle">&#10003; Stage 0 Formal Ontology Proof Certificate (SHA-256)</span>
        <span class="certBadge">Z3 v4.15 &bull; UNSAT Core Swept</span>
      </div>
      <div class="certHash">${escapeHtmlText(ver.certificateHash)}</div>
      <p class="certNote">
        Cryptographically verifies that candidate KCs form a strictly acyclic, grade-monotonic DAG satisfying 6 curriculum SMT theorems.
      </p>
    `;
  } else {
    certificateBoxStage0.className = "certificateBox certInvalid";
    certificateBoxStage0.innerHTML = `
      <div class="certHeader">
        <span class="certTitle">&#9888; Stage 0 Verification Failed: No Certificate Generated</span>
        <span class="certBadge">UNSAT (${ver.unsatCore.length} Core Assertions)</span>
      </div>
      <div class="certHash">Proof Refuted &mdash; Unsatisfiable Core Active</div>
      <p class="certNote">
        The candidate KC decomposition contains structural contradictions refuted by Z3. Click the red tracker chips below to inspect the mathematical unsat core slice.
      </p>
    `;
  }

  const theoremGroups = [
    {
      id: "th01",
      name: "Theorem 0.1: Prerequisite DAG Acyclicity",
      sub: "rank(u) < rank(v) for all edges (Symbolic Topological Rank)",
      prefix: "kc_dag_acyclicity_",
    },
    {
      id: "th02",
      name: "Theorem 0.2: Vertical Grade Monotonicity & Spiral Bridge",
      sub: "grade(u) <= grade(v) and at least 1 edge connects adjacent grades",
      prefix: "kc_vertical_",
    },
    {
      id: "th03",
      name: "Theorem 0.3: Cross-Grade Envelope Disjointness & Complexity Progression",
      sub: "Disjoint operation/complexity envelopes + gradeDelta > 0",
      prefix: "kc_boundary_disjoint_",
    },
    {
      id: "th04",
      name: "Theorem 0.4: Cognitive Atomicity & Working Memory Cap",
      sub: "verbCount == 1 and observableVariables <= cap",
      prefix: "kc_atomicity_",
    },
    {
      id: "th05",
      name: "Theorem 0.5: Diagnostic Misconception Sufficiency",
      sub: "misconceptions >= 2 (G1-2) or >= 3 (G3-12) distinct error rules",
      prefix: "kc_misconceptions_min_",
    },
    {
      id: "th06",
      name: "Theorem 0.6: Complete Bipartite SLO Clause Coverage",
      sub: "Every official clause covered >= 1 KC, zero orphan KCs",
      prefix: "clause_covered_",
    },
  ];

  smtTrackerMatrixStage0.innerHTML = "";
  theoremGroups.forEach((grp) => {
    const card = document.createElement("div");
    card.className = "trackerGroupCard";

    const isViolatedInCore = ver.unsatCore.some(
      (tid) => tid.startsWith(grp.prefix) || (grp.id === "th03" && tid.startsWith("kc_grade_delta")) || (grp.id === "th06" && tid.startsWith("no_orphan"))
    );

    const statusPill = isViolatedInCore
      ? '<span class="statusBadgeTag tagUnsat">UNSAT CORE</span>'
      : '<span class="statusBadgeTag tagSat">SAT (PROVEN)</span>';

    card.innerHTML = `
      <div class="trackerGroupHeader" style="cursor:pointer;">
        <div>
          <span style="font-weight:700;font-size:0.86rem;color:#0f172a;">${escapeHtmlText(grp.name)}</span>
          <div style="font-size:0.75rem;color:#64748b;">${escapeHtmlText(grp.sub)}</div>
        </div>
        ${statusPill}
      </div>
      <div class="trackerChipRow" id="chips_${grp.id}"></div>
    `;

    smtTrackerMatrixStage0.appendChild(card);

    const chipRow = card.querySelector(`#chips_${grp.id}`);
    renderStage0TrackerChips(grp, ver, chipRow);
  });

  stage0PipelineDiagram.innerHTML = `
    <div class="pipelineStageCard">
      <span class="pipelineStageNum">1</span>
      <h4>NCP Curriculum Extraction</h4>
      <p>Official Pakistan Progression Grids parsed into Atomic SLO Clauses with Grade metadata.</p>
    </div>
    <div class="pipelineStageCard">
      <span class="pipelineStageNum">2</span>
      <h4>6 Symbolic SMT Theorems</h4>
      <p>Z3 proves DAG acyclicity via symbolic topological ranks + vertical grade monotonicity + envelope disjointness.</p>
    </div>
    <div class="pipelineStageCard">
      <span class="pipelineStageNum">3</span>
      <h4>UNSAT Core Auto-Repair</h4>
      <p>Refutations pinpoint minimal contradiction sets to guide multi-step LLM decomposition repair.</p>
    </div>
  `;

  stage0SmtScriptCode.textContent = ver.smtLib2Script || ";; No SMT-LIB2 script generated";
}

function renderStage0TrackerChips(grp, ver, container) {
  const matchingCore = ver.unsatCore.filter(
    (tid) => tid.startsWith(grp.prefix) || (grp.id === "th03" && tid.startsWith("kc_grade_delta")) || (grp.id === "th06" && tid.startsWith("no_orphan"))
  );

  if (matchingCore.length > 0) {
    matchingCore.forEach((tid) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "trackerChip chipUnsat";
      chip.innerHTML = `&#9888; ${escapeHtmlText(tid)}`;
      chip.addEventListener("click", () => inspectStage0ProofSlice(tid, grp, ver, true));
      container.appendChild(chip);
    });
  } else {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "trackerChip chipSat";
    chip.innerHTML = `&#10003; ${escapeHtmlText(grp.prefix)}* (SAT)`;
    chip.addEventListener("click", () => inspectStage0ProofSlice(grp.prefix, grp, ver, false));
    container.appendChild(chip);
  }
}

function inspectStage0ProofSlice(trackerId, grp, ver, isUnsat) {
  smtProofSliceInspectorStage0.innerHTML = `
    <div class="sliceHeader">
      <div>
        <span class="badgePill">${isUnsat ? "UNSAT Core Slice" : "Satisfied SMT Assertion"}</span>
        <h3 style="margin:0.25rem 0 0.1rem;font-size:0.98rem;">
          Theorem Slice: <code>${escapeHtmlText(trackerId)}</code>
        </h3>
        <span style="font-size:0.78rem;color:#64748b;">${escapeHtmlText(grp.name)}</span>
      </div>
      <span class="statusBadgeTag ${isUnsat ? "tagUnsat" : "tagSat"}">${isUnsat ? "REFUTED" : "PROVEN SAT"}</span>
    </div>

    <div class="sliceBody" style="padding:0.75rem 0.95rem;font-size:0.82rem;">
      <div style="margin-bottom:0.6rem;">
        <strong>Formal Specification:</strong>
        <p style="margin:0.2rem 0;color:#334155;">${escapeHtmlText(grp.sub)}</p>
      </div>

      <div style="margin-bottom:0.6rem;">
        <strong>Pedagogical Significance:</strong>
        <p style="margin:0.2rem 0;color:#334155;">
          ${
            isUnsat
              ? "This assertion was violated in the candidate KC decomposition. Z3 could not satisfy the joint system of curriculum constraints without retracting this assertion or repairing the prerequisite/envelope structure."
              : "Formally satisfied. Z3 verified that this constraint holds consistently with all other curriculum theorems."
          }
        </p>
      </div>

      <div>
        <strong>Related SMT-LIB2 Assertions in Script:</strong>
        <pre class="codePre" style="max-height:160px;margin-top:0.35rem;font-size:0.75rem;"><code>${escapeHtmlText(extractSmtLinesForTracker(ver.smtLib2Script, trackerId))}</code></pre>
      </div>
    </div>
  `;
  smtProofSliceInspectorStage0.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function extractSmtLinesForTracker(script, trackerId) {
  if (!script) return ";; No script available";
  const cleanId = trackerId.replace(/\*$/, "");
  const lines = script.split("\n");
  const matched = lines.filter((line) => line.includes(cleanId) || (line.includes("assert") && line.includes(cleanId.slice(0, 15))));
  if (matched.length > 0) {
    return matched.join("\n");
  }
  return lines.slice(0, 15).join("\n") + "\n;; ... (full script contains complete formulation)";
}

function renderStage0EpistemicBoundaries(boundaries) {
  epistemicBoundariesList.innerHTML = "";
  if (!boundaries || boundaries.length === 0) {
    epistemicBoundariesList.innerHTML = "<p style='color:#64748b;font-size:0.85rem;'>No boundary metadata available.</p>";
    return;
  }

  boundaries.forEach((b) => {
    const card = document.createElement("div");
    card.className = "epistemicBoundaryCard";

    card.innerHTML = `
      <div class="boundaryCardHeader">
        <h4 class="boundaryTitle">${escapeHtmlText(b.title)}</h4>
        <span class="statusBadgeTag tagUnsat" style="background:#fffbeb;border-color:#f59e0b;color:#b45309;">OUTSIDE Z3 SCOPE</span>
      </div>
      <div class="boundaryBody">
        <div class="boundaryField">
          <span class="boundaryFieldLabel">Why Untested by Z3 SMT Solver:</span>
          <div>${escapeHtmlText(b.whyUntestedByZ3)}</div>
        </div>

        <div class="boundaryField failureEx">
          <span class="boundaryFieldLabel">&#9888; Concrete Failure Scenario If Left Unchecked:</span>
          <div>${escapeHtmlText(b.failureExample)}</div>
        </div>

        <div class="boundaryField mitigationPlan">
          <span class="boundaryFieldLabel">&#10003; Recommended Pedagogical Mitigation Strategy:</span>
          <div>${escapeHtmlText(b.mitigationStrategy)}</div>
        </div>
      </div>
    `;

    epistemicBoundariesList.appendChild(card);
  });
}

async function initializePlayground() {
  const response = await fetch("/api/specs");
  const specData = await response.json();

  specData.gradeSpecs.forEach((spec) => {
    gradeSpecsById[spec.gradeBandId] = spec;
    const option = document.createElement("option");
    option.value = spec.gradeBandId;
    option.textContent = spec.label;
    gradeBandSelect.appendChild(option);
  });

  demoScenariosList = specData.demoScenarios;
  initialDraftsById = specData.initialDrafts;

  demoScenariosList.forEach((scenario) => {
    const option = document.createElement("option");
    option.value = scenario.scenarioId;
    option.textContent = scenario.title;
    scenarioSelect.appendChild(option);
  });

  scenarioSelect.addEventListener("change", () => {
    const selectedScenario = demoScenariosList.find(
      (s) => s.scenarioId === scenarioSelect.value
    );
    if (selectedScenario) {
      scenarioDescription.textContent = selectedScenario.description;
      gradeBandSelect.value = selectedScenario.gradeBandId;
      populateSpecInputs(
        gradeSpecsById[selectedScenario.gradeBandId],
        selectedScenario.defaultAllowlist
      );
      executeRepairLoop();
    }
  });

  gradeBandSelect.addEventListener("change", () => {
    const spec = gradeSpecsById[gradeBandSelect.value];
    if (spec) {
      populateSpecInputs(spec, []);
    }
  });

  tabVisualBtn.addEventListener("click", () => {
    tabVisualBtn.classList.add("activeTab");
    tabSmtBtn.classList.remove("activeTab");
    if (tabFeasibleMapBtn) {
      tabFeasibleMapBtn.classList.remove("activeTab");
    }
    visualProofPane.classList.remove("hiddenPane");
    smtProofPane.classList.add("hiddenPane");
    if (feasibleMapPane) {
      feasibleMapPane.classList.add("hiddenPane");
    }
  });

  tabSmtBtn.addEventListener("click", () => {
    tabSmtBtn.classList.add("activeTab");
    tabVisualBtn.classList.remove("activeTab");
    if (tabFeasibleMapBtn) {
      tabFeasibleMapBtn.classList.remove("activeTab");
    }
    smtProofPane.classList.remove("hiddenPane");
    visualProofPane.classList.add("hiddenPane");
    if (feasibleMapPane) {
      feasibleMapPane.classList.add("hiddenPane");
    }
  });

  if (tabFeasibleMapBtn && feasibleMapPane) {
    tabFeasibleMapBtn.addEventListener("click", () => {
      tabFeasibleMapBtn.classList.add("activeTab");
      tabVisualBtn.classList.remove("activeTab");
      tabSmtBtn.classList.remove("activeTab");
      feasibleMapPane.classList.remove("hiddenPane");
      visualProofPane.classList.add("hiddenPane");
      smtProofPane.classList.add("hiddenPane");
      renderFeasibleProofSpace();
    });
  }

  if (probeWordsSlider) {
    probeWordsSlider.addEventListener("input", () => {
      renderFeasibleProofSpace();
    });
  }

  if (probeSyllablesSlider) {
    probeSyllablesSlider.addEventListener("input", () => {
      renderFeasibleProofSpace();
    });
  }

  if (presetDraftBtn) {
    presetDraftBtn.addEventListener("click", () => {
      impossibleSpecOverride = false;
      if (probeWordsSlider && probeSyllablesSlider) {
        probeWordsSlider.value = "19.5";
        probeSyllablesSlider.value = "1.78";
      }
      renderFeasibleProofSpace();
    });
  }

  if (presetNaiveBtn) {
    presetNaiveBtn.addEventListener("click", () => {
      impossibleSpecOverride = false;
      if (probeWordsSlider && probeSyllablesSlider) {
        // Naive if/else trap: split sentence to 7.0 words/sent, leaving syllables low -> drops below FK floor!
        probeWordsSlider.value = "7.0";
        probeSyllablesSlider.value = "1.22";
      }
      renderFeasibleProofSpace();
    });
  }

  if (presetSatBtn) {
    presetSatBtn.addEventListener("click", () => {
      impossibleSpecOverride = false;
      const spec = readCurrentGradeSpec();
      const safeMaxSent = Number.isFinite(spec.maxWordsPerSentence) ? spec.maxWordsPerSentence : 14.0;
      const safeFkMin = Number.isFinite(spec.fleschKincaidMin) ? spec.fleschKincaidMin : 2.5;
      const safeFkMax = Number.isFinite(spec.fleschKincaidMax) ? spec.fleschKincaidMax : 4.5;
      const targetX = Math.max(6.0, Math.min(safeMaxSent - 2.0, 11.5));
      const targetFk = (safeFkMin + safeFkMax) / 2.0;
      const targetY = (targetFk + 15.59 - 0.39 * targetX) / 11.8;
      if (probeWordsSlider && probeSyllablesSlider) {
        probeWordsSlider.value = targetX.toFixed(1);
        probeSyllablesSlider.value = Math.min(1.7, Math.max(1.1, targetY)).toFixed(2);
      }
      renderFeasibleProofSpace();
    });
  }

  if (presetImpossibleBtn) {
    presetImpossibleBtn.addEventListener("click", () => {
      impossibleSpecOverride = true;
      if (probeWordsSlider && probeSyllablesSlider) {
        probeWordsSlider.value = "8.5";
        probeSyllablesSlider.value = "1.35";
      }
      renderFeasibleProofSpace();
    });
  }

  [
    maxWordsInput,
    maxSyllablesInput,
    fkMinInput,
    fkMaxInput,
    optionSpreadInput,
    quizDurationInput,
    allowlistInput,
  ].forEach((inputEl) => {
    if (inputEl) {
      inputEl.addEventListener("input", () => {
        impossibleSpecOverride = false;
        renderSpecSummaryPills();
        renderFeasibleProofSpace();
      });
    }
  });

  runRepairBtn.addEventListener("click", executeRepairLoop);
  verifyJsonBtn.addEventListener("click", executeVerifyEditedJson);

  if (symbolExplainerDialog) {
    symbolExplainerDialog.addEventListener("close", () => {
      symbolExplainerDialog.returnValue = "";
    });

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const isOutsideDialog = (evt, dlg) => {
        const rect = dlg.getBoundingClientRect();
        return (
          evt.clientX < rect.left ||
          evt.clientX > rect.right ||
          evt.clientY < rect.top ||
          evt.clientY > rect.bottom
        );
      };
      let pressedOutside = false;
      symbolExplainerDialog.addEventListener("pointerdown", (evt) => {
        pressedOutside = isOutsideDialog(evt, symbolExplainerDialog);
      });
      symbolExplainerDialog.addEventListener("pointerup", (evt) => {
        if (pressedOutside && isOutsideDialog(evt, symbolExplainerDialog)) {
          symbolExplainerDialog.close();
        }
      });
    }
  }

  // Trigger initial scenario load
  scenarioSelect.value = demoScenariosList[0].scenarioId;
  scenarioSelect.dispatchEvent(new Event("change"));

  // Stage 0 wiring
  stage0ToggleBtn.addEventListener("click", () => switchStage(0));
  stage1ToggleBtn.addEventListener("click", () => switchStage(1));

  tabStage0KcsBtn.addEventListener("click", () => switchStage0View("kcs"));
  tabStage0SmtBtn.addEventListener("click", () => switchStage0View("smt"));
  tabStage0BoundariesBtn.addEventListener("click", () => switchStage0View("boundaries"));

  scenarioSelectStage0.addEventListener("change", () => {
    runStage0Repair(scenarioSelectStage0.value);
  });

  runStage0RepairBtn.addEventListener("click", () => {
    runStage0Repair(scenarioSelectStage0.value);
  });

  verifyStage0JsonBtn.addEventListener("click", async () => {
    try {
      const parsed = JSON.parse(stage0JsonEditor.value);
      const resp = await fetch("/api/stage0/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triadSpec: parsed }),
      });
      const ver = await resp.json();
      const customIter = {
        iterationIndex: currentStage0Iterations.length,
        triadSpec: parsed,
        verificationResult: ver,
        repairSummary: "Direct Custom Triad JSON Live Verification Probe",
      };
      currentStage0Iterations.push(customIter);
      selectedStage0IterationIndex = currentStage0Iterations.length - 1;
      renderStage0TimelineTabs();
      renderStage0IterationView(customIter);
    } catch (e) {
      alert("Invalid JSON: " + e.message);
    }
  });

  await loadStage0Scenarios();
}

initializePlayground();
