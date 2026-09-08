# Backend (sudo updates need host privileges — prefer systemd on host)
FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install

FROM node:22-bookworm-slim AS backend-build
WORKDIR /app
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS backend
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-build /app/package.json ./
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
