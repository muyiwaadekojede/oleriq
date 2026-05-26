Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:CompetitorLabDefaultPath = 'C:\Users\Godsgrace\Desktop\codez\oleriq-competitor-lab'
$script:CompetitorLabAllowedCategories = @('direct_product', 'hybrid_or_adjacent_commercial', 'enabling_tool')
$script:CompetitorLabAllowedLicenseClasses = @('permissive', 'weak_copyleft', 'strong_copyleft', 'unknown')
$script:CompetitorLabAllowedReuseGates = @('reference_only', 'legal_review_required', 'approved_for_limited_adoption')
$script:CompetitorLabDirectSyncSlugs = @(
  'firecrawl',
  'jina-reader',
  'apify-crawlee',
  'browser-use',
  'scrapegraphai',
  'webclaw',
  'webpeel',
  'crw',
  'crawl4ai'
)
$script:CompetitorLabAdjacentSyncSlugs = @(
  'browserpilot',
  'teracrawl',
  'playwright-mcp',
  'trafilatura',
  'mozilla-readability',
  'webustler',
  'crawl4ai-mcp-server'
)

function Get-CompetitorLabRepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Get-CompetitorLabDefaultPath {
  return $script:CompetitorLabDefaultPath
}

function Get-CompetitorLabJunctionPath {
  return Join-Path (Get-CompetitorLabRepoRoot) 'competitor-lab'
}

function Get-CompetitorLabFolders {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath
  )

  return [ordered]@{
    Root = $LabPath
    Repositories = Join-Path $LabPath 'repos'
    DirectRepositories = Join-Path (Join-Path $LabPath 'repos') 'direct-products'
    AdjacentRepositories = Join-Path (Join-Path $LabPath 'repos') 'adjacent-tools'
    Manifests = Join-Path $LabPath 'manifests'
    Notes = Join-Path $LabPath 'notes'
    Evidence = Join-Path $LabPath 'evidence'
    Reports = Join-Path $LabPath 'reports'
  }
}

function Get-CompetitorLabSyncCohort {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Slug
  )

  if ($script:CompetitorLabDirectSyncSlugs -contains $Slug) {
    return 'direct'
  }

  if ($script:CompetitorLabAdjacentSyncSlugs -contains $Slug) {
    return 'adjacent'
  }

  throw "No sync cohort mapping exists for slug '$Slug'."
}

function ConvertTo-LicenseClass {
  param(
    [AllowNull()]
    [string]$License
  )

  if ([string]::IsNullOrWhiteSpace($License)) {
    return 'unknown'
  }

  $normalized = $License.Trim().ToLowerInvariant()

  if ($normalized -match 'agpl' -or $normalized -match 'gpl') {
    return 'strong_copyleft'
  }

  if ($normalized -match 'lgpl' -or $normalized -match 'mpl' -or $normalized -match 'epl' -or $normalized -match 'cddl') {
    return 'weak_copyleft'
  }

  if ($normalized -match 'apache' -or $normalized -match 'mit' -or $normalized -match 'bsd' -or $normalized -match 'isc') {
    return 'permissive'
  }

  return 'unknown'
}

