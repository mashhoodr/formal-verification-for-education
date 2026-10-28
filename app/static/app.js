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
const smtFilterBar = document.getElementById("smtFilterBar");
const smtInteractiveViewer = document.getElementById("smtInteractiveViewer");
const smtScriptPre = document.getElementById("smtScriptPre");
const tabVisualBtn = document.getElementById("tabVisualBtn");
const tabSmtBtn = document.getElementById("tabSmtBtn");
const visualProofPane = document.getElementById("visualProofPane");
const smtProofPane = document.getElementById("smtProofPane");

let activeSmtFilter = "all";
let highlightedTrackerId = null;

function populateSpecInputs(gradeSpec, allowlistOverride) {
  maxWordsInput.value = gradeSpec.maxWordsPerSentence;
  maxSyllablesInput.value = gradeSpec.maxSyllablesPerWord;
  fkMinInput.value = gradeSpec.fleschKincaidMin;
  fkMaxInput.value = gradeSpec.fleschKincaidMax;
  optionSpreadInput.value = gradeSpec.maxOptionWordSpread;
  quizDurationInput.value = gradeSpec.quizDurationMinutes;
  const allowWords = allowlistOverride || gradeSpec.topicAllowlist || [];
  allowlistInput.value = allowWords.join(", ");
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
  smtScriptPre.textContent = verificationResult.smtLib2Script;
  renderSmtVisualization(verificationResult);
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
  return rawStr
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

function renderSmtVisualization(verificationResult) {
  const rawStatements = parseSmtStatements(verificationResult.smtLib2Script);
  const unsatSet = new Set(verificationResult.unsatCore || []);
  const factBindingsMap = {};
  const trackedList = [];
  const trackedIdsSet = new Set();
  const structuredRows = [];

  rawStatements.forEach((stmt, idx) => {
    const declareMatch = stmt.match(/^\(declare-fun\s+([^\s()]+)\s+\(\)\s+([^\s()]+)\)$/);
    if (declareMatch) {
      const symName = declareMatch[1];
      const symType = declareMatch[2];
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
  });

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
      <span class="matrixHint">Click any tracker card to locate &amp; highlight its SMT-LIB2 assertion below</span>
    </div>
    <div class="categoryGrid">${categoryCardsHtml}</div>
  `;

  smtTrackerMatrix.querySelectorAll(".trackerChipBtn").forEach((chipBtn) => {
    chipBtn.addEventListener("click", () => {
      const clickedId = chipBtn.getAttribute("data-tracker-id");
      highlightedTrackerId = highlightedTrackerId === clickedId ? null : clickedId;
      activeSmtFilter = "all";
      renderSmtVisualization(verificationResult);
      if (highlightedTrackerId) {
        const targetRow = smtInteractiveViewer.querySelector(
          `[data-line-tracker="${highlightedTrackerId}"]`
        );
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });
  });

  // 3. Render Filter Bar & Annotated SMT-LIB2 Code Viewer
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
      highlightedTrackerId = null;
      renderSmtVisualization(verificationResult);
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

      if (row.kind === "tracked") {
        rowClass += row.isUnsat ? " smtLineUnsat" : " smtLineSat";
        if (highlightedTrackerId === row.trackerId) {
          rowClass += " smtLineFlash";
        }
        trackerAttr = `data-line-tracker="${row.trackerId}"`;
        badgeHtml = row.isUnsat
          ? `<span class="smtLineAnnotation annotUnsat">✗ UNSAT CORE</span>`
          : `<span class="smtLineAnnotation annotSat">✓ SAT</span>`;
      } else if (row.kind === "fact") {
        rowClass += " smtLineFact";
        badgeHtml = `<span class="smtLineAnnotation annotFact">fact = ${escapeHtmlText(
          row.cleanVal
        )}</span>`;
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
          <span class="smtLineCode">${highlightSmtSyntax(row.rawStmt, trackedIdsSet)}</span>
          ${badgeHtml}
        </div>
      `;
    })
    .join("");
}

function renderIterationTabs() {
  iterationTabs.innerHTML = "";
  currentIterations.forEach((iterRecord, idx) => {
    const btn = document.createElement("button");
    const statusBadge = iterRecord.verificationResult.status.toUpperCase();
    btn.className = `iterStepBtn ${idx === selectedIterationIndex ? "activeIter" : ""}`;
    btn.textContent = idx === 0 ? `Draft (${statusBadge})` : `Repair ${idx} (${statusBadge})`;
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
    visualProofPane.classList.remove("hiddenPane");
    smtProofPane.classList.add("hiddenPane");
  });

  tabSmtBtn.addEventListener("click", () => {
    tabSmtBtn.classList.add("activeTab");
    tabVisualBtn.classList.remove("activeTab");
    smtProofPane.classList.remove("hiddenPane");
    visualProofPane.classList.add("hiddenPane");
  });

  runRepairBtn.addEventListener("click", executeRepairLoop);
  verifyJsonBtn.addEventListener("click", executeVerifyEditedJson);

  // Trigger initial scenario load
  scenarioSelect.value = demoScenariosList[0].scenarioId;
  scenarioSelect.dispatchEvent(new Event("change"));
}

initializePlayground();
