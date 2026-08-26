#!/bin/bash
# MASTER DEPENDENCIES INSTALLER (Ubuntu - PostgreSQL 17)

echo "--------------------------------------------------------"
echo "--- Starting Environment Installation (Fresh Ubuntu + Postgres 17) ---"
echo "--------------------------------------------------------"

# 1. Update & Paket Dasar
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx curl git build-essential unzip redis-server ufw wget lsb-release

# 2. Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 3. Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 4. PostgreSQL 17 & PGVector
# Menambah repo resmi PostgreSQL
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install Postgres 17 dan extension vector
sudo apt install postgresql-17 postgresql-17-pgvector -y

# 5. Konfigurasi Folder /var/www
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

# 6. Aktifkan Layanan
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl enable postgresql
sudo systemctl start postgresql

echo "--------------------------------------------------------"
echo "✅ Environment Ready! Node.js, Redis, Nginx, & Postgres 17 are Active."
echo "--------------------------------------------------------"
