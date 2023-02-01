FROM rust:1.65-slim as builder
RUN apt-get update && apt-get install -y libssl-dev pkg-config && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/dependabot-filter
COPY . .
RUN cargo install --path .

FROM debian:buster-slim
RUN apt-get update && apt-get install -y libssl-dev pkg-config ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/cargo/bin/dependabot-filter /usr/local/bin/dependabot-filter
CMD dependabot-filter
