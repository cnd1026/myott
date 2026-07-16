param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('status', 'start', 'stop', 'restart', 'ensure', 'cleanup', 'verify', 'preflight', 'finalize', 'qa-ready', 'build', 'check', 'selftest')]
  [string]$Action,
  [switch]$DryRun,
  [int]$LockTimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path

. (Join-Path $scriptDirectory 'FounderPreview.Common.ps1')

$repositoryPath = Normalize-FounderRepositoryPath -Path (Join-Path $scriptDirectory '..\..')
$config = Get-FounderPreviewConfig -RepositoryPath $repositoryPath
$exitCode = $config.ExitCodes.GeneralFailure
$result = $null
$lock = $null

function Write-ActionResult {
  param($Value)
  if ($null -eq $Value) {
    return
  }

  Write-Host "Action: $Action"
  Write-Host "Result: $($Value.Status)"
  if ($null -ne $Value.PSObject.Properties['Details'] -and $null -ne $Value.Details) {
    if ($Value.Details.PSObject.Properties['Status'] -and $Value.Details.Status -is [string]) {
      Write-Host "Details Status: $($Value.Details.Status)"
    }
  }
}

function Write-CleanupResult {
  param($Cleanup)
  if ($null -eq $Cleanup) {
    return
  }
  foreach ($entry in @($Cleanup.WouldStop)) {
    Write-Host "Would stop MyOTT listener: port $($entry.Port), PID $($entry.ProcessId)"
  }
  foreach ($entry in @($Cleanup.Stopped)) {
    Write-Host "Stopped MyOTT listener: port $($entry.Port), PID $($entry.ProcessId)"
  }
  foreach ($entry in @($Cleanup.Failed)) {
    Write-Host "Failed to stop MyOTT listener: port $($entry.Port), PID $($entry.ProcessId), reason=$($entry.Reason)"
  }
  foreach ($entry in @($Cleanup.RemainingOwned)) {
    Write-Host "Remaining owned MyOTT listener: port $($entry.Port), PID $($entry.ProcessId)"
  }
  foreach ($entry in @($Cleanup.RemainingUnrelated)) {
    Write-Host "Remaining unrelated listener: port $($entry.Port), PID $($entry.ProcessId)"
  }
}

function Write-QaReadyResult {
  param($Value)
  if ($null -eq $Value -or $null -eq $Value.PSObject.Properties['Details']) {
    return
  }
  $details = $Value.Details
  if ($null -eq $details.PSObject.Properties['Status'] -or $null -eq $details.PSObject.Properties['Verify']) {
    return
  }
  Write-Host "Status: $($Value.Status)"
  Write-Host "URL: $($details.Status.Url)"
  Write-Host "Branch: $($details.Git.Branch)"
  Write-Host "Commit: $($details.Git.Commit)"
  Write-Host "Working Tree: $($details.Worktree.Status)"
  Write-Host "Listener PID: $($details.Status.ListenerPid)"
  Write-Host "Launcher PID: $($details.Status.LauncherPid)"
  Write-Host "Root HTTP: $($details.Verify.RootHttp)"
  Write-Host "API HTTP: $($details.Verify.ApiHttp)"
  Write-Host "Provider: $($details.Verify.Provider)"
  Write-Host "Data Source: $($details.Verify.DataSource)"
  Write-Host "Fallback: $($details.Verify.FallbackUsed)"
  Write-Host "Result Count: $($details.Verify.ResultCount)"
  Write-Host "Mock Mixed: $($details.Verify.MockMixed)"
  Write-Host "TLS Error: $($details.Verify.TlsError)"
  Write-Host "Remaining Owned Temporary Listener: $(@($details.RemainingOwned).Count)"
  Write-Host "Remaining Unrelated Listener: $(@($details.RemainingUnrelated).Count)"
  Write-Host "stdout: $($details.Status.StdoutLog)"
  Write-Host "stderr: $($details.Status.StderrLog)"
}

