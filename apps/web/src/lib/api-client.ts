import { API_BASE_URL, API_UNAVAILABLE_MESSAGE } from './api-config';

const API_URL = API_BASE_URL;

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/2fa/verify', '/auth/logout'];

interface AuthHandlers {
  getTokens: () => { accessToken: string | null; refreshToken: string | null };
  setTokens: (accessToken: string, refreshToken: string) => void;
  onExpired: () => void;
}

let authHandlers: AuthHandlers | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function registerAuthHandlers(handlers: AuthHandlers) {
  authHandlers = handlers;
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (!authHandlers || !API_URL) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken } = authHandlers!.getTokens();
    if (!refreshToken) {
      authHandlers!.onExpired();
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        authHandlers!.onExpired();
        return null;
      }

      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      authHandlers!.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      authHandlers!.onExpired();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const message = err.message;
    const text = Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'string'
        ? message
        : res.statusText;
    throw new Error(text || 'Erreur API');
  }
  return res.json();
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error(API_UNAVAILABLE_MESSAGE);
  }

  if (
    res.status === 401 &&
    token &&
    authHandlers &&
    !NO_REFRESH_PATHS.some((p) => path.startsWith(p))
  ) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      let retry: Response;
      try {
        retry = await fetch(`${API_URL}${path}`, { ...init, headers });
      } catch {
        throw new Error(API_UNAVAILABLE_MESSAGE);
      }
      return parseResponse<T>(retry);
    }
  }

  return parseResponse<T>(res);
}

export interface LoginResponse {
  requires2FA?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    cabinetId?: string | null;
    bureauId?: string | null;
    twoFactorEnabled?: boolean;
  };
}

export async function loginApi(email: string, password: string, totpCode?: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, totpCode }),
  });
}

export async function verify2FAApi(tempToken: string, totpCode: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ tempToken, totpCode }),
  });
}

export async function setup2FAApi(token: string) {
  return apiFetch<{ qrCodeDataUrl: string; secret: string }>('/auth/2fa/setup', { token });
}

export async function enable2FAApi(token: string, totpCode: string) {
  return apiFetch('/auth/2fa/enable', { method: 'POST', token, body: JSON.stringify({ totpCode }) });
}

export async function disable2FAApi(token: string, totpCode: string) {
  return apiFetch('/auth/2fa/disable', { method: 'POST', token, body: JSON.stringify({ totpCode }) });
}

export async function refreshTokenApi(refreshToken: string) {
  return apiFetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function logoutApi(refreshToken: string) {
  return apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cabinetId?: string | null;
  bureauId?: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  permissions: string[];
}

export async function getMeApi(token: string) {
  return apiFetch<MeResponse>('/auth/me', { token });
}

export async function changePasswordApi(token: string, currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean }>('/auth/me/password', {
    method: 'PATCH',
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function unlockSessionApi(token: string, password: string, totpCode?: string) {
  return apiFetch<{ success: boolean }>('/auth/unlock-session', {
    method: 'POST',
    token,
    body: JSON.stringify({ password, ...(totpCode ? { totpCode } : {}) }),
  });
}

export interface SystemSecuritySettings {
  inactivityLockEnabled: boolean;
  inactivityTimeoutMinutes: number;
}

export async function getSystemSecuritySettingsApi(token: string) {
  return apiFetch<SystemSecuritySettings>('/system-settings/security', { token });
}

export async function updateSystemSecuritySettingsApi(
  token: string,
  settings: SystemSecuritySettings,
) {
  return apiFetch<SystemSecuritySettings>('/system-settings/security', {
    method: 'PATCH',
    token,
    body: JSON.stringify(settings),
  });
}

export async function rescheduleApi(token: string, audienceId: string, scheduledAt: string) {
  return apiFetch<{ success: boolean; audience: AudienceApiRecord }>(`/calendar/audiences/${audienceId}/reschedule`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ scheduledAt }),
  });
}

export interface ValidateAudiencePayload {
  decision: 'APPROUVE' | 'REJETE' | 'EN_ATTENTE';
  comment?: string;
  level?: number;
}

