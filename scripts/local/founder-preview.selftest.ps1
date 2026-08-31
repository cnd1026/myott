$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'FounderPreview.Common.ps1')

$repositoryPath = Normalize-FounderRepositoryPath -Path (Join-Path $scriptDirectory '..\..')
$config = Get-FounderPreviewConfig -RepositoryPath $repositoryPath
$passed = 0
$failed = 0
$failures = @()

function Assert-FounderTest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Test
  )

  try {
    $result = & $Test
    if (-not $result) {
      throw 'assertion returned false'
    }
    $script:passed++
    Write-Host "PASS $Name"
  } catch {
    $script:failed++
    $script:failures += "$Name`: $($_.Exception.Message)"
    Write-Host "FAIL $Name - $($_.Exception.Message)"
  }
}

$currentRuntime = Resolve-FounderRuntime -RepositoryPath $repositoryPath
$repoCommand = "node.exe `"$repositoryPath\node_modules\next\dist\bin\next`" dev `"$repositoryPath`" --hostname 127.0.0.1 --port 3000"
$otherRepoCommand = 'node.exe "C:\work\another-app\node_modules\next\dist\bin\next" dev "C:\work\another-app" --hostname 127.0.0.1 --port 3000'
$startTime = (Get-Date).ToUniversalTime().ToString('o')
$processMetadata = [pscustomobject]@{
  ProcessId = 1234
  ParentProcessId = 1000
  Name = 'node.exe'
  ExecutablePath = 'C:\Program Files\nodejs\node.exe'
  CommandLine = $repoCommand
  StartTime = $startTime
}
$validState = [pscustomobject]@{
  schemaVersion = 1
  repositoryPath = $repositoryPath
  requestedHost = '127.0.0.1'
  requestedPort = 3000
  launcherPid = 1234
  launcherStartedAt = $startTime
  listenerPid = 1234
  listenerStartedAt = $startTime
  startedAt = $startTime
  command = $repoCommand
  stdoutLog = 'out.log'
  stderrLog = 'err.log'
}

