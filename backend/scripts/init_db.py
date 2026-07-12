#!/usr/bin/env python3
"""Create PostgreSQL schema and tables. Safe to run multiple times."""

from app.database import init_database

if __name__ == "__main__":
    init_database()
    print("Database schema and tables are ready.")
