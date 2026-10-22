ARG IMAGE
FROM ${IMAGE}
# The base image's CA stores are only as current as its last release; Java keeps its own.
RUN apt-get update && apt-get install -y --no-install-recommends --only-upgrade ca-certificates && rm -rf /var/lib/apt/lists/* \
 && ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBr /etc/ssl/certs/ca-certificates.crt \
 && keytool -list -cacerts -storepass changeit | grep -i '^[^ ]*emsign.*trustedCertEntry' \
  | sed -E 's/, [A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4}, trustedCertEntry,.*$//' \
  | while IFS= read -r alias; do keytool -delete -cacerts -storepass changeit -alias "$alias"; done \
 && ! keytool -list -cacerts -storepass changeit | grep -qi emsign
