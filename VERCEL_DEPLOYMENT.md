# Panduan Deployment di Vercel

## Environment Variables

Saat men-deploy aplikasi ini di Vercel, Anda perlu mengatur environment variables berikut:

### Langkah-langkah Setup Environment Variables:

1. Login ke [Dashboard Vercel](https://vercel.com/dashboard)
2. Pilih project Anda
3. Klik tab **Settings**
4. Di sidebar, klik **Environment Variables**
5. Tambahkan variabel berikut satu per satu:

| Nama | Nilai | Environment |
|------|-------|-------------|
| NEXT_PUBLIC_PEERJS_HOST | 0.peerjs.com | Production, Preview, Development |
| NEXT_PUBLIC_PEERJS_PORT | 443 | Production, Preview, Development |
| NEXT_PUBLIC_PEERJS_PATH | / | Production, Preview, Development |
| NEXT_PUBLIC_PEERJS_SECURE | true | Production, Preview, Development |
| NEXT_PUBLIC_WEBSOCKET_URL | wss://[your-vercel-domain].vercel.app/api/socket | Production, Preview, Development |

> **Catatan Penting:** Untuk `NEXT_PUBLIC_WEBSOCKET_URL`, ganti `[your-vercel-domain]` dengan domain yang diberikan Vercel untuk aplikasi Anda setelah deployment pertama.

### Langkah Deployment:

1. Pastikan repository GitHub Anda terhubung dengan Vercel
2. Di dashboard Vercel, klik **+ New Project**
3. Pilih repository GitHub tictac
4. Ikuti langkah-langkah setup, pilih Next.js sebagai framework
5. Pada langkah Environment Variables, tambahkan variabel seperti yang disebutkan di atas
6. Klik **Deploy**

### Menghubungkan Custom Domain (Opsional):

1. Setelah deployment berhasil, klik project Anda di dashboard Vercel
2. Klik tab **Domains**
3. Masukkan domain kustom Anda dan ikuti petunjuk untuk mengatur DNS

### Pembaruan WebSocket URL:

Jika Anda menggunakan custom domain, ingat untuk memperbarui environment variable `NEXT_PUBLIC_WEBSOCKET_URL` dengan domain kustom Anda:

```
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-custom-domain.com/api/socket
```

## Monitoring Aplikasi

- Lihat log dan performa aplikasi Anda di tab **Logs** dan **Analytics**
- Vercel secara otomatis menyediakan HTTPS dan CDN untuk aplikasi Anda 