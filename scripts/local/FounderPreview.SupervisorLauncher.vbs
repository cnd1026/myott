Option Explicit
Dim shell, files, bin, supervisor, host, command, code
On Error Resume Next
If WScript.Arguments.Count <> 0 Then WScript.Quit 80
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
If Err.Number <> 0 Then WScript.Quit 80
bin = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\MyOTT\FounderPreview\bin"
host = "C:\Program Files\PowerShell\7\pwsh.exe"
supervisor = bin & "\FounderPreview.Supervisor.ps1"
If InStr(bin, Chr(34)) > 0 Or InStr(bin, vbCr) > 0 Or InStr(bin, vbLf) > 0 Then WScript.Quit 80
If StrComp(WScript.ScriptFullName, bin & "\FounderPreview.SupervisorLauncher.vbs", vbTextCompare) <> 0 Then WScript.Quit 80
If Not files.FileExists(host) Or Not files.FileExists(supervisor) Then WScript.Quit 80
If Err.Number <> 0 Then WScript.Quit 80
command = Chr(34) & host & Chr(34) & " -NoLogo -NoProfile -NonInteractive -File " & Chr(34) & supervisor & Chr(34) & " -Mode Run"
code = shell.Run(command, 0, True)
If Err.Number <> 0 Then WScript.Quit 81
WScript.Quit code
