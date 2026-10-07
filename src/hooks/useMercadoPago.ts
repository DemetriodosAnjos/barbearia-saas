/**
 * src/hooks/useMercadoPago.ts
 *
 * Hook customizado para integração reativa com a API de Pagamentos Mercado Pago.
 * Gerencia emissão de Pix Instantâneo, preferências do Checkout Pro,
 * estados de carregamento, cópia de chaves e tratamento defensivo de erros.
 */

import { useState, useCallback } from "react";
import {
  createPreferenceEndpoint,
  createPixEndpoint,
  type ApiResponse,
} from "../api/mercadoPagoEndpoints";
import type {
  PixPaymentResult,
  PreferenceResult,
} from "../services/mercadoPagoService";
import type {
  MercadoPagoPreferenceInput,
  MercadoPagoPixInput,
} from "../schemas/mercadoPagoSchemas";

export interface UseMercadoPagoOptions {
  onSuccess?: (type: "pix" | "preference", result: PixPaymentResult | PreferenceResult) => void;
  onError?: (errorMsg: string) => void;
}

export function useMercadoPago(options?: UseMercadoPagoOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixResult, setPixResult] = useState<PixPaymentResult | null>(null);
  const [preferenceResult, setPreferenceResult] = useState<PreferenceResult | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Emissão de Pix Instantâneo
  const createPix = useCallback(
    async (input: MercadoPagoPixInput): Promise<ApiResponse<PixPaymentResult>> => {
      setIsLoading(true);
      setError(null);
      setCopiedPix(false);
      try {
        const response = await createPixEndpoint(input);
        if (response.success && response.data) {
          setPixResult(response.data);
          options?.onSuccess?.("pix", response.data);
        } else {
          const msg = response.error || "Falha ao gerar cobrança Pix via Mercado Pago";
          setError(msg);
          options?.onError?.(msg);
        }
        return response;
      } catch (err: any) {
        const msg = err.message || "Erro inesperado ao gerar Pix";
        setError(msg);
        options?.onError?.(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  // Criação de Preferência para Checkout Pro
  const createPreference = useCallback(
    async (input: MercadoPagoPreferenceInput): Promise<ApiResponse<PreferenceResult>> => {
      setIsLoading(true);
      setError(null);
      setCopiedLink(false);
      try {
        const response = await createPreferenceEndpoint(input);
        if (response.success && response.data) {
          setPreferenceResult(response.data);
          options?.onSuccess?.("preference", response.data);
        } else {
          const msg = response.error || "Falha ao gerar preferência no Mercado Pago";
          setError(msg);
          options?.onError?.(msg);
        }
        return response;
      } catch (err: any) {
        const msg = err.message || "Erro inesperado ao gerar preferência";
        setError(msg);
        options?.onError?.(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  // Cópia do código Pix Copia-e-Cola
  const copyPixCode = useCallback(async () => {
    if (!pixResult?.qrCode) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(pixResult.qrCode);
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 4000);
        return true;
      }
    } catch (_err) {
      // Ignora erro de clipboard em ambiente sem permissão
    }
    return false;
  }, [pixResult]);

  // Cópia do link do Checkout Pro
  const copyCheckoutUrl = useCallback(async () => {
    if (!preferenceResult?.initPoint) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(preferenceResult.initPoint);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 4000);
        return true;
      }
    } catch (_err) {
      // Ignora erro de clipboard
    }
    return false;
  }, [preferenceResult]);

  // Limpeza de estado
  const reset = useCallback(() => {
    setPixResult(null);
    setPreferenceResult(null);
    setError(null);
    setIsLoading(false);
    setCopiedPix(false);
    setCopiedLink(false);
  }, []);

  return {
    isLoading,
    error,
    pixResult,
    preferenceResult,
    copiedPix,
    copiedLink,
    createPix,
    createPreference,
    copyPixCode,
    copyCheckoutUrl,
    reset,
  };
}
