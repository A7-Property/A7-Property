BEGIN;

-- Freeze writes while validating existing ownership and installing both triggers.
LOCK TABLE "User", "Property" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Property" p
    LEFT JOIN "User" u ON u.id = p."ownerId"
    WHERE u.id IS NULL OR u.role::text NOT IN ('LISTER', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Migration stopped: existing properties have missing or ineligible owners';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION enforce_property_owner_role()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_role text;
BEGIN
  -- A row write serializes ownership checks with role updates. Unlike a
  -- read-only row lock, this also produces a serialization failure for a stale
  -- REPEATABLE READ snapshot, preventing concurrent role/ownership races.
  UPDATE "User" SET role = role WHERE id = NEW."ownerId"
  RETURNING role::text INTO owner_role;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property owner does not exist: %', NEW."ownerId" USING ERRCODE = '23503';
  END IF;
  IF owner_role NOT IN ('LISTER', 'ADMIN') THEN
    RAISE EXCEPTION 'Only LISTER or ADMIN may own listings; owner % has role %', NEW."ownerId", owner_role
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_property_owner_role
BEFORE INSERT OR UPDATE OF "ownerId" ON "Property"
FOR EACH ROW EXECUTE FUNCTION enforce_property_owner_role();

CREATE OR REPLACE FUNCTION prevent_owner_role_downgrade()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NEW.role::text NOT IN ('LISTER', 'ADMIN')
     AND EXISTS (SELECT 1 FROM "Property" WHERE "ownerId" = OLD.id) THEN
    RAISE EXCEPTION 'Cannot change user % to an ineligible role while owning listings', OLD.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_prevent_owner_role_downgrade
BEFORE UPDATE OF role ON "User"
FOR EACH ROW EXECUTE FUNCTION prevent_owner_role_downgrade();

COMMIT;
