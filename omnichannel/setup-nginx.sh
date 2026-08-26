#!/bin/bash
# NGINX & SSL AUTO-CONFIG

# Input domain (multiple domains can be entered separated by spaces)
echo "--------------------------------------------------------"
echo "Nginx & SSL Certbot Configuration"
echo "--------------------------------------------------------"
read -p "Enter your Domain(s) (if multiple, separate with spaces, ex: main.com api.com): " DOMAINS

# Convert input into Nginx recognized format (space separated)
# Prepare parameters for Certbot (-d domain1.com -d domain2.com)
CERTBOT_DOMAINS=""
for d in $DOMAINS; do
    CERTBOT_DOMAINS="$CERTBOT_DOMAINS -d $d"
done

# Create Nginx config file
sudo tee /etc/nginx/sites-available/omnichannel <<EOF
server {
    listen 80;
    server_name $DOMAINS;

    client_max_body_size 20M;

    # Block access to hidden files (.env, .git, etc.)
    location ~ /\. {
        deny all;
    }

    location / {
        proxy_pass http://localhost:8998;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket Support (Crucial for QR Codes & Real-time Chat)
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass \$http_upgrade;

        # Extended timeout for AI processing
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
}
EOF

# Enable Nginx configuration
echo "Linking Nginx configuration..."
sudo ln -sf /etc/nginx/sites-available/omnichannel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Check configuration and Restart
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "✅ Nginx restarted successfully."
else
    echo "❌ Nginx configuration check failed, please review your settings."
    exit 1
fi

# SSL Certbot Installation
echo "Starting SSL installation for: $DOMAINS"
sudo apt install certbot python3-certbot-nginx -y

# Run certbot with all input domains
sudo certbot --nginx $CERTBOT_DOMAINS --non-interactive --agree-tos --redirect --register-unsafely-without-email

echo "--------------------------------------------------------"
echo "✅ ALL DOMAINS SUCCESSFULLY CONFIGURED!"
echo "Your URLs are now available over HTTPS."
echo "--------------------------------------------------------"
