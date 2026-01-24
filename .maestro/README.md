# Maestro E2E Tests

This directory contains end-to-end tests using [Maestro](https://maestro.mobile.dev/), a modern mobile UI testing framework.

## Prerequisites

### Install Maestro

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or via Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
```

### Setup Device/Emulator

Maestro requires a running iOS Simulator or Android Emulator:

```bash
# iOS (macOS only)
open -a Simulator

# Android
emulator -avd Pixel_6_API_33
```

### Build the App

```bash
# Development build for testing
npx expo run:ios
# or
npx expo run:android
```

## Running Tests

### Run All Tests

```bash
maestro test .maestro/flows/
```

### Run a Single Test

```bash
maestro test .maestro/flows/full-season-flow.yaml
```

### Run Smoke Tests Only

```bash
maestro test --tags smoke .maestro/
```

### Interactive Mode (Debug)

```bash
maestro studio
```

## Test Files

| File | Description |
|------|-------------|
| `full-season-flow.yaml` | Complete season flow: team selection → week play → advance |
| `draft-flow.yaml` | Draft room: wait for pick → view prospects → make selection |
| `roster-management-flow.yaml` | Depth chart, player details, roster moves |
| `offseason-flow.yaml` | All 12 offseason phases |

## CI Integration

### GitHub Actions

```yaml
- name: Run Maestro Tests
  uses: mobile-dev-inc/action-maestro-cloud@v1
  with:
    api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
    app-file: app-debug.apk
    flows: .maestro/flows/
```

### Local CI

```bash
# Build app
npx expo prebuild
cd android && ./gradlew assembleDebug && cd ..

# Run tests
maestro test .maestro/flows/
```

## Writing Tests

Maestro uses YAML for test definitions. Common commands:

```yaml
# Tap on element
- tapOn: "Button Text"

# Assert visible
- assertVisible: "Expected Text"

# Wait for element
- extendedWaitUntil:
    visible: "Loading Complete"
    timeout: 30000

# Scroll to find element
- scrollUntilVisible:
    element: "Target Element"
    direction: DOWN

# Input text
- inputText: "test@example.com"
```

## Troubleshooting

### Test Flakiness

- Increase `defaultTimeout` in config.yaml
- Use `extendedWaitUntil` for async operations
- Add `retryCount` for unreliable steps

### Element Not Found

- Use Maestro Studio to inspect the view hierarchy
- Try regex patterns: `text: ".*pattern.*"`
- Check if element is scrolled off-screen

### Build Issues

- Ensure app is built with `npx expo run:ios` (not Expo Go)
- Check that `appId` matches your app's bundle identifier
