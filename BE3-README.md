# BE-3 — Dokumentasi Endpoint (Satisfaction Rating, SLA, Notifikasi, Cron Job)

Dikerjakan oleh: Syifa (BE-3)
Stack: NestJS + Prisma + PostgreSQL

## 1. SLA (Service Level Agreement)

### GET /api/v1/tickets/:id/sla
- **Auth:** Wajib login
- **Fungsi:** Menghitung sisa waktu SLA tiket berdasarkan prioritas.
- **Response:** `target_response`, `target_resolution`, `sisa_waktu`, `status_sla`

## 2. Satisfaction Rating (Rating Kepuasan)

### POST /api/v1/tickets/:id/satisfaction
- **Auth:** Tidak perlu login
- **Fungsi:** Pelapor mengisi rating setelah tiket ditutup (biasanya dari tombol "Puas"/"Belum puas" di FE-1 — kalau "Belum puas", itu memicu reopen).
- **Request:** `rating` (1-5), `comment` (opsional)
- **Response:** ticket terbaru

## 3. Email Notifikasi Otomatis

Sistem mengirim email otomatis di 3 skenario:
1. **Saat tiket dibuat** — email dikirim ke pelapor sebagai konfirmasi.
2. **Saat status tiket berubah** — email dikirim ke pelapor (misal jadi in_progress, resolved, dll).
3. **Saat ada tiket baru/eskalasi masuk ke tier tertentu** — email dikirim ke agen di tier tersebut.

Trigger: otomatis dari backend, tidak perlu dipanggil manual dari frontend.

## 4. Cron Job SLA

- Job berjalan otomatis secara berkala untuk mengecek tiket yang SLA-nya sudah terlampaui (breached).
- Field terkait: `slaBreached` pada tabel tiket — otomatis di-reset ke `false` saat tiket berstatus `resolved` atau `closed`.

## Catatan
- Koneksi database saat ini masih pakai PostgreSQL lokal (via `.env` → `DATABASE_URL`), belum pindah ke Neon.
- Semua kode ada di branch `be3`.