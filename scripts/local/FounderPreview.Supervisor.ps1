param([ValidateSet('Library', 'Run')][string]$Mode = 'Library')

Set-StrictMode -Version 2.0
$script:FpsVersion = '1.0.0'
$script:FpsSourceDirectory = $PSScriptRoot
$script:FpsLifecycle = $null

function Get-FpsConfig {
  param([string]$Root = (Join-Path $env:LOCALAPPDATA 'MyOTT\FounderPreview'))
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $session = [Diagnostics.Process]::GetCurrentProcess().SessionId
  [pscustomobject]@{
    Root = $Root; Bin = (Join-Path $Root 'bin'); State = (Join-Path $Root 'state')
    Desired = (Join-Path $Root 'state\supervisor-desired.json')
    Status = (Join-Path $Root 'state\supervisor-status.json')
    Install = (Join-Path $Root 'state\supervisor-install.json')
    Lifecycle = (Join-Path $Root 'state\supervisor-lifecycle.json')
    Log = (Join-Path $Root 'logs\supervisor.log')
    TaskName = 'MyOTT-FounderPreview-3000'; UserSid = $sid
    Mutex = "Local\MyOTT-FounderPreview-Supervisor-$sid"
    WriterMutex = "Local\MyOTT-FounderPreview-ControlWriter-$sid"
    Event = "Local\MyOTT-FounderPreview-Control-$sid-$session"
    HostExe = "$env:ProgramFiles\PowerShell\7\pwsh.exe"
    LauncherExe = "$env:WINDIR\System32\wscript.exe"
    Files = @('FounderPreview.Supervisor.ps1', 'FounderPreview.Common.ps1', 'FounderPreview.SupervisorLauncher.vbs')
  }
}

function Write-FpsAtomic {
  param([string]$Path, $Value)
  $parent = Split-Path -Parent $Path
  [IO.Directory]::CreateDirectory($parent) | Out-Null
  $temp = Join-Path $parent ([IO.Path]::GetFileName($Path) + '.' + [guid]::NewGuid().ToString('N') + '.tmp')
  try {
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 20))
    $stream = [IO.FileStream]::new($temp, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
    if ([IO.File]::Exists($Path)) { [IO.File]::Replace($temp, $Path, [Management.Automation.Language.NullString]::Value) }
    else { [IO.File]::Move($temp, $Path) }
  } finally { if ([IO.File]::Exists($temp)) { [IO.File]::Delete($temp) } }
}

function Read-FpsJson {
  param([string]$Path)
  if (-not [IO.File]::Exists($Path)) { throw 'STATE_MISSING: supervisor-install required' }
  if ((Get-Item -LiteralPath $Path).Length -gt 65536) { throw 'STATE_TOO_LARGE' }
  try { return [IO.File]::ReadAllText($Path) | ConvertFrom-Json }
  catch { throw 'STATE_CORRUPT' }
}

function Convert-FpsInstant {
  param($Value)
  if ($Value -is [DateTimeOffset]) { return $Value }
  if ($Value -is [DateTime]) { return [DateTimeOffset]$Value }
  return [DateTimeOffset]::Parse([string]$Value, [Globalization.CultureInfo]::InvariantCulture)
}

function Test-FpsDesired {
  param($Value)
  try {
    if ($Value.schemaVersion -ne 1 -or $Value.generation -isnot [long] -and $Value.generation -isnot [int]) { return $false }
    if ($Value.generation -lt 1 -or $Value.desiredState -notin @('RUNNING','STOPPED')) { return $false }
    if (-not [IO.Path]::IsPathRooted($Value.candidateRoot) -or $Value.candidateRoot -match '["\r\n]') { return $false }
    if ([string]::IsNullOrWhiteSpace($Value.repositoryIdentity)) { return $false }
    if ($null -ne $Value.lease) {
      $from = Convert-FpsInstant $Value.lease.startedAt
      $until = Convert-FpsInstant $Value.lease.expiresAt
      if (($until - $from).TotalSeconds -le 0 -or ($until - $from).TotalSeconds -gt 900) { return $false }
    }
    return $Value.request -in @('RUNNING','STOPPED','RESTART','MAINTENANCE','UNINSTALL')
  } catch { return $false }
}

function Test-FpsLease {
  param($Desired, [DateTimeOffset]$Now = [DateTimeOffset]::UtcNow)
  return $null -ne $Desired.lease -and (Convert-FpsInstant $Desired.lease.expiresAt) -gt $Now
}

function Get-FpsHealthClass {
  param([int]$StatusCode)
  if ($StatusCode -eq 200) { return 'HEALTHY' }
  if ($StatusCode -ge 100 -and $StatusCode -le 599) { return 'DEGRADED_BUT_RESPONSIVE' }
  return 'TRANSPORT_FAILURE'
}

