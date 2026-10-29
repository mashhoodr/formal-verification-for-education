# Dimension 4: Language Load vs. Cognitive Load (Construct-Irrelevant Variance)

## 1. Pedagogical & Psychometric Foundation

In educational measurement (**AERA / APA / NCME Standards for Educational and Psychological Testing**), the #1 threat to valid K–12 assessment is **Construct-Irrelevant Variance (CIV)**: when an assessment unintentionally measures a secondary skill (like advanced English reading comprehension) instead of the target construct (like Grade 4 Fractions or Grade 3 Science).

Using **Sweller's Cognitive Load Theory**, total working memory demand $W_{\text{total}}(q_i)$ on a student answering item $q_i$ is the sum of two distinct loads:

$$W_{\text{total}}(q_i) = C_{\text{intrinsic}}(q_i) + L_{\text{extraneous}}(q_i) \le W_{\text{capacity}}(\text{Stage})$$

1. **Intrinsic Cognitive Load ($C_{\text{intrinsic}}$):** The mental effort inherent to the target Atomic KC and its Depth of Knowledge ($\text{DoK}$):
   - Number of domain variables or quantities to hold in working memory (`workingMemoryChunks`).
   - Number of mental inference/calculation steps (`reasoningSteps`).
   - Causal or relational interactivity ($\text{DoK } 1 \to 3$).
2. **Extraneous Language Load ($L_{\text{extraneous}}$):** The linguistic decoding burden required just to understand what the question is asking:
   - Sentence length ($W/S$) and clause nesting depth (subordinate relative clauses).
   - Non-curriculum poly-syllabic words (`complexWordsNotInAllowlist`).
   - Flesch-Kincaid Grade Level ($\text{FK}$).
   - Negative polarity / double negatives (*"Which of the following is NOT an unlikely cause..."*) and passive voice constructions.

---

## 2. Why Language Load and Cognitive Load Must Be Decoupled

When LLMs are prompted to *"Write a harder (DoK 3) question for Grade 4 Science,"* they almost always conflate **cognitive rigor** with **linguistic complexity**:
- Instead of making the *scientific reasoning* deeper, the LLM writes a 28-word sentence with SAT-level vocabulary (*"simultaneously"*, *"transformation"*, *"subterranean"*).
- **Result:** A student who understands the science deeply but reads at a Grade 3.5 level fails the question. The teacher falsely concludes the student doesn't know Science!

---

## 3. What Z3 Proves for Language Load vs. Cognitive Load

### Theorem 1: The Extraneous Language Ceiling for Non-Reading Subjects
For any assessment where the target subject is **Math, Science, or Social Studies** (i.e., reading decoding is *not* the target KC), extraneous language load must remain strictly at or below the student's grade reading floor **regardless of how high the item's DoK level is**:

$$\forall i, \quad \text{FK}_{\text{non-allowlist}}(q_i) \le \text{FK}_{\max}(\text{Grade}) \quad \land \quad \text{complexNonAllowlistWords}(q_i) = 0$$

### Theorem 2: The Working Memory Trade-Off (Inverse Coupling on High-DoK Items)
Because a student's total working memory capacity $W_{\text{capacity}}(\text{Stage})$ is fixed, **when Intrinsic Cognitive Load rises ($\text{DoK} \ge 3$), Extraneous Language Overhead must be tightened even further**:

$$\text{DoK}(q_i) \ge 3 \implies \begin{cases}
\text{negationCount}(q_i) = 0 & \text{(Zero 'NOT'/'EXCEPT' stems on DoK 3 items)} \\
\text{maxSentenceWords}(q_i) \le W_{\max}(\text{Grade}) - 2 & \text{(Crisper, shorter sentences for complex reasoning)}
\end{cases}$$

- **Why banning negations on $\text{DoK } 3$ matters:** Processing a negative stem (*"Which of these would NOT decrease evaporation?"*) consumes $\sim 1.5$ working memory slots just to invert the boolean polarity. On a $\text{DoK } 1$ item, a Grade 5 student has spare working memory; on a $\text{DoK } 3$ multi-step reasoning item, that polarity inversion pushes $W_{\text{total}} > W_{\text{capacity}}$, causing careless polarity-flip errors!
