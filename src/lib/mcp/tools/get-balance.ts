import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_balance",
  title: "Consultar saldo",
  description: "Retorna o saldo virtual atual e o perfil do jogador autenticado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile }, { data: balance, error }] = await Promise.all([
      supabase.from("profiles").select("name,email").eq("id", userId).maybeSingle(),
      supabase.from("balances").select("amount").eq("user_id", userId).maybeSingle(),
    ]);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const result = {
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      balance: Number(balance?.amount ?? 0),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
