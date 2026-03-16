import useSWR from "swr";
import { getMe } from "@/lib/api/auth";
import type { User } from "@/types/api";
import { useAppStore } from "@/store/appStore";
import { useEffect } from "react";

interface UseAuthResult {
  user: User | undefined;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useAuth(): UseAuthResult {
  const setUser = useAppStore((s) => s.setUser);

  const { data, error, isLoading, mutate } = useSWR<User>(
    "/auth/me",
    () => getMe(),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 60_000,
    }
  );

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  return {
    user: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}
