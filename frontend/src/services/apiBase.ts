const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (envBaseUrl) {
    return trimTrailingSlash(envBaseUrl);
  }

  return '/api';
};
