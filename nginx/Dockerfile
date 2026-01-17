FROM nginx:alpine
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/sh -D appuser
COPY nginx.conf /etc/nginx/nginx.conf
RUN chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx
USER appuser
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
