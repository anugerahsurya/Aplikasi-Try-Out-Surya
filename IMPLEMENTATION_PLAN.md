# Implementation Plan — Aplikasi Try Out

Dokumen ini adalah spesifikasi implementasi untuk aplikasi Try Out berbasis **Next.js (frontend + backend/BFF)**, **Supabase (Postgres, Auth, Storage, Realtime)**, dan **Vercel (deployment)**. Seluruh keputusan di bawah ditujukan agar tim atau AI lain dapat membangun aplikasi tanpa perlu menebak kebutuhan inti.

## 1. Tujuan dan ruang lingkup

Membangun web Try Out yang minimalis, elegan, bernuansa **navy**, responsif untuk desktop dan ponsel, dengan kemampuan:

- Login dan manajemen profil peserta.
- Admin membuat, mengubah, menerbitkan, dan mengelola banyak ujian.
- Ujian pilihan ganda dengan dua model penilaian per soal:
  1. **Skor jawaban benar/salah/kosong yang dapat dikustom**, misalnya benar `+4`, salah `-1`, kosong `0`.
  2. **Skor per opsi**, masing-masing opsi A–E memiliki nilai sendiri, misalnya A=`1`, B=`2`, C=`5`, D=`3`, E=`4`.
- Waktu ujian, autosave jawaban, dan pemulihan sesi jika koneksi putus atau peserta logout/tutup browser.
- Pencatatan sinyal anti-kecurangan yang dapat dilakukan browser, audit log, serta kebijakan tindakan.
- Pengiriman kredensial akun ke email peserta setelah SMTP dikonfigurasi.

Tidak termasuk pada fase awal: proctoring webcam, OCR, pembayaran, aplikasi native, dan pemblokiran tingkat sistem operasi.

## 2. Batasan penting anti-kecurangan (harus disepakati)

Browser web **tidak dapat** memblokir screenshot sistem operasi, mengidentifikasi isi tab/aplikasi lain, atau mengetahui “website apa saja yang dibuka” di luar halaman Try Out. Ini adalah pembatasan keamanan browser dan privasi pengguna.

Yang realistis untuk aplikasi web biasa:

- Menonaktifkan context menu, copy/cut/paste, drag, pemilihan teks, dan shortcut umum (`Ctrl/Cmd+C`, `V`, `X`, `P`, `S`) di halaman ujian.
- Meminta dan memantau mode fullscreen; mencatat jika pengguna keluar fullscreen.
- Mencatat `visibilitychange`, `blur/focus`, kehilangan fokus jendela, shortcut terlarang, paste attempt, context-menu attempt, dan perubahan konektivitas.
- Menampilkan peringatan atau otomatis mengakhiri ujian setelah ambang pelanggaran yang ditetapkan admin.

Sinyal tersebut hanya indikator, bukan bukti pasti kecurangan. Untuk benar-benar membatasi tab/aplikasi/screenshot, gunakan lingkungan terkelola seperti **Safe Exam Browser/kiosk mode**, perangkat MDM, atau ekstensi browser yang dipasang dan disetujui institusi. Jangan mengklaim bahwa aplikasi web biasa dapat melacak semua situs yang dibuka pengguna.

## 3. Stack dan konvensi teknis

| Area | Pilihan |
| --- | --- |
| Framework | Next.js versi stabil terbaru, App Router, TypeScript strict |
| UI | Tailwind CSS, komponen aksesibel (mis. shadcn/ui), Lucide icons |
| Font | `Plus Jakarta Sans` dari `next/font/google`; fallback `Arial, sans-serif` |
| Backend | Next.js Route Handlers dan Server Actions untuk operasi terautentikasi |
| Database/Auth | Supabase Postgres + Supabase Auth + Row Level Security (RLS) |
| File | Supabase Storage (opsional: lampiran/gambar soal) |
| Deployment | Vercel, Supabase project terpisah dev/staging/production bila memungkinkan |
| Validasi | Zod untuk seluruh payload server/API |
| Form | React Hook Form + Zod resolver |
| Test | Vitest (unit), Playwright (E2E), Supabase migration tests bila tersedia |

Gunakan `@supabase/ssr` untuk client server/browser, bukan pola auth lama. Service-role key hanya boleh berada di server/Route Handler dan tidak pernah dikirim ke browser.

