Set-StrictMode -Version 2.0

function Get-FounderPreviewExitCodes {
  return [ordered]@{
    Pass = 0
    GeneralFailure = 1
    PortConflict = 2
    Unhealthy = 3
    OwnershipUnknown = 4
    SmokeFailure = 5
    LockTimeout = 6
    ValidationFailedRestored = 7
    ValidationFailedRestoreFailed = 8
    TemporaryCleanupFailed = 9
    QaReadyDirtyWorktree = 10
  }
}

function Normalize-FounderRepositoryPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

function Get-FounderPreviewConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $normalizedRepositoryPath = Normalize-FounderRepositoryPath -Path $RepositoryPath
  $baseRuntimeRoot = Join-Path $env:TEMP 'myott-founder-preview'
  $hashProvider = [System.Security.Cryptography.SHA256]::Create()
  try {
    $pathBytes = [System.Text.Encoding]::UTF8.GetBytes($normalizedRepositoryPath.ToLowerInvariant())
    $pathHash = ([System.BitConverter]::ToString($hashProvider.ComputeHash($pathBytes))).Replace('-', '').Substring(0, 16)
  } finally {
    $hashProvider.Dispose()
  }
  $repositoryRuntimeRoot = Join-Path $baseRuntimeRoot $pathHash
  $globalRuntimeRoot = Join-Path $baseRuntimeRoot 'global'

  return [pscustomobject]@{
    SchemaVersion = 2
    RepositoryPath = $normalizedRepositoryPath
    RepositoryPathHash = $pathHash
    HostName = '127.0.0.1'
    FounderPort = 3000
    TemporaryPortMinimum = 3001
    TemporaryPortMaximum = 3100
    LegacyCleanupPortMaximum = 3101
    BaseRuntimeRoot = $baseRuntimeRoot
    RuntimeRoot = $repositoryRuntimeRoot
    GlobalRuntimeRoot = $globalRuntimeRoot
    StatePath = Join-Path $repositoryRuntimeRoot 'state.json'
    LockInfoPath = Join-Path $globalRuntimeRoot 'lifecycle.lock'
    LastOperationPath = Join-Path $repositoryRuntimeRoot 'last-operation.json'
    LegacyMigrationMarkerPath = Join-Path $repositoryRuntimeRoot 'legacy-migration.json'
    StdoutLogPath = Join-Path $repositoryRuntimeRoot 'founder-3000.out.log'
    StderrLogPath = Join-Path $repositoryRuntimeRoot 'founder-3000.err.log'
    LegacyStatePath = Join-Path $baseRuntimeRoot 'state.json'
    LegacyLastOperationPath = Join-Path $baseRuntimeRoot 'last-operation.json'
    LegacyStdoutLogPath = Join-Path $baseRuntimeRoot 'founder-3000.out.log'
    LegacyStderrLogPath = Join-Path $baseRuntimeRoot 'founder-3000.err.log'
    Url = 'http://127.0.0.1:3000'
    VerifyUrl = 'http://127.0.0.1:3000/api/recommend/options?filters=genre-action&types=drama'
    ReadyTimeoutSeconds = 60
    HttpTimeoutSeconds = 15
    LockTimeoutSeconds = 30
    MutexName = 'Local\MyOTTFounderPreview_Port3000'
    ExitCodes = Get-FounderPreviewExitCodes
  }
}

function Initialize-FounderRuntimeDirectory {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  if (-not (Test-Path -LiteralPath $Config.RuntimeRoot)) {
    New-Item -ItemType Directory -Path $Config.RuntimeRoot -Force | Out-Null
  }
  if (-not (Test-Path -LiteralPath $Config.GlobalRuntimeRoot)) {
    New-Item -ItemType Directory -Path $Config.GlobalRuntimeRoot -Force | Out-Null
  }
}

function Write-FounderJsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    $Value
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $temporaryPath = "$Path.$PID.tmp"
  $Value | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $temporaryPath -Encoding UTF8
  Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
}

function Read-FounderJsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Remove-FounderFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

function Get-FounderPropertyValue {
  param(
    $Object,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    $DefaultValue = $null
  )

  if ($null -eq $Object) {
    return $DefaultValue
  }

  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return $DefaultValue
  }

  return $property.Value
}

function ConvertTo-FounderUtcDateTime {
  param(
    [Parameter(Mandatory = $true)]
    $Value
  )

  if ($Value -is [datetime]) {
    return ([datetime]$Value).ToUniversalTime()
  }
  return [datetime]::Parse(
    [string]$Value,
    [System.Globalization.CultureInfo]::InvariantCulture,
    [System.Globalization.DateTimeStyles]::RoundtripKind
  ).ToUniversalTime()
}

function Get-FounderProcessCreationIdentity {
  param(
    [Parameter(Mandatory = $true)]
    $Value
  )

  return (ConvertTo-FounderUtcDateTime -Value $Value).Ticks
}

function Test-FounderProcessCreationIdentityEqual {
  param(
    [Parameter(Mandatory = $true)]
    $Left,
    [Parameter(Mandatory = $true)]
    $Right
  )

  try {
    return (Get-FounderProcessCreationIdentity -Value $Left) -eq
      (Get-FounderProcessCreationIdentity -Value $Right)
  } catch {
    return $false
  }
}

function Test-FounderPortCanBeAllocated {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    $Config
  )

  return ($Port -eq $Config.FounderPort) -or
    ($Port -ge $Config.TemporaryPortMinimum -and $Port -le $Config.TemporaryPortMaximum)
}

function Test-FounderPortIsTemporary {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    $Config
  )

  return $Port -ge $Config.TemporaryPortMinimum -and $Port -le $Config.TemporaryPortMaximum
}

function Test-FounderPortIsCleanupTarget {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    $Config
  )

  return $Port -ge $Config.TemporaryPortMinimum -and $Port -le $Config.LegacyCleanupPortMaximum
}

function Merge-FounderNodeOptions {
  param(
    [AllowNull()]
    [string]$CurrentValue
  )

  $requiredOption = '--use-system-ca'
  if ([string]::IsNullOrWhiteSpace($CurrentValue)) {
    return $requiredOption
  }

  $tokens = @($CurrentValue -split '\s+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if ($tokens -contains $requiredOption) {
    return ($tokens -join ' ')
  }

  return (($tokens + $requiredOption) -join ' ')
}

function Get-FounderGitInfo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $result = [ordered]@{
    Branch = ''
    Commit = ''
    Remote = ''
    WorkingTree = @()
  }

  try {
    $result.Branch = (& git -C $RepositoryPath branch --show-current 2>$null | Select-Object -First 1).Trim()
    $result.Commit = (& git -C $RepositoryPath rev-parse --short=12 HEAD 2>$null | Select-Object -First 1).Trim()
    $result.Remote = (& git -C $RepositoryPath config --get remote.origin.url 2>$null | Select-Object -First 1).Trim()
    $result.WorkingTree = @(& git -C $RepositoryPath status --short 2>$null)
  } catch {
    # Git metadata is diagnostic. Lifecycle ownership does not depend on it.
  }

  return [pscustomobject]$result
}

function Invoke-FounderGitUtf8 {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$GitArguments
  )

  $previousOutputEncoding = [Console]::OutputEncoding
  try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    return @(& git @GitArguments 2>$null)
  } finally {
    [Console]::OutputEncoding = $previousOutputEncoding
  }
}

function Get-FounderGitRepositoryIdentity {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $normalizedRepositoryPath = Normalize-FounderRepositoryPath -Path $RepositoryPath
  try {
    $safeDirectoryArgument = "safe.directory=$normalizedRepositoryPath"
    $topLevel = (Invoke-FounderGitUtf8 -GitArguments @(
        '-c', $safeDirectoryArgument,
        '-C', $normalizedRepositoryPath,
        'rev-parse', '--path-format=absolute', '--show-toplevel'
      ) | Select-Object -First 1).Trim()
    $commonDirectory = (Invoke-FounderGitUtf8 -GitArguments @(
        '-c', $safeDirectoryArgument,
        '-C', $normalizedRepositoryPath,
        'rev-parse', '--path-format=absolute', '--git-common-dir'
      ) | Select-Object -First 1).Trim()
    $remote = (Invoke-FounderGitUtf8 -GitArguments @(
        '-c', $safeDirectoryArgument,
        '-C', $normalizedRepositoryPath,
        'config', '--get', 'remote.origin.url'
      ) | Select-Object -First 1).Trim()
  } catch {
    return $null
  }

  if ([string]::IsNullOrWhiteSpace($topLevel) -or
    [string]::IsNullOrWhiteSpace($commonDirectory) -or
    [string]::IsNullOrWhiteSpace($remote)) {
    return $null
  }

  return [pscustomobject]@{
    RepositoryPath = Normalize-FounderRepositoryPath -Path $topLevel
    CommonDirectory = Normalize-FounderRepositoryPath -Path $commonDirectory
    Remote = $remote.TrimEnd('/')
  }
}

