# Copy the app to the build directory
if [ "$CONTAINERIZED" = "true" ]; then  
    cp -r $SOURCE_DIR $BUILD_DIR
fi

# Build the application
cargo build --release --target $TARGET

if [ $? -ne 0 ]; then
    echo "Build failed"
    exit 1
fi

mkdir -p $SOURCE_DIR/dist

# Copy the built binary to the dist directory
if [ "$TARGET" = "x86_64-pc-windows-gnu" ]; then
    cp "target/$TARGET/release/bb_eye.exe" $SOURCE_DIR/dist/bb_eye-$TARGET.exe
else
    cp target/$TARGET/release/bb_eye $SOURCE_DIR/dist/bb_eye-$TARGET
fi

# Create the appropriate archive format for the platform
if [ "$TARGET" = "x86_64-pc-windows-gnu" ]; then
    zip -j $SOURCE_DIR/dist/bb_eye-$TARGET.exe.zip $SOURCE_DIR/dist/bb_eye-$TARGET.exe
else
    tar -czf $SOURCE_DIR/dist/bb_eye-$TARGET.tar.gz $SOURCE_DIR/dist/bb_eye-$TARGET
fi
