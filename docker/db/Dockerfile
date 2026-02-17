FROM postgres:16-alpine

COPY docker/db/entrypoint-with-prestop-backup.sh /usr/local/bin/entrypoint-with-prestop-backup.sh
RUN chmod +x /usr/local/bin/entrypoint-with-prestop-backup.sh

ENTRYPOINT ["/usr/local/bin/entrypoint-with-prestop-backup.sh"]