function Test-FounderGitRepositoryIdentityEqual {
  param(
    $Left,
    $Right
  )

  if ($null -eq $Left -or $null -eq $Right) {
    return $false
  }

  return (Test-FounderRepositoryPathEqual -Left $Left.CommonDirectory -Right $Right.CommonDirectory) -and
    [string]::Equals([string]$Left.Remote, [string]$Right.Remote, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-FounderPrimaryWorktreePath {
  param(
    [Parameter(Mandatory = $true)]
    $RepositoryIdentity
  )

  $commonDirectory = Normalize-FounderRepositoryPath -Path $RepositoryIdentity.CommonDirectory
  if ((Split-Path -Leaf $commonDirectory) -ne '.git') {
    return $null
  }

  $candidate = Normalize-FounderRepositoryPath -Path (Split-Path -Parent $commonDirectory)
  $candidateIdentity = Get-FounderGitRepositoryIdentity -RepositoryPath $candidate
  if (-not (Test-FounderGitRepositoryIdentityEqual -Left $RepositoryIdentity -Right $candidateIdentity)) {
    return $null
  }
  return $candidate
}

function Get-FounderPackageContract {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $packagePath = Join-Path $RepositoryPath 'package.json'
  if (-not (Test-Path -LiteralPath $packagePath)) {
    return $null
  }

  try {
    $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
  } catch {
    return $null
  }

  return [pscustomobject]@{
    Next = [string](Get-FounderPropertyValue -Object $package.dependencies -Name 'next' -DefaultValue '')
    React = [string](Get-FounderPropertyValue -Object $package.dependencies -Name 'react' -DefaultValue '')
    ReactDom = [string](Get-FounderPropertyValue -Object $package.dependencies -Name 'react-dom' -DefaultValue '')
  }
}

function Get-FounderInstalledRuntime {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $dependencyRoot = Join-Path $RepositoryPath 'node_modules'
  $nextCliPath = Join-Path $dependencyRoot 'next\dist\bin\next'
  $versions = [ordered]@{}
  foreach ($packageName in @('next', 'react', 'react-dom')) {
    $manifestPath = Join-Path $dependencyRoot "$packageName\package.json"
    if (-not (Test-Path -LiteralPath $manifestPath)) {
      return $null
    }
    try {
      $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
      $versions[$packageName] = [string]$manifest.version
    } catch {
      return $null
    }
  }

  if (-not (Test-Path -LiteralPath $nextCliPath)) {
    return $null
  }

  return [pscustomobject]@{
    DependencyRoot = $dependencyRoot
    NextCliPath = $nextCliPath
    NextVersion = $versions.next
    ReactVersion = $versions.react
    ReactDomVersion = $versions.'react-dom'
  }
}

function ConvertFrom-FounderStableSemVer {
  param(
    [AllowNull()]
    [string]$Version
  )

  if ([string]::IsNullOrWhiteSpace($Version)) {
    return $null
  }

  $match = [System.Text.RegularExpressions.Regex]::Match(
    $Version,
    '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
  )
  if (-not $match.Success) {
    return $null
  }

  $major = 0
  $minor = 0
  $patch = 0
  if (-not [int]::TryParse($match.Groups[1].Value, [ref]$major) -or
    -not [int]::TryParse($match.Groups[2].Value, [ref]$minor) -or
    -not [int]::TryParse($match.Groups[3].Value, [ref]$patch)) {
    return $null
  }

  return [pscustomobject]@{ Major = $major; Minor = $minor; Patch = $patch }
}

function Compare-FounderSemanticVersion {
  param(
    [Parameter(Mandatory = $true)]
    $Left,
    [Parameter(Mandatory = $true)]
    $Right
  )

  foreach ($propertyName in @('Major', 'Minor', 'Patch')) {
    $leftValue = [int]$Left.$propertyName
    $rightValue = [int]$Right.$propertyName
    if ($leftValue -lt $rightValue) { return -1 }
    if ($leftValue -gt $rightValue) { return 1 }
  }
  return 0
}

function Test-FounderSemanticVersionSatisfiesRange {
  param(
    [AllowNull()]
    [string]$Range,
    [AllowNull()]
    [string]$InstalledVersion
  )

  if ([string]::IsNullOrWhiteSpace($Range) -or -not $Range.StartsWith('^')) {
    return $false
  }

  $minimum = ConvertFrom-FounderStableSemVer -Version $Range.Substring(1)
  $installed = ConvertFrom-FounderStableSemVer -Version $InstalledVersion
  if ($null -eq $minimum -or $null -eq $installed) {
    return $false
  }
  if ((Compare-FounderSemanticVersion -Left $installed -Right $minimum) -lt 0) {
    return $false
  }

  if ($minimum.Major -gt 0) {
    if ($minimum.Major -eq [int]::MaxValue) { return $false }
    $upper = [pscustomobject]@{ Major = $minimum.Major + 1; Minor = 0; Patch = 0 }
  } elseif ($minimum.Minor -gt 0) {
    if ($minimum.Minor -eq [int]::MaxValue) { return $false }
    $upper = [pscustomobject]@{ Major = 0; Minor = $minimum.Minor + 1; Patch = 0 }
  } else {
    if ($minimum.Patch -eq [int]::MaxValue) { return $false }
    $upper = [pscustomobject]@{ Major = 0; Minor = 0; Patch = $minimum.Patch + 1 }
  }

  return (Compare-FounderSemanticVersion -Left $installed -Right $upper) -lt 0
}

function Get-FounderDependencyCompatibility {
  param(
    $TargetContract,
    $SourceContract,
    $InstalledRuntime
  )

  $checks = [ordered]@{}
  $compatible = $null -ne $TargetContract -and $null -ne $SourceContract -and $null -ne $InstalledRuntime
  foreach ($definition in @(
      @{ Name = 'Next'; Installed = 'NextVersion' },
      @{ Name = 'React'; Installed = 'ReactVersion' },
      @{ Name = 'ReactDom'; Installed = 'ReactDomVersion' }
    )) {
    $targetRange = [string](Get-FounderPropertyValue -Object $TargetContract -Name $definition.Name -DefaultValue '')
    $sourceRange = [string](Get-FounderPropertyValue -Object $SourceContract -Name $definition.Name -DefaultValue '')
    $installedVersion = [string](Get-FounderPropertyValue -Object $InstalledRuntime -Name $definition.Installed -DefaultValue '')
    $declarationsMatch = -not [string]::IsNullOrWhiteSpace($targetRange) -and
      [string]::Equals($targetRange, $sourceRange, [System.StringComparison]::Ordinal)
    $installedSatisfiesTarget = $declarationsMatch -and
      (Test-FounderSemanticVersionSatisfiesRange -Range $targetRange -InstalledVersion $installedVersion)
    $checks[$definition.Name] = [pscustomobject]@{
      DeclaredRange = $targetRange
      InstalledVersion = $installedVersion
      DeclarationsMatch = $declarationsMatch
      InstalledSatisfiesTarget = $installedSatisfiesTarget
    }
    if (-not $installedSatisfiesTarget) {
      $compatible = $false
    }
  }

  return [pscustomobject]@{
    Compatible = [bool]$compatible
    Packages = [pscustomobject]$checks
  }
}

function Test-FounderDependencyContractCompatible {
  param(
    $TargetContract,
    $SourceContract,
    $InstalledRuntime
  )

  return [bool](Get-FounderDependencyCompatibility `
      -TargetContract $TargetContract `
      -SourceContract $SourceContract `
      -InstalledRuntime $InstalledRuntime).Compatible
}

function Get-FounderEnvironmentSource {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TargetRepositoryPath,
    [AllowNull()]
    [string]$PrimaryRepositoryPath,
    [bool]$SameRepository
  )

  $targetEnvironmentPath = Join-Path $TargetRepositoryPath '.env.local'
  if (Test-Path -LiteralPath $targetEnvironmentPath) {
    return [pscustomobject]@{ Classification = 'TARGET_LOCAL_ENV'; Path = '' }
  }

  if ($SameRepository -and -not [string]::IsNullOrWhiteSpace($PrimaryRepositoryPath)) {
    $primaryEnvironmentPath = Join-Path $PrimaryRepositoryPath '.env.local'
    if (Test-Path -LiteralPath $primaryEnvironmentPath) {
      return [pscustomobject]@{ Classification = 'SAME_REPOSITORY_PRIMARY_ENV'; Path = $primaryEnvironmentPath }
    }
  }

  return [pscustomobject]@{ Classification = 'NO_ENV_FILE'; Path = '' }
}

function Resolve-FounderRuntime {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $targetPath = Normalize-FounderRepositoryPath -Path $RepositoryPath
  $targetIdentity = Get-FounderGitRepositoryIdentity -RepositoryPath $targetPath
  if ($null -eq $targetIdentity) {
    throw 'Target Git repository identity could not be resolved.'
  }
  $targetContract = Get-FounderPackageContract -RepositoryPath $targetPath
  if ($null -eq $targetContract) {
    throw 'Target dependency contract could not be read.'
  }

  $primaryPath = Get-FounderPrimaryWorktreePath -RepositoryIdentity $targetIdentity
  $primaryIdentity = if ([string]::IsNullOrWhiteSpace($primaryPath)) { $null } else { Get-FounderGitRepositoryIdentity -RepositoryPath $primaryPath }
  $sameRepository = Test-FounderGitRepositoryIdentityEqual -Left $targetIdentity -Right $primaryIdentity
  $dependencySourcePath = $targetPath
  $dependencyClassification = 'TARGET_LOCAL_DEPENDENCIES'
  $installedRuntime = Get-FounderInstalledRuntime -RepositoryPath $targetPath
  $sourceContract = $targetContract

  if ($null -eq $installedRuntime) {
    if (-not $sameRepository -or (Test-FounderRepositoryPathEqual -Left $targetPath -Right $primaryPath)) {
      throw 'No compatible target-local or same-repository shared dependency runtime is available.'
    }
    $dependencySourcePath = $primaryPath
    $dependencyClassification = 'SAME_REPOSITORY_SHARED_DEPENDENCIES'
    $sourceContract = Get-FounderPackageContract -RepositoryPath $dependencySourcePath
    $installedRuntime = Get-FounderInstalledRuntime -RepositoryPath $dependencySourcePath
  }

  $dependencyCompatibility = Get-FounderDependencyCompatibility `
    -TargetContract $targetContract `
    -SourceContract $sourceContract `
    -InstalledRuntime $installedRuntime
  if (-not $dependencyCompatibility.Compatible) {
    throw 'The dependency source is incompatible with the target next/react/react-dom contract.'
  }

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $nodeCommand) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1
  }
  if ($null -eq $nodeCommand) {
    throw 'Node executable could not be resolved.'
  }

  $environmentSource = Get-FounderEnvironmentSource `
    -TargetRepositoryPath $targetPath `
    -PrimaryRepositoryPath $primaryPath `
    -SameRepository $sameRepository

  return [pscustomobject]@{
    NodeExecutable = [string]$nodeCommand.Source
    NextCliPath = $installedRuntime.NextCliPath
    DependencyRoot = $installedRuntime.DependencyRoot
    DependencySourceRepository = $dependencySourcePath
    DependencySourceClassification = $dependencyClassification
    EnvironmentSourceClassification = $environmentSource.Classification
    EnvironmentFilePath = $environmentSource.Path
    NextVersion = $installedRuntime.NextVersion
    ReactVersion = $installedRuntime.ReactVersion
    ReactDomVersion = $installedRuntime.ReactDomVersion
    DependencyCompatibility = $dependencyCompatibility
  }
}

function Test-FounderRepositoryPathEqual {
  param(
    [AllowNull()]
    [string]$Left,
    [AllowNull()]
    [string]$Right
  )

  if ([string]::IsNullOrWhiteSpace($Left) -or [string]::IsNullOrWhiteSpace($Right)) {
    return $false
  }

  try {
    $normalizedLeft = Normalize-FounderRepositoryPath -Path $Left
    $normalizedRight = Normalize-FounderRepositoryPath -Path $Right
    return [string]::Equals($normalizedLeft, $normalizedRight, [System.StringComparison]::OrdinalIgnoreCase)
  } catch {
    return $false
  }
}

function Test-FounderQaReadyWorkingTree {
  param(
    [AllowEmptyCollection()]
    [string[]]$Entries
  )

  $allowedPaths = @(
    'docs/project/QA_CHECKLIST.md',
    'docs/project/QA_CHECKLIST.pdf'
  )
  $allowedEntries = @()
  $blockingEntries = @()

  foreach ($entry in @($Entries)) {
    if ([string]::IsNullOrWhiteSpace($entry)) {
      continue
    }

    $normalizedEntry = $entry.Trim()
    $isUntracked = $normalizedEntry.StartsWith('?? ')
    $path = if ($normalizedEntry.Length -gt 3) { $normalizedEntry.Substring(3).Trim('"') } else { '' }
    $path = $path.Replace('\', '/')
    if ($isUntracked -and $path -in $allowedPaths) {
      $allowedEntries += $normalizedEntry
    } else {
      $blockingEntries += $normalizedEntry
    }
  }

  return [pscustomobject]@{
    Success = $blockingEntries.Count -eq 0
    Status = if ($blockingEntries.Count -eq 0) { 'QA_WORKTREE_ALLOWED' } else { 'BLOCKED_DIRTY_WORKTREE' }
    AllowedEntries = $allowedEntries
    BlockingEntries = $blockingEntries
  }
}

function Get-FounderListeners {
  param(
    [int[]]$Ports
  )

  $rows = @()
  try {
    $connections = @(Get-NetTCPConnection -State Listen -ErrorAction Stop)
    if ($null -ne $Ports -and $Ports.Count -gt 0) {
      $connections = @($connections | Where-Object { $_.LocalPort -in $Ports })
    }

    foreach ($connection in $connections) {
      $rows += [pscustomobject]@{
        LocalAddress = [string]$connection.LocalAddress
        LocalPort = [int]$connection.LocalPort
        OwningProcess = [int]$connection.OwningProcess
      }
    }
    return @($rows | Sort-Object LocalPort, OwningProcess -Unique)
  } catch {
    $netstatRows = @(netstat -ano -p tcp 2>$null | Select-String 'LISTENING')
    foreach ($netstatRow in $netstatRows) {
      $parts = @($netstatRow.Line.Trim() -split '\s+')
      if ($parts.Count -lt 5) {
        continue
      }

      $localEndpoint = $parts[1]
      $lastColon = $localEndpoint.LastIndexOf(':')
      if ($lastColon -lt 0) {
        continue
      }

      $address = $localEndpoint.Substring(0, $lastColon).Trim('[', ']')
      $port = 0
      $processId = 0
      if (-not [int]::TryParse($localEndpoint.Substring($lastColon + 1), [ref]$port)) {
        continue
      }
      if (-not [int]::TryParse($parts[-1], [ref]$processId)) {
        continue
      }
      if ($null -ne $Ports -and $Ports.Count -gt 0 -and $port -notin $Ports) {
        continue
      }

      $rows += [pscustomobject]@{
        LocalAddress = $address
        LocalPort = $port
        OwningProcess = $processId
      }
    }
    return @($rows | Sort-Object LocalPort, OwningProcess -Unique)
  }
}

function Initialize-FounderNativeProcessQuery {
  if ($null -ne ('MyOttFounderPreviewProcessQuery' -as [type])) {
    return $true
  }

  try {
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public sealed class MyOttFounderPreviewProcessMetadata
{
    public int ProcessId { get; set; }
    public int ParentProcessId { get; set; }
    public string CommandLine { get; set; }
    public string ExecutablePath { get; set; }
    public DateTime CreationTimeUtc { get; set; }
}

public sealed class MyOttFounderPreviewTerminationLease : IDisposable
{
    private const uint WaitObject0 = 0;
    private const uint WaitTimeout = 0x102;
    private const uint WaitFailed = 0xFFFFFFFF;
    private IntPtr process;

    internal MyOttFounderPreviewTerminationLease(
        IntPtr processHandle,
        MyOttFounderPreviewProcessMetadata metadata)
    {
        process = processHandle;
        Metadata = metadata;
    }

    public MyOttFounderPreviewProcessMetadata Metadata { get; private set; }
    public bool IsDisposed { get { return process == IntPtr.Zero; } }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr processHandle, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    public string TerminateIfRunning(uint exitCode)
    {
        if (process == IntPtr.Zero)
        {
            throw new ObjectDisposedException("MyOttFounderPreviewTerminationLease");
        }

        uint waitResult = WaitForSingleObject(process, 0);
        if (waitResult == WaitObject0)
        {
            return "ALREADY_EXITED";
        }
        if (waitResult == WaitFailed)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        if (waitResult != WaitTimeout)
        {
            throw new InvalidOperationException("Unexpected process wait result.");
        }

        if (TerminateProcess(process, exitCode))
        {
            return "TERMINATED";
        }

        int terminateError = Marshal.GetLastWin32Error();
        waitResult = WaitForSingleObject(process, 0);
        if (waitResult == WaitObject0)
        {
            return "ALREADY_EXITED";
        }
        throw new Win32Exception(terminateError);
    }

    public void Dispose()
    {
        IntPtr handle = process;
        process = IntPtr.Zero;
        if (handle != IntPtr.Zero && !CloseHandle(handle))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        GC.SuppressFinalize(this);
    }
}

public static class MyOttFounderPreviewProcessQuery
{
    private const uint ProcessTerminate = 0x0001;
    private const uint ProcessQueryLimitedInformation = 0x1000;
    private const uint Synchronize = 0x00100000;
    private const int ProcessBasicInformation = 0;
    private const int ProcessCommandLineInformation = 60;

    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessBasicInformationData
    {
        public IntPtr Reserved1;
        public IntPtr PebBaseAddress;
        public IntPtr Reserved2_0;
        public IntPtr Reserved2_1;
        public IntPtr UniqueProcessId;
        public IntPtr InheritedFromUniqueProcessId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct UnicodeString
    {
        public ushort Length;
        public ushort MaximumLength;
        public IntPtr Buffer;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FileTime
    {
        public uint Low;
        public uint High;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint desiredAccess, bool inheritHandle, int processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CommandLineToArgvW(string commandLine, out int argumentCount);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr LocalFree(IntPtr memory);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetProcessTimes(
        IntPtr process,
        out FileTime creation,
        out FileTime exit,
        out FileTime kernel,
        out FileTime user);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool QueryFullProcessImageName(
        IntPtr process,
        int flags,
        StringBuilder executablePath,
        ref int size);

    [DllImport("ntdll.dll")]
    private static extern int NtQueryInformationProcess(
        IntPtr process,
        int informationClass,
        IntPtr information,
        int informationLength,
        out int returnLength);

    public static MyOttFounderPreviewProcessMetadata Query(int processId)
    {
        IntPtr process = OpenProcess(ProcessQueryLimitedInformation, false, processId);
        if (process == IntPtr.Zero)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        try
        {
            return QueryFromHandle(process, processId);
        }
        finally
        {
            CloseHandle(process);
        }
    }

    public static MyOttFounderPreviewTerminationLease AcquireTerminationLease(int processId)
    {
        uint access = ProcessQueryLimitedInformation | ProcessTerminate | Synchronize;
        IntPtr process = OpenProcess(access, false, processId);
        if (process == IntPtr.Zero)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        try
        {
            MyOttFounderPreviewProcessMetadata metadata = QueryFromHandle(process, processId);
            MyOttFounderPreviewTerminationLease lease =
                new MyOttFounderPreviewTerminationLease(process, metadata);
            process = IntPtr.Zero;
            return lease;
        }
        finally
        {
            if (process != IntPtr.Zero && !CloseHandle(process))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
        }
    }

    public static string[] ParseCommandLine(string commandLine)
    {
        if (String.IsNullOrWhiteSpace(commandLine) ||
            commandLine.Length > 32767 ||
            commandLine.IndexOf('\0') >= 0 ||
            !HasBalancedNativeQuotes(commandLine))
        {
            throw new InvalidOperationException("Process command line is malformed.");
        }

        int argumentCount;
        IntPtr argumentVector = CommandLineToArgvW(commandLine, out argumentCount);
        if (argumentVector == IntPtr.Zero)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        string[] arguments = null;
        try
        {
            if (argumentCount <= 0 || argumentCount > 256)
            {
                throw new InvalidOperationException("Process argument count is outside the accepted bound.");
            }

            arguments = new string[argumentCount];
            for (int index = 0; index < argumentCount; index++)
            {
                IntPtr argumentPointer = Marshal.ReadIntPtr(
                    argumentVector,
                    index * IntPtr.Size);
                if (argumentPointer == IntPtr.Zero)
                {
                    throw new InvalidOperationException("Process argument pointer is unavailable.");
                }
                string argument = Marshal.PtrToStringUni(argumentPointer);
                if (argument == null)
                {
                    throw new InvalidOperationException("Process argument is unavailable.");
                }
                arguments[index] = argument;
            }
        }
        finally
        {
            if (LocalFree(argumentVector) != IntPtr.Zero)
            {
                throw new InvalidOperationException("Native argument memory could not be released.");
            }
        }
        return arguments;
    }

    public static bool IsOwnershipCommandLineUnambiguous(string commandLine)
    {
        if (String.IsNullOrWhiteSpace(commandLine) ||
            commandLine.Length > 32767 ||
            commandLine.IndexOf('\0') >= 0)
        {
            return false;
        }

        bool inQuotes = false;
        for (int index = 0; index < commandLine.Length; index++)
        {
            if (commandLine[index] != '"')
            {
                continue;
            }

            int precedingBackslashes = 0;
            for (int cursor = index - 1; cursor >= 0 && commandLine[cursor] == '\\'; cursor--)
            {
                precedingBackslashes++;
            }
            if (precedingBackslashes % 2 != 0)
            {
                return false;
            }

            if (!inQuotes)
            {
                bool validOpening = index == 0 ||
                    Char.IsWhiteSpace(commandLine[index - 1]) ||
                    commandLine[index - 1] == '=';
                if (!validOpening)
                {
                    return false;
                }
                inQuotes = true;
            }
            else
            {
                bool validClosing = index == commandLine.Length - 1 ||
                    Char.IsWhiteSpace(commandLine[index + 1]);
                if (!validClosing)
                {
                    return false;
                }
                inQuotes = false;
            }
        }
        return !inQuotes;
    }

    private static bool HasBalancedNativeQuotes(string commandLine)
    {
        bool inQuotes = false;
        int consecutiveBackslashes = 0;
        for (int index = 0; index < commandLine.Length; index++)
        {
            char character = commandLine[index];
            if (character == '\\')
            {
                consecutiveBackslashes++;
                continue;
            }
            if (character == '"' && consecutiveBackslashes % 2 == 0)
            {
                inQuotes = !inQuotes;
            }
            consecutiveBackslashes = 0;
        }
        return !inQuotes;
    }

    private static MyOttFounderPreviewProcessMetadata QueryFromHandle(IntPtr process, int processId)
    {
        ProcessBasicInformationData basic = QueryBasicInformation(process);
        if (basic.UniqueProcessId.ToInt64() != processId ||
            basic.InheritedFromUniqueProcessId.ToInt64() <= 0)
        {
            throw new InvalidOperationException("Process identity or parent identity is unavailable.");
        }

        string commandLine = QueryCommandLine(process);
        if (String.IsNullOrWhiteSpace(commandLine))
        {
            throw new InvalidOperationException("Process command line is unavailable.");
        }

        FileTime creation;
        FileTime exit;
        FileTime kernel;
        FileTime user;
        if (!GetProcessTimes(process, out creation, out exit, out kernel, out user))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        long creationFileTime = ((long)creation.High << 32) | creation.Low;
        StringBuilder executablePath = new StringBuilder(32768);
        int executablePathLength = executablePath.Capacity;
        if (!QueryFullProcessImageName(process, 0, executablePath, ref executablePathLength))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        return new MyOttFounderPreviewProcessMetadata
        {
            ProcessId = processId,
            ParentProcessId = basic.InheritedFromUniqueProcessId.ToInt32(),
            CommandLine = commandLine,
            ExecutablePath = executablePath.ToString(),
            CreationTimeUtc = DateTime.FromFileTimeUtc(creationFileTime)
        };
    }

    private static ProcessBasicInformationData QueryBasicInformation(IntPtr process)
    {
        int size = Marshal.SizeOf(typeof(ProcessBasicInformationData));
        IntPtr buffer = Marshal.AllocHGlobal(size);
        try
        {
            int returnLength;
            int status = NtQueryInformationProcess(
                process,
                ProcessBasicInformation,
                buffer,
                size,
                out returnLength);
            if (status < 0)
            {
                throw new InvalidOperationException("Process basic information query failed.");
            }
            return (ProcessBasicInformationData)Marshal.PtrToStructure(
                buffer,
                typeof(ProcessBasicInformationData));
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    private static string QueryCommandLine(IntPtr process)
    {
        int requiredLength;
        NtQueryInformationProcess(
            process,
            ProcessCommandLineInformation,
            IntPtr.Zero,
            0,
            out requiredLength);
        if (requiredLength <= 0)
        {
            throw new InvalidOperationException("Process command line size is unavailable.");
        }

        IntPtr buffer = Marshal.AllocHGlobal(requiredLength);
        try
        {
            int returnLength;
            int status = NtQueryInformationProcess(
                process,
                ProcessCommandLineInformation,
                buffer,
                requiredLength,
                out returnLength);
            if (status < 0)
            {
                throw new InvalidOperationException("Process command line query failed.");
            }

            UnicodeString value = (UnicodeString)Marshal.PtrToStructure(
                buffer,
                typeof(UnicodeString));
            if (value.Buffer == IntPtr.Zero || value.Length == 0 || value.Length % 2 != 0)
            {
                throw new InvalidOperationException("Process command line result is malformed.");
            }
            return Marshal.PtrToStringUni(value.Buffer, value.Length / 2);
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }
}
'@ -ErrorAction Stop
    return $null -ne ('MyOttFounderPreviewProcessQuery' -as [type])
  } catch {
    return $false
  }
}

function Get-FounderNativeProcessMetadata {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  if (-not (Initialize-FounderNativeProcessQuery)) {
    return $null
  }
  try {
    return [MyOttFounderPreviewProcessQuery]::Query($ProcessId)
  } catch {
    return $null
  }
}

function Merge-FounderProcessMetadataSources {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ExpectedProcessId,
    [AllowNull()]
    $CimProcess,
    [AllowNull()]
    $RuntimeProcess,
    [AllowNull()]
    $NativeProcess
  )

  try {
    $availableSources = @()
    $processIds = @()
    if ($null -ne $CimProcess) {
      $availableSources += 'CIM'
      $processIds += [int](Get-FounderPropertyValue -Object $CimProcess -Name 'ProcessId' -DefaultValue 0)
    }
    if ($null -ne $RuntimeProcess) {
      $availableSources += 'GET_PROCESS'
      $processIds += [int](Get-FounderPropertyValue -Object $RuntimeProcess -Name 'Id' -DefaultValue 0)
    }
    if ($null -ne $NativeProcess) {
      $availableSources += 'NATIVE_QUERY'
      $processIds += [int](Get-FounderPropertyValue -Object $NativeProcess -Name 'ProcessId' -DefaultValue 0)
    }
    if ($availableSources.Count -lt 2 -or
      @($processIds | Where-Object { $_ -ne $ExpectedProcessId }).Count -gt 0) {
      return $null
    }

    $parentIds = @()
    $commandLines = @()
    $executablePaths = @()
    $startTimes = @()
    if ($null -ne $CimProcess) {
      $parentIds += [int](Get-FounderPropertyValue -Object $CimProcess -Name 'ParentProcessId' -DefaultValue 0)
      $commandLines += [string](Get-FounderPropertyValue -Object $CimProcess -Name 'CommandLine' -DefaultValue '')
      $cimPath = [string](Get-FounderPropertyValue -Object $CimProcess -Name 'ExecutablePath' -DefaultValue '')
      if (-not [string]::IsNullOrWhiteSpace($cimPath)) { $executablePaths += $cimPath }
    }
    if ($null -ne $RuntimeProcess) {
      $runtimePath = [string](Get-FounderPropertyValue -Object $RuntimeProcess -Name 'Path' -DefaultValue '')
      if (-not [string]::IsNullOrWhiteSpace($runtimePath)) { $executablePaths += $runtimePath }
      $startTimes += ConvertTo-FounderUtcDateTime `
        -Value (Get-FounderPropertyValue -Object $RuntimeProcess -Name 'StartTime' -DefaultValue $null)
    }
    if ($null -ne $NativeProcess) {
      $parentIds += [int](Get-FounderPropertyValue -Object $NativeProcess -Name 'ParentProcessId' -DefaultValue 0)
      $commandLines += [string](Get-FounderPropertyValue -Object $NativeProcess -Name 'CommandLine' -DefaultValue '')
      $nativePath = [string](Get-FounderPropertyValue -Object $NativeProcess -Name 'ExecutablePath' -DefaultValue '')
      if (-not [string]::IsNullOrWhiteSpace($nativePath)) { $executablePaths += $nativePath }
      $startTimes += ConvertTo-FounderUtcDateTime `
        -Value (Get-FounderPropertyValue -Object $NativeProcess -Name 'CreationTimeUtc' -DefaultValue $null)
    }

    if ($parentIds.Count -eq 0 -or @($parentIds | Where-Object { $_ -le 0 }).Count -gt 0 -or
      @($parentIds | Select-Object -Unique).Count -ne 1) {
      return $null
    }
    if ($commandLines.Count -eq 0 -or @($commandLines | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count -gt 0) {
      return $null
    }
    $expectedCommandLine = [string]$commandLines[0]
    foreach ($commandLine in $commandLines) {
      if (-not [string]::Equals($expectedCommandLine, [string]$commandLine, [System.StringComparison]::Ordinal)) {
        return $null
      }
    }
    if ($startTimes.Count -lt 2) {
      return $null
    }
    $expectedStartTime = [datetime]$startTimes[0]
    foreach ($startTime in $startTimes) {
      if (-not (Test-FounderProcessCreationIdentityEqual -Left $expectedStartTime -Right $startTime)) {
        return $null
      }
    }
    if ($executablePaths.Count -eq 0) {
      return $null
    }
    $expectedExecutablePath = Normalize-FounderRepositoryPath -Path ([string]$executablePaths[0])
    foreach ($executablePath in $executablePaths) {
      if (-not [string]::Equals(
          $expectedExecutablePath,
          (Normalize-FounderRepositoryPath -Path ([string]$executablePath)),
          [System.StringComparison]::OrdinalIgnoreCase
        )) {
        return $null
      }
    }

    $name = if ($null -ne $CimProcess) {
      [string](Get-FounderPropertyValue -Object $CimProcess -Name 'Name' -DefaultValue '')
    } elseif ($null -ne $RuntimeProcess) {
      [string](Get-FounderPropertyValue -Object $RuntimeProcess -Name 'ProcessName' -DefaultValue '')
    } else {
      [System.IO.Path]::GetFileName($expectedExecutablePath)
    }

    return [pscustomobject]@{
      ProcessId = $ExpectedProcessId
      ParentProcessId = [int]$parentIds[0]
      Name = $name
      ExecutablePath = $expectedExecutablePath
      CommandLine = $expectedCommandLine
      StartTime = $expectedStartTime.ToUniversalTime().ToString('o')
      MetadataSources = @($availableSources)
    }
  } catch {
    return $null
  }
}

function Get-FounderProcessMetadata {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $cimProcess = $null
  $runtimeProcess = $null
  $nativeProcess = $null
  try { $cimProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop } catch {}
  try { $runtimeProcess = Get-Process -Id $ProcessId -ErrorAction Stop } catch {}
  $nativeProcess = Get-FounderNativeProcessMetadata -ProcessId $ProcessId

  return Merge-FounderProcessMetadataSources `
    -ExpectedProcessId $ProcessId `
    -CimProcess $cimProcess `
    -RuntimeProcess $runtimeProcess `
    -NativeProcess $nativeProcess
}

function Test-FounderProcessMetadataIdentity {
  param(
    [AllowNull()]
    $Expected,
    [AllowNull()]
    $Observed
  )

  if ($null -eq $Expected -or $null -eq $Observed) {
    return $false
  }

  try {
    if ([int]$Expected.ProcessId -le 0 -or
      [int]$Expected.ProcessId -ne [int]$Observed.ProcessId -or
      [int]$Expected.ParentProcessId -le 0 -or
      [int]$Expected.ParentProcessId -ne [int]$Observed.ParentProcessId) {
      return $false
    }

    $expectedCommandLine = [string]$Expected.CommandLine
    $observedCommandLine = [string]$Observed.CommandLine
    if ([string]::IsNullOrWhiteSpace($expectedCommandLine) -or
      [string]::IsNullOrWhiteSpace($observedCommandLine) -or
      -not [string]::Equals($expectedCommandLine, $observedCommandLine, [System.StringComparison]::Ordinal)) {
      return $false
    }

    $expectedPath = Normalize-FounderRepositoryPath -Path ([string]$Expected.ExecutablePath)
    $observedPath = Normalize-FounderRepositoryPath -Path ([string]$Observed.ExecutablePath)
    if ([string]::IsNullOrWhiteSpace($expectedPath) -or
      [string]::IsNullOrWhiteSpace($observedPath) -or
      -not [string]::Equals($expectedPath, $observedPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $false
    }

    return Test-FounderProcessCreationIdentityEqual -Left $Expected.StartTime -Right $Observed.StartTime
  } catch {
    return $false
  }
}

function Get-FounderProcessAncestors {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId,
    [int]$MaximumDepth = 20
  )

  $ancestors = @()
  $seen = @{}
  $currentId = $ProcessId
  for ($depth = 0; $depth -lt $MaximumDepth -and $currentId -gt 0; $depth++) {
    if ($seen.ContainsKey($currentId)) {
      break
    }
    $seen[$currentId] = $true

    $metadata = Get-FounderProcessMetadata -ProcessId $currentId
    if ($null -eq $metadata) {
      break
    }

    $ancestors += $metadata
    $currentId = [int]$metadata.ParentProcessId
  }

  return $ancestors
}

function Get-FounderProcessDescendantRelationships {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId,
    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
    [object[]]$ProcessSnapshot
  )

  $relationships = @()
  $queue = New-Object System.Collections.Queue
  $queue.Enqueue([pscustomobject]@{ ProcessId = $ProcessId; Depth = 0 })
  $seen = @{}
  while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()
    foreach ($child in @($ProcessSnapshot | Where-Object { [int]$_.ParentProcessId -eq [int]$current.ProcessId })) {
      $childId = [int]$child.ProcessId
      if ($childId -le 0 -or $seen.ContainsKey($childId)) {
        continue
      }
      $seen[$childId] = $true
      $relationship = [pscustomobject]@{
        ProcessId = $childId
        Depth = [int]$current.Depth + 1
      }
      $relationships += $relationship
      $queue.Enqueue($relationship)
    }
  }
  return @($relationships)
}

function Get-FounderProcessParentSnapshot {
  try {
    return @(Get-CimInstance Win32_Process -ErrorAction Stop | ForEach-Object {
        [pscustomobject]@{
          ProcessId = [int]$_.ProcessId
          ParentProcessId = [int]$_.ParentProcessId
        }
      })
  } catch {
    $snapshot = @()
    foreach ($runtimeProcess in @(Get-Process -ErrorAction SilentlyContinue)) {
      $nativeProcess = Get-FounderNativeProcessMetadata -ProcessId ([int]$runtimeProcess.Id)
      if ($null -ne $nativeProcess) {
        $snapshot += [pscustomobject]@{
          ProcessId = [int]$nativeProcess.ProcessId
          ParentProcessId = [int]$nativeProcess.ParentProcessId
        }
      }
    }
    return @($snapshot)
  }
}

function Get-FounderProcessDescendants {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $allProcesses = @(Get-FounderProcessParentSnapshot)
  if ($allProcesses.Count -eq 0) { return @() }

  $descendants = @()
  foreach ($relationship in @(Get-FounderProcessDescendantRelationships -ProcessId $ProcessId -ProcessSnapshot $allProcesses)) {
    $metadata = Get-FounderProcessMetadata -ProcessId ([int]$relationship.ProcessId)
    if ($null -ne $metadata) {
      $descendants += [pscustomobject]@{
        Metadata = $metadata
        Depth = [int]$relationship.Depth
      }
    }
  }

  return @($descendants)
}

function Test-FounderCommandLineReferencesRepository {
  param(
    [AllowNull()]
    [string]$CommandLine,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return $false
  }

  $normalizedRepositoryPath = Normalize-FounderRepositoryPath -Path $RepositoryPath
  $normalizedCommandLine = $CommandLine.Replace('/', '\')
  $escapedPath = [System.Text.RegularExpressions.Regex]::Escape($normalizedRepositoryPath)
  $pattern = '(?i)(?:^|[\s"''=])' + $escapedPath + '(?=$|[\s"''\\])'
  return [System.Text.RegularExpressions.Regex]::IsMatch($normalizedCommandLine, $pattern)
}

function ConvertFrom-FounderWindowsCommandLine {
  param(
    [AllowNull()]
    [string]$CommandLine
  )

  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return [pscustomobject]@{ Success = $false; Tokens = @() }
  }

  if (-not (Initialize-FounderNativeProcessQuery)) {
    return [pscustomobject]@{ Success = $false; Tokens = @() }
  }

  try {
    $tokens = @([MyOttFounderPreviewProcessQuery]::ParseCommandLine($CommandLine))
    if ($tokens.Count -eq 0) {
      return [pscustomobject]@{ Success = $false; Tokens = @() }
    }
    return [pscustomobject]@{ Success = $true; Tokens = @($tokens) }
  } catch {
    return [pscustomobject]@{ Success = $false; Tokens = @() }
  }
}

function Test-FounderOfficialNextCliPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CandidatePath,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  try {
    $candidate = Normalize-FounderRepositoryPath -Path $CandidatePath
    $targetCli = Normalize-FounderRepositoryPath `
      -Path (Join-Path $RepositoryPath 'node_modules\next\dist\bin\next')
    if (Test-FounderRepositoryPathEqual -Left $candidate -Right $targetCli) {
      return $true
    }

    $segments = @($candidate.Replace('/', '\').Split('\', [System.StringSplitOptions]::RemoveEmptyEntries))
    if ($segments.Count -lt 5) {
      return $false
    }
    $requiredSuffix = @('node_modules', 'next', 'dist', 'bin', 'next')
    for ($offset = 0; $offset -lt $requiredSuffix.Count; $offset++) {
      $actualSegment = $segments[$segments.Count - $requiredSuffix.Count + $offset]
      if (-not [string]::Equals($actualSegment, $requiredSuffix[$offset], [System.StringComparison]::OrdinalIgnoreCase)) {
        return $false
      }
    }

    $runtime = Resolve-FounderRuntime -RepositoryPath $RepositoryPath
    return Test-FounderRepositoryPathEqual -Left $candidate -Right $runtime.NextCliPath
  } catch {
    return $false
  }
}

function Get-FounderCanonicalNextDevCommand {
  param(
    [AllowNull()]
    [string]$CommandLine,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $result = [ordered]@{
    IsCanonical = $false
    NodeOptions = @()
    OfficialNextCli = ''
    DevSubcommand = ''
    ApplicationDirectory = ''
    ApplicationMatchesTarget = $false
  }
  if (-not (Initialize-FounderNativeProcessQuery)) {
    return [pscustomobject]$result
  }
  try {
    if (-not [MyOttFounderPreviewProcessQuery]::IsOwnershipCommandLineUnambiguous($CommandLine)) {
      return [pscustomobject]$result
    }
  } catch {
    return [pscustomobject]$result
  }
  $parsed = ConvertFrom-FounderWindowsCommandLine -CommandLine $CommandLine
  if (-not $parsed.Success -or $parsed.Tokens.Count -lt 4) {
    return [pscustomobject]$result
  }

  $executableName = [System.IO.Path]::GetFileName([string]$parsed.Tokens[0])
  if ($executableName -notin @('node', 'node.exe')) {
    return [pscustomobject]$result
  }

  $scriptIndex = 1
  $nodeOptions = @()
  $nodeOption = [string]$parsed.Tokens[$scriptIndex]
  if ($nodeOption -like '--env-file=*') {
    if ([string]::IsNullOrWhiteSpace($nodeOption.Substring('--env-file='.Length))) {
      return [pscustomobject]$result
    }
    $nodeOptions += $nodeOption
    $scriptIndex++
  } elseif ([string]::Equals($nodeOption, '--env-file', [System.StringComparison]::OrdinalIgnoreCase)) {
    if ($parsed.Tokens.Count -le $scriptIndex + 1 -or
      [string]::IsNullOrWhiteSpace([string]$parsed.Tokens[$scriptIndex + 1])) {
      return [pscustomobject]$result
    }
    $nodeOptions += @($nodeOption, [string]$parsed.Tokens[$scriptIndex + 1])
    $scriptIndex += 2
  }
  $result.NodeOptions = @($nodeOptions)

  if ($parsed.Tokens.Count -le $scriptIndex + 2) {
    return [pscustomobject]$result
  }
  if (-not [string]::Equals(
      [string]$parsed.Tokens[$scriptIndex + 1],
      'dev',
      [System.StringComparison]::OrdinalIgnoreCase
    )) {
    return [pscustomobject]$result
  }
  $result.DevSubcommand = 'dev'

  $nextCli = [string]$parsed.Tokens[$scriptIndex]
  if (-not (Test-FounderOfficialNextCliPath -CandidatePath $nextCli -RepositoryPath $RepositoryPath)) {
    return [pscustomobject]$result
  }
  $result.OfficialNextCli = Normalize-FounderRepositoryPath -Path $nextCli

  $applicationDirectory = [string]$parsed.Tokens[$scriptIndex + 2]
  if ([string]::IsNullOrWhiteSpace($applicationDirectory) -or $applicationDirectory.StartsWith('-')) {
    return [pscustomobject]$result
  }
  try {
    $result.ApplicationDirectory = Normalize-FounderRepositoryPath -Path $applicationDirectory
  } catch {
    return [pscustomobject]$result
  }
  $result.ApplicationMatchesTarget = Test-FounderRepositoryPathEqual `
    -Left $result.ApplicationDirectory `
    -Right $RepositoryPath

  $nextOptionIndex = $scriptIndex + 3
  if ($parsed.Tokens.Count -gt $nextOptionIndex) {
    if ($parsed.Tokens.Count -ne $nextOptionIndex + 4 -or
      -not [string]::Equals([string]$parsed.Tokens[$nextOptionIndex], '--hostname', [System.StringComparison]::OrdinalIgnoreCase) -or
      [string]::IsNullOrWhiteSpace([string]$parsed.Tokens[$nextOptionIndex + 1]) -or
      -not [string]::Equals([string]$parsed.Tokens[$nextOptionIndex + 2], '--port', [System.StringComparison]::OrdinalIgnoreCase) -or
      [string]$parsed.Tokens[$nextOptionIndex + 3] -notmatch '^\d+$') {
      return [pscustomobject]$result
    }
  }

  $result.IsCanonical = $true
  return [pscustomobject]$result
}

function Test-FounderCommandLooksLikeDevServer {
  param(
    [AllowNull()]
    [string]$CommandLine,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $canonicalCommand = Get-FounderCanonicalNextDevCommand `
    -CommandLine $CommandLine `
    -RepositoryPath $RepositoryPath
  return [bool]$canonicalCommand.IsCanonical
}

function Test-FounderApprovedNodeExecutable {
  param(
    [AllowNull()]
    [string]$ExecutablePath,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  if ([string]::IsNullOrWhiteSpace($ExecutablePath)) {
    return $false
  }
  try {
    $runtime = Resolve-FounderRuntime -RepositoryPath $RepositoryPath
    return Test-FounderRepositoryPathEqual `
      -Left $ExecutablePath `
      -Right $runtime.NodeExecutable
  } catch {
    return $false
  }
}

function Test-FounderProcessChainRelationship {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
    [object[]]$Chain,
    [Parameter(Mandatory = $true)]
    [int]$ListenerProcessId,
    [Parameter(Mandatory = $true)]
    [int]$AncestorProcessId
  )

  if ($Chain.Count -eq 0 -or [int]$Chain[0].ProcessId -ne $ListenerProcessId) {
    return $false
  }

  for ($index = 0; $index -lt $Chain.Count; $index++) {
    $current = $Chain[$index]
    if ([int]$current.ProcessId -eq $AncestorProcessId) {
      return $true
    }
    if ($index + 1 -ge $Chain.Count -or
      [int]$current.ParentProcessId -ne [int]$Chain[$index + 1].ProcessId) {
      return $false
    }

    try {
      $childStartTime = ConvertTo-FounderUtcDateTime -Value $current.StartTime
      $parentStartTime = ConvertTo-FounderUtcDateTime -Value $Chain[$index + 1].StartTime
      if ($parentStartTime.Ticks -gt $childStartTime.Ticks) {
        return $false
      }
    } catch {
      return $false
    }
  }

  return $false
}

function Get-FounderProcessOwnershipFromChain {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
    [object[]]$Chain,
    [Parameter(Mandatory = $true)]
    [int]$ProcessId,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  if ($Chain.Count -eq 0 -or [int]$Chain[0].ProcessId -ne $ProcessId) {
    return [pscustomobject]@{
      Owned = $false
      Reason = 'process-metadata-unavailable'
      Process = $null
      ProvingProcess = $null
      ProvingProcessId = 0
      ListenerDescendsFromProvingProcess = $false
      Chain = @($Chain)
    }
  }

  $referencesRepository = $false
  $looksLikeDevServer = $false
  $canonicalExecutableMismatch = $false
  $provingProcess = $null
  foreach ($process in $Chain) {
    $repositoryTextProof = Test-FounderCommandLineReferencesRepository `
      -CommandLine $process.CommandLine `
      -RepositoryPath $RepositoryPath
    $canonicalCommand = Get-FounderCanonicalNextDevCommand `
      -CommandLine $process.CommandLine `
      -RepositoryPath $RepositoryPath
    $repositoryProof = [bool]$canonicalCommand.ApplicationMatchesTarget
    $nextProof = [bool]$canonicalCommand.IsCanonical
    $executableProof = Test-FounderApprovedNodeExecutable `
      -ExecutablePath ([string]$process.ExecutablePath) `
      -RepositoryPath $RepositoryPath
    $referencesRepository = $referencesRepository -or $repositoryTextProof
    $looksLikeDevServer = $looksLikeDevServer -or $nextProof
    $canonicalExecutableMismatch = $canonicalExecutableMismatch -or
      ($repositoryProof -and $nextProof -and -not $executableProof)
    if ($repositoryProof -and $nextProof -and $executableProof) {
      $provingProcess = $process
      break
    }
  }

  $listenerDescends = $null -ne $provingProcess -and
    (Test-FounderProcessChainRelationship `
      -Chain $Chain `
      -ListenerProcessId $ProcessId `
      -AncestorProcessId ([int]$provingProcess.ProcessId))
  $owned = $null -ne $provingProcess -and $listenerDescends
  $reason = 'command-line-does-not-prove-repository-ownership'
  if ($owned) {
    $reason = 'single-process-repository-path-and-next-dev-confirmed'
  } elseif ($null -ne $provingProcess) {
    $reason = 'listener-ancestry-to-proving-process-unverified'
  } elseif ($canonicalExecutableMismatch) {
    $reason = 'canonical-command-executable-mismatch'
  } elseif ($referencesRepository -and $looksLikeDevServer) {
    $reason = 'split-process-repository-and-next-dev-evidence-rejected'
  } elseif ($referencesRepository) {
    $reason = 'repository-path-found-but-dev-server-command-missing'
  } elseif ($looksLikeDevServer) {
    $reason = 'dev-server-command-found-without-repository-path'
  }

  return [pscustomobject]@{
    Owned = $owned
    Reason = $reason
    Process = $Chain[0]
    ProvingProcess = if ($owned) { $provingProcess } else { $null }
    ProvingProcessId = if ($owned) { [int]$provingProcess.ProcessId } else { 0 }
    ListenerDescendsFromProvingProcess = $listenerDescends
    Chain = @($Chain)
  }
}

function Get-FounderProcessOwnership {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $chain = @(Get-FounderProcessAncestors -ProcessId $ProcessId)
  return Get-FounderProcessOwnershipFromChain `
    -Chain $chain `
    -ProcessId $ProcessId `
    -RepositoryPath $RepositoryPath
}

function Test-FounderStateSchema {
  param(
    $State
  )

  if ($null -eq $State) {
    return $false
  }

  $requiredProperties = @(
    'schemaVersion',
    'repositoryPath',
    'requestedHost',
    'requestedPort',
    'launcherPid',
    'launcherStartedAt',
    'listenerPid',
    'listenerStartedAt',
    'startedAt',
    'command',
    'stdoutLog',
    'stderrLog'
  )
  foreach ($propertyName in $requiredProperties) {
    if ($null -eq $State.PSObject.Properties[$propertyName]) {
      return $false
    }
  }

  return $true
}

function Test-FounderStateProcessIdentity {
  param(
    [Parameter(Mandatory = $true)]
    $State,
    [Parameter(Mandatory = $true)]
    $ProcessMetadata,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath,
    $Ownership = $null,
    [string]$ExpectedHost = '127.0.0.1',
    [int]$ExpectedPort = 3000
  )

  if (-not (Test-FounderStateSchema -State $State)) {
    return $false
  }
  if ([int]$State.listenerPid -ne [int]$ProcessMetadata.ProcessId) {
    return $false
  }
  if ((Normalize-FounderRepositoryPath -Path ([string]$State.repositoryPath)) -ne
    (Normalize-FounderRepositoryPath -Path $RepositoryPath)) {
    return $false
  }
  if ([string]$State.requestedHost -ne $ExpectedHost -or [int]$State.requestedPort -ne $ExpectedPort) {
    return $false
  }

  try {
    $actualStart = ConvertTo-FounderUtcDateTime -Value $ProcessMetadata.StartTime
    if (-not (Test-FounderProcessCreationIdentityEqual `
          -Left $State.listenerStartedAt `
          -Right $actualStart)) {
      return $false
    }
  } catch {
    return $false
  }

  if ($null -eq $Ownership) {
    $listenerCommand = Get-FounderCanonicalNextDevCommand `
      -CommandLine $ProcessMetadata.CommandLine `
      -RepositoryPath $RepositoryPath
    $listenerProvesIdentity = $listenerCommand.IsCanonical -and $listenerCommand.ApplicationMatchesTarget
    if ($listenerProvesIdentity) {
      $Ownership = Get-FounderProcessOwnershipFromChain `
        -Chain @($ProcessMetadata) `
        -ProcessId ([int]$ProcessMetadata.ProcessId) `
        -RepositoryPath $RepositoryPath
    } else {
      $Ownership = Get-FounderProcessOwnership -ProcessId $ProcessMetadata.ProcessId -RepositoryPath $RepositoryPath
    }
  }
  if ($null -eq $Ownership -or @($Ownership.Chain).Count -eq 0) {
    return $false
  }
  try {
    if ([int]$Ownership.Chain[0].ProcessId -ne [int]$ProcessMetadata.ProcessId -or
      -not (Test-FounderProcessCreationIdentityEqual `
        -Left $Ownership.Chain[0].StartTime `
        -Right $actualStart) -or
      -not [string]::Equals(
        [string]$Ownership.Chain[0].CommandLine,
        [string]$ProcessMetadata.CommandLine,
        [System.StringComparison]::Ordinal
      )) {
      return $false
    }
  } catch {
    return $false
  }

  $verifiedOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($Ownership.Chain) `
    -ProcessId ([int]$ProcessMetadata.ProcessId) `
    -RepositoryPath $RepositoryPath
  if (-not $verifiedOwnership.Owned -or $null -eq $verifiedOwnership.ProvingProcess) {
    return $false
  }
  if ([int]$State.launcherPid -ne [int]$verifiedOwnership.ProvingProcessId) {
    return $false
  }

  try {
    if (-not (Test-FounderProcessCreationIdentityEqual `
          -Left $State.launcherStartedAt `
          -Right $verifiedOwnership.ProvingProcess.StartTime)) {
      return $false
    }
  } catch {
    return $false
  }

  return $true
}

function Get-FounderSyntheticStatusClassification {
  param(
    [bool]$HasListener,
    [bool]$Owned,
    [bool]$Healthy,
    [bool]$HasState,
    [bool]$StateValid
  )

  if (-not $HasListener) {
    if ($HasState) {
      return 'STALE_STATE'
    }
    return 'STOPPED'
  }
  if (-not $Owned) {
    return 'BLOCKED_UNRELATED_PROCESS'
  }
  if (-not $Healthy) {
    return 'UNHEALTHY_OWNED'
  }
  if ($HasState -and $StateValid) {
    return 'RUNNING_MANAGED'
  }
  return 'RUNNING_OWNED_UNMANAGED'
}

function New-FounderCleanupResult {
  param(
    [switch]$DryRun,
    [object[]]$Stopped = @(),
    [object[]]$WouldStop = @(),
    [object[]]$Failed = @(),
    [object[]]$Unrelated = @(),
    [object[]]$RemainingOwned = @(),
    [object[]]$RemainingUnrelated = @(),
    $ExitCodes = $null
  )

  if ($null -eq $ExitCodes) {
    $ExitCodes = Get-FounderPreviewExitCodes
  }
  $success = $DryRun -or ($Failed.Count -eq 0 -and $RemainingOwned.Count -eq 0)
  return [pscustomobject]@{
    Success = $success
    ExitCode = if ($success) { $ExitCodes.Pass } else { $ExitCodes.TemporaryCleanupFailed }
    Status = if ($DryRun) { 'DRY_RUN_COMPLETE' } elseif ($success) { 'CLEANUP_COMPLETE' } else { 'CLEANUP_FAILED' }
    Stopped = @($Stopped)
    WouldStop = @($WouldStop)
    Failed = @($Failed)
    Unrelated = @($Unrelated)
    RemainingOwned = @($RemainingOwned)
    RemainingUnrelated = @($RemainingUnrelated)
  }
}

function Test-FounderCleanupGate {
  param(
    [Parameter(Mandatory = $true)]
    $CleanupResult
  )

  return [bool]$CleanupResult.Success -and
    @($CleanupResult.Failed).Count -eq 0 -and
    @($CleanupResult.RemainingOwned).Count -eq 0
}

function Get-FounderPreflightCleanupStatus {
  param(
    [Parameter(Mandatory = $true)]
    $CleanupResult
  )

  if (-not (Test-FounderCleanupGate -CleanupResult $CleanupResult)) {
    return 'CLEANUP_FAILED'
  }
  if (@($CleanupResult.RemainingUnrelated).Count -gt 0) {
    return 'READY_WITH_WARNINGS'
  }
  return 'READY'
}

function Get-FounderLegacyStateMigrationDecision {
  param(
    $LegacyState,
    [Parameter(Mandatory = $true)]
    $Config,
    $ProcessMetadata
  )

  if ($null -eq $LegacyState) {
    return 'NO_LEGACY_STATE'
  }
  if (-not (Test-FounderRepositoryPathEqual -Left ([string](Get-FounderPropertyValue -Object $LegacyState -Name 'repositoryPath' -DefaultValue '')) -Right $Config.RepositoryPath)) {
    return 'PRESERVE_DIFFERENT_REPOSITORY'
  }
  if ($null -eq $ProcessMetadata) {
    return 'PRESERVE_INVALID_STATE'
  }
  if (-not (Test-FounderStateProcessIdentity -State $LegacyState -ProcessMetadata $ProcessMetadata -RepositoryPath $Config.RepositoryPath)) {
    return 'PRESERVE_INVALID_STATE'
  }
  return 'MIGRATE_CURRENT_REPOSITORY'
}

function Invoke-FounderHttpRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [int]$TimeoutSeconds = 15
  )

  try {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSeconds -ErrorAction Stop
    return [pscustomobject]@{
      Success = [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 300
      StatusCode = [int]$response.StatusCode
      Content = [string]$response.Content
      Error = ''
    }
  } catch {
    $statusCode = 0
    if ($null -ne $_.Exception.Response -and $null -ne $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }
    return [pscustomobject]@{
      Success = $false
      StatusCode = $statusCode
      Content = ''
      Error = [string]$_.Exception.Message
    }
  }
}

function Wait-FounderRootReady {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [int]$TimeoutSeconds
  )

  if ($TimeoutSeconds -le 0) {
    $TimeoutSeconds = $Config.ReadyTimeoutSeconds
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $listener = @(Get-FounderListeners -Ports @($Config.FounderPort) | Select-Object -First 1)
    if ($listener.Count -gt 0) {
      $http = Invoke-FounderHttpRequest -Uri $Config.Url -TimeoutSeconds 5
      if ($http.Success -and -not [string]::IsNullOrWhiteSpace($http.Content)) {
        return $http
      }
    }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)

  return [pscustomobject]@{
    Success = $false
    StatusCode = 0
    Content = ''
    Error = "Founder Preview did not become ready within $TimeoutSeconds seconds."
  }
}

function Get-FounderLogTail {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [int]$LineCount = 30
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return @()
  }
  return @(Get-Content -LiteralPath $Path -Tail $LineCount -ErrorAction SilentlyContinue)
}

function Resolve-FounderPnpmCommand {
  if (-not [string]::IsNullOrWhiteSpace($env:npm_execpath) -and (Test-Path -LiteralPath $env:npm_execpath)) {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $nodeCommand) {
      $nodeCommand = Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    if ($null -ne $nodeCommand) {
      return [pscustomobject]@{
        FilePath = [string]$nodeCommand.Source
        PrefixArguments = @([string]$env:npm_execpath)
        DisplayName = "$($nodeCommand.Source) $env:npm_execpath"
      }
    }
  }

  $pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $pnpmCommand) {
    $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue | Select-Object -First 1
  }
  if ($null -ne $pnpmCommand) {
    return [pscustomobject]@{
      FilePath = [string]$pnpmCommand.Source
      PrefixArguments = @()
      DisplayName = [string]$pnpmCommand.Source
    }
  }

  $knownCandidates = @()
  if (-not [string]::IsNullOrWhiteSpace($env:PNPM_HOME)) {
    $knownCandidates += (Join-Path $env:PNPM_HOME 'pnpm.cmd')
  }
  if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
    $knownCandidates += (Join-Path $env:LOCALAPPDATA 'pnpm\pnpm.cmd')
  }
  if (-not [string]::IsNullOrWhiteSpace($env:APPDATA)) {
    $knownCandidates += (Join-Path $env:APPDATA 'npm\pnpm.cmd')
  }
  foreach ($candidate in $knownCandidates) {
    if (Test-Path -LiteralPath $candidate) {
      return [pscustomobject]@{
        FilePath = $candidate
        PrefixArguments = @()
        DisplayName = $candidate
      }
    }
  }

  throw 'pnpm could not be resolved from PATH, PNPM_HOME, standard user locations, or npm_execpath.'
}

function Start-FounderBackgroundProcess {
  param(
    [Parameter(Mandatory = $true)]
    $Runtime,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath,
    [Parameter(Mandatory = $true)]
    [string]$HostName,
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [string]$StdoutLogPath,
    [Parameter(Mandatory = $true)]
    [string]$StderrLogPath
  )

  $nextArguments = @()
  if (-not [string]::IsNullOrWhiteSpace([string]$Runtime.EnvironmentFilePath)) {
    $nextArguments += "--env-file=`"$($Runtime.EnvironmentFilePath)`""
  }
  $nextArguments += @(
    "`"$($Runtime.NextCliPath)`"",
    'dev',
    "`"$RepositoryPath`"",
    '--hostname',
    $HostName,
    '--port',
    [string]$Port
  )
  $originalNodePath = $env:NODE_PATH
  try {
    $env:NODE_PATH = $Runtime.DependencyRoot
    return Start-Process `
      -FilePath $Runtime.NodeExecutable `
      -ArgumentList $nextArguments `
      -WorkingDirectory $RepositoryPath `
      -WindowStyle Hidden `
      -RedirectStandardOutput $StdoutLogPath `
      -RedirectStandardError $StderrLogPath `
      -PassThru
  } finally {
    $env:NODE_PATH = $originalNodePath
  }
}

function Invoke-FounderPnpm {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [Parameter(Mandatory = $true)]
    [ref]$ExitCode
  )

  $pnpm = Resolve-FounderPnpmCommand
  $allArguments = @($pnpm.PrefixArguments) + @('--dir', $RepositoryPath) + $Arguments
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $commandOutput = @(& $pnpm.FilePath @allArguments 2>&1)
    $nativeExitCode = [int]$LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  foreach ($line in $commandOutput) {
    Write-Host $line
  }
  $ExitCode.Value = $nativeExitCode
}

function Enter-FounderLifecycleLock {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    [string]$Action,
    [int]$TimeoutSeconds
  )

  Initialize-FounderRuntimeDirectory -Config $Config
  if ($TimeoutSeconds -le 0) {
    $TimeoutSeconds = $Config.LockTimeoutSeconds
  }

  $mutex = New-Object System.Threading.Mutex($false, $Config.MutexName)
  $acquired = $false
  try {
    $acquired = $mutex.WaitOne([timespan]::FromSeconds($TimeoutSeconds))
  } catch [System.Threading.AbandonedMutexException] {
    $acquired = $true
  }

  if (-not $acquired) {
    $mutex.Dispose()
    return $null
  }

  $lockInfo = [ordered]@{
    schemaVersion = 1
    action = $Action
    ownerPid = $PID
    acquiredAt = (Get-Date).ToUniversalTime().ToString('o')
    repositoryPath = $Config.RepositoryPath
    mutexName = $Config.MutexName
  }
  Write-FounderJsonFile -Path $Config.LockInfoPath -Value $lockInfo

  return [pscustomobject]@{
    Mutex = $mutex
    Acquired = $true
  }
}

function Exit-FounderLifecycleLock {
  param(
    $Lock,
    [Parameter(Mandatory = $true)]
    $Config
  )

  Remove-FounderFile -Path $Config.LockInfoPath
  if ($null -eq $Lock) {
    return
  }

  try {
    $Lock.Mutex.ReleaseMutex()
  } catch {
    # The operation result is more important than a redundant release failure.
  } finally {
    $Lock.Mutex.Dispose()
  }
}

function Write-FounderLastOperation {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    [string]$Action,
    [Parameter(Mandatory = $true)]
    [int]$ExitCode,
    [string]$Status,
    $Details = $null
  )

  Initialize-FounderRuntimeDirectory -Config $Config
  $record = [ordered]@{
    schemaVersion = 1
    action = $Action
    exitCode = $ExitCode
    status = $Status
    completedAt = (Get-Date).ToUniversalTime().ToString('o')
    repositoryPath = $Config.RepositoryPath
    details = $Details
  }
  Write-FounderJsonFile -Path $Config.LastOperationPath -Value $record
}

function Convert-FounderStateToCurrentSchema {
  param(
    [Parameter(Mandatory = $true)]
    $State,
    [Parameter(Mandatory = $true)]
    $Config,
    [switch]$MigratedFromLegacy
  )

  return [ordered]@{
    schemaVersion = $Config.SchemaVersion
    repositoryPath = $Config.RepositoryPath
    repositoryRemote = [string](Get-FounderPropertyValue -Object $State -Name 'repositoryRemote' -DefaultValue '')
    branch = [string](Get-FounderPropertyValue -Object $State -Name 'branch' -DefaultValue '')
    commitAtStart = [string](Get-FounderPropertyValue -Object $State -Name 'commitAtStart' -DefaultValue '')
    commitAtAdoption = [string](Get-FounderPropertyValue -Object $State -Name 'commitAtAdoption' -DefaultValue '')
    adoptedAt = [string](Get-FounderPropertyValue -Object $State -Name 'adoptedAt' -DefaultValue '')
    adoptedExistingServer = [bool](Get-FounderPropertyValue -Object $State -Name 'adoptedExistingServer' -DefaultValue $false)
    requestedHost = [string](Get-FounderPropertyValue -Object $State -Name 'requestedHost' -DefaultValue $Config.HostName)
    requestedPort = [int](Get-FounderPropertyValue -Object $State -Name 'requestedPort' -DefaultValue $Config.FounderPort)
    launcherPid = [int](Get-FounderPropertyValue -Object $State -Name 'launcherPid' -DefaultValue 0)
    launcherStartedAt = [string](Get-FounderPropertyValue -Object $State -Name 'launcherStartedAt' -DefaultValue '')
    listenerPid = [int](Get-FounderPropertyValue -Object $State -Name 'listenerPid' -DefaultValue 0)
    listenerStartedAt = [string](Get-FounderPropertyValue -Object $State -Name 'listenerStartedAt' -DefaultValue '')
    startedAt = [string](Get-FounderPropertyValue -Object $State -Name 'startedAt' -DefaultValue '')
    stateRecordedAt = [string](Get-FounderPropertyValue -Object $State -Name 'stateRecordedAt' -DefaultValue (Get-Date).ToUniversalTime().ToString('o'))
    command = [string](Get-FounderPropertyValue -Object $State -Name 'command' -DefaultValue '')
    stdoutLog = [string](Get-FounderPropertyValue -Object $State -Name 'stdoutLog' -DefaultValue $Config.LegacyStdoutLogPath)
    stderrLog = [string](Get-FounderPropertyValue -Object $State -Name 'stderrLog' -DefaultValue $Config.LegacyStderrLogPath)
    nodeOptions = [string](Get-FounderPropertyValue -Object $State -Name 'nodeOptions' -DefaultValue '--use-system-ca')
    migratedFromLegacy = [bool]$MigratedFromLegacy
    migratedAt = if ($MigratedFromLegacy) { (Get-Date).ToUniversalTime().ToString('o') } else { [string](Get-FounderPropertyValue -Object $State -Name 'migratedAt' -DefaultValue '') }
  }
}

function Invoke-FounderLegacyRuntimeMigration {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  Initialize-FounderRuntimeDirectory -Config $Config
  if (Test-Path -LiteralPath $Config.StatePath) {
    $currentState = Read-FounderJsonFile -Path $Config.StatePath
    if ($null -ne $currentState -and
      [bool](Get-FounderPropertyValue -Object $currentState -Name 'migratedFromLegacy' -DefaultValue $false) -and
      [string]::Equals([string](Get-FounderPropertyValue -Object $currentState -Name 'stdoutLog' -DefaultValue ''), $Config.LegacyStdoutLogPath, [System.StringComparison]::OrdinalIgnoreCase) -and
      -not (Test-Path -LiteralPath $Config.LegacyMigrationMarkerPath)) {
      Write-FounderJsonFile -Path $Config.LegacyMigrationMarkerPath -Value ([ordered]@{
          schemaVersion = 1
          repositoryPath = $Config.RepositoryPath
          migratedAt = (Get-Date).ToUniversalTime().ToString('o')
          legacyStdoutLog = $Config.LegacyStdoutLogPath
          legacyStderrLog = $Config.LegacyStderrLogPath
        })
    }
    return [pscustomobject]@{ Status = 'CURRENT_STATE_PRESENT'; Migrated = $false }
  }

  $legacyState = Read-FounderJsonFile -Path $Config.LegacyStatePath
  if ($null -eq $legacyState) {
    return [pscustomobject]@{ Status = 'NO_LEGACY_STATE'; Migrated = $false }
  }

  $listenerPid = [int](Get-FounderPropertyValue -Object $legacyState -Name 'listenerPid' -DefaultValue 0)
  $processMetadata = if ($listenerPid -gt 0) { Get-FounderProcessMetadata -ProcessId $listenerPid } else { $null }
  $decision = Get-FounderLegacyStateMigrationDecision -LegacyState $legacyState -Config $Config -ProcessMetadata $processMetadata
  if ($decision -ne 'MIGRATE_CURRENT_REPOSITORY') {
    return [pscustomobject]@{ Status = $decision; Migrated = $false }
  }

  $migratedState = Convert-FounderStateToCurrentSchema -State $legacyState -Config $Config -MigratedFromLegacy
  Write-FounderJsonFile -Path $Config.StatePath -Value $migratedState
  $savedState = Read-FounderJsonFile -Path $Config.StatePath
  if ($null -eq $savedState -or -not (Test-FounderStateProcessIdentity -State $savedState -ProcessMetadata $processMetadata -RepositoryPath $Config.RepositoryPath)) {
    Remove-FounderFile -Path $Config.StatePath
    return [pscustomobject]@{ Status = 'MIGRATION_VALIDATION_FAILED'; Migrated = $false }
  }
  Write-FounderJsonFile -Path $Config.LegacyMigrationMarkerPath -Value ([ordered]@{
      schemaVersion = 1
      repositoryPath = $Config.RepositoryPath
      migratedAt = (Get-Date).ToUniversalTime().ToString('o')
      legacyStdoutLog = $Config.LegacyStdoutLogPath
      legacyStderrLog = $Config.LegacyStderrLogPath
    })

  $legacyOperation = Read-FounderJsonFile -Path $Config.LegacyLastOperationPath
  if ($null -ne $legacyOperation -and
    (Test-FounderRepositoryPathEqual -Left ([string](Get-FounderPropertyValue -Object $legacyOperation -Name 'repositoryPath' -DefaultValue '')) -Right $Config.RepositoryPath)) {
    Write-FounderJsonFile -Path $Config.LastOperationPath -Value $legacyOperation
    Remove-FounderFile -Path $Config.LegacyLastOperationPath
  }
  Remove-FounderFile -Path $Config.LegacyStatePath

  return [pscustomobject]@{
    Status = 'MIGRATED_CURRENT_REPOSITORY'
    Migrated = $true
    StatePath = $Config.StatePath
  }
}

function Complete-FounderLegacyRuntimeMigration {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    $State
  )

  if (-not (Test-Path -LiteralPath $Config.LegacyMigrationMarkerPath)) {
    return
  }
  if (-not (Test-FounderRepositoryPathEqual -Left ([string](Get-FounderPropertyValue -Object $State -Name 'repositoryPath' -DefaultValue '')) -Right $Config.RepositoryPath)) {
    return
  }
  if (-not [string]::Equals([string](Get-FounderPropertyValue -Object $State -Name 'stdoutLog' -DefaultValue ''), $Config.StdoutLogPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return
  }

  Remove-FounderFile -Path $Config.LegacyStdoutLogPath
  Remove-FounderFile -Path $Config.LegacyStderrLogPath
  if (-not (Test-Path -LiteralPath $Config.LegacyStdoutLogPath) -and
    -not (Test-Path -LiteralPath $Config.LegacyStderrLogPath)) {
    Remove-FounderFile -Path $Config.LegacyMigrationMarkerPath
  }
}

function Get-FounderPreviewState {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  Invoke-FounderLegacyRuntimeMigration -Config $Config | Out-Null
  return Read-FounderJsonFile -Path $Config.StatePath
}

function Save-FounderPreviewState {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    $State
  )

  Write-FounderJsonFile -Path $Config.StatePath -Value $State
}

function Remove-FounderPreviewState {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  Remove-FounderFile -Path $Config.StatePath
}

function Get-FounderLauncherFromChain {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$Chain,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  if ($Chain.Count -eq 0) {
    return $null
  }
  $ownership = Get-FounderProcessOwnershipFromChain `
    -Chain $Chain `
    -ProcessId ([int]$Chain[0].ProcessId) `
    -RepositoryPath $RepositoryPath
  return $ownership.ProvingProcess
}

function Get-FounderPreviewStatus {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $state = Get-FounderPreviewState -Config $Config
  $listeners = @(Get-FounderListeners -Ports @($Config.FounderPort))
  $listener = $null
  $bindingValid = $false
  if ($listeners.Count -gt 0) {
    $listener = $listeners | Where-Object { $_.LocalAddress -eq $Config.HostName } | Select-Object -First 1
    if ($null -eq $listener) {
      $listener = $listeners | Select-Object -First 1
    } else {
      $bindingValid = $true
    }
  }

  $ownership = $null
  $processMetadata = $null
  $stateValid = $false
  $healthy = $false
  $rootHttpStatus = 0
  $rootError = ''
  $launcherPid = 0
  $managed = $false

  if ($null -ne $listener) {
    $processMetadata = Get-FounderProcessMetadata -ProcessId $listener.OwningProcess
    $ownership = Get-FounderProcessOwnership -ProcessId $listener.OwningProcess -RepositoryPath $Config.RepositoryPath
    $http = Invoke-FounderHttpRequest -Uri $Config.Url -TimeoutSeconds 5
    $healthy = $http.Success -and -not [string]::IsNullOrWhiteSpace($http.Content)
    $rootHttpStatus = $http.StatusCode
    $rootError = $http.Error

    if ($null -ne $state -and $null -ne $processMetadata) {
      $stateValid = Test-FounderStateProcessIdentity `
        -State $state `
        -ProcessMetadata $processMetadata `
        -RepositoryPath $Config.RepositoryPath `
        -Ownership $ownership `
        -ExpectedHost $Config.HostName `
        -ExpectedPort $Config.FounderPort
      $managed = $stateValid
      if ($managed) {
        $launcherPid = [int](Get-FounderPropertyValue -Object $state -Name 'launcherPid' -DefaultValue 0)
      }
    }
    if (-not $managed -and $null -ne $ownership -and $ownership.Owned) {
      if ($null -ne $ownership.ProvingProcess) {
        $launcherPid = [int]$ownership.ProvingProcessId
      }
    }
  }

  $classification = Get-FounderSyntheticStatusClassification `
    -HasListener ($null -ne $listener) `
    -Owned ($null -ne $ownership -and $ownership.Owned) `
    -Healthy $healthy `
    -HasState ($null -ne $state) `
    -StateValid $stateValid
  if ($null -ne $listener -and -not $bindingValid) {
    $classification = 'PORT_CONFLICT'
  }

  $temporaryListeners = @()
  foreach ($temporaryListener in @(Get-FounderListeners -Ports ($Config.TemporaryPortMinimum..$Config.LegacyCleanupPortMaximum))) {
    $temporaryOwnership = Get-FounderProcessOwnership -ProcessId $temporaryListener.OwningProcess -RepositoryPath $Config.RepositoryPath
    $temporaryProcess = Get-FounderProcessMetadata -ProcessId $temporaryListener.OwningProcess
    $temporaryListeners += [pscustomobject]@{
      Port = $temporaryListener.LocalPort
      LocalAddress = $temporaryListener.LocalAddress
      ProcessId = $temporaryListener.OwningProcess
      Name = if ($null -ne $temporaryProcess) { $temporaryProcess.Name } else { '' }
      CommandLine = if ($null -ne $temporaryProcess) { $temporaryProcess.CommandLine } else { '' }
      Owned = $temporaryOwnership.Owned
      OwnershipReason = $temporaryOwnership.Reason
    }
  }

  $git = Get-FounderGitInfo -RepositoryPath $Config.RepositoryPath
  $startedAt = ''
  $uptime = ''
  $commitAtStart = ''
  $commitAtAdoption = ''
  $adoptedAt = ''
  $adoptedExistingServer = $false
  $stdoutLog = $Config.StdoutLogPath
  $stderrLog = $Config.StderrLogPath
  if ($null -ne $state) {
    $startedAt = [string](Get-FounderPropertyValue -Object $state -Name 'startedAt' -DefaultValue '')
    $commitAtStart = [string](Get-FounderPropertyValue -Object $state -Name 'commitAtStart' -DefaultValue '')
    $commitAtAdoption = [string](Get-FounderPropertyValue -Object $state -Name 'commitAtAdoption' -DefaultValue '')
    $adoptedAt = [string](Get-FounderPropertyValue -Object $state -Name 'adoptedAt' -DefaultValue '')
    $adoptedExistingServer = [bool](Get-FounderPropertyValue -Object $state -Name 'adoptedExistingServer' -DefaultValue $false)
    $stdoutLog = [string](Get-FounderPropertyValue -Object $state -Name 'stdoutLog' -DefaultValue $Config.StdoutLogPath)
    $stderrLog = [string](Get-FounderPropertyValue -Object $state -Name 'stderrLog' -DefaultValue $Config.StderrLogPath)
  }
  if (-not [string]::IsNullOrWhiteSpace($startedAt)) {
    try {
      $started = [datetime]::Parse($startedAt).ToUniversalTime()
      $uptimeSpan = (Get-Date).ToUniversalTime() - $started
      $uptime = '{0:dd\.hh\:mm\:ss}' -f $uptimeSpan
    } catch {
      $uptime = ''
    }
  } elseif ($null -ne $processMetadata -and -not [string]::IsNullOrWhiteSpace($processMetadata.StartTime)) {
    try {
      $started = [datetime]::Parse($processMetadata.StartTime).ToUniversalTime()
      $uptimeSpan = (Get-Date).ToUniversalTime() - $started
      $uptime = '{0:dd\.hh\:mm\:ss}' -f $uptimeSpan
    } catch {
      $uptime = ''
    }
  }

  return [pscustomobject]@{
    Status = $classification
    Url = $Config.Url
    Port = $Config.FounderPort
    ListenerPid = if ($null -ne $listener) { [int]$listener.OwningProcess } else { 0 }
    LauncherPid = $launcherPid
    ProcessName = if ($null -ne $processMetadata) { $processMetadata.Name } else { '' }
    CommandLine = if ($null -ne $processMetadata) { $processMetadata.CommandLine } else { '' }
    Owned = $null -ne $ownership -and $ownership.Owned
    OwnershipReason = if ($null -ne $ownership) { $ownership.Reason } else { 'no-listener' }
    ProvingProcessId = if ($null -ne $ownership) { [int]$ownership.ProvingProcessId } else { 0 }
    Managed = $managed
    StateValid = $stateValid
    BindingValid = $bindingValid
    RootHttpStatus = $rootHttpStatus
    RootError = $rootError
    CurrentBranch = $git.Branch
    CurrentCommit = $git.Commit
    CommitAtStart = $commitAtStart
    CommitAtAdoption = $commitAtAdoption
    AdoptedAt = $adoptedAt
    AdoptedExistingServer = $adoptedExistingServer
    StartedAt = $startedAt
    Uptime = $uptime
    StdoutLog = $stdoutLog
    StderrLog = $stderrLog
    TemporaryListeners = $temporaryListeners
    State = $state
    Ownership = $ownership
  }
}

function Write-FounderStatus {
  param(
    [Parameter(Mandatory = $true)]
    $Status
  )

  Write-Host "Status: $($Status.Status)"
  Write-Host "URL: $($Status.Url)"
  Write-Host "Listener PID: $($Status.ListenerPid)"
  Write-Host "Launcher PID: $($Status.LauncherPid)"
  Write-Host "Process: $($Status.ProcessName)"
  Write-Host "Owned: $($Status.Owned) ($($Status.OwnershipReason))"
  Write-Host "Managed: $($Status.Managed)"
  Write-Host "Binding Valid: $($Status.BindingValid)"
  Write-Host "Root HTTP: $($Status.RootHttpStatus)"
  Write-Host "Git: $($Status.CurrentBranch) $($Status.CurrentCommit)"
  Write-Host "Commit at start: $($Status.CommitAtStart)"
  Write-Host "Adopted existing server: $($Status.AdoptedExistingServer)"
  Write-Host "Commit at adoption: $($Status.CommitAtAdoption)"
  Write-Host "Uptime: $($Status.Uptime)"
  Write-Host "stdout: $($Status.StdoutLog)"
  Write-Host "stderr: $($Status.StderrLog)"
  if (-not [string]::IsNullOrWhiteSpace($Status.CommandLine)) {
    Write-Host "Command: $($Status.CommandLine)"
  }
  if ($Status.TemporaryListeners.Count -eq 0) {
    Write-Host 'MyOTT temporary listeners (3001-3101): none'
  } else {
    Write-Host 'Listeners (3001-3101):'
    foreach ($listener in $Status.TemporaryListeners) {
      Write-Host "  $($listener.Port) PID $($listener.ProcessId) owned=$($listener.Owned) $($listener.CommandLine)"
    }
  }
}

function New-FounderStateFromListener {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    $Listener,
    [Parameter(Mandatory = $true)]
    $Ownership,
    [int]$LauncherPid,
    [string]$Command,
    [switch]$AdoptedExistingServer,
    $Runtime = $null
  )

  $listenerMetadata = Get-FounderProcessMetadata -ProcessId $Listener.OwningProcess
  if ($null -eq $listenerMetadata) {
    throw 'Listener process metadata disappeared before state could be recorded.'
  }
  $verifiedOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($Ownership.Chain) `
    -ProcessId ([int]$Listener.OwningProcess) `
    -RepositoryPath $Config.RepositoryPath
  if (-not $verifiedOwnership.Owned -or $null -eq $verifiedOwnership.ProvingProcess) {
    throw 'A single proving launcher and listener ancestry could not be verified.'
  }
  if ($LauncherPid -gt 0 -and $LauncherPid -ne [int]$verifiedOwnership.ProvingProcessId) {
    throw 'The requested launcher PID does not match the proving launcher.'
  }
  $LauncherPid = [int]$verifiedOwnership.ProvingProcessId
  $launcherMetadata = $verifiedOwnership.ProvingProcess
  $git = Get-FounderGitInfo -RepositoryPath $Config.RepositoryPath

  return New-FounderStateRecord `
    -Config $Config `
    -ListenerMetadata $listenerMetadata `
    -LauncherMetadata $launcherMetadata `
    -LauncherPid $LauncherPid `
    -Command $Command `
    -GitInfo $git `
    -Runtime $Runtime `
    -AdoptedExistingServer:$AdoptedExistingServer
}

function New-FounderStateRecord {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    $ListenerMetadata,
    $LauncherMetadata,
    [Parameter(Mandatory = $true)]
    [int]$LauncherPid,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    $GitInfo,
    $Runtime = $null,
    [switch]$AdoptedExistingServer
  )

  $recordedAt = (Get-Date).ToUniversalTime().ToString('o')
  return [ordered]@{
    schemaVersion = $Config.SchemaVersion
    repositoryPath = $Config.RepositoryPath
    repositoryRemote = $GitInfo.Remote
    branch = $GitInfo.Branch
    commitAtStart = if ($AdoptedExistingServer) { '' } else { $GitInfo.Commit }
    commitAtAdoption = if ($AdoptedExistingServer) { $GitInfo.Commit } else { '' }
    adoptedAt = if ($AdoptedExistingServer) { $recordedAt } else { '' }
    adoptedExistingServer = [bool]$AdoptedExistingServer
    requestedHost = $Config.HostName
    requestedPort = $Config.FounderPort
    launcherPid = $LauncherPid
    launcherStartedAt = if ($null -ne $LauncherMetadata) { $LauncherMetadata.StartTime } else { '' }
    listenerPid = [int]$ListenerMetadata.ProcessId
    listenerStartedAt = $ListenerMetadata.StartTime
    startedAt = $ListenerMetadata.StartTime
    stateRecordedAt = $recordedAt
    command = $Command
    stdoutLog = $Config.StdoutLogPath
    stderrLog = $Config.StderrLogPath
    nodeOptions = '--use-system-ca'
    dependencySourceClassification = if ($null -ne $Runtime) { [string]$Runtime.DependencySourceClassification } else { '' }
    dependencySourceRepository = if ($null -ne $Runtime) { [string]$Runtime.DependencySourceRepository } else { '' }
    environmentSourceClassification = if ($null -ne $Runtime) { [string]$Runtime.EnvironmentSourceClassification } else { '' }
    dependencyCompatibility = if ($null -ne $Runtime) { $Runtime.DependencyCompatibility } else { $null }
    migratedFromLegacy = $false
    migratedAt = ''
  }
}

function Invoke-FounderPinnedProcessTermination {
  param(
    [Parameter(Mandatory = $true)]
    $ExpectedMetadata,
    [AllowNull()]
    $Lease
  )

  $processId = [int](Get-FounderPropertyValue -Object $ExpectedMetadata -Name 'ProcessId' -DefaultValue 0)
  if ($processId -le 0 -or $null -eq $Lease) {
    return [pscustomobject]@{ Status = 'HANDLE_ACQUISITION_FAILED'; ProcessId = $processId }
  }

  $status = 'TERMINATION_FAILED'
  try {
    $nativeMetadata = $Lease.Metadata
    $observedMetadata = [pscustomobject]@{
      ProcessId = [int]$nativeMetadata.ProcessId
      ParentProcessId = [int]$nativeMetadata.ParentProcessId
      Name = ''
      ExecutablePath = [string]$nativeMetadata.ExecutablePath
      CommandLine = [string]$nativeMetadata.CommandLine
      StartTime = (ConvertTo-FounderUtcDateTime -Value $nativeMetadata.CreationTimeUtc).ToString('o')
      MetadataSources = @('PINNED_NATIVE_HANDLE')
    }
    if (-not (Test-FounderProcessMetadataIdentity -Expected $ExpectedMetadata -Observed $observedMetadata)) {
      $status = 'IDENTITY_MISMATCH'
    } else {
      $nativeResult = [string]$Lease.TerminateIfRunning([uint32]1)
      $status = switch ($nativeResult) {
        'TERMINATED' { 'TERMINATION_REQUESTED' }
        'ALREADY_EXITED' { 'ALREADY_EXITED' }
        default { 'TERMINATION_FAILED' }
      }
    }
  } catch {
    $status = 'TERMINATION_FAILED'
  } finally {
    try {
      $Lease.Dispose()
    } catch {
      $status = 'HANDLE_CLEANUP_FAILED'
    }
  }

  return [pscustomobject]@{ Status = $status; ProcessId = $processId }
}

function Stop-FounderProcessIfIdentityMatches {
  param(
    [Parameter(Mandatory = $true)]
    $ExpectedMetadata
  )

  $processId = [int](Get-FounderPropertyValue -Object $ExpectedMetadata -Name 'ProcessId' -DefaultValue 0)
  if ($processId -le 0 -or -not (Initialize-FounderNativeProcessQuery)) {
    return [pscustomobject]@{ Status = 'HANDLE_ACQUISITION_FAILED'; ProcessId = $processId }
  }
  try {
    $lease = [MyOttFounderPreviewProcessQuery]::AcquireTerminationLease($processId)
  } catch {
    return [pscustomobject]@{ Status = 'HANDLE_ACQUISITION_FAILED'; ProcessId = $processId }
  }
  return Invoke-FounderPinnedProcessTermination -ExpectedMetadata $ExpectedMetadata -Lease $lease
}

function Stop-FounderOwnedProcessTree {
  param(
    [Parameter(Mandatory = $true)]
    [int]$RootProcessId,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $ownership = Get-FounderProcessOwnership -ProcessId $RootProcessId -RepositoryPath $RepositoryPath
  if (-not $ownership.Owned) {
    return [pscustomobject]@{
      Success = $false
      Reason = "Ownership could not be proven for PID ${RootProcessId}: $($ownership.Reason)"
      StoppedProcessIds = @()
    }
  }

  $targets = @()
  $targetProcessIds = @{}
  foreach ($descendant in @(Get-FounderProcessDescendants -ProcessId $RootProcessId | Sort-Object Depth -Descending)) {
    $descendantOwnership = Get-FounderProcessOwnership -ProcessId $descendant.Metadata.ProcessId -RepositoryPath $RepositoryPath
    $descendantProcessId = [int]$descendant.Metadata.ProcessId
    if ($descendantOwnership.Owned -and -not $targetProcessIds.ContainsKey($descendantProcessId)) {
      $targets += [pscustomobject]@{
        ProcessId = $descendantProcessId
        Metadata = $descendantOwnership.Process
      }
      $targetProcessIds[$descendantProcessId] = $true
    }
  }
  if (-not $targetProcessIds.ContainsKey($RootProcessId)) {
    $targets += [pscustomobject]@{
      ProcessId = $RootProcessId
      Metadata = $ownership.Process
    }
    $targetProcessIds[$RootProcessId] = $true
  }

  $identityFailures = @()
  $terminationFailures = @()
  foreach ($target in $targets) {
    $stopResult = Stop-FounderProcessIfIdentityMatches -ExpectedMetadata $target.Metadata
    if ($stopResult.Status -eq 'IDENTITY_MISMATCH') {
      $identityFailures += [int]$target.ProcessId
    } elseif ($stopResult.Status -in @(
        'HANDLE_ACQUISITION_FAILED',
        'TERMINATION_FAILED',
        'HANDLE_CLEANUP_FAILED'
      )) {
      $terminationFailures += [int]$target.ProcessId
    }
  }
  Start-Sleep -Milliseconds 750

  $remaining = @()
  $stopped = @()
  foreach ($target in $targets) {
    $observed = Get-FounderProcessMetadata -ProcessId $target.ProcessId
    if ($null -eq $observed) {
      $stopped += [int]$target.ProcessId
    } elseif (Test-FounderProcessMetadataIdentity -Expected $target.Metadata -Observed $observed) {
      $remaining += [int]$target.ProcessId
    } else {
      $identityFailures += [int]$target.ProcessId
    }
  }
  $identityFailures = @($identityFailures | Select-Object -Unique)
  $terminationFailures = @($terminationFailures | Select-Object -Unique)
  $success = $remaining.Count -eq 0 -and
    $identityFailures.Count -eq 0 -and
    $terminationFailures.Count -eq 0
  $reason = if ($identityFailures.Count -gt 0) {
    "Process identity changed before stop: $($identityFailures -join ', ')"
  } elseif ($terminationFailures.Count -gt 0) {
    "Pinned process termination failed: $($terminationFailures -join ', ')"
  } elseif ($remaining.Count -gt 0) {
    "Processes still running: $($remaining -join ', ')"
  } else {
    'owned-process-tree-stopped'
  }
  return [pscustomobject]@{
    Success = $success
    Reason = $reason
    StoppedProcessIds = @($stopped)
  }
}

function Stop-FounderPreview {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $status = Get-FounderPreviewStatus -Config $Config
  if ($status.Status -eq 'STOPPED') {
    Remove-FounderPreviewState -Config $Config
    return [pscustomobject]@{ Success = $true; ExitCode = $Config.ExitCodes.Pass; Status = 'ALREADY_STOPPED'; Details = $status }
  }
  if ($status.Status -eq 'STALE_STATE') {
    Remove-FounderPreviewState -Config $Config
    return [pscustomobject]@{ Success = $true; ExitCode = $Config.ExitCodes.Pass; Status = 'STALE_STATE_CLEARED'; Details = $status }
  }
  if (-not $status.Owned) {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.PortConflict; Status = 'BLOCKED_UNRELATED_PROCESS'; Details = $status }
  }

  $rootProcessId = $status.ListenerPid
  if ($status.LauncherPid -gt 0) {
    $launcherOwnership = Get-FounderProcessOwnership -ProcessId $status.LauncherPid -RepositoryPath $Config.RepositoryPath
    if ($launcherOwnership.Owned) {
      $rootProcessId = $status.LauncherPid
    }
  }

  $stopped = Stop-FounderOwnedProcessTree -RootProcessId $rootProcessId -RepositoryPath $Config.RepositoryPath
  $deadline = (Get-Date).AddSeconds(10)
  do {
    $listener = @(Get-FounderListeners -Ports @($Config.FounderPort))
    if ($listener.Count -eq 0) {
      break
    }
    Start-Sleep -Milliseconds 250
  } while ((Get-Date) -lt $deadline)

  $remainingListeners = @(Get-FounderListeners -Ports @($Config.FounderPort))
  if ($stopped.Success -and $remainingListeners.Count -eq 0) {
    Remove-FounderPreviewState -Config $Config
    return [pscustomobject]@{ Success = $true; ExitCode = $Config.ExitCodes.Pass; Status = 'STOPPED'; Details = $stopped }
  }

  return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.GeneralFailure; Status = 'STOP_FAILED'; Details = $stopped }
}

function Start-FounderPreview {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  Initialize-FounderRuntimeDirectory -Config $Config
  $status = Get-FounderPreviewStatus -Config $Config
  if ($status.Status -eq 'RUNNING_MANAGED') {
    return [pscustomobject]@{ Success = $true; ExitCode = $Config.ExitCodes.Pass; Status = 'ALREADY_RUNNING'; Details = $status }
  }
  if ($status.Status -eq 'RUNNING_OWNED_UNMANAGED') {
    $listener = Get-FounderListeners -Ports @($Config.FounderPort) | Select-Object -First 1
    $state = New-FounderStateFromListener `
      -Config $Config `
      -Listener $listener `
      -Ownership $status.Ownership `
      -LauncherPid $status.LauncherPid `
      -Command $status.CommandLine `
      -AdoptedExistingServer
    Save-FounderPreviewState -Config $Config -State $state
    $adoptedStatus = Get-FounderPreviewStatus -Config $Config
    if ($adoptedStatus.Status -eq 'RUNNING_MANAGED') {
      return [pscustomobject]@{ Success = $true; ExitCode = $Config.ExitCodes.Pass; Status = 'ADOPTED_RUNNING_SERVER'; Details = $adoptedStatus }
    }
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.OwnershipUnknown; Status = 'ADOPTION_FAILED'; Details = $adoptedStatus }
  }
  if ($status.Status -eq 'UNHEALTHY_OWNED') {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.Unhealthy; Status = 'OWNED_SERVER_UNHEALTHY_USE_RESTART'; Details = $status }
  }
  if ($status.Status -eq 'BLOCKED_UNRELATED_PROCESS') {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.PortConflict; Status = 'BLOCKED_UNRELATED_PROCESS'; Details = $status }
  }
  if ($status.Status -eq 'STALE_STATE') {
    Remove-FounderPreviewState -Config $Config
  }

  $portListeners = @(Get-FounderListeners -Ports @($Config.FounderPort))
  if ($portListeners.Count -gt 0) {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.PortConflict; Status = 'PORT_CONFLICT'; Details = $portListeners }
  }

  Remove-FounderFile -Path $Config.StdoutLogPath
  Remove-FounderFile -Path $Config.StderrLogPath
  Remove-FounderPreviewState -Config $Config

  try {
    $runtime = Resolve-FounderRuntime -RepositoryPath $Config.RepositoryPath
  } catch {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.GeneralFailure
      Status = 'RUNTIME_RESOLUTION_FAILED'
      Details = $_.Exception.Message
    }
  }
  $displayCommand = "$($runtime.NodeExecutable) `"$($runtime.NextCliPath)`" dev `"$($Config.RepositoryPath)`" --hostname $($Config.HostName) --port $($Config.FounderPort)"
  $originalNodeOptions = $env:NODE_OPTIONS
  $launcher = $null
  try {
    $env:NODE_OPTIONS = Merge-FounderNodeOptions -CurrentValue $originalNodeOptions
    $launcher = Start-FounderBackgroundProcess `
      -Runtime $runtime `
      -RepositoryPath $Config.RepositoryPath `
      -HostName $Config.HostName `
      -Port $Config.FounderPort `
      -StdoutLogPath $Config.StdoutLogPath `
      -StderrLogPath $Config.StderrLogPath
  } catch {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.GeneralFailure
      Status = 'START_PROCESS_FAILED'
      Details = $_.Exception.Message
    }
  } finally {
    $env:NODE_OPTIONS = $originalNodeOptions
  }

  $ready = Wait-FounderRootReady -Config $Config -TimeoutSeconds $Config.ReadyTimeoutSeconds
  if (-not $ready.Success) {
    $failedListener = Get-FounderListeners -Ports @($Config.FounderPort) | Select-Object -First 1
    if ($null -ne $failedListener) {
      $failedOwnership = Get-FounderProcessOwnership -ProcessId $failedListener.OwningProcess -RepositoryPath $Config.RepositoryPath
      if ($failedOwnership.Owned) {
        Stop-FounderOwnedProcessTree -RootProcessId $failedListener.OwningProcess -RepositoryPath $Config.RepositoryPath | Out-Null
      }
    } elseif ($null -ne $launcher) {
      $launcherOwnership = Get-FounderProcessOwnership -ProcessId $launcher.Id -RepositoryPath $Config.RepositoryPath
      if ($launcherOwnership.Owned) {
        Stop-FounderOwnedProcessTree -RootProcessId $launcher.Id -RepositoryPath $Config.RepositoryPath | Out-Null
      } else {
        $launcherNativeMetadata = Get-FounderNativeProcessMetadata -ProcessId $launcher.Id
        $launcherMetadata = Merge-FounderProcessMetadataSources `
          -ExpectedProcessId $launcher.Id `
          -CimProcess $null `
          -RuntimeProcess $launcher `
          -NativeProcess $launcherNativeMetadata
        if ($null -ne $launcherMetadata) {
          Stop-FounderProcessIfIdentityMatches -ExpectedMetadata $launcherMetadata | Out-Null
        }
      }
    }
    Remove-FounderPreviewState -Config $Config
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.Unhealthy
      Status = 'READY_TIMEOUT'
      Details = [pscustomobject]@{
        Error = $ready.Error
        StdoutTail = Get-FounderLogTail -Path $Config.StdoutLogPath
        StderrTail = Get-FounderLogTail -Path $Config.StderrLogPath
      }
    }
  }

  $listener = Get-FounderListeners -Ports @($Config.FounderPort) | Select-Object -First 1
  if ($null -eq $listener) {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.Unhealthy; Status = 'LISTENER_MISSING_AFTER_READY'; Details = $null }
  }
  $ownership = Get-FounderProcessOwnership -ProcessId $listener.OwningProcess -RepositoryPath $Config.RepositoryPath
  if (-not $ownership.Owned) {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.OwnershipUnknown; Status = 'STARTED_PROCESS_OWNERSHIP_UNPROVEN'; Details = $ownership }
  }

  $state = New-FounderStateFromListener `
    -Config $Config `
    -Listener $listener `
    -Ownership $ownership `
    -LauncherPid ([int]$ownership.ProvingProcessId) `
    -Command $displayCommand `
    -Runtime $runtime
  Save-FounderPreviewState -Config $Config -State $state
  $finalStatus = Get-FounderPreviewStatus -Config $Config
  if ($finalStatus.Status -ne 'RUNNING_MANAGED') {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.Unhealthy; Status = 'STARTED_BUT_NOT_MANAGED'; Details = $finalStatus }
  }
  Complete-FounderLegacyRuntimeMigration -Config $Config -State $finalStatus.State

  return [pscustomobject]@{ Success = $true; ExitCode = $Config.ExitCodes.Pass; Status = 'STARTED'; Details = $finalStatus }
}

function Restart-FounderPreview {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $status = Get-FounderPreviewStatus -Config $Config
  if ($status.Status -eq 'BLOCKED_UNRELATED_PROCESS') {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.PortConflict; Status = 'BLOCKED_UNRELATED_PROCESS'; Details = $status }
  }
  if ($status.Status -ne 'STOPPED' -and $status.Status -ne 'STALE_STATE') {
    $stopResult = Stop-FounderPreview -Config $Config
    if (-not $stopResult.Success) {
      return $stopResult
    }
  } elseif ($status.Status -eq 'STALE_STATE') {
    Remove-FounderPreviewState -Config $Config
  }

  return Start-FounderPreview -Config $Config
}

function Ensure-FounderPreview {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $status = Get-FounderPreviewStatus -Config $Config
  switch ($status.Status) {
    'RUNNING_MANAGED' {
      return [pscustomobject]@{ Success = $true; ExitCode = $Config.ExitCodes.Pass; Status = 'READY'; Details = $status }
    }
    'RUNNING_OWNED_UNMANAGED' {
      return Start-FounderPreview -Config $Config
    }
    'STOPPED' {
      return Start-FounderPreview -Config $Config
    }
    'STALE_STATE' {
      Remove-FounderPreviewState -Config $Config
      return Start-FounderPreview -Config $Config
    }
    'UNHEALTHY_OWNED' {
      return Restart-FounderPreview -Config $Config
    }
    'BLOCKED_UNRELATED_PROCESS' {
      return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.PortConflict; Status = 'BLOCKED_UNRELATED_PROCESS'; Details = $status }
    }
    'PORT_CONFLICT' {
      if ($status.Owned) {
        return Restart-FounderPreview -Config $Config
      }
      return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.PortConflict; Status = 'PORT_CONFLICT'; Details = $status }
    }
    default {
      return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.GeneralFailure; Status = 'UNKNOWN_STATUS'; Details = $status }
    }
  }
}

