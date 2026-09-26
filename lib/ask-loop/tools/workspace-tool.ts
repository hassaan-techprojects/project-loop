import { prisma } from "@/lib/db";

export async function getWorkspaceOverview(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const [workspace, activeFeedbackCount] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            themes: true,
            channels: true,
            reports: true,
          },
        },
        googleFormIntegration: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        users: {
          select: { role: true },
        },
      },
    }),
    prisma.feedback.count({
      where: {
        workspaceId,
        deletedAt: null,
      },
    }),
  ]);

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const roleCounts = workspace.users.reduce<Record<string, number>>(
    (counts, user) => {
      counts[user.role] = (counts[user.role] ?? 0) + 1;
      return counts;
    },
    {}
  );

  return {
    id: workspace.id,
    name: workspace.name,
    createdAt: workspace.createdAt,
    counts: {
      users: workspace._count.users,
      feedback: activeFeedbackCount,
      themes: workspace._count.themes,
      channels: workspace._count.channels,
      reports: workspace._count.reports,
    },
    roles: roleCounts,
    integrations: {
      googleForm: workspace.googleFormIntegration
        ? {
            configured: true,
            createdAt: workspace.googleFormIntegration.createdAt,
            updatedAt: workspace.googleFormIntegration.updatedAt,
          }
        : {
            configured: false,
          },
    },
  };
}

export async function getWorkspaceReports(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  return prisma.report.findMany({
    where: { workspaceId },
    select: {
      id: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getWorkspaceThemes(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  return prisma.theme.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      isActive: true,
      createdAt: true,
      _count: { select: { feedbackThemes: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getWorkspaceChannels(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  return prisma.channel.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });
}
