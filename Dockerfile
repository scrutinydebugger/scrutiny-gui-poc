FROM ubuntu:22.04

RUN set -eux;
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=America/Toronto
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get install -y curl

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -

RUN apt-get install -y \
    nodejs \
    && rm -rf /var/lib/apt/lists/* 


RUN npm install --location=global npm mocha

