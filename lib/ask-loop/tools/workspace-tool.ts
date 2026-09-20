import { prisma } from "@/lib/db";

export async function getWorkspaceOverview(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          feedback: true,
          themes: true,
          channels: true,
          reports: true,
        },
      },
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  return {
    id: workspace.id,
    name: workspace.name,
    createdAt: workspace.createdAt,
    counts: {
      users: workspace._count.users,
      feedback: workspace._count.feedback,
      themes: workspace._count.themes,
      channels: workspace._count.channels,
      reports: workspace._count.reports,
    },
  };
}