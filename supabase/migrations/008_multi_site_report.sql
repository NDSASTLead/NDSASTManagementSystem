-- ============================================================
-- NDS Maintenance Tracker - Multi-site report form
-- Adds: building_category column, 2 new sites, full Overstone building list
-- Uses slug-based lookups so migration runs on any database regardless
-- of which UUIDs were assigned by previous seed migrations.
-- ============================================================

-- Add building_category column to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_category TEXT;

-- ============================================================
-- New site: Fernie Fields Scout & Community Centre
-- District HQ at Fernie Field, Moulton, Northampton NN3 7BD
-- ============================================================
INSERT INTO sites (name, short_name, slug, address, postcode, description) VALUES
  ('Fernie Fields Scout & Community Centre', 'Fernie Fields', 'fernie-fields',
   'Fernie Field, Moulton, Northampton', 'NN3 7BD',
   'District Headquarters for Northampton Scouts. Large hall, self-catering kitchen, and meeting room, available for Scouting and community use.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (site_id, name, building_category)
SELECT s.id, v.name, v.cat
FROM sites s
CROSS JOIN (VALUES
  ('Main Hall',         'accommodation'),
  ('Meeting Room',      'accommodation'),
  ('Kitchen',           'facilities'),
  ('Grounds / External','grounds')
) AS v(name, cat)
WHERE s.slug = 'fernie-fields';

-- ============================================================
-- New site: Yr Hen Felin Activity & Mountain Centre
-- Former Cynwyd Youth Hostel; purchased 2005, opened 2006
-- The Old Mill in Cynwyd village, Denbighshire, near Snowdonia
-- ============================================================
INSERT INTO sites (name, short_name, slug, address, description) VALUES
  ('Yr Hen Felin Activity & Mountain Centre', 'YHF', 'yr-hen-felin',
   'Cynwyd, Corwen, Denbighshire, North Wales',
   'Former Cynwyd Youth Hostel (The Old Mill). Activity and mountain centre sleeping 30, with camping area. Used by Northampton District Scouts for adventurous activities.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (site_id, name, building_category)
SELECT s.id, v.name, v.cat
FROM sites s
CROSS JOIN (VALUES
  ('Main Building',          'accommodation'),
  ('Camping Area / Grounds', 'grounds')
) AS v(name, cat)
WHERE s.slug = 'yr-hen-felin';

-- ============================================================
-- Ensure Overstone site exists (guard for fresh DBs)
-- ============================================================
INSERT INTO sites (name, short_name, slug, address, postcode, description) VALUES
  ('Overstone Scout Activity Centre', 'Overstone', 'overstone',
   'Overstone, Northamptonshire', 'NN6 0AD',
   'Main Scout activity centre including Pack Holiday Centre, Will Smith building, and grounds.')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Update existing Overstone buildings with categories (slug-based)
-- ============================================================

-- Accommodation (indoor sleeping buildings)
UPDATE buildings SET building_category = 'accommodation'
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'overstone')
  AND name IN ('Pack Holiday Centre', 'Will Smith Building', 'Knights Lodge', 'The Hub', 'The Royal');

-- Activity areas
UPDATE buildings SET building_category = 'activity'
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'overstone')
  AND name IN ('Shooting Range', 'Archery Range', 'Roys Challenge');

-- Grounds
UPDATE buildings SET building_category = 'grounds'
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'overstone')
  AND name = 'Grounds / External';

-- Facilities
UPDATE buildings SET building_category = 'facilities'
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'overstone')
  AND name IN ('Toilet Block - Field', 'Toilet Block - Woods');

-- Storage
UPDATE buildings SET building_category = 'storage'
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'overstone')
  AND name = 'Archive / Store';

-- Deactivate the generic Fields building - replaced by named campsite entries below
UPDATE buildings SET is_active = false
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'overstone')
  AND name = 'Fields';

-- ============================================================
-- New buildings at Overstone (slug-based insert)
-- ============================================================
INSERT INTO buildings (site_id, name, building_category)
SELECT s.id, v.name, v.cat
FROM sites s
CROSS JOIN (VALUES
  ('Chapel',                    'facilities'),
  ('Traverse / Bouldering Wall','activity'),
  ('Campfire Circle',            'activity'),
  ('Elm Campsite',               'campsite'),
  ('Fir Campsite',               'campsite'),
  ('Oak Campsite',               'campsite'),
  ('Ash Campsite',               'campsite'),
  ('Crow Campsite',              'campsite'),
  ('Dove Campsite',              'campsite'),
  ('Hawk Campsite',              'campsite'),
  ('Lark Campsite',              'campsite'),
  ('Owl Campsite',               'campsite'),
  ('Jay Campsite',               'campsite'),
  ('Wren Hammock Site',          'campsite'),
  ('Cub Field (Top Field)',      'campsite'),
  ('New Field (Bottom Field)',   'campsite')
) AS v(name, cat)
WHERE s.slug = 'overstone';