param([string]$ProjectRoot = (Split-Path $PSScriptRoot -Parent), [string]$PythonCommand = "python")
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$source = Get-Content (Join-Path $ProjectRoot 'src/lib/data.ts') -Raw -Encoding utf8
$block = [regex]::Match($source, '(?s)export const demoLines = \[(.*?)\n\];').Groups[1].Value
$lines = @([regex]::Matches($block, '(?m)^\s*(".*")\s*,\s*$') | ForEach-Object { $_.Groups[1].Value | ConvertFrom-Json })
if ($lines.Count -ne 8) { throw 'Expected eight demo transcript lines' }
$tempMedia = Join-Path $env:TEMP ('sounding-media-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempMedia | Out-Null
$speaker = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $speaker.Rate = @(0, -1, 1, 0, 0, -1, 1, 0)[$i]
    $speaker.SetOutputToWaveFile((Join-Path $tempMedia ($i.ToString() + '.wav')))
    $speaker.Speak($lines[$i])
    $speaker.SetOutputToNull()
  }
} finally { $speaker.Dispose() }
& $PythonCommand (Join-Path $ProjectRoot 'scripts/assemble-media.py') $tempMedia $ProjectRoot
if ($LASTEXITCODE -ne 0) { throw 'Audio assembly failed' }
Write-Output 'Generated fictional speech using the installed Microsoft Zira voice. No external voice or recording was copied.'

