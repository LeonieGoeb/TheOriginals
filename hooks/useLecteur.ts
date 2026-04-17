import { useState, useEffect, useCallback, useTransition } from 'react';

export function useLecteur(chapitreId: string) {
  const [isPending, startTransition] = useTransition();
  const [analyseModeGlobal, setAnalyseModeGlobal] = useState(false);
  const [traductionModeGlobal, setTraductionModeGlobal] = useState(false);
  const [analyseParId, setAnalyseParId] = useState<Record<string, boolean>>({});
  const [traductionParId, setTraductionParId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAnalyseParId({});
    setTraductionParId({});
  }, [chapitreId]);

  function isAnalyseActive(paragrapheId: string): boolean {
    if (paragrapheId in analyseParId) return analyseParId[paragrapheId];
    return analyseModeGlobal;
  }

  function isTraductionVisible(paragrapheId: string): boolean {
    if (paragrapheId in traductionParId) return traductionParId[paragrapheId];
    return traductionModeGlobal;
  }

  const toggleAnalyseGlobal = useCallback(() => {
    startTransition(() => {
      setAnalyseModeGlobal(v => !v);
      setAnalyseParId({});
    });
  }, [startTransition]);

  const toggleTraductionGlobal = useCallback(() => {
    startTransition(() => {
      setTraductionModeGlobal(v => !v);
      setTraductionParId({});
    });
  }, [startTransition]);

  const toggleAnalyseParagraphe = useCallback((id: string) => {
    setAnalyseParId(prev => {
      const actuel = id in prev ? prev[id] : analyseModeGlobal;
      return { ...prev, [id]: !actuel };
    });
  }, [analyseModeGlobal]);

  const toggleTraductionParagraphe = useCallback((id: string) => {
    setTraductionParId(prev => {
      const actuel = id in prev ? prev[id] : traductionModeGlobal;
      return { ...prev, [id]: !actuel };
    });
  }, [traductionModeGlobal]);

  return {
    analyseModeGlobal,
    traductionModeGlobal,
    toggleAnalyseGlobal,
    toggleTraductionGlobal,
    isAnalyseActive,
    isTraductionVisible,
    toggleAnalyseParagraphe,
    toggleTraductionParagraphe,
    isPending,
  };
}
