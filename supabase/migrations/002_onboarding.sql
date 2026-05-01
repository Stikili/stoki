-- ============================================================
-- STOKI — Migration 002: Onboarding fields
-- Run in Supabase SQL Editor
-- ============================================================

-- Add category, location, and onboarding_completed to stores
alter table stores
  add column if not exists category            text check (category in ('spaza', 'general_dealer', 'food_stall', 'other')),
  add column if not exists location            text,
  add column if not exists onboarding_completed boolean not null default false;

-- starter_products: template products per category, used to seed new stores
create table if not exists starter_products (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  name         text not null,
  price        numeric(10,2) not null,
  cost         numeric(10,2) not null default 0,
  reorder_point integer not null default 5
);

-- Spaza starter pack
insert into starter_products (category, name, price, cost, reorder_point) values
  ('spaza', 'White Bread (700g)',        16.99,  12.00, 10),
  ('spaza', 'Brown Bread (700g)',         15.99,  11.50, 10),
  ('spaza', 'Full Cream Milk (1L)',       23.99,  18.00,  8),
  ('spaza', 'White Sugar (1kg)',          30.99,  24.00,  5),
  ('spaza', 'Cake Flour (1kg)',           20.99,  16.00,  5),
  ('spaza', 'Cooking Oil (750ml)',        38.99,  30.00,  5),
  ('spaza', 'Rice (2kg)',                 45.99,  35.00,  5),
  ('spaza', 'Eggs (6-pack)',              29.99,  22.00,  8),
  ('spaza', 'Maggi Noodles',              3.99,   2.50, 20),
  ('spaza', 'Simba Chips (30g)',          7.99,   5.50, 20),
  ('spaza', 'Coke 340ml Can',            16.99,  12.00, 15),
  ('spaza', 'Fanta Orange 340ml Can',    16.99,  12.00, 10),
  ('spaza', 'Coke 2L',                   29.99,  22.00,  8),
  ('spaza', 'Jelly Tots (100g)',         11.99,   8.00, 10),
  ('spaza', 'Washing Powder (500g)',     28.99,  21.00,  5),
  ('spaza', 'Sunlight Dish Soap (400g)', 23.99,  17.00,  5),
  ('spaza', 'Airtime R5',                 5.00,   4.80, 30),
  ('spaza', 'Airtime R10',               10.00,   9.80, 20),
  ('spaza', 'Airtime R29',               29.00,  28.50, 10),
  ('spaza', 'Cremora (250g)',            32.99,  25.00,  5);

-- General dealer starter pack (broader selection)
insert into starter_products (category, name, price, cost, reorder_point) values
  ('general_dealer', 'White Bread (700g)',        16.99,  12.00, 15),
  ('general_dealer', 'Full Cream Milk (1L)',       23.99,  18.00, 10),
  ('general_dealer', 'White Sugar (2kg)',          59.99,  46.00,  5),
  ('general_dealer', 'Rice (5kg)',                109.99,  85.00,  5),
  ('general_dealer', 'Cooking Oil (2L)',           89.99,  68.00,  5),
  ('general_dealer', 'Eggs (Dozen)',               59.99,  45.00,  8),
  ('general_dealer', 'Coke 2L',                   29.99,  22.00, 10),
  ('general_dealer', 'Mineral Water (500ml)',       8.99,   5.50, 20),
  ('general_dealer', 'Baked Beans (410g)',         17.99,  13.00,  8),
  ('general_dealer', 'Pilchards (400g)',           22.99,  17.00,  8),
  ('general_dealer', 'Maggi Noodles',              3.99,   2.50, 30),
  ('general_dealer', 'Simba Chips (30g)',           7.99,   5.50, 25),
  ('general_dealer', 'Washing Powder (1kg)',       52.99,  40.00,  5),
  ('general_dealer', 'Sunlight Dish Soap (750ml)', 39.99,  29.00,  5),
  ('general_dealer', 'Tissue 2-ply (4-pack)',      29.99,  22.00,  5),
  ('general_dealer', 'Toothpaste (100ml)',         19.99,  14.00,  5),
  ('general_dealer', 'Airtime R10',               10.00,   9.80, 20),
  ('general_dealer', 'Airtime R29',               29.00,  28.50, 15),
  ('general_dealer', 'Airtime R60',               60.00,  59.00, 10),
  ('general_dealer', 'Data 500MB',                15.00,  14.00, 10);

-- Food stall starter pack
insert into starter_products (category, name, price, cost, reorder_point) values
  ('food_stall', 'Boerewors Roll',        30.00,  18.00, 10),
  ('food_stall', 'Pap (portion)',         15.00,   5.00, 10),
  ('food_stall', 'Chicken Piece',         35.00,  22.00,  8),
  ('food_stall', 'Vetkoek (each)',        10.00,   4.00, 15),
  ('food_stall', 'Russians (2-pack)',     25.00,  16.00, 10),
  ('food_stall', 'Atchaar (portion)',      8.00,   3.00, 10),
  ('food_stall', 'Chakalaka (portion)',    8.00,   3.00, 10),
  ('food_stall', 'Coke 340ml Can',       16.99,  12.00, 15),
  ('food_stall', 'Coke 2L',             29.99,  22.00,  5),
  ('food_stall', 'Mineral Water (500ml)',  8.99,   5.50, 10),
  ('food_stall', 'Chips (portion)',       20.00,  10.00, 10),
  ('food_stall', 'Magwinya (each)',        8.00,   3.50, 15),
  ('food_stall', 'Samp & Beans (portion)',20.00,   8.00,  5),
  ('food_stall', 'Bread Roll',            5.00,   2.50, 10),
  ('food_stall', 'Juice (250ml)',        12.00,   8.00, 10);
