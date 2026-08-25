-- =========================================================
-- SEED DATA & PANDUAN AKUN ADMIN NAVYTRYOUT
-- =========================================================

-- PANDUAN MEMBUAT AKUN ADMIN:
-- Cara 1 (Paling Mudah via Supabase Dashboard):
-- 1. Buka Supabase Dashboard > Authentication > Users > Klik "Add User" > "Create User".
-- 2. Masukkan Email: admin@tryout.app dan Password: password123 (atau email & password Anda).
-- 3. Buka menu SQL Editor di Supabase, lalu jalankan query di bawah ini:

UPDATE public.profiles
SET role = 'super_admin', full_name = 'Super Administrator'
WHERE email = 'admin@tryout.app';

-- =========================================================
-- Contoh Ujian Default: Try Out SKD / Kedinasan 2026
-- =========================================================
INSERT INTO public.exams (
  id, title, slug, description, instructions, duration_minutes, status, shuffle_questions, shuffle_options, security_policy
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Try Out SKD & Psikotes Kedinasan 2026',
  'skd-psikotes-kedinasan-2026',
  'Simulasi ujian terpadu Tes Wawasan Kebangsaan (TWK), Tes Intelegensia Umum (TIU), dan Tes Karakteristik Pribadi (TKP).',
  'Pilihlah salah satu jawaban yang paling tepat. TWK/TIU dinilai benar (+5), salah (0). TKP dinilai berjenjang nilai 1 sampai 5 untuk setiap opsi A-E.',
  90,
  'published',
  false,
  false,
  '{"require_fullscreen":true,"disable_clipboard":true,"log_focus_loss":true,"log_connectivity":true,"warn_after_violations":2,"auto_submit_after_violations":5}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Section 1: TWK
INSERT INTO public.exam_sections (id, exam_id, title, instructions, position)
VALUES ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Tes Wawasan Kebangsaan (TWK)', 'Kerjakan soal TWK dengan teliti.', 1)
ON CONFLICT DO NOTHING;

-- Section 2: TKP (Option Value 1-5)
INSERT INTO public.exam_sections (id, exam_id, title, instructions, position)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Tes Karakteristik Pribadi (TKP)', 'Pilihlah opsi yang paling mencerminkan integritas dan profesionalitas.', 2)
ON CONFLICT DO NOTHING;

-- Soal 1: TWK (Model correctness: +5, 0, 0)
INSERT INTO public.questions (
  id, exam_id, section_id, position, stem, scoring_mode, correct_score, incorrect_score, blank_score, explanation
) VALUES (
  '33333333-3333-3333-3333-333333333301',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  1,
  'Lembaga negara yang berwenang memutus sengketa kewenangan lembaga negara yang kewenangannya diberikan oleh Undang-Undang Dasar adalah...',
  'correctness',
  5,
  0,
  0,
  'Sesuai Pasal 24C UUD 1945, Mahkamah Konstitusi berwenang mengadili pada tingkat pertama dan terakhir yang putusannya bersifat final untuk memutus sengketa kewenangan lembaga negara yang kewenangannya diberikan oleh UUD.'
) ON CONFLICT DO NOTHING;

INSERT INTO public.question_options (question_id, label, content, position, is_correct) VALUES
('33333333-3333-3333-3333-333333333301', 'A', 'Mahkamah Agung', 1, false),
('33333333-3333-3333-3333-333333333301', 'B', 'Mahkamah Konstitusi', 2, true),
('33333333-3333-3333-3333-333333333301', 'C', 'Komisi Yudisial', 3, false),
('33333333-3333-3333-3333-333333333301', 'D', 'Dewan Perwakilan Rakyat', 4, false),
('33333333-3333-3333-3333-333333333301', 'E', 'Badan Pemeriksa Keuangan', 5, false)
ON CONFLICT DO NOTHING;

-- Soal 2: TKP (Model option_value: nilai tepat integer 1 sampai 5)
INSERT INTO public.questions (
  id, exam_id, section_id, position, stem, scoring_mode, correct_score, incorrect_score, blank_score, explanation
) VALUES (
  '33333333-3333-3333-3333-333333333302',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  2,
  'Saat Anda sedang menyelesaikan laporan mendesak yang harus diserahkan sore ini, rekan kerja satu tim tiba-tiba meminta bantuan menyelesaikan tugasnya karena ia kurang paham. Sikap Anda adalah...',
  'option_value',
  0,
  0,
  0,
  'Nilai tertinggi diberikan pada sikap yang mampu mengelola prioritas pribadi tanpa mengabaikan rekan kerja (membantu setelah tugas utama selesai atau memberi panduan singkat).'
) ON CONFLICT DO NOTHING;

INSERT INTO public.question_options (question_id, label, content, position, is_correct, score_value) VALUES
('33333333-3333-3333-3333-333333333302', 'A', 'Menolak secara tegas karena pekerjaan saya jauh lebih penting.', 1, false, 1),
('33333333-3333-3333-3333-333333333302', 'B', 'Meninggalkan tugas saya sementara demi membantu rekan tim tersebut.', 2, false, 2),
('33333333-3333-3333-3333-333333333302', 'C', 'Menyuruh rekan lain yang terlihat santai untuk membantunya.', 3, false, 3),
('33333333-3333-3333-3333-333333333302', 'D', 'Memberikan petunjuk pokok cara penyelesaiannya secara ringkas lalu fokus menyelesaikan tugas saya.', 4, false, 4),
('33333333-3333-3333-3333-333333333302', 'E', 'Fokus menuntaskan laporan saya terlebih dahulu, kemudian langsung membantunya hingga selesai.', 5, false, 5)
ON CONFLICT DO NOTHING;
