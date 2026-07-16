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

Write-Host ''
Write-Host "Founder Preview self-test: $passed passed, $failed failed."
if ($failed -gt 0) {
  $failures | ForEach-Object { Write-Host "  $_" }
  exit 1
}

exit 0
