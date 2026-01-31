#!/bin/bash

# Setup script to create .env files

echo "Setting up environment files..."

# Backend .env
cat > backend/.env << 'EOF'
# Backend Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_autopilot
REDIS_URL=redis://localhost:6379/0

# LLM Configuration (gemini | openai | anthropic)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
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
echo "   - GEMINI_API_KEY (default) or OPENAI_API_KEY or ANTHROPIC_API_KEY"
echo ""
echo "You can now start the application!"

