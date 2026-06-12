import type { UserRole } from '@/types';

export const PERMISSION_LABELS: Record<string, string> = {
  CREATE_AUDIENCE: 'Créer une audience',
  VIEW_OWN_AUDIENCES_TODAY: 'Voir ses audiences du jour',
  VIEW_AUDIENCES: 'Consulter les audiences',
  VALIDATE_AUDIENCE: 'Valider une audience',
  PLANIFY: 'Planifier',
  MANAGE_VISITORS: 'Gérer les visiteurs',
  COMMAND_CENTER: 'Command Center',
  REPORTS: 'Consulter les rapports',
  AUDIT: 'Journal d\'audit',
  MANAGE_USERS: 'Gérer les utilisateurs',
  DELETE_AUDIENCE: 'Supprimer une audience',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Accès complet à la plateforme et à l\'administration.',
  CHEF: 'Pilotage stratégique, validation et command center.',
  SECRETAIRE: 'Planification et suivi des audiences.',
  PROTOCOL: 'Validation des demandes d\'audience.',
  CEMG: 'Responsable des forces armées — pilotage stratégique et validation.',
  SALLE_ATTENTE: 'Enregistrement des demandes d\'audience à l\'accueil.',
  OBSERVATEUR: 'Consultation des rapports en lecture seule.',
};

export const DEFAULT_ROLE_MATRIX: Record<string, UserRole[]> = {
  CREATE_AUDIENCE: ['ADMIN', 'SALLE_ATTENTE'],
  VIEW_OWN_AUDIENCES_TODAY: ['ADMIN', 'SALLE_ATTENTE'],
  VIEW_AUDIENCES: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR'],
  VALIDATE_AUDIENCE: ['ADMIN', 'CHEF', 'PROTOCOL', 'CEMG'],
  PLANIFY: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG'],
  MANAGE_VISITORS: ['ADMIN', 'CHEF', 'SECRETAIRE'],
  COMMAND_CENTER: ['ADMIN', 'CHEF', 'CEMG'],
  REPORTS: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR'],
  AUDIT: ['ADMIN'],
  MANAGE_USERS: ['ADMIN'],
  DELETE_AUDIENCE: ['ADMIN'],
};

export const SYSTEM_ROLES: UserRole[] = [
  'ADMIN',
  'CEMG',
  'CHEF',
  'SECRETAIRE',
  'PROTOCOL',
  'SALLE_ATTENTE',
  'OBSERVATEUR',
];

export function resolvePermissionsForRole(role: UserRole): string[] {
  return Object.entries(DEFAULT_ROLE_MATRIX)
    .filter(([, roles]) => roles.includes(role))
    .map(([key]) => key);
}