## 4. Peran pengguna dan akses

| Peran | Hak utama |
| --- | --- |
| `super_admin` | Semua hak, admin dan konfigurasi global |
| `admin` | Kelola ujian, bank soal, peserta yang ditugaskan, hasil, audit |
| `participant` | Profil sendiri, ujian yang ditugaskan, hasil yang diizinkan |

Simpan peran pada tabel `profiles` dan jadikan RLS sebagai lapisan otorisasi utama. Middleware hanya untuk UX/redirect; jangan mengandalkan middleware sebagai kontrol akses data.

## 5. Arsitektur aplikasi

```
Browser (Next.js React)
  ├─ Supabase Auth session (cookie berbasis SSR)
  ├─ Quiz runner: state lokal + IndexedDB outbox
  └─ API/Server Actions Next.js
       ├─ validasi Zod + pemeriksaan role
       ├─ operasi privileged (invite/reset/kirim email)
       └─ Supabase Postgres/Auth/Storage

Vercel: Next.js web + Route Handlers
Supabase: Auth, PostgreSQL dengan RLS, Realtime, Storage
```

Semua mutasi yang penting (mulai ujian, simpan jawaban, submit, scoring, log pelanggaran) harus tervalidasi di server/database. Skor akhir tidak boleh dipercaya dari kalkulasi browser.

## 6. Struktur proyek yang disarankan

```
src/
  app/
    (public)/login/page.tsx
    (participant)/dashboard/page.tsx
    (participant)/tryout/[attemptId]/page.tsx
    (participant)/profile/page.tsx
    (admin)/admin/dashboard/page.tsx
    (admin)/admin/exams/page.tsx
    (admin)/admin/exams/[examId]/page.tsx
    (admin)/admin/questions/page.tsx
    (admin)/admin/participants/page.tsx
    api/
      attempts/[attemptId]/answers/route.ts
      attempts/[attemptId]/events/route.ts
      attempts/[attemptId]/submit/route.ts
      admin/users/provision/route.ts
      admin/users/[id]/send-credentials/route.ts
  components/
    ui/  quiz/  admin/  layout/
  lib/
    supabase/  auth/  scoring/  validations/  email/
  hooks/
  types/
supabase/
  migrations/
  seed.sql
middleware.ts
```

Pisahkan komponen server dan client. `QuizRunner` menjadi client component karena timer, event browser, IndexedDB, dan autosave; data awal serta otorisasi tetap dimuat di server.

## 7. Model data dan migrasi Supabase

Gunakan UUID, `timestamptz`, dan semua tabel mempunyai `created_at`, `updated_at` bila relevan. Tambahkan trigger `set_updated_at()`.

### Tabel inti

| Tabel | Kolom penting | Catatan |
| --- | --- | --- |
| `profiles` | `id` FK `auth.users`, `full_name`, `email`, `role`, `avatar_path`, `phone`, `institution` | Satu profil per akun |
| `exams` | `id`, `title`, `slug`, `description`, `duration_minutes`, `start_at`, `end_at`, `status`, `instructions`, `shuffle_questions`, `shuffle_options`, `security_policy`, `result_release_at` | `status`: draft/published/archived |
| `exam_sections` | `id`, `exam_id`, `title`, `position`, `instructions` | Opsional, untuk kelompok soal |
| `questions` | `id`, `exam_id`, `section_id`, `position`, `stem`, `media_path`, `scoring_mode`, `correct_option_id`, `correct_score`, `incorrect_score`, `blank_score`, `explanation`, `is_active` | `scoring_mode`: `correctness` atau `option_value` |
| `question_options` | `id`, `question_id`, `label`, `content`, `position`, `is_correct`, `score_value` | `score_value` wajib untuk `option_value`; 1–5 sesuai kebutuhan awal tetapi desain bertipe numeric agar fleksibel |
| `exam_assignments` | `id`, `exam_id`, `user_id`, `assigned_at`, `attempt_limit`, `extra_time_minutes`, `status` | Menentukan siapa boleh mengerjakan |
| `attempts` | `id`, `exam_id`, `user_id`, `assignment_id`, `status`, `started_at`, `deadline_at`, `submitted_at`, `last_seen_at`, `score`, `max_score`, `security_status`, `violation_count` | Satu attempt aktif per peserta/ujian |
| `attempt_answers` | `attempt_id`, `question_id`, `selected_option_id`, `answered_at`, `client_updated_at`, `server_updated_at` | Unique `(attempt_id, question_id)` |
| `attempt_events` | `id`, `attempt_id`, `event_type`, `occurred_at`, `metadata` JSONB | Audit anti-kecurangan dan koneksi |
| `email_outbox` | `id`, `recipient`, `template`, `payload`, `status`, `attempts`, `last_error`, `sent_at` | Antrean email dan retry |

