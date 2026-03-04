-- Add planting date fields to talhoes table
ALTER TABLE public.talhoes 
ADD COLUMN planting_month integer NOT NULL DEFAULT 1,
ADD COLUMN planting_year integer NOT NULL DEFAULT 2025;

-- Add constraint for valid month values
ALTER TABLE public.talhoes 
ADD CONSTRAINT valid_planting_month CHECK (planting_month >= 1 AND planting_month <= 12);

-- Add constraint for valid year values  
ALTER TABLE public.talhoes 
ADD CONSTRAINT valid_planting_year CHECK (planting_year >= 2000 AND planting_year <= 2100);