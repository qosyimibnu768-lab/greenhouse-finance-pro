# ---------- Tahap 1: Build frontend ----------
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Tahap 2: Server produksi ----------
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY server.ts tsconfig.json ./
COPY data ./data
EXPOSE 3000
CMD ["npm", "start"]
