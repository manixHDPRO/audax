import type { Audience, Visitor, Room, Notification, AuditLog, User } from '@/types';

export const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@audax.fardc.cd': {
    password: 'Audax2026!',
    user: { id: '1', email: 'admin@audax.fardc.cd', firstName: 'Jean', lastName: 'Mukendi', role: 'ADMIN' },
  },
  'chef@audax.fardc.cd': {
    password: 'Audax2026!',
    user: { id: '2', email: 'chef@audax.fardc.cd', firstName: 'Général', lastName: 'Kabongo', role: 'CHEF' },
  },
  'secretaire@audax.fardc.cd': {
    password: 'Audax2026!',
    user: { id: '3', email: 'secretaire@audax.fardc.cd', firstName: 'Marie', lastName: 'Tshisekedi', role: 'SECRETAIRE' },
  },
  'officier@audax.fardc.cd': {
    password: 'Audax2026!',
    user: { id: '4', email: 'officier@audax.fardc.cd', firstName: 'Capitaine', lastName: 'Lubala', role: 'PROTOCOL' },
  },
};

export const MOCK_USERS = Object.values(DEMO_USERS).map(({ user }) => ({
  ...user,
  isActive: true,
  twoFactorEnabled: false,
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
}));

export const MOCK_AUDIENCES: Audience[] = [
  {
    id: 'aud-1',
    reference: 'AUD-2026-001',
    subject: 'Coopération militaire bilatérale',
    motive: 'Discussion sur les nouveaux accords de défense',
    requesterName: 'Général Smith',
    requesterOrg: 'Attaché de Défense USA',
    status: 'EN_ATTENTE',
    priority: 'PRIORITE_0',
    confidentiality: 'SECRET',
    category: 'MILITAIRE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aud-2',
    reference: 'AUD-2026-002',
    subject: 'Modernisation du parc automobile',
    motive: 'Présentation des nouveaux véhicules tactiques',
    requesterName: 'M. Jean Dupont',
    requesterOrg: 'AutoTech Solutions',
    status: 'PLANIFIEE',
    priority: 'NORMALE',
    confidentiality: 'STANDARD',
    category: 'CIVIL',
    scheduledAt: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aud-3',
    reference: 'AUD-2026-003',
    subject: 'Rapport sur la situation à l\'Est',
    motive: 'Briefing hebdomadaire sur les opérations',
    requesterName: 'Colonel Mwangaza',
    requesterOrg: 'Commandement Zone 3',
    status: 'EN_ATTENTE',
    priority: 'CRITIQUE',
    confidentiality: 'SECRET',
    category: 'MILITAIRE',
    scheduledAt: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aud-4',
    reference: 'AUD-2026-004',
    subject: 'Visite de courtoisie',
    motive: 'Prise de contact suite à la nomination',
    requesterName: 'Ambassadeur de France',
    requesterOrg: 'Ambassade de France',
    status: 'PLANIFIEE',
    priority: 'PRIORITE_0',
    confidentiality: 'RESTREINT',
    category: 'DIPLOMATIQUE',
    scheduledAt: new Date(new Date().setHours(16, 45, 0, 0)).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_VISITORS: Visitor[] = [
  { id: 'v1', firstName: 'Ambassadeur', lastName: 'Dupont', organization: 'Ambassade de France', function: 'Ambassadeur', accessLevel: 'VIP', badgeCode: 'VIS-001' },
  { id: 'v2', firstName: 'Colonel', lastName: 'Mwangaza', organization: 'FARDC - État-Major', function: 'Officier supérieur', accessLevel: 'RESTREINT', badgeCode: 'VIS-002' },
  { id: 'v3', firstName: 'Dr.', lastName: 'Kabila', organization: 'Ministère Affaires Étrangères', function: 'Conseiller', accessLevel: 'STANDARD', badgeCode: 'VIS-003' },
];

export const MOCK_ROOMS: Room[] = [
  { id: 'r1', name: 'Salle Stratégique A', capacity: 12, floor: '3', status: 'LIBRE' },
  { id: 'r2', name: 'Salle Diplomatique B', capacity: 8, floor: '2', status: 'OCCUPEE' },
  { id: 'r3', name: 'Bureau Chef EMG', capacity: 6, floor: '4', status: 'RESERVEE' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'INFO', title: 'Bienvenue sur AUDAX', message: 'Aucune audience enregistrée pour le moment', isRead: false, link: '/audiences?new=1', createdAt: new Date().toISOString() },
];

export const MOCK_AUDIT: AuditLog[] = [
  { id: 'a1', action: 'LOGIN_SUCCESS', entity: 'Auth', entityId: 'admin@audax.fardc.cd', ipAddress: '192.168.1.10', createdAt: new Date().toISOString(), user: { firstName: 'Jean', lastName: 'Mukendi', email: 'admin@audax.fardc.cd' } },
];

export const MOCK_STATS = {
  EN_ATTENTE: 0,
  EN_ANALYSE: 0,
  VALIDEE: 0,
  REJETEE: 0,
  PLANIFIEE: 0,
  TERMINEE: 0,
  total: 0,
  critiques: 0,
};

export const CHART_DATA = [
  { month: 'Jan', audiences: 12, validees: 9 },
  { month: 'Fév', audiences: 18, validees: 14 },
  { month: 'Mar', audiences: 15, validees: 12 },
  { month: 'Avr', audiences: 22, validees: 18 },
  { month: 'Mai', audiences: 19, validees: 15 },
];

export const CATEGORY_DATA = [
  { name: 'Militaire', value: 35, color: '#4a7c4a' },
  { name: 'Diplomatique', value: 25, color: '#c9a227' },
  { name: 'Civil', value: 20, color: '#6b9f6b' },
  { name: 'Institutionnel', value: 20, color: '#2d4a2d' },
];
