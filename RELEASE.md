# Owner setup and release checklist

No signing, publication, repository creation, push, or installation was performed while building this project. The primary path is the manually dispatched **Release Firefox add-on** workflow; `tools/release.ps1` is the manual fallback.

## One-time setup — owner

1. Create **public** GitHub repository `hvtax/hvte-lacrm-launcher`. Do not use `hvtax/hvte-lacrm`. Put this project at its root, including package-lock.json and both workflows, and set `origin` to `https://github.com/hvtax/hvte-lacrm-launcher.git` (SSH is also supported). Commit and push the initial source to the default branch. Never commit AMO credentials or client data.
2. Confirm the working add-on ID **`hvte-lacrm-launcher@hvtaxexperts.com`** before the first signing. The exact URL must be **`https://hvtax.github.io/hvte-lacrm-launcher/updates.json`**. Release assets use `https://github.com/hvtax/hvte-lacrm-launcher/releases/download/v<version>/hvte-lacrm-launcher-<version>.xpi`. If the repository owner/name differs, **stop**; do not bypass the guard. Resolve all configuration before any installation.
3. **Firefox retains the update_url from the INSTALLED version. Set the final, stable, real URL BEFORE the first signing that anyone installs. Moving it later strands existing installations. The add-on ID must also never change after signing.**
4. Create an AMO account and [generate API credentials](https://addons.mozilla.org/developers/addon/api/key/). This add-on uses Mozilla's **unlisted** signing channel and is not listed or discoverable on AMO. Release Firefox requires Mozilla signing even for internal distribution.
5. In the repository's Settings → Secrets and variables → Actions, enter `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` as repository secrets yourself. Never give those values to Irene or Codex, and never paste them into the repo, issues, workflow inputs, or logs. No extra signing credential is needed for normal maintainer work.
6. Connect Irene's GitHub access by authorizing the **Muse GitHub App** for **this repository only** using the owner's GitHub connection flow. Verify she can edit source, push to the default branch, and dispatch/watch Actions. Do not grant access to unrelated repositories. The maintainer never receives or handles AMO credentials.
7. Enable GitHub Actions. The release workflow uses only `contents: write`; repository branch rules must allow its update-feed commit. If organization rules prevent that, resolve the policy before releasing. Do not quietly bypass protections.
8. Settings → Pages → Build and deployment → Source: **GitHub Actions**. The companion **Publish update feed** workflow has only `contents: read`, `pages: write`, and `id-token: write`, needed to deploy Pages. Keep any `github-pages` environment deployment restrictions compatible with the default branch. Dispatch `pages.yml` once on the default branch and verify its successful deployment and the public updates.json URL. Its initial 1.0.0 asset link is a template and will return 404 until the first release; do not distribute yet.
9. Confirm the feed and XPI can be fetched anonymously: **a private repository breaks self-update**. The repo contains only code and form URLs, no secrets or client data. Review or replace all three owner-provided seed actions before rollout, preserving Cognito's prefill shape.

Why a second workflow: [GitHub does not trigger a Pages build for commits made with GITHUB_TOKEN](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). `pages.yml` runs after a successful release via `workflow_run` and deploys only updates.json from the latest default branch. It also supports manual dispatch and human pushes to updates.json. This keeps Pages permissions out of release.yml and requires no additional credential. [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) describes the deployment permissions.

## Pre-release checklist — every release

- Confirm `origin`, actual GitHub repository, add-on ID, and update URL match the exact values above. Confirm the final URL before first signing/installation.
- Confirm the repository and assets remain public and the feed is available anonymously.
- Review src/actions.js for intended targets and no client data; check config.js retains its production host and default always-show setting.
- Choose a new, higher manifest version (initial 1.0.0); compare with **all tags and AMO signed versions**, including failed/partial releases. AMO versions can never be reused. Add a CHANGELOG entry. Commit source changes and leave a clean working tree.
- Run npm test and npm run lint. Complete the applicable README manual checks in a test profile. Do not put client data in test artifacts.

## Primary path — Actions

1. Push the reviewed source commit to the default branch. Do not create a release tag yourself.
2. In Actions → **Release Firefox add-on** → Run workflow, select the **default branch** and run. Dispatch from another branch is intentionally skipped. Only manual dispatch can sign/release; pushes cannot.
3. Watch each step. The workflow refuses a wrong repository/ID/update URL, dirty source, or a version not higher than existing release tags. It runs npm ci, tests, lint, build, and AMO unlisted signing using the owner's secrets. It waits up to 15 minutes for signing approval.
4. On success it publishes tag `v<version>` at the tested source commit with the signed XPI under the stable filename, computes SHA-256, updates updates.json while retaining older entries, and commits/pushes the feed to the default branch. The run summary includes version, release URL, and feed URL.
5. Also wait for **Publish update feed** to complete. In a private window with no GitHub login, open the feed, check its new version and update_link, and download the signed XPI. Hash the downloaded file and compare with `update_hash` (`sha256:<hex>`). A command-line equivalent is anonymous `curl -fL` followed by `Get-FileHash -Algorithm SHA256` on Windows. A successful release run alone is not proof that Pages has deployed.
6. Pull the bot's feed commit before the next change. Tell staff the menu update normally arrives within about a day.

If a step fails, capture the failing step and its error verbatim, redacting credentials/client data if unexpectedly present. Stop and investigate with the owner. Signing may consume a version even when the workflow later fails. **Do not rerun signing with that version.** If the GitHub Release exists but the feed push/deploy failed, keep its signed asset and repair/publish the matching updates.json entry manually, then dispatch Pages; do not overwrite the tag or sign again. If signing happened but no asset was published, the owner must inspect AMO and recover the signed file or use a fresh higher version. No automatic overwrite, rollback, or force-push is provided.

## Manual fallback — Windows PowerShell

Use only if Actions is unavailable, coordinated so no workflow is running concurrently. Requires Node 22+ with npm on PATH, git, repository origin set correctly, and the owner's local AMO credentials already present in environment variables named `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`. Supply them through a trusted environment mechanism; never a repo file, command-line argument, or committed script. Irene does not use this path with credentials.

1. Complete the pre-release checklist, commit source changes, push, and open PowerShell in the repository root.
2. Run `./tools/release.ps1`. It fetches tags, checks version/configuration/clean source, runs npm ci, tests, lint, build, and unlisted signing. It stops at the first failure and does not commit, tag, or push. Shared logic in tools/release.mjs reads credentials from environment only and never prints them.
3. The helper copies the single AMO-signed XPI to `web-ext-artifacts/hvte-lacrm-launcher-<version>.xpi` and generates updates.json with the new version, exact release URL, and computed SHA-256. Archive previous signed artifacts outside `web-ext-artifacts/signed` before another signing run; this prevents choosing a stale file. The unsigned ZIP is not installable by release Firefox.
4. Create GitHub Release tag `v<version>` targeting the tested source commit. Attach the stable-named **signed** XPI, publish the release, then review and commit updates.json and push to the default branch. Never publish a feed link before its asset exists. No shell command in the helper publishes anything.
5. Watch the Pages workflow triggered by the feed push, or dispatch **Publish update feed** manually. Verify the feed, asset, and SHA-256 anonymously as above.

The initial updates.json has no hash because no signed XPI exists yet; HTTPS makes the hash optional. Both release paths compute a hash from the actual signed file before publication.

## Mandatory pre-rollout auto-update test

1. Use a separate throwaway Firefox profile. After signing/releasing 1.0.0, install its signed XPI in that profile from the GitHub Release link (or Add-ons and themes → gear → Install Add-on From File). A temporary about:debugging load does not test signed installation or updates.
2. Prepare a harmless change, bump to **1.0.1**, add CHANGELOG entry, and release through the primary path. Wait for Pages and verify its public feed/XPI/hash.
3. In **the test profile only**, open about:config; set `extensions.update.interval` to **120** seconds, verify `extensions.update.enabled` is true, and restart Firefox. Leave staff profiles at the default 86400 seconds (24 hours).
4. Confirm the installed add-on becomes 1.0.1 by itself in about:addons and the harmless menu change appears after revisiting/reloading LACRM. Do not count a manual replacement install as a successful update test. Restore the interval or delete the test profile afterward.
5. If it fails, inspect the Browser Console for update errors, check the installed update_url, public access, matching ID/version, Mozilla signature, and hash. Fix and repeat before **any staff rollout**.

Firefox normally checks about every 24 hours, not instantly. [Mozilla's update documentation](https://extensionworkshop.com/documentation/manage/updating-your-extension/) covers installed update URLs, manifests, hashes, and the test interval. Rolling back requires the old action list under a **new higher** version; Firefox does not downgrade via the feed.
