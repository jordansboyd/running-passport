import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "strava",
      name: "Strava",
      type: "oauth",
      authorization: {
        url: "https://www.strava.com/oauth/authorize",
        params: {
          scope: "activity:read_all",
          response_type: "code",
          approval_prompt: "auto",
        },
      },
      token: {
        url: "https://www.strava.com/oauth/token",
        async request(context) {
          const res = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: process.env.STRAVA_CLIENT_ID,
              client_secret: process.env.STRAVA_CLIENT_SECRET,
              code: context.params.code,
              grant_type: "authorization_code",
            }),
          });
          const tokens = await res.json();
          return { tokens };
        },
      },
      userinfo: "https://www.strava.com/api/v3/athlete",
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      profile(profile) {
        return {
          id: String(profile.id),
          name: `${profile.firstname} ${profile.lastname}`,
          email: profile.email ?? `${profile.id}@strava.athlete`,
          image: profile.profile,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
