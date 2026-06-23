import type { UserRole } from '@/types';

export const PERMISSION_LABELS: Record<string, string> = {
  MENU_DASHBOARD: 'Menu — Dashboard',
  MENU_PROTOCOL: 'Menu — Suivi Protocol',
  MENU_COMMAND_CENTER: 'Menu — Command Center',
  MENU_CEMG_PILOTAGE: 'Menu — Pilotage CEMG',
  MENU_CABINET_PILOTAGE: 'Menu — Pilotage Cabinet',
  MENU_SECRETARIAT: 'Menu — Espace Secrétariat',
  MENU_CONSULTATION: 'Menu — Consultation',
  MENU_AUDIENCES: 'Menu — Audiences',
  MENU_NEW_AUDIENCE: 'Menu — Nouvelle audience',
  MENU_CALENDAR: 'Menu — Agenda',
  MENU_VISITORS: 'Menu — Visiteurs',
  MENU_REPORTS: 'Menu — Rapports',
  MENU_NOTIFICATIONS: 'Menu — Notifications',
  MENU_SETTINGS: 'Menu — Paramètres',
  MENU_AUDIT: 'Menu — Audit',
  CREATE_AUDIENCE: 'Créer une audience',
  VIEW_OWN_AUDIENCES_TODAY: 'Voir ses audiences du jour',
  VIEW_AUDIENCES: 'Consulter les audiences',
  VALIDATE_AUDIENCE: 'Valider une audience',
  PLANIFY: 'Planifier',
  REGISTER_VISITOR: 'Enregistrer un visiteur à l\'accueil',
  MANAGE_VISITORS: 'Gérer les visiteurs',
  COMMAND_CENTER: 'Command Center (supervision)',
  REPORTS: 'Consulter les rapports',
  AUDIT: 'Journal d\'audit',
  MANAGE_USERS: 'Gérer les utilisateurs',
  DELETE_AUDIENCE: 'Supprimer une audience',
  COMPLETE_AUDIENCE: 'Confirmer la réception du visiteur',
  ACCOMPANY_AUDIENCE: 'Accompagner une audience validée au bureau',
};

export const MENU_PERMISSION_KEYS = [
  'MENU_DASHBOARD',
  'MENU_PROTOCOL',
  'MENU_COMMAND_CENTER',
  'MENU_CEMG_PILOTAGE',
  'MENU_CABINET_PILOTAGE',
  'MENU_SECRETARIAT',
  'MENU_CONSULTATION',
  'MENU_AUDIENCES',
  'MENU_NEW_AUDIENCE',
  'MENU_CALENDAR',
  'MENU_VISITORS',
  'MENU_REPORTS',
  'MENU_NOTIFICATIONS',
  'MENU_SETTINGS',
  'MENU_AUDIT',
] as const;

export const PERMISSION_GROUPS: { id: string; label: string; keys: string[] }[] = [
  {
    id: 'menu',
    label: 'Menus & navigation',
    keys: [...MENU_PERMISSION_KEYS],
  },
  {
    id: 'actions',
    label: 'Actions & fonctionnalités',
    keys: Object.keys(PERMISSION_LABELS).filter(
      (key) => !(MENU_PERMISSION_KEYS as readonly string[]).includes(key),
    ),
  },
];

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Accès complet à la plateforme et à l\'administration.',
  CHEF: 'Pilotage Cabinet, validation et traitement des audiences déléguées.',
  SECRETAIRE: 'Planification et suivi des audiences.',
  PROTOCOL: 'Validation des demandes d\'audience et confirmation de réception.',
  CEMG: 'Responsable des forces armées — pilotage stratégique et validation.',
  SALLE_ATTENTE: 'Enregistrement des demandes, accompagnement et confirmation de réception (hors CEMG).',
  OBSERVATEUR: 'Consultation des rapports en lecture seule.',
  ASSISTANT: 'Soutien administratif et suivi des audiences.',
};

export const DEFAULT_ROLE_MATRIX: Record<string, UserRole[]> = {
  MENU_DASHBOARD: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR', 'ASSISTANT'],
  MENU_PROTOCOL: ['ADMIN', 'PROTOCOL'],
  MENU_COMMAND_CENTER: ['ADMIN'],
  MENU_CEMG_PILOTAGE: ['CEMG'],
  MENU_CABINET_PILOTAGE: ['CHEF'],
  MENU_SECRETARIAT: ['SECRETAIRE', 'ASSISTANT'],
  MENU_CONSULTATION: ['OBSERVATEUR'],
  MENU_AUDIENCES: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR', 'ASSISTANT', 'SALLE_ATTENTE'],
  MENU_NEW_AUDIENCE: ['ADMIN', 'SALLE_ATTENTE'],
  MENU_CALENDAR: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'ASSISTANT'],
  MENU_VISITORS: ['ADMIN', 'CHEF', 'SECRETAIRE', 'ASSISTANT', 'SALLE_ATTENTE'],
  MENU_REPORTS: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR', 'ASSISTANT'],
  MENU_NOTIFICATIONS: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR', 'ASSISTANT'],
  MENU_SETTINGS: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR', 'ASSISTANT'],
  MENU_AUDIT: ['ADMIN'],
  CREATE_AUDIENCE: ['ADMIN', 'SALLE_ATTENTE'],
  VIEW_OWN_AUDIENCES_TODAY: ['ADMIN', 'SALLE_ATTENTE'],
  VIEW_AUDIENCES: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR', 'ASSISTANT'],
  VALIDATE_AUDIENCE: ['ADMIN', 'CHEF', 'PROTOCOL', 'CEMG'],
  PLANIFY: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'ASSISTANT'],
  REGISTER_VISITOR: ['ADMIN', 'SALLE_ATTENTE'],
  MANAGE_VISITORS: ['ADMIN', 'CHEF', 'SECRETAIRE', 'ASSISTANT'],
  COMMAND_CENTER: ['ADMIN', 'CHEF', 'CEMG'],
  REPORTS: ['ADMIN', 'CHEF', 'SECRETAIRE', 'PROTOCOL', 'CEMG', 'OBSERVATEUR', 'ASSISTANT'],
  AUDIT: ['ADMIN'],
  MANAGE_USERS: ['ADMIN'],
  DELETE_AUDIENCE: ['ADMIN'],
  COMPLETE_AUDIENCE: ['ADMIN', 'PROTOCOL', 'SALLE_ATTENTE'],
  ACCOMPANY_AUDIENCE: ['ADMIN', 'SALLE_ATTENTE'],
};

export const SYSTEM_ROLES: UserRole[] = [
  'ADMIN',
  'CEMG',
  'CHEF',
  'SECRETAIRE',
  'PROTOCOL',
  'ASSISTANT',
  'SALLE_ATTENTE',
  'OBSERVATEUR',
];

export function resolvePermissionsForRole(role: UserRole): string[] {
  return Object.entries(DEFAULT_ROLE_MATRIX)
    .filter(([, roles]) => roles.includes(role))
    .map(([key]) => key);
}