function Invoke-FpsHealth {
  param([uri]$Uri = 'http://127.0.0.1:3000/', [ValidateRange(50,10000)][int]$TimeoutMilliseconds = 10000)
  if ($Uri.Scheme -ne 'http' -or $Uri.Host -ne '127.0.0.1' -or $Uri.Port -lt 3000 -or $Uri.Port -gt 3100 -or $Uri.PathAndQuery -ne '/') { throw 'HEALTH_TARGET_INVALID' }
  Add-Type -AssemblyName System.Net.Http
  $handler = [Net.Http.HttpClientHandler]::new()
  $handler.UseProxy = $false
  $handler.AllowAutoRedirect = $false
  $client = [Net.Http.HttpClient]::new($handler)
  $client.Timeout = [TimeSpan]::FromMilliseconds($TimeoutMilliseconds)
  $response = $null
  try {
    $response = $client.GetAsync($Uri, [Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    return [int]$response.StatusCode
  } catch { return 0 }
  finally { if ($null -ne $response) { $response.Dispose() }; $client.Dispose() }
}

function New-FpsRecovery {
  param([DateTimeOffset]$Now = [DateTimeOffset]::UtcNow)
  [pscustomobject]@{ Failures = 0; FirstFailure = $Now; Due = $Now; Phase = 'PROBE'; Restarts = @(); SafeHold = $false
    Provenance = [ordered]@{
      stateRevision=0; containmentState='NORMAL'; safeHoldReason=$null; safeHoldEnteredAt=$null
      safeHoldGeneration=0; safeHoldCandidateRoot=$null; safeHoldInstallIdentity=$null
      legacyMigrationVersion=1; legacyMigrationStatus='NOT_EVALUATED'; evaluationKey=''
      bootstrapAttempts=0; originalSafeHoldCause=$null; legacyOriginal=$null; holdHistory=@(); recoveryChecks=$null; pageReadiness=$null
    }
  }
}

function Set-FpsHold {
  param($Recovery, [ValidateSet('OWNERSHIP_CONFLICT','STATE_CORRUPTION','RESTART_BUDGET_EXHAUSTED','RUNTIME_IDENTITY_AMBIGUOUS','INSTALLATION_INTEGRITY_FAILURE','LEGACY_REASON_MISSING')][string]$Reason,
    $Desired=$null, [string]$InstallIdentity='', [DateTimeOffset]$Now=[DateTimeOffset]::UtcNow)
  $p=$Recovery.Provenance
  if ($p.safeHoldReason -ne $Reason -or $p.containmentState -eq 'NORMAL') {
    if ($null -ne $p.safeHoldReason) {
      if (@($p.holdHistory).Count -ge 32) { throw 'HOLD_HISTORY_CAPACITY' }
      $p.holdHistory+=@([ordered]@{reason=$p.safeHoldReason;enteredAt=$p.safeHoldEnteredAt;generation=$p.safeHoldGeneration;candidate=$p.safeHoldCandidateRoot;install=$p.safeHoldInstallIdentity;restartTimestamps=@($Recovery.Restarts|ForEach-Object {$_.ToString('o')})})
    }
    $p.safeHoldReason=$Reason; $p.safeHoldEnteredAt=$Now.ToString('o')
    $p.evaluationKey='';$p.bootstrapAttempts=0
    if ($null -ne $Desired) { $p.safeHoldGeneration=$Desired.generation; $p.safeHoldCandidateRoot=$Desired.candidateRoot }
    $p.safeHoldInstallIdentity=$InstallIdentity
  }
  $p.containmentState='SAFE_HOLD'; $Recovery.SafeHold=$true
}

function Import-FpsRecovery {
  param($Value, [DateTimeOffset]$Now=[DateTimeOffset]::UtcNow)
  $r=New-FpsRecovery $Now
  try {
    if ($Value.schemaVersion -notin @(1,2) -or -not (Test-FpsDesired $Value.desired) -or $Value.safeHold -isnot [bool]) { throw 'INVALID' }
    $r.Restarts=@($Value.restartTimes|ForEach-Object {Convert-FpsInstant $_})
    if (@($r.Restarts|Where-Object {$_ -gt $Now}).Count -gt 0) { throw 'INVALID' }
    if ($Value.schemaVersion -eq 1) {
      if ($Value.safeHold) {
        Set-FpsHold $r LEGACY_REASON_MISSING $Value.desired '' $Now
        $r.Provenance.safeHoldEnteredAt=$null
        $r.Provenance.originalSafeHoldCause='NOT_PROVEN'
        $r.Provenance.legacyOriginal=[ordered]@{schemaVersion=1;safeHold=$true;recordedAt=$Value.recordedAt;generation=$Value.desired.generation;candidateRoot=$Value.desired.candidateRoot;restartTimestamps=@($Value.restartTimes)}
      }
      return $r
    }
    foreach ($key in @($r.Provenance.Keys)) {
      if ($null -eq $Value.PSObject.Properties[$key]) { throw 'INVALID' }
      $r.Provenance[$key]=$Value.$key
    }
    $p=$r.Provenance
    if ($p.stateRevision -isnot [long] -and $p.stateRevision -isnot [int]) {throw 'INVALID'}
    if ($p.stateRevision -lt 1 -or $p.containmentState -notin @('NORMAL','SAFE_HOLD','RECOVERY_PENDING') -or
      $p.legacyMigrationVersion -ne 1 -or $p.bootstrapAttempts -notin @(0,1) -or
      $p.legacyMigrationStatus -notmatch '^(NOT_EVALUATED|RECOVERY_ELIGIBLE|COMPLETED|BLOCKED_[A-Z0-9_]+)$') {throw 'INVALID'}
    if ($p.evaluationKey -isnot [string] -or $p.evaluationKey.Length -gt 4096 -or
      $p.safeHoldGeneration -isnot [long] -and $p.safeHoldGeneration -isnot [int]) {throw 'INVALID'}
    if ($null -ne $p.safeHoldCandidateRoot -and (-not [IO.Path]::IsPathRooted($p.safeHoldCandidateRoot) -or $p.safeHoldCandidateRoot -match '["\r\n]')) {throw 'INVALID'}
    if (-not [string]::IsNullOrEmpty($p.safeHoldInstallIdentity) -and $p.safeHoldInstallIdentity -notmatch '^[A-Fa-f0-9]{64}$') {throw 'INVALID'}
    if ($Value.desiredState -cne $Value.desired.desiredState -or $Value.safeHold -ne ($p.containmentState -ne 'NORMAL')) {throw 'INVALID'}
    if (($p.containmentState -ne 'NORMAL' -or $null -ne $p.safeHoldReason) -and $p.safeHoldReason -notin @('OWNERSHIP_CONFLICT','STATE_CORRUPTION','RESTART_BUDGET_EXHAUSTED','RUNTIME_IDENTITY_AMBIGUOUS','INSTALLATION_INTEGRITY_FAILURE','LEGACY_REASON_MISSING')) {throw 'INVALID'}
    if ($null -ne $p.safeHoldReason -and $p.safeHoldReason -ne 'LEGACY_REASON_MISSING') { $null=Convert-FpsInstant $p.safeHoldEnteredAt }
    if (($Value.restartTimestamps -join '|') -cne ($Value.restartTimes -join '|') -or @($p.holdHistory).Count -gt 32) {throw 'INVALID'}
    $r.SafeHold=$Value.safeHold
    # A reserved attempt survives a crash; never replay an uncertain bootstrap.
    if ($p.containmentState -eq 'RECOVERY_PENDING') {
      $p.containmentState='SAFE_HOLD'; $p.legacyMigrationStatus='BLOCKED_BOOTSTRAP_INTERRUPTED'
    }
    return $r
  } catch {
    $r=New-FpsRecovery $Now; Set-FpsHold $r STATE_CORRUPTION $null '' $Now
    return $r
  }
}

function Get-FpsHoldReason {
  param([string]$Code)
  if ($Code -match 'UNKNOWN_3000|OWNERSHIP_CHANGED|START_PORT_NOT_EMPTY') { return 'OWNERSHIP_CONFLICT' }
  if ($Code -match 'IDENTITY_INCOMPLETE|HTTP_OWNER_UNPROVEN|LAUNCHER_EXIT|START_BIND|STOP_TIMEOUT') { return 'RUNTIME_IDENTITY_AMBIGUOUS' }
  if ($Code -match 'INSTALL_|TASK_IDENTITY') { return 'INSTALLATION_INTEGRITY_FAILURE' }
  return 'STATE_CORRUPTION'
}

function Get-FpsReconciliationKey {
  param($Recovery,$Desired,[string]$InstallIdentity,[DateTimeOffset]$Now)
  $budget=@($Recovery.Restarts|Where-Object {($Now-$_).TotalSeconds -lt 600}).Count
  return "$($Desired.generation)|$($Desired.candidateRoot)|$($Desired.budgetEpoch)|$InstallIdentity|$(Test-FpsLease $Desired $Now)|$budget"
}

function Test-FpsSafeHoldReevaluationAllowed {
  param($Recovery,$Desired,[DateTimeOffset]$Now=[DateTimeOffset]::UtcNow)
  if ($null -eq $Desired -or (Test-FpsLease $Desired $Now)) { return $false }
  if ($null -eq $Recovery -or $null -eq $Recovery.Provenance) { return $false }
  $p=$Recovery.Provenance
  return $Recovery.SafeHold -and
    $p.safeHoldReason -in @('LEGACY_REASON_MISSING','RESTART_BUDGET_EXHAUSTED') -and
    $p.bootstrapAttempts -eq 0
}

function Test-FpsRecoveryConditions {
  param($Checks)
  foreach ($name in @('DESIRED_RUNNING','GENERATION_CURRENT','CANDIDATE_IDENTITY','TASK_VALID_ENABLED','ONE_LAUNCHER','ONE_SUPERVISOR','INSTALL_IDENTITY','LEASE_CLEAR','LISTENER_EMPTY','RUNTIME_EMPTY','BUDGET_AVAILABLE','DEPENDENCY_COMPATIBLE')) {
    if ($Checks[$name] -isnot [bool] -or -not $Checks[$name]) { return 'BLOCKED_'+$name }
  }
  return 'RECOVERY_ELIGIBLE'
}

function Get-FpsRecoveryConditions {
  param($Config,$Desired,$Recovery,[DateTimeOffset]$Now)
  $checks=[ordered]@{}
  $checks.DESIRED_RUNNING=$Desired.desiredState -eq 'RUNNING'
  $fresh=Read-FpsJson $Config.Desired
  $checks.GENERATION_CURRENT=(Test-FpsDesired $fresh) -and $fresh.generation -eq $Desired.generation -and $fresh.candidateRoot -ceq $Desired.candidateRoot
  $installation=Assert-FpsInstallation $Config
  $source=@($installation.files|Where-Object {$_.name -ceq 'FounderPreview.Supervisor.ps1'})[0].source
  $expected=[IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $source) '..\..'))
  $identity=Get-FounderGitRepositoryIdentity -RepositoryPath $Desired.candidateRoot
  $checks.CANDIDATE_IDENTITY=(Test-FounderRepositoryPathEqual $expected $Desired.candidateRoot) -and $null -ne $identity -and (Test-FounderRepositoryPathEqual $identity.CommonDirectory $Desired.repositoryIdentity)
  $task=Get-FpsTaskDefinition $Config
  $checks.TASK_VALID_ENABLED=(Test-FpsTaskDefinition $Config $task) -and $task.enabled -and $task.state -eq 'Running'
  $processes=@(Get-CimInstance Win32_Process -ErrorAction Stop)
  $launchers=@($processes|Where-Object {$_.ExecutablePath -ieq $Config.LauncherExe -and $_.CommandLine -ceq ('"'+$Config.LauncherExe+'" '+(Get-FpsTaskArguments $Config))})
  $supervisors=@($processes|Where-Object {$_.ExecutablePath -ieq $Config.HostExe -and $_.CommandLine -like ('*"'+(Join-Path $Config.Bin 'FounderPreview.Supervisor.ps1')+'" -Mode Run')})
  $checks.ONE_LAUNCHER=$launchers.Count -eq 1
  $checks.ONE_SUPERVISOR=$supervisors.Count -eq 1 -and $supervisors[0].ProcessId -eq $PID -and $checks.ONE_LAUNCHER -and $supervisors[0].ParentProcessId -eq $launchers[0].ProcessId
  $checks.INSTALL_IDENTITY=$true
  $checks.LEASE_CLEAR=-not (Test-FpsLease $fresh $Now)
  $checks.LISTENER_EMPTY=@(Get-FounderListeners -Ports @(3000)).Count -eq 0
  # An unreadable Node command or another potential Next runtime prevents bootstrap.
  $checks.RUNTIME_EMPTY=@($processes|Where-Object {$_.Name -ieq 'node.exe' -and ([string]::IsNullOrWhiteSpace($_.CommandLine) -or $_.CommandLine.Contains($Desired.candidateRoot) -or $_.CommandLine -match 'start-server\.js|--port[= ]+3000\b')}).Count -eq 0
  $checks.BUDGET_AVAILABLE=@($Recovery.Restarts|Where-Object {($Now-$_).TotalSeconds -lt 600}).Count -lt 3
  try { $null=Resolve-FounderRuntime $Desired.candidateRoot; $checks.DEPENDENCY_COMPATIBLE=$true } catch { $checks.DEPENDENCY_COMPATIBLE=$false }
  return $checks
}

