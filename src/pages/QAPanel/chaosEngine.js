// Gerenciador de Simulação de Caos e Condições Adversas de Rede (Itens 14 e 17)

class ChaosEngine {
  constructor() {
    this.config = {
      latencyMs: 0,
      isSimulatedOffline: false,
      forceErrorMode: null, // '500_SERVER_ERROR' | '403_FORBIDDEN' | null
      packetLossRate: 0, // 0 to 1
    };
    this.listeners = new Set();
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.notify();
  }

  reset() {
    this.config = {
      latencyMs: 0,
      isSimulatedOffline: false,
      forceErrorMode: null,
      packetLossRate: 0,
    };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getConfig());
      } catch (err) {
        console.error("Erro no listener de caos:", err);
      }
    });
  }

  // Envolve uma chamada assíncrona injetando latência ou falhas programadas
  async intercept(asyncFn) {
    const { latencyMs, isSimulatedOffline, forceErrorMode, packetLossRate } =
      this.config;

    if (isSimulatedOffline) {
      throw new Error(
        "[CHAOS_ENGINE] Conexão indisponível (Simulação de Modo Offline ativo)."
      );
    }

    if (forceErrorMode === "500_SERVER_ERROR") {
      throw new Error(
        "[CHAOS_ENGINE] Erro Interno 500 do Supabase (Simulação de Falha no Servidor)."
      );
    }

    if (forceErrorMode === "403_FORBIDDEN") {
      throw new Error(
        "[CHAOS_ENGINE] Erro 403: Violação de Política RLS (Acesso não autorizado ao Tenant)."
      );
    }

    if (packetLossRate > 0 && Math.random() < packetLossRate) {
      throw new Error(
        "[CHAOS_ENGINE] Timeout de Rede: Pacote descartado por oscilação de sinal 4G."
      );
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    return await asyncFn();
  }
}

export const chaosEngine = new ChaosEngine();