try {
  if ($Action -eq 'selftest') {
    & (Join-Path $scriptDirectory 'founder-preview.selftest.ps1')
    $exitCode = $LASTEXITCODE
    exit $exitCode
  }

  if ($Action -eq 'status') {
    $status = Get-FounderPreviewStatus -Config $config
    Write-FounderStatus -Status $status
    switch ($status.Status) {
      'BLOCKED_UNRELATED_PROCESS' { $exitCode = $config.ExitCodes.PortConflict }
      'PORT_CONFLICT' { $exitCode = $config.ExitCodes.PortConflict }
      'UNHEALTHY_OWNED' { $exitCode = $config.ExitCodes.Unhealthy }
      default { $exitCode = $config.ExitCodes.Pass }
    }
    exit $exitCode
  }

  if ($Action -eq 'verify') {
    $result = Verify-FounderPreview -Config $config
    Write-FounderVerifyResult -Result $result
    $exitCode = $result.ExitCode
    Write-FounderLastOperation -Config $config -Action $Action -ExitCode $exitCode -Status $result.Status -Details $result
    exit $exitCode
  }

  $lock = Enter-FounderLifecycleLock -Config $config -Action $Action -TimeoutSeconds $LockTimeoutSeconds
  if ($null -eq $lock) {
    Write-Host "Lifecycle lock timeout after $LockTimeoutSeconds seconds."
    $exitCode = $config.ExitCodes.LockTimeout
    exit $exitCode
  }
  Write-Host 'LOCK_ACQUIRED'

  switch ($Action) {
    'start' {
      $result = Start-FounderPreview -Config $config
    }
    'stop' {
      $result = Stop-FounderPreview -Config $config
    }
    'restart' {
      $result = Restart-FounderPreview -Config $config
    }
    'ensure' {
      $result = Ensure-FounderPreview -Config $config
    }
    'cleanup' {
      $result = Cleanup-FounderTemporaryServers -Config $config -DryRun:$DryRun
      Write-CleanupResult -Cleanup $result
    }
    'preflight' {
      $result = Invoke-FounderPreflight -Config $config
    }
    'finalize' {
      $result = Invoke-FounderFinalize -Config $config
      if ($null -ne $result.PSObject.Properties['Details'] -and
        $null -ne $result.Details -and
        $null -ne $result.Details.PSObject.Properties['Verify']) {
        Write-FounderVerifyResult -Result $result.Details.Verify
      }
    }
    'qa-ready' {
      $result = Invoke-FounderQaReady -Config $config
      Write-QaReadyResult -Value $result
    }
    'build' {
      $result = Invoke-FounderSafeValidation -Config $config -ValidationAction build
    }
    'check' {
      $result = Invoke-FounderSafeValidation -Config $config -ValidationAction check
      if ($null -ne $result.Details -and $null -ne $result.Details.Verify -and $result.Details.Verify.PSObject.Properties['RootHttp']) {
        Write-FounderVerifyResult -Result $result.Details.Verify
      }
    }
    default {
      throw "Unsupported action: $Action"
    }
  }

  Write-ActionResult -Value $result
  $exitCode = [int]$result.ExitCode
  $operationDetails = Get-FounderPropertyValue -Object $result -Name 'Details' -DefaultValue $result
  Write-FounderLastOperation -Config $config -Action $Action -ExitCode $exitCode -Status $result.Status -Details $operationDetails
} catch {
  Write-Error $_
  $exitCode = $config.ExitCodes.GeneralFailure
  try {
    Write-FounderLastOperation -Config $config -Action $Action -ExitCode $exitCode -Status 'UNHANDLED_ERROR' -Details $_.Exception.Message
  } catch {
    # Preserve the original lifecycle failure.
  }
} finally {
  if ($null -ne $lock) {
    Exit-FounderLifecycleLock -Lock $lock -Config $config
    Write-Host 'LOCK_RELEASED'
  }
}

exit $exitCode