Tambahkan `exam_question_snapshots` dan `attempt_question_order` pada fase produksi agar isi/urutan soal yang dikerjakan tidak berubah ketika admin menyunting soal setelah ujian dimulai. Snapshot harus menyimpan stem, opsi, mode skor, dan aturan skor saat attempt dibuat.

### Integritas dan indeks

- Constraint: opsi hanya dapat dipilih jika berasal dari question snapshot yang sama dengan `question_id` attempt.
- Constraint/database trigger: `attempt_answers` hanya dapat diubah saat status attempt `in_progress` dan waktu server belum melewati `deadline_at`.
- Index untuk `attempts(user_id, exam_id)`, `attempt_answers(attempt_id)`, `attempt_events(attempt_id, occurred_at DESC)`, dan `exam_assignments(user_id, exam_id)`.
- Function SQL/RPC transaksional `start_or_resume_attempt(exam_id)` dan `submit_attempt(attempt_id)` untuk menghindari race condition.

### Kebijakan RLS

- Peserta dapat membaca `profiles` miliknya sendiri, assignment miliknya, exam yang assigned dan published, attempt miliknya, serta jawaban/event miliknya sendiri.
- Peserta tidak dapat membaca `is_correct`, `correct_option_id`, `score_value`, explanation, atau hasil yang belum dirilis. Buat view/RPC data ujian peserta yang menyaring kolom rahasia.
- Peserta hanya dapat membuat/ubah answer miliknya sendiri melalui RPC/Route Handler dengan validasi deadline.
- Admin hanya mengakses entitas ujian yang menjadi kewenangannya; `super_admin` akses penuh.
- Tabel `email_outbox`, snapshot jawaban lengkap, dan operasi Auth hanya dapat diakses service role/server.

## 8. Aturan penilaian

Setiap soal menyimpan `scoring_mode`; satu ujian boleh mencampur kedua model.

1. `correctness`
   - Jika kosong: tambah `blank_score`.
   - Jika opsi pilihan `is_correct=true`: tambah `correct_score`.
   - Selain itu: tambah `incorrect_score`.
   - Contoh: benar `+4`, salah `-1`, kosong `0`.

2. `option_value`
   - Jika peserta memilih opsi: tambah `question_options.score_value` untuk opsi itu.
   - Jika kosong: tambah `blank_score` (default `0`).
   - Contoh nilai opsi A–E: `1, 2, 5, 3, 4`.

Implementasikan fungsi murni TypeScript `calculateScore(snapshot, answers)` untuk preview/admin dan fungsi SQL/RPC atau Route Handler server yang setara sebagai sumber skor final. Buat unit test untuk skor negatif, kosong, opsi tak valid, kombinasi mode, dan submit idempoten.

## 9. Alur ujian, timer, dan ketahanan jaringan

1. Peserta membuka detail ujian dan memilih **Mulai/Lanjutkan**.
2. Server memvalidasi login, assignment, periode ujian, limit attempt, dan membuat atau mengembalikan attempt aktif melalui transaksi.
3. Saat attempt pertama dibuat, server menetapkan `started_at` dan `deadline_at = started_at + duration + extra_time`; waktu ini tidak berasal dari client.
4. UI menghitung countdown dari `deadline_at` server. Pada reconnect/refresh, selalu sinkronkan ulang dari server.
5. Setiap perubahan jawaban segera masuk antrean IndexedDB dengan `client_updated_at`; kirim secara debounce (±500–1.000 ms), serta paksa flush pada pindah soal, `visibilitychange`, `pagehide`, dan submit.
6. API menerima upsert idempoten. Server memakai waktu server dan menolak answer terlambat; jika beberapa update tiba berurutan, gunakan revisi/timestamp untuk mencegah data lama menimpa data baru.
7. Bila offline atau request gagal, jawaban tetap di IndexedDB dan indikator UI berubah menjadi “Tersimpan di perangkat—menunggu koneksi”. Ketika kembali online, outbox dikirim ulang dengan retry exponential backoff.
8. Logout akibat gangguan jaringan, refresh, atau browser ditutup tidak menghapus attempt. Setelah login kembali, dashboard menawarkan **Lanjutkan ujian** dengan jawaban dan sisa waktu berdasarkan `deadline_at` server.
9. Ketika deadline tercapai, server menandai attempt selesai dan menghitung skor. Client menampilkan halaman submit/expired; semua request jawaban setelahnya ditolak.
10. Tombol submit meminta konfirmasi, mem-flush outbox, lalu memanggil submit transaksional. Jika koneksi gagal saat submit, tampilkan status pemulihan dan jangan membuat attempt baru.

