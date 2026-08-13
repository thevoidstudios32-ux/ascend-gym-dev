import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminDeleteContent,
  adminListContent,
  adminRestoreContent,
  adminSaveContent,
  adminToggleContent,
  adminUploadBannerImage,
} from "@/lib/content.functions";
import type { ContentPayload } from "@/lib/content";

type Kind = "title" | "banner";

export function useAdminContent(kind: Kind) {
  const fn = useServerFn(adminListContent);
  return useQuery({
    queryKey: ["admin-content", kind],
    queryFn: () => fn({ data: { kind } }),
    retry: false,
  });
}

/** Invalida tudo que depende do catálogo (admin + telas do usuário). */
function useInvalidateContent() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["titles"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
  };
}

export function useSaveContent() {
  const fn = useServerFn(adminSaveContent);
  const invalidate = useInvalidateContent();
  return useMutation({
    mutationFn: (data: ContentPayload) => fn({ data }),
    onSuccess: invalidate,
  });
}

export function useToggleContent() {
  const fn = useServerFn(adminToggleContent);
  const invalidate = useInvalidateContent();
  return useMutation({
    mutationFn: (data: { id: string; active: boolean }) => fn({ data }),
    onSuccess: invalidate,
  });
}

export function useDeleteContent() {
  const fn = useServerFn(adminDeleteContent);
  const invalidate = useInvalidateContent();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: invalidate,
  });
}

export function useRestoreContent() {
  const fn = useServerFn(adminRestoreContent);
  const invalidate = useInvalidateContent();
  return useMutation({ mutationFn: (id: string) => fn({ data: { id } }), onSuccess: invalidate });
}

export function useUploadBannerImage() {
  const fn = useServerFn(adminUploadBannerImage);
  return useMutation({ mutationFn: (dataUrl: string) => fn({ data: { dataUrl } }) });
}
