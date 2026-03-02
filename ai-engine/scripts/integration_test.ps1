param(
  [string]$BaseUrl = "http://localhost:8000",
  [string]$InternalKey = $(if ($env:AI_INTERNAL_KEY) { $env:AI_INTERNAL_KEY } else { $env:INTERNAL_KEY })
)

if (-not $InternalKey) {
  Write-Error "Set AI_INTERNAL_KEY (or INTERNAL_KEY) env var."
  exit 1
}

$headers = @{ "Content-Type" = "application/json"; "X-Internal-Key" = $InternalKey }

Write-Host "1) POST /generate-embedding"
$embBody = @{ text = "Senior ICU nurse with pediatric experience" } | ConvertTo-Json -Compress
$emb = Invoke-RestMethod -Method Post -Uri "$BaseUrl/generate-embedding" -Headers $headers -Body $embBody
Write-Host ("Vector length: {0}" -f $emb.vector.Length)

Write-Host "2) POST /recommend-jobs"
$jobsBody = @{ profile_vector = $emb.vector; limit = 5 } | ConvertTo-Json -Compress
$jobs = Invoke-RestMethod -Method Post -Uri "$BaseUrl/recommend-jobs" -Headers $headers -Body $jobsBody
$jobs.recommendations | Select-Object -First 5 | Format-Table

Write-Host "3) POST /recommend-candidates"
$candBody = @{ job_vector = $emb.vector; candidate_ids = @(1,2,3,4,5,6,7,8,9,10); limit = 5 } | ConvertTo-Json -Compress
$cands = Invoke-RestMethod -Method Post -Uri "$BaseUrl/recommend-candidates" -Headers $headers -Body $candBody
$cands.recommendations | Select-Object -First 5 | Format-Table

Write-Host "Done"
