import { PrismaClient, Role, Sentiment, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const THEMES = [
  { name: 'Onboarding', description: 'First-time user setup and activation', color: '#6366f1' },
  { name: 'Billing', description: 'Invoices, payments, pricing', color: '#f59e0b' },
  { name: 'Performance', description: 'Speed and reliability', color: '#ef4444' },
  { name: 'Mobile Experience', description: 'Mobile app/web usability', color: '#10b981' },
  { name: 'Integrations', description: 'SSO, third-party connections', color: '#8b5cf6' },
  { name: 'Support Response', description: 'Customer support quality', color: '#ec4899' },
];

const SAMPLE_CONTENT: { content: string; channel: string; sentiment: Sentiment }[] = [
  { content: 'Onboarding took forever — I could not figure out how to invite my team.', channel: 'support_ticket', sentiment: 'NEG' },
  { content: 'The new dashboard is gorgeous and finally fast. Huge improvement.', channel: 'app_store_review', sentiment: 'POS' },
  { content: 'It does the job, but the mobile experience needs work.', channel: 'nps_survey', sentiment: 'NEU' },
  { content: 'Prospect wants SSO before they will sign — third time this month.', channel: 'sales_call_note', sentiment: 'NEG' },
  { content: 'Love the new export feature, saved me an hour today.', channel: 'community_post', sentiment: 'POS' },
  { content: 'Billing page keeps timing out when I try to download an invoice.', channel: 'support_ticket', sentiment: 'NEG' },
  { content: 'Support responded within minutes, really impressed.', channel: 'support_ticket', sentiment: 'POS' },
  { content: 'App crashes every time I open it on my phone.', channel: 'app_store_review', sentiment: 'NEG' },
  { content: 'Would like better filtering options in the inbox.', channel: 'nps_survey', sentiment: 'NEU' },
  { content: 'Integration with our CRM was seamless, great job.', channel: 'community_post', sentiment: 'POS' },
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomScore(sentiment: Sentiment): number {
  if (sentiment === 'POS') return +(Math.random() * 0.5 + 0.5).toFixed(2);
  if (sentiment === 'NEG') return +(-(Math.random() * 0.5 + 0.5)).toFixed(2);
  return +(Math.random() * 0.4 - 0.2).toFixed(2);
}

async function main() {
  console.log('Seeding database...');

  const workspace = await prisma.workspace.create({
    data: { name: 'Acme SaaS Co.' },
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  await prisma.user.create({
    data: {
      name: 'Ava Admin',
      email: 'admin@acme.test',
      passwordHash,
      role: Role.ADMIN,
      workspaceId: workspace.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Alex Analyst',
      email: 'analyst@acme.test',
      passwordHash,
      role: Role.ANALYST,
      workspaceId: workspace.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Vera Viewer',
      email: 'viewer@acme.test',
      passwordHash,
      role: Role.VIEWER,
      workspaceId: workspace.id,
    },
  });

  const themes = await Promise.all(
    THEMES.map((t) =>
      prisma.theme.create({
        data: { ...t, workspaceId: workspace.id },
      })
    )
  );

  const statuses: Status[] = ['NEW', 'REVIEWED', 'ACTIONED'];

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
        workspaceId: workspace.id,
      },
    });

    const themeCount = Math.random() > 0.7 ? 2 : 1;
    const shuffledThemes = [...themes].sort(() => 0.5 - Math.random()).slice(0, themeCount);

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

  console.log('Seed complete.');
  console.log('Demo login credentials (password for all: Password123!):');
  console.log('  Admin:   admin@acme.test');
  console.log('  Analyst: analyst@acme.test');
  console.log('  Viewer:  viewer@acme.test');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });