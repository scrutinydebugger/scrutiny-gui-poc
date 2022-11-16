FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash \
    && apt-get install -y \
    build-essential \
    nodejs \
    && rm -rf /var/lib/apt/lists/*