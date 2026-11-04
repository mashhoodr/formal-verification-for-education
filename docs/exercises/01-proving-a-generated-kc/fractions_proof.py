"""
Exercise Part 5 reference solution: the procedural-KC diagnosability proof.

KC under test (NCP Grade 2, clause M-02-A-32):
    "Add like fractions within one whole"  ->  a/b + c/b

Each rule (correct or buggy) is a function of the item numbers (a, b, c) that
returns a fraction as an integer pair (numerator, denominator). Z3 is asked:
does there EXIST an item inside the grade envelope on which every rule gives a
different number? SAT returns a witness item. UNSAT is a theorem about the KC.

Run:  .venv/bin/python docs/exercises/01-proving-a-generated-kc/fractions_proof.py
"""
import itertools
import z3

GRADE2_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10]   # NCP M-02-A-30 allowedDenominators

# --- Rules: (numerator, denominator) as Z3 integer expressions -------------
def correct(a, b, c):          return (a + c, b)
def bug_add_both(a, b, c):     return (a + c, b + b)      # BUG_FRAC_ADD_BOTH (catalog)
def bug_multiply_tops(a, b, c): return (a * c, b)         # generator-proposed, NOT in catalog
def bug_add_bottoms(a, b, c):  return (a + c, b + b)      # looks new, is ADD_BOTH renamed

def differ(f, g):
    """Fractions p1/q1 != p2/q2  <=>  p1*q2 != p2*q1 (stays in integers)."""
    (p1, q1), (p2, q2) = f, g
    return p1 * q2 != p2 * q1

def envelope(s, a, b, c, denominators):
    s.add(z3.Or(*[b == d for d in denominators]))
    s.add(a >= 1, a < b, c >= 1, c < b)
    s.add(a + c <= b)                      # "within one whole"

def prove_diagnosable(rules, denominators, label):
    a, b, c = z3.Ints("a b c")
    s = z3.Solver(); s.set(unsat_core=True)
    envelope(s, a, b, c, denominators)
    names = list(rules)
    for x, y in itertools.combinations(names, 2):
        s.assert_and_track(differ(rules[x](a, b, c), rules[y](a, b, c)), z3.Bool(f"{x}_ne_{y}"))
    r = s.check()
    print(f"\n[{label}] denominators={denominators} rules={names}\n  -> {r}")
    if r == z3.sat:
        m = s.model()
        av, bv, cv = m[a].as_long(), m[b].as_long(), m[c].as_long()
        print(f"  witness item: {av}/{bv} + {cv}/{bv}")
        for n in names:
            p, q = rules[n](av, bv, cv)
            print(f"    {n:18} -> {p}/{q}")
    else:
        print("  UNSAT core:", [str(x) for x in s.unsat_core()])
    return r

def count_envelope(denominators):
    return sum(1 for b in denominators for a in range(1, b) for c in range(1, b) if a + c <= b)

if __name__ == "__main__":
    base = {"correct": correct, "add_both": bug_add_both, "multiply_tops": bug_multiply_tops}

    print(f"Items in the Grade 2 envelope: {count_envelope(GRADE2_DENOMINATORS)}")

    # Run 1: KC-level proof over the full Grade 2 envelope
    prove_diagnosable(base, GRADE2_DENOMINATORS, "run1 full envelope")

    # Run 2: shrink the envelope to halves only -> no item can separate the bugs
    prove_diagnosable(base, [2], "run2 halves only")

    # Run 3: pairwise separability decides merges. A renamed duplicate bug is caught.
    with_dup = dict(base, add_bottoms=bug_add_bottoms)
    for x, y in itertools.combinations(with_dup, 2):
        prove_diagnosable({x: with_dup[x], y: with_dup[y]}, GRADE2_DENOMINATORS, f"run3 pair {x} vs {y}")

    # Run 4: item-level (pointwise) check of a specific generated item: 2/4 + 2/4
    a, b, c = 2, 4, 2
    outs = {n: f(a, b, c) for n, f in base.items()}
    print(f"\n[run4 pointwise] item {a}/{b} + {c}/{b}:", outs)
    collisions = [(x, y) for x, y in itertools.combinations(outs, 2)
                  if outs[x][0] * outs[y][1] == outs[y][0] * outs[x][1]]
    print("  collisions:", collisions or "none")
