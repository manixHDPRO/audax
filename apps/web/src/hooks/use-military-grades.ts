'use client';

import { useCallback, useEffect, useState } from 'react';
import { listMilitaryGradesApi, type MilitaryGradeItem } from '@/lib/api-client';
import { cloneDefaultMilitaryGradeLabels } from '@/lib/military-grade-defaults';

export function useMilitaryGrades(accessToken?: string | null) {
  const [grades, setGrades] = useState<MilitaryGradeItem[]>([]);
  const [labels, setLabels] = useState<string[]>(() => cloneDefaultMilitaryGradeLabels());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!accessToken) {
      setGrades([]);
      setLabels(cloneDefaultMilitaryGradeLabels());
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await listMilitaryGradesApi(accessToken);
      setGrades(data);
      setLabels(data.map((g) => g.label));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des grades');
      setLabels(cloneDefaultMilitaryGradeLabels());
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { grades, labels, loading, error, reload };
}
