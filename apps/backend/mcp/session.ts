import { db } from '@/db';

import type { McpSession } from './utils';

/** Resolve an MCP session from the session ID and authenticated user */
export const resolveMcpSession = async ({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}): Promise<McpSession> => {
  // ---------- EXISTING SESSION (HAPPY PATH) ----------
  // Find the session and verify the user still belongs to the organization
  const existing = await db.mcpSession.findUnique({
    where: { id: sessionId },
    include: {
      user: true,
      organization: {
        include: {
          members: { where: { userId }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  // If the session has a valid org and the user is still a member, use it
  if (existing?.organization && existing.organization.members.length > 0) {
    // Strip the members array from the org before returning
    const { members: _, ...organization } = existing.organization;
    return {
      sessionId,
      user: existing.user,
      organization,
    };
  }

  // ---------- NEW SESSION ----------
  // Resolve user and their first org membership in parallel
  const [user, firstMembership] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.member.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { organization: true },
    }),
  ]);

  // Prefer the user's default org, but fallback to the first membership if it doesn't exist
  let membership = firstMembership;
  if (
    user.defaultOrganizationId &&
    firstMembership?.organizationId !== user.defaultOrganizationId
  ) {
    membership =
      (await db.member.findFirst({
        where: { userId, organizationId: user.defaultOrganizationId },
        include: { organization: true },
      })) ?? firstMembership;
  }

  // If we still don't have a membership, throw an error (no access)
  if (!membership) {
    throw new Error('User has no organization memberships');
  }

  // Persist the session with their active organization for the next request
  await db.mcpSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId,
      organizationId: membership.organizationId,
    },
    update: {
      organizationId: membership.organizationId,
    },
  });

  return {
    sessionId,
    user,
    organization: membership.organization,
  };
};
