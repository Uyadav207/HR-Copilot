export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  
  // Prepare headers - only add Content-Type if body is present
  const headers = new Headers(options.headers)
  
  // Only set Content-Type for JSON if body exists and is not FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    const errorMessage = error.error || error.details || error.detail || error.message || `HTTP error! status: ${response.status}`
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || error.detail || error.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

