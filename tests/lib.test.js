const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const { extractContactId, buildActionUrl, validateActions } = require("../src/lib.js");
const base = "https://account.lessannoyingcrm.com/";
const id = "4135880975157750790228594195764";
test("T1: long fictional ContactId stays a string", () => assert.equal(extractContactId(`${base}?ContactId=${id}`), id));
for (const [name, url] of Object.entries({
  absent: base, empty: `${base}?ContactId=`, letters: `${base}?ContactId=12a`,
  negative: `${base}?ContactId=-1`, decimal: `${base}?ContactId=1.2`,
  whitespace: `${base}?ContactId=123%20`, host: "https://example.com/?ContactId=123",
  subdomain: "https://evil.account.lessannoyingcrm.com/?ContactId=123",
  suffix: "https://account.lessannoyingcrm.com.evil.test/?ContactId=123",
  port: "https://account.lessannoyingcrm.com:444/?ContactId=123",
  http: "http://account.lessannoyingcrm.com/?ContactId=123",
  fragment: `${base}#ContactId=123`, fragmentQuery: `${base}#/?ContactId=123`,
  case: `${base}?ContactID=123`, lowercase: `${base}?contactid=123`,
  invalid: "not a URL", unicodeDigits: `${base}?ContactId=１２３`
})) test(`T2: rejects ${name}`, () => assert.equal(extractContactId(url), null));
test("T3: other parameters, query before fragment, and first duplicate", () => {
  assert.equal(extractContactId(`${base}?a=1&ContactId=000123&b=2#ContactId=999`), "000123");
  assert.equal(extractContactId(`${base}?ContactId=123&ContactId=456`), "123");
  assert.equal(extractContactId(`${base}?ContactId=&ContactId=456`), null);
});
test("settings change the exact parameter name and host", () => {
  assert.equal(extractContactId("https://example.com/?CUSTOM=123", { HOST: "example.com", CONTACT_ID_PARAM: "CUSTOM" }), "123");
});
test("T4: replace every token and encode the supplied value", () => {
  assert.equal(buildActionUrl({ url: "https://example.com/?a=<CONTACTID>&b=<CONTACTID>" }, "a/b &"), "https://example.com/?a=a%2Fb%20%26&b=a%2Fb%20%26");
});
test("T4: plain launchers unchanged; missing ID and unsafe URLs throw", () => {
  assert.equal(buildActionUrl({ url: "https://example.com/" }, null), "https://example.com/");
  assert.throws(() => buildActionUrl({ url: "https://example.com/<CONTACTID>" }, null));
  assert.throws(() => buildActionUrl({ url: "http://example.com/" }, "123"));
  assert.throws(() => buildActionUrl({ url: "javascript:alert(1)" }, "123"));
  assert.throws(() => buildActionUrl({ url: "broken" }, "123"));
});
test("Cognito fragment is preserved verbatim after substitution", () => {
  assert.equal(buildActionUrl({ url: "https://example.com/?entry={'TargetID':'<CONTACTID>'}" }, id), `https://example.com/?entry={'TargetID':'${id}'}`);
});
const action = { type: "action", label: "Example", url: "https://example.com/<CONTACTID>" };
test("T5: accept actions, heading, separator, and default opening mode", () => {
  const entries = [{ type: "heading", label: "Billing" }, action, { type: "separator" }];
  assert.deepEqual(validateActions(entries), { valid: entries, problems: [] });
});
for (const [name, entries] of Object.entries({
  missingLabel: [{ ...action, label: undefined }], duplicateLabel: [action, action],
  nonHttps: [{ ...action, url: "http://example.com/" }],
  unknownType: [{ type: "other", label: "Other" }],
  unknownOpenIn: [{ ...action, openIn: "popup" }],
  missingUrl: [{ type: "action", label: "Missing" }],
  nullEntry: [null]
})) test(`T5: flag ${name} without breaking valid neighbors`, () => {
  const result = validateActions([...entries, { type: "action", label: "Good", url: "https://example.com/" }]);
  assert.equal(result.problems.length, 1);
  assert.ok(result.valid.some(entry => entry.label === "Good"));
});
test("T6: manifest, matches, load order, permissions, and update key", () => {
  const manifest = JSON.parse(readFileSync("manifest.json"));
  const updates = JSON.parse(readFileSync("updates.json"));
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ["https://account.lessannoyingcrm.com/*"]);
  assert.deepEqual(manifest.content_scripts[0].js, ["src/lib.js", "src/config.js", "src/actions.js", "src/content.js"]);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.background, undefined);
  assert.deepEqual(Object.keys(updates.addons), [manifest.browser_specific_settings.gecko.id]);
});
test("seeds retain exact owner templates and order", () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync("src/actions.js", "utf8"), context);
  const entries = JSON.parse(JSON.stringify(context.HVTE_ACTIONS));
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map(entry => entry.label), ["Invoice", "New Contact", "Record (Tom)"]);
  assert.equal(entries[0].url, "https://www.cognitoforms.com/HudsonValleyTaxExperts1/InvoiceForServices2024?entry={'TargetID':'<CONTACTID>'}");
  assert.equal(entries[1].url, "https://www.cognitoforms.com/hudsonvalleytaxexperts1/createlacrmcontact");
  assert.equal(entries[2].url, "https://www.cognitoforms.com/HudsonValleyTaxExperts1/ClientPayment2?entry={'LACRMContact':'<CONTACTID>'}");
  assert.equal(validateActions(entries).problems.length, 0);
});