Gunakan `navigator.sendBeacon` hanya sebagai best effort untuk event audit; jangan jadikan satu-satunya metode menyimpan jawaban.

## 10. Anti-kecurangan dan audit

`security_policy` per ujian menyimpan konfigurasi: `require_fullscreen`, `warn_after_violations`, `auto_submit_after_violations`, `disable_clipboard`, `disable_context_menu`, `log_focus_loss`, dan `log_connectivity`.

Di `QuizRunner`, aktifkan listener hanya ketika attempt aktif:

- `visibilitychange`, `window.blur`, `window.focus` → log `tab_hidden`, `window_blur`, `window_focus`.
- Fullscreen API (`fullscreenchange`) → log `fullscreen_exit`; tombol untuk masuk fullscreen kembali.
- `copy`, `cut`, `paste`, `contextmenu`, `dragstart`, `selectstart`, serta shortcut keyboard → cegah bila policy aktif dan log event.
- `online`/`offline` → log perubahan koneksi dan tampilkan status sinkronisasi.
- Screenshot: **tidak bisa dicegah atau dideteksi dengan andal**. Nonaktifkan PrintScreen secara UI tidak memberikan jaminan dan tidak boleh dijadikan kontrol keamanan.

Event dikirim ke endpoint terautentikasi dengan metadata minimal: tipe, timestamp client, timestamp server, info fullscreen/visibility, dan platform umum; jangan menyimpan riwayat situs, isi clipboard, ketikan, atau data pribadi berlebihan. Admin melihat timeline event, jumlah pelanggaran, dan tindakan (beri peringatan/tandai/disubmit) yang transparan.

## 11. Autentikasi, profil, dan provisioning akun

### Login

- Halaman `/login` memakai email dan password; reset password memakai alur Supabase Auth.
- Setelah login, redirect berdasar role ke `/dashboard` atau `/admin/dashboard`.
- Middleware memperbarui session cookie dan melindungi route; Route Handler tetap mengecek user/role sendiri.
- Konfigurasikan redirect URL Supabase untuk domain lokal, preview Vercel, dan produksi.

### Edit profil

Halaman `/profile` memungkinkan peserta/admin mengubah nama lengkap, nomor telepon, institusi, dan foto profil. Validasi ukuran/tipe avatar, simpan file di Storage path milik user, dan buat storage policy yang hanya membolehkan pemilik upload/read objeknya (atau gunakan signed URL bila avatar privat).

### Pembuatan akun dan email kredensial

