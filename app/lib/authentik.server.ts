import { getAppUrl } from "./env.server";

type OidcConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
};

let cached: OidcConfig | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

export function getAuthentikIssuer(): string {
  return requireEnv("AUTHENTIK_ISSUER").replace(/\/$/, "");
}

async function getOidcConfig(): Promise<OidcConfig> {
  if (cached) return cached;
  const issuer = getAuthentikIssuer();
  const res = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!res.ok) {
    throw new Error(`OpenID discovery failed: ${res.status}`);
  }
  const json = (await res.json()) as Record<string, string>;
  cached = {
    authorization_endpoint: json.authorization_endpoint,
    token_endpoint: json.token_endpoint,
    userinfo_endpoint: json.userinfo_endpoint,
  };
  return cached;
}

export function getRedirectUri(): string {
  return `${getAppUrl()}/auth/callback`;
}

export async function buildAuthorizationUrl(state: string): Promise<string> {
  const { authorization_endpoint } = await getOidcConfig();
  const clientId = requireEnv("AUTHENTIK_CLIENT_ID");
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `${authorization_endpoint}?${params.toString()}`;
}

export async function exchangeCodeForUser(code: string) {
  const { token_endpoint, userinfo_endpoint } = await getOidcConfig();
  const clientId = requireEnv("AUTHENTIK_CLIENT_ID");
  const clientSecret = requireEnv("AUTHENTIK_CLIENT_SECRET");
  const redirectUri = getRedirectUri();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Token exchange failed: ${tokenRes.status} ${text}`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new Error("Token response missing access_token");
  }

  const userRes = await fetch(userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/json",
    },
  });

  if (!userRes.ok) {
    const text = await userRes.text();
    throw new Error(`Userinfo failed: ${userRes.status} ${text}`);
  }

  const profile = (await userRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
    preferred_username?: string;
  };

  return {
    sub: profile.sub,
    email: profile.email ?? profile.preferred_username ?? profile.sub,
    name: profile.name,
    username: profile.preferred_username?.trim() || undefined,
  };
}