function New-CompetitorLabCatalog {
  $rows = @(
    [pscustomobject]@{ slug = 'firecrawl'; display_name = 'Firecrawl'; category = 'direct_product'; remote_url = 'https://github.com/firecrawl/firecrawl'; official_site = 'https://www.firecrawl.dev/'; official_docs = 'https://docs.firecrawl.dev/'; license = 'AGPL-3.0'; license_class = 'strong_copyleft' }
    [pscustomobject]@{ slug = 'jina-reader'; display_name = 'Jina Reader'; category = 'direct_product'; remote_url = 'https://github.com/jina-ai/reader'; official_site = 'https://jina.ai/en-US/reader/'; official_docs = 'https://jina.ai/en-US/reader/'; license = 'Apache-2.0'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'apify-crawlee'; display_name = 'Apify Crawlee'; category = 'direct_product'; remote_url = 'https://github.com/apify/crawlee'; official_site = 'https://apify.com/'; official_docs = 'https://docs.apify.com/platform'; license = 'Apache-2.0'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'browser-use'; display_name = 'Browser Use'; category = 'hybrid_or_adjacent_commercial'; remote_url = 'https://github.com/browser-use/browser-use'; official_site = 'https://browser-use.com/'; official_docs = 'https://docs.cloud.browser-use.com/'; license = 'MIT'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'scrapegraphai'; display_name = 'ScrapeGraphAI'; category = 'direct_product'; remote_url = 'https://github.com/ScrapeGraphAI/Scrapegraph-ai'; official_site = 'https://scrapegraphai.com/'; official_docs = 'https://docs.scrapegraphai.com/'; license = 'MIT'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'webclaw'; display_name = 'Webclaw'; category = 'direct_product'; remote_url = 'https://github.com/0xMassi/webclaw'; official_site = 'https://webclaw.io/'; official_docs = 'https://webclaw.io/docs/getting-started'; license = 'MIT'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'webpeel'; display_name = 'WebPeel'; category = 'direct_product'; remote_url = 'https://github.com/webpeel/webpeel'; official_site = 'https://webpeel.dev/'; official_docs = 'https://webpeel.dev/'; license = 'AGPL-3.0'; license_class = 'strong_copyleft' }
    [pscustomobject]@{ slug = 'crw'; display_name = 'CRW'; category = 'direct_product'; remote_url = 'https://github.com/us/crw'; official_site = 'https://fastcrw.com/'; official_docs = 'https://docs.fastcrw.com/'; license = 'AGPL-3.0'; license_class = 'strong_copyleft' }
    [pscustomobject]@{ slug = 'crawl4ai'; display_name = 'Crawl4AI'; category = 'hybrid_or_adjacent_commercial'; remote_url = 'https://github.com/unclecode/crawl4ai'; official_site = 'https://crawl4ai.com/'; official_docs = 'https://docs.crawl4ai.com/'; license = 'Apache-2.0'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'browserpilot'; display_name = 'BrowserPilot'; category = 'hybrid_or_adjacent_commercial'; remote_url = 'https://github.com/ai-naymul/BrowserPilot'; official_site = 'https://pilotbrowser.vercel.app/'; official_docs = ''; license = 'MIT'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'teracrawl'; display_name = 'TeraCrawl'; category = 'hybrid_or_adjacent_commercial'; remote_url = 'https://github.com/BrowserCash/teracrawl'; official_site = 'https://browser.cash/developers'; official_docs = 'https://docs.browser.cash/docs/introduction/what-is-browser-cash'; license = 'MIT'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'playwright-mcp'; display_name = 'Playwright MCP'; category = 'enabling_tool'; remote_url = 'https://github.com/microsoft/playwright-mcp'; official_site = 'https://github.com/microsoft/playwright-mcp'; official_docs = 'https://playwright.dev/python/docs/getting-started-mcp'; license = 'Apache-2.0'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'trafilatura'; display_name = 'Trafilatura'; category = 'enabling_tool'; remote_url = 'https://github.com/adbar/trafilatura'; official_site = 'https://trafilatura.readthedocs.io/en/latest/'; official_docs = 'https://trafilatura.readthedocs.io/en/stable/usage-cli.html'; license = 'Apache-2.0'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'mozilla-readability'; display_name = 'Mozilla Readability'; category = 'enabling_tool'; remote_url = 'https://github.com/mozilla/readability'; official_site = 'https://github.com/mozilla/readability'; official_docs = ''; license = 'Apache-2.0'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'webustler'; display_name = 'Webustler'; category = 'enabling_tool'; remote_url = 'https://github.com/drruin/webustler'; official_site = 'https://github.com/drruin/webustler'; official_docs = ''; license = 'MIT'; license_class = 'permissive' }
    [pscustomobject]@{ slug = 'crawl4ai-mcp-server'; display_name = 'crawl4ai-mcp-server'; category = 'enabling_tool'; remote_url = 'https://github.com/sadiuysal/crawl4ai-mcp-server'; official_site = 'https://github.com/sadiuysal/crawl4ai-mcp-server'; official_docs = 'https://docs.crawl4ai.com/core/self-hosting/'; license = 'MIT'; license_class = 'permissive' }
  )

  return $rows
}

function Get-CompetitorLabClonePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath,
    [Parameter(Mandatory = $true)]
    [string]$Slug
  )

  $folders = Get-CompetitorLabFolders -LabPath $LabPath
  $cohort = Get-CompetitorLabSyncCohort -Slug $Slug
  if ($cohort -eq 'direct') {
    return Join-Path $folders.DirectRepositories $Slug
  }

  return Join-Path $folders.AdjacentRepositories $Slug
}

