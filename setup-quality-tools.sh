#!/bin/bash

# 🛠️ Code Quality Tools Setup Script
# This script sets up ESLint, Prettier, and Husky for the Stella Node.js API

echo "🚀 Setting up Code Quality Tools for Stella API..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize Husky
echo "🐕 Setting up Husky..."
npm run prepare

# Make Husky hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg

# Test the setup
echo "🧪 Testing the setup..."

# Run quality checks
echo "🔍 Running quality checks..."
npm run quality

# If quality checks fail, try to fix them
if [ $? -ne 0 ]; then
    echo "🔧 Fixing quality issues..."
    npm run quality:fix
fi

# Final test
echo "✅ Final verification..."
npm run quality

if [ $? -eq 0 ]; then
    echo "🎉 Code Quality Tools setup completed successfully!"
    echo ""
    echo "📋 Available commands:"
    echo "  npm run lint          - Lint and fix all files"
    echo "  npm run format        - Format all files"
    echo "  npm run quality       - Check linting and formatting"
    echo "  npm run quality:fix   - Fix linting and formatting"
    echo ""
    echo "🔧 Pre-commit hooks are now active!"
    echo "   - ESLint will run on staged TypeScript/JavaScript files"
    echo "   - Prettier will format staged files"
    echo "   - Commits will be blocked if there are unfixable issues"
    echo ""
    echo "📚 See CODE_QUALITY_SETUP.md for detailed documentation"
else
    echo "❌ Setup completed with some issues. Please check the output above."
    echo "💡 You can run 'npm run quality:fix' to fix most issues automatically."
fi
