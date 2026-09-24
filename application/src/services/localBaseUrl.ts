import { Platform } from 'react-native';

const API_PORT = 5000; // Change to your local backend port

export const BASE_URL = Platform.select({
  android: `http://10.0.2.2:${API_PORT}/api`,
  ios: `http://localhost:${API_PORT}/api`,
  default: `http://localhost:${API_PORT}/api`,
});