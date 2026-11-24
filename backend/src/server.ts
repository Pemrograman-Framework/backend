import app from './app.js'
import { env } from './config/env.js'
import { getData } from './models/dataStore.js'

const start = async () => {
  try {
    // Buat tabel + impor data awal. Kalau MySQL mati / database belum dibuat, gagal di sini dengan pesan jelas.
    await getData()
  } catch (error) {
    console.error('Gagal menyiapkan database MySQL. Pastikan MySQL menyala, database sudah dibuat, dan backend/.env benar.')
    console.error(error)
    process.exit(1)
  }

  const server = app.listen(env.port, () => {
    console.log(`Anna Brew API listening on http://localhost:${env.port}`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} sudah dipakai proses lain (kemungkinan backend yang masih jalan di terminal lain). Tutup dulu, lalu jalankan ulang.`)
    } else {
      console.error(error)
    }
    process.exit(1)
  })
}

void start()
