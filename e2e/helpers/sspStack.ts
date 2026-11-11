import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

export type SspE2eStack = {
  database_url: string;
  api_base: string;
  frontend_hint: string;
  email: string;
  password: string;
  email_b: string;
  counterparty_id: string;
};

export function loadStack(): SspE2eStack {
  const stackFile = path.join(root, ".ssp-e2e-stack.json");
  if (!fs.existsSync(stackFile)) {
    throw new Error(
      `Missing ${stackFile}. Start isolated stack with:\n` +
        `  python scripts/run_ssp_e2e_stack.py --write-env\n` +
        `from carbon-credit-backend, then run Vite with --mode ssp-e2e`
    );
  }
  const stack = JSON.parse(fs.readFileSync(stackFile, "utf8")) as SspE2eStack;
  if (!stack.api_base?.includes("127.0.0.1") && !stack.api_base?.includes("localhost")) {
    throw new Error(`REFUSE: api_base is not loopback: ${stack.api_base}`);
  }
  if (/18\.211\.235\.71|rethinkcarbon/i.test(stack.database_url || "")) {
    throw new Error("REFUSE: stack database_url looks like production");
  }
  return stack;
}

export async function apiJson(
  stack: SspE2eStack,
  route: string,
  init: RequestInit & { token?: string } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${stack.api_base}${route}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

export async function loginToken(stack: SspE2eStack, email = stack.email, password = stack.password) {
  const { res, body } = await apiJson(stack, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}: ${JSON.stringify(body)}`);
  return (body as { access_token: string }).access_token;
}
