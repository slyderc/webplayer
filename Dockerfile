FROM php:8.2-fpm-alpine

# Install system dependencies and PHP extensions
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    python3-dev \
    curl \
    sqlite-dev \
    build-base \
    && docker-php-ext-install pdo_sqlite sqlite3

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set up Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install minimal Python packages
RUN . /opt/venv/bin/activate && \
    pip3 install --no-cache-dir musicbrainzngs

# Set working directory
WORKDIR /var/www/html

# Create necessary directories
RUN mkdir -p /var/www/audio_files && \
    chown -R www-data:www-data /var/www/audio_files