function Get-FounderTemporaryListenerSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $owned = @()
  $unrelated = @()
  foreach ($listener in @(Get-FounderListeners -Ports ($Config.TemporaryPortMinimum..$Config.LegacyCleanupPortMaximum))) {
    $ownership = Get-FounderProcessOwnership -ProcessId $listener.OwningProcess -RepositoryPath $Config.RepositoryPath
    $process = Get-FounderProcessMetadata -ProcessId $listener.OwningProcess
    $entry = [pscustomobject]@{
      Port = [int]$listener.LocalPort
      LocalAddress = [string]$listener.LocalAddress
      ProcessId = [int]$listener.OwningProcess
      Name = if ($null -ne $process) { $process.Name } else { '' }
      CommandLine = if ($null -ne $process) { $process.CommandLine } else { '' }
      Owned = [bool]$ownership.Owned
      OwnershipReason = $ownership.Reason
      OwnershipUnknown = $ownership.Reason -eq 'process-metadata-unavailable'
    }
    if ($ownership.Owned) {
      $owned += $entry
    } else {
      $unrelated += $entry
    }
  }

  return [pscustomobject]@{
    Owned = $owned
    Unrelated = $unrelated
  }
}

function Cleanup-FounderTemporaryServers {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [switch]$DryRun
  )

  $stopped = @()
  $wouldStop = @()
  $failed = @()
  $unrelated = @()
  $visited = @{}
  $initialSnapshot = Get-FounderTemporaryListenerSnapshot -Config $Config
  $unrelated = @($initialSnapshot.Unrelated)
  foreach ($entry in @($initialSnapshot.Owned)) {
    if ($visited.ContainsKey([int]$entry.ProcessId)) {
      continue
    }
    $visited[[int]$entry.ProcessId] = $true
    if ($DryRun) {
      $wouldStop += $entry
      continue
    }

    $ownership = Get-FounderProcessOwnership -ProcessId $entry.ProcessId -RepositoryPath $Config.RepositoryPath
    if (-not $ownership.Owned) {
      $failed += [pscustomobject]@{
        Port = $entry.Port
        ProcessId = $entry.ProcessId
        Name = $entry.Name
        CommandLine = $entry.CommandLine
        Reason = "ownership-became-unstable: $($ownership.Reason)"
      }
      continue
    }

    $rootProcessId = [int]$entry.ProcessId
    $launcher = $ownership.ProvingProcess
    if ($null -ne $launcher) {
      $launcherOwnership = Get-FounderProcessOwnership -ProcessId $launcher.ProcessId -RepositoryPath $Config.RepositoryPath
      if ($launcherOwnership.Owned) {
        $rootProcessId = [int]$launcher.ProcessId
      }
    }
    $stopResult = Stop-FounderOwnedProcessTree -RootProcessId $rootProcessId -RepositoryPath $Config.RepositoryPath
    if ($stopResult.Success) {
      $stopped += $entry
    } else {
      $failed += [pscustomobject]@{
        Port = $entry.Port
        ProcessId = $entry.ProcessId
        Name = $entry.Name
        CommandLine = $entry.CommandLine
        Reason = $stopResult.Reason
      }
    }
  }

  $remainingSnapshot = Get-FounderTemporaryListenerSnapshot -Config $Config
  return New-FounderCleanupResult `
    -DryRun:$DryRun `
    -Stopped $stopped `
    -WouldStop $wouldStop `
    -Failed $failed `
    -Unrelated $unrelated `
    -RemainingOwned $remainingSnapshot.Owned `
    -RemainingUnrelated $remainingSnapshot.Unrelated `
    -ExitCodes $Config.ExitCodes
}