Assert-FounderTest 'Founder port 3000 can be allocated' {
  Test-FounderPortCanBeAllocated -Port 3000 -Config $config
}
Assert-FounderTest 'Temporary lower bound 3001 is allowed' {
  Test-FounderPortIsTemporary -Port 3001 -Config $config
}
Assert-FounderTest 'Temporary upper bound 3100 is allowed' {
  Test-FounderPortIsTemporary -Port 3100 -Config $config
}
Assert-FounderTest 'Port 3101 cannot be newly allocated' {
  -not (Test-FounderPortCanBeAllocated -Port 3101 -Config $config)
}
Assert-FounderTest 'Port 3101 remains a cleanup target' {
  Test-FounderPortIsCleanupTarget -Port 3101 -Config $config
}
Assert-FounderTest 'Port 3102 is prohibited' {
  -not (Test-FounderPortCanBeAllocated -Port 3102 -Config $config) -and
    -not (Test-FounderPortIsCleanupTarget -Port 3102 -Config $config)
}
Assert-FounderTest 'Repository path normalization is stable' {
  (Normalize-FounderRepositoryPath -Path (Join-Path $repositoryPath '.')) -eq $repositoryPath
}
Assert-FounderTest 'Same repository command line proves path reference' {
  Test-FounderCommandLineReferencesRepository -CommandLine $repoCommand -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Other repository command line is not owned' {
  -not (Test-FounderCommandLineReferencesRepository -CommandLine $otherRepoCommand -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Plain node executable is not enough for ownership' {
  -not (Test-FounderCommandLineReferencesRepository -CommandLine 'node.exe server.js' -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Canonical target-local Node and official Next CLI form is recognized' {
  Test-FounderCommandLooksLikeDevServer -CommandLine $repoCommand -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Canonical shared-runtime Node and official Next CLI form is recognized' {
  $sharedCommand = "`"C:\Program Files\nodejs\node.exe`" `"$($currentRuntime.NextCliPath)`" dev `"$repositoryPath`" --hostname 127.0.0.1 --port 3000"
  Test-FounderCommandLooksLikeDevServer -CommandLine $sharedCommand -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Canonical quoted env-file form is recognized' {
  $environmentCommand = "`"C:\Program Files\nodejs\node.exe`" --env-file=`"C:\env path\.env.local`" `"$($currentRuntime.NextCliPath)`" dev `"$repositoryPath`" --hostname 127.0.0.1 --port 3000"
  Test-FounderCommandLooksLikeDevServer -CommandLine $environmentCommand -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Canonical command exposes exact target application directory' {
  $canonicalCommand = Get-FounderCanonicalNextDevCommand `
    -CommandLine $repoCommand `
    -RepositoryPath $repositoryPath
  $canonicalCommand.IsCanonical -and
    $canonicalCommand.ApplicationMatchesTarget -and
    (Test-FounderRepositoryPathEqual -Left $canonicalCommand.ApplicationDirectory -Right $repositoryPath)
}
Assert-FounderTest 'Direct Next, pnpm, and cmd wrapper forms are not enabled by current lifecycle' {
  -not (Test-FounderCommandLooksLikeDevServer -CommandLine "next dev `"$repositoryPath`"" -RepositoryPath $repositoryPath) -and
    -not (Test-FounderCommandLooksLikeDevServer -CommandLine "pnpm exec next dev `"$repositoryPath`"" -RepositoryPath $repositoryPath) -and
    -not (Test-FounderCommandLooksLikeDevServer -CommandLine "cmd.exe /c node.exe `"$($currentRuntime.NextCliPath)`" dev `"$repositoryPath`"" -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Malformed unmatched-quote command fails closed' {
  -not (Test-FounderCommandLooksLikeDevServer -CommandLine "node.exe `"$($currentRuntime.NextCliPath) dev" -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Native argv parses spaces in quoted paths without approximation' {
  $parsed = ConvertFrom-FounderWindowsCommandLine `
    -CommandLine 'node.exe "C:\work\My OTT\next" dev "C:\work\My OTT"'
  $parsed.Success -and
    $parsed.Tokens.Count -eq 4 -and
    $parsed.Tokens[1] -eq 'C:\work\My OTT\next' -and
    $parsed.Tokens[3] -eq 'C:\work\My OTT'
}
Assert-FounderTest 'Native argv preserves Unicode quoted application paths' {
  $parsed = ConvertFrom-FounderWindowsCommandLine `
    -CommandLine 'node.exe "C:\작업 공간\MyOTT\next" dev "C:\작업 공간\MyOTT"'
  $parsed.Success -and
    $parsed.Tokens[1] -eq 'C:\작업 공간\MyOTT\next' -and
    $parsed.Tokens[3] -eq 'C:\작업 공간\MyOTT'
}
Assert-FounderTest 'Native argv handles escaped quote and empty quoted argument exactly' {
  $parsed = ConvertFrom-FounderWindowsCommandLine `
    -CommandLine 'node.exe "C:\work\arg\"quoted" ""'
  $parsed.Success -and
    $parsed.Tokens.Count -eq 3 -and
    $parsed.Tokens[1] -eq 'C:\work\arg"quoted' -and
    $parsed.Tokens[2] -eq ''
}
Assert-FounderTest 'Ownership grammar rejects embedded escaped quotes despite native tokenization' {
  -not [MyOttFounderPreviewProcessQuery]::IsOwnershipCommandLineUnambiguous(
    'node.exe "C:\work\arg\"quoted" ""'
  )
}
Assert-FounderTest 'Ownership grammar rejects doubled-quote CRT divergence' {
  -not [MyOttFounderPreviewProcessQuery]::IsOwnershipCommandLineUnambiguous(
    'node.exe "a""b" c'
  )
}
Assert-FounderTest 'Native argv handles trailing backslashes before closing quote exactly' {
  $parsed = ConvertFrom-FounderWindowsCommandLine `
    -CommandLine 'node.exe "C:\work\path\\" tail'
  $parsed.Success -and
    $parsed.Tokens.Count -eq 3 -and
    $parsed.Tokens[1] -eq 'C:\work\path\' -and
    $parsed.Tokens[2] -eq 'tail'
}
Assert-FounderTest 'Independent escaped-quote ownership false-positive now fails closed' {
  $attackCommand = 'node.exe "' + $currentRuntime.NextCliPath + '" dev "' +
    $repositoryPath + '\" --hostname 127.0.0.1 --port 3000'
  $parsed = ConvertFrom-FounderWindowsCommandLine -CommandLine $attackCommand
  $canonical = Get-FounderCanonicalNextDevCommand `
    -CommandLine $attackCommand `
    -RepositoryPath $repositoryPath
  -not $parsed.Success -and
    -not $canonical.IsCanonical -and
    -not $canonical.ApplicationMatchesTarget
}
Assert-FounderTest 'Embedded NUL command line fails closed before native parsing' {
  $malformed = 'node.exe' + [char]0 + ' "C:\work\app.js"'
  -not (ConvertFrom-FounderWindowsCommandLine -CommandLine $malformed).Success
}
Assert-FounderTest 'Unavailable process metadata fails ownership closed' {
  $emptyOwnership = Get-FounderProcessOwnershipFromChain -Chain @() -ProcessId 1234 -RepositoryPath $repositoryPath
  -not $emptyOwnership.Owned -and $emptyOwnership.Reason -eq 'process-metadata-unavailable'
}

function New-FounderFakeTerminationLease {
  param(
    [Parameter(Mandatory = $true)]
    $Metadata,
    [string]$TerminationResult = 'TERMINATED',
    [switch]$ThrowOnTermination,
    [switch]$ThrowOnDispose
  )

  $lease = [pscustomobject]@{
    Metadata = $Metadata
    TerminationResult = $TerminationResult
    ThrowOnTermination = [bool]$ThrowOnTermination
    ThrowOnDispose = [bool]$ThrowOnDispose
    TerminateCalls = 0
    Disposed = $false
  }
  $lease | Add-Member -MemberType ScriptMethod -Name TerminateIfRunning -Value {
    param([uint32]$ExitCode)
    $this.TerminateCalls++
    if ($this.ThrowOnTermination) {
      throw 'simulated termination failure'
    }
    return $this.TerminationResult
  }
  $lease | Add-Member -MemberType ScriptMethod -Name Dispose -Value {
    $this.Disposed = $true
    if ($this.ThrowOnDispose) {
      throw 'simulated handle cleanup failure'
    }
  }
  return $lease
}
$runtimeMetadataSource = [pscustomobject]@{
  Id = 1234
  ProcessName = 'node'
  Path = 'C:\Program Files\nodejs\node.exe'
  StartTime = ConvertTo-FounderUtcDateTime -Value $startTime
}
$nativeMetadataSource = [pscustomobject]@{
  ProcessId = 1234
  ParentProcessId = 1000
  CommandLine = $repoCommand
  ExecutablePath = 'C:\Program Files\nodejs\node.exe'
  CreationTimeUtc = ConvertTo-FounderUtcDateTime -Value $startTime
}
$fallbackMetadata = Merge-FounderProcessMetadataSources `
  -ExpectedProcessId 1234 `
  -CimProcess $null `
  -RuntimeProcess $runtimeMetadataSource `
  -NativeProcess $nativeMetadataSource
Assert-FounderTest 'CIM access failure retains independently cross-checked process metadata' {
  $null -ne $fallbackMetadata -and
    $fallbackMetadata.ProcessId -eq 1234 -and
    $fallbackMetadata.ParentProcessId -eq 1000 -and
    $fallbackMetadata.CommandLine -eq $repoCommand -and
    @($fallbackMetadata.MetadataSources) -contains 'GET_PROCESS' -and
    @($fallbackMetadata.MetadataSources) -contains 'NATIVE_QUERY'
}
Assert-FounderTest 'Self-spawn metadata fallback preserves canonical ownership proof' {
  $fallbackOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($fallbackMetadata) `
    -ProcessId 1234 `
    -RepositoryPath $repositoryPath
  $fallbackOwnership.Owned -and $fallbackOwnership.ProvingProcessId -eq 1234
}
Assert-FounderTest 'Spoofed node command line from another executable is unowned' {
  $spoofedExecutableMetadata = $fallbackMetadata.PSObject.Copy()
  $spoofedExecutableMetadata.ExecutablePath = 'C:\Windows\System32\notepad.exe'
  $spoofedOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($spoofedExecutableMetadata) `
    -ProcessId 1234 `
    -RepositoryPath $repositoryPath
  -not $spoofedOwnership.Owned -and
    $spoofedOwnership.Reason -eq 'canonical-command-executable-mismatch'
}
Assert-FounderTest 'Metadata source PID disagreement fails closed' {
  $wrongPidNative = $nativeMetadataSource.PSObject.Copy()
  $wrongPidNative.ProcessId = 4321
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $null `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $wrongPidNative)
}
Assert-FounderTest 'Metadata source parent disagreement fails closed' {
  $cimMetadataSource = [pscustomobject]@{
    ProcessId = 1234
    ParentProcessId = 999
    Name = 'node.exe'
    ExecutablePath = 'C:\Program Files\nodejs\node.exe'
    CommandLine = $repoCommand
    CreationDate = ConvertTo-FounderUtcDateTime -Value $startTime
  }
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $cimMetadataSource `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $nativeMetadataSource)
}
Assert-FounderTest 'Missing required parent identity fails closed' {
  $missingParentNative = $nativeMetadataSource.PSObject.Copy()
  $missingParentNative.ParentProcessId = 0
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $null `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $missingParentNative)
}
Assert-FounderTest 'Missing required command line fails closed' {
  $missingCommandNative = $nativeMetadataSource.PSObject.Copy()
  $missingCommandNative.CommandLine = ''
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $null `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $missingCommandNative)
}
Assert-FounderTest 'Metadata source command line disagreement fails closed' {
  $wrongCommandCim = [pscustomobject]@{
    ProcessId = 1234
    ParentProcessId = 1000
    Name = 'node.exe'
    ExecutablePath = 'C:\Program Files\nodejs\node.exe'
    CommandLine = $otherRepoCommand
    CreationDate = ConvertTo-FounderUtcDateTime -Value $startTime
  }
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $wrongCommandCim `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $nativeMetadataSource)
}
Assert-FounderTest 'Lower-precision CIM creation date cannot replace exact runtime-native identity' {
  $cimPrecisionSource = [pscustomobject]@{
    ProcessId = 1234
    ParentProcessId = 1000
    Name = 'node.exe'
    ExecutablePath = 'C:\Program Files\nodejs\node.exe'
    CommandLine = $repoCommand
    CreationDate = (ConvertTo-FounderUtcDateTime -Value $startTime).AddTicks(1)
  }
  $merged = Merge-FounderProcessMetadataSources `
    -ExpectedProcessId 1234 `
    -CimProcess $cimPrecisionSource `
    -RuntimeProcess $runtimeMetadataSource `
    -NativeProcess $nativeMetadataSource
  $null -ne $merged -and
    (Test-FounderProcessCreationIdentityEqual -Left $merged.StartTime -Right $startTime)
}
Assert-FounderTest 'CIM plus one exact source cannot establish canonical creation identity' {
  $cimMetadataSource = [pscustomobject]@{
    ProcessId = 1234
    ParentProcessId = 1000
    Name = 'node.exe'
    ExecutablePath = 'C:\Program Files\nodejs\node.exe'
    CommandLine = $repoCommand
    CreationDate = ConvertTo-FounderUtcDateTime -Value $startTime
  }
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $cimMetadataSource `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $null)
}
Assert-FounderTest 'PID reuse start-time disagreement across metadata sources fails closed' {
  $wrongStartNative = $nativeMetadataSource.PSObject.Copy()
  $wrongStartNative.CreationTimeUtc = (ConvertTo-FounderUtcDateTime -Value $startTime).AddMinutes(2)
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $null `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $wrongStartNative)
}
Assert-FounderTest 'Sub-second process creation disagreement across metadata sources fails closed' {
  $wrongStartNative = $nativeMetadataSource.PSObject.Copy()
  $wrongStartNative.CreationTimeUtc = (ConvertTo-FounderUtcDateTime -Value $startTime).AddTicks(1)
  $null -eq (Merge-FounderProcessMetadataSources `
      -ExpectedProcessId 1234 `
      -CimProcess $null `
      -RuntimeProcess $runtimeMetadataSource `
      -NativeProcess $wrongStartNative)
}
Assert-FounderTest 'Exact process metadata identity accepts the same process' {
  Test-FounderProcessMetadataIdentity -Expected $fallbackMetadata -Observed $fallbackMetadata.PSObject.Copy()
}
Assert-FounderTest 'Stop-time process metadata identity rejects PID reuse' {
  $replacementMetadata = $fallbackMetadata.PSObject.Copy()
  $replacementMetadata.StartTime = (ConvertTo-FounderUtcDateTime -Value $fallbackMetadata.StartTime).AddTicks(1)
  -not (Test-FounderProcessMetadataIdentity -Expected $fallbackMetadata -Observed $replacementMetadata)
}
Assert-FounderTest 'Stop-time process metadata identity rejects command replacement' {
  $replacementMetadata = $fallbackMetadata.PSObject.Copy()
  $replacementMetadata.CommandLine = $otherRepoCommand
  -not (Test-FounderProcessMetadataIdentity -Expected $fallbackMetadata -Observed $replacementMetadata)
}
Assert-FounderTest 'Pinned termination validates and terminates through the same lease' {
  $lease = New-FounderFakeTerminationLease -Metadata $nativeMetadataSource
  $result = Invoke-FounderPinnedProcessTermination -ExpectedMetadata $fallbackMetadata -Lease $lease
  $result.Status -eq 'TERMINATION_REQUESTED' -and
    $lease.TerminateCalls -eq 1 -and
    $lease.Disposed
}
Assert-FounderTest 'PID reuse after validation never terminates the replacement identity' {
  $replacementNative = $nativeMetadataSource.PSObject.Copy()
  $replacementNative.CreationTimeUtc = (ConvertTo-FounderUtcDateTime -Value $startTime).AddTicks(1)
  $lease = New-FounderFakeTerminationLease -Metadata $replacementNative
  $result = Invoke-FounderPinnedProcessTermination -ExpectedMetadata $fallbackMetadata -Lease $lease
  $result.Status -eq 'IDENTITY_MISMATCH' -and
    $lease.TerminateCalls -eq 0 -and
    $lease.Disposed
}
Assert-FounderTest 'Validated process exit before termination leaves replacement untouched' {
  $replacementTerminated = $false
  $lease = New-FounderFakeTerminationLease -Metadata $nativeMetadataSource -TerminationResult 'ALREADY_EXITED'
  $result = Invoke-FounderPinnedProcessTermination -ExpectedMetadata $fallbackMetadata -Lease $lease
  $result.Status -eq 'ALREADY_EXITED' -and
    $lease.TerminateCalls -eq 1 -and
    -not $replacementTerminated -and
    $lease.Disposed
}
Assert-FounderTest 'Fresh PID identity cannot substitute for the pinned termination lease' {
  $freshPidMetadata = $nativeMetadataSource.PSObject.Copy()
  $freshPidMetadata.CommandLine = $otherRepoCommand
  $lease = New-FounderFakeTerminationLease -Metadata $freshPidMetadata
  $result = Invoke-FounderPinnedProcessTermination -ExpectedMetadata $fallbackMetadata -Lease $lease
  $result.Status -eq 'IDENTITY_MISMATCH' -and $lease.TerminateCalls -eq 0
}
Assert-FounderTest 'Pinned termination handle acquisition failure fails closed' {
  $result = Invoke-FounderPinnedProcessTermination -ExpectedMetadata $fallbackMetadata -Lease $null
  $result.Status -eq 'HANDLE_ACQUISITION_FAILED'
}
Assert-FounderTest 'Pinned termination API failure fails closed and cleans the handle' {
  $lease = New-FounderFakeTerminationLease -Metadata $nativeMetadataSource -ThrowOnTermination
  $result = Invoke-FounderPinnedProcessTermination -ExpectedMetadata $fallbackMetadata -Lease $lease
  $result.Status -eq 'TERMINATION_FAILED' -and
    $lease.TerminateCalls -eq 1 -and
    $lease.Disposed
}
Assert-FounderTest 'Pinned termination handle cleanup failure fails closed' {
  $lease = New-FounderFakeTerminationLease -Metadata $nativeMetadataSource -ThrowOnDispose
  $result = Invoke-FounderPinnedProcessTermination -ExpectedMetadata $fallbackMetadata -Lease $lease
  $result.Status -eq 'HANDLE_CLEANUP_FAILED' -and $lease.Disposed
}
Assert-FounderTest 'Native pinned handle has bounded lifetime without terminating its process' {
  $lease = [MyOttFounderPreviewProcessQuery]::AcquireTerminationLease($PID)
  $samePid = $lease.Metadata.ProcessId -eq $PID
  $lease.Dispose()
  $samePid -and $lease.IsDisposed
}
Assert-FounderTest 'Native process query exposes current PID parent command and start identity' {
  $currentNativeMetadata = Get-FounderNativeProcessMetadata -ProcessId $PID
  $null -ne $currentNativeMetadata -and
    $currentNativeMetadata.ProcessId -eq $PID -and
    $currentNativeMetadata.ParentProcessId -gt 0 -and
    -not [string]::IsNullOrWhiteSpace($currentNativeMetadata.CommandLine) -and
    -not [string]::IsNullOrWhiteSpace($currentNativeMetadata.ExecutablePath) -and
    $currentNativeMetadata.CreationTimeUtc -is [datetime]
}
$descendantRelationships = @(Get-FounderProcessDescendantRelationships `
    -ProcessId 10 `
    -ProcessSnapshot @(
      [pscustomobject]@{ ProcessId = 20; ParentProcessId = 10 },
      [pscustomobject]@{ ProcessId = 30; ParentProcessId = 20 },
      [pscustomobject]@{ ProcessId = 40; ParentProcessId = 999 }
    ))
Assert-FounderTest 'Descendant snapshot preserves exact launcher-listener ancestry' {
  $descendantRelationships.Count -eq 2 -and
    $descendantRelationships[0].ProcessId -eq 20 -and
    $descendantRelationships[0].Depth -eq 1 -and
    $descendantRelationships[1].ProcessId -eq 30 -and
    $descendantRelationships[1].Depth -eq 2
}
Assert-FounderTest 'NODE_OPTIONS adds system CA once' {
  (Merge-FounderNodeOptions -CurrentValue '--trace-warnings') -eq '--trace-warnings --use-system-ca'
}
Assert-FounderTest 'NODE_OPTIONS does not duplicate system CA' {
  (Merge-FounderNodeOptions -CurrentValue '--use-system-ca --trace-warnings') -eq '--use-system-ca --trace-warnings'
}
Assert-FounderTest 'State JSON minimum schema validates' {
  Test-FounderStateSchema -State $validState
}
Assert-FounderTest 'Managed state identity validates' {
  Test-FounderStateProcessIdentity -State $validState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath
}
Assert-FounderTest 'JSON round-trip DateTime state identity validates without locale drift' {
  $roundTripState = $validState | ConvertTo-Json | ConvertFrom-Json
  Test-FounderStateProcessIdentity -State $roundTripState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Timezone-equivalent process creation identity remains exact' {
  $utcInstant = [datetimeoffset](ConvertTo-FounderUtcDateTime -Value $startTime)
  $offsetInstant = $utcInstant.ToOffset([timespan]::FromHours(9)).ToString('o')
  Test-FounderProcessCreationIdentityEqual -Left $startTime -Right $offsetInstant
}
Assert-FounderTest 'Listener state creation identity plus one tick is rejected' {
  $changedState = $validState.PSObject.Copy()
  $changedState.listenerStartedAt = (ConvertTo-FounderUtcDateTime -Value $startTime).AddTicks(1).ToString('o')
  -not (Test-FounderStateProcessIdentity -State $changedState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Listener state creation identity minus one tick is rejected' {
  $changedState = $validState.PSObject.Copy()
  $changedState.listenerStartedAt = (ConvertTo-FounderUtcDateTime -Value $startTime).AddTicks(-1).ToString('o')
  -not (Test-FounderStateProcessIdentity -State $changedState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Historical listener state within old two-second tolerance is rejected' {
  $changedState = $validState.PSObject.Copy()
  $changedState.listenerStartedAt = (ConvertTo-FounderUtcDateTime -Value $startTime).AddSeconds(1).ToString('o')
  -not (Test-FounderStateProcessIdentity -State $changedState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'PID reuse start-time mismatch is rejected' {
  $reusedProcess = $processMetadata.PSObject.Copy()
  $reusedProcess.StartTime = (Get-Date).AddMinutes(2).ToUniversalTime().ToString('o')
  -not (Test-FounderStateProcessIdentity -State $validState -ProcessMetadata $reusedProcess -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'State PID mismatch is rejected' {
  $wrongPidState = $validState.PSObject.Copy()
  $wrongPidState.listenerPid = 4321
  -not (Test-FounderStateProcessIdentity -State $wrongPidState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'State host mismatch is rejected' {
  $wrongHostState = $validState.PSObject.Copy()
  $wrongHostState.requestedHost = '0.0.0.0'
  -not (Test-FounderStateProcessIdentity -State $wrongHostState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'State port mismatch is rejected' {
  $wrongPortState = $validState.PSObject.Copy()
  $wrongPortState.requestedPort = 3001
  -not (Test-FounderStateProcessIdentity -State $wrongPortState -ProcessMetadata $processMetadata -RepositoryPath $repositoryPath)
}

$sharedListenerMetadata = $processMetadata.PSObject.Copy()
$sharedListenerMetadata.CommandLine = 'node.exe "C:\primary\node_modules\next\dist\server\lib\start-server.js"'
$targetLauncherMetadata = [pscustomobject]@{
  ProcessId = 1000
  ParentProcessId = 900
  Name = 'node.exe'
  ExecutablePath = 'C:\Program Files\nodejs\node.exe'
  CommandLine = "node.exe `"$($currentRuntime.NextCliPath)`" dev `"$repositoryPath`" --hostname 127.0.0.1 --port 3000"
  StartTime = $startTime
}
$sharedChain = @($sharedListenerMetadata, $targetLauncherMetadata)
$sharedOwnership = Get-FounderProcessOwnershipFromChain `
  -Chain $sharedChain `
  -ProcessId $sharedListenerMetadata.ProcessId `
  -RepositoryPath $repositoryPath
$sharedState = $validState.PSObject.Copy()
$sharedState.launcherPid = $targetLauncherMetadata.ProcessId
$sharedState.launcherStartedAt = $targetLauncherMetadata.StartTime
$unprovenOwnership = Get-FounderProcessOwnershipFromChain `
  -Chain @($sharedListenerMetadata) `
  -ProcessId $sharedListenerMetadata.ProcessId `
  -RepositoryPath $repositoryPath
Assert-FounderTest 'Shared dependency listener accepts canonical target process chain' {
  Test-FounderStateProcessIdentity `
    -State $sharedState `
    -ProcessMetadata $sharedListenerMetadata `
    -RepositoryPath $repositoryPath `
    -Ownership $sharedOwnership
}
Assert-FounderTest 'Next dev without target repository evidence is rejected' {
  -not (Test-FounderStateProcessIdentity `
      -State $validState `
      -ProcessMetadata $sharedListenerMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $unprovenOwnership)
}
Assert-FounderTest 'Node executable alone cannot satisfy shared process identity' {
  $nodeOnlyMetadata = $sharedListenerMetadata.PSObject.Copy()
  $nodeOnlyMetadata.CommandLine = 'node.exe'
  $nodeOnlyOwnership = [pscustomobject]@{ Owned = $false; Chain = @($nodeOnlyMetadata); Process = $nodeOnlyMetadata }
  -not (Test-FounderStateProcessIdentity `
      -State $validState `
      -ProcessMetadata $nodeOnlyMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $nodeOnlyOwnership)
}
Assert-FounderTest 'Injected ownership chain cannot replace current listener command evidence' {
  $currentNodeOnlyMetadata = $sharedListenerMetadata.PSObject.Copy()
  $currentNodeOnlyMetadata.CommandLine = 'node.exe'
  -not (Test-FounderStateProcessIdentity `
      -State $sharedState `
      -ProcessMetadata $currentNodeOnlyMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $sharedOwnership)
}

$nextHelperCommand = "node.exe `"$repositoryPath\scripts\local\next-helper.js`" dev `"$repositoryPath`""
$nextHelperMetadata = [pscustomobject]@{
  ProcessId = 2000
  ParentProcessId = 0
  Name = 'node.exe'
  ExecutablePath = 'C:\Program Files\nodejs\node.exe'
  CommandLine = $nextHelperCommand
  StartTime = $startTime
}
$nextHelperOwnership = Get-FounderProcessOwnershipFromChain `
  -Chain @($nextHelperMetadata) `
  -ProcessId $nextHelperMetadata.ProcessId `
  -RepositoryPath $repositoryPath
$nextHelperState = $validState.PSObject.Copy()
$nextHelperState.launcherPid = $nextHelperMetadata.ProcessId
$nextHelperState.listenerPid = $nextHelperMetadata.ProcessId
$nextHelperState.launcherStartedAt = $nextHelperMetadata.StartTime
$nextHelperState.listenerStartedAt = $nextHelperMetadata.StartTime
Assert-FounderTest 'Review reproducer next-helper command fails direct production predicate' {
  -not (Test-FounderCommandLooksLikeDevServer `
      -CommandLine $nextHelperCommand `
      -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Review reproducer next-helper command cannot prove ownership' {
  -not $nextHelperOwnership.Owned -and $nextHelperOwnership.ProvingProcessId -eq 0
}
Assert-FounderTest 'Review reproducer next-helper command cannot validate managed state' {
  -not (Test-FounderStateProcessIdentity `
      -State $nextHelperState `
      -ProcessMetadata $nextHelperMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $nextHelperOwnership)
}
Assert-FounderTest 'Review reproducer is ineligible for stop and cleanup ownership gates' {
  -not $nextHelperOwnership.Owned -and
    (Get-FounderSyntheticStatusClassification `
      -HasListener $true `
      -Owned $nextHelperOwnership.Owned `
      -Healthy $true `
      -HasState $true `
      -StateValid $false) -eq 'BLOCKED_UNRELATED_PROCESS'
}

