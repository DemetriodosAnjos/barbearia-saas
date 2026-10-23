import { useState, useCallback } from "react";

/**
 * useActionSpinner.js
 *
 * Hook para orquestrar spinners com overlay específicos para botões de ação do projeto.
 * Executa a ação visual por um tempo mínimo calibrado de 2s a 3s (padrão 2400ms)
 * para fornecer feedback consistente de UX de engenharia.
 * Utiliza o ícone vetorial 'zap' da biblioteca lucide-react com a Paleta Oficial Âmbar Nobre.
 */
export function useActionSpinner() {
  const [spinnerState, setSpinnerState] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    icon: "zap",
    durationMs: 2400,
    callback: null,
  });

  const triggerActionWithSpinner = useCallback(
    ({
      title = "Executando ação...",
      subtitle = "Processando requisição e assegurando integridade dos controles...",
      icon = "zap",
      durationMs = 2400,
      action,
    }) => {
      return new Promise((resolve) => {
        setSpinnerState({
          isOpen: true,
          title,
          subtitle,
          icon,
          durationMs,
          callback: async () => {
            setSpinnerState((prev) => ({ ...prev, isOpen: false }));
            if (action) {
              try {
                const result = await action();
                resolve(result);
              } catch (err) {
                console.error("Erro na ação orquestrada:", err);
                resolve(null);
              }
            } else {
              resolve(true);
            }
          },
        });
      });
    },
    []
  );

  const closeSpinner = useCallback(() => {
    setSpinnerState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    isSpinnerOpen: spinnerState.isOpen,
    spinnerProps: {
      isOpen: spinnerState.isOpen,
      title: spinnerState.title,
      subtitle: spinnerState.subtitle,
      icon: spinnerState.icon,
      durationMs: spinnerState.durationMs,
      onComplete: spinnerState.callback,
    },
    triggerActionWithSpinner,
    closeSpinner,
  };
}
