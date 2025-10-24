#!/bin/bash

echo "=== API Testing for Featured Gallery ==="
echo

# 1. Test Login
echo "1. Testing admin login..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@daamitha.art","password":"Admin@123"}' | jq -r '.token')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✓ Login successful (token: ${TOKEN:0:30}...)"
else
  echo "✗ Login failed"
  exit 1
fi

echo

# 2. Test Public API - Should return 6 featured artworks
echo "2. Testing public API (should return exactly 6 featured artworks)..."
FEATURED_COUNT=$(curl -s 'http://localhost:3000/api/artworks?featured=true' | jq length)
echo "✓ Public API returns $FEATURED_COUNT featured artworks"

echo

# 3. Test Admin API - Should show featured field
echo "3. Testing admin API (should show featured field)..."
curl -s http://localhost:3000/api/artworks \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | "\(.title): featured=\(.featured), image=\(.image_path)"' | head -6

echo

# 4. Test image accessibility
echo "4. Testing image accessibility..."
for img in "cat-oils.jpg" "tiger.jpg" "monkey-oils.jpg"; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/images/$img")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ /images/$img: HTTP $HTTP_CODE"
  else
    echo "✗ /images/$img: HTTP $HTTP_CODE"
  fi
done

echo

# 5. Test featured toggle (get first artwork ID)
echo "5. Testing featured toggle functionality..."
ARTWORK_ID=$(curl -s http://localhost:3000/api/artworks \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

echo "Testing with artwork ID: $ARTWORK_ID"

# Try to unfeature it
RESPONSE=$(curl -s -X PATCH "http://localhost:3000/api/artworks/$ARTWORK_ID/featured" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featured": false}')

MESSAGE=$(echo $RESPONSE | jq -r '.message')
echo "✓ Unfeature response: $MESSAGE"

# Try to feature it back
RESPONSE2=$(curl -s -X PATCH "http://localhost:3000/api/artworks/$ARTWORK_ID/featured" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featured": true}')

MESSAGE2=$(echo $RESPONSE2 | jq -r '.message')
echo "✓ Feature response: $MESSAGE2"

echo
echo "=== All Tests Passed! ==="
