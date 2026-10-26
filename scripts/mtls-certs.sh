#!/usr/bin/env sh
# Development PKI for the Department Security Server (mTLS) mode:
# one interop CA, a client certificate for the gateway, a server certificate per department.
#   npm run certs:mtls            -> ./certs/mtls
#   sh scripts/mtls-certs.sh DIR  -> custom directory
# Production: issue these from the State PKI / HSM instead.
set -eu
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: keep "/CN=..." literal

OUT="${1:-certs/mtls}"
mkdir -p "$OUT"
cd "$OUT"

openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 365 \
  -subj "/CN=MahaLink Dev Interop CA" -keyout ca.key -out ca.crt 2>/dev/null

issue() {
  name="$1"
  printf '%s\n' "$2" > "$name.ext"
  openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj "/CN=$name" -keyout "$name.key" -out "$name.csr" 2>/dev/null
  openssl x509 -req -in "$name.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 365 -out "$name.crt" -extfile "$name.ext" 2>/dev/null
  rm -f "$name.csr" "$name.ext"
}

issue mahalink-gateway "extendedKeyUsage=clientAuth"
for dept in revenue rto certificates education; do
  issue "$dept-security-server" "extendedKeyUsage=serverAuth
subjectAltName=DNS:$dept-security-server,DNS:localhost,IP:127.0.0.1"
done

chmod 600 ./*.key
echo "mTLS certificates written to $OUT"
