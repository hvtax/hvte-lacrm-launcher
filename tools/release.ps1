# Manual fallback. Run from the repository root after committing source changes.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE). Stop; do not release." }
}
if (-not (Test-Path -LiteralPath 'manifest.json')) { throw 'Run from the repository root.' }
Invoke-Checked git @('fetch', '--tags', 'origin')
Invoke-Checked node @('tools/release.mjs', 'guard')
Invoke-Checked npm.cmd @('ci')
Invoke-Checked npm.cmd @('test')
Invoke-Checked npm.cmd @('run', 'lint')
Invoke-Checked npm.cmd @('run', 'build')
Invoke-Checked npm.cmd @('run', 'sign')
Invoke-Checked node @('tools/release.mjs', 'prepare')
$version = (Get-Content -LiteralPath 'manifest.json' -Raw | ConvertFrom-Json).version
Write-Host @"
Signed package ready: web-ext-artifacts/hvte-lacrm-launcher-$version.xpi
Remaining MANUAL steps (this script never commits, tags, or pushes):
1. Create GitHub Release v$version at https://github.com/hvtax/hvte-lacrm-launcher/releases/new
   targeting your tested source commit. Attach hvte-lacrm-launcher-$version.xpi.
2. Review updates.json: the new version, release asset URL, and SHA-256 have
   already been generated from that signed file. Do not upload the unsigned ZIP.
3. Commit updates.json and push to the default branch so GitHub Pages serves it.
4. Verify https://hvtax.github.io/hvte-lacrm-launcher/updates.json and its
   update_link anonymously in a private window; confirm the downloaded file's hash.
5. Complete the update smoke test in RELEASE.md before staff rollout.
"@
