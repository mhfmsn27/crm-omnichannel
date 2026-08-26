FROM node:20-slim

# Install library pendukung untuk kompilasi bcrypt di Linux
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files dulu untuk caching layer
COPY package*.json ./
RUN npm install

# Copy seluruh kode
COPY . .

# Expose port backend
EXPOSE 8998

# Gunakan nodemon jika ada, atau node server.js
CMD ["npm", "run", "dev"]