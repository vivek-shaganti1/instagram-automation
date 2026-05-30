# Stage 1: Build the backend TypeScript app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configs
COPY package*.json ./
COPY prisma ./prisma/

# Install build dependencies
RUN npm ci

# Copy backend source
COPY . .

# Generate Prisma Client & compile TS
RUN npx prisma generate
RUN npm run build

# Stage 2: Final runtime container
FROM node:20-alpine AS runner

WORKDIR /app

# Install system dependencies (Python, FFmpeg, and build-essentials for Pillow/Instagrapi if needed)
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    python3-dev \
    build-base \
    libjpeg-turbo-dev \
    zlib-dev

# Setup virtual environment for Python scripts in the root parent directory /app
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Install python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy node configs & build outputs
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma client & migration schema
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built code from builder stage
COPY --from=builder /app/dist ./dist

# Expose API port
EXPOSE 8000

CMD ["npm", "start"]