export async function validateAudienceApi(token: string, id: string, payload: ValidateAudiencePayload) {
  return apiFetch(`/audiences/${id}/validate`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function forwardToDircabApi(token: string, id: string) {
  return apiFetch<AudienceApiRecord>(`/audiences/${id}/forward-dircab`, {
    method: 'POST',
    token,
  });
}

export async function closeAudienceApi(token: string, id: string, payload?: { comment?: string }) {
  return apiFetch<AudienceApiRecord>(`/audiences/${id}/close`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload ?? {}),
  });
}

export interface ReceptionPendingApiRecord {
  id: string;
  reference: string;
  subject: string;
  requesterName: string;
  status: string;
  priority: string;
  scheduledAt?: string | null;
  createdAt: string;
  visitTarget?: { firstName: string; lastName: string } | null;
}

export interface PresencePendingApiRecord {
  id: string;
  reference: string;
  subject: string;
  requesterName: string;
  requesterOrg?: string | null;
  status: string;
  priority: string;
  category: string;
  scheduledAt?: string | null;
  createdAt: string;
  rescheduledAt?: string | Date | null;
  visitTarget?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export interface AccompanimentPendingApiRecord {
  id: string;
  reference: string;
  subject: string;
  requesterName: string;
  requesterOrg?: string | null;
  status: string;
  priority: string;
  category: string;
  scheduledAt?: string | null;
  createdAt: string;
  validatedAt: string;
  rescheduledAt?: string | Date | null;
  awaitingProtocolConfirmation?: boolean;
  visitTarget?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  room?: { id: string; name: string; floor?: string | null } | null;
}

export async function listAccompanimentPendingApi(token: string) {
  return apiFetch<AccompanimentPendingApiRecord[]>('/audiences/accompaniment-pending', { token });
}

export async function completeAccompanimentApi(token: string, id: string, comment?: string) {
  return apiFetch<{ success: boolean; comment: string }>(`/audiences/${id}/complete-accompaniment`, {
    method: 'POST',
    token,
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

export async function listReceptionsPendingApi(token: string) {
  return apiFetch<ReceptionPendingApiRecord[]>('/audiences/receptions-pending', { token });
}

export async function listPresencePendingApi(token: string) {
  return apiFetch<PresencePendingApiRecord[]>('/audiences/presence-pending', { token });
}

export async function confirmRequesterPresenceApi(token: string, id: string, comment?: string) {
  return apiFetch<{ success: boolean; comment: string }>(`/audiences/${id}/confirm-presence`, {
    method: 'POST',
    token,
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

export async function completeReceptionApi(token: string, id: string, comment?: string) {
  return apiFetch<AudienceApiRecord>(`/audiences/${id}/complete-reception`, {
    method: 'POST',
    token,
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

export async function confirmAudienceApi(token: string, id: string) {
  return apiFetch<AudienceApiRecord>(`/audiences/${id}/confirm`, {
    method: 'POST',
    token,
  });
}

export interface CreateAudiencePayload {
  subject: string;
  motive: string;
  requesterName: string;
  requesterOrg?: string;
  requesterPhone?: string;
  requesterAddress?: string;
  requesterGrade?: string;
  priority?: string;
  confidentiality?: string;
  category?: string;
  visitTargetUserId: string;
  visitorId?: string;
  allowDuplicateToday?: boolean;
}

export interface RequesterSearchResult {
  requesters: {
    requesterName: string;
    requesterOrg: string | null;
    requesterPhone: string | null;
    requesterAddress: string | null;
    subject: string;
    category: string;
    motive: string;
    lastAudienceAt: string;
    lastReference: string;
  }[];
}

export interface VisitorLookupResult {
  id: string;
  firstName: string;
  lastName: string;
  organization?: string | null;
  function?: string | null;
  badgeCode?: string | null;
}

export interface DuplicateTodayResult {
  hasDuplicate: boolean;
  audiences: {
    id: string;
    reference: string;
    subject: string;
    status: string;
    createdAt: string;
  }[];
}

export async function searchRequestersFromAudiencesApi(token: string, q: string) {
  const params = new URLSearchParams({ q });
  return apiFetch<RequesterSearchResult>(`/audiences/requester-search?${params}`, { token });
}

export async function searchVisitorsForRegistrationApi(token: string, q: string) {
  const params = new URLSearchParams({ q });
  return apiFetch<VisitorLookupResult[]>(`/visitors/search?${params}`, { token });
}

export async function checkDuplicateTodayApi(token: string, requesterName: string) {
  const params = new URLSearchParams({ requesterName });
  return apiFetch<DuplicateTodayResult>(`/audiences/duplicate-today?${params}`, { token });
}

export interface VisitorApiRecord {
  id: string;
  firstName: string;
  lastName: string;
  organization?: string | null;
  function?: string | null;
  email?: string | null;
  phone?: string | null;
  accessLevel?: string | null;
  badgeCode?: string | null;
  createdAt?: string;
}

export interface CreateVisitorPayload {
  firstName: string;
  lastName: string;
  organization?: string;
  function?: string;
  email?: string;
  phone?: string;
}

export async function createVisitorApi(token: string, payload: CreateVisitorPayload) {
  return apiFetch<VisitorApiRecord>('/visitors', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function listVisitorsApi(token: string) {
  return apiFetch<VisitorApiRecord[]>('/visitors', { token });
}

export async function listPreRegisteredVisitorsTodayApi(token: string) {
  return apiFetch<VisitorApiRecord[]>('/visitors/pre-registered-today', { token });
}

export interface RoomApiRecord {
  id: string;
  name: string;
  capacity: number;
  floor?: string | null;
  status: 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'MAINTENANCE';
}

export async function listRoomsApi(token: string) {
  return apiFetch<RoomApiRecord[]>('/rooms', { token });
}

export interface DashboardReportsResponse {
  stats: {
    EN_ATTENTE: number;
    EN_ANALYSE: number;
    VALIDEE: number;
    REJETEE: number;
    PLANIFIEE: number;
    TERMINEE: number;
  };
  total: number;
  validationRate: number;
  byCategory: { name: string; value: number }[];
  byMonth: { month: string; audiences: number; validees: number }[];
}

export async function getDashboardReportsApi(token: string) {
  return apiFetch<DashboardReportsResponse>('/dashboard/reports', { token });
}

export interface VisitTargetUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export async function listVisitTargetsApi(token: string) {
  return apiFetch<VisitTargetUser[]>('/audiences/visit-targets', { token });
}

export async function createAudienceApi(token: string, payload: CreateAudiencePayload) {
  return apiFetch<AudienceApiRecord>('/audiences', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateRequesterGradeApi(
  token: string,
  audienceId: string,
  requesterGrade: string,
) {
  return apiFetch<AudienceApiRecord>(`/audiences/${audienceId}/requester-grade`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ requesterGrade: requesterGrade || null }),
  });
}

export interface AudienceApiRecord {
  id: string;
  reference: string;
  subject: string;
  motive: string;
  requesterName: string;
  requesterOrg?: string | null;
  requesterPhone?: string | null;
  requesterAddress?: string | null;
  requesterGrade?: string | null;
  status: string;
  priority: string;
  confidentiality: string;
  category: string;
  scheduledAt?: string | null;
  createdAt: string;
  room?: { id: string; name: string; capacity: number; status: string } | null;
  visitors?: {
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
      badgeCode?: string | null;
      function?: string | null;
      organization?: string | null;
      accessLevel?: string;
    };
  }[];
  statusHistory?: AudienceStatusHistoryApiRecord[];
  validations?: AudienceValidationApiRecord[];
  createdBy?: { firstName: string; lastName: string; email?: string };
  visitTarget?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
    cabinetId?: string | null;
    bureauId?: string | null;
    cabinet?: { id: string; name: string } | null;
    bureau?: { id: string; name: string } | null;
  };
}

export interface AudienceStatusHistoryApiRecord {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  comment?: string | null;
  changedBy: string;
  createdAt: string;
  changedByUser?: { firstName: string; lastName: string } | null;
}

export interface AudienceValidationApiRecord {
  id: string;
  decision: string;
  comment?: string | null;
  level: number;
  decidedAt?: string | null;
  createdAt: string;
  validator: { firstName: string; lastName: string };
}

export interface WaitingRoomAudienceApiRecord {
  id: string;
  reference: string;
  subject: string;
  requesterName: string;
  category: string;
  priority: string;
  status?: string;
  scheduledAt?: string | null;
  rescheduledToday?: boolean;
  createdAt: string;
  visitor?: {
    id: string;
    firstName: string;
    lastName: string;
    function?: string | null;
    badgeCode?: string | null;
  } | null;
}

export async function listAudiencesApi(
  token: string,
  filters?: {
    status?: string;
    priority?: string;
    search?: string;
    cabinetId?: string;
    bureauId?: string;
  },
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.cabinetId) params.set('cabinetId', filters.cabinetId);
  if (filters?.bureauId) params.set('bureauId', filters.bureauId);
  const qs = params.toString();
  return apiFetch<AudienceApiRecord[]>(`/audiences${qs ? `?${qs}` : ''}`, { token });
}

export async function listMyTodayAudiencesApi(token: string) {
  return apiFetch<WaitingRoomAudienceApiRecord[]>('/audiences/my-today', { token });
}

export async function getAudienceApi(token: string, id: string) {
  return apiFetch<AudienceApiRecord>(`/audiences/${id}`, { token });
}

export async function deleteAudienceApi(token: string, id: string) {
  return apiFetch<{ success: boolean }>(`/audiences/${id}`, {
    method: 'DELETE',
    token,
  });
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  cabinetId?: string | null;
  bureauId?: string | null;
  cabinet?: { id: string; name: string } | null;
  bureau?: { id: string; name: string } | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cabinetId?: string;
  bureauId?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  cabinetId?: string;
  bureauId?: string;
}

export interface OrgUnit {
  id: string;
  name: string;
}

export interface MilitaryGradeItem {
  id: string;
  label: string;
  createdAt: string;
}

export async function listMilitaryGradesApi(token: string) {
  return apiFetch<MilitaryGradeItem[]>('/military-grades', { token });
}

export async function createMilitaryGradeApi(token: string, label: string) {
  return apiFetch<MilitaryGradeItem>('/military-grades', {
    method: 'POST',
    token,
    body: JSON.stringify({ label }),
  });
}

export async function deleteMilitaryGradeApi(token: string, id: string) {
  return apiFetch<{ success: boolean }>(`/military-grades/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function listCabinetsApi(token: string) {
  return apiFetch<OrgUnit[]>('/org-units/cabinets', { token });
}

export async function listBureausApi(token: string) {
  return apiFetch<OrgUnit[]>('/org-units/bureaus', { token });
}

export async function createCabinetApi(token: string, name: string) {
  return apiFetch<OrgUnit>('/org-units/cabinets', {
    method: 'POST',
    token,
    body: JSON.stringify({ name }),
  });
}

export async function createBureauApi(token: string, name: string) {
  return apiFetch<OrgUnit>('/org-units/bureaus', {
    method: 'POST',
    token,
    body: JSON.stringify({ name }),
  });
}

export async function deleteCabinetApi(token: string, id: string) {
  return apiFetch<{ success: boolean }>(`/org-units/cabinets/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function deleteBureauApi(token: string, id: string) {
  return apiFetch<{ success: boolean }>(`/org-units/bureaus/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function listUsersApi(token: string) {
  return apiFetch<UserListItem[]>('/users', { token });
}

export async function createUserApi(token: string, payload: CreateUserPayload) {
  return apiFetch<UserListItem>('/users', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateUserApi(token: string, id: string, payload: UpdateUserPayload) {
  return apiFetch<UserListItem>(`/users/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export async function toggleUserActiveApi(token: string, id: string) {
  return apiFetch<UserListItem>(`/users/${id}/toggle-active`, {
    method: 'PATCH',
    token,
  });
}

export async function sendUserPasswordLinkApi(token: string, id: string) {
  return apiFetch<{ success: boolean; message: string }>(`/users/${id}/send-password-link`, {
    method: 'POST',
    token,
  });
}

export async function validatePasswordTokenApi(token: string) {
  return apiFetch<{ valid: boolean; email: string; type: 'INVITE' | 'RESET' }>(
    `/auth/password-token/validate?token=${encodeURIComponent(token)}`,
  );
}

export async function setPasswordApi(token: string, password: string) {
  return apiFetch<{ success: boolean }>('/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

export async function listAuditApi(token: string) {
  return apiFetch<AuditLogItem[]>('/audit', { token });
}

export interface CustomRoleItem {
  id: string;
  code: string;
  label: string;
  description?: string;
  permissions: string[];
  createdAt: string;
}

export interface RolesMatrixResponse {
  systemRoles: string[];
  permissionKeys: string[];
  permissionLabels: Record<string, string>;
  permissionGroups?: { id: string; label: string; keys: string[] }[];
  roleLabels: Record<string, string>;
  roleDescriptions: Record<string, string>;
  matrix: Record<string, string[]>;
  customRoles: CustomRoleItem[];
}

export async function getRolesMatrixApi(token: string) {
  return apiFetch<RolesMatrixResponse>('/roles/matrix', { token });
}

export async function updateRolesMatrixApi(token: string, permissions: Record<string, string[]>) {
  return apiFetch<RolesMatrixResponse>('/roles/matrix', {
    method: 'PATCH',
    token,
    body: JSON.stringify({ permissions }),
  });
}

export async function createCustomRoleApi(
  token: string,
  payload: { code: string; label: string; description?: string; permissions: string[] },
) {
  return apiFetch<CustomRoleItem>('/roles', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateSystemRoleApi(
  token: string,
  code: string,
  payload: { label?: string; description?: string },
) {
  return apiFetch<{ code: string; label: string; description?: string }>(`/roles/system/${code}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateCustomRoleApi(
  token: string,
  id: string,
  payload: { label?: string; description?: string; permissions?: string[] },
) {
  return apiFetch<CustomRoleItem>(`/roles/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomRoleApi(token: string, id: string) {
  return apiFetch<{ success: boolean }>(`/roles/${id}`, {
    method: 'DELETE',
    token,
  });
}

export interface NotificationApiRecord {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export async function listNotificationsApi(token: string) {
  return apiFetch<NotificationApiRecord[]>('/notifications', { token });
}

export async function markNotificationReadApi(token: string, id: string) {
  return apiFetch<{ count: number }>(`/notifications/${id}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function markAllNotificationsReadApi(token: string) {
  return apiFetch<{ count: number }>('/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}

export interface ChatUserPreview {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sender: ChatUserPreview;
}

export interface ChatConversationSummary {
  id: string;
  type: string;
  updatedAt: string;
  participants: ChatUserPreview[];
  lastMessage: ChatMessageRecord | null;
  unreadCount: number;
}

export interface ChatConversationDetail {
  id: string;
  type: string;
  participants: ChatUserPreview[];
}

export async function listChatContactsApi(token: string) {
  return apiFetch<ChatUserPreview[]>('/chat/contacts', { token });
}

export async function listChatConversationsApi(token: string) {
  return apiFetch<ChatConversationSummary[]>('/chat/conversations', { token });
}

export async function getChatUnreadCountApi(token: string) {
  return apiFetch<{ count: number }>('/chat/unread-count', { token });
}

export async function createChatConversationApi(token: string, recipientId: string) {
  return apiFetch<ChatConversationDetail>('/chat/conversations', {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientId }),
  });
}

export async function listChatMessagesApi(token: string, conversationId: string) {
  return apiFetch<ChatMessageRecord[]>(`/chat/conversations/${conversationId}/messages`, { token });
}

export async function sendChatMessageApi(token: string, conversationId: string, content: string) {
  return apiFetch<ChatMessageRecord>(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function markChatConversationReadApi(token: string, conversationId: string) {
  return apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/read`, {
    method: 'PATCH',
    token,
  });
}
