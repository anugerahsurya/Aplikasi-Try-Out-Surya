# Aplikasi-Try-Out-Surya

NavyTryout — Platform ujian dan Try Out digital modern berbasis **Next.js 15**, **Supabase**, dan **Nodemailer (SMTP)**.

## Fitur Utama

- **Autentikasi & Profil**: Login peserta dan administrator dengan role-based redirect dan reset password.
- **Sistem Penilaian Ganda**:
  - Model `correctness`: Skor kustom Benar (+4/+5), Salah (-1/0), Kosong (0).
  - Model `option_value`: Poin berjenjang tepat integer 1 sampai 5 untuk 5 opsi (A–E) tipe TKP/Psikotes.
- **Mesin Ujian Tahan Gangguan Jaringan (Offline-Resilient)**:
  - Timer otoritatif server (tersinkronisasi `deadline_at`).
  - Autosave debounce + antrean cadangan IndexedDB lokal saat offline.
  - Palette navigasi nomor soal dengan penanda ragu-ragu dan status jawaban.
- **Deteksi Anti-Kecurangan**:
  - Pemantauan mode Fullscreen.
  - Pemantauan perpindahan tab/jendela (`visibilitychange` & `window.blur`).
  - Pencegahan klik kanan, copy, paste, dan shortcut terlarang.
  - Auto-submit jika batas toleransi pelanggaran tercapai.
- **Panel Admin Lengkap**:
  - Dashboard statistik operasional dan pemantau attempt live.
  - Manajemen ujian, pengaturan durasi, pengacakan nomor soal/opsi, dan kebijakan keamanan.
  - Builder butir soal interaktif.
  - Manajemen peserta, penugasan ujian, dan pengiriman kredensial via SMTP.
  - Audit log timeline keamanan per peserta.
- **Desain Modern**:
  - Desain minimalis Figma 2-kolom.
  - Dukungan penuh **Light Mode & Dark Mode**.
  - Densitas tampilan optimal 80% untuk kenyamanan laptop/desktop.

## Menjalankan Proyek

1. Salin konfigurasi environment:
   ```bash
   cp .env.example .env.local
   ```
2. Isi variabel Supabase dan SMTP di `.env.local`.
3. Install dependensi:
   ```bash
   npm install
   ```
4. Jalankan server lokal:
   ```bash
   npm run dev
   ```
