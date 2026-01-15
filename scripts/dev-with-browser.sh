#!/bin/bash

# Start Next.js dev server in background
next dev &
NEXT_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Server is ready!"
    open http://localhost:3000
    break
  fi
  sleep 1
done

# Wait for the Next.js process
wait $NEXT_PID

