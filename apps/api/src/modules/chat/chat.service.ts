import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatStreamService } from './chat-stream.service';
import { hiddenSuperAdminUserFilter, isPlatformAdmin } from '../../common/super-admin-access';

const userPreviewSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  email: true,
} as const;

const messageSelect = {
  id: true,
  conversationId: true,
  content: true,
  createdAt: true,
  sender: { select: userPreviewSelect },
} as const;

export interface ChatUserContext {
  id: string;
  role: UserRole | string;
  cabinetId?: string | null;
  bureauId?: string | null;
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private chatStream: ChatStreamService,
  ) {}

  private async assertCanContact(user: ChatUserContext, targetUserId: string) {
    if (user.id === targetUserId) {
      throw new BadRequestException('Impossible de démarrer une conversation avec vous-même');
    }

    const target = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        isActive: true,
        ...hiddenSuperAdminUserFilter(user.role),
      },
      select: { id: true, cabinetId: true, bureauId: true },
    });
    if (!target) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (isPlatformAdmin(user.role)) return target;

    if (user.cabinetId && target.cabinetId && user.cabinetId === target.cabinetId) {
      return target;
    }
    if (user.bureauId && target.bureauId && user.bureauId === target.bureauId) {
      return target;
    }

    // Mono-cabinet : autoriser la messagerie entre comptes actifs.
    const activeCount = await this.prisma.user.count({ where: { isActive: true } });
    if (activeCount <= 30) return target;

    throw new ForbiddenException('Utilisateur hors de votre périmètre');
  }

  async listContacts(user: ChatUserContext) {
    const where: Prisma.UserWhereInput = {
      isActive: true,
      id: { not: user.id },
      ...hiddenSuperAdminUserFilter(user.role),
    };

    if (!isPlatformAdmin(user.role) && user.cabinetId) {
      where.cabinetId = user.cabinetId;
    }

    return this.prisma.user.findMany({
      where,
      select: userPreviewSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) {
      throw new ForbiddenException('Conversation inaccessible');
    }
    return participant;
  }

  private async findExistingDirectConversation(userId: string, recipientId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        type: ConversationType.DIRECT,
        participants: { some: { userId } },
      },
      include: {
        participants: { select: { userId: true } },
      },
    });

    return (
      conversations.find(
        (conversation) =>
          conversation.participants.length === 2 &&
          conversation.participants.some((p) => p.userId === recipientId),
      ) ?? null
    );
  }

  async listConversations(userId: string) {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: userPreviewSelect } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: messageSelect,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return Promise.all(
      rows.map(async ({ conversation, lastReadAt }) => {
        const otherParticipants = conversation.participants.filter((p) => p.userId !== userId);
        const lastMessage = conversation.messages[0] ?? null;
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });

        return {
          id: conversation.id,
          type: conversation.type,
          updatedAt: conversation.updatedAt,
          participants: otherParticipants.map((p) => p.user),
          lastMessage,
          unreadCount,
        };
      }),
    );
  }

  async getUnreadCount(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });

    const counts = await Promise.all(
      participants.map((p) =>
        this.prisma.chatMessage.count({
          where: {
            conversationId: p.conversationId,
            senderId: { not: userId },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        }),
      ),
    );

    return counts.reduce((sum, n) => sum + n, 0);
  }

  async createOrGetConversation(user: ChatUserContext, recipientId: string) {
    await this.assertCanContact(user, recipientId);

    const existing = await this.findExistingDirectConversation(user.id, recipientId);
    if (existing) {
      return this.getConversation(existing.id, user.id);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        participants: {
          create: [{ userId: user.id }, { userId: recipientId }],
        },
      },
    });

    return this.getConversation(conversation.id, user.id);
  }

  async getConversation(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: { user: { select: userPreviewSelect } },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');

    return {
      id: conversation.id,
      type: conversation.type,
      participants: conversation.participants
        .filter((p) => p.userId !== userId)
        .map((p) => p.user),
    };
  }

  async listMessages(conversationId: string, userId: string, limit = 50, before?: string) {
    await this.assertParticipant(conversationId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: messageSelect,
    });

    return messages.reverse();
  }

  async sendMessage(conversationId: string, userId: string, content: string) {
    await this.assertParticipant(conversationId, userId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Message vide');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: trimmed,
      },
      select: messageSelect,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    const recipientIds = participants.map((p) => p.userId).filter((id) => id !== userId);
    this.chatStream.pushMany(recipientIds, {
      type: 'message',
      conversationId,
      messageId: message.id,
    });

    return message;
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return { ok: true };
  }
}