function Test-FounderValueLooksMock {
  param(
    $Value
  )

  if ($null -eq $Value) {
    return $false
  }
  return ([string]$Value).ToLowerInvariant().Contains('mock')
}

function Verify-FounderPreview {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $root = Invoke-FounderHttpRequest -Uri $Config.Url -TimeoutSeconds $Config.HttpTimeoutSeconds
  if (-not $root.Success -or [string]::IsNullOrWhiteSpace($root.Content)) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.SmokeFailure
      Status = 'ROOT_SMOKE_FAILED'
      RootHttp = $root.StatusCode
      ApiHttp = 0
      Provider = ''
      DataSource = ''
      FallbackUsed = $null
      ResultCount = 0
      MockMixed = 0
      TlsError = $root.Error -match 'certificate|tls|ssl'
      Error = $root.Error
    }
  }

  $api = Invoke-FounderHttpRequest -Uri $Config.VerifyUrl -TimeoutSeconds $Config.HttpTimeoutSeconds
  if (-not $api.Success) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.SmokeFailure
      Status = 'API_SMOKE_FAILED'
      RootHttp = $root.StatusCode
      ApiHttp = $api.StatusCode
      Provider = ''
      DataSource = ''
      FallbackUsed = $null
      ResultCount = 0
      MockMixed = 0
      TlsError = $api.Error -match 'certificate|tls|ssl'
      Error = $api.Error
    }
  }

  try {
    $payload = $api.Content | ConvertFrom-Json
  } catch {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.SmokeFailure
      Status = 'API_JSON_INVALID'
      RootHttp = $root.StatusCode
      ApiHttp = $api.StatusCode
      Provider = ''
      DataSource = ''
      FallbackUsed = $null
      ResultCount = 0
      MockMixed = 0
      TlsError = $false
      Error = $_.Exception.Message
    }
  }

  $provider = [string](Get-FounderPropertyValue -Object $payload -Name 'providerId' -DefaultValue '')
  if ([string]::IsNullOrWhiteSpace($provider)) {
    $provider = [string](Get-FounderPropertyValue -Object $payload -Name 'source' -DefaultValue '')
  }
  $dataSource = [string](Get-FounderPropertyValue -Object $payload -Name 'dataSource' -DefaultValue '')
  if ([string]::IsNullOrWhiteSpace($dataSource)) {
    $dataSource = $provider
  }
  $fallbackUsed = Get-FounderPropertyValue -Object $payload -Name 'fallbackUsed' -DefaultValue $false
  $results = @(Get-FounderPropertyValue -Object $payload -Name 'results' -DefaultValue @())
  $mockMixed = 0
  foreach ($result in $results) {
    $values = @(
      (Get-FounderPropertyValue -Object $result -Name 'providerId' -DefaultValue '')
      (Get-FounderPropertyValue -Object $result -Name 'source' -DefaultValue '')
      (Get-FounderPropertyValue -Object $result -Name 'dataSource' -DefaultValue '')
    )
    if (@($values | Where-Object { Test-FounderValueLooksMock -Value $_ }).Count -gt 0) {
      $mockMixed++
    }
  }

  $providerIsTmdb = $provider.ToLowerInvariant() -eq 'tmdb' -or $dataSource.ToLowerInvariant() -eq 'tmdb'
  $fallbackIsFalse = -not [bool]$fallbackUsed
  $success = $providerIsTmdb -and $fallbackIsFalse -and $mockMixed -eq 0 -and $results.Count -ge 8
  return [pscustomobject]@{
    Success = $success
    ExitCode = if ($success) { $Config.ExitCodes.Pass } else { $Config.ExitCodes.SmokeFailure }
    Status = if ($success) { 'VERIFY_PASS' } else { 'VERIFY_FAILED' }
    RootHttp = $root.StatusCode
    ApiHttp = $api.StatusCode
    Provider = $provider
    DataSource = $dataSource
    FallbackUsed = [bool]$fallbackUsed
    ResultCount = $results.Count
    MockMixed = $mockMixed
    TlsError = $false
    Error = if ($success) { '' } else { 'Expected TMDB, fallback false, zero mock results, and at least eight results.' }
  }
}

