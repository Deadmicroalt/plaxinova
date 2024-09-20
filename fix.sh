#!/bin/bash

# Disable Xdebug
echo "Disabling Xdebug..."
sudo phpdismod xdebug

# Install required PHP extensions
echo "Installing missing PHP extensions..."
sudo apt-get install -y php-pdo php-zip php-sodium php-bcmath

# Check if the vendor directory exists
if [ ! -d "vendor" ]; then
    echo "Vendor directory not found. Running composer install..."
    composer install --no-dev
else
    echo "Vendor directory found."
fi

# Clear Laravel cache
echo "Clearing Laravel cache..."
php artisan cache:clear
php artisan config:clear
php artisan view:clear

# Re-enable Xdebug if needed
echo "Re-enabling Xdebug..."
sudo phpenmod xdebug

echo "Script execution completed."
