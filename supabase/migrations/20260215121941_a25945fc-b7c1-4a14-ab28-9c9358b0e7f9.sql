
ALTER TABLE public.talhoes
ADD COLUMN irrigated boolean NOT NULL DEFAULT false,
ADD COLUMN irrigation_system text NOT NULL DEFAULT 'gotejamento';
