"""
Vercel serverless entrypoint.

This module exposes the Flask WSGI application for Vercel's
@vercel/python runtime. The app object is discovered automatically.
"""

import os
import sys

# Ensure the project root is on sys.path so `app`, `config`, and
# `backend` packages resolve correctly in the serverless environment.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app  # noqa: E402

app = create_app()

