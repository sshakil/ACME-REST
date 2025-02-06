#!/bin/sh
set -e  # Exit on error

echo "⏳ Waiting for database to be ready..."
until node src/database/setup/check-db-util.js; do
  echo "🔄 Retrying in 2 seconds..."
  sleep 2
done

echo "🚀 Installing dependencies..."
npm install

echo "🚀 Running database migrations..."
NODE_ENV=development npx sequelize-cli db:migrate --config src/config.js

echo "🔄 Starting ACME-REST..."
npx nodemon src/index.js