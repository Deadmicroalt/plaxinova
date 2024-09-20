#!/bin/bash

# Install PHP extensions required by Pterodactyl
sudo apt-get update
sudo apt-get install -y php-mysql php-zip php-sodium php-bcmath

# Install Composer globally if not already installed
if ! command -v composer &> /dev/null
then
    echo "Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
fi

# Install Composer dependencies
echo "Installing Composer dependencies..."
composer install --no-dev

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install --legacy-peer-deps

# Build the frontend assets
echo "Building frontend assets..."
npm run build

# Generate application key
echo "Generating application key..."
php artisan key:generate

# Run database migrations and seeders
echo "Running migrations and seeders..."
php artisan migrate --seed

echo "Setup complete!"
