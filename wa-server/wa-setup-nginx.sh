#!/bin/bash
# WA GATEWAY - STEP 3: NGINX & SSL
read -p "Enter API Subdomain (ex: server.domain.com): " API_URL
read -p "Enter Portal Subdomain (ex: portal.domain.com): " PORTAL_URL

echo "--- Nginx Configuration ---"

# Config Backend
cat <<EOF > /etc/nginx/sites-available/wa-backend
server {
    listen 80;
    server_name $API_URL;
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;

        add_header 'Access-Control-Allow-Origin' \$http_origin always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' \$http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

# Config Frontend
cat <<EOF > /etc/nginx/sites-available/wa-frontend
server {
    listen 80;
    server_name $PORTAL_URL;
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/wa-backend /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/wa-frontend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

# SSL
apt install certbot python3-certbot-nginx -y
certbot --nginx -d $API_URL -d $PORTAL_URL --non-interactive --agree-tos --register-unsafely-without-email

echo "--------------------------------------------------------"
echo "✅ SUCCESS: SSL & Nginx Configuration Complete!"
echo "Your domains are now secured and accessible via HTTPS."
echo "--------------------------------------------------------"
