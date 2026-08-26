#!/bin/bash

# ==========================================
# CRMHub Omnichannel - Test Runner Script
# ==========================================

echo "🚀 CRMHub Test Suite Setup"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Navigate to backend directory
cd /var/www/omnichannel/backend || cd "$(dirname "$0")/.."

# Install Playwright if not already
if ! npm list playwright &> /dev/null; then
    echo "📦 Installing Playwright..."
    npm install playwright --save-dev
fi

# Install Chromium browser
echo "🔽 Installing Chromium browser..."
npx playwright install chromium --with-deps

# Create .env.test file if not exists
if [ ! -f .env.test ]; then
    echo "📝 Creating test environment file..."
    cat > .env.test << 'EOF'
# Test Configuration
TEST_URL=http://localhost:3001
TEST_EMAIL=admin@lamankita.web.id
TEST_PASSWORD=your_password_here
HEADLESS=false
SLOW_MO=100
EOF
    echo "⚠️ Please update .env.test with your test credentials"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run tests:"
echo "  1. Update credentials in .env.test"
echo "  2. Run: node ../tests/crm-test.js"
echo ""