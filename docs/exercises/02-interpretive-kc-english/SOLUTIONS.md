# Solutions: Exercise 2

Open only after writing your own answer for the part.

---

## Part 1

### Five tasks

1. Read the paragraph. Which sentence tells what the whole paragraph is about?
2. Read the paragraph. In your own words, what is it mostly about?
3. Here is the main idea. Which sentence gives a detail that supports it?
4. Is the sentence "Camels can drink 100 litres of water in ten minutes" the main idea or a detail?
5. What is the paragraph about, in one or two words? Now, what does it say about that?

### A paragraph to work on

> A camel's hump is full of fat, not water. **Camels have many special features that help them live in the desert.** Their wide feet stop them sinking into sand. Long eyelashes keep the sand out of their eyes.

Topic sentence second, by design.

### The judgments, written out

Solving task 1 on this paragraph, slowly:

- I read all four sentences and resolved "their" in sentence 3 and 4 back to "camels". That felt automatic. It is a prerequisite, not this KC.
- I noticed that every sentence mentions camels or a camel part. **Judgment A: the topic is camels.**
- I asked of each sentence whether it states one fact about camels or says something about camels in general. Sentence 1 is one fact about humps. Sentence 2 is about camels in general. Sentences 3 and 4 are one fact each. **Judgment B: sentence 2 is general, the others are specific.**
- I picked sentence 2 because it is both general and about the topic. **Judgment C: selection.**
- I checked that sentences 3 and 4 are examples of "special features", and sentence 1 is too. **Judgment D: the details support the general sentence.**
- For task 2 I restated it as "camels have body parts that help them in the desert", not as "camels". **Judgment E: expressing the main idea as topic plus what is said about it.**

### Candidate KCs

| | KC | Rule |
| :-- | :-- | :-- |
| A | Identify the topic | The thing most sentences refer to, in one or two words |
| B | Discriminate a general statement from a specific one | Does the sentence cover many cases or state one fact |
| C | Select the topic sentence | The sentence that is general and about the topic |
| D | Judge whether a detail supports the main idea | Is this sentence an example or reason for the general sentence |
| E | Express the main idea as topic plus comment | Not the topic word alone, not a copied sentence |

B is the cognitive rule at the centre. C is B applied inside a paragraph. D is the "key supporting details" half of the clause, and it is a different relation from B: support, not generality.

### A real wrong answer each

| KC | Wrong answer a Grade 3 child gives | Source |
| :-- | :-- | :-- |
| A | "Humps", because it was the most striking word and came first | Catalog `BUG_READ_ISOLATED_DETAIL_AS_MAIN`, applied at the topic level |
| B | Judges the longest sentence to be the general one. Judges a sentence with "all" or "always" to be general even if it is a single fact. | Baumann's main idea studies |
| C | Picks sentence 1 because it is first. Picks the 100-litres sentence because it is vivid. Picks sentence 4 because it is last. | Position heuristic; catalog `BUG_READ_ISOLATED_DETAIL_AS_MAIN`; the demo's own third misconception |
| D | Accepts any sentence from the paragraph as supporting, because it is in the paragraph. Accepts "camels live in Pakistan" as supporting, because it is true. | Membership mistaken for support; background knowledge intrusion |
| E | Answers "camels" | Catalog `BUG_READ_TOPIC_WORD_SUBSTITUTION` |

### Dimensions along which a paragraph can vary

| Dimension | Changes which rules are needed? | Fixed by the clause? |
| :-- | :-- | :-- |
| Topic sentence explicit or implied | Yes. Implied needs B applied to generate a sentence, not select one. | Yes, explicit. This is the Grade 4 boundary. |
| One paragraph or several | Yes. Several needs synthesis across paragraphs. | Yes, one paragraph. Also the Grade 4 boundary. |
| Topic sentence first, middle or last | No new rule, but first enables a shortcut that bypasses B. | No. The clause is silent. |
| Informational or narrative | Yes. The main idea of a story is what happened, which is a different rule. | No. The sibling clause `E-03-B2-03` says both fiction and non-fiction are in grade. |
| Pronouns versus repeated nouns | No new rule, but adds a hidden prerequisite load. | No. |
| A vivid distracting detail present | No. It exposes a bug. | No. |
| Vocabulary and sentence length | No. Language load, Dimension 4. | Indirectly, by grade spec. |

### The verb trap, reversed

One verb, five rules. In fractions, verb counting over-split: "name" and "write" were one rule. Here it under-splits: "identify" hides B, C, D and E, and nothing names A at all. A single-verb check would pass "Identify main idea of a text" as atomic, which is the demo KC in the repo. The count is right and the conclusion is wrong, in both directions, which is why it is a weak proxy even when honestly derived.

## Part 2

### Test 1. Can a child know half of it?

