-- Reference data shared by the marketplace and the SaaS: cities (incl. airports) and vehicle types.
-- Publicly readable; writes are reserved to platform admins (policies added with the identity migration).

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_fr text not null,
  name_en text not null,
  name_ar text not null,
  region text,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  is_airport boolean not null default false,
  iata_code text unique check (iata_code ~ '^[A-Z]{3}$'),
  -- An airport is attached to the city it serves (e.g. CMN -> Casablanca).
  served_city_id uuid references public.cities (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (is_airport = (iata_code is not null))
);

create index cities_served_city_id_idx on public.cities (served_city_id);

create table public.vehicle_types (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name_fr text not null,
  name_en text not null,
  name_ar text not null,
  -- Indicative only: the real capacity is set on each vehicle.
  indicative_seats integer not null check (indicative_seats > 0),
  sort_order integer not null default 0
);

alter table public.cities enable row level security;
alter table public.vehicle_types enable row level security;

create policy "cities are public" on public.cities for select to anon, authenticated using (true);
create policy "vehicle types are public" on public.vehicle_types for select to anon, authenticated using (true);

-- Main tourist axes of the MVP. Coordinates are approximate city / airport centers.
insert into public.cities (slug, name_fr, name_en, name_ar, region, latitude, longitude) values
  ('casablanca', 'Casablanca', 'Casablanca', 'الدار البيضاء', 'Casablanca-Settat', 33.573100, -7.589800),
  ('marrakech', 'Marrakech', 'Marrakesh', 'مراكش', 'Marrakech-Safi', 31.629500, -7.981100),
  ('fes', 'Fès', 'Fez', 'فاس', 'Fès-Meknès', 34.018100, -5.007800),
  ('agadir', 'Agadir', 'Agadir', 'أكادير', 'Souss-Massa', 30.427800, -9.598100),
  ('tanger', 'Tanger', 'Tangier', 'طنجة', 'Tanger-Tétouan-Al Hoceïma', 35.759500, -5.834000),
  ('rabat', 'Rabat', 'Rabat', 'الرباط', 'Rabat-Salé-Kénitra', 34.020900, -6.841600);

insert into public.cities (slug, name_fr, name_en, name_ar, region, latitude, longitude, is_airport, iata_code, served_city_id)
select a.slug, a.name_fr, a.name_en, a.name_ar, c.region, a.latitude, a.longitude, true, a.iata_code, c.id
from (values
  ('aeroport-casablanca-mohammed-v', 'Aéroport Mohammed V (Casablanca)', 'Mohammed V Airport (Casablanca)', 'مطار محمد الخامس الدولي', 33.367500, -7.589800, 'CMN', 'casablanca'),
  ('aeroport-marrakech-menara', 'Aéroport Marrakech Menara', 'Marrakesh Menara Airport', 'مطار مراكش المنارة', 31.606900, -8.036300, 'RAK', 'marrakech'),
  ('aeroport-fes-sais', 'Aéroport Fès-Saïs', 'Fez-Saïss Airport', 'مطار فاس سايس', 33.927300, -4.977900, 'FEZ', 'fes'),
  ('aeroport-agadir-al-massira', 'Aéroport Agadir Al Massira', 'Agadir Al Massira Airport', 'مطار أكادير المسيرة', 30.325000, -9.413100, 'AGA', 'agadir'),
  ('aeroport-tanger-ibn-battouta', 'Aéroport Tanger Ibn Battouta', 'Tangier Ibn Battouta Airport', 'مطار طنجة ابن بطوطة', 35.726900, -5.916900, 'TNG', 'tanger'),
  ('aeroport-rabat-sale', 'Aéroport Rabat-Salé', 'Rabat-Salé Airport', 'مطار الرباط سلا', 34.051500, -6.751500, 'RBA', 'rabat')
) as a (slug, name_fr, name_en, name_ar, latitude, longitude, iata_code, city_slug)
join public.cities c on c.slug = a.city_slug;

insert into public.vehicle_types (code, name_fr, name_en, name_ar, indicative_seats, sort_order) values
  ('sedan', 'Berline', 'Sedan', 'سيارة سيدان', 3, 10),
  ('suv_4x4', '4x4', '4x4 SUV', 'سيارة رباعية الدفع', 4, 20),
  ('van', 'Van', 'Van', 'فان', 7, 30),
  ('minibus', 'Minibus', 'Minibus', 'حافلة صغيرة', 17, 40),
  ('coach', 'Autocar', 'Coach', 'حافلة سياحية', 50, 50);
