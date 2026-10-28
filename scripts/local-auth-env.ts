import {
  environmentPasswordHash,
  isPasswordHash,
} from "../src/server/auth/crypto.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

/** Preserva o hash literal: a expansão de $ do Next não se aplica a senhas scrypt. */
export function localAuthEnvironment(
  root: string,
  mode: string,
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  if (environment.ADMIN_PASSWORD_HASH !== undefined)
    return {
      ...environment,
      ADMIN_PASSWORD_HASH: isPasswordHash(environment.ADMIN_PASSWORD_HASH)
        ? environmentPasswordHash(environment.ADMIN_PASSWORD_HASH)
        : environment.ADMIN_PASSWORD_HASH,
    };
  const files = [
    `.env.${mode}.local`,
    ...(mode === "test" ? [] : [".env.local"]),
    `.env.${mode}`,
    ".env",
  ];
  for (const file of files) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const parsed = parseEnv(readFileSync(path, "utf8"));
    if (parsed.ADMIN_PASSWORD_HASH !== undefined)
      return {
        ...environment,
        ADMIN_PASSWORD_HASH: isPasswordHash(parsed.ADMIN_PASSWORD_HASH)
          ? environmentPasswordHash(parsed.ADMIN_PASSWORD_HASH)
          : parsed.ADMIN_PASSWORD_HASH,
      };
  }
  return { ...environment };
}
