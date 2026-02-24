-- ==========================================
-- CONFIGURAÇÃO DE STORAGE (BUCKETS)
-- ==========================================
-- Execute este script no SQL Editor do Supabase para criar os buckets e políticas.

-- 1. CRIAR BUCKETS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('employees', 'employees', false)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICAS PARA 'LOGOS' (Público para leitura, restrito para escrita)
CREATE POLICY "Logos are public" ON storage.objects
    FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own logos" ON storage.objects
    FOR UPDATE WITH CHECK (bucket_id = 'logos' AND auth.uid() = owner);

-- 3. POLÍTICAS PARA 'EMPLOYEES' (Privado para leitura e escrita)
CREATE POLICY "Authenticated users can read employee photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'employees' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload employee photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'employees' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own employee photos" ON storage.objects
    FOR UPDATE WITH CHECK (bucket_id = 'employees' AND auth.uid() = owner);
