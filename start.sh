#!/bin/sh
set -e  # Exit on error

echo "⏳ Waiting for database to be ready..."
until node test-db.js; do
  echo "🔄 Retrying in 2 seconds..."
  sleep 2
done

echo "🚀 Installing dependencies..."
npm install

echo "🚀 Running database migrations..."
NODE_ENV=dockerDev npx sequelize-cli db:migrate --config config/config.js

echo "🔄 Starting ACME-REST..."
NODE_ENV=dockerDev npx nodemon src/index.js