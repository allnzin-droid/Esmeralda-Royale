import { useEffect, useState } from "react";
import { store, type User, type DepositRequest, type HistoryEntry } from "./store";

function useStoreSync<T>(getter: () => T): T {
  const [v, setV] = useState<T>(getter);
  useEffect(() => {
    const h = () => setV(getter());
    window.addEventListener("casino:update", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("casino:update", h);
      window.removeEventListener("storage", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export const useUsers = () => useStoreSync<User[]>(store.getUsers);
export const useDeposits = () => useStoreSync<DepositRequest[]>(store.getDeposits);
export const useHistory = () => useStoreSync<HistoryEntry[]>(store.getHistory);
