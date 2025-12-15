#!/bin/bash

# Setup script to create .env files

echo "Setting up environment files..."

# Backend .env
cat > backend/.env << 'EOF'
# Backend Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_autopilot
REDIS_URL=redis://localhost:6379/0

# LLM Configuration
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_MODEL=claude-3-opus-20240229

# Application Settings
ENVIRONMENT=development
LOG_LEVEL=INFO
API_PREFIX=/api

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
EOF

# Frontend .env.local
cat > frontend/.env.local << 'EOF'
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

echo "✅ Created backend/.env"
echo "✅ Created frontend/.env.local"
echo ""
echo "⚠️  IMPORTANT: Update backend/.env with your actual API keys:"
echo "   - OPENAI_API_KEY or ANTHROPIC_API_KEY"
echo ""
echo "You can now start the application!"

