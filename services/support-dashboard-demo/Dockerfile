FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install pdo_sqlite

WORKDIR /app
COPY . .

EXPOSE 8092

# Loopback-only bind (127.0.0.1, not 0.0.0.0) - this container runs under
# host networking (no bridge isolation), so binding to all interfaces
# would expose it directly to the internet, bypassing nginx and CSF.
CMD ["php", "-S", "127.0.0.1:8092", "-t", "public"]
