#!/bin/bash
echo "Checking package.json location..."
pwd
ls -la package.json
echo ""
echo "Checking Next.js in package.json..."
node -e "const pkg = require('./package.json'); console.log('Next.js version:', pkg.dependencies?.next || 'NOT FOUND');"
echo ""
echo "Checking if Next.js is installed..."
npm list next 2>&1 | head -2
