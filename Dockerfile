# Scratch AI Detector - Production Container Image
FROM node:22-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies for backend and frontend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy application files
COPY backend ./backend
COPY extension ./extension
COPY frontend ./frontend
COPY package.json ./

# Build modern Svelte frontend
RUN cd frontend && npm run build

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Volume for persistent SQLite database storage
VOLUME ["/app/data"]

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
