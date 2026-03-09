-- ============================================================
-- NDS Maintenance Tracker - Seed Data
-- ============================================================

-- Sites
INSERT INTO sites (id, name, short_name, slug, address, postcode, description) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Overstone Scout Activity Centre', 'Overstone', 'overstone',
   'Overstone, Northamptonshire', 'NN6 0AD',
   'Main Scout activity centre including Pack Holiday Centre, Will Smith building, and grounds.');

-- Buildings at Overstone
INSERT INTO buildings (site_id, name, description) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Pack Holiday Centre', 'Main holiday accommodation block'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Will Smith Building', 'Activity and meeting building'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Archive / Store', 'Storage and archive building'),
  ('a1b2c3d4-cafe-4000-a000-000000000001', 'Grounds / External', 'Site grounds, fencing, paths, car park');

-- Asset Categories
INSERT INTO asset_categories (name, icon, colour) VALUES
  ('Fire Safety',    'flame',         'red'),
  ('Electrical',     'zap',           'yellow'),
  ('Structural',     'building',      'orange'),
  ('Plumbing',       'droplets',      'blue'),
  ('Grounds',        'trees',         'green'),
  ('Security',       'lock',          'purple'),
  ('Equipment',      'wrench',        'gray'),
  ('General',        'clipboard',     'slate');
