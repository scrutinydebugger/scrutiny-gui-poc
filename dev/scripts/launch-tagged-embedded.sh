#!/bin/bash

docker-compose exec embedded sh -c 'rm -rf /build/data/app; cp -r /app /build-data/'
docker-compose exec server ./scripts/with-venv.sh /build-data/app/projects/testapp/scripts/make-sfd.sh /build-data/app/build-dev/projects/testapp/testapp embedded.sdf
docker-compose up --force-recreate -d embedded