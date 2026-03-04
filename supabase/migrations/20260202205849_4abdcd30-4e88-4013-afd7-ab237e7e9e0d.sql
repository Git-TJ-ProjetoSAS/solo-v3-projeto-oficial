-- Adicionar coluna de Carbono Orgânico à tabela de insumos
ALTER TABLE public.insumos 
ADD COLUMN carbono_organico numeric NOT NULL DEFAULT 0;