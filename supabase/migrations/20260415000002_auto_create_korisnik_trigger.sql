-- ============================================================
-- IZVPRO — Auto-kreiranje korisnika pri registraciji
-- Trigger: kada se doda novi user u auth.users,
-- automatski se kreira red u public.korisnici
-- ako je office_id prosleden kroz raw_user_meta_data.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
BEGIN
  -- Pokusaj da procitas office_id iz metapodataka
  v_office_id := (NEW.raw_user_meta_data->>'office_id')::uuid;

  -- Samo insertuj ako postoji office_id
  -- (admin kreira usera i prosledi office_id u metapodacima)
  IF v_office_id IS NOT NULL THEN
    INSERT INTO public.korisnici (
      id,
      office_id,
      ime_prezime,
      email,
      role,
      aktivan
    )
    VALUES (
      NEW.id,
      v_office_id,
      COALESCE(NEW.raw_user_meta_data->>'ime_prezime', split_part(NEW.email, '@', 1)),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'operater'),
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Zakaci trigger na auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
