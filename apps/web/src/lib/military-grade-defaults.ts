export const DEFAULT_MILITARY_GRADE_LABELS: string[] = [
  'Général d\'armée',
  'Général de corps d\'armée',
  'Général de division',
  'Général de brigade',
  'Colonel',
  'Lieutenant-colonel',
  'Commandant',
  'Capitaine',
  'Lieutenant',
  'Sous-lieutenant',
  'Adjudant-chef',
  'Adjudant',
  'Sergent-chef',
  'Sergent',
  'Caporal',
  'Soldat de 1ère classe',
];

export function cloneDefaultMilitaryGradeLabels(): string[] {
  return [...DEFAULT_MILITARY_GRADE_LABELS];
}
