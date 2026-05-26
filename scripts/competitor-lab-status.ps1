[CmdletBinding()]
param(
  [string]$LabPath = 'C:\Users\Godsgrace\Desktop\codez\oleriq-competitor-lab'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'competitor-lab-common.ps1')

$resolvedLabPath = [System.IO.Path]::GetFullPath($LabPath)
$snapshot = Get-CompetitorLabStatusSnapshot -LabPath $resolvedLabPath

[pscustomobject]@{
  lab_path = $snapshot.lab_path
  root_exists = $snapshot.root_exists
  junction_path = $snapshot.junction_path
  junction_exists = $snapshot.junction_exists
  junction_matches_lab = $snapshot.junction_matches_lab
  manifest_exists = $snapshot.manifest_exists
  manifest_readable = $snapshot.manifest_readable
  total_entries = $snapshot.total_entries
  missing_repo_count = $snapshot.missing_repo_count
  dirty_repo_count = $snapshot.dirty_repo_count
  remote_mismatch_count = $snapshot.remote_mismatch_count
} | Format-List

if (-not $snapshot.root_exists) {
  Write-Host 'Recovery: external lab root is missing. Run npm run research:lab:init'
}

if (-not $snapshot.junction_exists -or -not $snapshot.junction_matches_lab) {
  Write-Host 'Recovery: junction is missing or broken. Run npm run research:lab:init'
}

if (-not $snapshot.manifest_exists -or -not $snapshot.manifest_readable) {
  Write-Host 'Recovery: manifest is missing or unreadable. Run npm run research:lab:init'
}

if ($snapshot.missing_repo_count -gt 0) {
  Write-Host 'Missing repos:'
  $snapshot.missing_repos | Select-Object slug, repo_path | Format-Table -AutoSize
}

if ($snapshot.dirty_repo_count -gt 0) {
  Write-Host 'Dirty repos:'
  $snapshot.dirty_repos | Select-Object slug, branch, repo_path | Format-Table -AutoSize
}

if ($snapshot.remote_mismatch_count -gt 0) {
  Write-Host 'Remote mismatches:'
  $snapshot.remote_mismatches | Select-Object slug, remote_origin, remote_url | Format-Table -AutoSize
}
