-- Add geojson column to store polygon data for each talhão
ALTER TABLE public.talhoes ADD COLUMN geojson jsonb DEFAULT NULL;

-- Add center coordinates for quick map centering
ALTER TABLE public.talhoes ADD COLUMN center_lat numeric DEFAULT NULL;
ALTER TABLE public.talhoes ADD COLUMN center_lng numeric DEFAULT NULL;