| KC | Answer | Evidence |
| :-- | :-- | :-- |
| A | No | Binary: names the referent or not. |
| B | **Yes** | A child can judge generality when the general sentence uses "many" or "all" and fail when it does not. The cue word is doing the work, not the rule. Whether to split depends on whether you will teach the no-cue case separately. For Grade 3, keep as one KC and make "no cue word" a difficulty factor. |
| C | **Yes** | A child picks the topic sentence correctly when it is first and fails when it is second. This is not two KCs. It is one KC and one shortcut. The shortcut is the thing to design items against. |
| D | **Yes** | A child accepts examples as support but rejects reasons, or the reverse. Example-support and reason-support may be two KCs by Grade 5. At Grade 3 the clause only needs examples. Keep as one. |
| E | No | Either the child produces a predicate or not. |

### Test 2. Wrong answers

All five pass. See the Part 1 table. Note that D's errors are not in the catalog at all, which is the first finding about the repo: the catalog has no supporting-details bugs, so the "key supporting details" half of the clause has no error model anywhere.

### Test 3. Surface-different items

| KC | Item pair | Principled reason? | Kind |
| :-- | :-- | :-- | :-- |
| C | Topic sentence first versus second | Yes. The first-sentence child passes one and fails the other. | **Shortcut confound.** Not a boundary and not a bug. A child who passes the first version may have C or may have a heuristic. Items for C must vary position. |
| C | Informational paragraph versus a four-sentence story | Yes. The story's main idea is an event summary, not a general statement. | **KC boundary.** Narrative main idea is a different KC. The NCP puts both in Grade 3. |
| C | Explicit topic sentence versus none | Yes. Without one, the child must compose, not select. | **KC boundary**, and it is the Grade 3 to Grade 4 boundary. Out of scope for this clause. |
| C | Vivid detail present versus absent | Yes. The detail-picker fails when it is present. | **Bug-exposing item design.** Keep the vivid detail in. |
| B | General sentence with "many" versus without | Yes. The cue-word child fails without it. | Bug-exposing item design, or a difficulty factor if you want to report it. |
| D | Detail that is an example versus a reason | At Grade 3, marginal. | Difficulty factor, not a boundary yet. |
| A, C | Nouns repeated versus pronouns | Yes, some children lose the referent. | **Hidden prerequisite load**, not a boundary. Control it in items. |

The third kind, the shortcut confound, is the new thing. In fractions a child could not get 1/4 + 2/4 right by a heuristic that bypasses the rule. Here a child can get the main idea right by picking sentence 1, and the item cannot tell. This is what Part 6 of Exercise 1 proves about.

### Test 4. Sibling test

| Pair | First without second? | Second without first? | Relation |
| :-- | :-- | :-- | :-- |
| A, C | Yes. Knows it is about camels, picks the vivid sentence. | Rarely. Picking the topic sentence without knowing the topic is luck. | A is a prerequisite of C. |
| B, C | Yes. Can sort isolated sentences by generality, fails in a paragraph because the first-sentence habit takes over. | Yes. Picks the right sentence by position, cannot sort sentences. | Both directions exist, so they are distinct. B is the rule, C is the rule applied under distraction. Report as one KC, test B in isolation once as a purity item. |
| C, D | Yes. Picks the topic sentence, cannot say why sentence 3 supports it. | Yes. Given the main idea, judges support correctly, could not have found it. | Siblings. Both are in the clause. |
| C, E | Yes. Picks sentence 2, restates as "camels". | No. A child who can restate the main idea can pick it. | C is a prerequisite of E. |
| D, E | Yes. | Yes. | Siblings. |

### Test 5. One worked example

A, C, D, E: yes. B: no, strictly. Teaching generality needs a general sentence contrasted with a specific one, which is two examples of different kinds. That is a sign B is the real conceptual KC and the others are its applications.

### Verdicts

| KC | Verdict | Reason |
| :-- | :-- | :-- |
| A | Keep as a prerequisite with one anchor item | Test 4 |
| B, C | Report as one KC, "identify the explicit topic sentence". Items must vary topic sentence position and include a vivid detail. One isolated-sentence item for B as a purity check. | Tests 1, 3, 4 |
| D | Keep as its own KC. It is half the clause. Build its error model, since the catalog has none. | Test 2 |
| E | Keep. It is what makes the topic-word bug observable. In an MCQ it is tested inside C by the topic-word distractor. In short answer it is tested directly. | Test 4 |
| Narrative main idea | Add as a separate KC under the same clause, or scope the clause to informational text explicitly | Test 3 |
| Edges | A before C. C before E. | Test 4 |

### What the demo KC covers

The repo's Grade 3 KC is "Identify main idea of a text", repaired to "Identify explicit main idea in a single paragraph with topic sentence". It covers C and, through its misconception list, E. It drops A, which is fine since it is a prerequisite. It drops D entirely, and D is named in the clause. Test 2 exposed it: when you try to write D's wrong answers, you find nothing in the catalog and nothing in the KC. The lexical anchor would have caught it too: "supporting" and "details" are in the clause and in no KC title.

## Part 3

### Answers

