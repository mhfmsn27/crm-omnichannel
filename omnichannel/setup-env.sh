#!/bin/bash
# CONFIGURATION GENERATOR FOR MAIN APP (BACKEND & FRONTEND)

BACKEND_ENV="/var/www/omnichannel/backend/.env"
FRONTEND_ENV="/var/www/omnichannel/frontend/.env"

echo "--------------------------------------------------------"
echo "Main App Environment Configuration (Fullstack)"
echo "--------------------------------------------------------"

# 1. Generate Automatic JWT Secret
AUTO_JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)

# 2. Request User Input
read -p "Enter your App Domain (ex: https://app.senderchat.com): " INPUT_APP_URL
read -p "Enter your WA Gateway URL (ex: https://server.senderchat.com): " INPUT_WA_URL
read -p "Enter your WA Gateway API KEY: " INPUT_WA_KEY

# ------------------------------------------
# 3. Writing to BACKEND .env
# ------------------------------------------
cat <<EOF > $BACKEND_ENV
# ==========================================
# BACKEND CONFIGURATION
# Location: backend/.env
# ==========================================

PORT=8998
NODE_ENV=production
APP_URL=$INPUT_APP_URL

# Database (PostgreSQL) - LOCKED
DATABASE_URL=postgresql://omni_user:DefaultPassword123!@localhost:5432/omni_db

# Redis
REDIS_URL=redis://localhost:6379

# Security - AUTOMATIC
JWT_SECRET=$AUTO_JWT_SECRET

# WhatsApp Gateway Configuration
WA_GATEWAY_URL=$INPUT_WA_URL
WA_GATEWAY_API_KEY=$INPUT_WA_KEY

# Firebase Service Account
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"senderchat-app","private_key_id":"cc3edf9072fd565ff22edc1042b9b0569b7135f9","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJLPSRHEQ5q6eF\naHIZBh004Vud/w/PKTqWf9uxjcQPouMiYFHgiFvWsSpziEbfBLkBbLIqOUQ2CoRG\n9GX/LVNdgsaFcsJcaExVfJ9A+A/4wjeSiTGZV5oIenz2CqwSIfpweH3mf1FUZAkH\nUCi3mDcgP5q9tBT7pItsT/nbwMZrYBoSAE1KplRu7DDVP6L7orkO6GlRwO43fdhs\nWeHiUSW49RifLz2VwY1p3kvPltG/XjbN8Hfes89MG94NHxghsX25RROakKn4Vdaj\nCC9PMUMsopMgEG9E9PocDX8lTYy7AkCS9XcybqkW6LZlqzHliz8ngPPhqKbW2kB6\n9TJ7pjK5AgMBAAECggEAEElrMF9PN7MJsC+FQzjfPvN6uRcX9s/R7jLCPMTrKU/o\n3xTYtBqeAsrbkrhm8nG9r5uW7fuuZciirmLlagwHmoO2okGo8hXAjlA1TWt30Y4Z\ntSuVwCIbNpICEWJKTXqCPb5HhRRsJ26k23p2HWz9k4cKtk6Av2GyJu3vnsaj2bfs\nhXEdWrlQ3HK4w0Ee0M6LINifq2BzbEWAyDoAUV3l0jGNhxgqherub0aRFRUm7GRK\nfUW4KcGua9cT4yXbbPdQ4WFVCeFgfVwMYuKT6ElfXKb/IeZ7aQyh2gqoh4ccWDTb\ne827wVGatxB7XfRiinPUzFbIdDMPfl+5addLOyR5jQKBgQDsjempJkVPmdxauyto\n3cPMhh2xGXxWagX5YVkS4i8S1bUHupiraywovpb2mpdm6RIq3aFsvW8dzI+Cmgme\n9NmscYbRxYtKazt9EDx75Q7i68ePOSkjXqRcFWVVAu6d8VK4W/3v7pol4cQ6fmxC\/MgoWSLVELcrpt3EXOeGkY2ArQKBgQDZtoba9hyMdgfH0jeK1GGowtkY40ItmDp7\nsrqgo5qtL3E+52CWC9/7ai2JyrRpwu00sceDfVYBoKvwCQHtwSyyI0SyRHUW2hI4\nVSu0DGJMqa86I7FBCsDZufa5NZRWz4Odp2PSVrbr/1jKMPV/Znt/sUHYFUzVF3Dc\ZW24iOZfvQKBgBNeU0FsRsSLvoUXSiid78gxOwEjKxEQQUj39YkcR+ps4ROu7Y0r\ni0QSxt2OLtNYRgqIdw0mPZDdDOsOnbcMKT57VSSb3hnLyeUljS4/xQZDc+WAMqQY\nvbBkeBWL1enMto8tyQ76JFjxsVVwwICDngfftIBpi/XhBctsJ/DWvhVJAoGBAMSa\nDeHBijpVg+UwsrON4rrxafcNkn92DqoR1nKmC1IFm7CAZTpacuOpGIJsKMuxGWAS\ngub80iQaIepbWACKB4C+VJTfORVvzDBOyW6IGGS+ftxzyue/fDOhuWm7Nr/GGUbP\nGFejswAe0OGVoLxxoWjIe3tUkNOFnYeJmLGh/tfJAoGAfIIzYR1AqotOu/J6Ooad\nT1BQO+fxCsvxtAj20ByKbimeFtljjDS0Kq+Juo5UaRuyoWrC17cit2E2+TSX7w9V\nkAqIs84djj/OJ/t6C4/0sbO83H2f1qTliBTVG3C/LU2/qf+RuTfRS9guSh9X0o+E\nck9/rRSRoRN+vh6Py1Ot1g0=\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@senderchat-app.iam.gserviceaccount.com","client_id":"109762382015861562883","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40senderchat-app.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'

