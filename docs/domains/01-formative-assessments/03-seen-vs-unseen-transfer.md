# Dimension 3: Classroom Alignment — "Seen vs. Unseen" Transfer

## 1. Pedagogical Foundation: The "Illusion of Competence" from Seen Examples

One of the most common failures in classroom assessment is **confusing rote memory of a classroom example with conceptual mastery of the skill**.

Suppose a Grade 3 teacher explains **condensation** in class using two worked examples:
- `SEEN_1`: Water droplets forming on the outside of a cold glass of iced lemonade.
- `SEEN_2`: Clouds forming high in the sky.

Now suppose the exit ticket at the end of class asks:
> *"Why do water droplets form on the outside of a cold glass of iced lemonade?"*

- **Without Classroom Context Awareness:** An isolated LLM evaluator will tag this question as **Bloom 2/3 (Understand/Apply)** and **Webb's DoK 2** because it asks a *"Why"* cause-and-effect question.
- **With Classroom Context Awareness:** Because `cold glass of iced lemonade` is in `workedExamplesSeen`, a student can answer it purely by **verbatim episodic recall ($\text{Bloom } 1, \text{DoK } 1$)** of what the teacher said 15 minutes ago!

To genuinely measure **DoK 2 (Application)** or **DoK 3 (Strategic Transfer)**, the question must use an **Unseen Context** (`UNSEEN`):
- **Near Transfer (`UNSEEN_NEAR`):** *"Why does a bathroom mirror fog up when you take a hot shower?"* (Same phase-change mechanism, new everyday surface).
- **Far Transfer (`UNSEEN_FAR`):** *"An astronaut breathes inside a cool space helmet and notices tiny water drops on the visor. Where did the water come from?"* (Unfamiliar environment requiring invariant principle extraction).

---

## 2. Formalizing the Classroom Context Graph

Every formative assessment verification request takes a **Lesson Context Specification**:

```json
{
  "lessonId": "g3-water-cycle-lesson-2",
  "targetAtomicKcs": ["KC-3.2.A1", "KC-3.2.B1"],
  "workedExamplesSeen": [
    "boiling kettle on a stove",
    "shallow rain puddle on a sidewalk",
    "cold glass of iced lemonade"
  ],
  "approvedDomainVocabulary": ["evaporation", "condensation", "water vapor"]
}
```

Each candidate question $q_i$ is tagged with its scenario novelty class:
$$\text{novelty}(q_i) \in \{\text{SEEN}, \text{UNSEEN\_NEAR}, \text{UNSEEN\_FAR}\}$$

---

## 3. What Z3 Proves for "Seen vs. Unseen" Alignment

### Theorem 1: The Transfer Collapse & Validity Law
An item's **Effective DoK ($\text{DoK}_{\text{eff}}$)** is bounded by its context novelty. If an item reuses a `SEEN` classroom example, its effective cognitive depth is capped at $\text{DoK } 1$ regardless of its question verb:

$$\text{novelty}(q_i) = \text{SEEN} \implies \text{DoK}_{\text{eff}}(q_i) = 1$$

$$\text{claimedDoK}(q_i) \ge 2 \implies \text{novelty}(q_i) \in \{\text{UNSEEN\_NEAR}, \text{UNSEEN\_FAR}\}$$

If an LLM generates a $\text{DoK } 2$ question that reuses `"cold glass of iced lemonade"`, Z3 flags an `UNSAT Core` conflict on `q_transfer_novelty_validity` and instructs the repair loop:
> *"Question q2 claims DoK 2 but reuses classroom example 'cold glass of iced lemonade' (SEEN). Replace the scenario with an UNSEEN context (e.g., foggy car windshield or dew on morning grass) to test true conceptual transfer."*

### Theorem 2: The Formative Diagnostic Pair (`SEEN` Anchor + `UNSEEN` Transfer)
For any target Atomic KC $k$ tested on a formative quiz, Z3 enforces that the quiz includes **both** a `SEEN` anchor item (or low-barrier recall check) **and** at least one `UNSEEN` transfer item:

$$\forall k \in \mathcal{K}_{\text{target}}, \quad \left(\exists i : q_{i,k}=1 \land \text{novelty}(q_i) = \text{SEEN}\right) \land \left(\exists j : q_{j,k}=1 \land \text{novelty}(q_j) \neq \text{SEEN}\right)$$

#### Why This Diagnostic Pair Is Gold for Teachers:
- **Student passes `SEEN` AND passes `UNSEEN`:** True conceptual mastery ($\text{KC}$ internalized).
- **Student passes `SEEN` BUT fails `UNSEEN`:** Student was paying attention in class (memorized the teacher's example) but failed to abstract the underlying rule—needs a second varied example, not a repeat of the same lecture!
- **Student fails `SEEN` AND fails `UNSEEN`:** Foundational gap or misconception on the core rule itself.
