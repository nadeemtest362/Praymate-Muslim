FROM node:18-alpine

# Install ffmpeg and font packages
RUN apk add --no-cache \
    ffmpeg \
    fontconfig \
    ttf-dejavu

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Railway provides PORT env var
EXPOSE ${PORT}

# Start the service
CMD ["npm", "start"]