# Or create a draft release
gh release create v$1 \
    --draft \
    --title "Release v$1" \
    dist/bb_eye*

