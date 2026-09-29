#!/usr/bin/env python3
"""
scripts/generate_test_jwt.py

Generates a signed JWT for load testing through api-gateway.
The token contains the 'id' claim matching a target user (e.g., loadtest-user-99)
and is signed with the same JWT_SECRET used by auth-service and api-gateway.

Usage:
    python scripts/generate_test_jwt.py
    python scripts/generate_test_jwt.py --user loadtest-user-42
"""

import argparse
import os
import sys
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add project root paths
SERVICE_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SERVICE_ROOT.parent

import jwt
from dotenv import load_dotenv

# Suppress key length warning since 'supersecretkey' is the existing dev secret
warnings.filterwarnings("ignore", category=getattr(jwt, "InsecureKeyLengthWarning", UserWarning))


def get_jwt_secret() -> str:
    """
    Resolves JWT_SECRET by checking:
    1. Environment variable JWT_SECRET
    2. ai-service-python/.env
    3. api-gateway/.env
    4. auth-service/.env
    5. Fallback to known development default: 'supersecretkey'
    """
    secret = os.getenv("JWT_SECRET")
    if secret:
        return secret

    # Check local .env
    service_env = SERVICE_ROOT / ".env"
    if service_env.exists():
        load_dotenv(service_env)
        secret = os.getenv("JWT_SECRET")
        if secret:
            return secret

    # Check api-gateway .env
    gateway_env = PROJECT_ROOT / "api-gateway" / ".env"
    if gateway_env.exists():
        load_dotenv(gateway_env)
        secret = os.getenv("JWT_SECRET")
        if secret:
            return secret

    # Check auth-service .env
    auth_env = PROJECT_ROOT / "auth-service" / ".env"
    if auth_env.exists():
        load_dotenv(auth_env)
        secret = os.getenv("JWT_SECRET")
        if secret:
            return secret

    return "supersecretkey"


def generate_token(user_id: str, secret: str, expiry_hours: int = 24) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "id": user_id,
        "exp": now + timedelta(hours=expiry_hours),
        "iat": now,
    }
    # PyJWT returns str in version 2.x
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token


def main():
    parser = argparse.ArgumentParser(description="Generate a test JWT for api-gateway load testing.")
    parser.add_argument(
        "--user",
        type=str,
        default="loadtest-user-99",
        help="User ID for the token payload 'id' claim (default: loadtest-user-99)"
    )
    parser.add_argument(
        "--hours",
        type=int,
        default=24,
        help="Token expiry duration in hours (default: 24)"
    )
    args = parser.parse_args()

    secret = get_jwt_secret()
    token = generate_token(args.user, secret, expiry_hours=args.hours)

    print(token)


if __name__ == "__main__":
    main()