function Write-FounderVerifyResult {
  param(
    [Parameter(Mandatory = $true)]
    $Result
  )

  Write-Host "Verify: $($Result.Status)"
  Write-Host "Root HTTP: $($Result.RootHttp)"
  Write-Host "API HTTP: $($Result.ApiHttp)"
  Write-Host "Provider: $($Result.Provider)"
  Write-Host "Data Source: $($Result.DataSource)"
  Write-Host "Fallback Used: $($Result.FallbackUsed)"
  Write-Host "Result Count: $($Result.ResultCount)"
  Write-Host "Mock Mixed: $($Result.MockMixed)"
  Write-Host "TLS Error: $($Result.TlsError)"
  if (-not [string]::IsNullOrWhiteSpace($Result.Error)) {
    Write-Host "Error: $($Result.Error)"
  }
}

function Invoke-FounderPreflight {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $git = Get-FounderGitInfo -RepositoryPath $Config.RepositoryPath
  Write-Host "Preflight Git: $($git.Branch) $($git.Commit)"
  if ($git.WorkingTree.Count -gt 0) {
    Write-Host 'Working tree entries:'
    $git.WorkingTree | ForEach-Object { Write-Host "  $_" }
  }

  $dryRun = Cleanup-FounderTemporaryServers -Config $Config -DryRun
  foreach ($entry in $dryRun.WouldStop) {
    Write-Host "Cleanup candidate: port $($entry.Port), PID $($entry.ProcessId)"
  }
  foreach ($entry in $dryRun.Unrelated) {
    Write-Host "Unrelated listener preserved: port $($entry.Port), PID $($entry.ProcessId)"
  }

  $cleanup = Cleanup-FounderTemporaryServers -Config $Config
  if (-not (Test-FounderCleanupGate -CleanupResult $cleanup)) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.TemporaryCleanupFailed
      Status = 'CLEANUP_FAILED'
      Details = [pscustomobject]@{
        Git = $git
        DryRun = $dryRun
        Cleanup = $cleanup
      }
    }
  }
  $ensure = Ensure-FounderPreview -Config $Config
  if (-not $ensure.Success) {
    return $ensure
  }

  $root = Invoke-FounderHttpRequest -Uri $Config.Url -TimeoutSeconds $Config.HttpTimeoutSeconds
  if (-not $root.Success) {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.SmokeFailure; Status = 'PREFLIGHT_ROOT_FAILED'; Details = $root }
  }

  $finalStatus = Get-FounderPreviewStatus -Config $Config
  if ($finalStatus.Status -ne 'RUNNING_MANAGED' -or -not $finalStatus.BindingValid) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.Unhealthy
      Status = 'PREFLIGHT_FOUNDER_STATUS_FAILED'
      Details = $finalStatus
    }
  }

  $preflightStatus = Get-FounderPreflightCleanupStatus -CleanupResult $cleanup
  return [pscustomobject]@{
    Success = $true
    ExitCode = $Config.ExitCodes.Pass
    Status = $preflightStatus
    Details = [pscustomobject]@{
      Git = $git
      DryRun = $dryRun
      Cleanup = $cleanup
      Ensure = $ensure
      RootHttp = $root.StatusCode
      Status = $finalStatus
    }
  }
}

