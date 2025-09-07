// Track recent requests to prevent duplicate logging
const recentRequests = new Set<string>();
const requestTimeout = 1000; // 1 second timeout

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

  // Create a unique key for this request
  const requestKey = `${url}-${JSON.stringify(options?.method || 'GET')}`;
  
  // Only log if we haven't seen this exact request recently
  if (!recentRequests.has(requestKey)) {
    console.log('[HTTP] Request:', url, options);
    recentRequests.add(requestKey);
    
    // Remove from tracking after timeout
    setTimeout(() => {
      recentRequests.delete(requestKey);
    }, requestTimeout);
  }
  
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });
  } catch (fetchError: any) {
    console.error('[HTTP] Network Error:', {
      url,
      error: fetchError.message,
      type: fetchError.name
    });
    throw new Error(`Network error: ${fetchError.message || 'Failed to connect to server'}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    console.error('[HTTP] Error Response:', {
      url,
      status: res.status,
      statusText: res.statusText,
      data: data,
      message: data?.message || `HTTP error! status: ${res.status}`
    });
    throw new Error(data?.message || `HTTP error! status: ${res.status}`);
  }
  
  // Only log response if we haven't seen this exact request recently
  if (!recentRequests.has(requestKey)) {
    console.log('[HTTP] Response:', url, data);
  }
  
  return data;
} 