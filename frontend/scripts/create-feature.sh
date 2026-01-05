#!/bin/bash
# Script to create a new feature with the standard structure

set -e

# Check if feature name is provided
if [ -z "$1" ]; then
  echo "Usage: ./create-feature.sh <feature-name>"
  echo "Example: ./create-feature.sh bids"
  exit 1
fi

FEATURE_NAME=$1
FEATURE_DIR="features/$FEATURE_NAME"

# Check if feature already exists
if [ -d "$FEATURE_DIR" ]; then
  echo "❌ Error: Feature '$FEATURE_NAME' already exists!"
  exit 1
fi

echo "🚀 Creating feature: $FEATURE_NAME"
echo ""

# Create directory structure
echo "📁 Creating directories..."
mkdir -p "$FEATURE_DIR/components"
mkdir -p "$FEATURE_DIR/hooks"
mkdir -p "$FEATURE_DIR/lib"

# Convert feature-name to PascalCase for component names
COMPONENT_NAME=$(echo $FEATURE_NAME | sed -r 's/(^|-)([a-z])/\U\2/g')

# Create main view file
echo "📝 Creating ${FEATURE_NAME}-view.tsx..."
cat > "$FEATURE_DIR/${FEATURE_NAME}-view.tsx" << EOF
export function ${COMPONENT_NAME}View() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">${COMPONENT_NAME}</h1>
      <p className="text-muted-foreground mt-2">
        ${COMPONENT_NAME} feature coming soon.
      </p>
    </div>
  );
}
EOF

# Create barrel export
echo "📦 Creating index.ts..."
cat > "$FEATURE_DIR/index.ts" << EOF
export { ${COMPONENT_NAME}View } from "./${FEATURE_NAME}-view";
EOF

# Create types file
echo "📋 Creating types.ts..."
cat > "$FEATURE_DIR/types.ts" << EOF
// Add ${FEATURE_NAME}-specific types here

export interface ${COMPONENT_NAME} {
  id: string;
  // Add other fields
}
EOF

# Create app page directory
echo "📄 Creating app page..."
mkdir -p "app/$FEATURE_NAME"
cat > "app/$FEATURE_NAME/page.tsx" << EOF
import { ${COMPONENT_NAME}View } from "@/features/${FEATURE_NAME}";

export default async function ${COMPONENT_NAME}Page() {
  // Add data fetching here if needed
  // const data = await get${COMPONENT_NAME}Data();
  // return <${COMPONENT_NAME}View data={data} />;
  
  return <${COMPONENT_NAME}View />;
}
EOF

echo ""
echo "✅ Feature '$FEATURE_NAME' created successfully!"
echo ""
echo "📂 Created structure:"
echo "   features/$FEATURE_NAME/"
echo "   ├── components/     (empty, ready for components)"
echo "   ├── hooks/          (empty, ready for hooks)"
echo "   ├── lib/            (empty, ready for utilities)"
echo "   ├── ${FEATURE_NAME}-view.tsx"
echo "   ├── types.ts"
echo "   └── index.ts"
echo ""
echo "   app/$FEATURE_NAME/"
echo "   └── page.tsx"
echo ""
echo "🎯 Next steps:"
echo "   1. Edit features/$FEATURE_NAME/${FEATURE_NAME}-view.tsx"
echo "   2. Add components to features/$FEATURE_NAME/components/"
echo "   3. Add types to features/$FEATURE_NAME/types.ts"
echo "   4. Update app/$FEATURE_NAME/page.tsx with data fetching"
echo ""
echo "📚 Documentation:"
echo "   - See features/README.md for guidelines"
echo "   - See ARCHITECTURE.md for detailed patterns"
echo ""

