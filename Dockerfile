FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json schema.sql ./
COPY src ./src
RUN npm run build && npm prune --omit=dev && mkdir -p data && chown -R node:node /app
USER node
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/server.js"]
