import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import {
  getAdminOverview,
  getAdminStatus,
  getAdminUserDetail,
  getAuditLog,
  listAdminUsers,
  trackLogin,
} from "@/lib/admin.functions";

export function useAdminStatus() {
  const fn = useServerFn(getAdminStatus);
  return useQuery({
    queryKey: ["admin-status"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useAdminOverview(days: number) {
  const fn = useServerFn(getAdminOverview);
  return useQuery({
    queryKey: ["admin-overview", days],
    queryFn: () => fn({ data: { days } }),
    retry: false,
  });
}

export function useAdminUsers(params: {
  page: number;
  search: string;
  filter: "all" | "new" | "active" | "returning";
  days: number;
}) {
  const fn = useServerFn(listAdminUsers);
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => fn({ data: params }),
    retry: false,
  });
}

export function useAdminUserDetail(id: string | null) {
  const fn = useServerFn(getAdminUserDetail);
  return useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => fn({ data: { id: id! } }),
    enabled: !!id,
    retry: false,
  });
}

export function useAuditLog() {
  const fn = useServerFn(getAuditLog);
  return useQuery({ queryKey: ["admin-audit"], queryFn: () => fn(), retry: false });
}

/**
 * Registra o login uma única vez por sessão do navegador. O servidor também é
 * idempotente (1 evento por dia), então refresh/abas não duplicam registros.
 */
export function useLoginTracking() {
  const fn = useServerFn(trackLogin);
  const { mutate } = useMutation({ mutationFn: () => fn(), retry: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "ascend:login-tracked";
    if (window.sessionStorage.getItem(KEY)) return;
    window.sessionStorage.setItem(KEY, "1");
    mutate();
  }, [mutate]);
}
