WhatsApp Server
Before starting, make sure you've uploaded the entire project folder and sh files to your Ubuntu server.
Grant execute permissions to all script files:

cd /var/www/wa-server
chmod +x *.sh
sudo ./wa-init-db.sh
sudo ./wa-deploy-backend.sh
sudo ./wa-setup-frontend.sh
sudo ./wa-setup-nginx.sh
sudo ./wa-create-admin.sh