- Admin membuat/import peserta dengan nama dan email melalui endpoint server; server membuat user Supabase dengan password sementara yang dihasilkan aman.
- Jangan menyimpan password plaintext di database atau email outbox. Simpan hanya status provisioning dan gunakan token reset-password sekali pakai sebagai pilihan yang lebih aman.
- Untuk memenuhi kebutuhan pengiriman email/password, buat adapter `EmailProvider` dengan implementasi `SmtpEmailProvider` (Nodemailer) yang membaca `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, dan `SMTP_SECURE` dari environment variables. Fitur tetap disabled jika variable belum lengkap.
- Endpoint mengisi `email_outbox`; worker/cron terautentikasi memproses antrean dan retry. Pada Vercel, jadwalkan endpoint `/api/internal/email-dispatch` memakai Vercel Cron dan secret `CRON_SECRET`.
- Sebelum SMTP siap, admin masih dapat membuat akun dan menyalin tautan reset password/manual onboarding. UI harus menampilkan “SMTP belum dikonfigurasi”, bukan error samar.

## 12. Halaman dan kebutuhan UX/UI

### Arah visual

- Gunakan `Plus Jakarta Sans` di root layout.
- Palet utama: navy gelap sebagai background/brand (`#0B1F3A` contoh), navy medium untuk surface, putih/off-white untuk konten, aksen navy terang; gunakan warna status seperlunya dengan kontras WCAG AA.
- Minimalis: banyak ruang kosong, border halus, radius konsisten, satu aksen utama, tanpa gradient berlebihan.
- Tetapkan `--ui-scale: 0.9` untuk komponen desktop bila “view 90%” berarti ukuran antarmuka yang lebih padat. **Jangan mencoba memaksa zoom browser 90%** karena browser tidak mengizinkannya secara konsisten dan mengganggu aksesibilitas. Hormati pengaturan zoom/font pengguna.

### Route peserta

| Route | Isi |
| --- | --- |
| `/login`, `/forgot-password`, `/reset-password` | Autentikasi dan pemulihan akun |
| `/dashboard` | Sapaan, ujian mendatang/aktif/selesai, CTA lanjutkan |
| `/exams/[slug]` | Detail, instruksi, durasi, aturan, CTA mulai |
| `/tryout/[attemptId]` | Timer, indikator sync, nomor soal, stem, opsi, navigasi, status jawaban, submit |
| `/results/[attemptId]` | Skor/status jika sudah dirilis |
| `/profile` | Edit profil/avatar |

### Route admin

| Route | Isi |
| --- | --- |
| `/admin/dashboard` | Ringkasan ujian, peserta aktif, pelanggaran terbaru |
| `/admin/exams` | List/filter/buat ujian |
| `/admin/exams/[id]` | Metadata, assignment, section, publish, security policy, hasil |
| `/admin/exams/[id]/questions` | Builder soal/opsi dan pengaturan skor per soal |
| `/admin/participants` | Buat/import peserta, assign ujian, kirim onboarding email |
| `/admin/attempts/[id]` | Detail attempt, jawaban, event/security timeline |

### Tampilan mobile

- Semua halaman dirancang mobile-first; target lebar 320 px hingga desktop besar, tanpa horizontal scroll.
- Quiz: header ringkas sticky (timer + status sync), soal mudah dibaca, opsi memiliki target sentuh minimum 44×44 px, tombol sebelumnya/berikutnya sticky di bawah.
- Pada ponsel, gunakan **bottom navigation bergaya floating toast/pill**: posisi fixed di atas safe-area, surface navy, shadow halus, ikon + label untuk Dashboard, Ujian, Profil (dan Admin bila berhak). Jangan tampilkan di layar ujian aktif agar tidak mengganggu fokus; tampilkan navigasi aksi ujian khusus.
- Gunakan `env(safe-area-inset-bottom)`, `aria-current`, label ikon, fokus keyboard, reduced motion, dan kontras cukup.

## 13. API/Server Actions minimum

| Operasi | Mekanisme | Aturan |
| --- | --- | --- |
| Mulai/lajutkan attempt | Server Action/RPC | Idempoten; buat snapshot + deadline server |
| Simpan jawaban | `PUT /api/attempts/:id/answers` | Batched upsert, auth ownership, deadline check |
| Log event keamanan | `POST /api/attempts/:id/events` | Rate limit dan metadata allowlist |
| Submit | `POST /api/attempts/:id/submit` | Transaksi, scoring server, idempoten |
| CRUD ujian/soal | Server Actions admin | Zod + role + RLS |
| Provision peserta | Route Handler admin | service role hanya server |
| Kirim kredensial | Route Handler admin + outbox | SMTP configured check |

Terapkan rate limiting untuk login-adjacent API, events, dan endpoint admin. Tambahkan audit log untuk perubahan soal, publish/unpublish, assignment, dan perubahan hasil.

## 14. Konfigurasi environment

Masukkan contoh tanpa nilai rahasia ke `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_SECURE=false
CRON_SECRET=
```

Tambahkan variable tersebut di Vercel untuk Production/Preview sesuai kebutuhan. Jangan commit `.env.local`, service-role key, password SMTP, atau credentials lain.

