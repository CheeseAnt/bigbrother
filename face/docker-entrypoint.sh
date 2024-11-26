#!/bin/sh
cp -r dist-clean dist

if [ -n "$API_BASE" ]; then
  find /app/dist -type f -name "*.js" -exec sed -i "s|REPLACE_API_BASE|$API_BASE|g" {} +
fi
exec serve -s /app/dist
