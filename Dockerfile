# Production image for the Express app
FROM node:16-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Install only production dependencies (layer-cached on package files)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Run as the built-in non-root 'node' user
USER node
EXPOSE 8080
CMD ["node", "app.js"]
