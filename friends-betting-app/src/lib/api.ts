import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage?.getItem('jwt');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      };
    }
  }

  return config;
});

export default api;
