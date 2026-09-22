# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
# Alpine images don't ship OpenSSL as a system package. Prisma's engines
# need to detect it at build/run time; without it, Prisma silently guesses
# the wrong engine variant and crashes with "Could not parse schema engine
# response" further down the line. Installing it here fixes detection for
# every stage below.
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- production deps only ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate

# ---------- runtime ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl && addgroup -S mavix && adduser -S mavix -G mavix

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# The prod-deps/build stages already generated the correct Prisma engine
# for this exact image (see binaryTargets in schema.prisma), so nothing
# should need to write to node_modules at runtime. Still, ownership must
# match the non-root user below or Prisma's own sanity-checks on startup
# fail with "Can't write to .../@prisma/engines".
RUN chown -R mavix:mavix /app

USER mavix

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
