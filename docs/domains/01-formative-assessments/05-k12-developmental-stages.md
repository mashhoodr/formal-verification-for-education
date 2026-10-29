# Dimension 5: K–12 Developmental Stage Guardrails

## 1. Is Developmental Stage a Variable or Embedded into Other Variables?

**It is both:** in our formal verification model, **Developmental Stage** ($S \in \{\text{K-2}, \text{G3-5}, \text{G6-8}, \text{G9-12}\}$) acts as a **Structural Hyper-Parameter** that:
1. **Parameterizes continuous bounds** (reading speed in WPM, sentence length caps, syllable caps, Flesch-Kincaid grade bands), **and**
2. **Activates discrete cognitive & psychometric axioms** rooted in developmental psychology (Cowan's Working Memory growth curve, Piagetian concrete-to-formal operational transition, and executive attention span).

A 7-year-old in Grade 2 is not merely a "slower-reading 11th grader." Their working memory buffer, inhibitory control (ability to ignore plausible distractors), and capacity for hypothetical/counterfactual reasoning follow distinct developmental laws.

---

## 2. The K–12 Developmental Stage Parameter Matrix

| Developmental Parameter / Axiom | Early Primary (`K-2`, Ages 5–8) | Upper Primary (`G3-5`, Ages 8–11) | Lower Secondary (`G6-8`, Ages 11–14) | Upper Secondary (`G9-12`, Ages 14–18) |
| :--- | :---: | :---: | :---: | :---: |
| **Working Memory Capacity ($W_{\text{cap}}$ chunks)** | **$2\text{--}3$ chunks** | **$3\text{--}4$ chunks** | **$4\text{--}5$ chunks** | **$5\text{--}6$ chunks** |
| **Optimal MCQ Option Count ($K_{\text{opt}}$)** | **$3$ options** (A, B, C) | **$4$ options** (A–D) | **$4$ options** (A–D) | **$4\text{--}5$ options** (A–E) |
| **Max Words per Sentence ($W_{\max}$)** | $\le 10$ words | $\le 14$ words | $\le 20$ words | $\le 25$ words |
| **Max Syllables per Non-Allowlist Word** | $\le 2$ syllables | $\le 3$ syllables | $\le 4$ syllables | $\le 5$ syllables |
| **Flesch-Kincaid Grade Band ($\text{FK}$)** | $[0.5, 2.8]$ | $[2.5, 5.8]$ | $[5.5, 8.8]$ | $[8.5, 12.5]$ |
| **Reading Speed Floor ($\text{WPM}$)** | $60\text{ WPM}$ | $110\text{ WPM}$ | $150\text{ WPM}$ | $190\text{ WPM}$ |
| **Max Depth of Knowledge ($\text{DoK}_{\max}$)** | $\text{DoK } 2$ (Concrete $\text{DoK } 3$ rare) | $\text{DoK } 3$ (Concrete/Observable) | $\text{DoK } 3\text{--}4$ (Formal/Multi-var) | $\text{DoK } 4$ (Abstract/Counterfactual) |
| **Negative Stem Polarity (`NOT`/`EXCEPT`)** | **Banned ($0$ allowed)** | Max $1$ on $\text{DoK } 1\text{--}2$ only | Allowed with explicit emphasis | Allowed |

---

## 3. Formal Developmental Axioms in Z3

### Axiom 1: Working Memory Chunk Bound (`q_working_memory_cap`)
Every item $q_i$ requires the student to hold $c(q_i)$ distinct facts, numbers, or rules in working memory simultaneously (e.g., a word problem with 3 numbers and 1 conversion rate has $c(q_i) = 4$). Z3 enforces:

$$\forall i, \quad c(q_i) \le W_{\text{cap}}(\text{Stage})$$

If an LLM generates a Grade 2 Math word problem that gives 3 different fruit counts and asks a 2-step comparison ($c = 4 > 3$), Z3 rejects it even if every sentence is short!

### Axiom 2: Stage-Appropriate Option Count (`q_stage_option_count`)
Psychometric meta-analyses (Rodriguez, 2005; Haladyna & Downing) demonstrate that for Grades K–2, 4- or 5-option MCQs overload early readers' visual scanning and working memory without improving discrimination. Z3 enforces:

$$\text{Stage} = \text{K-2} \implies |\text{options}(q_i)| = 3$$

$$\text{Stage} \in \{\text{G3-5}, \text{G6-8}\} \implies |\text{options}(q_i)| = 4$$

### Axiom 3: Concrete vs. Abstract Reasoning Gate (`q_concrete_grounding`)
For `K-2` and `G3-5` (Piaget's Concrete Operational stage), any item at $\text{DoK} \ge 2$ must anchor its variables in **observable, concrete entities** (`abstractionLevel == CONCRETE`) rather than purely symbolic or ungrounded hypothetical variables ($x, y$ without physical referent).
