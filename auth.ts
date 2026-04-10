import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        // Use nodemailer directly for custom email
        const { createTransport } = await import("nodemailer");
        const transport = createTransport(provider.server as object);
        await transport.sendMail({
          to: email,
          from: provider.from,
          subject: "Inloggen bij Prisma",
          text: `Klik op de link om in te loggen:\n${url}\n\nDeze link verloopt na 24 uur.`,
          html: `
            <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#f9f6f0;">
              <div style="margin-bottom:1.5rem;">
                <span style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:1.1rem;">Prisma</span>
              </div>
              <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.4rem;margin-bottom:1rem;color:#0c0c0b;">
                Inloglink voor Prisma
              </h2>
              <p style="color:#6b6b67;margin-bottom:1.5rem;line-height:1.6;">
                Klik op de knop hieronder om in te loggen. De link is 24 uur geldig.
              </p>
              <a href="${url}" style="display:inline-block;background:#0c0c0b;color:#f9f6f0;padding:0.75rem 1.5rem;border-radius:100px;text-decoration:none;font-weight:500;font-size:0.9rem;">
                Inloggen →
              </a>
              <p style="color:#6b6b67;font-size:0.78rem;margin-top:1.5rem;">
                Als je dit niet hebt aangevraagd, kun je deze mail negeren.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        // Attach isAdmin from DB
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true },
        });
        (session.user as unknown as { isAdmin: boolean }).isAdmin =
          dbUser?.isAdmin ?? false;
      }
      return session;
    },
  },
});
