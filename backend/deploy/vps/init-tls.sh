#!/bin/sh
set -eu
# Idempotent; do not silently rotate a trusted certificate on every release.
if [ -s /tls/server.key ] && [ -s /tls/server.crt ] && [ -s /ca/ca.crt ]; then
  openssl x509 -checkend 2592000 -noout -in /tls/server.crt
  exit 0
fi
if [ -e /tls/server.key ] || [ -e /tls/server.crt ] || [ -e /ca/ca.crt ]; then
  echo 'Incomplete database TLS state; investigate before continuing.' >&2
  exit 1
fi
umask 077
openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 \
  -subj '/CN=postgres' -addext 'subjectAltName=DNS:postgres' \
  -keyout /tls/server.key -out /tls/server.crt
cp /tls/server.crt /ca/ca.crt
# postgres:16-bookworm uses UID/GID 999. Verify when updating its image.
chown 999:999 /tls/server.key /tls/server.crt
chmod 600 /tls/server.key
chmod 644 /tls/server.crt /ca/ca.crt
