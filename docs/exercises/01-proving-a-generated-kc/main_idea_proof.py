"""
Exercise Part 6 reference: the interpretive-KC proof for NCP Grade 3 E-03-B2-01
("Identify the main idea ... in a paragraph with an explicit topic sentence").

Variables describe an item's STRUCTURE (positions, lengths, overlap counts,
verbatim flags), never its words. Error categories become typed distractors
(catalog: BUG_READ_ISOLATED_DETAIL_AS_MAIN, BUG_READ_TOPIC_WORD_SUBSTITUTION).
Shortcut heuristics become immunity constraints. Z3 searches for a structure
where the KC picks the key but every shortcut picks a distractor.

Run:  .venv/bin/python docs/exercises/01-proving-a-generated-kc/main_idea_proof.py
"""
import z3

OPTIONS = ["key", "detail", "topic", "broad"]


def build(force_topic_first: bool) -> z3.Solver:
    s = z3.Solver()
    s.set(unsat_core=True)

    def T(name: str, constraint) -> None:
        s.assert_and_track(constraint, z3.Bool(name))

    n = z3.Int("n_sentences")           # paragraph length
    p = z3.Int("topic_sentence_pos")    # where the explicit topic sentence sits
    src = z3.Int("detail_src_pos")      # which sentence the detail distractor copies
    L = {o: z3.Int(f"len_{o}") for o in OPTIONS}        # words in the option
    OV = {o: z3.Int(f"overlap_{o}") for o in OPTIONS}   # content words shared with passage
    VB = {o: z3.Int(f"verbatim_{o}") for o in OPTIONS}  # 1 if copied from a passage sentence

    # Grade 3-5 envelope (grade_specs: <= 14 words per sentence, option spread <= 5)
    T("env_paragraph_len", z3.And(n >= 3, n <= 5))
    T("env_positions", z3.And(p >= 1, p <= n, src >= 1, src <= n))
    for o in OPTIONS:
        T(f"env_len_{o}", z3.And(L[o] >= 1, L[o] <= 14))
        T(f"env_ov_{o}", z3.And(OV[o] >= 0, OV[o] <= L[o]))
        T(f"env_vb_{o}", z3.Or(VB[o] == 0, VB[o] == 1))
    T("env_option_spread", z3.And(*[L[a] - L[b] <= 5 for a in OPTIONS for b in OPTIONS if a != b]))

    # Typed distractors: each error category is a different structural object
    T("key_is_paraphrase_of_topic", z3.And(VB["key"] == 0, OV["key"] >= 3))    # anchored, not copied
    T("detail_is_a_real_sentence", z3.And(VB["detail"] == 1, src != p))        # detail-as-main-idea
    T("topic_is_bare_noun_phrase", z3.And(L["topic"] <= 3, OV["topic"] >= 1))  # topic-as-main-idea
    T("broad_is_outside_passage", z3.And(VB["broad"] == 0, OV["broad"] <= 1))  # too-broad generalisation

    # Shortcut immunity: each heuristic must select a distractor, never the key
    T("immune_to_longest_option", z3.Or(L["key"] <= L["detail"], L["key"] <= L["broad"]))
    T("immune_to_word_overlap", OV["key"] < OV["detail"])
    T("immune_to_verbatim_match", VB["key"] == 0)
    T("immune_to_first_sentence", src == 1)   # sentence 1 is the detail, so "pick sentence 1" fails

    if force_topic_first:
        T("grade_rule_topic_sentence_first", p == 1)
    return s


def report(s: z3.Solver, label: str) -> None:
    r = s.check()
    print(f"\n=== {label} -> {r} ===")
    if r == z3.sat:
        m = s.model()
        for d in sorted(m.decls(), key=lambda d: d.name()):
            if not d.name().startswith(("env_", "immune_", "key_", "detail_is", "topic_is", "broad_is")):
                print(f"  {d.name():20} = {m[d]}")
    else:
        print("  UNSAT core:", [str(c) for c in s.unsat_core()])


if __name__ == "__main__":
    report(build(force_topic_first=False), "topic sentence position free")
    report(build(force_topic_first=True), "topic sentence forced to position 1")
