-- Script para limpar a Lista de Documentos (Manifesto)
-- Copie e rode no Editor SQL do Supabase

-- Opção 1: Limpar TUDO (Cuidado!)
-- TRUNCATE TABLE manifest_items CASCADE;

-- Opção 2: Limpar apenas do contrato de teste (Recomendado)
DELETE FROM manifest_items 
WHERE contract_id = '00000000-0000-0000-0000-000000000002';

-- Opcional: Resetar sequências se houver (mas usamos UUID, então não precisa)
