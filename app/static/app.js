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
const tabVisualBtn = document.getElementById("tabVisualBtn");
const tabSmtBtn = document.getElementById("tabSmtBtn");
const visualProofPane = document.getElementById("visualProofPane");
const smtProofPane = document.getElementById("smtProofPane");
const symbolExplainerDialog = document.getElementById("symbolExplainerDialog");
const explainerDialogTitle = document.getElementById("explainerDialogTitle");
const explainerDialogBody = document.getElementById("explainerDialogBody");

let activeSmtFilter = "all";
let highlightedTrackerId = null;

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
  renderSmtVisualization(verificationResult, assessment);
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
}

initializePlayground();
