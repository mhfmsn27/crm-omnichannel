#!/bin/bash
# 1. Update Sistem
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx curl git build-essential unzip redis-server ufw

# 2. Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 3. Node.js 20 & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 4. Redis & Postgres 16
sudo systemctl enable redis-server
sudo systemctl start redis-server

sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-16 postgresql-16-pgvector -y
sudo systemctl enable postgresql
sudo systemctl start postgresql

echo "✅ Dependencies & PostgreSQL 16 successfully installed!"