## 15. Tahapan implementasi

1. **Fondasi proyek** — Inisialisasi Next.js TypeScript, Tailwind, font, theme navy, lint/format, Supabase SSR clients, auth middleware, layout responsif, dan `.env.example`.
2. **Database dan keamanan** — Buat seluruh migration, enum, trigger, RPC, index, RLS policies, storage policy; seed satu admin, peserta, ujian, dan kedua tipe soal.
3. **Auth dan profil** — Implementasi login/reset password, role redirect, halaman profile/avatar, serta guard server.
4. **Admin exam builder** — CRUD ujian/section/soal/opsi, validasi mode skor, draft/publish, assignment, dan import peserta dasar.
5. **Mesin Try Out** — Snapshot, start/resume, randomisasi yang disimpan, UI runner, navigation palette, timer berotoritas server, autosave API dan IndexedDB offline outbox.
6. **Submit dan hasil** — Submit idempoten, scoring server, halaman hasil sesuai jadwal rilis, laporan admin/export CSV bila diperlukan.
7. **Anti-kecurangan** — Security policy, event listener, warning modal, timeline admin, ambang auto-submit, dan privacy notice.
8. **Email onboarding** — Email adapter, outbox, cron retry, halaman status SMTP, dan fallback reset-password link.
9. **Polish mobile dan aksesibilitas** — Floating bottom nav, keyboard navigation, safe area, loading/error/empty states, visual QA pada 320/375/768/1024/1440 px.
10. **Quality dan deployment** — Test, observability, migration produksi, Vercel deployment, konfigurasi auth redirect, smoke test.

## 16. Definition of done dan verifikasi

### Tes wajib

- Unit: semua aturan scoring, perhitungan deadline, state sync/outbox, validasi payload.
- Integration: RLS menolak akses attempt/jawaban pengguna lain; peserta tidak dapat mengambil jawaban benar/skor rahasia; admin tidak sah ditolak.
- E2E Playwright: login, edit profile, admin publish/assign exam, peserta mulai, answer autosave, refresh/resume, offline lalu online sync, deadline expiry, submit, result release, event security tercatat.
- Manual: Chrome/Edge/Safari modern dan Chrome Android/Safari iOS; desktop 90%-style UI; layar kecil; keyboard-only; screen reader sanity check.
- Security: pastikan browser network response tidak mengandung answer key untuk attempt aktif, service role tidak terekspos, rate limit aktif, dan SMTP credentials tidak ada di bundle/log.

### Kriteria penerimaan

- Admin dapat membuat beberapa ujian dan mencampur soal model `correctness` serta `option_value` dalam ujian yang sama.
- Peserta yang kehilangan koneksi/refresh/logout dapat melanjutkan attempt yang sama; jawaban yang sebelumnya tersinkron maupun yang tersimpan di perangkat dipulihkan, dan sisa waktu tetap mengikuti server.
- Perubahan jawaban tidak dapat dilakukan setelah deadline/submit; skor dihitung di server.
- Pelanggaran fokus/fullscreen/clipboard yang didukung browser tercatat dan mematuhi policy ujian.
- UI navy, Plus Jakarta Sans, minimalis, dan seluruh route fungsional pada ponsel; bottom nav floating tampil pada halaman peserta non-ujian.
- Email provisioning siap diaktifkan cukup dengan mengisi environment SMTP, dengan fallback aman saat SMTP belum tersedia.

## 17. Keputusan yang perlu dikonfirmasi sebelum produksi

- Apakah skor opsi `1–5` berarti tepat integer 1 sampai 5, atau rentang nilai bebas termasuk desimal/negatif? Rancangan database mendukung keduanya, tetapi UI dapat dibatasi sesuai kebijakan.
- Definisikan ambang pelanggaran dan tindakan per ujian (hanya warning, flag untuk review, atau auto-submit).
- Tentukan apakah peserta boleh melihat skor, pembahasan, dan jawaban benar; serta kapan hasil dirilis.
- Pilih penyedia SMTP dan alamat pengirim sebelum mengaktifkan dispatch email.
- Jika pemantauan situs lain/screenshot benar-benar wajib, pilih solusi perangkat terkelola atau integrasi proctoring yang memiliki dasar persetujuan dan kebijakan privasi.
