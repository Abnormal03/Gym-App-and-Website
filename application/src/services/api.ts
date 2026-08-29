import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Automatically attach the JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Automatically handle 401 (expired token) globally
api.interceptors.response.use(
  (response) => response.data,  // unwrap .data so callers get clean objects
  (error) => {
    if (error.response?.status === 401) {
      // clear auth and redirect to login (call logout from store here)
    }
    return Promise.reject(error.response?.data?.message || 'Something went wrong');
  }
);

export default api;