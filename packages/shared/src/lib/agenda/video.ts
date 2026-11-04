/** Only a configured HTTPS origin may supply scripts and embedded video. */
export function jitsiOrigin(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname !== "/" ||
      !/^[a-z0-9.-]+$/i.test(u.hostname) ||
      !u.hostname.includes(".") ||
      /^\d+(\.\d+){3}$/.test(u.hostname) ||
      /(^|\.)(localhost|local|internal)$/.test(u.hostname)
    )
      return null;
    return u.origin;
  } catch {
    return null;
  }
}
export function jitsiRoom(url: string, origin: string | null): string | null {
  if (!origin) return null;
  try {
    const u = new URL(url);
    if (u.origin !== origin || u.search || u.hash || u.username || u.password)
      return null;
    return /^\/pitter-[a-f0-9]{48}$/.test(u.pathname)
      ? u.pathname.slice(1)
      : null;
  } catch {
    return null;
  }
}
