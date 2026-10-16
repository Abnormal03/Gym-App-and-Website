import { Platform } from 'react-native';

const API_PORT = 5000;
const LOCAL_API_URL = Platform.select({
  android: 'http://10.0.2.2:' + API_PORT,
  ios: 'http://localhost:' + API_PORT,
  default: 'http://localhost:' + API_PORT,
})!;

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const apiOrigin = configuredApiUrl || LOCAL_API_URL;
// const apiOrigin = LOCAL_API_URL;
export const BASE_URL = apiOrigin.endsWith('/api') ? apiOrigin : apiOrigin + '/api';