function Begin-FpsPendingRecovery {
  param($Recovery,$Checks,[string]$Key)
  $p=$Recovery.Provenance
  if (-not $Recovery.SafeHold -or $p.safeHoldReason -notin @('LEGACY_REASON_MISSING','RESTART_BUDGET_EXHAUSTED') -or $p.bootstrapAttempts -ne 0 -or $p.evaluationKey -ceq $Key) {return $false}
  $p.evaluationKey=$Key
  $p.recoveryChecks=$Checks
  $result=Test-FpsRecoveryConditions $Checks
  $p.legacyMigrationStatus=$result
  if ($result -ne 'RECOVERY_ELIGIBLE') {return $false}
  $p.containmentState='RECOVERY_PENDING'
  return $true
}

function Complete-FpsPendingRecovery {
  param($Recovery,[bool]$Readiness)
  if ($Recovery.Provenance.containmentState -ne 'RECOVERY_PENDING' -or -not $Readiness) {return $false}
  $Recovery.Provenance.containmentState='NORMAL';$Recovery.Provenance.legacyMigrationStatus='COMPLETED'
  $Recovery.SafeHold=$false; $Recovery.Failures=0; $Recovery.Phase='PROBE'
  $Recovery.Due=[DateTimeOffset]::UtcNow.AddSeconds(60)
  return $true
}

