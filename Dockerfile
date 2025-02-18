FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    python3-dev \
    freetds-dev \
    build-base \
    autoconf \
    krb5-dev \
    openssl-dev

# Install PHP extensions
RUN docker-php-ext-configure pdo_dblib --with-libdir=/lib \
    && docker-php-ext-install pdo_dblib

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set up Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install minimal Python packages
RUN . /opt/venv/bin/activate && \
    pip3 install --no-cache-dir \
    musicbrainzngs \
    pymssql

# Set working directory
WORKDIR /var/www/html

# Install getID3
RUN git clone https://github.com/JamesHeinrich/getID3.git /usr/local/lib/getID3

# Copy composer files
COPY composer.json .
RUN composer install

# Create necessary directories
RUN mkdir -p /var/www/audio_files && \
    chown -R www-data:www-data /var/www/audio_files

# Add custom PHP configuration
RUN echo "extension=pdo_dblib.so" > /usr/local/etc/php/conf.d/pdo_dblib.ini
