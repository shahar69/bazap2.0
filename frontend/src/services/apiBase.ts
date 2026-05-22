const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (envBaseUrl) {
    return trimTrailingSlash(envBaseUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isLocalPreview = (hostname === '127.0.0.1' || hostname === 'localhost') && port && port !== '5000';

    if (isLocalPreview) {
      return `${protocol}//127.0.0.1:5000/api`;
    }
  }

  return '/api';
};
