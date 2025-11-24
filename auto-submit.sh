#!/bin/bash

# Auto-submit script for TestFlight with encryption metadata pre-filled

BUILD_ID="$1"

if [ -z "$BUILD_ID" ]; then
    echo "Usage: ./auto-submit.sh <build-id>"
    echo "Getting latest build ID..."
    BUILD_ID=$(eas build:list --platform=ios --limit=1 --non-interactive --json | jq -r '.[0].id')
fi

echo "Submitting build $BUILD_ID to TestFlight..."

# Submit with encryption metadata pre-configured
eas submit --platform=ios --latest --non-interactive \
    --company-name="Personal Faith Apps" \
    --copyright="2024 Personal Faith Apps" \
    --uses-non-exempt-encryption=false \
    --uses-idfa=false

echo "Build submitted successfully with encryption metadata!"