function Get-CompetitorLabNotesPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath,
    [Parameter(Mandatory = $true)]
    [string]$Slug
  )

  return Join-Path (Join-Path $LabPath 'notes') $Slug
}

function ConvertTo-ManifestRow {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath,
    [Parameter(Mandatory = $true)]
    [object]$CatalogRow
  )

  $remoteUrl = $CatalogRow.remote_url
  $cloneStatus = if ([string]::IsNullOrWhiteSpace($remoteUrl)) { 'hosted-only' } else { 'not_cloned' }

  return [pscustomobject]@{
    slug = $CatalogRow.slug
    display_name = $CatalogRow.display_name
    category = $CatalogRow.category
    remote_url = $remoteUrl
    official_site = $CatalogRow.official_site
    official_docs = $CatalogRow.official_docs
    license = $CatalogRow.license
    license_class = $CatalogRow.license_class
    local_path = Get-CompetitorLabClonePath -LabPath $LabPath -Slug $CatalogRow.slug
    clone_status = $cloneStatus
    last_fetched_at = ''
    analysis_status = 'missing'
    reuse_gate = 'legal_review_required'
    notes_path = Get-CompetitorLabNotesPath -LabPath $LabPath -Slug $CatalogRow.slug
  }
}

function Assert-CompetitorLabManifestRows {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$Rows
  )

  $requiredColumns = @(
    'slug',
    'display_name',
    'category',
    'remote_url',
    'official_site',
    'official_docs',
    'license',
    'license_class',
    'local_path',
    'clone_status',
    'last_fetched_at',
    'analysis_status',
    'reuse_gate',
    'notes_path'
  )

  foreach ($row in $Rows) {
    foreach ($column in $requiredColumns) {
      if (-not ($row.PSObject.Properties.Name -contains $column)) {
        throw "Manifest row is missing required column '$column'."
      }
    }

    if ([string]::IsNullOrWhiteSpace($row.slug)) {
      throw 'Manifest row is missing slug.'
    }

    if ($script:CompetitorLabAllowedCategories -notcontains $row.category) {
      throw "Unsupported category '$($row.category)' in manifest."
    }

    if ($script:CompetitorLabAllowedLicenseClasses -notcontains $row.license_class) {
      throw "Unsupported license_class '$($row.license_class)' in manifest."
    }

    if ($script:CompetitorLabAllowedReuseGates -notcontains $row.reuse_gate) {
      throw "Unsupported reuse_gate '$($row.reuse_gate)' in manifest."
    }
  }
}

function Merge-CompetitorLabManifestRows {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$ExistingRows,
    [Parameter(Mandatory = $true)]
    [object[]]$SeedRows
  )

  $existingBySlug = @{}
  foreach ($row in $ExistingRows) {
    $existingBySlug[$row.slug] = $row
  }

  $merged = @()
  foreach ($seedRow in $SeedRows) {
    if ($existingBySlug.ContainsKey($seedRow.slug)) {
      $existing = $existingBySlug[$seedRow.slug]
      $mergedLicense = if ([string]::IsNullOrWhiteSpace($existing.license)) { $seedRow.license } else { $existing.license }
      $mergedLicenseClass = if ([string]::IsNullOrWhiteSpace($existing.license_class)) { $seedRow.license_class } else { $existing.license_class }
      $mergedCloneStatus = if ([string]::IsNullOrWhiteSpace($existing.clone_status)) { $seedRow.clone_status } else { $existing.clone_status }
      $mergedAnalysisStatus = if ([string]::IsNullOrWhiteSpace($existing.analysis_status)) { $seedRow.analysis_status } else { $existing.analysis_status }
      $mergedReuseGate = if ([string]::IsNullOrWhiteSpace($existing.reuse_gate)) { $seedRow.reuse_gate } else { $existing.reuse_gate }
      $merged += [pscustomobject]@{
        slug = $seedRow.slug
        display_name = $seedRow.display_name
        category = $seedRow.category
        remote_url = $seedRow.remote_url
        official_site = $seedRow.official_site
        official_docs = $seedRow.official_docs
        license = $mergedLicense
        license_class = $mergedLicenseClass
        local_path = $seedRow.local_path
        clone_status = $mergedCloneStatus
        last_fetched_at = $existing.last_fetched_at
        analysis_status = $mergedAnalysisStatus
        reuse_gate = $mergedReuseGate
        notes_path = $seedRow.notes_path
      }
      $existingBySlug.Remove($seedRow.slug) | Out-Null
    } else {
      $merged += $seedRow
    }
  }

  foreach ($leftover in $existingBySlug.Values) {
    $merged += $leftover
  }

  return $merged
}

