#!/bin/bash

# Frontal API Authentication Examples
# These examples demonstrate how to authenticate with the Frontal API

# Configuration
API_BASE_URL="https://api.frontal.dev"
API_KEY="${FRONTAL_API_KEY}"  # Set your API key as environment variable

echo "Frontal API Authentication Examples"
echo "=================================="

# 1. User Registration
echo -e "\n1. Register a new user:"
curl -X POST "${API_BASE_URL}/auth/v1/signup" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "data": {
      "first_name": "John",
      "last_name": "Doe"
    }
  }' | jq .

# 2. User Login (Email/Password)
echo -e "\n2. Login with email and password:"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/v1/token" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "grant_type": "password",
    "email": "user@example.com",
    "password": "securePassword123"
  }')

echo "$LOGIN_RESPONSE" | jq .

# Extract access token for subsequent requests
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')

# 3. Get User Profile
echo -e "\n3. Get user profile:"
curl -X GET "${API_BASE_URL}/auth/v1/user" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-API-Key: ${API_KEY}" | jq .

# 4. Update User Profile
echo -e "\n4. Update user profile:"
curl -X PUT "${API_BASE_URL}/auth/v1/user" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "first_name": "John Updated",
      "last_name": "Doe Updated"
    }
  }' | jq .

# 5. Magic Link Authentication
echo -e "\n5. Send magic link:"
curl -X POST "${API_BASE_URL}/auth/v1/magiclink" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "email": "user@example.com",
    "data": {
      "redirect_to": "https://yourapp.com/callback"
    }
  }' | jq .

# 6. OAuth Provider Authorization (Google)
echo -e "\n6. Initiate OAuth flow with Google:"
curl -X GET "${API_BASE_URL}/auth/v1/authorize?provider=google&scopes=email profile" \
  -H "X-API-Key: ${API_KEY}" \
  -v

# 7. Refresh Token
echo -e "\n7. Refresh access token:"
curl -X POST "${API_BASE_URL}/auth/v1/token" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "'$(echo "$LOGIN_RESPONSE" | jq -r '.data.refresh_token')'"
  }' | jq .

# 8. Logout
echo -e "\n8. Logout user:"
curl -X POST "${API_BASE_URL}/auth/v1/logout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-API-Key: ${API_KEY}" | jq .

# 9. Password Recovery
echo -e "\n9. Request password recovery:"
curl -X POST "${API_BASE_URL}/auth/v1/recover" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "email": "user@example.com"
  }' | jq .

# 10. OTP Authentication
echo -e "\n10. Send OTP via email:"
curl -X POST "${API_BASE_URL}/auth/v1/otp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "email": "user@example.com",
    "create_user": false
  }' | jq .

echo -e "\n=================================="
echo "Examples completed!"
echo ""
echo "Notes:"
echo "- Set FRONTAL_API_KEY environment variable with your API key"
echo "- Install jq for pretty JSON output: brew install jq (macOS)"
echo "- Replace user@example.com with your actual email"
echo "- Some endpoints require valid user sessions"
