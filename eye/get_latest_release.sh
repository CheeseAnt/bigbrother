#!/bin/bash

RAW_EXT=""

# Determine platform-specific asset suffix
case "$(uname -s)-$(uname -m)" in
    "Darwin-arm64")
        PLATFORM="aarch64-apple-darwin"
        ARCHIVE_EXT=".tar.gz"
        ;;
    "Darwin-x86_64")
        echo "Intel Mac not supported"
        exit 1
        ;;
    "Linux-x86_64")
        PLATFORM="x86_64-unknown-linux-gnu"
        ARCHIVE_EXT=".tar.gz"
        ;;
    "Linux-aarch64")
        PLATFORM="aarch64-unknown-linux-gnu"
        ARCHIVE_EXT=".tar.gz"
        ;;
    "MINGW"*|"MSYS"*)
        PLATFORM="x86_64-pc-windows-gnu"
        ARCHIVE_EXT=".exe.zip"
        RAW_EXT=".exe"
        ;;
    *)
        echo "Unsupported platform"
        exit 1
        ;;
esac

# Download the appropriate asset
ASSET_NAME="bb_eye-${PLATFORM}${ARCHIVE_EXT}"
ASSET_RAW="bb_eye-${PLATFORM}${RAW_EXT}"
URL_TEMPLATE="https://github.com/CheeseAnt/bigbrother/releases/latest/download/"

curl_cmd="curl"
if [ -z "$(command -v curl)" ]; then
    if [ -z "$(command -v wget)" ]; then
        echo "Neither curl nor wget is installed"
        exit 1
    fi
    curl_cmd="wget"
fi

$curl_cmd -L -o "$ASSET_NAME" "$URL_TEMPLATE$ASSET_NAME"
if [ $? -ne 0 ]; then
    echo "Failed to download release"
    exit 1
fi

# Extract/install the binary
if [ "$PLATFORM" = "x86_64-pc-windows-gnu" ]; then
    unzip -o "$ASSET_NAME"
    rm "$ASSET_NAME"
    mv "$ASSET_RAW" "eye.exe"
else
    tar xzf "$ASSET_NAME"
    rm "$ASSET_NAME"
    mv "$ASSET_RAW" "eye"
fi

echo "Downloaded latest release $ASSET_NAME"