function Ensure-CompetitorLabFolders {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath
  )

  $folders = Get-CompetitorLabFolders -LabPath $LabPath
  foreach ($path in $folders.Values) {
    if (-not (Test-Path -LiteralPath $path)) {
      New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
  }

  foreach ($catalogRow in (New-CompetitorLabCatalog)) {
    $notesPath = Get-CompetitorLabNotesPath -LabPath $LabPath -Slug $catalogRow.slug
    $evidencePath = Join-Path (Join-Path $LabPath 'evidence') $catalogRow.slug
    if (-not (Test-Path -LiteralPath $notesPath)) {
      New-Item -ItemType Directory -Path $notesPath -Force | Out-Null
    }
    if (-not (Test-Path -LiteralPath $evidencePath)) {
      New-Item -ItemType Directory -Path $evidencePath -Force | Out-Null
    }
  }

  return $folders
}

function Test-PathIsJunction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $false
  }

  $item = Get-Item -LiteralPath $Path -Force
  return [bool]($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
}

function Ensure-CompetitorLabJunction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath
  )

  $junctionPath = Get-CompetitorLabJunctionPath
  if (Test-Path -LiteralPath $junctionPath) {
    if (-not (Test-PathIsJunction -Path $junctionPath)) {
      throw "Path '$junctionPath' exists but is not a junction."
    }

    $currentTarget = (Get-Item -LiteralPath $junctionPath -Force).Target
    if ($currentTarget) {
      try {
        if ((Resolve-Path -LiteralPath $currentTarget).Path -eq (Resolve-Path -LiteralPath $LabPath).Path) {
          return $junctionPath
        }
      } catch {
      }
    }

    $junctionItem = Get-Item -LiteralPath $junctionPath -Force
    $junctionItem.Delete()
  }

  New-Item -ItemType Junction -Path $junctionPath -Target $LabPath | Out-Null
  return $junctionPath
}

function Get-CompetitorLabManifestPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath
  )

  return Join-Path (Join-Path $LabPath 'manifests') 'repositories.csv'
}

function Save-CompetitorLabManifest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath,
    [Parameter(Mandatory = $true)]
    [object[]]$Rows
  )

  Assert-CompetitorLabManifestRows -Rows $Rows
  $manifestPath = Get-CompetitorLabManifestPath -LabPath $LabPath
  $directory = Split-Path -Parent $manifestPath
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $csvLines = @($Rows | Sort-Object slug | ConvertTo-Csv -NoTypeInformation)
  [System.IO.File]::WriteAllLines($manifestPath, $csvLines, [System.Text.UTF8Encoding]::new($false))
  return $manifestPath
}

function Initialize-CompetitorLabManifest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath
  )

  $seedRows = @()
  foreach ($catalogRow in (New-CompetitorLabCatalog)) {
    $seedRows += ConvertTo-ManifestRow -LabPath $LabPath -CatalogRow $catalogRow
  }

  $manifestPath = Get-CompetitorLabManifestPath -LabPath $LabPath
  if (Test-Path -LiteralPath $manifestPath) {
    $existingRows = Import-Csv -Path $manifestPath
    $seedRows = Merge-CompetitorLabManifestRows -ExistingRows $existingRows -SeedRows $seedRows
  }

  return Save-CompetitorLabManifest -LabPath $LabPath -Rows $seedRows
}

function Get-CompetitorLabManifest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath,
    [switch]$AllowMissing
  )

  $manifestPath = Get-CompetitorLabManifestPath -LabPath $LabPath
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    if ($AllowMissing) {
      return @()
    }
    throw "Manifest not found at '$manifestPath'. Run competitor-lab-bootstrap.ps1 first."
  }

  $rows = @(Import-Csv -Path $manifestPath)
  Assert-CompetitorLabManifestRows -Rows $rows
  return $rows
}

