// OAuth2 Integration

import crypto from "crypto";
import type { User } from "./types";
import { createUser, getUserByEmail, updateUser } from "./auth";

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  redirectUri: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}

// OAuth providers configuration
export const oauthProviders: Record<string, OAuthProvider> = {
  google: {
    name: "google",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google",
  },
  facebook: {
    name: "facebook",
    clientId: process.env.FACEBOOK_CLIENT_ID || "",
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    authorizationUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/v18.0/me?fields=id,name,email,picture",
    redirectUri: process.env.FACEBOOK_REDIRECT_URI || "http://localhost:3000/api/auth/callback/facebook",
  },
};

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getAuthorizationUrl(provider: string, state: string): string {
  const config = oauthProviders[provider];
  if (!config) {
    throw new Error(`OAuth provider ${provider} not configured`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: provider === "google" ? "openid email profile" : "email",
    state,
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(provider: string, code: string): Promise<string> {
  const config = oauthProviders[provider];
  if (!config) {
    throw new Error(`OAuth provider ${provider} not configured`);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function getUserInfo(provider: string, accessToken: string): Promise<OAuthUserInfo> {
  const config = oauthProviders[provider];
  if (!config) {
    throw new Error(`OAuth provider ${provider} not configured`);
  }

  const url = provider === "facebook" 
    ? `${config.userInfoUrl}&access_token=${accessToken}`
    : `${config.userInfoUrl}?access_token=${accessToken}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.statusText}`);
  }

  const data = await response.json();

  if (provider === "google") {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      emailVerified: data.verified_email,
    };
  } else if (provider === "facebook") {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture?.data?.url,
      emailVerified: true, // Facebook emails are verified
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export async function findOrCreateOAuthUser(
  provider: string,
  userInfo: OAuthUserInfo,
): Promise<User> {
  // Try to find existing user by email
  let user = await getUserByEmail(userInfo.email);

  if (user) {
    // Update user info if needed
    if (!user.name && userInfo.name) {
      user = await updateUser(user.id, { name: userInfo.name });
    }
    return user!;
  }

  // Create new user
  user = await createUser({
    email: userInfo.email,
    name: userInfo.name,
    emailVerified: userInfo.emailVerified || false,
    mfaEnabled: false,
    phoneVerified: false,
    role: "user",
    consentGiven: false,
  });

  return user;
}

// Store OAuth state (in production, use Redis with TTL)
const oauthStates = new Map<string, { provider: string; expiresAt: Date }>();

export function storeOAuthState(state: string, provider: string, expiresIn: number = 600): void {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
  oauthStates.set(state, { provider, expiresAt });
}

export function verifyOAuthState(state: string): string | null {
  const stored = oauthStates.get(state);
  if (!stored) return null;
  if (stored.expiresAt < new Date()) {
    oauthStates.delete(state);
    return null;
  }
  oauthStates.delete(state);
  return stored.provider;
}

