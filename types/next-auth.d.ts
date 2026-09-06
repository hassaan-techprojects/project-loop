import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    workspaceId: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      workspaceId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    workspaceId: string;
  }
}