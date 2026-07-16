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
  $runtimeRoot = Join-Path $env:TEMP 'myott-founder-preview'
  $hashProvider = [System.Security.Cryptography.SHA256]::Create()
  try {
    $pathBytes = [System.Text.Encoding]::UTF8.GetBytes($normalizedRepositoryPath.ToLowerInvariant())
    $pathHash = ([System.BitConverter]::ToString($hashProvider.ComputeHash($pathBytes))).Replace('-', '').Substring(0, 16)
  } finally {
    $hashProvider.Dispose()
  }

  return [pscustomobject]@{
    SchemaVersion = 1
    RepositoryPath = $normalizedRepositoryPath
    HostName = '127.0.0.1'
    FounderPort = 3000
    TemporaryPortMinimum = 3001
    TemporaryPortMaximum = 3100
    LegacyCleanupPortMaximum = 3101
    RuntimeRoot = $runtimeRoot
    StatePath = Join-Path $runtimeRoot 'state.json'
    LockInfoPath = Join-Path $runtimeRoot 'lifecycle.lock'
    LastOperationPath = Join-Path $runtimeRoot 'last-operation.json'
    StdoutLogPath = Join-Path $runtimeRoot 'founder-3000.out.log'
    StderrLogPath = Join-Path $runtimeRoot 'founder-3000.err.log'
    Url = 'http://127.0.0.1:3000'
    VerifyUrl = 'http://127.0.0.1:3000/api/recommend/options?filters=genre-action&types=drama'
    ReadyTimeoutSeconds = 60
    HttpTimeoutSeconds = 15
    LockTimeoutSeconds = 30
    MutexName = "Local\MyOTTFounderPreview_$pathHash"
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

function Get-FounderProcessMetadata {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  try {
    $cimProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
    $runtimeProcess = Get-Process -Id $ProcessId -ErrorAction Stop
    return [pscustomobject]@{
      ProcessId = [int]$cimProcess.ProcessId
      ParentProcessId = [int]$cimProcess.ParentProcessId
      Name = [string]$cimProcess.Name
      ExecutablePath = [string]$cimProcess.ExecutablePath
      CommandLine = [string]$cimProcess.CommandLine
      StartTime = $runtimeProcess.StartTime.ToUniversalTime().ToString('o')
    }
  } catch {
    return $null
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

function Get-FounderProcessDescendants {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $allProcesses = @()
  try {
    $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction Stop)
  } catch {
    return @()
  }

  $descendants = @()
  $queue = New-Object System.Collections.Queue
  $queue.Enqueue([pscustomobject]@{ ProcessId = $ProcessId; Depth = 0 })
  $seen = @{}
  while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()
    foreach ($child in @($allProcesses | Where-Object { [int]$_.ParentProcessId -eq [int]$current.ProcessId })) {
      $childId = [int]$child.ProcessId
      if ($seen.ContainsKey($childId)) {
        continue
      }
      $seen[$childId] = $true
      $metadata = Get-FounderProcessMetadata -ProcessId $childId
      if ($null -ne $metadata) {
        $descendants += [pscustomobject]@{
          Metadata = $metadata
          Depth = [int]$current.Depth + 1
        }
        $queue.Enqueue([pscustomobject]@{ ProcessId = $childId; Depth = [int]$current.Depth + 1 })
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
  $forwardSlashPath = $normalizedRepositoryPath.Replace('\', '/')
  return $CommandLine.IndexOf($normalizedRepositoryPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or
    $CommandLine.IndexOf($forwardSlashPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Test-FounderCommandLooksLikeDevServer {
  param(
    [AllowNull()]
    [string]$CommandLine
  )

  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return $false
  }

  $lower = $CommandLine.ToLowerInvariant()
  return ($lower.Contains('next') -and $lower.Contains(' dev')) -or
    $lower.Contains('next\dist\server\lib\start-server.js') -or
    $lower.Contains('next/dist/server/lib/start-server.js') -or
    ($lower.Contains('pnpm') -and $lower.Contains(' dev'))
}

function Get-FounderProcessOwnership {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath
  )

  $chain = @(Get-FounderProcessAncestors -ProcessId $ProcessId)
  if ($chain.Count -eq 0) {
    return [pscustomobject]@{
      Owned = $false
      Reason = 'process-metadata-unavailable'
      Process = $null
      Chain = @()
    }
  }

  $referencesRepository = $false
  $looksLikeDevServer = $false
  foreach ($process in $chain) {
    if (Test-FounderCommandLineReferencesRepository -CommandLine $process.CommandLine -RepositoryPath $RepositoryPath) {
      $referencesRepository = $true
    }
    if (Test-FounderCommandLooksLikeDevServer -CommandLine $process.CommandLine) {
      $looksLikeDevServer = $true
    }
  }

  $owned = $referencesRepository -and $looksLikeDevServer
  $reason = 'command-line-does-not-prove-repository-ownership'
  if ($owned) {
    $reason = 'repository-path-and-dev-server-command-confirmed'
  } elseif ($referencesRepository) {
    $reason = 'repository-path-found-but-dev-server-command-missing'
  } elseif ($looksLikeDevServer) {
    $reason = 'dev-server-command-found-without-repository-path'
  }

  return [pscustomobject]@{
    Owned = $owned
    Reason = $reason
    Process = $chain[0]
    Chain = $chain
  }
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
    [string]$RepositoryPath
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

  try {
    $stateStart = [datetime]::Parse([string]$State.listenerStartedAt).ToUniversalTime()
    $actualStart = [datetime]::Parse([string]$ProcessMetadata.StartTime).ToUniversalTime()
    if ([math]::Abs(($stateStart - $actualStart).TotalSeconds) -gt 2) {
      return $false
    }
  } catch {
    return $false
  }

  if (-not (Test-FounderCommandLineReferencesRepository -CommandLine $ProcessMetadata.CommandLine -RepositoryPath $RepositoryPath)) {
    return $false
  }
  if (-not (Test-FounderCommandLooksLikeDevServer -CommandLine $ProcessMetadata.CommandLine)) {
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
    $Pnpm,
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

  $nextArguments = @(
    '--dir',
    "`"$RepositoryPath`"",
    'exec',
    'next',
    'dev',
    '--hostname',
    $HostName,
    '--port',
    [string]$Port
  )
  $extension = [System.IO.Path]::GetExtension([string]$Pnpm.FilePath)
  if ($extension -ieq '.cmd' -or $extension -ieq '.bat') {
    $commandLine = '""{0}" --dir "{1}" exec next dev --hostname {2} --port {3}"' -f
      $Pnpm.FilePath,
      $RepositoryPath,
      $HostName,
      $Port
    return Start-Process `
      -FilePath $env:ComSpec `
      -ArgumentList @('/d', '/s', '/c', $commandLine) `
      -WorkingDirectory $RepositoryPath `
      -WindowStyle Hidden `
      -RedirectStandardOutput $StdoutLogPath `
      -RedirectStandardError $StderrLogPath `
      -PassThru
  }

  $arguments = @($Pnpm.PrefixArguments) + $nextArguments
  return Start-Process `
    -FilePath $Pnpm.FilePath `
    -ArgumentList $arguments `
    -WorkingDirectory $RepositoryPath `
    -WindowStyle Hidden `
    -RedirectStandardOutput $StdoutLogPath `
    -RedirectStandardError $StderrLogPath `
    -PassThru
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

function Get-FounderPreviewState {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

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

  $candidate = $null
  foreach ($process in $Chain) {
    if (-not (Test-FounderCommandLineReferencesRepository -CommandLine $process.CommandLine -RepositoryPath $RepositoryPath)) {
      continue
    }
    $lower = ([string]$process.CommandLine).ToLowerInvariant()
    if ($lower.Contains('pnpm') -or $lower.Contains('cmd.exe')) {
      $candidate = $process
    }
  }

  if ($null -eq $candidate -and $Chain.Count -gt 0) {
    $candidate = $Chain[0]
  }
  return $candidate
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
      $stateValid = Test-FounderStateProcessIdentity -State $state -ProcessMetadata $processMetadata -RepositoryPath $Config.RepositoryPath
      $managed = $stateValid
      if ($managed) {
        $launcherPid = [int](Get-FounderPropertyValue -Object $state -Name 'launcherPid' -DefaultValue 0)
      }
    }
    if (-not $managed -and $null -ne $ownership -and $ownership.Owned) {
      $launcher = Get-FounderLauncherFromChain -Chain $ownership.Chain -RepositoryPath $Config.RepositoryPath
      if ($null -ne $launcher) {
        $launcherPid = [int]$launcher.ProcessId
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
  $stdoutLog = $Config.StdoutLogPath
  $stderrLog = $Config.StderrLogPath
  if ($null -ne $state) {
    $startedAt = [string](Get-FounderPropertyValue -Object $state -Name 'startedAt' -DefaultValue '')
    $commitAtStart = [string](Get-FounderPropertyValue -Object $state -Name 'commitAtStart' -DefaultValue '')
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
    Managed = $managed
    StateValid = $stateValid
    BindingValid = $bindingValid
    RootHttpStatus = $rootHttpStatus
    RootError = $rootError
    CurrentBranch = $git.Branch
    CurrentCommit = $git.Commit
    CommitAtStart = $commitAtStart
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
    [string]$Command
  )

  $listenerMetadata = Get-FounderProcessMetadata -ProcessId $Listener.OwningProcess
  if ($null -eq $listenerMetadata) {
    throw 'Listener process metadata disappeared before state could be recorded.'
  }
  if ($LauncherPid -le 0) {
    $launcher = Get-FounderLauncherFromChain -Chain $Ownership.Chain -RepositoryPath $Config.RepositoryPath
    if ($null -ne $launcher) {
      $LauncherPid = [int]$launcher.ProcessId
    } else {
      $LauncherPid = [int]$Listener.OwningProcess
    }
  }
  $launcherMetadata = Get-FounderProcessMetadata -ProcessId $LauncherPid
  $git = Get-FounderGitInfo -RepositoryPath $Config.RepositoryPath

  return [ordered]@{
    schemaVersion = $Config.SchemaVersion
    repositoryPath = $Config.RepositoryPath
    repositoryRemote = $git.Remote
    branch = $git.Branch
    commitAtStart = $git.Commit
    requestedHost = $Config.HostName
    requestedPort = $Config.FounderPort
    launcherPid = $LauncherPid
    launcherStartedAt = if ($null -ne $launcherMetadata) { $launcherMetadata.StartTime } else { '' }
    listenerPid = [int]$Listener.OwningProcess
    listenerStartedAt = $listenerMetadata.StartTime
    startedAt = $listenerMetadata.StartTime
    stateRecordedAt = (Get-Date).ToUniversalTime().ToString('o')
    command = $Command
    stdoutLog = $Config.StdoutLogPath
    stderrLog = $Config.StderrLogPath
    nodeOptions = '--use-system-ca'
  }
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
  foreach ($descendant in @(Get-FounderProcessDescendants -ProcessId $RootProcessId | Sort-Object Depth -Descending)) {
    $descendantOwnership = Get-FounderProcessOwnership -ProcessId $descendant.Metadata.ProcessId -RepositoryPath $RepositoryPath
    if ($descendantOwnership.Owned) {
      $targets += [int]$descendant.Metadata.ProcessId
    }
  }
  $targets += $RootProcessId
  $targets = @($targets | Select-Object -Unique)

  foreach ($target in $targets) {
    Stop-Process -Id $target -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 750
  foreach ($target in $targets) {
    if ($null -ne (Get-FounderProcessMetadata -ProcessId $target)) {
      Stop-Process -Id $target -Force -ErrorAction SilentlyContinue
    }
  }

  $remaining = @($targets | Where-Object { $null -ne (Get-FounderProcessMetadata -ProcessId $_) })
  return [pscustomobject]@{
    Success = $remaining.Count -eq 0
    Reason = if ($remaining.Count -eq 0) { 'owned-process-tree-stopped' } else { "Processes still running: $($remaining -join ', ')" }
    StoppedProcessIds = @($targets | Where-Object { $_ -notin $remaining })
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
    $state = New-FounderStateFromListener -Config $Config -Listener $listener -Ownership $status.Ownership -LauncherPid $status.LauncherPid -Command $status.CommandLine
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

  $pnpm = Resolve-FounderPnpmCommand
  $displayCommand = "$($pnpm.DisplayName) --dir `"$($Config.RepositoryPath)`" exec next dev --hostname $($Config.HostName) --port $($Config.FounderPort)"
  $originalNodeOptions = $env:NODE_OPTIONS
  $launcher = $null
  try {
    $env:NODE_OPTIONS = Merge-FounderNodeOptions -CurrentValue $originalNodeOptions
    $launcher = Start-FounderBackgroundProcess `
      -Pnpm $pnpm `
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
        Stop-Process -Id $launcher.Id -ErrorAction SilentlyContinue
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

  $state = New-FounderStateFromListener -Config $Config -Listener $listener -Ownership $ownership -LauncherPid $launcher.Id -Command $displayCommand
  Save-FounderPreviewState -Config $Config -State $state
  $finalStatus = Get-FounderPreviewStatus -Config $Config
  if ($finalStatus.Status -ne 'RUNNING_MANAGED') {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.Unhealthy; Status = 'STARTED_BUT_NOT_MANAGED'; Details = $finalStatus }
  }

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

function Cleanup-FounderTemporaryServers {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [switch]$DryRun
  )

  $stopped = @()
  $wouldStop = @()
  $unrelated = @()
  $visited = @{}
  foreach ($listener in @(Get-FounderListeners -Ports ($Config.TemporaryPortMinimum..$Config.LegacyCleanupPortMaximum))) {
    if ($visited.ContainsKey([int]$listener.OwningProcess)) {
      continue
    }
    $visited[[int]$listener.OwningProcess] = $true
    $ownership = Get-FounderProcessOwnership -ProcessId $listener.OwningProcess -RepositoryPath $Config.RepositoryPath
    $process = Get-FounderProcessMetadata -ProcessId $listener.OwningProcess
    $entry = [pscustomobject]@{
      Port = $listener.LocalPort
      ProcessId = $listener.OwningProcess
      Name = if ($null -ne $process) { $process.Name } else { '' }
      CommandLine = if ($null -ne $process) { $process.CommandLine } else { '' }
      OwnershipReason = $ownership.Reason
    }
    if (-not $ownership.Owned) {
      $unrelated += $entry
      continue
    }
    if ($DryRun) {
      $wouldStop += $entry
      continue
    }

    $rootProcessId = [int]$listener.OwningProcess
    $launcher = Get-FounderLauncherFromChain -Chain $ownership.Chain -RepositoryPath $Config.RepositoryPath
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
      $unrelated += [pscustomobject]@{
        Port = $entry.Port
        ProcessId = $entry.ProcessId
        Name = $entry.Name
        CommandLine = $entry.CommandLine
        OwnershipReason = $stopResult.Reason
      }
    }
  }

  return [pscustomobject]@{
    Success = $true
    ExitCode = $Config.ExitCodes.Pass
    Status = if ($DryRun) { 'DRY_RUN_COMPLETE' } else { 'CLEANUP_COMPLETE' }
    Stopped = $stopped
    WouldStop = $wouldStop
    Unrelated = $unrelated
  }
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
  $ensure = Ensure-FounderPreview -Config $Config
  if (-not $ensure.Success) {
    return $ensure
  }

  $root = Invoke-FounderHttpRequest -Uri $Config.Url -TimeoutSeconds $Config.HttpTimeoutSeconds
  if (-not $root.Success) {
    return [pscustomobject]@{ Success = $false; ExitCode = $Config.ExitCodes.SmokeFailure; Status = 'PREFLIGHT_ROOT_FAILED'; Details = $root }
  }

  $warnings = @($cleanup.Unrelated)
  return [pscustomobject]@{
    Success = $true
    ExitCode = $Config.ExitCodes.Pass
    Status = if ($warnings.Count -gt 0) { 'READY_WITH_WARNINGS' } else { 'READY' }
    Details = [pscustomobject]@{
      Git = $git
      Cleanup = $cleanup
      Ensure = $ensure
      RootHttp = $root.StatusCode
    }
  }
}

function Invoke-FounderFinalize {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  $cleanup = Cleanup-FounderTemporaryServers -Config $Config
  $restart = Restart-FounderPreview -Config $Config
  if (-not $restart.Success) {
    return $restart
  }
  $verify = Verify-FounderPreview -Config $Config
  if (-not $verify.Success) {
    return [pscustomobject]@{ Success = $false; ExitCode = $verify.ExitCode; Status = 'FINALIZE_VERIFY_FAILED'; Details = $verify }
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
      Status = Get-FounderPreviewStatus -Config $Config
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
