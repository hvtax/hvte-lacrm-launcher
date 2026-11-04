const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
test("release guards enforce repository, update URL, ID, and monotonic version", async () => {
  const { repositoryFromRemote, assertConfiguration, assertNewVersion } = await import("../tools/release.mjs");
  const manifest = JSON.parse(readFileSync("manifest.json"));
  for (const remote of ["https://github.com/hvtax/hvte-lacrm-launcher.git", "git@github.com:hvtax/hvte-lacrm-launcher.git", "ssh://git@github.com/hvtax/hvte-lacrm-launcher.git"]) {
    assert.equal(repositoryFromRemote(remote), "hvtax/hvte-lacrm-launcher");
  }
  assert.equal(repositoryFromRemote("https://evil.test/hvtax/hvte-lacrm-launcher.git"), null);
  assert.doesNotThrow(() => assertConfiguration(manifest, "hvtax/hvte-lacrm-launcher"));
  assert.throws(() => assertConfiguration(manifest, "hvtax/other"));
  const wrong = structuredClone(manifest);
  wrong.browser_specific_settings.gecko.update_url = "https://example.com/updates.json";
  assert.throws(() => assertConfiguration(wrong, "hvtax/hvte-lacrm-launcher"));
  assert.throws(() => assertNewVersion("1.0.0", ["v1.0.0"]));
  assert.throws(() => assertNewVersion("1.0.1", ["v1.0.2"]));
  assert.doesNotThrow(() => assertNewVersion("1.0.10", ["v1.0.9"]));
});
