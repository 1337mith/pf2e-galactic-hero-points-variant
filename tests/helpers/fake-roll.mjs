// Roll-like fakes mirroring the shape captured in the issue #3 spike
// (PF2e 8.6.1, Foundry v14.369): terms are Die / OperatorTerm / NumericTerm.
// OperatorTerm.total is the STRING " - " / " + " (not a number); NumericTerm.total is a number.

export class FakeDie {
  constructor(faces, values, { evaluated = true } = {}) {
    this.faces = faces;
    this.number = values.length;
    this._evaluated = evaluated;
    this.results = values.map((result) => ({ result, active: true }));
  }
  get total() {
    return this.results.reduce((s, r) => s + r.result, 0);
  }
  // Real Foundry DiceTerm exposes these as prototype METHODS (BUG-2). Guards that test
  // `term.roll` for truthiness are therefore true for every plain die.
  roll() { throw new Error("fake: not callable in tests"); }
  reroll() { throw new Error("fake: not callable in tests"); }
  explode() { throw new Error("fake: not callable in tests"); }
}
export class FakeOperator {
  constructor(operator) { this.operator = operator; this.total = ` ${operator} `; }
  roll() { throw new Error("fake: not callable in tests"); }
}
export class FakeNumeric {
  constructor(number) { this.number = number; this.total = number; }
  roll() { throw new Error("fake: not callable in tests"); }
}

// Build a roll from a spec such as [d20(18), "-", 5]. Computes the original
// (pre-clamp) total the way Foundry would: honouring operators.
export function d20(...values) { return new FakeDie(20, values); }
export function die(faces, ...values) { return new FakeDie(faces, values); }

export function makeRoll(spec) {
  const terms = spec.map((t) =>
    typeof t === "string" ? new FakeOperator(t)
      : typeof t === "number" ? new FakeNumeric(t) : t);
  const dice = terms.filter((t) => t instanceof FakeDie);
  const roll = { terms, dice, _evaluated: true, _total: 0 };
  roll._total = evaluate(terms);
  return roll;
}

export function evaluate(terms) {
  let total = 0, sign = 1;
  for (const t of terms) {
    if (t instanceof FakeOperator) sign = t.operator === "-" ? -1 : 1;
    else { total += sign * t.total; sign = 1; }
  }
  return total;
}

export const heroPoints = () => ({ value: 1, max: 3, slug: "hero-points", label: "Hero Points" });

// --- Added for architect-review behaviours (fail-closed, inactive dice, cached totals) ---

// Mirrors Foundry's DiceTerm: `total` is a CACHED value (own data property) computed from the
// ACTIVE results at evaluation time. It does not follow later edits to results[i].result, so
// code that mutates a result must update term.total itself. `actives` marks kh/kl drops.
export function cachedDie(faces, values, actives = values.map(() => true)) {
  const t = new FakeDie(faces, values);
  t.results = values.map((result, i) => ({ result, active: actives[i] }));
  Object.defineProperty(t, "total", {
    value: t.results.filter((r) => r.active).reduce((s, r) => s + r.result, 0),
    writable: true, enumerable: true, configurable: true,
  });
  return t;
}

// ParentheticalTerm shape: has .terms and .roll, own cached total. Nested dice are exposed in roll.dice
// (Foundry's Roll#dice flattens nested dice).
export function parenthetical(innerTerms, total) {
  const inner = makeRoll(innerTerms);
  return { class: "ParentheticalTerm", terms: inner.terms, roll: inner, dice: inner.dice, total };
}
// PoolTerm shape: has .rolls
export function pool(rolls, total) {
  return { class: "PoolTerm", rolls, terms: [], dice: rolls.flatMap((r) => r.dice), total };
}

// makeRoll variant whose dice list includes nested dice contributed by parenthetical/pool terms.
export function makeRollNested(spec) {
  const roll = makeRoll(spec);
  roll.dice = roll.terms.flatMap((t) => (t instanceof FakeDie ? [t] : t.dice ?? []));
  return roll;
}

// Deep snapshot of everything the module could mutate.
export function snapshot(roll) {
  const walk = (r) => ({
    _total: r._total,
    terms: (r.terms ?? []).map((t) => ({
      total: t.total,
      results: t.results?.map((x) => ({ ...x })),
      inner: t.roll && typeof t.roll === "object" ? walk(t.roll) : undefined,
      rolls: t.rolls?.map(walk),
    })),
  });
  return JSON.stringify(walk(roll));
}
