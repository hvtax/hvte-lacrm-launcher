# HVTE LACRM Launcher

A small Firefox desktop add-on for Hudson Valley Tax Experts LLC staff. A floating green **HVTE** button on a Less Annoying CRM contact page opens Invoice, New Contact, Record (Tom), and Copy ContactId. Contact-dependent actions use the contact from the current page URL at the moment you choose the action.

## Staff installation and updates

Requires Firefox **142 or newer**. After the owner completes the release and update test, use the signed `.xpi` link in the owner's [GitHub Release](https://github.com/hvtax/hvte-lacrm-launcher/releases). Allow Firefox to install it when prompted; if Firefox downloads the file instead, open Add-ons and themes, use the gear menu, choose **Install Add-on From File**, and select that file. Never install the unsigned development ZIP.

Firefox checks for updates automatically, normally every **24 hours**. Menu changes arrive through signed add-on updates, so they are not immediate and may not appear the same morning. Keep Firefox's add-on updates enabled.

Both the GitHub Pages update feed and GitHub Release assets must be readable **without a GitHub login**. A private repository breaks self-update. The source repository must be the public `hvtax/hvte-lacrm-launcher`; it has not been created as part of this project. This project does not use the older `hvtax/hvte-lacrm` repository or Tampermonkey.

**Owner-confirm-before-first-signing:** working add-on ID `hvte-lacrm-launcher@hvtaxexperts.com`. The update URL is `https://hvtax.github.io/hvte-lacrm-launcher/updates.json`, final only if the public repository is created under that exact owner and name. Never change the ID or update URL after staff installation. The three seed actions are owner-specified placeholders; verify or replace them before rollout.

## Changing the menu

All menu entries live in **src/actions.js**; staff cannot edit them. Edit that file, bump `version` in **manifest.json**, add a short CHANGELOG entry, and follow [RELEASE.md](RELEASE.md). For a routine change, Irene follows [MAINTAINER.md](MAINTAINER.md).

Example: add a comma after the last active entry and add this row inside the array:

```js
{ "type": "action", "label": "Office help", "url": "https://example.com/help", "openIn": "newTab" }
```

Replace the example target with your chosen HTTPS address. A URL containing `<CONTACTID>` requires a contact; every occurrence receives the current ID. Leave the token out for a plain launcher. `openIn` defaults to `newTab`; `sameTab` replaces the current tab. Heading and separator examples are commented out in the data file. Never paste a URL with real client information into source control.

Owner settings are in **src/config.js**, including the exact case-sensitive parameter `ContactId` and `SHOW_BUTTON_WITHOUT_CONTACT_ID` (default `false`). With that setting enabled, plain launchers work on any LACRM page and contact-dependent entries are disabled when no contact is open.

Version rules: PATCH for action/config data changes; MINOR for new behavior; MAJOR for add-on ID or update mechanism changes, which effectively require starting over and reinstalling. Every release, including data-only changes, needs a higher manifest version. A version signed through AMO can never be reused. `package.json` is development tooling metadata; `manifest.json` controls the add-on version.

## Privacy

The add-on reads only the page URL. It does not scrape CRM content, make background network requests, store data, or send analytics. Choosing an action opens its configured destination as an ordinary page; a contact-dependent action includes the current ContactId in that destination URL. Copy ContactId writes the ID to your clipboard. Firefox itself contacts the update host to check for releases.

## Development and checks

Install Node.js 22 or newer (24 recommended), npm, and Firefox. Run:

```text
npm ci
npm test
npm run lint
npm run build
```

There are no runtime dependencies, build framework, background scripts, or extra permissions. The ZIP in `web-ext-artifacts` is unsigned and only for development. Only `manifest.json` and `src/` go into the package. Pure logic tests use Node's built-in runner and fictional IDs. Release guard tests also exercise the hard stops on repository/URL mismatches and reused versions.

The navigation monitor checks initial load, DOMContentLoaded, pageshow, popstate, wrapped history calls, and changed URLs on a one-second poll. Both menu opening and action clicks independently extract the current ID. Firefox's page-realm history wrappers use `exportFunction`; the poll covers callers retaining older history methods.

## Manual acceptance checklist

In a throwaway Firefox profile, go to `about:debugging`, select **This Firefox**, **Load Temporary Add-on**, and choose `manifest.json`. Temporary loading is a development check, not staff installation.

- In the owner's own LACRM session, open a contact: the green button appears. Confirm Invoice and Record (Tom) open the intended Cognito forms with the correct JSON entry value. New Contact opens its form without an ID. Never record a real ID in notes or screenshots.
- Open the menu, change the current URL to another dummy/contact ID without reloading, then choose an action: it must use the new ID. Also switch contacts normally and via browser Back/Forward, including a cached page restore.
- Remove the ContactId after opening the menu and choose a contact-dependent action before the poll runs: no navigation occurs, and the button/menu disappear with the default setting.
- On a page with no valid ContactId, no button or menu exists. `ContactID`, non-digits, and IDs only after `#` do not count.
- Copy ContactId uses the current URL, shows **Copied**, then closes. Check normal clipboard and fallback behavior using dummy data only.
- Escape closes the menu and restores button focus; outside click and a second button click close it. Arrow keys navigate enabled items; Tab exits. Check focus outlines and scrolling in a short viewport.
- If testing always-show mode, set it to true temporarily: launchers work without an ID, dependent items are disabled, Copy ContactId is absent. Restore false before release.
- Remove the temporary add-on and reload the page: LACRM is untouched.

Local browser QA can use the same scripts with HOST changed only in the test page's in-memory configuration. Never release a test host in config.js. Live LACRM/Cognito correctness and the signed 1.0.0 → 1.0.1 update test require the owner.

## Troubleshooting

- Missing button: the page URL must contain a digits-only `ContactId` on `https://account.lessannoyingcrm.com`. The default intentionally hides the launcher elsewhere. Also check the add-on is enabled and Firefox is new enough.
- Button present but wrong contact: **stop using the launcher and report immediately**. This is the critical stale-ID bug; avoid further client actions until fixed. Do not include client data in public reports.
- No recent menu change: allow about a day, check automatic updates are enabled, and ask the maintainer to verify the public feed and signed asset.
- Action absent: an invalid or duplicate entry is skipped; inspect the browser console's HVTE configuration warning. Copy unavailable: retry with the page focused.

Release architecture follows [Mozilla's update documentation](https://extensionworkshop.com/documentation/manage/updating-your-extension/) and [web-ext documentation](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/). See RELEASE.md for the Pages workflow required for automated feed publication.
