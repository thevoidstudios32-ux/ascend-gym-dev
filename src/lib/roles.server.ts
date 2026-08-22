/** Autorização real (banco). Nunca confie em checagens do frontend. */

export type Access = {
  roles: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export async function getAccess(context: { supabase: any; userId: string }): Promise<Access> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
  const isSuperAdmin = roles.includes("super_admin");
  return { roles, isSuperAdmin, isAdmin: isSuperAdmin || roles.includes("admin") };
}

export async function assertStaff(context: { supabase: any; userId: string }): Promise<Access> {
  const access = await getAccess(context);
  if (!access.isAdmin) throw new Error("ACCESS DENIED");
  return access;
}
