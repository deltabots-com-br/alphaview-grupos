# Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=/api
RUN npm run build

# Setup Backend
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --production
COPY server/ .

# Copy built assets from frontend-builder
# Creating a specific directory structure for clarity
COPY --from=frontend-builder /app/dist ./public/dist

# Expose port
EXPOSE 3001

# Command to run
CMD ["node", "src/index.js"]
