-- Create user unless it exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'demo') THEN
        CREATE USER demo WITH PASSWORD 'P@ssword!1' SUPERUSER;
    END IF;
END $$;

-- Create empty database unless it exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'acme') THEN
        CREATE DATABASE acme OWNER demo;
    END IF;
END $$;

\c acme;

-- Ensure TimescaleDB extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Grant privileges to demo for migrations
GRANT ALL PRIVILEGES ON DATABASE acme TO demo;
GRANT ALL ON SCHEMA public TO demo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO demo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO demo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO demo;