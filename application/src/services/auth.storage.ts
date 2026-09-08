import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const readItem = async (key: string) =>
  Platform.OS === 'web'
    ? window.localStorage.getItem(key)
    : SecureStore.getItemAsync(key);

export const writeItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
};

export const deleteItem = async (key: string) => {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
};
