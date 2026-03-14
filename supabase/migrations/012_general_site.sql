-- Add a virtual "General" site for non-physical issues (system, booking, payments, etc.)

INSERT INTO sites (id, name, short_name, slug, address, postcode, description) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'General', 'General', 'general',
   NULL, NULL,
   'Non-physical issues — management system, booking system, payments, and general district matters.');

INSERT INTO buildings (site_id, name, description) VALUES
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'This Management System',  'Issues or requests related to this AST Management System app'),
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'Booking System',          'Issues or requests related to the site booking system'),
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'Payments',                'Issues or requests related to payments and finance'),
  ('a1b2c3d4-cafe-4000-a000-000000000002', 'Other',                   'General district matters not covered above');
