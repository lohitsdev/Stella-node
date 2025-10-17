# Render Deployment Guide for Stella Node.js API

## Quick Fix for Current Deployment Issue

The error `Cannot find module '/opt/render/project/src/dist/index.js'` occurs because Render is looking for the compiled JavaScript files in the wrong location.

### Solution

1. **Use the provided `render.yaml` file** - This file has been created to explicitly configure Render's build and start process.

2. **Set Environment Variables in Render Dashboard:**
   
   **REQUIRED** - Set these in your Render service's Environment tab:
   ```
   MONGODB_URI=your_mongodb_connection_string
   PINECONE_API_KEY=your_pinecone_api_key
   JWT_SECRET=your_secure_jwt_secret
   VAPI_API_KEY=your_vapi_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

   **Optional** - These have defaults but can be customized:
   ```
   MONGODB_DATABASE=stella
   PINECONE_ENVIRONMENT=aped-4627-b74a
   PINECONE_INDEX_NAME=rohit-buddy-voice-bot
   ```

## Deployment Steps

1. **Commit and push** the `render.yaml` file to your repository
2. **Create a new Web Service** in Render
3. **Connect your GitHub repository**
4. **Set Environment Variables** in the Render dashboard (Environment tab)
5. **Deploy**

## Build Process

Render will automatically:
1. Run `npm ci` to install dependencies
2. Run `npm run build` to compile TypeScript to JavaScript in `/dist`
3. Start the server with `npm start` which runs `node dist/index.js`

## Port Configuration

The app automatically uses Render's provided PORT environment variable. No additional configuration needed.

## Health Check

Once deployed, test these endpoints:
- `/health` - Basic health check
- `/api/info` - API information
- `/api-docs` - Swagger documentation

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles without errors locally

### Runtime Errors
- Verify all required environment variables are set
- Check logs for missing API keys or database connection issues

### Module Not Found Errors
- Ensure `render.yaml` is in the repository root
- Verify the build process creates files in `/dist` directory

## Alternative Manual Configuration

If you prefer not to use `render.yaml`, set these in Render dashboard:

**Build Command:** `npm ci && npm run build`
**Start Command:** `npm start`

## Database Setup

Make sure your MongoDB instance is accessible from Render's servers:
- Use MongoDB Atlas for cloud hosting
- Whitelist Render's IP ranges if using IP restrictions
- Use the correct connection string format
