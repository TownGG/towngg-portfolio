# Run from Windows PowerShell after the Dropbox App Folder has synced locally.
param(
  [Parameter(Mandatory = $true)] [string]$DropboxFolder,
  [string]$ProjectUrl = 'https://chatgpt.com/g/g-p-6a2f54075020819182814db2e3a50212/project',
  [switch]$Live,
  [switch]$Once,
  [string]$RetryTaskId,
  [int]$MaxParallel = 3
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $DropboxFolder -PathType Container)) {
  throw "Dropbox local folder does not exist: $DropboxFolder"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is not installed or is missing from PATH.'
}
if ($Live -and -not (Get-Command dsh -ErrorAction SilentlyContinue)) {
  throw 'DeepSeek Harness (dsh) is missing from PATH.'
}
if ($MaxParallel -lt 1 -or $MaxParallel -gt 10) {
  throw 'MaxParallel must be between 1 and 10.'
}

$env:PPT_BRIDGE_ROOT = (Resolve-Path -LiteralPath $DropboxFolder).Path
$env:PPT_CHATGPT_PROJECT_URL = $ProjectUrl
$env:PPT_BRIDGE_DRY_RUN = if ($Live) { '0' } else { '1' }
$env:PPT_BRIDGE_MAX_PARALLEL = [string]$MaxParallel
$script = Join-Path $PSScriptRoot 'ppt-dropbox-watcher.mjs'

$watchArgs = @($script)
if ($Once) { $watchArgs += '--once' }
if ($RetryTaskId) { $watchArgs += @('--retry', $RetryTaskId) }

Write-Host "TownGG PPT bridge: $(if ($Live) { 'LIVE' } else { 'DRY RUN' })"
Write-Host "Dropbox folder: $env:PPT_BRIDGE_ROOT"
& node @watchArgs
exit $LASTEXITCODE
