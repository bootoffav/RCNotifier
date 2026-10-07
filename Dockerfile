FROM denoland/deno:2.9.7
WORKDIR /app
COPY . .
RUN deno install --entrypoint main.ts
CMD ["deno", "run", "-A", "--unstable-cron", "main.ts"]