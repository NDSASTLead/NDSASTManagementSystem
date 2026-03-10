-- ============================================================
-- NDS Maintenance Tracker - Multi-site report form
-- Adds: building_category column, 2 new sites, full Overstone building list
-- ============================================================

-- Add building_category column to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_category TEXT;

-- ============================================================
-- New site: Fernie Fields Scout & Community Centre
-- District HQ at Fernie Field, Moulton, Northampton NN3 7BD
-- Large hall + meeting room (16 seats) + kitchen; not suitable for sleepovers
-- ============================================================
INSERT INTO sites (id, name, short_name, slug, address, postcode, description) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000002',
   'Fernie Fields Scout & Community Centre', 'Fernie Fields', 'fernie-fields',
   'Fernie Field, Moulton, Northampton', 'NN3 7BD',
   'District Headquarters for Northampton Scouts. Large hall, self-catering kitchen, and meeting room, available for Scouting and community use.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (site_id, name, building_category) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'Main Hall',         'accommodation'),
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'Meeting Room',      'accommodation'),
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'Kitchen',           'facilities'),
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'Grounds / External','grounds');

-- ============================================================
-- New site: Yr Hen Felin Activity & Mountain Centre
-- Former Cynwyd Youth Hostel (YHA 1930s-2005); purchased 2005, opened 2006
-- The Old Mill in Cynwyd village, Denbighshire, near Snowdonia
-- Sleeps 30; 5 bedrooms + communal areas; separate camping area
-- ============================================================
INSERT INTO sites (id, name, short_name, slug, address, description) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000003',
   'Yr Hen Felin Activity & Mountain Centre', 'YHF', 'yr-hen-felin',
   'Cynwyd, Corwen, Denbighshire, North Wales',
   'Former Cynwyd Youth Hostel (The Old Mill). Activity and mountain centre sleeping 30, with camping area. Used by Northampton District Scouts for adventurous activities.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (site_id, name, building_category) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000003', 'Main Building',          'accommodation'),
  ('a1b2c3d4-cafe-4000-a000-000000000003', 'Camping Area / Grounds', 'grounds');

-- ============================================================
-- Ensure Overstone site exists (guard for DBs where 003_seed_data.sql
-- has not been run -- UPDATE/INSERT below require the site row)
-- ============================================================
INSERT INTO sites (id, name, short_name, slug, address, postcode, description) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000001',
   'Overstone Scout Activity Centre', 'Overstone', 'overstone',
   'Overstone, Northamptonshire', 'NN6 0AD',
   'Main Scout activity centre including Pack Holiday Centre, Will Smith building, and grounds.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Update existing Overstone buildings with categories
-- Site UUID: a1b2c3d4-cafe-4000-a000-000000000001
-- ============================================================

-- Accommodation (indoor sleeping buildings)
UPDATE buildings SET building_category = 'accommodation'
  WHERE site_id = 'a1b2c3d4-cafe-4000-a000-000000000001'
  AND name IN ('Pack Holiday Centre', 'Will Smith Building', 'Knights Lodge', 'The Hub', 'The Royal');

-- Activity areas
UPDATE buildings SET building_category = 'activity'
  WHERE site_id = 'a1b2c3d4-cafe-4000-a000-000000000001'
  AND name IN ('Shooting Range', 'Archery Range', 'Roys Challenge');

-- Grounds
UPDATE buildings SET building_category = 'grounds'
  WHERE site_id = 'a1b2c3d4-cafe-4000-a000-000000000001'
  AND name = 'Grounds / External';

-- Facilities (toilets etc)
UPDATE buildings SET building_category = 'facilities'
  WHERE site_id = 'a1b2c3d4-cafe-4000-a000-000000000001'
  AND name IN ('Toilet Block - Field', 'Toilet Block - Woods');

-- Storage
UPDATE buildings SET building_category = 'storage'
  WHERE site_id = 'a1b2c3d4-cafe-4000-a000-000000000001'
  AND name = 'Archive / Store';

-- Deactivate the generic Fields building - replaced by named campsite entries below
UPDATE buildings SET is_active = false
  WHERE site_id = 'a1b2c3d4-cafe-4000-a000-000000000001'
  AND name = 'Fields';

-- ============================================================
-- New buildings at Overstone (facilities, activities, campsites)
-- ============================================================
INSERT INTO buildings (site_id, name, building_category) VALUES
  -- Facilities
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Chapel',                    'facilities'),
  -- Activity areas
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Traverse / Bouldering Wall','activity'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Campfire Circle',            'activity'),
  -- Campsites (10 named woodland pitches)
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Elm Campsite',               'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Fir Campsite',               'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Oak Campsite',               'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Ash Campsite',               'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Crow Campsite',              'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Dove Campsite',              'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Hawk Campsite',              'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Lark Campsite',              'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Owl Campsite',               'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Jay Campsite',               'campsite'),
  -- Hammock site
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Wren Hammock Site',          'campsite'),
  -- Fields
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Cub Field (Top Field)',      'campsite'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'New Field (Bottom Field)',   'campsite');
