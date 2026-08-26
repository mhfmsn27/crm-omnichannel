WhatsApp Server
Before starting, make sure you've uploaded the entire project folder and sh files to your Ubuntu server.
Grant execute permissions to all script files:

cd /var/www/omnichannel
chmod +x *.sh
sudo ./install-deps.sh
sudo ./setup-db.sh
sudo ./setup-env.sh
sudo ./deploy-app.sh
sudo ./setup-nginx.sh

pm2 restart all
