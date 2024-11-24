if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

# Remove existing builds
rm -r dist 2>/dev/null

check_target_built() {
    if [ ! -f "dist/bb_eye-$1" ] && [ ! -f "dist/bb_eye-$1.exe" ]; then
        echo "Build for $1 failed or not found"
        exit 1
    fi
}

# Build for Apple Silicon
CONTAINERIZED=false TARGET=aarch64-apple-darwin SOURCE_DIR=. ./finish_build.sh
check_target_built "aarch64-apple-darwin"

# Build for Windows & Linux on AMD64/ARM64
docker-compose build
docker-compose up --remove-orphans

check_target_built "x86_64-pc-windows-gnu"
check_target_built "x86_64-unknown-linux-gnu"
check_target_built "aarch64-unknown-linux-gnu"

./make_release.sh $1
