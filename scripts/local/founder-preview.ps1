param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('status', 'start', 'stop', 'restart', 'ensure', 'cleanup', 'verify', 'preflight', 'finalize', 'build', 'check', 'selftest')]
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
    if ($Value.Details.PSObject.Properties['Status']) {
      Write-Host "Details Status: $($Value.Details.Status)"
    }
  }
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
      foreach ($entry in $result.WouldStop) {
        Write-Host "Would stop MyOTT listener: port $($entry.Port), PID $($entry.ProcessId)"
      }
      foreach ($entry in $result.Stopped) {
        Write-Host "Stopped MyOTT listener: port $($entry.Port), PID $($entry.ProcessId)"
      }
      foreach ($entry in $result.Unrelated) {
        Write-Host "Preserved unrelated listener: port $($entry.Port), PID $($entry.ProcessId)"
      }
    }
    'preflight' {
      $result = Invoke-FounderPreflight -Config $config
    }
    'finalize' {
      $result = Invoke-FounderFinalize -Config $config
      if ($null -ne $result.Details -and $null -ne $result.Details.Verify) {
        Write-FounderVerifyResult -Result $result.Details.Verify
      }
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