$wrongApplicationPath = 'C:\work\another-app'
$envFileDecoyCommand = "node.exe --env-file `"$repositoryPath\.env.local`" `"$($currentRuntime.NextCliPath)`" dev `"$wrongApplicationPath`" --hostname 127.0.0.1 --port 3000"
$envFileDecoyParsed = Get-FounderCanonicalNextDevCommand `
  -CommandLine $envFileDecoyCommand `
  -RepositoryPath $repositoryPath
$envFileDecoyMetadata = [pscustomobject]@{
  ProcessId = 2100
  ParentProcessId = 0
  Name = 'node.exe'
  ExecutablePath = 'C:\Program Files\nodejs\node.exe'
  CommandLine = $envFileDecoyCommand
  StartTime = $startTime
}
$envFileDecoyOwnership = Get-FounderProcessOwnershipFromChain `
  -Chain @($envFileDecoyMetadata) `
  -ProcessId $envFileDecoyMetadata.ProcessId `
  -RepositoryPath $repositoryPath
$envFileDecoyState = $validState.PSObject.Copy()
$envFileDecoyState.launcherPid = $envFileDecoyMetadata.ProcessId
$envFileDecoyState.listenerPid = $envFileDecoyMetadata.ProcessId
$envFileDecoyState.launcherStartedAt = $envFileDecoyMetadata.StartTime
$envFileDecoyState.listenerStartedAt = $envFileDecoyMetadata.StartTime
Assert-FounderTest 'Env-file decoy remains canonical but parses the different application directory' {
  $envFileDecoyParsed.IsCanonical -and
    $envFileDecoyParsed.ApplicationDirectory -eq $wrongApplicationPath -and
    -not $envFileDecoyParsed.ApplicationMatchesTarget
}
Assert-FounderTest 'Env-file target path does not prove process ownership' {
  -not $envFileDecoyOwnership.Owned -and $envFileDecoyOwnership.ProvingProcessId -eq 0
}
Assert-FounderTest 'Env-file decoy cannot validate managed state' {
  -not (Test-FounderStateProcessIdentity `
      -State $envFileDecoyState `
      -ProcessMetadata $envFileDecoyMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $envFileDecoyOwnership)
}
Assert-FounderTest 'Env-file decoy is ineligible for managed stop and cleanup gates' {
  (Get-FounderSyntheticStatusClassification `
      -HasListener $true `
      -Owned $envFileDecoyOwnership.Owned `
      -Healthy $true `
      -HasState $true `
      -StateValid $false) -eq 'BLOCKED_UNRELATED_PROCESS'
}

