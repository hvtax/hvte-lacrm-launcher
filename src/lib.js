/* Pure helpers shared by the content script and Node tests. */
(function (root) {
  "use strict";
  const TOKEN = "<CONTACTID>";
  function extractContactId(urlString, config = root.HVTE_CONFIG || {}) {
    try {
      const url = new URL(urlString);
      if (url.protocol !== "https:" || url.host !== (config.HOST || "account.lessannoyingcrm.com")) return null;
      const value = url.searchParams.get(config.CONTACT_ID_PARAM || "ContactId");
      return value !== null && /^\d+$/.test(value) ? value : null;
    } catch { return null; }
  }
  function requiresContactId(action) { return action.url.includes(TOKEN); }
  function buildActionUrl(action, contactId) {
    if (typeof action.url !== "string") throw new Error("Missing URL template");
    if (requiresContactId(action) && !contactId) throw new Error("No contact is open");
    const built = action.url.split(TOKEN).join(encodeURIComponent(contactId || ""));
    if (new URL(built).protocol !== "https:") throw new Error("HTTPS is required");
    // Validate with URL(), but return the original text to preserve Cognito's
    // owner-specified prefill fragment without extra serialization/encoding.
    return built;
  }
  function validateActions(entries) {
    const valid = [], problems = [], labels = new Set();
    if (!Array.isArray(entries)) return { valid, problems: ["Action list must be an array"] };
    entries.forEach((entry, index) => {
      const name = typeof entry?.label === "string" ? entry.label : `index ${index}`;
      try {
        if (!entry || !["action", "heading", "separator"].includes(entry.type)) throw new Error("Unknown entry type");
        if (entry.type !== "separator") {
          if (typeof entry.label !== "string" || !entry.label.trim()) throw new Error("Missing label");
          if (labels.has(entry.label)) throw new Error("Duplicate label");
        }
        if (entry.type === "action") {
          if (entry.openIn !== undefined && !["newTab", "sameTab"].includes(entry.openIn)) throw new Error("Unknown openIn");
          buildActionUrl(entry, "1234567890");
        }
        if (entry.type !== "separator") labels.add(entry.label);
        valid.push({ ...entry });
      } catch {
        // Never include exception messages or templates: URL errors may expose IDs.
        problems.push(`Invalid action configuration: ${name}`);
      }
    });
    return { valid, problems };
  }
  const lib = { extractContactId, requiresContactId, buildActionUrl, validateActions };
  root.HVTE_LIB = lib;
  if (typeof module !== "undefined" && module.exports) module.exports = lib;
})(globalThis);
