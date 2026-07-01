import {
  cloneDefaultMilitaryGradeLabels,
  DEFAULT_MILITARY_GRADE_LABELS,
} from '@/lib/military-grade-defaults';

export { DEFAULT_MILITARY_GRADE_LABELS, cloneDefaultMilitaryGradeLabels };

export function extractGradeFromMotive(motive: string, gradeLabels?: string[]): string | undefined {
  const labels = gradeLabels?.length ? gradeLabels : DEFAULT_MILITARY_GRADE_LABELS;
  const sorted = [...labels].sort((a, b) => b.length - a.length);
  for (const grade of sorted) {
    if (motive.includes(grade)) return grade;
  }
  return undefined;
}
