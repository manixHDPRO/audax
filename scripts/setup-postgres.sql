DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audax') THEN
    CREATE USER audax WITH PASSWORD 'audax_secret';
  END IF;
END
$$;
