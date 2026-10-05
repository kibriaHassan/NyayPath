/** Compress image file to a data-URL for profile photo storage */
export function fileToCompressedDataUrl(file: File, maxSide = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('শুধু ছবি ফাইল দিন'))
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      reject(new Error('ছবি ৬ MB-এর কম হতে হবে'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('ছবি পড়া যায়নি'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('ছবি লোড হয়নি'))
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas সাপোর্ট নেই'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
