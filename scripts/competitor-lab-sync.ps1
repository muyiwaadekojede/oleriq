[CmdletBinding()]
param(
  [ValidateSet('direct', 'adjacent', 'all')]
  [string]$Cohort = 'all',
  [string]$LabPath = 'C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'competitor-lab-common.ps1')

$resolvedLabPath = [System.IO.Path]::GetFullPath($LabPath)
Ensure-CompetitorLabFolders -LabPath $resolvedLabPath | Out-Null
$rows = @(Get-CompetitorLabManifest -LabPath $resolvedLabPath)
$selectedRows = @(Get-CompetitorLabRowsByCohort -Rows $rows -Cohort $Cohort)
$results = @()
$rowsBySlug = @{}

foreach ($row in $rows) {
  $rowsBySlug[$row.slug] = $row
}

foreach ($row in $selectedRows) {
  $repoPath = $row.local_path
  $action = ''
  $head = ''
  $remoteUrl = $row.remote_url
  $timestamp = (Get-Date).ToString('o')

  if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
    $row.clone_status = 'hosted-only'
    $action = 'hosted-only'
  } elseif (-not (Test-Path -LiteralPath $repoPath)) {
    $parent = Split-Path -Parent $repoPath
    if (-not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Invoke-CompetitorLabGit -Arguments @('clone', $remoteUrl, $repoPath) | Out-Null
    $head = ((Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'rev-parse', 'HEAD')) -join '').Trim()
    $row.clone_status = 'cloned'
    $row.last_fetched_at = $timestamp
    $action = 'cloned'
  } else {
    $origin = ((Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'remote', 'get-url', 'origin')) -join '').Trim()
    if ($origin -ne $remoteUrl) {
      throw "Origin remote mismatch for '$($row.slug)'. Expected '$remoteUrl' but found '$origin'."
    }

    Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'fetch', '--all', '--prune') | Out-Null
    $hasUpstream = $true
    try {
      Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}') | Out-Null
    } catch {
      $hasUpstream = $false
    }

    if ($hasUpstream) {
      Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'pull', '--ff-only') | Out-Null
      $action = 'updated'
    } else {
      $action = 'fetched'
    }

    $head = ((Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'rev-parse', 'HEAD')) -join '').Trim()
    $row.clone_status = 'synced'
    $row.last_fetched_at = $timestamp
  }

  $rowsBySlug[$row.slug] = $row
  $results += [pscustomobject]@{
    slug = $row.slug
    cohort = Get-CompetitorLabSyncCohort -Slug $row.slug
    action = $action
    repo_path = $repoPath
    head = $head
  }
}

$updatedRows = @()
foreach ($existingRow in $rows) {
  $updatedRows += $rowsBySlug[$existingRow.slug]
}

Save-CompetitorLabManifest -LabPath $resolvedLabPath -Rows $updatedRows | Out-Null
$results | Sort-Object cohort, slug | Format-Table -AutoSize