**1.** Theorem 0.3 compares `(operation_code, mechanism_complexity)` pairs. The Grade 3 and Grade 4 KCs both carry `identify_main_idea`, so the only thing separating them is the integer. At Step 0 it is 4 on both, line 801, and the theorem fails. At Step 1 the Grade 3 integer becomes 2, line 848, and the theorem passes. That integer is a hand-written field. Line 209 of the kernel binds it to Z3 as a fact.

**2.** The repair at lines 847 to 849 changes the title, the integer, and the misconception list. Z3 reads the integer at line 209 and the count of distinct misconception strings at lines 202 and 212. It never reads the title. The title is the only part of the repair that describes what changed pedagogically.

**3.** Keyword derivation at `curriculum_grounding.py` lines 60 to 65. "Identify the main idea in a single sentence" derives to 2 because of "single", and is not even the Grade 3 skill. "Synthesize the main idea of a single paragraph" derives to 4 because of "synthesis" and is plainly Grade 3. The label has moved from the integer to the word. It is still a label.

**4.** "M3_confuses_concluding_example_with_main_idea" is not in the catalog. The catalog's main idea bugs are `BUG_READ_ISOLATED_DETAIL_AS_MAIN` and `BUG_READ_TOPIC_WORD_SUBSTITUTION`. The kernel does not care: line 202 counts distinct lowercase strings. Also note the Step 0 string "M2_picks_overly_broad_topic_word_only" fuses two errors the catalog keeps separate, too-broad and topic-word. The count sees one string. The exercise's Part 1 sees two bugs.

**5.** Nobody can name them. "Observable variables" is a construct from arithmetic word problems, where it means the quantities a child must hold. For a main idea task there is no such count. The number 2 at line 803 is not a label for something unmeasured. It is a label for something undefined. Theorem 0.4's working memory half should not be asserted for interpretive KCs at all. The honest move is to mark it as an epistemic boundary for this subject, not to bind a number.

### Audit table

| Theorem | Input in the English triad | Verdict | Derived input for an interpretive KC |
| :-- | :-- | :-- | :-- |
| 0.1 DAG acyclicity | Edges G2 to G3 to G4, lines 808, 824, 840. Ranks free. | Genuine | Same as now |
| 0.2 Monotonicity and bridge | Grade field, from the SLO code | Ground fact, honest | Same as now |
| 0.3 Disjointness and progression | Integer at lines 801 and 848, keyword-derived at grounding lines 60 to 65 | Label-dependent. The keyword derivation is the label in another form. | Stimulus parameters: `paragraphCount` and `topicSentenceExplicit`, measured on the item's passage, with Grade 3 as (1, true) and Grade 4 as (>1, false) |
| 0.4 Verb and working memory | `verb_count=1` on a title hiding five rules; `observable_variables_count=2` with no referent | Label-dependent, and the working memory half is undefined for this KC type | Verb: a dependency parse of the title, knowing it still under-splits. Working memory: do not assert. Replace with a reading-load measure from the analyzer, sentence count and pronoun chain length. |
| 0.5 Misconception minimum | Three strings, one not in the catalog, one fusing two catalog bugs | Label-dependent | Catalog membership by bug ID, and for the detail and topic-word bugs, the structural distractor signatures from Exercise 1 Part 6 |
| 0.6 Coverage and no orphans | One KC links to `E-03-B2-01.c1`, line 809 | Genuine for "not forgotten", theater for truth. Here the truth failure is concrete: the clause names supporting details and no KC covers them. | The two-direction lexical anchor. It fails this triad on dropped words "supporting" and "details". |

### Try it

Run A: Step 1 title, `mechanism_complexity=4`. `UNSAT`, with two trackers in the core: the boundary disjointness tracker for G3 versus G4, and the progression tracker requiring Grade 4's maximum to exceed Grade 3's. The good title did not help.

Run B: Step 0 title "Identify main idea of a text", `mechanism_complexity=2`. `SAT`. The bad title did not hurt.

The verdict follows the integer and only the integer.

### The stimulus parameters

The NCP boundary is explicit versus implied and single versus multi-paragraph. Both are facts about the passage, not about the KC's prose.

- `paragraphCount`: the linguistic analyzer can compute this today from blank-line or indentation breaks. It is the interpretive analog of "like versus related denominators".
- `topicSentenceExplicit`: whether one sentence in the paragraph is general and the rest are specific instances of it. The analyzer cannot compute this. The structural proxies from Exercise 1 Part 6 get part way: one sentence with high content-word overlap with every other sentence, no number or proper noun in it, and position varied across items. The remainder is an expert tag, and should be labelled as the Layer 2 boundary for this KC.

With those two parameters bound as facts, Theorem 0.3 for main idea stops comparing integers and starts comparing measured properties of the texts the KC will be tested on. That is the same move as deriving fraction complexity from the denominator relation, and it is the only way the Grade 3 to Grade 4 boundary for this KC becomes a proof.
