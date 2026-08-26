# CRMHub Omnichannel - Automated Test Suite

## Overview

Automated test suite for CRMHub Omnichannel application using Playwright.

## Prerequisites

- Node.js 16+
- npm
- Chromium browser (installed by Playwright)

## Installation

```bash
# Run setup script
chmod +x tests/setup-tests.sh
./tests/setup-tests.sh

# Or install manually
cd tests
npm install playwright
npx playwright install chromium
```

## Configuration

1. Copy environment template:
```bash
cp backend/.env backend/.env.test
```

2. Update `.env.test` with your test credentials:
```env
TEST_URL=http://vps.lamankita.web.id
TEST_EMAIL=your_email@example.com
TEST_PASSWORD=your_password
HEADLESS=false
SLOW_MO=100
```

## Running Tests

### Full Test Suite

```bash
cd backend
node ../tests/crm-test.js
```

### WhatsApp Specific Tests

```bash
cd backend
node ../tests/wa-test.js
```

### Run with Environment File

```bash
cd backend
source ../tests/.env.test node ../tests/crm-test.js
```

## Test Categories

### 1. crm-test.js - Full CRM Test

| Category | Tests |
|----------|-------|
| **Authentication** | Login, Logout |
| **Dashboard** | Page load, Stats cards, Sidebar |
| **Inbox** | Conversation list, Channel filter |
| **Contacts** | List, Search |
| **Broadcast** | Form visibility |
| **Chatbot** | Bot list, Create form |
| **Reports** | General, Agent Performance, SLA/CSAT, Advanced Analytics, Attribution |
| **Settings** | Profile, Team, Quick Replies, Auto Reply, Auto Label, License, E-Commerce, Multi Language |
| **Pipeline** | List, Board |
| **API** | All main endpoints |
| **Responsive** | Desktop, Tablet, Mobile |
| **Performance** | Load time, Console errors |

### 2. wa-test.js - WhatsApp Tests

| Category | Tests |
|----------|-------|
| **Devices** | Device list, Add button |
| **Inbox** | WA conversations, Open detail |
| **Auto-Reply** | Create rule, Keyword matching |
| **Auto-Label** | WhatsApp source filter |
| **Broadcast** | Select WA channel, Add recipients |
| **Pipeline** | Drag-drop to stage |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_URL` | Application URL | http://localhost:3001 |
| `TEST_EMAIL` | Admin email | - |
| `TEST_PASSWORD` | Admin password | - |
| `HEADLESS` | Run in headless mode | false |
| `SLOW_MO` | Slow down operations (ms) | 0 |

## Examples

### Run with custom URL
```bash
TEST_URL=https://staging.example.com node tests/crm-test.js
```

### Run specific tests only
```bash
# Add to test file
test('My specific test', async () => { ... });
```

### Run with CI/CD
```bash
HEADLESS=true node tests/crm-test.js
```

## Troubleshooting

### "Browser not installed"
```bash
npx playwright install chromium
```

### "Login failed"
- Check credentials in .env
- Ensure app is running
- Check network connectivity

### "Test timeout"
- Increase timeout in CONFIG
- Check server performance
- Run with SLOW_MO=200

## Output

Tests will output:
- ✅ PASSED - Test passed
- ❌ FAILED - Test failed with error
- ⏭️  Skipped - Test skipped (element not found)

Final summary shows:
- Total passed/failed
- List of failed tests with errors

## Continuous Integration

Example GitHub Actions:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install
      - run: node tests/crm-test.js
        env:
          TEST_URL: ${{ secrets.TEST_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          HEADLESS: true
```

## Notes

- Tests use real browser automation (Chromium)
- Some tests may require active WhatsApp device
- API tests check response status (may return 401/403 if auth required)
- Performance tests are subjective to server load