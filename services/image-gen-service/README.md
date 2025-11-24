# Image Generation Service

Standalone service for handling Replicate API image generation requests.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your Replicate API key

3. Run the service:
   ```bash
   npm run dev
   ```

Service will run on http://localhost:4000

## Deploy to Railway

1. Push to GitHub
2. Create new service in Railway
3. Connect to this repository
4. Add environment variable: `REPLICATE_API_KEY`
5. Deploy!

Railway will automatically detect the Node.js app and set the PORT.

## API Endpoints

- `GET /` - Health check
- `POST /api/replicate` - Generate image with Replicate

## Usage from Command Center

In your Command Center `.env`:
```
VITE_IMAGE_GEN_URL=https://your-service.railway.app
```