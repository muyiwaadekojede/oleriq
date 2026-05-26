[CmdletBinding()]
param(
  [string]$LabPath = 'C:\Users\Godsgrace\Desktop\codez\oleriq-competitor-lab'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'competitor-lab-common.ps1')

$resolvedLabPath = [System.IO.Path]::GetFullPath($LabPath)
Ensure-CompetitorLabFolders -LabPath $resolvedLabPath | Out-Null
$folders = Get-CompetitorLabFolders -LabPath $resolvedLabPath
$snapshot = Get-CompetitorLabStatusSnapshot -LabPath $resolvedLabPath
$auditRows = @()

foreach ($repoStatus in $snapshot.repo_statuses) {
  $auditRows += Build-CompetitorLabAuditRow -RepoStatus $repoStatus
}

$metadataCsvPath = Join-Path $folders.Reports 'repo-metadata.csv'
$metadataJsonPath = Join-Path $folders.Reports 'repo-metadata.json'
$statusJsonPath = Join-Path $folders.Reports 'current-lab-status.json'
$statusMdPath = Join-Path $folders.Reports 'current-lab-status.md'

$auditRows | Sort-Object sync_cohort, slug | Export-Csv -Path $metadataCsvPath -NoTypeInformation -Encoding UTF8
$auditRows | ConvertTo-Json -Depth 6 | Set-Content -Path $metadataJsonPath -Encoding UTF8
$snapshot | ConvertTo-Json -Depth 6 | Set-Content -Path $statusJsonPath -Encoding UTF8
Write-CompetitorLabReportFile -Path $statusMdPath -Content (Convert-StatusSnapshotToMarkdown -Snapshot $snapshot -AuditRows $auditRows)

[pscustomobject]@{
  metadata_csv = $metadataCsvPath
  metadata_json = $metadataJsonPath
  status_json = $statusJsonPath
  status_markdown = $statusMdPath
  total_entries = $snapshot.total_entries
} | Format-List
