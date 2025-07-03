export async function http<T>(
  url: string,
  options?: RequestInit & { isFormData?: boolean }
): Promise<T> {
  // Detect login endpoints
  const isLoginEndpoint =
    url.includes('/admin/login') || url.includes('/manager/login');

  let headers: HeadersInit = options?.isFormData
    ? {}
    : { "Content-Type": "application/json" };

  // Only add Authorization header if not a login endpoint
  if (!isLoginEndpoint) {
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('adminToken');
      if (!token || token === 'undefined' || token === '') token = localStorage.getItem('managerToken');
      if (!token || token === 'undefined' || token === '') token = localStorage.getItem('userToken');
    }
    if (token) {
      headers = { ...headers, Authorization: `Bearer ${token}` };
    }
  }

  console.log('[HTTP] Request:', url, options);
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    console.error('[HTTP] Error:', url, data);
    throw new Error(data?.message || `HTTP error! status: ${res.status}`);
  }
  console.log('[HTTP] Response:', url, data);
  return data;
} 