param(
  [string]$BaseUrl = "http://localhost:8000",
  [string]$InternalKey = $(if ($env:AI_INTERNAL_KEY) { $env:AI_INTERNAL_KEY } else { $env:INTERNAL_KEY })
)

function Import-DotEnvIfPresent {
  param(
    [string]$DotEnvPath
  )

  if (-not $DotEnvPath -or -not (Test-Path -LiteralPath $DotEnvPath)) {
    return
  }

  Get-Content -LiteralPath $DotEnvPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith('#')) { return }

    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $name = $Matches[1]
      $value = $Matches[2]

      # Strip surrounding quotes if present
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      # Only set env var if it isn't already set in the process
      if (-not (Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue)) {
        Set-Item -Path "Env:$name" -Value $value
      }
    }
  }
}

# If the key isn't already present in the environment, try loading ai-engine/.env
if (-not $env:AI_INTERNAL_KEY -and -not $env:INTERNAL_KEY) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $dotEnvPath = Join-Path (Resolve-Path (Join-Path $scriptDir "..")) ".env"
  Import-DotEnvIfPresent -DotEnvPath $dotEnvPath
}

# Re-resolve after .env import (unless explicitly provided as a param)
if (-not $InternalKey) {
  $InternalKey = if ($env:AI_INTERNAL_KEY) { $env:AI_INTERNAL_KEY } else { $env:INTERNAL_KEY }
}

if (-not $InternalKey) {
  Write-Error "Set AI_INTERNAL_KEY (or INTERNAL_KEY) env var."
  exit 1
}

$headers = @{ "Content-Type" = "application/json"; "X-Internal-Key" = $InternalKey }

Write-Host "1) POST /generate-embedding"
$embBody = @{ text = "Senior ICU nurse with pediatric experience" } | ConvertTo-Json -Compress -Depth 10
$emb = Invoke-RestMethod -Method Post -Uri "$BaseUrl/generate-embedding" -Headers $headers -Body $embBody
Write-Host ("Vector length: {0}" -f $emb.vector.Length)

Write-Host "2) POST /recommend-jobs"
$jobsBody = @{ profile_vector = $emb.vector; limit = 5 } | ConvertTo-Json -Compress -Depth 10
$jobs = Invoke-RestMethod -Method Post -Uri "$BaseUrl/recommend-jobs" -Headers $headers -Body $jobsBody
$jobs.recommendations | Select-Object -First 5 | Format-Table

Write-Host "3) POST /recommend-candidates"
$candBody = @{ job_vector = $emb.vector; candidate_ids = @(1,2,3,4,5,6,7,8,9,10); limit = 5 } | ConvertTo-Json -Compress -Depth 10
$cands = Invoke-RestMethod -Method Post -Uri "$BaseUrl/recommend-candidates" -Headers $headers -Body $candBody
$cands.recommendations | Select-Object -First 5 | Format-Table

Write-Host "Done"