function Get-CompetitorLabRowsByCohort {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$Rows,
    [Parameter(Mandatory = $true)]
    [ValidateSet('direct', 'adjacent', 'all')]
    [string]$Cohort
  )

  if ($Cohort -eq 'all') {
    return $Rows
  }

  $slugs = if ($Cohort -eq 'direct') { $script:CompetitorLabDirectSyncSlugs } else { $script:CompetitorLabAdjacentSyncSlugs }
  return @($Rows | Where-Object { $slugs -contains $_.slug })
}

function Invoke-CompetitorLabGit {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $stdoutPath = [System.IO.Path]::GetTempFileName()
  $stderrPath = [System.IO.Path]::GetTempFileName()

  try {
    $process = Start-Process -FilePath 'git' -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $output = @()
    if (Test-Path -LiteralPath $stdoutPath) {
      $output += @(Get-Content -LiteralPath $stdoutPath)
    }
    if (Test-Path -LiteralPath $stderrPath) {
      $output += @(Get-Content -LiteralPath $stderrPath)
    }

    if ($process.ExitCode -ne 0) {
      $message = ($output | Out-String).Trim()
      throw "git $($Arguments -join ' ') failed. $message"
    }

    return $output
  } finally {
    foreach ($path in @($stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
      }
    }
  }
}

function Get-CompetitorLabRepoStatus {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Row
  )

  $repoPath = $Row.local_path
  $exists = -not [string]::IsNullOrWhiteSpace($repoPath) -and (Test-Path -LiteralPath $repoPath)
  $hostedOnly = [string]::IsNullOrWhiteSpace($Row.remote_url)
  $isGitRepo = $false
  $branch = ''
  $head = ''
  $remoteOrigin = ''
  $remoteMatchesExpected = $false
  $dirty = $false
  $dirtyEntries = @()

  if ($exists -and -not $hostedOnly) {
    try {
      Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'rev-parse', '--is-inside-work-tree') | Out-Null
      $isGitRepo = $true
      $branch = ((Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'branch', '--show-current')) -join '').Trim()
      $head = ((Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'rev-parse', 'HEAD')) -join '').Trim()
      $remoteOrigin = ((Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'remote', 'get-url', 'origin')) -join '').Trim()
      $remoteMatchesExpected = $remoteOrigin -eq $Row.remote_url
      $dirtyEntries = @(Invoke-CompetitorLabGit -Arguments @('-C', $repoPath, 'status', '--short'))
      $dirty = $dirtyEntries.Count -gt 0
    } catch {
      $isGitRepo = $false
    }
  }

  return [pscustomobject]@{
    slug = $Row.slug
    display_name = $Row.display_name
    category = $Row.category
    sync_cohort = Get-CompetitorLabSyncCohort -Slug $Row.slug
    repo_path = $repoPath
    hosted_only = $hostedOnly
    exists = $exists
    is_git_repo = $isGitRepo
    branch = $branch
    head = $head
    remote_origin = $remoteOrigin
    remote_matches_expected = $remoteMatchesExpected
    dirty = $dirty
    dirty_entries = @($dirtyEntries)
    official_site = $Row.official_site
    official_docs = $Row.official_docs
    remote_url = $Row.remote_url
    license = $Row.license
    license_class = $Row.license_class
    analysis_status = $Row.analysis_status
    reuse_gate = $Row.reuse_gate
    last_fetched_at = $Row.last_fetched_at
    notes_path = $Row.notes_path
  }
}

