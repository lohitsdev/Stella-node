# Test script for personalization endpoint
$body = @{
    sessionId = "test_session_123"
    step7 = @{
        userName = "TestUser"
        personalizedResultsRequested = $true
    }
    step2 = @{
        selectedHelpAreas = @("anxiety")
    }
    step3 = @{
        anxietyFrequencyIndex = 2
        anxietyFrequencyLabel = "Weekly"
    }
    step5 = @{
        smartCheckInsEnabled = $true
    }
    step6 = @{
        improveWithDataEnabled = $false
    }
} | ConvertTo-Json -Depth 3

Write-Host "Sending request to personalization endpoint..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/onboarding/personalize" -Method POST -ContentType "application/json" -Body $body
    Write-Host "Response received:"
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error occurred:"
    Write-Host $_.Exception.Message
    Write-Host "Response:"
    Write-Host $_.Exception.Response
}
