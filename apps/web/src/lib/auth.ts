const SESSION_KEY = "haythive.session";

export type Session = {
  email: string;
  signedInAt: string;
};

let cachedRaw: string | null | undefined;
let cachedSession: Session | null = null;

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw === cachedRaw) return cachedSession;
    cachedRaw = raw;
    if (!raw) {
      cachedSession = null;
      return null;
    }
    cachedSession = JSON.parse(raw) as Session;
    return cachedSession;
  } catch {
    cachedRaw = null;
    cachedSession = null;
    return null;
  }
}

export function getSession(): Session | null {
  return readSession();
}

export function setSession(email: string) {
  const session: Session = {
    email,
    signedInAt: new Date().toISOString(),
  };
  const raw = JSON.stringify(session);
  localStorage.setItem(SESSION_KEY, raw);
  cachedRaw = raw;
  cachedSession = session;
  window.dispatchEvent(new Event("haythive-session"));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  cachedRaw = null;
  cachedSession = null;
  window.dispatchEvent(new Event("haythive-session"));
}

export function subscribeSession(onStoreChange: () => void) {
  const handler = () => {
    cachedRaw = undefined;
    onStoreChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("haythive-session", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("haythive-session", handler);
  };
}
