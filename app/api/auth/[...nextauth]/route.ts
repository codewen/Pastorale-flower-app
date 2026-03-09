import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// 通用密码（可改为环境变量 AUTH_PASSWORD，未设置则用此默认值）
const SHARED_PASSWORD =
  process.env.AUTH_PASSWORD || "pastorale";

// NextAuth 需要 NEXTAUTH_SECRET（生产必须设）；本地开发可省略，用下方 fallback
const secret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "development" ? "pastorale-dev-secret" : undefined);

const handler = NextAuth({
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
        const u = session.user as { id?: string; name?: string | null; email?: string | null };
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
});

export { handler as GET, handler as POST };
