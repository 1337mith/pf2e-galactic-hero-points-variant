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
}
export class FakeOperator {
  constructor(operator) { this.operator = operator; this.total = ` ${operator} `; }
}
export class FakeNumeric {
  constructor(number) { this.number = number; this.total = number; }
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
