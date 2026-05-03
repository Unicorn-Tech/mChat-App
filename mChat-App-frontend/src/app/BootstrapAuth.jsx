import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

import { hydrateAuth } from "../features/auth/slice/authSlice";
import { meAPI } from "../features/auth/api/authAPI";
import { useAppDispatch } from "../hooks/useAppDispatch";
import { TOKEN_KEY } from "../services/apiClient";

export default function BootstrapAuth() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return;

    try {
      dispatch(hydrateAuth({ token: t, user: jwtDecode(t) }));
    } catch {
      dispatch(hydrateAuth({ token: t, user: null }));
    }

    let cancelled = false;
    meAPI()
      .then((res) => {
        if (!cancelled) {
          dispatch(hydrateAuth({ token: t, user: res.data?.user ?? null }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          dispatch(hydrateAuth({ token: null, user: null }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return null;
}
