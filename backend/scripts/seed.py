#!/usr/bin/env python3
"""Run database seed: python scripts/seed.py (from backend/) or python -m app.seed"""
import sys
from pathlib import Path

# Allow running from repo root or backend/
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.seed import seed_database

if __name__ == "__main__":
    seed_database()