function Get-CompetitorLabStatusSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LabPath
  )

  $junctionPath = Get-CompetitorLabJunctionPath
  $rootExists = Test-Path -LiteralPath $LabPath
  $junctionExists = Test-Path -LiteralPath $junctionPath
  $junctionTarget = ''
  $junctionMatchesLab = $false
  $manifestExists = Test-Path -LiteralPath (Get-CompetitorLabManifestPath -LabPath $LabPath)
  $manifestRows = @()
  $manifestReadable = $false

  if ($junctionExists -and (Test-PathIsJunction -Path $junctionPath)) {
    $junctionTarget = ((Get-Item -LiteralPath $junctionPath -Force).Target | Out-String).Trim()
    if ($junctionTarget) {
      try {
        $junctionMatchesLab = (Resolve-Path -LiteralPath $junctionTarget).Path -eq (Resolve-Path -LiteralPath $LabPath).Path
      } catch {
        $junctionMatchesLab = $false
      }
    }
  }

  if ($manifestExists) {
    try {
      $manifestRows = Get-CompetitorLabManifest -LabPath $LabPath
      $manifestReadable = $true
    } catch {
      $manifestReadable = $false
    }
  }

  $repoStatuses = @()
  if ($manifestReadable) {
    foreach ($row in $manifestRows) {
      $repoStatuses += Get-CompetitorLabRepoStatus -Row $row
    }
  }

  $missingRepos = @($repoStatuses | Where-Object { -not $_.hosted_only -and -not $_.exists })
  $dirtyRepos = @($repoStatuses | Where-Object { $_.dirty })
  $remoteMismatches = @($repoStatuses | Where-Object { $_.exists -and $_.is_git_repo -and -not $_.remote_matches_expected })

  return [pscustomobject]@{
    generated_at = (Get-Date).ToString('o')
    lab_path = $LabPath
    root_exists = $rootExists
    junction_path = $junctionPath
    junction_exists = $junctionExists
    junction_target = $junctionTarget
    junction_matches_lab = $junctionMatchesLab
    manifest_path = Get-CompetitorLabManifestPath -LabPath $LabPath
    manifest_exists = $manifestExists
    manifest_readable = $manifestReadable
    total_entries = $repoStatuses.Count
    missing_repo_count = $missingRepos.Count
    dirty_repo_count = $dirtyRepos.Count
    remote_mismatch_count = $remoteMismatches.Count
    repo_statuses = $repoStatuses
    missing_repos = $missingRepos
    dirty_repos = $dirtyRepos
    remote_mismatches = $remoteMismatches
  }
}

function Get-RepositoryLicenseInfo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
  )

  $packageJsonPath = Join-Path $RepoPath 'package.json'
  if (Test-Path -LiteralPath $packageJsonPath) {
    try {
      $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
      if ($packageJson.license) {
        return [pscustomobject]@{
          license = $packageJson.license.ToString().Trim()
          source = 'package.json'
          license_class = ConvertTo-LicenseClass -License $packageJson.license.ToString()
        }
      }
    } catch {
    }
  }

  $licenseFile = Get-ChildItem -LiteralPath $RepoPath -Force |
    Where-Object { -not $_.PSIsContainer -and $_.Name -match '^(LICENSE|LICENSE\.md|LICENSE\.txt|COPYING)(\..+)?$' } |
    Select-Object -First 1

  if ($licenseFile) {
    $content = Get-Content $licenseFile.FullName -Raw
    $normalized = $content.ToLowerInvariant()
    $license = 'unknown'
    if ($normalized -match 'gnu affero general public license') {
      $license = 'AGPL-3.0'
    } elseif ($normalized -match 'gnu lesser general public license') {
      $license = 'LGPL'
    } elseif ($normalized -match 'mozilla public license') {
      $license = 'MPL-2.0'
    } elseif ($normalized -match 'gnu general public license') {
      $license = 'GPL'
    } elseif ($normalized -match 'apache license') {
      $license = 'Apache-2.0'
    } elseif ($normalized -match 'mit license') {
      $license = 'MIT'
    } elseif ($normalized -match 'bsd license') {
      $license = 'BSD'
    } elseif ($normalized -match 'isc license') {
      $license = 'ISC'
    }

    return [pscustomobject]@{
      license = $license
      source = $licenseFile.Name
      license_class = ConvertTo-LicenseClass -License $license
    }
  }

  return [pscustomobject]@{
    license = 'unknown'
    source = ''
    license_class = 'unknown'
  }
}

function Get-RepositoryPackageManager {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
  )

  $checks = @(
    @{ Path = 'pnpm-lock.yaml'; Value = 'pnpm' }
    @{ Path = 'yarn.lock'; Value = 'yarn' }
    @{ Path = 'package-lock.json'; Value = 'npm' }
    @{ Path = 'bun.lockb'; Value = 'bun' }
    @{ Path = 'Cargo.lock'; Value = 'cargo' }
    @{ Path = 'go.mod'; Value = 'go' }
    @{ Path = 'poetry.lock'; Value = 'poetry' }
    @{ Path = 'uv.lock'; Value = 'uv' }
    @{ Path = 'requirements.txt'; Value = 'pip' }
  )

  foreach ($check in $checks) {
    if (Test-Path -LiteralPath (Join-Path $RepoPath $check.Path)) {
      return $check.Value
    }
  }

  return ''
}

