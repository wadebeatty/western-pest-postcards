#!/bin/bash

echo "🚀 Western Pest Control - Automated Postcard System Setup"
echo "========================================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your API keys:"
    echo "   - GOOGLE_API_KEY (from Google Cloud Console)"
    echo "   - PRINTGENIE_API_KEY (from PRINTgenie)"
    echo "   - WEBHOOK_SECRET (create a random secret)"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs cache/postcards cache/streetview uploads assets

# Create default assets
echo "🎨 Creating default assets..."
if [ ! -f assets/default-house.jpg ]; then
    echo "⚠️  Please add a default house image to assets/default-house.jpg"
    echo "   This will be used when Street View is not available."
fi

# Test the setup
echo "🧪 Testing setup..."
if node -e "console.log('✅ Node.js can load modules')" &> /dev/null; then
    echo "✅ Basic setup complete!"
else
    echo "❌ Setup test failed"
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start the server: npm start"
echo "3. Test with: npm run test:customer"
echo "4. Deploy to production (see DEPLOYMENT.md)"
echo ""
echo "Webhook URL for Paste Routes:"
echo "  http://localhost:3000/webhook/customer-created"
echo ""
echo "For deployment instructions, see DEPLOYMENT.md"
echo "For API documentation, see README.md"