$targetPathDecoyCommands = @(
  $envFileDecoyCommand,
  "node.exe `"$($currentRuntime.NextCliPath)`" dev `"$wrongApplicationPath`" --hostname `"$repositoryPath`" --port 3000",
  "node.exe `"$($currentRuntime.NextCliPath)`" dev `"$wrongApplicationPath`" --log `"$repositoryPath\preview.log`"",
  "node.exe `"$($currentRuntime.NextCliPath)`" dev `"$wrongApplicationPath`" `"$repositoryPath`"",
  "node.exe `"$repositoryPath\node_modules\next\dist\bin\next`" dev `"$wrongApplicationPath`" --hostname 127.0.0.1 --port 3000",
  "node.exe `"$($currentRuntime.NextCliPath)`" dev `"$wrongApplicationPath`" `"$repositoryPath\quoted-decoy`""
)
Assert-FounderTest 'Target path decoys never prove ownership when parsed application differs' {
  @($targetPathDecoyCommands | Where-Object {
      $metadata = $envFileDecoyMetadata.PSObject.Copy()
      $metadata.CommandLine = $_
      (Get-FounderProcessOwnershipFromChain `
          -Chain @($metadata) `
          -ProcessId $metadata.ProcessId `
          -RepositoryPath $repositoryPath).Owned
    }).Count -eq 0
}

$wrongApplicationDirectories = @(
  $wrongApplicationPath,
  "$repositoryPath-copy",
  "$repositoryPath-old",
  "$repositoryPath`2",
  (Join-Path $repositoryPath 'child'),
  'C:\Users\cnd10\OneDrive\문서\Myott'
)
Assert-FounderTest 'All wrong application directories fail exact target matching and ownership' {
  @($wrongApplicationDirectories | Where-Object {
      $command = "node.exe `"$($currentRuntime.NextCliPath)`" dev `"$_`" --hostname 127.0.0.1 --port 3000"
      $parsed = Get-FounderCanonicalNextDevCommand -CommandLine $command -RepositoryPath $repositoryPath
      $metadata = $envFileDecoyMetadata.PSObject.Copy()
      $metadata.CommandLine = $command
      $owned = (Get-FounderProcessOwnershipFromChain `
          -Chain @($metadata) `
          -ProcessId $metadata.ProcessId `
          -RepositoryPath $repositoryPath).Owned
      -not $parsed.IsCanonical -or $parsed.ApplicationMatchesTarget -or $owned
    }).Count -eq 0
}
Assert-FounderTest 'Canonical Next command without explicit application directory fails closed' {
  $missingApplication = "node.exe `"$($currentRuntime.NextCliPath)`" dev --hostname 127.0.0.1 --port 3000"
  $parsed = Get-FounderCanonicalNextDevCommand -CommandLine $missingApplication -RepositoryPath $repositoryPath
  -not $parsed.IsCanonical -and -not $parsed.ApplicationMatchesTarget
}

$nearMissCommands = @(
  $nextHelperCommand,
  "node.exe `"$repositoryPath\scripts\local\next-wrapper.js`" dev `"$repositoryPath`"",
  "my-next dev `"$repositoryPath`"",
  "notnext dev `"$repositoryPath`"",
  "nextdev `"$repositoryPath`"",
  "next-helper.cmd dev `"$repositoryPath`"",
  "node.exe `"$repositoryPath\node_modules\next-old\dist\bin\next`" dev `"$repositoryPath`"",
  "node.exe `"$repositoryPath\scripts\next`" dev `"$repositoryPath`"",
  "node.exe `"$($currentRuntime.NextCliPath)`" build `"$repositoryPath`"",
  "node.exe `"$($currentRuntime.NextCliPath)`" dev-helper `"$repositoryPath`"",
  "node.exe `"$repositoryPath\scripts\some-script-next.js`" dev `"$repositoryPath`""
)
Assert-FounderTest 'All noncanonical Next-like near-miss commands are rejected' {
  @($nearMissCommands | Where-Object {
      Test-FounderCommandLooksLikeDevServer -CommandLine $_ -RepositoryPath $repositoryPath
    }).Count -eq 0
}

$targetOnlyAncestor = $targetLauncherMetadata.PSObject.Copy()
$targetOnlyAncestor.CommandLine = "node.exe `"$repositoryPath\scripts\local\launcher.js`""
$splitNextOnlyListener = $sharedListenerMetadata.PSObject.Copy()
$splitNextOnlyListener.CommandLine = "node.exe `"$($currentRuntime.NextCliPath)`" dev `"C:\work\another-app`""
$splitChain = @($splitNextOnlyListener, $targetOnlyAncestor)
$splitOwnership = Get-FounderProcessOwnershipFromChain `
  -Chain $splitChain `
  -ProcessId $splitNextOnlyListener.ProcessId `
  -RepositoryPath $repositoryPath
Assert-FounderTest 'Split-process repository and Next evidence is rejected' {
  -not $splitOwnership.Owned -and
    $splitOwnership.Reason -eq 'split-process-repository-and-next-dev-evidence-rejected' -and
    $splitOwnership.ProvingProcessId -eq 0
}
Assert-FounderTest 'Split-process evidence cannot validate managed state' {
  -not (Test-FounderStateProcessIdentity `
      -State $sharedState `
      -ProcessMetadata $splitNextOnlyListener `
      -RepositoryPath $repositoryPath `
      -Ownership $splitOwnership)
}
Assert-FounderTest 'Same-process proving launcher is derived by production ownership helper' {
  $sharedOwnership.Owned -and
    $sharedOwnership.ProvingProcessId -eq $targetLauncherMetadata.ProcessId -and
    $sharedOwnership.ListenerDescendsFromProvingProcess
}
Assert-FounderTest 'Parent created after child cannot prove listener ancestry' {
  $reusedParent = $targetLauncherMetadata.PSObject.Copy()
  $reusedParent.StartTime = (ConvertTo-FounderUtcDateTime -Value $sharedListenerMetadata.StartTime).AddTicks(1)
  $reusedParentOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($sharedListenerMetadata, $reusedParent) `
    -ProcessId $sharedListenerMetadata.ProcessId `
    -RepositoryPath $repositoryPath
  -not $reusedParentOwnership.Owned -and
    -not $reusedParentOwnership.ListenerDescendsFromProvingProcess
}
Assert-FounderTest 'State launcher PID mismatch is rejected' {
  $wrongLauncherState = $sharedState.PSObject.Copy()
  $wrongLauncherState.launcherPid = 9999
  -not (Test-FounderStateProcessIdentity `
      -State $wrongLauncherState `
      -ProcessMetadata $sharedListenerMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $sharedOwnership)
}
Assert-FounderTest 'State launcher start-time mismatch is rejected' {
  $wrongLauncherStartState = $sharedState.PSObject.Copy()
  $wrongLauncherStartState.launcherStartedAt = (Get-Date).AddMinutes(2).ToUniversalTime().ToString('o')
  -not (Test-FounderStateProcessIdentity `
      -State $wrongLauncherStartState `
      -ProcessMetadata $sharedListenerMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $sharedOwnership)
}
Assert-FounderTest 'Ownership listener creation identity one-tick mismatch is rejected' {
  $changedListener = $sharedListenerMetadata.PSObject.Copy()
  $changedListener.StartTime = (ConvertTo-FounderUtcDateTime -Value $sharedListenerMetadata.StartTime).AddTicks(1).ToString('o')
  $changedOwnership = [pscustomobject]@{
    Owned = $sharedOwnership.Owned
    Chain = @($changedListener, $targetLauncherMetadata)
    Process = $changedListener
  }
  -not (Test-FounderStateProcessIdentity `
      -State $sharedState `
      -ProcessMetadata $sharedListenerMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $changedOwnership)
}
Assert-FounderTest 'Launcher state creation identity one-tick mismatch is rejected' {
  $changedState = $sharedState.PSObject.Copy()
  $changedState.launcherStartedAt = (ConvertTo-FounderUtcDateTime -Value $targetLauncherMetadata.StartTime).AddTicks(1).ToString('o')
  -not (Test-FounderStateProcessIdentity `
      -State $changedState `
      -ProcessMetadata $sharedListenerMetadata `
      -RepositoryPath $repositoryPath `
      -Ownership $sharedOwnership)
}
Assert-FounderTest 'Listener outside proving launcher ancestry is rejected' {
  $unrelatedListener = $sharedListenerMetadata.PSObject.Copy()
  $unrelatedListener.ParentProcessId = 7777
  $brokenChainOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($unrelatedListener, $targetLauncherMetadata) `
    -ProcessId $unrelatedListener.ProcessId `
    -RepositoryPath $repositoryPath
  -not $brokenChainOwnership.Owned -and -not $brokenChainOwnership.ListenerDescendsFromProvingProcess
}
Assert-FounderTest 'Target path without Next dev evidence is rejected' {
  $targetOnlyOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($targetOnlyAncestor) `
    -ProcessId $targetOnlyAncestor.ProcessId `
    -RepositoryPath $repositoryPath
  -not $targetOnlyOwnership.Owned
}
Assert-FounderTest 'Unrelated Next process is rejected' {
  $otherProcess = $sharedListenerMetadata.PSObject.Copy()
  $otherProcess.CommandLine = $otherRepoCommand
  $otherOwnership = Get-FounderProcessOwnershipFromChain `
    -Chain @($otherProcess) `
    -ProcessId $otherProcess.ProcessId `
    -RepositoryPath $repositoryPath
  -not $otherOwnership.Owned
}
Assert-FounderTest 'Stale state classification' {
  (Get-FounderSyntheticStatusClassification -HasListener $false -Owned $false -Healthy $false -HasState $true -StateValid $false) -eq 'STALE_STATE'
}
Assert-FounderTest 'Managed process classification' {
  (Get-FounderSyntheticStatusClassification -HasListener $true -Owned $true -Healthy $true -HasState $true -StateValid $true) -eq 'RUNNING_MANAGED'
}
Assert-FounderTest 'Unmanaged owned process classification' {
  (Get-FounderSyntheticStatusClassification -HasListener $true -Owned $true -Healthy $true -HasState $false -StateValid $false) -eq 'RUNNING_OWNED_UNMANAGED'
}
Assert-FounderTest 'Unrelated process classification' {
  (Get-FounderSyntheticStatusClassification -HasListener $true -Owned $false -Healthy $true -HasState $false -StateValid $false) -eq 'BLOCKED_UNRELATED_PROCESS'
}
Assert-FounderTest 'Exit code contract is complete' {
  $codes = Get-FounderPreviewExitCodes
  $codes.Pass -eq 0 -and $codes.PortConflict -eq 2 -and $codes.LockTimeout -eq 6 -and $codes.ValidationFailedRestoreFailed -eq 8
}
Assert-FounderTest 'URL is exactly the Founder endpoint' {
  $config.Url -eq 'http://127.0.0.1:3000'
}
Assert-FounderTest 'Automatic port increment is absent from allocation policy' {
  (Test-FounderPortCanBeAllocated -Port 3000 -Config $config) -and
    -not (Test-FounderPortCanBeAllocated -Port 3101 -Config $config)
}
Assert-FounderTest 'Exact quoted repository argument matches' {
  Test-FounderCommandLineReferencesRepository `
    -CommandLine "pnpm --dir `"$repositoryPath`" exec next dev" `
    -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Repository internal Next path matches' {
  Test-FounderCommandLineReferencesRepository `
    -CommandLine "node `"$repositoryPath\node_modules\next\dist\bin\next`" dev" `
    -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Forward slash repository path matches' {
  $forwardPath = $repositoryPath.Replace('\', '/')
  Test-FounderCommandLineReferencesRepository `
    -CommandLine "node `"$forwardPath/node_modules/next/dist/bin/next`" dev" `
    -RepositoryPath $repositoryPath
}
Assert-FounderTest 'Myott-copy path collision is rejected' {
  -not (Test-FounderCommandLineReferencesRepository -CommandLine "node `"$repositoryPath-copy\node_modules\next\dist\bin\next`" dev" -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Myott-old path collision is rejected' {
  -not (Test-FounderCommandLineReferencesRepository -CommandLine "node `"$repositoryPath-old\node_modules\next\dist\bin\next`" dev" -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Myott-test path collision is rejected' {
  -not (Test-FounderCommandLineReferencesRepository -CommandLine "node `"$repositoryPath-test\node_modules\next\dist\bin\next`" dev" -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'Myott2 path collision is rejected' {
  -not (Test-FounderCommandLineReferencesRepository -CommandLine "node `"$($repositoryPath)2\node_modules\next\dist\bin\next`" dev" -RepositoryPath $repositoryPath)
}
Assert-FounderTest 'MyottBackup path collision is rejected' {
  -not (Test-FounderCommandLineReferencesRepository -CommandLine "node `"$($repositoryPath)Backup\node_modules\next\dist\bin\next`" dev" -RepositoryPath $repositoryPath)
}

$matchingIdentity = [pscustomobject]@{
  RepositoryPath = $repositoryPath
  CommonDirectory = (Join-Path $repositoryPath '.git')
  Remote = 'https://github.com/cnd1026/myott.git'
}
$linkedIdentity = [pscustomobject]@{
  RepositoryPath = "$repositoryPath-linked"
  CommonDirectory = (Join-Path $repositoryPath '.git')
  Remote = 'https://github.com/cnd1026/myott.git'
}
$differentIdentity = [pscustomobject]@{
  RepositoryPath = 'C:\work\other'
  CommonDirectory = 'C:\work\other\.git'
  Remote = 'https://github.com/example/other.git'
}
Assert-FounderTest 'Same Git common directory and remote prove linked-worktree identity' {
  Test-FounderGitRepositoryIdentityEqual -Left $matchingIdentity -Right $linkedIdentity
}
Assert-FounderTest 'Different Git repository dependency source is rejected' {
  -not (Test-FounderGitRepositoryIdentityEqual -Left $matchingIdentity -Right $differentIdentity)
}

$matchingContract = [pscustomobject]@{ Next = '^15.3.4'; React = '^19.0.0'; ReactDom = '^19.0.0' }
$incompatibleContract = [pscustomobject]@{ Next = '^16.0.0'; React = '^19.0.0'; ReactDom = '^19.0.0' }
$installedRuntime = [pscustomobject]@{ NextVersion = '15.5.19'; ReactVersion = '19.2.7'; ReactDomVersion = '19.2.7' }
Assert-FounderTest 'Target-local dependency contract is compatible' {
  Test-FounderDependencyContractCompatible `
    -TargetContract $matchingContract `
    -SourceContract $matchingContract `
    -InstalledRuntime $installedRuntime
}
Assert-FounderTest 'Incompatible dependency contract is rejected' {
  -not (Test-FounderDependencyContractCompatible `
      -TargetContract $matchingContract `
      -SourceContract $incompatibleContract `
      -InstalledRuntime $installedRuntime)
}
Assert-FounderTest 'Installed Next 15.5.19 satisfies caret 15.3.4' {
  Test-FounderSemanticVersionSatisfiesRange -Range '^15.3.4' -InstalledVersion '15.5.19'
}
Assert-FounderTest 'Installed React 19.2.7 satisfies caret 19.0.0' {
  Test-FounderSemanticVersionSatisfiesRange -Range '^19.0.0' -InstalledVersion '19.2.7'
}
Assert-FounderTest 'Installed 0.0.1 is rejected for caret 15.3.4' {
  -not (Test-FounderSemanticVersionSatisfiesRange -Range '^15.3.4' -InstalledVersion '0.0.1')
}
Assert-FounderTest 'Installed 0.0.1 is rejected for caret 19.0.0' {
  -not (Test-FounderSemanticVersionSatisfiesRange -Range '^19.0.0' -InstalledVersion '0.0.1')
}
Assert-FounderTest 'Actual compatibility rejects all installed 0.0.1 versions' {
  $invalidInstalledRuntime = [pscustomobject]@{ NextVersion = '0.0.1'; ReactVersion = '0.0.1'; ReactDomVersion = '0.0.1' }
  -not (Test-FounderDependencyContractCompatible `
      -TargetContract $matchingContract `
      -SourceContract $matchingContract `
      -InstalledRuntime $invalidInstalledRuntime)
}
Assert-FounderTest 'Caret lower and next-major boundaries are enforced' {
  (Test-FounderSemanticVersionSatisfiesRange -Range '^15.3.4' -InstalledVersion '15.3.4') -and
    -not (Test-FounderSemanticVersionSatisfiesRange -Range '^15.3.4' -InstalledVersion '15.3.3') -and
    -not (Test-FounderSemanticVersionSatisfiesRange -Range '^15.3.4' -InstalledVersion '16.0.0')
}
Assert-FounderTest 'Zero-major caret boundaries are enforced' {
  (Test-FounderSemanticVersionSatisfiesRange -Range '^0.2.3' -InstalledVersion '0.2.9') -and
    -not (Test-FounderSemanticVersionSatisfiesRange -Range '^0.2.3' -InstalledVersion '0.3.0') -and
    (Test-FounderSemanticVersionSatisfiesRange -Range '^0.0.3' -InstalledVersion '0.0.3') -and
    -not (Test-FounderSemanticVersionSatisfiesRange -Range '^0.0.3' -InstalledVersion '0.0.4')
}
Assert-FounderTest 'Malformed and prerelease installed versions fail closed' {
  -not (Test-FounderSemanticVersionSatisfiesRange -Range '^15.3.4' -InstalledVersion '15.5') -and
    -not (Test-FounderSemanticVersionSatisfiesRange -Range '^15.3.4' -InstalledVersion '15.5.19-beta.1')
}
Assert-FounderTest 'Unsupported and malformed ranges fail closed' {
  -not (Test-FounderSemanticVersionSatisfiesRange -Range '>=15.3.4' -InstalledVersion '15.5.19') -and
    -not (Test-FounderSemanticVersionSatisfiesRange -Range '^15.3' -InstalledVersion '15.5.19')
}

$resolvedRuntime = Resolve-FounderRuntime -RepositoryPath $repositoryPath
Assert-FounderTest 'Current linked worktree resolves a verified canonical runtime' {
  $resolvedRuntime.DependencySourceClassification -in @(
    'TARGET_LOCAL_DEPENDENCIES',
    'SAME_REPOSITORY_SHARED_DEPENDENCIES'
  ) -and
    (Test-Path -LiteralPath $resolvedRuntime.NextCliPath) -and
    $resolvedRuntime.NextVersion -eq '15.5.19' -and
    $resolvedRuntime.DependencyCompatibility.Compatible
}
Assert-FounderTest 'Current linked worktree uses same-repository primary env fallback classification' {
  $resolvedRuntime.EnvironmentSourceClassification -eq 'SAME_REPOSITORY_PRIMARY_ENV'
}

$environmentTestRoot = Join-Path $env:TEMP "myott-founder-env-selftest-$PID"
$environmentTarget = Join-Path $environmentTestRoot 'target'
$environmentPrimary = Join-Path $environmentTestRoot 'primary'
try {
  New-Item -ItemType Directory -Path $environmentTarget, $environmentPrimary -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $environmentTarget '.env.local') -Value '' -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $environmentPrimary '.env.local') -Value '' -Encoding UTF8
  $targetEnvironment = Get-FounderEnvironmentSource `
    -TargetRepositoryPath $environmentTarget `
    -PrimaryRepositoryPath $environmentPrimary `
    -SameRepository $true
  Remove-Item -LiteralPath (Join-Path $environmentTarget '.env.local') -Force
  $primaryEnvironment = Get-FounderEnvironmentSource `
    -TargetRepositoryPath $environmentTarget `
    -PrimaryRepositoryPath $environmentPrimary `
    -SameRepository $true
  Assert-FounderTest 'Target env source wins when present' {
    $targetEnvironment.Classification -eq 'TARGET_LOCAL_ENV' -and [string]::IsNullOrWhiteSpace($targetEnvironment.Path)
  }
  Assert-FounderTest 'Same-repository primary env is classified without reading contents' {
    $primaryEnvironment.Classification -eq 'SAME_REPOSITORY_PRIMARY_ENV' -and
      $primaryEnvironment.Path -eq (Join-Path $environmentPrimary '.env.local')
  }
} finally {
  Remove-Item -LiteralPath $environmentTestRoot -Recurse -Force -ErrorAction SilentlyContinue
}

$unicodeTestRoot = Join-Path $env:TEMP ("myott-founder-unicode-selftest-{0}-{1}" -f $PID, [guid]::NewGuid().ToString('N'))
$unicodePrimarySegment = -join @(
  [char]0xD55C, [char]0xAE00, [char]0xACBD, [char]0xB85C
)
$unicodeTargetSegment = -join @(
  [char]0xC5F0, [char]0xACB0, [char]0xC791,
  [char]0xC5C5, [char]0xD2B8, [char]0xB9AC
)
$unicodePrimary = Join-Path (Join-Path $unicodeTestRoot $unicodePrimarySegment) 'repo'
$unicodeTarget = Join-Path $unicodeTestRoot $unicodeTargetSegment
$normalizedTempRoot = Normalize-FounderRepositoryPath -Path $env:TEMP
$normalizedUnicodeTestRoot = Normalize-FounderRepositoryPath -Path $unicodeTestRoot
if (-not $normalizedUnicodeTestRoot.StartsWith(
    "$normalizedTempRoot\",
    [System.StringComparison]::OrdinalIgnoreCase
  )) {
  throw 'Unicode self-test root must stay inside the process temporary directory.'
}

$unicodeTargetIdentity = $null
$unicodePrimaryIdentity = $null
$unicodeResolvedPrimary = ''
$unicodeSameRepository = $false
$unicodeEnvironment = $null
$unicodeHostEncodingRestored = $false
try {
  New-Item -ItemType Directory -Path $unicodePrimary -Force | Out-Null
  & git init --quiet -b main $unicodePrimary 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Unicode self-test Git initialization failed.' }
  & git -C $unicodePrimary remote add origin https://example.invalid/myott-unicode-selftest.git 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Unicode self-test remote identity setup failed.' }
  Set-Content -LiteralPath (Join-Path $unicodePrimary 'README.md') -Value 'unicode path self-test' -Encoding ASCII
  & git -C $unicodePrimary add README.md 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Unicode self-test Git staging failed.' }
  & git -C $unicodePrimary -c user.name=MyOTT-Selftest -c user.email=selftest@invalid commit --quiet -m initial 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Unicode self-test Git commit failed.' }
  & git -C $unicodePrimary worktree add --quiet -b unicode-selftest $unicodeTarget 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Unicode self-test linked worktree creation failed.' }
  New-Item -ItemType File -Path (Join-Path $unicodePrimary '.env.local') -Force | Out-Null

  $previousSelftestEncoding = [Console]::OutputEncoding
  try {
    [Console]::OutputEncoding = [System.Text.Encoding]::ASCII
    $unicodeTargetIdentity = Get-FounderGitRepositoryIdentity -RepositoryPath $unicodeTarget
    $unicodeResolvedPrimary = Get-FounderPrimaryWorktreePath -RepositoryIdentity $unicodeTargetIdentity
    $unicodePrimaryIdentity = Get-FounderGitRepositoryIdentity -RepositoryPath $unicodeResolvedPrimary
    $unicodeSameRepository = Test-FounderGitRepositoryIdentityEqual `
      -Left $unicodeTargetIdentity `
      -Right $unicodePrimaryIdentity
    $unicodeEnvironment = Get-FounderEnvironmentSource `
      -TargetRepositoryPath $unicodeTarget `
      -PrimaryRepositoryPath $unicodeResolvedPrimary `
      -SameRepository $unicodeSameRepository
    $unicodeHostEncodingRestored = [Console]::OutputEncoding.CodePage -eq [System.Text.Encoding]::ASCII.CodePage
  } finally {
    [Console]::OutputEncoding = $previousSelftestEncoding
  }
} finally {
  if ((Test-Path -LiteralPath $unicodeTestRoot) -and
    $normalizedUnicodeTestRoot.StartsWith("$normalizedTempRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $unicodeTestRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Assert-FounderTest 'Unicode linked-worktree repository path survives non-UTF8 host output encoding' {
  $null -ne $unicodeTargetIdentity -and
    (Test-FounderRepositoryPathEqual -Left $unicodeTargetIdentity.RepositoryPath -Right $unicodeTarget)
}
Assert-FounderTest 'Unicode linked-worktree common directory resolves to the exact primary Git directory' {
  $null -ne $unicodeTargetIdentity -and
    (Test-FounderRepositoryPathEqual `
      -Left $unicodeTargetIdentity.CommonDirectory `
      -Right (Join-Path $unicodePrimary '.git'))
}
Assert-FounderTest 'Unicode linked-worktree primary path and same-repository identity resolve exactly' {
  (Test-FounderRepositoryPathEqual -Left $unicodeResolvedPrimary -Right $unicodePrimary) -and
    $unicodeSameRepository
}
Assert-FounderTest 'Unicode linked-worktree inherits primary env without copying contents' {
  $null -ne $unicodeEnvironment -and
    $unicodeEnvironment.Classification -eq 'SAME_REPOSITORY_PRIMARY_ENV' -and
    (Test-FounderRepositoryPathEqual `
      -Left $unicodeEnvironment.Path `
      -Right (Join-Path $unicodePrimary '.env.local'))
}
Assert-FounderTest 'Unicode-safe Git invocation restores the caller output encoding' {
  $unicodeHostEncodingRestored
}

$ownedEntry = [pscustomobject]@{ Port = 3001; ProcessId = 101; Owned = $true }
$failedEntry = [pscustomobject]@{ Port = 3002; ProcessId = 102; Reason = 'injected-stop-failure' }
$unrelatedEntry = [pscustomobject]@{ Port = 3003; ProcessId = 103; Owned = $false }
$cleanupSuccess = New-FounderCleanupResult -Stopped @($ownedEntry) -ExitCodes $config.ExitCodes
$cleanupFailed = New-FounderCleanupResult -Failed @($failedEntry) -ExitCodes $config.ExitCodes
$cleanupResidual = New-FounderCleanupResult -RemainingOwned @($ownedEntry) -ExitCodes $config.ExitCodes
$cleanupUnrelated = New-FounderCleanupResult -Unrelated @($unrelatedEntry) -RemainingUnrelated @($unrelatedEntry) -ExitCodes $config.ExitCodes

Assert-FounderTest 'Owned temporary listener stop success remains successful' {
  $cleanupSuccess.Success -and $cleanupSuccess.Stopped.Count -eq 1
}
Assert-FounderTest 'Owned temporary listener stop failure fails cleanup' {
  -not $cleanupFailed.Success -and $cleanupFailed.Status -eq 'CLEANUP_FAILED'
}
Assert-FounderTest 'Listener residual after stop fails cleanup' {
  -not $cleanupResidual.Success -and $cleanupResidual.RemainingOwned.Count -eq 1
}
Assert-FounderTest 'Failed list prevents cleanup success' {
  -not (Test-FounderCleanupGate -CleanupResult $cleanupFailed)
}
Assert-FounderTest 'Remaining owned list prevents cleanup success' {
  -not (Test-FounderCleanupGate -CleanupResult $cleanupResidual)
}
Assert-FounderTest 'Unrelated listener only preserves cleanup success' {
  $cleanupUnrelated.Success -and $cleanupUnrelated.RemainingUnrelated.Count -eq 1
}
Assert-FounderTest 'Unrelated listener only makes preflight ready with warnings' {
  (Get-FounderPreflightCleanupStatus -CleanupResult $cleanupUnrelated) -eq 'READY_WITH_WARNINGS'
}
Assert-FounderTest 'Owned residual makes preflight cleanup fail' {
  (Get-FounderPreflightCleanupStatus -CleanupResult $cleanupResidual) -eq 'CLEANUP_FAILED'
}
Assert-FounderTest 'Owned residual blocks finalize cleanup gate' {
  -not (Test-FounderCleanupGate -CleanupResult $cleanupResidual)
}
Assert-FounderTest 'Cleanup result exposes all six result lists' {
  $cleanupSuccess.PSObject.Properties['Stopped'] -and
    $cleanupSuccess.PSObject.Properties['WouldStop'] -and
    $cleanupSuccess.PSObject.Properties['Failed'] -and
    $cleanupSuccess.PSObject.Properties['Unrelated'] -and
    $cleanupSuccess.PSObject.Properties['RemainingOwned'] -and
    $cleanupSuccess.PSObject.Properties['RemainingUnrelated']
}
Assert-FounderTest 'Cleanup failure uses dedicated exit code' {
  $cleanupFailed.ExitCode -eq 9
}

$otherConfig = Get-FounderPreviewConfig -RepositoryPath "$repositoryPath-copy"
Assert-FounderTest 'Different repositories have different state directories' {
  $config.RuntimeRoot -ne $otherConfig.RuntimeRoot -and $config.StatePath -ne $otherConfig.StatePath
}
Assert-FounderTest 'Different repositories share the global port mutex' {
  $config.MutexName -eq $otherConfig.MutexName -and $config.MutexName -eq 'Local\MyOTTFounderPreview_Port3000'
}
Assert-FounderTest 'Different repositories have different log paths' {
  $config.StdoutLogPath -ne $otherConfig.StdoutLogPath -and $config.StderrLogPath -ne $otherConfig.StderrLogPath
}
Assert-FounderTest 'Global lock diagnostic path is shared' {
  $config.LockInfoPath -eq $otherConfig.LockInfoPath
}

Assert-FounderTest 'Legacy current repository state is migration eligible' {
  (Get-FounderLegacyStateMigrationDecision -LegacyState $validState -Config $config -ProcessMetadata $processMetadata) -eq 'MIGRATE_CURRENT_REPOSITORY'
}
Assert-FounderTest 'Legacy different repository state is preserved' {
  $differentState = $validState.PSObject.Copy()
  $differentState.repositoryPath = "$repositoryPath-copy"
  (Get-FounderLegacyStateMigrationDecision -LegacyState $differentState -Config $config -ProcessMetadata $processMetadata) -eq 'PRESERVE_DIFFERENT_REPOSITORY'
}
Assert-FounderTest 'Legacy invalid process identity is preserved' {
  (Get-FounderLegacyStateMigrationDecision -LegacyState $validState -Config $config -ProcessMetadata $null) -eq 'PRESERVE_INVALID_STATE'
}

$gitInfo = [pscustomobject]@{
  Branch = 'main'
  Commit = 'abc123def456'
  Remote = 'https://github.com/cnd1026/myott.git'
}
$launcherMetadata = [pscustomobject]@{
  ProcessId = 1000
  StartTime = $startTime
}
$adoptedState = New-FounderStateRecord `
  -Config $config `
  -ListenerMetadata $processMetadata `
  -LauncherMetadata $launcherMetadata `
  -LauncherPid 1000 `
  -Command $repoCommand `
  -GitInfo $gitInfo `
  -AdoptedExistingServer
$directState = New-FounderStateRecord `
  -Config $config `
  -ListenerMetadata $processMetadata `
  -LauncherMetadata $launcherMetadata `
  -LauncherPid 1000 `
  -Command $repoCommand `
  -GitInfo $gitInfo

Assert-FounderTest 'Adopted server commitAtStart remains unknown' {
  $adoptedState.commitAtStart -eq ''
}
Assert-FounderTest 'Adopted server records commitAtAdoption' {
  $adoptedState.commitAtAdoption -eq $gitInfo.Commit
}
Assert-FounderTest 'Adopted server records adoptedAt and flag' {
  $adoptedState.adoptedExistingServer -and -not [string]::IsNullOrWhiteSpace($adoptedState.adoptedAt)
}
Assert-FounderTest 'Directly started server records commitAtStart' {
  $directState.commitAtStart -eq $gitInfo.Commit -and -not $directState.adoptedExistingServer
}

$allowedQaTree = Test-FounderQaReadyWorkingTree -Entries @(
  '?? docs/project/QA_CHECKLIST.md',
  '?? docs/project/QA_CHECKLIST.pdf'
)
$trackedDirtyTree = Test-FounderQaReadyWorkingTree -Entries @(' M README.md')
$unexpectedTree = Test-FounderQaReadyWorkingTree -Entries @('?? src/debug.js')
$stagedTree = Test-FounderQaReadyWorkingTree -Entries @('M  package.json')

Assert-FounderTest 'QA Ready accepts only the two QA checklist files' {
  $allowedQaTree.Success -and $allowedQaTree.AllowedEntries.Count -eq 2
}
Assert-FounderTest 'QA Ready rejects tracked modification' {
  -not $trackedDirtyTree.Success -and $trackedDirtyTree.Status -eq 'BLOCKED_DIRTY_WORKTREE'
}
Assert-FounderTest 'QA Ready rejects unexpected untracked code file' {
  -not $unexpectedTree.Success
}
Assert-FounderTest 'QA Ready rejects staged files' {
  -not $stagedTree.Success
}
Assert-FounderTest 'QA Ready dirty tree uses dedicated exit code' {
  $config.ExitCodes.QaReadyDirtyWorktree -eq 10
}
Assert-FounderTest 'Repository state schema version is current' {
  $config.SchemaVersion -eq 2
}
Assert-FounderTest 'Repository runtime remains below the shared base root' {
  $config.RuntimeRoot.StartsWith($config.BaseRuntimeRoot, [System.StringComparison]::OrdinalIgnoreCase)
}

Write-Host ''
Write-Host "Founder Preview self-test: $passed passed, $failed failed."
if ($failed -gt 0) {
  $failures | ForEach-Object { Write-Host "  $_" }
  exit 1
}

exit 0
