import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_requests",
  title: "Depósitos e saques",
  description: "Lista as solicitações de depósito e/ou saque do jogador autenticado.",
  inputSchema: {
    kind: z.enum(["deposit", "withdraw", "all"]).optional().describe("Tipo de solicitação (padrão 'all')."),
    status: z.string().optional().describe("Filtrar por status, por exemplo 'pending' ou 'approved'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const want = kind ?? "all";

    const load = async (table: "deposit_requests" | "withdraw_requests") => {
      let q = supabase
        .from(table)
        .select("id,amount,status,created_at,resolved_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    };

    try {
      const result = {
        deposits: want === "withdraw" ? [] : await load("deposit_requests"),
        withdrawals: want === "deposit" ? [] : await load("withdraw_requests"),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    } catch (e) {
      return { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true };
    }
  },
});