function Get-RepositoryStackHints {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
  )

  $hints = @()
  if (Test-Path -LiteralPath (Join-Path $RepoPath 'package.json')) { $hints += 'node' }
  if (Test-Path -LiteralPath (Join-Path $RepoPath 'tsconfig.json')) { $hints += 'typescript' }
  if (Test-Path -LiteralPath (Join-Path $RepoPath 'pyproject.toml')) { $hints += 'python' }
  if (Test-Path -LiteralPath (Join-Path $RepoPath 'Cargo.toml')) { $hints += 'rust' }
  if (Test-Path -LiteralPath (Join-Path $RepoPath 'go.mod')) { $hints += 'go' }
  if (Test-Path -LiteralPath (Join-Path $RepoPath 'docker-compose.yml')) { $hints += 'docker-compose' }
  if (Test-Path -LiteralPath (Join-Path $RepoPath 'Dockerfile')) { $hints += 'docker' }
  return ($hints | Select-Object -Unique) -join ', '
}

function Get-RepositoryDocsPresence {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
  )

  $readme = Get-ChildItem -LiteralPath $RepoPath -Force |
    Where-Object { -not $_.PSIsContainer -and $_.Name -match '^README(\..+)?$' } |
    Select-Object -First 1
  $docsDirectory = Test-Path -LiteralPath (Join-Path $RepoPath 'docs')
  return [pscustomobject]@{
    has_readme = [bool]$readme
    has_docs_directory = $docsDirectory
  }
}

function Get-RepositoryEntrypoints {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
  )

  $candidates = @('app', 'src', 'server', 'cmd', 'lib', 'main.py', 'cli.py', 'package.json', 'Cargo.toml', 'go.mod')
  $found = @()
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath (Join-Path $RepoPath $candidate)) {
      $found += $candidate
    }
  }
  return ($found | Select-Object -Unique) -join ', '
}

function Build-CompetitorLabAuditRow {
  param(
    [Parameter(Mandatory = $true)]
    [object]$RepoStatus
  )

  $detectedLicense = [pscustomobject]@{
    license = $RepoStatus.license
    source = 'manifest'
    license_class = $RepoStatus.license_class
  }
  $packageManager = ''
  $stackHints = ''
  $docsPresence = [pscustomobject]@{ has_readme = $false; has_docs_directory = $false }
  $entrypoints = ''

  if ($RepoStatus.exists -and $RepoStatus.is_git_repo) {
    $detectedLicense = Get-RepositoryLicenseInfo -RepoPath $RepoStatus.repo_path
    $packageManager = Get-RepositoryPackageManager -RepoPath $RepoStatus.repo_path
    $stackHints = Get-RepositoryStackHints -RepoPath $RepoStatus.repo_path
    $docsPresence = Get-RepositoryDocsPresence -RepoPath $RepoStatus.repo_path
    $entrypoints = Get-RepositoryEntrypoints -RepoPath $RepoStatus.repo_path
  }

  $warnings = @()
  if ($detectedLicense.license_class -in @('strong_copyleft', 'unknown')) {
    $warnings += 'Do not transplant code without explicit written review.'
  }
  if ($RepoStatus.exists -and $RepoStatus.is_git_repo -and -not $RepoStatus.remote_matches_expected) {
    $warnings += 'Origin remote does not match manifest remote.'
  }
  if ($RepoStatus.license -and $detectedLicense.license -and ($RepoStatus.license -ne $detectedLicense.license)) {
    $warnings += "Manifest license '$($RepoStatus.license)' differs from detected license '$($detectedLicense.license)'."
  }

  return [pscustomobject]@{
    slug = $RepoStatus.slug
    display_name = $RepoStatus.display_name
    category = $RepoStatus.category
    sync_cohort = $RepoStatus.sync_cohort
    local_path = $RepoStatus.repo_path
    exists = $RepoStatus.exists
    is_git_repo = $RepoStatus.is_git_repo
    branch = $RepoStatus.branch
    head = $RepoStatus.head
    remote_origin = $RepoStatus.remote_origin
    remote_matches_expected = $RepoStatus.remote_matches_expected
    official_site = $RepoStatus.official_site
    official_docs = $RepoStatus.official_docs
    remote_url = $RepoStatus.remote_url
    manifest_license = $RepoStatus.license
    manifest_license_class = $RepoStatus.license_class
    detected_license = $detectedLicense.license
    detected_license_source = $detectedLicense.source
    detected_license_class = $detectedLicense.license_class
    package_manager = $packageManager
    stack_hints = $stackHints
    has_readme = $docsPresence.has_readme
    has_docs_directory = $docsPresence.has_docs_directory
    main_entrypoints = $entrypoints
    analysis_status = $RepoStatus.analysis_status
    reuse_gate = $RepoStatus.reuse_gate
    last_fetched_at = $RepoStatus.last_fetched_at
    dirty = $RepoStatus.dirty
    warnings = ($warnings -join ' | ')
  }
}

