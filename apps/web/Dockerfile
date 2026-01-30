FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm install --legacy-peer-deps

COPY . .

# Generar Prisma Client
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