function Invoke-FounderFinalize {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $cleanup = Cleanup-FounderTemporaryServers -Config $Config
  if (-not (Test-FounderCleanupGate -CleanupResult $cleanup)) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.TemporaryCleanupFailed
      Status = 'FINALIZE_CLEANUP_FAILED'
      Details = $cleanup
    }
  }
  $restart = Restart-FounderPreview -Config $Config
  if (-not $restart.Success) {
    return $restart
  }
  $verify = Verify-FounderPreview -Config $Config
  if (-not $verify.Success) {
    return [pscustomobject]@{ Success = $false; ExitCode = $verify.ExitCode; Status = 'FINALIZE_VERIFY_FAILED'; Details = $verify }
  }
  $finalStatus = Get-FounderPreviewStatus -Config $Config
  if ($finalStatus.Status -ne 'RUNNING_MANAGED' -or -not $finalStatus.BindingValid) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.Unhealthy
      Status = 'FINALIZE_STATUS_FAILED'
      Details = $finalStatus
    }
  }

  return [pscustomobject]@{
    Success = $true
    ExitCode = $Config.ExitCodes.Pass
    Status = 'FINALIZED'
    Details = [pscustomobject]@{
      Cleanup = $cleanup
      Restart = $restart
      Verify = $verify
      Git = Get-FounderGitInfo -RepositoryPath $Config.RepositoryPath
      Status = $finalStatus
    }
  }
}

