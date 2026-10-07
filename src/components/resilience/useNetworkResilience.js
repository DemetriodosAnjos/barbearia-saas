import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Hook useNetworkResilience
 *
 * Monitora proativamente o estado da conexão de rede e do WebSocket do Supabase Realtime.
 * Suporta:
 * 1. navigator.onLine nativo e eventos 'online'/'offline' da window
 * 2. Status do canal Realtime do Supabase (SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR)
 * 3. Detecção de alta latência (>1200ms)
 * 4. Simulação interativa para testes de UX no QA Studio (NORMAL, OFFLINE, HIGH_LATENCY)
 */
export function useNetworkResilience() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [simulatedMode, setSimulatedMode] = useState("NORMAL"); // 'NORMAL' | 'OFFLINE' | 'HIGH_LATENCY'
  const [latencyMs, setLatencyMs] = useState(45);
  const [lastOnlineAt, setLastOnlineAt] = useState(new Date().toISOString());

  const channelRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Monitora eventos nativos do navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(false);
      setLastOnlineAt(new Date().toISOString());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Monitora o status do WebSocket Realtime do Supabase
  useEffect(() => {
    try {
      const channel = supabase.channel("system-connectivity-monitor", {
        config: { presence: { key: "connectivity" } },
      });

      channel
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsWebSocketConnected(true);
            setIsReconnecting(false);
            setReconnectAttempts(0);
          } else if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
            setIsWebSocketConnected(false);
            setIsReconnecting(true);
          }
        });

      channelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("Monitor de WebSocket Supabase em contingência local:", err);
    }
  }, []);

  // Ping de telemetria para verificação de latência real
  const measureLatency = useCallback(async () => {
    if (simulatedMode === "HIGH_LATENCY") {
      setLatencyMs(2450);
      return 2450;
    }
    if (simulatedMode === "OFFLINE" || !isOnline) {
      setLatencyMs(9999);
      return 9999;
    }

    const t0 = performance.now();
    try {
      // Leitura ultra leve com limite de 1 registro para medir o RTT
      await supabase.from("services").select("id").limit(1);
      const measured = Math.round(performance.now() - t0);
      setLatencyMs(measured);
      return measured;
    } catch {
      setLatencyMs(180);
      return 180;
    }
  }, [isOnline, simulatedMode]);

  useEffect(() => {
    measureLatency();
    pingIntervalRef.current = setInterval(measureLatency, 15000);
    return () => clearInterval(pingIntervalRef.current);
  }, [measureLatency]);

  // Função manual para forçar reconexão
  const attemptReconnect = useCallback(async () => {
    setIsReconnecting(true);
    setReconnectAttempts((prev) => prev + 1);

    await new Promise((resolve) => setTimeout(resolve, 800));

    if (simulatedMode === "OFFLINE") {
      setIsReconnecting(false);
      return false;
    }

    try {
      await measureLatency();
      setIsOnline(true);
      setIsWebSocketConnected(true);
      setIsReconnecting(false);
      setLastOnlineAt(new Date().toISOString());
      return true;
    } catch {
      setIsReconnecting(false);
      return false;
    }
  }, [measureLatency, simulatedMode]);

  // Modos de simulação para testar a resiliência na interface
  const setSimulatedState = useCallback((mode) => {
    setSimulatedMode(mode);
    if (mode === "OFFLINE") {
      setIsOnline(false);
      setIsWebSocketConnected(false);
      setLatencyMs(9999);
    } else if (mode === "HIGH_LATENCY") {
      setIsOnline(true);
      setIsWebSocketConnected(true);
      setLatencyMs(2650);
    } else {
      setIsOnline(true);
      setIsWebSocketConnected(true);
      setLatencyMs(48);
      setLastOnlineAt(new Date().toISOString());
    }
  }, []);

  const isActuallyOffline = !isOnline || !isWebSocketConnected || simulatedMode === "OFFLINE";
  const isHighLatency = latencyMs > 1200 || simulatedMode === "HIGH_LATENCY";

  return {
    isOnline: !isActuallyOffline,
    isOffline: isActuallyOffline,
    isWebSocketConnected,
    isReconnecting,
    reconnectAttempts,
    latencyMs,
    isHighLatency,
    simulatedMode,
    lastOnlineAt,
    attemptReconnect,
    setSimulatedState,
    measureLatency,
  };
}
