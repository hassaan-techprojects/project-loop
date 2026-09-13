import { PrismaClient, Role, Sentiment, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const THEMES = [
  {
    name: 'Onboarding',
    description: 'First-time user setup and activation',
    color: '#6366f1',
  },
  {
    name: 'Billing',
    description: 'Invoices, payments, pricing',
    color: '#f59e0b',
  },
  {
    name: 'Performance',
    description: 'Speed and reliability',
    color: '#ef4444',
  },
  {
    name: 'Mobile Experience',
    description: 'Mobile app/web usability',
    color: '#10b981',
  },
  {
    name: 'Integrations',
    description: 'SSO, third-party connections',
    color: '#8b5cf6',
  },
  {
    name: 'Support Response',
    description: 'Customer support quality',
    color: '#ec4899',
  },
];

const CHANNELS = [
  'manual',
  'support_ticket',
  'app_store_review',
  'nps_survey',
  'sales_call',
  'sales_call_note',
  'community_post',
  'email',
  'website_feedback',
  'chat',
  'social',
  'GOOGLE_FORM',
];

const SAMPLE_CONTENT: {
  content: string;
  channel: string;
  sentiment: Sentiment;
}[] = [
  {
    content:
      'Onboarding took forever — I could not figure out how to invite my team.',
    channel: 'support_ticket',
    sentiment: 'NEG',
  },
  {
    content:
      'The new dashboard is gorgeous and finally fast. Huge improvement.',
    channel: 'app_store_review',
    sentiment: 'POS',
  },
  {
    content: 'It does the job, but the mobile experience needs work.',
    channel: 'nps_survey',
    sentiment: 'NEU',
  },
  {
    content:
      'Prospect wants SSO before they will sign — third time this month.',
    channel: 'sales_call_note',
    sentiment: 'NEG',
  },
  {
    content: 'Love the new export feature, saved me an hour today.',
    channel: 'community_post',
    sentiment: 'POS',
  },
  {
    content:
      'Billing page keeps timing out when I try to download an invoice.',
    channel: 'support_ticket',
    sentiment: 'NEG',
  },
  {
    content: 'Support responded within minutes, really impressed.',
    channel: 'support_ticket',
    sentiment: 'POS',
  },
  {
    content: 'App crashes every time I open it on my phone.',
    channel: 'app_store_review',
    sentiment: 'NEG',
  },
  {
    content: 'Would like better filtering options in the inbox.',
    channel: 'nps_survey',
    sentiment: 'NEU',
  },
  {
    content: 'Integration with our CRM was seamless, great job.',
    channel: 'community_post',
    sentiment: 'POS',
  },
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomScore(sentiment: Sentiment): number {
  if (sentiment === 'POS') {
    return +(Math.random() * 0.5 + 0.5).toFixed(2);
  }

  if (sentiment === 'NEG') {
    return +(-(Math.random() * 0.5 + 0.5)).toFixed(2);
  }

  return +(Math.random() * 0.4 - 0.2).toFixed(2);
}

async function ensureUser(
  workspaceId: string,
  name: string,
  email: string,
  role: Role,
  passwordHash: string
) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User already exists: ${email}`);
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      workspaceId,
    },
  });

  console.log(`Created user: ${email}`);

  return user;
}

async function ensureThemes(workspaceId: string) {
  for (const theme of THEMES) {
    const existingTheme = await prisma.theme.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: theme.name,
        },
      },
    });

    if (existingTheme) {
      console.log(`Theme already exists: ${theme.name}`);
      continue;
    }

    await prisma.theme.create({
      data: {
        ...theme,
        workspaceId,
        isActive: true,
      },
    });

    console.log(`Created theme: ${theme.name}`);
  }

  return prisma.theme.findMany({
    where: {
      workspaceId,
      name: {
        in: THEMES.map((theme) => theme.name),
      },
    },
  });
}

async function ensureChannels(workspaceId: string) {
  for (const channelName of CHANNELS) {
    const existingChannel = await prisma.channel.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: channelName,
        },
      },
    });

    if (existingChannel) {
      console.log(`Channel already exists: ${channelName}`);
      continue;
    }

    await prisma.channel.create({
      data: {
        name: channelName,
        workspaceId,
        isActive: true,
      },
    });

    console.log(`Created channel: ${channelName}`);
  }
}

async function seedFeedback(workspaceId: string) {
  const existingFeedbackCount = await prisma.feedback.count({
    where: {
      workspaceId,
    },
  });

  if (existingFeedbackCount > 0) {
    console.log(
      `Feedback already exists for this workspace (${existingFeedbackCount} records). Skipping sample feedback creation.`
    );
    return;
  }

  const themes = await prisma.theme.findMany({
    where: {
      workspaceId,
      name: {
        in: THEMES.map((theme) => theme.name),
      },
    },
  });

  const statuses: Status[] = ['NEW', 'REVIEWED', 'ACTIONED'];

  console.log('Creating 130 sample feedback records...');

  for (let i = 0; i < 130; i++) {
    const sample = randomFrom(SAMPLE_CONTENT);
    const sentiment = sample.sentiment;

    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const feedback = await prisma.feedback.create({
      data: {
        content: sample.content,
        channel: sample.channel,
        customerLabel: `customer-${Math.floor(Math.random() * 500)}@example.com`,
        sentiment,
        sentimentScore: randomScore(sentiment),
        status: randomFrom(statuses),
        createdAt,
        workspaceId,
      },
    });

    const themeCount = Math.random() > 0.7 ? 2 : 1;

    const shuffledThemes = [...themes]
      .sort(() => 0.5 - Math.random())
      .slice(0, themeCount);

    for (const theme of shuffledThemes) {
      await prisma.feedbackTheme.create({
        data: {
          feedbackId: feedback.id,
          themeId: theme.id,
          confidence: +(Math.random() * 0.4 + 0.6).toFixed(2),
        },
      });
    }
  }

  console.log('Created 130 sample feedback records.');
}

async function main() {
  console.log('Seeding database...');

  /*
   * Reuse the existing Acme workspace when it already exists.
   * This prevents every seed run from creating a new workspace.
   */
  let workspace = await prisma.workspace.findFirst({
    where: {
      name: 'Acme SaaS Co.',
    },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme SaaS Co.',
      },
    });

    console.log('Created workspace: Acme SaaS Co.');
  } else {
    console.log(`Workspace already exists: ${workspace.name}`);
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  await ensureUser(
    workspace.id,
    'Ava Admin',
    'admin@acme.test',
    Role.ADMIN,
    passwordHash
  );

  await ensureUser(
    workspace.id,
    'Alex Analyst',
    'analyst@acme.test',
    Role.ANALYST,
    passwordHash
  );

  await ensureUser(
    workspace.id,
    'Vera Viewer',
    'viewer@acme.test',
    Role.VIEWER,
    passwordHash
  );

  console.log('Ensuring default themes...');
  await ensureThemes(workspace.id);

  console.log('Ensuring default channels...');
  await ensureChannels(workspace.id);

  await seedFeedback(workspace.id);

  console.log('');
  console.log('Seed complete.');
  console.log('');
  console.log(
    'Demo login credentials (password for all: Password123!):'
  );
  console.log('  Admin:   admin@acme.test');
  console.log('  Analyst: analyst@acme.test');
  console.log('  Viewer:  viewer@acme.test');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });