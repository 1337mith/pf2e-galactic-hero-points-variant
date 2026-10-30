import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "module.json"), "utf8"));
const systems = manifest.relationships?.systems ?? [];
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const num = (v) => v.split(".").map(Number);
const cmp = (a, b) => {
  const [x, y] = [num(a), num(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

test("declares pf2e as a system of type system", () => {
  const e = systems.find((s) => s.id === "pf2e");
  assert.ok(e, "pf2e entry missing");
  assert.equal(e.type, "system");
});

test("declares sf2e as a system of type system", () => {
  const e = systems.find((s) => s.id === "sf2e");
  assert.ok(e, "sf2e entry missing");
  assert.equal(e.type, "system");
});

test("has no duplicate system ids", () => {
  const ids = systems.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("version is semver", () => {
  assert.match(manifest.version, SEMVER);
});

test("manifest URL contains /v<version>/module.json", () => {
  assert.ok(manifest.manifest.includes(`/v${manifest.version}/module.json`));
});

test("download URL contains /download/v<version>/ and ends -<version>.zip", () => {
  assert.ok(manifest.download.includes(`/download/v${manifest.version}/`));
  assert.ok(manifest.download.endsWith(`-${manifest.version}.zip`));
});

test("compatibility.minimum is 14", () => {
  assert.equal(manifest.compatibility.minimum, "14");
});

test("compatibility.verified is >= minimum", () => {
  assert.ok(cmp(manifest.compatibility.verified, manifest.compatibility.minimum) >= 0);
});

test("every esmodules path exists on disk", () => {
  assert.ok(manifest.esmodules.length > 0);
  for (const p of manifest.esmodules) {
    assert.ok(fs.existsSync(path.join(root, p)), `missing ${p}`);
  }
});
