# 🛠️ Code Quality Tools Setup Script (PowerShell)
# This script sets up ESLint, Prettier, and Husky for the Stella Node.js API

Write-Host "🚀 Setting up Code Quality Tools for Stella API..." -ForegroundColor Green

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "📦 npm version: $npmVersion" -ForegroundColor Blue
} catch {
    Write-Host "❌ npm is not installed. Please install Node.js and npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Initialize Husky
Write-Host "🐕 Setting up Husky..." -ForegroundColor Yellow
npm run prepare

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to initialize Husky" -ForegroundColor Red
    exit 1
}

# Test the setup
Write-Host "🧪 Testing the setup..." -ForegroundColor Yellow

# Run quality checks
Write-Host "🔍 Running quality checks..." -ForegroundColor Blue
npm run quality

# If quality checks fail, try to fix them
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔧 Fixing quality issues..." -ForegroundColor Yellow
    npm run quality:fix
}

# Final test
Write-Host "✅ Final verification..." -ForegroundColor Blue
npm run quality

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Code Quality Tools setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Available commands:" -ForegroundColor Cyan
    Write-Host "  npm run lint          - Lint and fix all files" -ForegroundColor White
    Write-Host "  npm run format        - Format all files" -ForegroundColor White
    Write-Host "  npm run quality       - Check linting and formatting" -ForegroundColor White
    Write-Host "  npm run quality:fix   - Fix linting and formatting" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Pre-commit hooks are now active!" -ForegroundColor Cyan
    Write-Host "   - ESLint will run on staged TypeScript/JavaScript files" -ForegroundColor White
    Write-Host "   - Prettier will format staged files" -ForegroundColor White
    Write-Host "   - Commits will be blocked if there are unfixable issues" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 See CODE_QUALITY_SETUP.md for detailed documentation" -ForegroundColor Cyan
} else {
    Write-Host "❌ Setup completed with some issues. Please check the output above." -ForegroundColor Red
    Write-Host "💡 You can run 'npm run quality:fix' to fix most issues automatically." -ForegroundColor Yellow
}
