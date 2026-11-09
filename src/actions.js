/* =====================================================================
   OWNER: EDIT THE MENU HERE. This file is data only.
   Add an action by copying an action row; remove a row to remove an item;
   move rows to reorder them. Keep commas between entries.
   type: "action", "heading" (a label), or "separator" (a thin rule).
   label: required, unique text for actions and headings.
   url: an HTTPS template for actions only. Every <CONTACTID> is replaced
   with the CURRENT contact ID at click time. No token means a plain launcher.
   openIn: "newTab" (default if omitted) or "sameTab".
   After ANY edit, bump "version" in manifest.json and follow RELEASE.md.
   NEVER paste a real client URL containing a real ContactId into this file.
   Menu history: v1.0.0 shipped with Invoice, New Contact, and Record (Tom)
   as owner-approved placeholders. v1.0.2 removed Invoice and Record (Tom)
   at the owner's request and added Set Up New Client, which opens the
   SetUpNewClient Cognito form; that form's Zap adds the household to the
   LACRM group "7.02 Setup HH as new client/prospect" to start setup.
   Preserve the single-quoted Cognito prefill fragments exactly as written.
   ===================================================================== */
globalThis.HVTE_ACTIONS = [
  {
    "type": "action", "label": "New Contact",
    "url": "https://www.cognitoforms.com/hudsonvalleytaxexperts1/createlacrmcontact",
    "openIn": "newTab"
  },
  {
    "type": "action", "label": "Set Up New Client",
    "url": "https://www.cognitoforms.com/HudsonValleyTaxExperts1/SetUpNewClient?entry={'TargetID':'<CONTACTID>'}",
    "openIn": "newTab"
  }
  // ,{ "type": "heading", "label": "Resources" }
  // ,{ "type": "separator" }
  // ,{ "type": "action", "label": "Help", "url": "https://example.com/help" }
  // ,{ "type": "action", "label": "Same tab", "url": "https://example.com/?id=<CONTACTID>", "openIn": "sameTab" }
];
