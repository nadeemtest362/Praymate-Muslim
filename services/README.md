# Services Directory

This directory contains all backend services and applications for Personal Prayers.

## Structure

### Applications
- **command-center-app/** - Admin dashboard web application (React + Vite)
  - Manages onboarding flows via Flow Studio
  - Analytics and user management
  - Content moderation tools

### API Services
- **prayer-api-service/** - NestJS API for prayer generation
  - Integrates with OpenAI for personalized prayers
  - Handles prayer scheduling and delivery
  
- **image-gen-service/** - Image generation service
  - Creates prayer cards and visual content
  - Integrates with image generation APIs

- **command-center-api/** - Backend API for admin dashboard
  - User management
  - Analytics data processing

## Note on Architecture

The `command-center-app` is a full React web application, not just an API service. It's kept in the services directory because:
1. It's deployed separately from the mobile app
2. It has its own build process and dependencies
3. It connects to the same Supabase instance as the mobile app

Consider this more of a "deployed services" directory rather than just "API services". 