FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb* package-lock.json* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "bun run db:migrate && bun start"]