function Invoke-FounderQaReady {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $git = Get-FounderGitInfo -RepositoryPath $Config.RepositoryPath
  $worktree = Test-FounderQaReadyWorkingTree -Entries $git.WorkingTree
  if (-not $worktree.Success) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.QaReadyDirtyWorktree
      Status = 'BLOCKED_DIRTY_WORKTREE'
      Details = [pscustomobject]@{
        Git = $git
        Worktree = $worktree
      }
    }
  }

  $cleanup = Cleanup-FounderTemporaryServers -Config $Config
  if (-not (Test-FounderCleanupGate -CleanupResult $cleanup)) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.TemporaryCleanupFailed
      Status = 'QA_READY_CLEANUP_FAILED'
      Details = [pscustomobject]@{
        Git = $git
        Worktree = $worktree
        Cleanup = $cleanup
      }
    }
  }

  $restart = Restart-FounderPreview -Config $Config
  if (-not $restart.Success) {
    return $restart
  }
  $status = Get-FounderPreviewStatus -Config $Config
  if ($status.Status -ne 'RUNNING_MANAGED' -or
    -not $status.BindingValid -or
    $status.CurrentCommit -ne $git.Commit -or
    $status.CommitAtStart -ne $git.Commit -or
    $status.AdoptedExistingServer) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.Unhealthy
      Status = 'QA_READY_STATUS_FAILED'
      Details = [pscustomobject]@{
        Git = $git
        Status = $status
      }
    }
  }

  $verify = Verify-FounderPreview -Config $Config
  if (-not $verify.Success) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $verify.ExitCode
      Status = 'QA_READY_VERIFY_FAILED'
      Details = $verify
    }
  }

  $finalTemporary = Get-FounderTemporaryListenerSnapshot -Config $Config
  if ($finalTemporary.Owned.Count -gt 0) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.TemporaryCleanupFailed
      Status = 'QA_READY_TEMPORARY_LISTENER_REMAINED'
      Details = $finalTemporary
    }
  }

  return [pscustomobject]@{
    Success = $true
    ExitCode = $Config.ExitCodes.Pass
    Status = 'READY_FOR_FOUNDER_QA'
    Details = [pscustomobject]@{
      Git = $git
      Worktree = $worktree
      Cleanup = $cleanup
      Restart = $restart
      Status = $status
      Verify = $verify
      RemainingOwned = $finalTemporary.Owned
      RemainingUnrelated = $finalTemporary.Unrelated
    }
  }
}

