import { useState, useEffect } from 'react';

export function useLecteur(chapitreId: string) {
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

  function toggleAnalyseGlobal() {
    setAnalyseModeGlobal(v => !v);
    setAnalyseParId({});
  }

  function toggleTraductionGlobal() {
    setTraductionModeGlobal(v => !v);
    setTraductionParId({});
  }

  function toggleAnalyseParagraphe(id: string) {
    setAnalyseParId(prev => {
      const actuel = id in prev ? prev[id] : analyseModeGlobal;
      return { ...prev, [id]: !actuel };
    });
  }

  function toggleTraductionParagraphe(id: string) {
    setTraductionParId(prev => {
      const actuel = id in prev ? prev[id] : traductionModeGlobal;
      return { ...prev, [id]: !actuel };
    });
  }

  return {
    analyseModeGlobal,
    traductionModeGlobal,
    toggleAnalyseGlobal,
    toggleTraductionGlobal,
    isAnalyseActive,
    isTraductionVisible,
    toggleAnalyseParagraphe,
    toggleTraductionParagraphe,
  };
}