function Convert-StatusSnapshotToMarkdown {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Snapshot,
    [object[]]$AuditRows = @()
  )

  $lines = @()
  $lines += '# Current Lab Status'
  $lines += ''
  $lines += "- Generated: $($Snapshot.generated_at)"
  $lines += "- Lab path: ``$($Snapshot.lab_path)``"
  $lines += "- Root exists: $($Snapshot.root_exists)"
  $lines += "- Junction path: ``$($Snapshot.junction_path)``"
  $lines += "- Junction exists: $($Snapshot.junction_exists)"
  $lines += "- Junction points to lab: $($Snapshot.junction_matches_lab)"
  if ($Snapshot.junction_target) {
    $lines += "- Junction target: ``$($Snapshot.junction_target)``"
  }
  $lines += "- Manifest exists: $($Snapshot.manifest_exists)"
  $lines += "- Manifest readable: $($Snapshot.manifest_readable)"
  $lines += "- Total manifest entries: $($Snapshot.total_entries)"
  $lines += "- Missing repos: $($Snapshot.missing_repo_count)"
  $lines += "- Dirty repos: $($Snapshot.dirty_repo_count)"
  $lines += "- Remote mismatches: $($Snapshot.remote_mismatch_count)"
  $lines += ''
  $lines += '## Recovery'
  if (-not $Snapshot.root_exists) {
    $lines += '- External lab root is missing. Run `npm run research:lab:init`.'
  }
  if (-not $Snapshot.junction_exists -or -not $Snapshot.junction_matches_lab) {
    $lines += '- Junction is missing or broken. Run `npm run research:lab:init`.'
  }
  if (-not $Snapshot.manifest_exists -or -not $Snapshot.manifest_readable) {
    $lines += '- Manifest is missing or unreadable. Run `npm run research:lab:init`.'
  }
  if ($Snapshot.root_exists -and $Snapshot.junction_exists -and $Snapshot.junction_matches_lab -and $Snapshot.manifest_exists -and $Snapshot.manifest_readable) {
    $lines += '- No structural recovery action is required.'
  }
  $lines += ''
  $lines += '## Missing Repos'
  if ($Snapshot.missing_repo_count -eq 0) {
    $lines += '- None'
  } else {
    foreach ($repo in $Snapshot.missing_repos) {
      $lines += "- $($repo.slug) (`$($repo.sync_cohort)`) -> ``$($repo.repo_path)``"
    }
  }
  $lines += ''
  $lines += '## Dirty Repos'
  if ($Snapshot.dirty_repo_count -eq 0) {
    $lines += '- None'
  } else {
    foreach ($repo in $Snapshot.dirty_repos) {
      $lines += "- $($repo.slug) (`$($repo.branch)`) -> ``$($repo.repo_path)``"
    }
  }
  $lines += ''
  $lines += '## Remote Mismatches'
  if ($Snapshot.remote_mismatch_count -eq 0) {
    $lines += '- None'
  } else {
    foreach ($repo in $Snapshot.remote_mismatches) {
      $lines += "- $($repo.slug) -> expected ``$($repo.remote_url)`` but found ``$($repo.remote_origin)``"
    }
  }

  if ($AuditRows.Count -gt 0) {
    $legalWarnings = @($AuditRows | Where-Object { $_.warnings -match 'Do not transplant code without explicit written review' })
    $lines += ''
    $lines += '## Legal Review Warnings'
    if ($legalWarnings.Count -eq 0) {
      $lines += '- None'
    } else {
      foreach ($row in $legalWarnings) {
        $lines += "- $($row.slug): $($row.warnings)"
      }
    }
  }

  return ($lines -join [Environment]::NewLine) + [Environment]::NewLine
}

function Write-CompetitorLabReportFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}
