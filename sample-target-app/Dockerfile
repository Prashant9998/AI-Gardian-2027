FROM node:20-alpine

WORKDIR /app

# Copy SDK dependency first and install its deps
COPY guardian-sdk-node /guardian-sdk-node
RUN cd /guardian-sdk-node && npm install

# Copy application files
COPY sample-target-app/package*.json ./
RUN npm install
RUN npm install /guardian-sdk-node

COPY sample-target-app/ .

EXPOSE 3001

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