# DOKU Payment Gateway
DOKU_CLIENT_ID=BRN-0296-1756746116900
DOKU_SECRET_KEY=SK-ZG1pJ5kcOjTUIxrlly41

# Facebook & Meta
FACEBOOK_APP_ID=2448679252246037
FACEBOOK_APP_SECRET=f6cee23084bd34baad63d30d1dc3a822
MESSENGER_APP_ID=4745297409029245
MESSENGER_SECRET=b25de667e328611e21d30ef62125c996
MESSENGER_API_VERSION=v24.0
INSTAGRAM_APP_ID=4745297409029245
INSTAGRAM_SECRET=b25de667e328611e21d30ef62125c996
INSTAGRAM_API_VERSION=v24.0
WA_APP_ID=4745297409029245
WA_SECRET=b25de667e328611e21d30ef62125c996
WA_API_VERSION=v24.0

# Google OAuth
GOOGLE_CLIENT_ID=156336947530-4usbmbo63rcc0ltuhn5e39p2rtr6a9f3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
EOF

# ------------------------------------------
# 4. Writing to FRONTEND .env
# ------------------------------------------
cat <<EOF > $FRONTEND_ENV
# ==========================================
# FRONTEND CONFIGURATION
# Location: frontend/.env
# ==========================================

# API Connection (Automatically synchronized with Backend)
VITE_API_BASE_URL=$INPUT_APP_URL

# Google Auth
VITE_GOOGLE_CLIENT_ID=156336947530-4usbmbo63rcc0ltuhn5e39p2rtr6a9f3.apps.googleusercontent.com

# Meta / Facebook App ID
VITE_WA_APP_ID=4745297409029245
VITE_WA_CONFIG_ID_BYOK=1569724147541844
VITE_WA_CONFIG_ID_COEX=1048302460794997
VITE_FACEBOOK_APP_ID=2448679252246037
VITE_MESSENGER_APP_ID=4745297409029245
EOF

echo "--------------------------------------------------------"
echo "✅ Success!"
echo "Backend .env: $BACKEND_ENV"
echo "Frontend .env: $FRONTEND_ENV"
echo "Domain Synchronization: $INPUT_APP_URL"
echo "--------------------------------------------------------"
