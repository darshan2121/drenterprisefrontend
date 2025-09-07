#!/bin/bash

# Production Build Script for D.R. Enterprise Frontend
echo "🚀 Starting Production Build Process..."

# Set production environment
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://api.drenterprise.it
export NEXT_PUBLIC_APP_URL=https://drenterprise.it

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm ci --only=production

# Run type checking
echo "🔍 Running type checking..."
npm run typecheck

# Run linting
echo "🔍 Running linting..."
npm run lint

# Build the application
echo "🏗️ Building application..."
npm run build:production

# Create static export (if needed for static hosting)
echo "📦 Creating static export..."
npm run build:static

# Create production package
echo "📦 Creating production package..."
mkdir -p dist
cp -r .next dist/
cp -r out dist/static
cp package.json dist/
cp next.config.ts dist/
cp -r public dist/

# Create deployment archive
echo "📦 Creating deployment archive..."
cd dist
zip -r ../drenterprise-frontend-production-$(date +%Y%m%d-%H%M%S).zip .
cd ..

echo "✅ Production build completed successfully!"
echo "📁 Build artifacts created in: dist/"
echo "📦 Deployment archive: drenterprise-frontend-production-*.zip"
echo ""
echo "🚀 To start the production server:"
echo "   cd dist && npm run start:production"
echo ""
echo "🌐 To serve static files:"
echo "   cd dist/static && npx serve -s . -l 3000"
