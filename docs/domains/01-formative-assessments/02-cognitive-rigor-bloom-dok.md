# Dimension 2: Cognitive Rigor — Bloom's Taxonomy $\times$ Webb's Depth of Knowledge (DoK)

## 1. Pedagogical Foundation: Why Bloom's and Webb's DoK Are Orthogonal Axes

A frequent pitfall in automated assessment generation is treating **Bloom's Revised Taxonomy** and **Webb's Depth of Knowledge (DoK)** as interchangeable 1D difficulty scales. In educational measurement (**Karin Hess's Cognitive Rigor Matrix**), they measure two independent dimensions:

1. **Bloom's Taxonomy ($B \in \{1..6\}$):** Classifies the **type of cognitive process / action verb**:
   - $1$: Remember, $2$: Understand, $3$: Apply, $4$: Analyze, $5$: Evaluate, $6$: Create.
2. **Webb's Depth of Knowledge ($\text{DoK} \in \{1..4\}$):** Classifies the **depth of contextual transfer, number of mental steps, and structural openness of the reasoning**:
   - $\text{DoK } 1$: **Recall & Reproduction** (1 mental step, verbatim rule or fact lookup).
   - $\text{DoK } 2$: **Skills & Concepts** (2+ mental steps: classifying, cause-effect, comparing, applying a rule to a routine scenario).
   - $\text{DoK } 3$: **Strategic Thinking** (Non-routine multi-step reasoning, justifying with evidence, predicting under changed constraints).
   - $\text{DoK } 4$: **Extended Thinking** (Multi-day investigation/synthesis across domains—rarely fits inside a single 10-minute in-class quiz item).

### The Hess Matrix in Practice (Grade 3 Water Cycle Example)

| Bloom Level \ Webb's DoK | $\text{DoK } 1$ (Recall) | $\text{DoK } 2$ (Skill / Concept) | $\text{DoK } 3$ (Strategic Thinking) |
| :--- | :--- | :--- | :--- |
| **Bloom 1: Remember** | Define *evaporation*. | — | — |
| **Bloom 2: Understand** | Identify which picture shows liquid water. | Explain *why* a shallow wide puddle dries faster than a deep cup. | Explain what would happen to the water cycle on an ocean planet with zero wind. |
| **Bloom 3: Apply** | Compute the change in water level from $10\text{ mL}$ to $7\text{ mL}$. | Use a temperature-humidity table to predict which city has more evaporation today. | Design a controlled classroom experiment to test if salt slows down evaporation. |
| **Bloom 4: Analyze** | — | Compare evaporation and condensation by sorting 4 everyday examples. | Analyze a flawed student model of a terrarium and diagnose why no "rain" formed on the lid. |

---

## 2. What Can Be Proven vs. What Should Be Proven in Z3

- **What CANNOT be proven purely from surface keywords:**
  - Presence of the word *"Analyze"* or *"Compare"* does not make an item $\text{Bloom } 4$ or $\text{DoK } 3$.
- **What SHOULD be proven in Z3:**
  1. **Hess Matrix Cell Validity:** Certain $(B, \text{DoK})$ pairs are structurally invalid (e.g., $\text{Bloom } 1$ *Remember* cannot be $\text{DoK } 3$ *Strategic Thinking*: $B = 1 \implies \text{DoK} = 1$).
  2. **Structural Non-Degeneracy of High-DoK Claims:**
     - If an item claims $\text{DoK} \ge 2$, it must require at least $m \ge 2$ reasoning steps (`reasoningSteps >= 2`) and cannot use a verbatim `SEEN` classroom example (`contextNovelty == UNSEEN`).
     - If an item claims $\text{DoK} = 3$, it must involve conditional/causal structure or multi-variable interaction and allocate at least $T_{\text{think}}(\text{DoK } 3) \ge 45\text{s}$ of student thinking time.
  3. **Formative Quiz Cognitive Rigor Distribution:**
     - A balanced in-class formative assessment must satisfy target band quotas—for example:
       - $\text{DoK } 1 \in [25\%, 45\%]$ (Foundational floor check)
       - $\text{DoK } 2 \in [40\%, 60\%]$ (Core concept application)
       - $\text{DoK } 3 \in [10\%, 30\%]$ (Strategic transfer check)
  4. **Monotonic Cognitive Scaffolding Order:**
     - Items testing the same Atomic KC (or across the quiz) must be ordered so cognitive rigor ramps smoothly:
       $$\forall i < j, \quad \text{DoK}(q_i) \le \text{DoK}(q_j) + 0$$
     - This prevents placing a $\text{DoK } 3$ question on Item 1, which causes test anxiety and early time-sink traps for struggling learners.
