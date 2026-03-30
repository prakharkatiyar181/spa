const AUTH_STORAGE_KEY = 'spa-auth-session';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadAuthState = () => {
  if (!canUseStorage()) return undefined;

  try {
    const serialized = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!serialized) return undefined;

    const parsed = JSON.parse(serialized);
    if (!parsed?.token) return undefined;

    return {
      auth: {
        token: parsed.token,
        user: parsed.user || null,
        status: 'succeeded',
        error: null,
      },
    };
  } catch (error) {
    return undefined;
  }
};

export const saveAuthState = (authState) => {
  if (!canUseStorage()) return;

  try {
    if (!authState?.token) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    const serialized = JSON.stringify({
      token: authState.token,
      user: authState.user,
    });

    window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  } catch (error) {}
};
