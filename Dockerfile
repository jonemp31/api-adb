FROM node:18-alpine

# Instala ADB
RUN apk add --no-cache android-tools

WORKDIR /app

# Copia dependências
COPY package*.json ./
RUN npm ci --only=production

# Copia código
COPY . .

# Porta da API
EXPOSE 8080

# Inicia ADB server e app
CMD adb start-server && npm start
