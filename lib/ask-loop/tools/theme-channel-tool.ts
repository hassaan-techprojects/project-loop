import { prisma } from "@/lib/db";

export async function getWorkspaceThemes(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  return prisma.theme.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          feedbackThemes: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getWorkspaceChannels(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  return prisma.channel.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}