#!/bin/bash

# Fix CocoaPods compatibility with Xcode 16.4
# This script downgrades objectVersion from 70 to 56 to work with current CocoaPods version
# Run this script if you encounter: "Unable to find compatibility version string for object version '70'"

echo "🔧 Fixing CocoaPods compatibility with Xcode 16.4..."

# Check if the project file exists
if [ ! -f "ios/JustPray.xcodeproj/project.pbxproj" ]; then
    echo "❌ Project file not found. Make sure you're in the project root directory."
    exit 1
fi

# Check current objectVersion
CURRENT_VERSION=$(grep "objectVersion" ios/JustPray.xcodeproj/project.pbxproj | head -1)
echo "📋 Current objectVersion: $CURRENT_VERSION"

# Apply the fix
sed -i '' 's/objectVersion = 70;/objectVersion = 56;/g' ios/JustPray.xcodeproj/project.pbxproj

# Verify the change
NEW_VERSION=$(grep "objectVersion" ios/JustPray.xcodeproj/project.pbxproj | head -1)
echo "✅ Updated objectVersion: $NEW_VERSION"

echo "🎉 CocoaPods compatibility fix applied!"
echo "💡 You can now run 'cd ios && pod install'"
echo "⚠️  Note: This is a temporary fix. Revert when CocoaPods supports objectVersion 70"
