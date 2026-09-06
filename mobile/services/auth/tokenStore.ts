import * as SecureStore from 'expo-secure-store';
const ACCESS='auth.access'; const REFRESH='auth.refresh';
export const tokenStore={
  async getAccess(){return SecureStore.getItemAsync(ACCESS)}, async getRefresh(){return SecureStore.getItemAsync(REFRESH)},
  async set(access:string,refresh:string){await Promise.all([SecureStore.setItemAsync(ACCESS,access),SecureStore.setItemAsync(REFRESH,refresh)])},
  async clear(){await Promise.all([SecureStore.deleteItemAsync(ACCESS),SecureStore.deleteItemAsync(REFRESH)])}
};
