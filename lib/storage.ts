export interface StorageProvider {
  upload(file: File, path: string): Promise<string>
  delete(path: string): Promise<void>
}

class SupabaseStorage implements StorageProvider {
  async upload(file: File, path: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    if (!res.ok) throw new Error('Upload failed')
    const { url } = await res.json()
    return url
  }

  async delete(path: string): Promise<void> {
    await fetch('/api/upload', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    })
  }
}

class AWSStorage implements StorageProvider {
  async upload(file: File, path: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    if (!res.ok) throw new Error('Upload failed')
    const { url } = await res.json()
    return url
  }

  async delete(path: string): Promise<void> {
    await fetch('/api/upload', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    })
  }
}

export const storage: StorageProvider = 
  process.env.NEXT_PUBLIC_STORAGE_PROVIDER === 'aws' 
    ? new AWSStorage() 
    : new SupabaseStorage()
