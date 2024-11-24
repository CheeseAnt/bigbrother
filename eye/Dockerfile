FROM rust:1.82.0-slim AS builder

# Install build dependencies and cross-compilation tools
RUN apt-get update && apt-get install -y \
    gcc-x86-64-linux-gnu \
    g++-x86-64-linux-gnu \
    clang \
    llvm \
    gcc-mingw-w64 \
    libc6-dev-arm64-cross \
    zip \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

ARG TARGET
ENV TARGET=$TARGET
ENV CONTAINERIZED=true
ENV SOURCE_DIR=/app
ENV BUILD_DIR=/build

WORKDIR $BUILD_DIR

# Add targets for cross-compilation
RUN rustup target add $TARGET

# Pre-install dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --target $TARGET
RUN rm -rf src

# Remove any existing build artifacts
RUN rm target/$TARGET/release/bb_eye*

CMD ./finish_build.sh