function Invoke-FpsPageReadiness {
  Add-Type -AssemblyName System.Net.Http
  $handler=[Net.Http.HttpClientHandler]::new();$handler.UseProxy=$false;$handler.AllowAutoRedirect=$false
  $client=[Net.Http.HttpClient]::new($handler);$client.Timeout=[TimeSpan]::FromSeconds(10);$client.MaxResponseContentBufferSize=2MB
  $result=[ordered]@{root=0;css=0;js=0;pass=$false}
  try {
    $response=$client.GetAsync('http://127.0.0.1:3000/').GetAwaiter().GetResult()
    try {$result.root=[int]$response.StatusCode;$html=$response.Content.ReadAsStringAsync().GetAwaiter().GetResult()} finally {$response.Dispose()}
    if ($result.root -ne 200) {return [pscustomobject]$result}
    $assets=@([regex]::Matches($html,'(?:src|href)="([^"]+)"')|ForEach-Object {
      $u=[uri]::new([uri]'http://127.0.0.1:3000/',[Net.WebUtility]::HtmlDecode($_.Groups[1].Value))
      if ($u.Scheme -eq 'http' -and $u.Host -eq '127.0.0.1' -and $u.Port -eq 3000 -and $u.AbsolutePath.StartsWith('/_next/static/')) {$u}
    })
    foreach($kind in @('css','js')) {
      $asset=@($assets|Where-Object {$_.AbsolutePath.EndsWith('.'+$kind)}|Select-Object -First 1)
      if ($asset.Count -eq 0) {continue}
      $response=$client.GetAsync($asset[0],[Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
      try {$result[$kind]=[int]$response.StatusCode} finally {$response.Dispose()}
    }
    $result.pass=$result.root -eq 200 -and $result.css -eq 200 -and $result.js -eq 200
  } catch { $result.pass=$false } finally {$client.Dispose()}
  return [pscustomobject]$result
}

function Update-FpsRecovery {
  param($Recovery, [int]$Http, [DateTimeOffset]$Now)
  if ($Recovery.SafeHold) { return 'SAFE_HOLD' }
  if ($Http -gt 0) {
    $Recovery.Failures = 0; $Recovery.Phase = 'PROBE'; $Recovery.Due = $Now.AddSeconds(60)
    return Get-FpsHealthClass $Http
  }
  if ($Recovery.Failures -eq 0) { $Recovery.FirstFailure = $Now }
  $Recovery.Failures++
  if ($Recovery.Failures -lt 3) {
    $offset = if ($Recovery.Failures -eq 1) { 5 } else { 15 }
    $Recovery.Due = $Recovery.FirstFailure.AddSeconds($offset)
    return 'TRANSPORT_FAILURE'
  }
  $Recovery.Restarts = @($Recovery.Restarts | Where-Object { ($Now - $_).TotalSeconds -lt 600 })
  if ($Recovery.Restarts.Count -ge 3) { Set-FpsHold $Recovery RESTART_BUDGET_EXHAUSTED -Now $Now; return 'SAFE_HOLD' }
  $Recovery.Due = $Now.AddSeconds(@(2,10,30)[$Recovery.Restarts.Count])
  $Recovery.Phase = 'RESTART'
  return 'RECOVERY_PENDING'
}

function Write-FpsTransition {
  param($Config, [string]$Kind, $Metrics)
  if ($Kind -eq 'HEALTHY_PROBE') { return }
  if ($Kind -notin @('START','STOP','CANDIDATE_SWITCH','HEALTHY','DEGRADED_BUT_RESPONSIVE','TRANSPORT_FAILURE','RECOVERY_PENDING','RESTART','SAFE_HOLD','ERROR','MAINTENANCE')) { throw 'LOG_KIND_INVALID' }
  [IO.Directory]::CreateDirectory((Split-Path -Parent $Config.Log)) | Out-Null
  $line = [DateTimeOffset]::UtcNow.ToString('o') + ' ' + $Kind + [Environment]::NewLine
  $size = [Text.Encoding]::UTF8.GetByteCount($line)
  if ([IO.File]::Exists($Config.Log) -and (Get-Item -LiteralPath $Config.Log).Length + $size -gt 4MB) {
    $previous = $Config.Log + '.1'
    if ([IO.File]::Exists($previous)) { [IO.File]::Delete($previous) }
    [IO.File]::Move($Config.Log, $previous)
  }
  [IO.File]::AppendAllText($Config.Log, $line, [Text.UTF8Encoding]::new($false))
  $Metrics.logWrites++
}

function Get-FpsTaskDefinition {
  param($Config)
  $t = Get-ScheduledTask -TaskName $Config.TaskName -TaskPath '\' -ErrorAction Stop
  [pscustomobject]@{
    name=$t.TaskName; user=$t.Principal.UserId; runLevel=[string]$t.Principal.RunLevel
    logon=[string]$t.Principal.LogonType; state=[string]$t.State; enabled=[bool]$t.Settings.Enabled
    actions=@($t.Actions | Select-Object Execute,Arguments,WorkingDirectory)
    triggers=@($t.Triggers | ForEach-Object { [pscustomobject]@{ type=$_.CimClass.CimClassName; user=$(if ($_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger') {$_.UserId} else {''}); enabled=$_.Enabled; interval=$_.Repetition.Interval; duration=$_.Repetition.Duration; stopAtDurationEnd=$_.Repetition.StopAtDurationEnd; startBoundary=$_.StartBoundary } })
    settings=[pscustomobject]@{ instances=[string]$t.Settings.MultipleInstances; restartCount=$t.Settings.RestartCount; restartInterval=$t.Settings.RestartInterval; limit=$t.Settings.ExecutionTimeLimit; wake=$t.Settings.WakeToRun; network=$t.Settings.RunOnlyIfNetworkAvailable; available=$t.Settings.StartWhenAvailable }
  }
}

function Get-FpsTaskArguments {
  param($Config)
  return '//B //Nologo "' + (Join-Path $Config.Bin 'FounderPreview.SupervisorLauncher.vbs') + '"'
}

function Get-FpsLegacyTaskArguments {
  param($Config)
  return '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + (Join-Path $Config.Bin 'FounderPreview.Supervisor.ps1') + '" -Mode Run'
}

function Test-FpsUserIdentity {
  param([string]$Value, [string]$ExpectedSid)
  try {
    if ($Value -match '^S-1-') { return ([Security.Principal.SecurityIdentifier]::new($Value)).Value -eq $ExpectedSid }
    $local=[Security.Principal.WindowsIdentity]::GetCurrent().Name
    $short=$local.Substring($local.LastIndexOf('\')+1)
    if ($Value -ine $local -and $Value -ine $short) {return $false}
    $sid=[Security.Principal.NTAccount]::new($local).Translate([Security.Principal.SecurityIdentifier]).Value
    return $sid -eq $ExpectedSid
  } catch {return $false}
}

function Test-FpsTaskDefinition {
  param($Config, $Definition, [switch]$AllowLegacyTrigger, [switch]$AllowLegacyLauncher)
  try {
    $expectedExe = if ($AllowLegacyLauncher) { $Config.HostExe } else { $Config.LauncherExe }
    $expectedArgs = if ($AllowLegacyLauncher) { Get-FpsLegacyTaskArguments $Config } else { Get-FpsTaskArguments $Config }
    $s = $Definition.settings
    $logon=@($Definition.triggers | Where-Object {$_.type -eq 'MSFT_TaskLogonTrigger'})
    $periodic=@($Definition.triggers | Where-Object {$_.type -eq 'MSFT_TaskTimeTrigger'})
    $triggersValid=$logon.Count -eq 1 -and (Test-FpsUserIdentity $logon[0].user $Config.UserSid) -and
      $logon[0].enabled -and [string]::IsNullOrEmpty($logon[0].interval)
    if ($AllowLegacyTrigger -and @($Definition.triggers).Count -eq 1) {
      $triggersValid=$triggersValid -and $periodic.Count -eq 0
    } else {
      $triggersValid=$triggersValid -and @($Definition.triggers).Count -eq 2 -and $periodic.Count -eq 1 -and
        $periodic[0].enabled -and $periodic[0].interval -eq 'PT1M' -and
        [string]::IsNullOrEmpty($periodic[0].duration) -and -not $periodic[0].stopAtDurationEnd -and
        -not [string]::IsNullOrEmpty($periodic[0].startBoundary)
    }
    return $Definition.name -ceq $Config.TaskName -and (Test-FpsUserIdentity $Definition.user $Config.UserSid) -and
      $Definition.runLevel -eq 'Limited' -and $Definition.logon -eq 'Interactive' -and
      @($Definition.actions).Count -eq 1 -and $Definition.actions[0].Execute -ieq $expectedExe -and
      $Definition.actions[0].Arguments -ceq $expectedArgs -and
      $triggersValid -and
      $s.instances -eq 'IgnoreNew' -and $s.restartCount -eq 3 -and $s.restartInterval -eq 'PT1M' -and
      $s.limit -eq 'PT0S' -and -not $s.wake -and -not $s.network -and $s.available
  } catch { return $false }
}

function New-FpsTaskTriggers {
  param($Config)
  New-ScheduledTaskTrigger -AtLogOn -User $Config.UserSid
  # A separate time trigger also reconciles this already logged-in session.
  $timer=New-ScheduledTaskTrigger -Once -At ([DateTime]::Now.AddMinutes(1)) -RepetitionInterval ([TimeSpan]::FromMinutes(1))
  $timer.Repetition.StopAtDurationEnd=$false
  $timer
}

function Assert-FpsInstallation {
  param($Config, [switch]$SkipTask, [switch]$AllowLegacyLauncher)
  if ($AllowLegacyLauncher -and -not $SkipTask) { throw 'LEGACY_INSTALL_MIGRATION_ONLY' }
  $required = if ($AllowLegacyLauncher) { @('FounderPreview.Supervisor.ps1', 'FounderPreview.Common.ps1') } else { $Config.Files }
  $i = Read-FpsJson $Config.Install
  if ($i.schemaVersion -ne 1 -or $i.version -cne $script:FpsVersion -or @($i.files).Count -ne $required.Count) { throw 'INSTALL_IDENTITY_INVALID: supervisor-install required' }
  foreach ($name in $required) {
    $entry = @($i.files | Where-Object { $_.name -ceq $name })
    $installed = Join-Path $Config.Bin $name
    if ($entry.Count -ne 1 -or $entry[0].installed -ine $installed -or -not [IO.File]::Exists($installed) -or
      (Get-FileHash -LiteralPath $installed).Hash -cne $entry[0].sha) { throw 'INSTALL_HASH_MISMATCH: supervisor-install required' }
  }
  if (-not $SkipTask -and -not (Test-FpsTaskDefinition $Config (Get-FpsTaskDefinition $Config))) { throw 'TASK_IDENTITY_INVALID: supervisor-install required' }
  return $i
}

function Publish-FpsDesired {
  param($Config, [string]$RepositoryPath, [ValidateSet('RUNNING','STOPPED','RESTART','MAINTENANCE','UNINSTALL')][string]$Request, [switch]$ResetBudget)
  $mutex = [Threading.Mutex]::new($false, $Config.WriterMutex)
  $locked = $false
  try {
    try { $locked = $mutex.WaitOne(10000) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'CONTROL_WRITER_BUSY' }
    $old = $null
    if ([IO.File]::Exists($Config.Desired)) {
      $old = Read-FpsJson $Config.Desired
      if (-not (Test-FpsDesired $old)) { throw 'DESIRED_STATE_CORRUPT' }
    }
    $root = Normalize-FounderRepositoryPath $RepositoryPath
    if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json') -PathType Leaf)) { throw 'CANDIDATE_INVALID' }
    $gitLock = $env:GIT_OPTIONAL_LOCKS
    try {
      $env:GIT_OPTIONAL_LOCKS = '0'
      $identity = & git -C $root rev-parse --path-format=absolute --git-common-dir
      if ($LASTEXITCODE -ne 0) { throw 'REPOSITORY_IDENTITY_INVALID' }
    } finally { $env:GIT_OPTIONAL_LOCKS = $gitLock }
    $now = [DateTimeOffset]::UtcNow
    $generation = if ($null -eq $old) { 1 } else { [long]$old.generation + 1 }
    $budgetEpoch = if ($null -eq $old -or $ResetBudget -or $old.candidateRoot -ine $root) { [guid]::NewGuid().ToString('N') } else { $old.budgetEpoch }
    $value = [ordered]@{
      schemaVersion=1; generation=$generation; desiredState=$(if ($Request -eq 'STOPPED') {'STOPPED'} else {'RUNNING'})
      candidateRoot=$root; repositoryIdentity=[string]$identity; updatedAt=$now.ToString('o')
      request=$Request; budgetEpoch=$budgetEpoch
      lease=$(if ($Request -eq 'MAINTENANCE') { @{startedAt=$now.ToString('o');expiresAt=$now.AddMinutes(15).ToString('o')} } else {$null})
    }
    Write-FpsAtomic $Config.Desired $value
    $event = [Threading.EventWaitHandle]::new($false, [Threading.EventResetMode]::AutoReset, $Config.Event)
    try { $event.Set() | Out-Null } finally { $event.Dispose() }
    return [pscustomobject]$value
  } finally { if ($locked) { $mutex.ReleaseMutex() }; $mutex.Dispose() }
}

function Install-FpsSupervisor {
  param($Config, [string]$RepositoryPath, [switch]$MigrateLauncher)
  $existing = @(Get-ScheduledTask -TaskName $Config.TaskName -TaskPath '\' -ErrorAction SilentlyContinue)
  if ($existing.Count -gt 0) {
    Assert-FpsInstallation $Config -SkipTask -AllowLegacyLauncher:$MigrateLauncher | Out-Null
    if (-not (Test-FpsTaskDefinition $Config (Get-FpsTaskDefinition $Config) -AllowLegacyTrigger -AllowLegacyLauncher:$MigrateLauncher)) {throw 'INSTALL_TASK_IDENTITY_INVALID'}
    if ($existing[0].State -eq 'Running') { throw 'INSTALL_REQUIRES_CONTROLLED_SUPERVISOR_STOP' }
    if ($existing[0].State -ne 'Disabled') { throw 'INSTALL_EXISTING_TASK_MUST_BE_DISABLED' }
  }
  [IO.Directory]::CreateDirectory($Config.Bin) | Out-Null
  $files = @()
  foreach ($name in $Config.Files) {
    $source = Join-Path $script:FpsSourceDirectory $name
    $destination = Join-Path $Config.Bin $name
    $sha = (Get-FileHash -LiteralPath $source).Hash
    Copy-Item -LiteralPath $source -Destination $destination -Force
    if ((Get-FileHash -LiteralPath $destination).Hash -cne $sha) { throw 'INSTALL_COPY_MISMATCH' }
    $files += [pscustomobject]@{name=$name;source=$source;installed=$destination;sha=$sha}
  }
  Write-FpsAtomic $Config.Install @{schemaVersion=1;version=$script:FpsVersion;files=$files}
  $action = New-ScheduledTaskAction -Execute $Config.LauncherExe -Argument (Get-FpsTaskArguments $Config) -WorkingDirectory $Config.Bin
  $principal = New-ScheduledTaskPrincipal -UserId $Config.UserSid -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -Disable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval ([TimeSpan]::FromMinutes(1)) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  if ($existing.Count -eq 0) {
    Publish-FpsDesired $Config $RepositoryPath RUNNING -ResetBudget | Out-Null
    $trigger = @(New-FpsTaskTriggers $Config)
    Register-ScheduledTask -TaskName $Config.TaskName -TaskPath '\' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -ErrorAction Stop | Out-Null
  } else {
    # Transport updates preserve the existing triggers, desired generation and recovery budget.
    Set-ScheduledTask -TaskName $Config.TaskName -TaskPath '\' -Action $action -ErrorAction Stop | Out-Null
  }
  Assert-FpsInstallation $Config | Out-Null
  return [pscustomobject]@{status='PREPARED_DISABLED';files=$files;task=(Get-FpsTaskDefinition $Config)}
}

function Get-FpsRuntime {
  param([string]$RepositoryPath)
  $listeners = @(Get-FounderListeners -Ports @(3000))
  if ($listeners.Count -eq 0) { return $null }
  $ids = @($listeners.OwningProcess | Select-Object -Unique)
  if ($ids.Count -ne 1) { throw 'UNKNOWN_3000_OWNERSHIP' }
  $ownership = Get-FounderProcessOwnership -ProcessId $ids[0] -RepositoryPath $RepositoryPath
  if (-not $ownership.Owned) { throw 'UNKNOWN_3000_OWNERSHIP' }
  $metadata = Get-FounderProcessMetadata -ProcessId $ids[0]
  if ([string]::IsNullOrWhiteSpace($metadata.StartTime) -or [string]::IsNullOrWhiteSpace($metadata.ExecutablePath)) { throw 'RUNTIME_IDENTITY_INCOMPLETE' }
  $process = [Diagnostics.Process]::GetProcessById($ids[0])
  $handle = [Threading.ManualResetEvent]::new($false)
  $handle.SafeWaitHandle = [Microsoft.Win32.SafeHandles.SafeWaitHandle]::new($process.Handle, $false)
  return [pscustomobject]@{metadata=$metadata;process=$process;wait=$handle;root=$RepositoryPath}
}

function Close-FpsRuntimeHandle {
  param($Runtime)
  if ($null -ne $Runtime) {
    $Runtime.wait.Dispose(); $Runtime.process.Dispose()
    if ($null -ne $Runtime.PSObject.Properties['launcher']) { $Runtime.launcher.Dispose() }
  }
}

function Stop-FpsRuntime {
  param($Runtime)
  if ($null -eq $Runtime) { return }
  $lock = [Threading.Mutex]::new($false, 'Local\MyOTTFounderPreview_Port3000')
  $held = $false
  try {
  try { $held = $lock.WaitOne(30000) } catch [Threading.AbandonedMutexException] { $held = $true }
  if (-not $held) { throw 'LIFECYCLE_LOCK_TIMEOUT' }
  $current = Get-FounderProcessOwnership -ProcessId $Runtime.metadata.ProcessId -RepositoryPath $Runtime.root
  if ($Runtime.process.HasExited) { return }
  if (-not $current.Owned) { throw 'RUNTIME_OWNERSHIP_CHANGED' }
  $result = Stop-FounderProcessIfIdentityMatches -ExpectedMetadata $Runtime.metadata
  if ($result.Status -notin @('TERMINATION_REQUESTED','ALREADY_EXITED')) { throw ('RUNTIME_STOP_' + $result.Status) }
  if (-not $Runtime.process.WaitForExit(10000)) { throw 'RUNTIME_STOP_TIMEOUT' }
  } finally { if ($held) { $lock.ReleaseMutex() }; $lock.Dispose() }
}

function Start-FpsRuntime {
  param([string]$RepositoryPath)
  $lock = [Threading.Mutex]::new($false, 'Local\MyOTTFounderPreview_Port3000')
  $held = $false
  try {
  try { $held = $lock.WaitOne(30000) } catch [Threading.AbandonedMutexException] { $held = $true }
  if (-not $held) { throw 'LIFECYCLE_LOCK_TIMEOUT' }
  if (@(Get-FounderListeners -Ports @(3000)).Count -ne 0) { throw 'START_PORT_NOT_EMPTY' }
  $runtime = Resolve-FounderRuntime -RepositoryPath $RepositoryPath
  # Drain child output in managed callbacks, never persist raw runtime/credential errors.
  if (-not ('MyOttSupervisorProcess' -as [type])) {
    Add-Type -TypeDefinition @'
using System.Diagnostics;
public static class MyOttSupervisorProcess {
  public static Process Start(ProcessStartInfo info) {
    var p = new Process(); p.StartInfo = info;
    p.OutputDataReceived += (s,e) => {};
    p.ErrorDataReceived += (s,e) => {};
    p.Start(); p.BeginOutputReadLine(); p.BeginErrorReadLine(); return p;
  }
}
'@
  }
  $info = [Diagnostics.ProcessStartInfo]::new()
  $info.FileName=$runtime.NodeExecutable; $info.WorkingDirectory=$RepositoryPath
  $envArg = if ([string]::IsNullOrWhiteSpace($runtime.EnvironmentFilePath)) { '' } else { '--env-file="' + $runtime.EnvironmentFilePath + '" ' }
  $info.Arguments=$envArg + '"' + $runtime.NextCliPath + '" dev "' + $RepositoryPath + '" --hostname 127.0.0.1 --port 3000'
  $info.UseShellExecute=$false; $info.CreateNoWindow=$true
  $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
  $info.EnvironmentVariables['NODE_PATH']=$runtime.DependencyRoot
  $info.EnvironmentVariables['NODE_OPTIONS']=Merge-FounderNodeOptions $env:NODE_OPTIONS
  $info.EnvironmentVariables['NEXT_TELEMETRY_DISABLED']='1'
  $info.EnvironmentVariables['GIT_OPTIONAL_LOCKS']='0'
  $p = [MyOttSupervisorProcess]::Start($info)
  $until = [DateTimeOffset]::UtcNow.AddSeconds(60)
  try {
    do {
      $owned = Get-FpsRuntime $RepositoryPath
      if ($null -ne $owned) { $owned | Add-Member -NotePropertyName launcher -NotePropertyValue $p; return $owned }
      if ($p.HasExited) { throw 'LAUNCHER_EXIT_BEFORE_BIND' }
      Start-Sleep -Milliseconds 500
    } while ([DateTimeOffset]::UtcNow -lt $until)
    throw 'START_BIND_TIMEOUT'
  } catch { $p.Dispose(); throw }
  } finally { if ($held) { $lock.ReleaseMutex() }; $lock.Dispose() }
}

function Write-FpsStatus {
  param($Config, $Desired, $Recovery, $Runtime, $Metrics, [string]$State)
  $Metrics.stateWrites++
  $p=$Recovery.Provenance
  if ($Recovery.SafeHold -and $null -eq $p.safeHoldReason) { Set-FpsHold $Recovery STATE_CORRUPTION $Desired }
  if ($Recovery.SafeHold -and $p.safeHoldGeneration -eq 0 -and $null -ne $Desired) {
    $p.safeHoldGeneration=$Desired.generation;$p.safeHoldCandidateRoot=$Desired.candidateRoot
  }
  if ($Recovery.SafeHold -and [string]::IsNullOrEmpty($p.safeHoldInstallIdentity) -and [IO.File]::Exists($Config.Install)) {$p.safeHoldInstallIdentity=(Get-FileHash -LiteralPath $Config.Install).Hash}
  $p.stateRevision++
  $value=[ordered]@{
    schemaVersion=2; version=$script:FpsVersion; supervisorPid=$PID
    supervisorStartUtc=[Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().ToString('o')
    recordedAt=[DateTimeOffset]::UtcNow.ToString('o'); state=$State; desired=$Desired
    runtimePid=$(if ($null -ne $Runtime) {$Runtime.metadata.ProcessId} else {0})
    runtimeIdentity=$(if ($null -ne $Runtime) {$Runtime.metadata} else {$null})
    safeHold=$Recovery.SafeHold; restartTimes=@($Recovery.Restarts | ForEach-Object {$_.ToString('o')}); metrics=$Metrics
    desiredState=$(if($null -ne $Desired){$Desired.desiredState}else{$null})
    restartTimestamps=@($Recovery.Restarts | ForEach-Object {$_.ToString('o')})
    health=[ordered]@{lastProbeStartedAt=$Metrics.lastProbeStartedAt;lastProbeCompletedAt=$Metrics.lastProbeCompletedAt;lastSuccessAt=$Metrics.lastSuccessAt;lastHttp=$Metrics.lastHttp;failures=$Recovery.Failures;firstFailureAt=$Recovery.FirstFailure.ToString('o');nextDue=$Recovery.Due.ToString('o');phase=$Recovery.Phase}
    lifecycle=$script:FpsLifecycle
  }
  foreach($key in $p.Keys){$value[$key]=$p[$key]}
  Write-FpsAtomic $Config.Status $value
}

function Get-FpsObservedState {
  param($Status, [bool]$IdentityMatches, [string]$TaskState, [DateTimeOffset]$Now = [DateTimeOffset]::UtcNow)
  if (-not $IdentityMatches) { return 'SUPERVISOR_NOT_RUNNING' }
  if ($TaskState -ne 'Running') { return 'TASK_OWNERSHIP_NOT_PROVEN' }
  if ($Status.state -in @('HEALTHY','DEGRADED_BUT_RESPONSIVE')) {
    try {
      $probe = Convert-FpsInstant $Status.health.lastProbeCompletedAt
      if (($Now-$probe).TotalSeconds -gt 75 -or $probe -gt $Now -or $Status.health.lastHttp -le 0) { return 'HEALTH_NOT_CURRENT' }
    } catch { return 'HEALTH_NOT_CURRENT' }
  }
  return $Status.state
}

function Read-FpsObservedStatus {
  param($Config, $Task)
  $s = Read-FpsJson $Config.Status
  $matches = $false
  $p = $null
  try {
    $p = [Diagnostics.Process]::GetProcessById($s.supervisorPid)
    $m = Get-FounderProcessMetadata -ProcessId $s.supervisorPid
    $expectedCommand = (Join-Path $Config.Bin 'FounderPreview.Supervisor.ps1')
    $matches = -not $p.HasExited -and $p.Path -ieq $Config.HostExe -and
      $p.StartTime.ToUniversalTime().Ticks -eq (Convert-FpsInstant $s.supervisorStartUtc).UtcTicks -and
      $m.CommandLine.Contains('"' + $expectedCommand + '"') -and $m.CommandLine.EndsWith(' -Mode Run')
  } catch { $matches = $false }
  finally { if ($null -ne $p) { $p.Dispose() } }
  $reported = $s.state
  $s.state = Get-FpsObservedState $s $matches $Task.state
  $desired=Read-FpsJson $Config.Desired
  if ($matches -and ($s.desired.generation -ne $desired.generation -or $s.desired.candidateRoot -ine $desired.candidateRoot)) { $s.state='DESIRED_GENERATION_NOT_CURRENT' }
  $s | Add-Member -NotePropertyName reportedState -NotePropertyValue $reported -Force
  $s | Add-Member -NotePropertyName supervisorIdentityMatches -NotePropertyValue $matches -Force
  return $s
}

function Wait-FpsWake {
  param([Threading.WaitHandle[]]$Handles, [DateTimeOffset]$Due, [DateTimeOffset]$Now)
  $ms=[int][Math]::Min([int]::MaxValue,[Math]::Max(1,($Due-$Now).TotalMilliseconds))
  return [Threading.WaitHandle]::WaitAny($Handles,$ms)
}

function Get-FpsExitDisposition {
  param([string]$Result, $Desired, [bool]$Fatal = $false)
  if ($Fatal) { return [pscustomobject]@{code=22;classification='HANDLED_FATAL_ERROR';plannedReason=$null} }
  if ($Result -eq 'DUPLICATE_REJECTED') { return [pscustomobject]@{code=23;classification='DUPLICATE_REJECTED';plannedReason=$null} }
  if ($Result -eq 'STOPPED_SUPERVISOR_ONLY' -and $null -ne $Desired -and (Test-FpsDesired $Desired)) {
    if ($Desired.request -eq 'UNINSTALL') { return [pscustomobject]@{code=0;classification='INTENTIONAL_EXIT';plannedReason='UNINSTALL'} }
    if ($Desired.desiredState -eq 'STOPPED' -and $Desired.request -eq 'STOPPED') { return [pscustomobject]@{code=0;classification='INTENTIONAL_EXIT';plannedReason='STOPPED'} }
  }
  return [pscustomobject]@{code=21;classification='UNEXPECTED_TOP_LEVEL_RETURN';plannedReason=$null}
}

function Start-FpsLifecycle {
  param($Config)
  if ($null -eq $script:FpsLifecycle) { return }
  $previous = $null
  if ([IO.File]::Exists($Config.Lifecycle)) {
    $prior = Read-FpsJson $Config.Lifecycle
    $previous = [ordered]@{pid=$prior.pid;startUtc=$prior.startUtc;exitClassification=$prior.exitClassification;abruptTerminationSuspected=($null -eq $prior.finalizedAt)}
  }
  $script:FpsLifecycle.owned = $true
  $script:FpsLifecycle.previous = $previous
  Set-FpsLifecycleCheckpoint $Config 'STARTUP' -Persist
}

function Set-FpsLifecycleCheckpoint {
  param($Config, [string]$Checkpoint, $Desired = $null, $Metrics = $null, [switch]$Persist)
  if ($null -eq $script:FpsLifecycle -or -not $script:FpsLifecycle.owned) { return }
  $l=$script:FpsLifecycle
  $l.lastCheckpoint=$Checkpoint; $l.checkpointAt=[DateTimeOffset]::UtcNow.ToString('o')
  if ($null -ne $Desired) { $l.generation=$Desired.generation; $l.candidate=$Desired.candidateRoot; $l.desiredState=$Desired.desiredState }
  if ($null -ne $Metrics) { $l.lastCompletedHealthProbe=$Metrics.lastProbeCompletedAt }
  if ($Checkpoint -eq 'CONTROL_EVENT') { $l.lastControlEvent=$l.checkpointAt }
  if ($Persist) { Write-FpsAtomic $Config.Lifecycle $l }
}

function Invoke-FpsEntrypoint {
  param($Config = (Get-FpsConfig), [scriptblock]$Body = { Invoke-FpsSupervisor })
  $script:FpsLifecycle=[ordered]@{
    schemaVersion=1;pid=$PID;startUtc=[Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().ToString('o')
    owned=$false;generation=0;candidate=$null;desiredState=$null;startReason='CANONICAL_RUN_ENTRY'
    lastCheckpoint='ENTRY';checkpointAt=[DateTimeOffset]::UtcNow.ToString('o');lastCompletedHealthProbe=$null
    lastControlEvent=$null;plannedExitReason=$null;exitClassification=$null;exitCode=$null;finalizedAt=$null;previous=$null
  }
  $disposition=$null
  try {
    $result=& $Body
    $desired=Read-FpsJson $Config.Desired
    $disposition=Get-FpsExitDisposition ([string]$result) $desired
  } catch {
    $disposition=Get-FpsExitDisposition '' $null -Fatal $true
  } finally {
    if ($script:FpsLifecycle.owned) {
      # A host cancellation may execute finally without reaching our catch; never record success then.
      if ($null -eq $disposition) { $disposition=Get-FpsExitDisposition '' $null -Fatal $true }
      $script:FpsLifecycle.plannedExitReason=$disposition.plannedReason
      $script:FpsLifecycle.exitClassification=$disposition.classification
      $script:FpsLifecycle.exitCode=$disposition.code
      $script:FpsLifecycle.finalizedAt=[DateTimeOffset]::UtcNow.ToString('o')
      try { Write-FpsAtomic $Config.Lifecycle $script:FpsLifecycle } catch { $disposition=Get-FpsExitDisposition '' $null -Fatal $true }
    }
  }
  return [int]$disposition.code
}

function Invoke-FpsSupervisor {
  $c = Get-FpsConfig
  $mutex = [Threading.Mutex]::new($false, $c.Mutex)
  $locked=$false; $control=$null; $runtime=$null
  try {
    try { $locked=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked=$true }
    if (-not $locked) { return 'DUPLICATE_REJECTED' }
    $startupReason=$null
    try {Start-FpsLifecycle $c} catch {$startupReason='STATE_CORRUPTION'}
    try {Assert-FpsInstallation $c | Out-Null} catch {$startupReason='INSTALLATION_INTEGRITY_FAILURE'}
    $installIdentity=if([IO.File]::Exists($c.Install)){(Get-FileHash -LiteralPath $c.Install).Hash}else{''}
    $control=[Threading.EventWaitHandle]::new($false,[Threading.EventResetMode]::AutoReset,$c.Event)
    $metrics=[ordered]@{healthProbes=0;stateWrites=0;logWrites=0;healthySuccessLogs=0;gitScansDuringHealth=0;restarts=0;externalRequests=0;wakeups=0;processExitWakes=0;lastErrorCode='NONE';lastProbeStartedAt=$null;lastProbeCompletedAt=$null;lastSuccessAt=$null;lastHttp=0}
    $r=New-FpsRecovery; $d=$null; $state='START'; $generation=0; $epoch=''; $root=''
    if ([IO.File]::Exists($c.Status)) {
      try {
        $previous=Read-FpsJson $c.Status
        $r=Import-FpsRecovery $previous
        if(Test-FpsDesired $previous.desired){$epoch=$previous.desired.budgetEpoch}
      } catch {Set-FpsHold $r STATE_CORRUPTION}
    }
    if($null -ne $startupReason){Set-FpsHold $r $startupReason}
    $heartbeat=[DateTimeOffset]::UtcNow.AddMinutes(10)
    Write-FpsTransition $c START $metrics
    while ($true) {
      try {
        $incoming=Read-FpsJson $c.Desired
        if (-not (Test-FpsDesired $incoming)) { throw 'DESIRED_STATE_INVALID' }
        if ($incoming.generation -lt $generation) { throw 'GENERATION_REWIND' }
        if ($incoming.generation -ne $generation) {
          if ($root -ne '' -and $root -ine $incoming.candidateRoot) {
            Stop-FpsRuntime $runtime; Close-FpsRuntimeHandle $runtime; $runtime=$null
            Write-FpsTransition $c CANDIDATE_SWITCH $metrics
          }
          $d=$incoming; $root=$d.candidateRoot; $generation=$d.generation
          Set-FpsLifecycleCheckpoint $c 'DESIRED_ACCEPTED' $d -Persist
          # Desired changes and reboot do not discard security holds or restart accounting.
          if ($epoch -ne $d.budgetEpoch) { $epoch=$d.budgetEpoch }
          if ($d.request -eq 'UNINSTALL') { break }
          if ($d.request -in @('STOPPED','RESTART','MAINTENANCE')) {
            if ($null -eq $runtime) { $runtime=Get-FpsRuntime $root }
            Stop-FpsRuntime $runtime; Close-FpsRuntimeHandle $runtime; $runtime=$null
            if ($d.request -eq 'RESTART') { $r.Failures=0; $r.Due=[DateTimeOffset]::UtcNow; $r.Phase='PROBE' }
          }
          $state=if ($r.SafeHold) {'SAFE_HOLD'} elseif ($d.desiredState -eq 'STOPPED') {'STOP'} elseif (Test-FpsLease $d) {'MAINTENANCE'} else {'START'}
          Write-FpsStatus $c $d $r $runtime $metrics $state
        }
        $now=[DateTimeOffset]::UtcNow
        $lease=Test-FpsLease $d $now
        $p=$r.Provenance
        if(Test-FpsSafeHoldReevaluationAllowed $r $d $now) {
          $key=Get-FpsReconciliationKey $r $d $installIdentity $now
          if($key -cne $p.evaluationKey) {
            $checks=Get-FpsRecoveryConditions $c $d $r $now
            $eligible=Begin-FpsPendingRecovery $r $checks $key
            Write-FpsStatus $c $d $r $runtime $metrics $(if($eligible){'RECOVERY_PENDING'}else{'SAFE_HOLD'})
            if($eligible) {
              # Recheck immediately before the durable one-shot reservation.
              $checks=Get-FpsRecoveryConditions $c $d $r ([DateTimeOffset]::UtcNow)
              if((Test-FpsRecoveryConditions $checks) -ne 'RECOVERY_ELIGIBLE') {
                $p.containmentState='SAFE_HOLD';$p.legacyMigrationStatus=Test-FpsRecoveryConditions $checks
              } else {
                $p.bootstrapAttempts=1;$r.Restarts+=@([DateTimeOffset]::UtcNow)
                Write-FpsStatus $c $d $r $runtime $metrics 'RECOVERY_PENDING'
                try {
                  $runtime=Start-FpsRuntime $root
                  $metrics.lastProbeStartedAt=[DateTimeOffset]::UtcNow.ToString('o')
                  $page=Invoke-FpsPageReadiness
                  $metrics.healthProbes++;$metrics.lastProbeCompletedAt=[DateTimeOffset]::UtcNow.ToString('o');$metrics.lastHttp=$page.root
                  $p.pageReadiness=$page
                  if(Complete-FpsPendingRecovery $r $page.pass){$state='HEALTHY';$metrics.lastSuccessAt=$metrics.lastProbeCompletedAt}
                  else {$p.containmentState='SAFE_HOLD';$p.legacyMigrationStatus='BLOCKED_PAGE_READINESS';$state='SAFE_HOLD'}
                } catch {
                  Set-FpsHold $r (Get-FpsHoldReason $_.Exception.Message) $d $installIdentity
                  $p.legacyMigrationStatus='BLOCKED_BOOTSTRAP_FAILED';$state='SAFE_HOLD'
                }
              }
              Write-FpsStatus $c $d $r $runtime $metrics $state
            }
          }
        }
        if (-not $r.SafeHold -and $d.desiredState -eq 'RUNNING' -and -not $lease -and $now -ge $r.Due) {
          if ($r.Phase -eq 'RESTART') {
            Set-FpsLifecycleCheckpoint $c 'RECOVERY_OWNERSHIP_CHECK' $d $metrics -Persist
            # Re-prove port ownership immediately before each bounded recovery.
            $current=Get-FpsRuntime $root
            try { Stop-FpsRuntime $current } finally { Close-FpsRuntimeHandle $current }
            Close-FpsRuntimeHandle $runtime; $runtime=$null
            $r.Restarts=@($r.Restarts)+@($now); $metrics.restarts++
            Write-FpsTransition $c RESTART $metrics
            Write-FpsStatus $c $d $r $runtime $metrics 'RESTART'
            $runtime=Start-FpsRuntime $root
            $r.Failures=0; $r.Phase='PROBE'
          } elseif ($null -eq $runtime -and $r.Failures -eq 0) {
            Set-FpsLifecycleCheckpoint $c 'INITIAL_OWNERSHIP_CHECK' $d $metrics -Persist
            $runtime=Get-FpsRuntime $root
            if ($null -eq $runtime) {
              # Initial DOWN also follows confirmation/backoff, never an unbudgeted restart.
              $r.Due=$now
            }
          }
          $metrics.lastProbeStartedAt=[DateTimeOffset]::UtcNow.ToString('o')
          Set-FpsLifecycleCheckpoint $c 'HTTP_PROBE' $d $metrics
          $http=Invoke-FpsHealth; $metrics.healthProbes++
          $metrics.lastProbeCompletedAt=[DateTimeOffset]::UtcNow.ToString('o'); $metrics.lastHttp=$http
          if ($http -eq 200) { $metrics.lastSuccessAt=$metrics.lastProbeCompletedAt }
          Set-FpsLifecycleCheckpoint $c 'HEALTH_PROBE_COMPLETED' $d $metrics
          if ($http -gt 0 -and $null -eq $runtime) { $runtime=Get-FpsRuntime $root; if ($null -eq $runtime) { throw 'HTTP_OWNER_UNPROVEN' } }
          $newState=Update-FpsRecovery $r $http ([DateTimeOffset]::UtcNow)
          if ($state -ne $newState) {
            $state=$newState; Write-FpsTransition $c $state $metrics
          }
          # Persist failed confirmations as well as successful probe freshness; never log healthy probes.
          Write-FpsStatus $c $d $r $runtime $metrics $state
          $heartbeat=[DateTimeOffset]::UtcNow.AddMinutes(10)
        }
      } catch {
        $known=@('STATE_CORRUPT','DESIRED_STATE_INVALID','GENERATION_REWIND','UNKNOWN_3000_OWNERSHIP','RUNTIME_IDENTITY_INCOMPLETE','RUNTIME_OWNERSHIP_CHANGED','RUNTIME_STOP_TIMEOUT','START_PORT_NOT_EMPTY','LAUNCHER_EXIT_BEFORE_BIND','START_BIND_TIMEOUT','HTTP_OWNER_UNPROVEN','LIFECYCLE_LOCK_TIMEOUT')
        $metrics.lastErrorCode=if ($_.Exception.Message -in $known) {$_.Exception.Message} else {'SUPERVISOR_OPERATION_FAILED'}
        Set-FpsHold $r (Get-FpsHoldReason $_.Exception.Message) $d $installIdentity
        $state='SAFE_HOLD'
        Write-FpsTransition $c SAFE_HOLD $metrics
        Write-FpsStatus $c $d $r $runtime $metrics $state
      }
      $now=[DateTimeOffset]::UtcNow
      if ($now -ge $heartbeat) { Write-FpsStatus $c $d $r $runtime $metrics $state; $heartbeat=$now.AddMinutes(10) }
      $due=$heartbeat
      if($r.SafeHold -and $r.Provenance.safeHoldReason -in @('LEGACY_REASON_MISSING','RESTART_BUDGET_EXHAUSTED') -and $r.Provenance.bootstrapAttempts -eq 0) {
        $expiry=@($r.Restarts|ForEach-Object {$_.AddSeconds(600)}|Where-Object {$_ -gt $now}|Sort-Object|Select-Object -First 1)
        if($expiry.Count -gt 0 -and $expiry[0] -lt $due){$due=$expiry[0]}
        if($lease -and (Convert-FpsInstant $d.lease.expiresAt) -lt $due){$due=Convert-FpsInstant $d.lease.expiresAt}
      }
      if ($null -ne $d -and -not $r.SafeHold -and $d.desiredState -eq 'RUNNING') {
        $workDue=if (Test-FpsLease $d $now) {Convert-FpsInstant $d.lease.expiresAt} else {$r.Due}
        if ($workDue -lt $due) { $due=$workDue }
      }
      $waits=@([Threading.WaitHandle]$control)
      if ($null -ne $runtime -and -not $r.SafeHold) { $waits+=@([Threading.WaitHandle]$runtime.wait) }
      $w=Wait-FpsWake ([Threading.WaitHandle[]]$waits) $due $now
      $metrics.wakeups++
      if ($w -eq 0) { Set-FpsLifecycleCheckpoint $c 'CONTROL_EVENT' $d $metrics -Persist }
      if ($w -eq 1) {
        $metrics.processExitWakes++
        Close-FpsRuntimeHandle $runtime; $runtime=$null; $r.Due=[DateTimeOffset]::UtcNow
      }
    }
    Write-FpsTransition $c STOP $metrics
    return 'STOPPED_SUPERVISOR_ONLY'
  } finally {
    Close-FpsRuntimeHandle $runtime
    if ($null -ne $control) {$control.Dispose()}
    if ($locked) {$mutex.ReleaseMutex()}; $mutex.Dispose()
  }
}

function Invoke-FpsCommand {
  param([string]$Action, [string]$RepositoryPath)
  $c=Get-FpsConfig
  if ($Action -eq 'supervisor-install') { return Install-FpsSupervisor $c $RepositoryPath }
  if ($Action -eq 'supervisor-uninstall' -and -not [IO.File]::Exists($c.Install)) {
    if (@(Get-ScheduledTask -TaskName $c.TaskName -ErrorAction SilentlyContinue).Count -ne 0) { throw 'ORPHAN_TASK_IDENTITY_UNPROVEN' }
    return 'ALREADY_UNINSTALLED'
  }
  Assert-FpsInstallation $c | Out-Null
  if ($Action -in @('supervisor-status','status')) {
    $task=Get-FpsTaskDefinition $c
    return [pscustomobject]@{task=$task;installation=Read-FpsJson $c.Install;status=Read-FpsObservedStatus $c $task}
  }
  if ($Action -eq 'check') { throw 'PNPM_CHECK_PROHIBITED' }
  if ($Action -eq 'supervisor-uninstall') {
    Disable-ScheduledTask -TaskName $c.TaskName | Out-Null
    Publish-FpsDesired $c $RepositoryPath UNINSTALL | Out-Null
    $until=[DateTimeOffset]::UtcNow.AddSeconds(30)
    do { $t=Get-FpsTaskDefinition $c; if ($t.state -ne 'Running') {break}; Start-Sleep -Milliseconds 500 } while ([DateTimeOffset]::UtcNow -lt $until)
    if ($t.state -eq 'Running') { throw 'SUPERVISOR_EXIT_NOT_PROVEN' }
    Unregister-ScheduledTask -TaskName $c.TaskName -Confirm:$false
    foreach ($file in $c.Files) {[IO.File]::Delete((Join-Path $c.Bin $file))}
    foreach ($file in @($c.Desired,$c.Status,$c.Install)) {[IO.File]::Delete($file)}
    return 'UNINSTALLED_LEGACY_NOT_REACTIVATED'
  }
  $request=switch ($Action) {'stop' {'STOPPED'} 'restart' {'RESTART'} 'build' {'MAINTENANCE'} default {'RUNNING'}}
  $desired=Publish-FpsDesired $c $RepositoryPath $request -ResetBudget:($Action -in @('start','ensure'))
  if ($request -eq 'STOPPED') {
    Disable-ScheduledTask -TaskName $c.TaskName | Out-Null
    # Disabled tasks cannot reconcile an absent Supervisor; explicit stop still owns runtime cleanup.
    $current=Read-FpsObservedStatus $c (Get-FpsTaskDefinition $c)
    if ($null -eq $current -or $current.state -eq 'SUPERVISOR_NOT_RUNNING') {
      $runtime=Get-FpsRuntime $RepositoryPath
      try {Stop-FpsRuntime $runtime} finally {Close-FpsRuntimeHandle $runtime}
      return [pscustomobject]@{state='STOP';desired=$desired;runtimePid=0;taskEnabled=$false}
    }
  } else { Enable-ScheduledTask -TaskName $c.TaskName | Out-Null }
  $t=Get-FpsTaskDefinition $c
  if ($request -ne 'STOPPED' -and $t.state -ne 'Running') { Start-ScheduledTask -TaskName $c.TaskName }
  $until=[DateTimeOffset]::UtcNow.AddSeconds(120)
  $s=$null
  do {
    if ([IO.File]::Exists($c.Status)) {
      $s=Read-FpsJson $c.Status
      if ($null -ne $s.desired -and $s.desired.generation -eq $desired.generation) {
        if ($s.safeHold) { throw 'SUPERVISOR_SAFE_HOLD' }
        if ($request -in @('STOPPED','MAINTENANCE') -and $s.runtimePid -eq 0) {break}
        if ($request -eq 'RUNNING' -or $request -eq 'RESTART') {
          if ($s.runtimePid -gt 0 -and (Invoke-FpsHealth) -gt 0) {return $s}
        }
      }
    }
    Start-Sleep -Milliseconds 500
  } while ([DateTimeOffset]::UtcNow -lt $until)
  if ($null -ne $s -and $request -eq 'STOPPED' -and $s.runtimePid -eq 0) {return $s}
  if ($null -eq $s -or $request -ne 'MAINTENANCE' -or $s.runtimePid -ne 0) {throw 'CONTROL_ACK_TIMEOUT'}
  try {
    $code=1
    Invoke-FounderPnpm -RepositoryPath $RepositoryPath -Arguments @('build') -ExitCode ([ref]$code)
    if ($code -ne 0) { throw 'BUILD_FAILED' }
  } finally { Invoke-FpsCommand ensure $RepositoryPath | Out-Null }
  return 'BUILD_COMPLETED_DESIRED_RUNNING'
}

if ($Mode -eq 'Run') {
  $ErrorActionPreference='Stop'
  $env:GIT_OPTIONAL_LOCKS='0'
  $code=Invoke-FpsEntrypoint -Body {
    . (Join-Path $PSScriptRoot 'FounderPreview.Common.ps1')
    Invoke-FpsSupervisor
  }
  exit $code
}
