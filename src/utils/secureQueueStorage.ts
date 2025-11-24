import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { captureException } from '../lib/sentry';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const LOG_PREFIX = '[SecureQueueStorage]';

class SecureQueueStorage {
  private secureAvailable: boolean | null = null;

  private availabilityCheck: Promise<boolean> | null = null;

  private reportedWriteFailures = new Set<string>();

  private async ensureAvailability(): Promise<boolean> {
    if (this.secureAvailable !== null) {
      return this.secureAvailable;
    }

    if (!this.availabilityCheck) {
      this.availabilityCheck = SecureStore.isAvailableAsync()
        .then(isAvailable => {
          this.secureAvailable = isAvailable;
          return isAvailable;
        })
        .catch(error => {
          console.error(`${LOG_PREFIX} Failed to determine SecureStore availability`, error);
          this.secureAvailable = false;
          return false;
        })
        .finally(() => {
          this.availabilityCheck = null;
        });
    }

    return this.availabilityCheck;
  }

  async getJson<T extends JsonValue>(key: string): Promise<T | null> {
    try {
      const secure = await this.ensureAvailability();

      if (secure) {
        const value = await SecureStore.getItemAsync(key);
        return value ? (JSON.parse(value) as T) : null;
      }

      const legacyValue = await AsyncStorage.getItem(key);
      return legacyValue ? (JSON.parse(legacyValue) as T) : null;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to read key ${key}`, error);
      return null;
    }
  }

  async setJson(key: string, value: JsonValue): Promise<boolean> {
    try {
      const secure = await this.ensureAvailability();

      if (!secure) {
        console.warn(`${LOG_PREFIX} SecureStore unavailable, ignoring write for key ${key}`);
        this.reportWriteFailure(key, 'setJson', new Error('SecureStore unavailable'));
        return false;
      }

      const payload = JSON.stringify(value);
      await SecureStore.setItemAsync(key, payload, { requireAuthentication: false });
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to write key ${key}`, error);
      this.reportWriteFailure(key, 'setJson', error);
      return false;
    }
  }

  async remove(key: string): Promise<boolean> {
    try {
      const secure = await this.ensureAvailability();

      if (secure) {
        await SecureStore.deleteItemAsync(key);
      }

      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to remove key ${key}`, error);
      this.reportWriteFailure(key, 'remove', error);
      return false;
    }
  }

  async readLegacyValue<T extends JsonValue>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to read legacy value for key ${key}`, error);
      return null;
    }
  }

  async writeSecureValue(key: string, value: JsonValue): Promise<boolean> {
    try {
      const secure = await this.ensureAvailability();

      if (!secure) {
        console.warn(`${LOG_PREFIX} SecureStore unavailable, cannot migrate key ${key}`);
        this.reportWriteFailure(key, 'writeSecureValue', new Error('SecureStore unavailable'));
        return false;
      }

      const payload = JSON.stringify(value);
      await SecureStore.setItemAsync(key, payload, { requireAuthentication: false });
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to migrate key ${key}`, error);
      this.reportWriteFailure(key, 'writeSecureValue', error);
      return false;
    }
  }

  async isSecureAvailable(): Promise<boolean> {
    return this.ensureAvailability();
  }

  async migrateFromAsyncStorage(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const secure = await this.ensureAvailability();

    if (!secure) {
      console.warn(`${LOG_PREFIX} SecureStore unavailable, skipping migration for keys: ${keys.join(', ')}`);
      return;
    }

    for (const key of keys) {
      try {
        const legacyValue = await AsyncStorage.getItem(key);

        if (!legacyValue) {
          continue;
        }

        let parsedValue: JsonValue;
        try {
          parsedValue = JSON.parse(legacyValue);
        } catch (parseError) {
          console.error(`${LOG_PREFIX} Failed to parse legacy value for key ${key}`, parseError);
          continue;
        }

        const existingSecureValue = await SecureStore.getItemAsync(key);
        if (existingSecureValue) {
          await AsyncStorage.removeItem(key);
          console.log(`${LOG_PREFIX} Cleared legacy plaintext key ${key} (already stored securely)`);
          continue;
        }

        const wrote = await this.writeSecureValue(key, parsedValue);

        if (wrote) {
          await AsyncStorage.removeItem(key);
          console.log(`${LOG_PREFIX} Migrated key ${key} to SecureStore`);
        } else {
          console.warn(`${LOG_PREFIX} Secure write failed for key ${key}, keeping legacy value for retry`);
          this.reportWriteFailure(key, 'migrateFromAsyncStorage');
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Migration failed for key ${key}`, error);
        this.reportWriteFailure(key, 'migrateFromAsyncStorage', error);
      }
    }
  }

  private reportWriteFailure(key: string, operation: string, error?: unknown): void {
    const cacheKey = `${operation}:${key}`;
    if (!this.reportedWriteFailures.has(cacheKey)) {
      this.reportedWriteFailures.add(cacheKey);
      const normalizedError = error instanceof Error ? error : new Error(typeof error === 'string' ? error : `${operation} failed for ${key}`);
      captureException(normalizedError, {
        storage_key: key,
        operation,
        source: 'secureQueueStorage'
      });
    }
  }
}

export const secureQueueStorage = new SecureQueueStorage();
