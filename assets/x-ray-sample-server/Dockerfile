FROM node:16-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

FROM node:16-alpine
WORKDIR /app
COPY package*.json .
COPY index.html .
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
CMD ["npm", "start"]
