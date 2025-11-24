#!/bin/bash

# Script to update all expo-haptics imports to use our safe wrapper

echo "Updating expo-haptics imports to use safe wrapper..."

# Find all TypeScript/JavaScript files that import expo-haptics
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.expo/*" \
  -not -path "./ios/*" \
  -not -path "./android/*" \
  -not -path "./scripts/*" \
  -not -path "./src/utils/haptics.ts" \
  -exec grep -l "from 'expo-haptics'" {} \; | while read file; do
  
  echo "Updating: $file"
  
  # Calculate the relative path from the file to src/utils/haptics
  dir=$(dirname "$file")
  
  # Count how many directories deep we are from the project root
  depth=$(echo "$dir" | tr '/' '\n' | grep -v '^\.$' | wc -l)
  
  # Build the relative path
  if [[ "$dir" == "." ]]; then
    relative_path="./src/utils/haptics"
  else
    # Calculate how many "../" we need
    dots=""
    for ((i=0; i<$depth; i++)); do
      dots="../$dots"
    done
    
    # Remove trailing slash if any
    dots=${dots%/}
    
    # Build the path
    if [[ "$dots" == "" ]]; then
      relative_path="./src/utils/haptics"
    else
      relative_path="${dots}/src/utils/haptics"
    fi
  fi
  
  # Replace the import
  sed -i.bak "s|from 'expo-haptics'|from '$relative_path'|g" "$file"
  
  # Remove backup file
  rm "${file}.bak"
done

echo "Done! All expo-haptics imports have been updated."
echo "Note: You may need to manually adjust some imports if they use different import styles." 