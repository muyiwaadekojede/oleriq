[CmdletBinding()]
param(
  [string]$LabPath = 'C:\Users\Godsgrace\Desktop\codez\oleriq-competitor-lab'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'competitor-lab-common.ps1')

$resolvedLabPath = [System.IO.Path]::GetFullPath($LabPath)
$folders = Ensure-CompetitorLabFolders -LabPath $resolvedLabPath
$manifestPath = Initialize-CompetitorLabManifest -LabPath $resolvedLabPath
$junctionPath = Ensure-CompetitorLabJunction -LabPath $resolvedLabPath
$statusSnapshot = Get-CompetitorLabStatusSnapshot -LabPath $resolvedLabPath

[pscustomobject]@{
  lab_path = $resolvedLabPath
  junction_path = $junctionPath
  manifest_path = $manifestPath
  total_manifest_entries = $statusSnapshot.total_entries
  next_action_1 = 'npm run research:lab:sync:direct'
  next_action_2 = 'npm run research:lab:sync:adjacent'
  next_action_3 = 'npm run research:lab:audit'
} | Format-List
