const HERO_POINT_SLUG = "hero-points";

export function isHeroPointReroll(resource) {
  return resource?.slug === HERO_POINT_SLUG;
}

// Raises every active, evaluated d20 result below `floor` to `floor` and recomputes roll._total.
// Fails closed: the whole computation happens first and throws on any formula shape it cannot
// total safely, so the roll is only mutated after a fully successful computation.
export function applyHeroPointFloor(roll, floor = 10) {
  const floorable = new Set(
    (roll.dice ?? []).filter((die) => die.faces === 20 && die._evaluated !== false),
  );
  const plan = [];
  let total = 0;
  let sign = 1;
  let afterOperator = false;

  for (const term of roll.terms ?? []) {
    if (typeof term.operator === "string") {
      if (term.operator !== "+" && term.operator !== "-") {
        throw new Error(`unsupported operator "${term.operator}"`);
      }
      if (afterOperator) throw new Error("consecutive operators");
      sign = term.operator === "-" ? -1 : 1;
      afterOperator = true;
      continue;
    }
    if (term.terms || term.roll || term.rolls) {
      throw new Error("nested terms (parentheses or pools) are not supported");
    }
    let termTotal = term.total;
    if (floorable.has(term)) {
      const results = (term.results ?? []).map((r) => ({
        r,
        value: r.active === false ? r.result : Math.max(r.result, floor),
      }));
      termTotal = results.reduce((s, { r, value }) => (r.active === false ? s : s + value), 0);
      plan.push({ term, results, termTotal });
    }
    if (typeof termTotal !== "number" || !Number.isFinite(termTotal)) {
      throw new Error("term total is not a finite number");
    }
    total += sign * termTotal;
    sign = 1;
    afterOperator = false;
  }
  if (afterOperator) throw new Error("trailing operator");

  for (const { term, results, termTotal } of plan) {
    for (const { r, value } of results) r.result = value;
    if (term.total !== termTotal) term.total = termTotal; // cached on real Foundry dice
  }
  roll._total = total;
  return roll;
}
