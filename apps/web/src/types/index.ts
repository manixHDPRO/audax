export type UserRole = 'ADMIN' | 'CHEF' | 'SECRETAIRE' | 'PROTOCOL' | 'CEMG' | 'SALLE_ATTENTE' | 'OBSERVATEUR' | 'ASSISTANT';

export type AudienceStatus =
  | 'EN_ATTENTE'
  | 'EN_ANALYSE'
  | 'DEJA_ENVOYE'
  | 'TRANSMIS_DIRCAB'
  | 'VALIDEE'
  | 'REJETEE'
  | 'PLANIFIEE'
  | 'CONFIRMEE'
  | 'TERMINEE'
  | 'ARCHIVEE';

export type Priority = 'PRIORITE_0' | 'NORMALE' | 'URGENTE' | 'CRITIQUE';
export type Confidentiality = 'STANDARD' | 'RESTREINT' | 'SECRET';
export type VisitMode = 'INDIVIDUEL' | 'ACCOMPAGNE';

export interface AccompaniedPerson {
  name: string;
  grade?: string;
}

/** Résumé visible par la salle d'attente (sans statut ni suivi de validation). */
export interface WaitingRoomVisitorSummary {
  id: string;
  firstName: string;
  lastName: string;
  function?: string | null;
  badgeCode?: string | null;
}

export interface WaitingRoomAudienceEntry {
  id: string;
  reference: string;
  subject: string;
  requesterName: string;
  category?: string;
  priority?: Priority;
  createdAt: string;
  visitor?: WaitingRoomVisitorSummary | null;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  cabinetId?: string | null;
  bureauId?: string | null;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  permissions?: string[];
}

export type ValidationDecision = 'APPROUVE' | 'REJETE' | 'EN_ATTENTE';

export interface AudienceValidationEntry {
  id: string;
  decision: ValidationDecision;
  comment?: string | null;
  level: number;
  decidedAt?: string | null;
  createdAt: string;
  validator: { firstName: string; lastName: string };
}

export interface AudienceStatusHistoryEntry {
  id: string;
  fromStatus?: AudienceStatus | null;
  toStatus: AudienceStatus;
  comment?: string | null;
  changedBy: string;
  createdAt: string;
  changedByUser?: { firstName: string; lastName: string };
}

export interface Audience {
  id: string;
  reference: string;
  subject: string;
  motive: string;
  requesterName: string;
  requesterOrg?: string;
  status: AudienceStatus;
  priority: Priority;
  confidentiality: Confidentiality;
  category: string;
  grade?: string;
  visitMode?: VisitMode;
  visitorFunction?: string;
  accompaniedPersons?: AccompaniedPerson[];
  scheduledAt?: string;
  createdAt: string;
  visitors?: { visitor: Visitor }[];
  room?: Room;
  createdBy?: { firstName: string; lastName: string };
  visitTarget?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    cabinetId?: string | null;
    bureauId?: string | null;
    cabinet?: { id: string; name: string } | null;
    bureau?: { id: string; name: string } | null;
  };
  statusHistory?: AudienceStatusHistoryEntry[];
  validations?: AudienceValidationEntry[];
}

export interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  organization?: string;
  function?: string;
  email?: string;
  phone?: string;
  accessLevel: string;
  badgeCode?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor?: string;
  status: 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'MAINTENANCE';
}

export interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

export const VALIDATION_DECISION_LABELS: Record<ValidationDecision, string> = {
  APPROUVE: 'Approuvée',
  REJETE: 'Rejetée',
  EN_ATTENTE: 'Transmise',
};

export const STATUS_LABELS: Record<AudienceStatus, string> = {
  EN_ATTENTE: 'En attente',
  EN_ANALYSE: 'En analyse',
  DEJA_ENVOYE: 'Transmise au Cabinet',
  TRANSMIS_DIRCAB: 'Transmise par le CEMG',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
  PLANIFIEE: 'Planifiée',
  CONFIRMEE: 'Confirmée',
  TERMINEE: 'Terminée',
  ARCHIVEE: 'Archivée',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  PRIORITE_0: 'Priorité 0',
  NORMALE: 'Normale',
  URGENTE: 'Urgente',
  CRITIQUE: 'Critique',
};

export const CONFIDENTIALITY_LABELS: Record<Confidentiality, string> = {
  STANDARD: 'Standard',
  RESTREINT: 'Restreint',
  SECRET: 'Secret',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  CHEF: 'Chef de cabinet',
  SECRETAIRE: 'Secrétaire',
  PROTOCOL: 'Protocol',
  CEMG: 'Chef d\'état major général',
  SALLE_ATTENTE: 'Salle d\'attente',
  OBSERVATEUR: 'Observateur',
  ASSISTANT: 'Assistant',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGIN_FAILED: 'Échec de connexion',
  PASSWORD_CHANGED: 'Mot de passe modifié',
  USER_CREATED: 'Utilisateur créé',
  USER_UPDATED: 'Utilisateur modifié',
  USER_ACTIVATED: 'Utilisateur activé',
  USER_DEACTIVATED: 'Utilisateur désactivé',
  USER_PASSWORD_RESET: 'Mot de passe réinitialisé',
  '2FA_ENABLED': '2FA activée',
  '2FA_DISABLED': '2FA désactivée',
  CUSTOM_ROLE_CREATED: 'Rôle personnalisé créé',
  CUSTOM_ROLE_UPDATED: 'Rôle personnalisé modifié',
  CUSTOM_ROLE_DELETED: 'Rôle personnalisé supprimé',
  ROLE_MATRIX_UPDATED: 'Matrice des rôles modifiée',
  SEED: 'Initialisation',
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
};
