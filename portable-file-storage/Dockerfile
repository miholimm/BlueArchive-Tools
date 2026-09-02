FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.mjs ./
COPY public ./public

ENV NODE_ENV=production
ENV FILE_STORAGE_HOST=0.0.0.0
ENV FILE_STORAGE_PORT=4317
ENV FILE_STORAGE_DIR=/var/lib/blue-archive-file-storage

RUN mkdir -p /var/lib/blue-archive-file-storage/files /var/lib/blue-archive-file-storage/tmp

VOLUME ["/var/lib/blue-archive-file-storage"]
EXPOSE 4317

CMD ["node", "server.mjs"]
