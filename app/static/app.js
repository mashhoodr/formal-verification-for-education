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
const smtScriptPre = document.getElementById("smtScriptPre");
const tabVisualBtn = document.getElementById("tabVisualBtn");
const tabSmtBtn = document.getElementById("tabSmtBtn");
const visualProofPane = document.getElementById("visualProofPane");
const smtProofPane = document.getElementById("smtProofPane");

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
  const resultData = await response.json();
  currentIterations = resultData.iterations;
  selectedIterationIndex = 0;
  renderIterationTabs();
  renderIterationView(currentIterations[0]);
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
