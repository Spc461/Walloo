# Use Node.js LTS (Linux)
FROM node:20-slim

# Install system dependencies (ffmpeg and python for yt-dlp)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp directly
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy server code
COPY . .

# Expose port (Render sets PORT env var automatically)
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
