import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const SHARED_PASSWORD = process.env.AUTH_PASSWORD || "pastorale";

const secret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "development" ? "pastorale-dev-secret" : undefined);

export const authOptions: NextAuthOptions = {
  secret,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "任意" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password || credentials.password !== SHARED_PASSWORD) {
          return null;
        }
        return {
          id: "1",
          name: credentials.username || "User",
          email: "user@pastorale.local",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id?: string;
          name?: string | null;
          email?: string | null;
        };
        u.id = token.id as string;
        u.name = token.name as string;
        u.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
