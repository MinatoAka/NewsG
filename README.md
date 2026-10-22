# NewsG

[![GitHub Repo](https://img.shields.io/badge/GitHub-NewsG-181717?logo=github)](https://github.com/MinatoAka/NewsG)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Google Apps Script](https://img.shields.io/badge/Platform-Google%20Apps%20Script-34A853?logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Last Commit](https://img.shields.io/github/last-commit/MinatoAka/NewsG)](https://github.com/MinatoAka/NewsG/commits/main)

Kurasi otomatis berita dari Google News dengan Google Apps Script (GAS) untuk kebutuhan website atau aplikasi yang ingin menampilkan konten berita yang relevan, cepat, dan terfilter.

NewsG dirancang khusus untuk kebutuhan Atur Dompet, namun dapat digunakan ulang untuk berbagai kebutuhan lainnya yang membutuhkan feed berita bersumber dari Google News.

## Dukungan

Mendukung pengembangan project ini melalui Saweria:

[![Saweria](https://img.shields.io/badge/Saweria-AKaAturDompet-ff6600?logo=buy-me-a-coffee&logoColor=white)](https://saweria.co/AKaAturDompet)

## Fitur

- Mengambil RSS dari Google News
- Memfilter judul agar lebih bersih dan rapi
- Membatasi sumber berita yang dipercaya (trusted sources)
- Memvalidasi origin request agar hanya domain yang diizinkan yang bisa mengakses data
- Menggunakan cache agar request lebih cepat dan efisien
- Mengembalikan response dalam format JSON

## Struktur Proyek

- `Main.gs` — endpoint utama `doGet`, pengelolaan cache, validasi origin, dan pengambilan data dari Google News
- `Parser.gs` — parsing RSS, pembersihan judul, dan filter sumber berita
- `Utils.gs` — helper untuk hash, normalisasi host, dan format waktu relatif
- `LICENSE` — lisensi proyek

## Cara Menjalankan

1. Buka Google Apps Script.
2. Buat project baru atau import file berikut:
   - `Main.gs`
   - `Parser.gs`
   - `Utils.gs`
3. Buka menu "Project Settings" dan atur Script Properties.
4. Deploy project sebagai Web App.
5. Gunakan URL deployment yang dihasilkan.

## Script Properties

Pastikan property berikut ada di Apps Script:

- `DOMAINS` : `[
  "aturdompet.my.id",
  "www.aturdompet.my.id"
]`
- `KUERY` : `keuangan indonesia AND when:4d`
- `TRUSTED_NEWS` : `[
  "kontan",
  "cnbc",
  "bisnis",
  "antara",
  "investor",
  "katadata",
  "kompas",
  "tempo",
  "detik",
  "okezone",
  "rri",
  "republika",
  "jpnn",
  "suara",
  "medcom",
  "setkab",
  "kemenkeu",
  "bi.go.id",
  "ojk",
  "lps",
  "bankindonesia",
  "p2p"
]`

Catatan:
- `DOMAINS` digunakan untuk membatasi origin yang bisa mengakses API.
- `KUERY` menentukan query berita yang diambil dari Google News.
- `TRUSTED_NEWS` membatasi sumber berita yang dianggap relevan dan aman.

## Contoh Penggunaan

Setelah project terdeploy, endpoint yang umum dipakai adalah:

```text
https://script.google.com/macros/s/{SCRIPT_ID}/exec?ref=https://aturdompet.my.id
```

Dengan parameter `ref` yang berisi domain asal request. Domain ini harus ada di `DOMAINS`.

## Contoh Response

```json
{
  "status": "ok",
  "items": [
    {
      "title": "Harga Emas Hari Ini",
      "link": "https://example.com/news/emas-hari-ini",
      "source": "Kontan",
      "time": "5 menit lalu",
      "publishedAt": "Wed, 21 Oct 2026 09:00:00 GMT"
    }
  ]
}
```

## Keamanan

- Hanya domain yang terdaftar di `DOMAINS` yang bisa mengakses API
- `ref` wajib disertakan agar validasi origin dapat berjalan
- Semua request dibatasi melalui script property yang dikelola di Apps Script

## Lisensi

Proyek ini dilisensikan di bawah [GNU General Public License v3.0](LICENSE).

## Catatan

Project ini dibuat untuk kebutuhan otomatisasi berita di website Atur Dompet, tetapi tetap dapat disesuaikan untuk kebutuhan lain yang menggunakan Google News sebagai sumber data.

Dibuat dengan ❤️ menggunakan Google Apps Script.
