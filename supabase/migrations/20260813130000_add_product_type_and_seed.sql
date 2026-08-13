-- 1. Dodanie kolumny `type` do tabeli products
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'type'
  ) THEN
    ALTER TABLE products ADD COLUMN type TEXT NOT NULL DEFAULT 'Household';
    ALTER TABLE products ADD CONSTRAINT products_type_check CHECK (type IN ('Global', 'Household'));
  END IF;
END $$;

-- 2. Aktualizacja istniejących produktów bez przypisanego gospodarstwa do typu Global
UPDATE products
SET type = 'Global'
WHERE household_id IS NULL;

-- 3. Zasilenie bazy produktów Global (Seed danych)
-- Kategorie:
-- 1: Owoce i Warzywa
-- 2: Pieczywo
-- 3: Nabiał i Jaja
-- 4: Mięso i Ryby
-- 5: Sypkie i Przyprawy
-- 6: Napoje
-- 7: Chemia i Dom (Ad-hoc)
-- 8: Inne (Higiena, Zwierzęta, Przekąski)

INSERT INTO products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, type, household_id)
SELECT v.name, v.unit_type::unit_enum, v.category_id, v.kcal_per_100, v.protein_per_100, v.carbs_per_100, v.fat_per_100, 'Global', NULL
FROM (VALUES
  -- 1. Owoce i Warzywa
  ('Banany', 'g', 1, 89, 1.1, 23.0, 0.3),
  ('Jabłka', 'g', 1, 52, 0.3, 14.0, 0.2),
  ('Pomidory malinowe', 'g', 1, 18, 0.9, 3.9, 0.2),
  ('Pomidory cherry', 'g', 1, 18, 0.9, 3.9, 0.2),
  ('Ogórek zielony długi', 'szt', 1, 15, 0.7, 3.6, 0.1),
  ('Ogórki gruntowe', 'g', 1, 15, 0.7, 3.6, 0.1),
  ('Marchew', 'g', 1, 41, 0.9, 9.6, 0.2),
  ('Ziemniaki', 'g', 1, 77, 2.0, 17.0, 0.1),
  ('Cebula żółta', 'g', 1, 40, 1.1, 9.3, 0.1),
  ('Cebula czerwona', 'g', 1, 40, 1.1, 9.3, 0.1),
  ('Czosnek', 'szt', 1, 149, 6.4, 33.0, 0.5),
  ('Papryka czerwona', 'szt', 1, 31, 1.0, 6.0, 0.3),
  ('Papryka żółta', 'szt', 1, 27, 1.0, 5.3, 0.2),
  ('Cytryna', 'szt', 1, 29, 1.1, 9.3, 0.3),
  ('Limonka', 'szt', 1, 30, 0.7, 11.0, 0.2),
  ('Pomarańcze', 'g', 1, 47, 0.9, 12.0, 0.1),
  ('Truskawki', 'g', 1, 32, 0.7, 7.7, 0.3),
  ('Borówki amerykańskie', 'g', 1, 57, 0.7, 14.0, 0.3),
  ('Maliny', 'g', 1, 52, 1.2, 12.0, 0.7),
  ('Brokuł', 'szt', 1, 34, 2.8, 7.0, 0.4),
  ('Kalafior', 'szt', 1, 25, 1.9, 5.0, 0.3),
  ('Szpinak świeży', 'g', 1, 23, 2.9, 3.6, 0.4),
  ('Sałata lodowa', 'szt', 1, 14, 0.9, 3.0, 0.1),
  ('Rukola', 'g', 1, 25, 2.6, 3.7, 0.7),
  ('Pieczarki', 'g', 1, 22, 3.1, 3.3, 0.3),
  ('Awokado Hass', 'szt', 1, 160, 2.0, 9.0, 15.0),
  ('Cukinia', 'szt', 1, 17, 1.2, 3.1, 0.3),
  ('Por', 'szt', 1, 61, 1.5, 14.0, 0.3),
  ('Seler naciowy', 'szt', 1, 16, 0.7, 3.0, 0.2),
  ('Winogrona jasne', 'g', 1, 67, 0.6, 17.0, 0.2),

  -- 2. Pieczywo
  ('Chleb pszenno-żytni', 'szt', 2, 240, 6.5, 50.0, 1.2),
  ('Chleb żytni razowy', 'szt', 2, 220, 5.5, 45.0, 1.5),
  ('Chleb tostowy', 'szt', 2, 260, 8.0, 49.0, 3.0),
  ('Kajzerka', 'szt', 2, 290, 8.5, 58.0, 2.0),
  ('Bułka grahamka', 'szt', 2, 250, 9.0, 50.0, 1.8),
  ('Bułka tarta', 'g', 2, 350, 10.0, 72.0, 2.0),
  ('Bagietka czosnkowa', 'szt', 2, 310, 7.5, 48.0, 10.0),
  ('Bagietka francuska', 'szt', 2, 270, 8.0, 56.0, 1.5),
  ('Rogalik maślany', 'szt', 2, 380, 7.0, 48.0, 18.0),
  ('Tortilla pszenna', 'szt', 2, 310, 8.0, 52.0, 7.5),
  ('Tortilla pełnoziarnista', 'szt', 2, 290, 9.0, 47.0, 6.5),
  ('Ciasto francuskie', 'szt', 2, 400, 5.5, 38.0, 25.0),
  ('Pieczywo chrupkie żytnie', 'g', 2, 340, 9.5, 65.0, 2.5),
  ('Bułki do hamburgerów', 'szt', 2, 280, 8.5, 50.0, 4.5),
  ('Chałka drożdżowa', 'szt', 2, 330, 7.5, 60.0, 6.5),
  ('Chlebek pita', 'szt', 2, 275, 9.0, 55.0, 1.2),

  -- 3. Nabiał i Jaja
  ('Jajka L', 'szt', 3, 140, 12.5, 0.6, 9.7),
  ('Jajka wolny wybieg M', 'szt', 3, 140, 12.5, 0.6, 9.7),
  ('Mleko 2%', 'ml', 3, 50, 3.3, 4.8, 2.0),
  ('Mleko 3.2%', 'ml', 3, 60, 3.2, 4.7, 3.2),
  ('Mleko bez laktozy 2%', 'ml', 3, 50, 3.3, 4.8, 2.0),
  ('Napój owsiany', 'ml', 3, 45, 1.0, 6.5, 1.5),
  ('Napój migdałowy', 'ml', 3, 24, 0.5, 3.0, 1.1),
  ('Twaróg półtłusty', 'g', 3, 115, 16.5, 3.5, 4.0),
  ('Twaróg chudy', 'g', 3, 86, 18.0, 3.5, 0.0),
  ('Serek wiejski', 'g', 3, 97, 11.0, 2.5, 5.0),
  ('Ser Gouda plastry', 'g', 3, 350, 25.0, 0.0, 27.0),
  ('Ser Mozzarella kulka', 'szt', 3, 280, 19.0, 1.5, 22.0),
  ('Ser Mozzarella wiórki', 'g', 3, 300, 22.0, 2.0, 23.0),
  ('Ser Feta oryginalny', 'g', 3, 260, 14.0, 1.0, 21.0),
  ('Ser Grana Padano / Parmezan', 'g', 3, 390, 33.0, 0.0, 29.0),
  ('Ser Camembert', 'szt', 3, 290, 18.0, 0.5, 24.0),
  ('Masło ekstra 82%', 'g', 3, 740, 0.7, 0.7, 82.0),
  ('Masło klarowane ghee', 'g', 3, 890, 0.0, 0.0, 99.5),
  ('Śmietana 18%', 'ml', 3, 190, 2.5, 3.6, 18.0),
  ('Śmietanka 30%', 'ml', 3, 290, 2.2, 3.1, 30.0),
  ('Jogurt naturalny', 'g', 3, 60, 4.0, 5.5, 2.5),
  ('Jogurt grecki', 'g', 3, 120, 7.0, 3.5, 9.0),
  ('Ser Mascarpone', 'g', 3, 400, 4.0, 3.0, 42.0),
  ('Kefir naturalny', 'ml', 3, 48, 3.2, 4.5, 1.5),

  -- 4. Mięso i Ryby
  ('Pierś z kurczaka', 'g', 4, 110, 23.0, 0.0, 1.5),
  ('Udka z kurczaka bez kości', 'g', 4, 160, 19.0, 0.0, 9.0),
  ('Mięso mielone z szynki wieprzowej', 'g', 4, 150, 20.0, 0.0, 8.0),
  ('Mięso mielone wołowe', 'g', 4, 215, 20.0, 0.0, 15.0),
  ('Schab wieprzowy bez kości', 'g', 4, 130, 22.0, 0.0, 4.5),
  ('Polędwiczka wieprzowa', 'g', 4, 110, 21.0, 0.0, 2.5),
  ('Pierś z indyka', 'g', 4, 105, 24.0, 0.0, 1.0),
  ('Boczek wędzony parzony', 'g', 4, 380, 14.0, 1.0, 36.0),
  ('Kiełbasa śląska', 'g', 4, 230, 15.0, 1.0, 19.0),
  ('Kabanosy wieprzowe', 'g', 4, 480, 25.0, 2.0, 42.0),
  ('Parówki z szynki 95%', 'szt', 4, 260, 14.0, 1.5, 22.0),
  ('Szynka z piersi kurczaka plastry', 'g', 4, 95, 19.0, 1.0, 1.5),
  ('Łosoś świeży filet', 'g', 4, 200, 20.0, 0.0, 13.0),
  ('Dorsz atlantycki filet', 'g', 4, 80, 18.0, 0.0, 0.7),
  ('Tuńczyk w kawałkach w sosie własnym', 'szt', 4, 100, 24.0, 0.0, 0.5),
  ('Makrela wędzona', 'szt', 4, 240, 20.0, 0.0, 18.0),
  ('Krewetki królewskie blanszowane', 'g', 4, 85, 18.0, 1.0, 1.0),
  ('Paluszki rybne z fileta', 'g', 4, 190, 12.0, 18.0, 8.0),
  ('Śledzie w oleju z cebulką', 'g', 4, 280, 12.0, 2.0, 25.0),
  ('Wołowina na gulasz', 'g', 4, 140, 21.0, 0.0, 6.0),

  -- 5. Sypkie i Przyprawy
  ('Ryż basmati', 'g', 5, 350, 8.5, 77.0, 0.6),
  ('Ryż jaśminowy', 'g', 5, 350, 7.0, 79.0, 0.6),
  ('Kasza gryczana prażona', 'g', 5, 340, 12.5, 69.0, 3.0),
  ('Kasza jaglana', 'g', 5, 350, 10.5, 71.0, 3.0),
  ('Kasza bulgur', 'g', 5, 340, 12.0, 65.0, 1.5),
  ('Płatki owsiane górskie', 'g', 5, 370, 13.0, 63.0, 7.0),
  ('Makaron Spaghetti', 'g', 5, 350, 12.0, 72.0, 1.5),
  ('Makaron Penne', 'g', 5, 350, 12.0, 72.0, 1.5),
  ('Makaron Świderki', 'g', 5, 350, 12.0, 72.0, 1.5),
  ('Mąka pszenna typ 500', 'g', 5, 345, 10.0, 74.0, 1.0),
  ('Mąka pszenna pełnoziarnista', 'g', 5, 330, 12.0, 64.0, 2.0),
  ('Cukier biały', 'g', 5, 400, 0.0, 100.0, 0.0),
  ('Sól himalajska / kamienna', 'g', 5, 0, 0.0, 0.0, 0.0),
  ('Pieprz czarny mielony', 'g', 5, 250, 10.0, 40.0, 3.0),
  ('Papryka słodka mielona', 'g', 5, 280, 14.0, 35.0, 12.0),
  ('Oregano suszone', 'g', 5, 265, 9.0, 49.0, 4.0),
  ('Bazylia suszona', 'g', 5, 230, 23.0, 48.0, 4.0),
  ('Majeranek', 'g', 5, 270, 13.0, 60.0, 7.0),
  ('Cynamon mielony', 'g', 5, 247, 4.0, 80.0, 1.2),
  ('Proszek do pieczenia', 'szt', 5, 100, 0.0, 25.0, 0.0),
  ('Oliwa z oliwek Extra Virgin', 'ml', 5, 824, 0.0, 0.0, 92.0),
  ('Olej rzepakowy', 'ml', 5, 828, 0.0, 0.0, 92.0),
  ('Sos sojowy ciemny', 'ml', 5, 60, 9.0, 5.0, 0.0),
  ('Pomidory krojone w puszce', 'szt', 5, 22, 1.2, 3.5, 0.2),
  ('Przecier pomidorowy passata', 'ml', 5, 24, 1.3, 4.2, 0.2),
  ('Ketchup pikantny', 'g', 5, 110, 1.5, 25.0, 0.2),
  ('Musztarda sarepska', 'g', 5, 130, 5.5, 9.0, 7.5),
  ('Majonez dekoracyjny', 'g', 5, 680, 1.2, 2.5, 73.0),

  -- 6. Napoje
  ('Woda niegazowana 1.5L', 'szt', 6, 0, 0.0, 0.0, 0.0),
  ('Woda gazowana 1.5L', 'szt', 6, 0, 0.0, 0.0, 0.0),
  ('Kawa ziarnista 500g', 'szt', 6, 2, 0.1, 0.3, 0.1),
  ('Kawa mielona 250g', 'szt', 6, 2, 0.1, 0.3, 0.1),
  ('Kawa rozpuszczalna', 'szt', 6, 2, 0.1, 0.3, 0.1),
  ('Herbata czarna 50 torebek', 'szt', 6, 1, 0.0, 0.2, 0.0),
  ('Herbata zielona 20 torebek', 'szt', 6, 1, 0.0, 0.2, 0.0),
  ('Herbata miętowa', 'szt', 6, 1, 0.0, 0.2, 0.0),
  ('Sok pomarańczowy 100% 1L', 'ml', 6, 43, 0.7, 10.0, 0.1),
  ('Sok jabłkowy 100% 1L', 'ml', 6, 45, 0.1, 11.0, 0.1),
  ('Sok pomidorowy 100%', 'ml', 6, 18, 0.8, 3.5, 0.1),
  ('Napój Cola Zero 1.5L', 'szt', 6, 0.3, 0.0, 0.0, 0.0),
  ('Napój izotoniczny 750ml', 'szt', 6, 25, 0.0, 6.0, 0.0),
  ('Piwo bezalkoholowe 0.0%', 'szt', 6, 20, 0.3, 4.5, 0.0),
  ('Syrop malinowy do herbaty', 'ml', 6, 250, 0.0, 62.0, 0.0),
  ('Mleko kokosowe w puszce', 'ml', 6, 180, 1.5, 2.5, 18.0),
  ('Napój energetyczny bez cukru 250ml', 'szt', 6, 3, 0.0, 0.0, 0.0),

  -- 7. Chemia i Dom (Popularne produkty Ad-hoc)
  ('Papier toaletowy 8-pak', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Papier toaletowy 16-pak', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Ręcznik papierowy 2-pak', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Ręcznik papierowy mega rolka', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Płyn do mycia naczyń', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Tabletki do zmywarki All-in-1', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Sól do zmywarki', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Nabłyszczacz do zmywarki', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Kapsułki do prania uniwersalne', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Kapsułki do prania do kolorów', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Płyn do płukania tkanin', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Proszek do prania uniwersalny', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Worki na śmieci 35L', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Worki na śmieci 60L', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Worki na odpady BIO', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Folia aluminiowa', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Folia spożywcza', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Papier do pieczenia', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Torebki śniadaniowe', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Gąbki do zmywania naczyń', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Ścierki z mikrofibry', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Płyn do mycia szyb', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Płyn uniwersalny do podłóg', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Spray do czyszczenia łazienki', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Spray do odtłuszczania kuchni', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Zawieszka do WC kostka', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Płyn do toalet WC żel', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Rękawiczki jednorazowe M', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Odświeżacz powietrza spray', 'szt', 7, 0, 0.0, 0.0, 0.0),
  ('Środek do udrażniania rur Kret', 'szt', 7, 0, 0.0, 0.0, 0.0),

  -- 8. Inne (Higiena, Zwierzęta, Przekąski)
  ('Chusteczki higieniczne w pudełku', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Chusteczki nawilżane uniwersalne', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Mydło w płynie zapas 500ml', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Mydło w kostce', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Pasta do zębów 75ml', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Szczoteczka do zębów medium', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Płyn do płukania jamy ustnej 500ml', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Szampon do włosów 400ml', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Żel pod prysznic 500ml', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Dezodorant w sprayu 150ml', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Płatki kosmetyczne bawełniane', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Patyczki higieniczne', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Maszynki jednorazowe do golenia 3-pak', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Pianka / Żel do golenia', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Baterie alkaliczne AA 4-pak', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Baterie alkaliczne AAA 4-pak', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Karma mokra dla kota saszetki 4x', 'szt', 8, 85, 8.5, 1.0, 4.5),
  ('Karma sucha dla kota 1kg', 'szt', 8, 380, 32.0, 35.0, 14.0),
  ('Żwirek dla kota bentonitowy', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Karma dla psa puszka 400g', 'szt', 8, 95, 9.0, 2.0, 5.5),
  ('Karma sucha dla psa 2kg', 'szt', 8, 360, 24.0, 45.0, 12.0),
  ('Gryzak / Przysmak dla psa', 'szt', 8, 0, 0.0, 0.0, 0.0),
  ('Czekolada gorzka 70%', 'szt', 8, 560, 8.5, 35.0, 41.0),
  ('Czekolada mleczna', 'szt', 8, 535, 7.5, 58.0, 30.0),
  ('Chipsy solone', 'szt', 8, 530, 6.0, 52.0, 33.0),
  ('Orzechy włoskie łuskane', 'g', 8, 654, 15.0, 14.0, 65.0),
  ('Migdały prażone', 'g', 8, 580, 21.0, 20.0, 50.0)
) AS v(name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100)
WHERE NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE LOWER(p.name) = LOWER(v.name) 
  AND p.household_id IS NULL
);
