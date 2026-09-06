<#
.SYNOPSIS
  Pre-flight check for building the StudyForge Android app on Windows.

.DESCRIPTION
  Verifies the things that actually broke the previous Windows build:
    * the debug keystore exists (missing keystore => :app:validateSigningDebug fails)
    * a JDK is on PATH
    * ANDROID_HOME / local.properties point at a real SDK
    * NODE_ENV is set (the release log warned it was missing)
    * node_modules is installed
    * mobile/.env exists

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\windows-android-doctor.ps1
#>

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$problems = @()

function Test-Item($ok, $okMsg, $badMsg) {
  if ($ok) { Write-Host "  OK    $okMsg" -ForegroundColor Green }
  else { Write-Host "  FAIL  $badMsg" -ForegroundColor Red; $script:problems += $badMsg }
}

Write-Host "StudyForge Windows Android doctor" -ForegroundColor Cyan

$keystore = Join-Path $root 'mobile\android\app\debug.keystore'
Test-Item (Test-Path $keystore) "debug.keystore present" `
  "debug.keystore missing. Run: bash scripts/bootstrap-debug-keystore.sh (or use Git Bash / WSL)"

$java = Get-Command java -ErrorAction SilentlyContinue
Test-Item ($null -ne $java) "java on PATH" "No JDK on PATH. Use Android Studio's JBR or install JDK 17+."

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
$localProps = Join-Path $root 'mobile\android\local.properties'
Test-Item (($sdk -and (Test-Path $sdk)) -or (Test-Path $localProps)) `
  "Android SDK located" `
  "Set ANDROID_HOME or copy mobile/android/local.properties.example to local.properties"

Test-Item ($null -ne $env:NODE_ENV) "NODE_ENV set ($env:NODE_ENV)" `
  "NODE_ENV is not set. The Gradle release log warned about this. Use: `$env:NODE_ENV='production'"

Test-Item (Test-Path (Join-Path $root 'mobile\node_modules')) "node_modules installed" `
  "Run: cd mobile; npm ci"

Test-Item (Test-Path (Join-Path $root 'mobile\.env')) "mobile/.env present" `
  "Copy mobile/.env.example to mobile/.env and set EXPO_PUBLIC_API_URL"

Write-Host ""
if ($problems.Count -eq 0) {
  Write-Host "All checks passed. Build with: cd mobile\android; .\gradlew assembleDebug" -ForegroundColor Green
  exit 0
}
Write-Host "$($problems.Count) problem(s) found. Fix them before building." -ForegroundColor Yellow
exit 1