function Invoke-FounderSafeValidation {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    [ValidateSet('build', 'check')]
    [string]$ValidationAction
  )

  $initialStatus = Get-FounderPreviewStatus -Config $Config
  if ($initialStatus.Status -eq 'BLOCKED_UNRELATED_PROCESS') {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.PortConflict; Status = 'BLOCKED_UNRELATED_PROCESS'; Details = $initialStatus }
  }

  if ($initialStatus.Owned) {
    $stop = Stop-FounderPreview -Config $Config
    if (-not $stop.Success) {
      return $stop
    }
  } elseif ($initialStatus.Status -eq 'STALE_STATE') {
    Remove-FounderPreviewState -Config $Config
  }

  $validationExitCode = 1
  $validationError = ''
  $restoreResult = $null
  $verifyResult = $null
  try {
    Write-Host "Running pnpm $ValidationAction..."
    Invoke-FounderPnpm `
      -RepositoryPath $Config.RepositoryPath `
      -Arguments @($ValidationAction) `
      -ExitCode ([ref]$validationExitCode)
  } catch {
    $validationExitCode = 1
    $validationError = $_.Exception.Message
    Write-Host "Validation command failed to execute: $validationError"
  } finally {
    Write-Host 'Restoring Founder Preview...'
    $restoreResult = Ensure-FounderPreview -Config $Config
    if ($restoreResult.Success) {
      if ($ValidationAction -eq 'check') {
        $verifyResult = Verify-FounderPreview -Config $Config
      } else {
        $root = Invoke-FounderHttpRequest -Uri $Config.Url -TimeoutSeconds $Config.HttpTimeoutSeconds
        $verifyResult = [pscustomobject]@{
          Success = $root.Success
          ExitCode = if ($root.Success) { 0 } else { $Config.ExitCodes.SmokeFailure }
          Status = if ($root.Success) { 'ROOT_VERIFY_PASS' } else { 'ROOT_VERIFY_FAILED' }
          RootHttp = $root.StatusCode
          Error = $root.Error
        }
      }
    }
  }

  $restoreSucceeded = $null -ne $restoreResult -and $restoreResult.Success -and $null -ne $verifyResult -and $verifyResult.Success
  if (-not $restoreSucceeded) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $Config.ExitCodes.ValidationFailedRestoreFailed
      Status = 'VALIDATION_OR_RESTORE_FAILED'
      Details = [pscustomobject]@{
        ValidationExitCode = $validationExitCode
        ValidationError = $validationError
        Restore = $restoreResult
        Verify = $verifyResult
      }
    }
  }

  if ($validationExitCode -ne 0) {
    return [pscustomobject]@{
      Success = $false
      ExitCode = $validationExitCode
      Status = 'VALIDATION_FAILED_SERVER_RESTORED'
      Details = [pscustomobject]@{
        ValidationExitCode = $validationExitCode
        ValidationError = $validationError
        Restore = $restoreResult
        Verify = $verifyResult
      }
    }
  }

  return [pscustomobject]@{
    Success = $true
    ExitCode = $Config.ExitCodes.Pass
    Status = 'VALIDATION_PASS_SERVER_RESTORED'
    Details = [pscustomobject]@{
      ValidationExitCode = $validationExitCode
      ValidationError = $validationError
      Restore = $restoreResult
      Verify = $verifyResult
    }
  }
}
