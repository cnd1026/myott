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

$repoCommand = "node.exe `"$repositoryPath\node_modules\next\dist\bin\next`" dev --hostname 127.0.0.1 --port 3000"
$otherRepoCommand = 'node.exe "C:\work\another-app\node_modules\next\dist\bin\next" dev --port 3000'
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
  launcherPid = 1000
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
Assert-FounderTest 'PID reuse start-time mismatch is rejected' {
  $reusedProcess = $processMetadata.PSObject.Copy()
  $reusedProcess.StartTime = (Get-Date).AddMinutes(2).ToUniversalTime().ToString('o')
  -not (Test-FounderStateProcessIdentity -State $validState -ProcessMetadata $reusedProcess -RepositoryPath $repositoryPath)
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
