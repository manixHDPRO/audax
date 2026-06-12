import { NotFoundException } from '@nestjs/common';
import { Priority, UserRole } from '@prisma/client';

/** Audiences Priorité 0 : visibles par l'Administrateur et le Protocol. */
export function canViewPriorite0Audiences(role: UserRole | string): boolean {
  return role === UserRole.PROTOCOL || role === UserRole.ADMIN;
}

export function priorite0ExcludeWhere(role: UserRole | string) {
  if (canViewPriorite0Audiences(role)) return {};
  return { priority: { not: Priority.PRIORITE_0 } };
}

export function assertCanViewAudience(
  audience: { priority: Priority },
  role: UserRole | string,
): void {
  if (audience.priority === Priority.PRIORITE_0 && !canViewPriorite0Audiences(role)) {
    throw new NotFoundException('Audience introuvable');
  }
}
