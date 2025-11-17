# Usamos la versión LTS de Node
FROM node:22-alpine

# Establecemos directorio de trabajo
WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del proyecto
COPY . .

# Exponemos el puerto de la app
EXPOSE 3002

# Comando para iniciar la app
CMD ["npm", "run", "dev"]
