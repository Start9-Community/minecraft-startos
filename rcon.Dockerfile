FROM itzg/rcon@sha256:c9521f333bf9eaedf2db0acd750e67be88eaaa9c5e9026385bd875dc18a49110 AS rcon

FROM node:24.22.1-bookworm-slim
COPY --from=rcon /opt/rcon-web-admin-0.14.1 /opt/rcon-web-admin-0.14.1
RUN ln -s /opt/rcon-web-admin-0.14.1 /opt/rcon-web-admin
WORKDIR /opt/rcon-web-admin
ENV RWA_ENV=TRUE

COPY docker/rcon/apply-patches.js /tmp/apply-patches.js
RUN node /tmp/apply-patches.js && rm /tmp/apply-patches.js

ENTRYPOINT ["/usr/local/bin/node", "src/main.js", "start"]
