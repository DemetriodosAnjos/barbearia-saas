/**
 * src/utils/safeStorage.ts
 *
 * Camada de armazenamento resiliente (Safe Storage Adapter).
 * Protege a aplicação contra exceções "SecurityError: Access is denied for this document"
 * comuns em ambientes com sandboxing (Cursor IDE Webview, iframes, modo anônimo,
 * bloqueio de cookies de terceiros ou origens opacas).
 *
 * Implementa fallback transparente em memória (InMemoryStorage) caso o
 * window.localStorage não esteja acessível.
 */

class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

class SafeStorageAdapter implements Storage {
  private inMemory = new InMemoryStorage();
  private isNativeAvailable: boolean | null = null;

  /**
   * Testa a real disponibilidade do localStorage de forma segura,
   * sem disparar SecurityError não tratado.
   */
  public isAvailable(): boolean {
    if (this.isNativeAvailable !== null) {
      return this.isNativeAvailable;
    }

    try {
      if (typeof window === "undefined") {
        this.isNativeAvailable = false;
        return false;
      }

      // Tenta acessar e manipular uma chave efêmera para testar permissão real
      const testKey = "__safe_storage_probe__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      this.isNativeAvailable = true;
      return true;
    } catch {
      // SecurityError, QuotaExceededError ou localStorage bloqueado
      this.isNativeAvailable = false;
      return false;
    }
  }

  get length(): number {
    if (this.isAvailable()) {
      try {
        return window.localStorage.length;
      } catch {
        return this.inMemory.length;
      }
    }
    return this.inMemory.length;
  }

  getItem(key: string): string | null {
    if (this.isAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.inMemory.getItem(key);
      }
    }
    return this.inMemory.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(key, String(value));
        return;
      } catch {
        // Fallback para memória em caso de SecurityError ou cota excedida
        this.inMemory.setItem(key, String(value));
        return;
      }
    }
    this.inMemory.setItem(key, String(value));
  }

  removeItem(key: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        this.inMemory.removeItem(key);
      }
    }
    this.inMemory.removeItem(key);
  }

  clear(): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.clear();
      } catch {
        this.inMemory.clear();
      }
    }
    this.inMemory.clear();
  }

  key(index: number): string | null {
    if (this.isAvailable()) {
      try {
        return window.localStorage.key(index);
      } catch {
        return this.inMemory.key(index);
      }
    }
    return this.inMemory.key(index);
  }
}

export const safeStorage = new SafeStorageAdapter();

class SafeSessionStorageAdapter implements Storage {
  private inMemory = new InMemoryStorage();
  private isNativeAvailable: boolean | null = null;

  public isAvailable(): boolean {
    if (this.isNativeAvailable !== null) {
      return this.isNativeAvailable;
    }

    try {
      if (typeof window === "undefined") {
        this.isNativeAvailable = false;
        return false;
      }

      const testKey = "__safe_session_storage_probe__";
      window.sessionStorage.setItem(testKey, "1");
      window.sessionStorage.removeItem(testKey);
      this.isNativeAvailable = true;
      return true;
    } catch {
      this.isNativeAvailable = false;
      return false;
    }
  }

  get length(): number {
    if (this.isAvailable()) {
      try {
        return window.sessionStorage.length;
      } catch {
        return this.inMemory.length;
      }
    }
    return this.inMemory.length;
  }

  getItem(key: string): string | null {
    if (this.isAvailable()) {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return this.inMemory.getItem(key);
      }
    }
    return this.inMemory.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable()) {
      try {
        window.sessionStorage.setItem(key, String(value));
        return;
      } catch {
        this.inMemory.setItem(key, String(value));
        return;
      }
    }
    this.inMemory.setItem(key, String(value));
  }

  removeItem(key: string): void {
    if (this.isAvailable()) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        this.inMemory.removeItem(key);
      }
    }
    this.inMemory.removeItem(key);
  }

  clear(): void {
    if (this.isAvailable()) {
      try {
        window.sessionStorage.clear();
      } catch {
        this.inMemory.clear();
      }
    }
    this.inMemory.clear();
  }

  key(index: number): string | null {
    if (this.isAvailable()) {
      try {
        return window.sessionStorage.key(index);
      } catch {
        return this.inMemory.key(index);
      }
    }
    return this.inMemory.key(index);
  }
}

export const safeSessionStorage = new SafeSessionStorageAdapter();
export default safeStorage;
