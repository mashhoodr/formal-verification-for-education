# Dimension 1: Student Learning Outcomes (SLOs), Atomic KCs & Item Sufficiency

## 1. The Core Question: "2–3 Questions Define Mastery of *What*?"

When educators say *"We need 2 to 3 questions per skill on a formative quiz to check for mastery,"* what is the exact unit of knowledge being measured?

- **Is it a Student Learning Outcome (SLO) / Curriculum Standard?** **No.** A curriculum SLO (e.g., *"CCSS.MATH.4.NF.B.3: Understand a fraction $a/b$ with $a > 1$ as a sum of fractions $1/b$, add and subtract mixed numbers, and solve word problems"*) is a **macro-container** that spans weeks of instruction and bundles 5 to 12 distinct mental operations. Testing a whole SLO with 2–3 questions yields zero diagnostic signal.
- **Is it a Topic inside the SLO?** **Still too coarse.** A topic like *"Adding Mixed Numbers"* still bundles common denominators, improper-fraction regrouping, and whole-number addition.
- **The True Unit of Mastery: The Atomic Knowledge Component (KC) / Micro-Skill.**
  In cognitive psychology (**Koedinger's KLI Framework**) and psychometrics (**Cognitive Diagnostic Models / Q-Matrix Theory**), 2–3 questions can only prove mastery of a single **Atomic Knowledge Component (KC)**—an indivisible mental rule, concept, or transformation where a student either knows the rule or holds a specific misconception.

---

## 2. The 4-Level Curriculum Decomposition Hierarchy

To verify alignment formally, every curriculum standard must be decomposed into a 4-level tree where the leaves form a **Prerequisite Directed Acyclic Graph (DAG)** of Atomic KCs:

```mermaid
flowchart TD
    L1["Level 1: Curriculum Strand / Domain\n(Grade 3 Earth & Space Science)"]
    L2["Level 2: Student Learning Outcome (SLO)\n(SLO-SCI-3.2: Explain how solar energy drives the water cycle\nthrough evaporation, condensation, and precipitation)"]
    L3A["Level 3: Sub-SLO / Lesson Objective 3.2.A\n(Thermal energy & liquid-to-gas phase change)"]
    L3B["Level 3: Sub-SLO / Lesson Objective 3.2.B\n(Cooling aloft & gas-to-liquid condensation)"]
    KC1["Level 4: Atomic KC-3.2.A1\nIdentify that liquid water turns into\ninvisible water vapor gas when heated"]
    KC2["Level 4: Atomic KC-3.2.A2\nPredict causal direction: higher surface\ntemperature -> faster evaporation rate"]
    KC3["Level 4: Atomic KC-3.2.A3\nDiscriminate surface evaporation (any temp)\nfrom boiling (throughout liquid at 100°C)"]

    L1 --> L2
    L2 --> L3A
    L2 --> L3B
    L3A --> KC1
    L3A --> KC2
    L3A --> KC3
    KC1 -->|Prerequisite| KC2
    KC1 -->|Prerequisite| KC3
```

### Formal Definition of an Atomic KC
A unit of knowledge $k$ is an **Atomic KC** if and only if:
1. **Single Cognitive Rule:** It represents one state transition, causal link, classification boundary, or procedural step.
2. **Enumerated Misconception Set ($\mathcal{M}_k$):** Every predictable student error on $k$ maps to a finite set of 2–5 specific misconceptions $\mathcal{M}_k = \{m_1, m_2, \dots, m_r\}$.
3. **Local Independence:** If a student masters $k$, their probability of answering any unconfounded item testing *only* $k$ is $1 - s_i$ (where $s_i$ is the slip rate).

---

## 3. Mathematical Formulation of Mastery & Item Sufficiency (The Q-Matrix & DINA Model)

In **Cognitive Diagnostic Modeling (CDM)** (specifically the **DINA — Deterministic Inputs, Noisy "And" Gate** model), a formative assessment of $I$ items testing $K$ Atomic KCs is defined by a binary **Q-Matrix** $Q \in \{0, 1\}^{I \times K}$, where $q_{i,k} = 1$ if item $i$ requires Atomic KC $k$.

For each item $i$, let:
- $g_i = P(\text{Pass}_i \mid \text{Unmastered}_k)$ be the **Guessing (False-Positive) Probability**.
- $s_i = P(\text{Fail}_i \mid \text{Mastered}_k)$ be the **Slip (Careless Error) Probability**.

### The False-Mastery Bound across $n_k$ Items
If a student has **not** mastered Atomic KC $k$, the probability that they pass **all** $n_k$ items testing KC $k$ by luck is:

$$P(\text{False Mastery of } k) = \prod_{i : q_{i,k}=1} g_i$$

To guarantee at least **$90\%$ diagnostic confidence** ($\alpha \le 0.10$) that passing means genuine mastery:

$$\prod_{i : q_{i,k}=1} g_i \le 0.10 \iff \sum_{i : q_{i,k}=1} \left(-\log_{10} g_i\right) \ge 1.0$$

> **Why that logarithmic transformation matters for Z3:** By taking $I_{\text{info}}(i) = -\log_{10}(g_i)$ as each item's **Diagnostic Information Weight**, the nonlinear probability product $\prod g_i \le 0.10$ becomes a **pure linear inequality** in Z3 (`Real` arithmetic)!

---

## 4. How Different Question Types Change Sufficiency Math

Because different item formats have wildly different guessing probabilities $g_i$ and classroom time costs $t_i$, we can formally mix and match item formats in Z3:

| Item Format | Guessing Prob ($g_i$) | Diagnostic Info Weight $w_i = -\log_{10}(g_i)$ | Items Needed for $\sum w_i \ge 1.0$ ($\alpha \le 0.10$) | Best Pedagogical Role in a Formative Quiz |
| :--- | :---: | :---: | :---: | :--- |
| **3-Option MCQ (Grades K–2)** | $0.333$ | $0.48$ | **3 items** ($3 \times 0.48 = 1.44 \ge 1.0$) | Fast foundational check + misconception trapping for early readers |
| **4-Option MCQ (Grades 3–12)** | $0.250$ | $0.60$ | **2–3 items** ($2 \times 0.60 = 1.20 \ge 1.0$) | Rapid diagnostic check where each distractor maps to a distinct misconception |
| **Match-the-Column ($4 \times 5$ matrix)** | $\approx 0.04$ | $1.40$ | **1 matrix** (covers $3\text{--}4$ sibling boundary KCs at once) | Testing boundary discrimination across related concepts (e.g., *Evaporation vs. Boiling vs. Condensation*) |
| **Short Answer / Fill-in-Blank** | $\approx 0.05$ | $1.30$ | **1–2 items** ($1$ `SEEN` + $1$ `UNSEEN`) | Eliminates recognition cueing; proves active retrieval & generation |
| **Comprehension Set (Passage + 3 Items)** | $0.25$ per sub-item | $0.60$ per sub-item | **1 shared stimulus + 2–3 linked items** | Amortizes reading time across $\text{DoK } 1$ retrieval $\to \text{DoK } 2$ inference $\to \text{DoK } 3$ evaluation |
| **Long Answer / Constructed Explanation** | $\approx 0.01$ | $2.00$ | **1 item** (plus 1 fast $\text{DoK } 1$ prerequisite MCQ) | Proves multi-step causal reasoning across $2$ linked KCs simultaneously |

---

## 5. The Ideal 3-Item "Diagnostic Probe Triplet" for a Single Atomic KC

When a formative quiz uses MCQs or mixed formats to test a single Atomic KC $k$, why is **2–3 items** the gold standard? Because each item in the triplet probes a distinct layer of mastery:

1. **Probe 1 — The Foundational Anchor (`DoK 1`, `SEEN` Context):**
   - Verifies that the student understood the basic rule using a familiar representation from class.
2. **Probe 2 — The Near-Transfer Check (`DoK 2`, `UNSEEN` Context):**
   - Changes the surface scenario (`UNSEEN`) while keeping the underlying KC identical.
   - *Diagnostic comparison:* If a student passes Probe 1 (`SEEN`) but fails Probe 2 (`UNSEEN`), the teacher immediately knows the student **memorized the classroom example without abstracting the concept**.
3. **Probe 3 — The Boundary / Misconception Trap (`DoK 2–3`, `UNSEEN` Context or Short Answer):**
   - Specifically pits the target KC against its #1 competing misconception (e.g., testing whether evaporation still happens on a cool, windy day vs. only when boiling).

---

## 6. What Z3 Proves for Dimension 1 (`SMT-LIB2` Formulation)

Given a set of target lesson KCs $\mathcal{K}_{\text{target}}$ and classroom time budget $T_{\max}$:

1. **Diagnostic Information Sufficiency per Target KC:**
   $$\forall k \in \mathcal{K}_{\text{target}}, \quad \sum_{i : q_{i,k}=1} w_{\text{info}}(i) \ge 1.20 \quad (\text{guarantees } P(\text{False Mastery}) \le 0.0625)$$
2. **Multi-Point Probing (Minimum 2 Distinct Items for MCQ-Only KCs):**
   $$\forall k \in \mathcal{K}_{\text{target}}, \quad \text{count}(i : q_{i,k}=1) \ge 2 \quad \lor \quad \exists i : \left(q_{i,k}=1 \land \text{format}(i) \in \{\text{ShortAnswer}, \text{LongAnswer}, \text{Match}\}\right)$$
3. **Single-KC Purity for Diagnostic Items (No Confounded Multi-KC Stems on `DoK 1–2`):**
   - If an MCQ requires **two** unverified KCs at once ($q_{i,k_1}=1 \land q_{i,k_2}=1$) and the student fails it, you cannot tell whether $k_1$ or $k_2$ caused the failure (the **Credit/Blame Assignment Problem**).
   - Z3 enforces that every $\text{DoK } 1\text{--}2$ diagnostic item maps to **exactly 1 primary KC**, and any $\text{DoK } 3$ synthesis item that combines $k_1 + k_2$ is preceded by standalone checks for $k_1$ and $k_2$!
4. **Feasibility Knapsack Check (Scope vs. Time Budget):**
   - If a teacher selects $6$ Atomic KCs for a $5$-minute exit ticket, Z3 proves `UNSAT` immediately because $6 \text{ KCs} \times 2 \text{ items} \times 45\text{s} = 9 \text{ minutes} > 5 \text{ minutes}$, and `z3.Optimize` recommends narrowing the exit ticket to $\le 3$ Atomic KCs.
