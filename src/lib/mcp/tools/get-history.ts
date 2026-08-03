import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_history",
  title: "Histórico de jogadas",
  description: "Lista as jogadas e movimentações mais recentes do jogador autenticado.",
  inputSchema: {
    limit: z.number().int().optional().describe("Quantas entradas retornar (padrão 20, máximo 100)."),
    game: z.string().optional().describe("Filtrar por nome do jogo, por exemplo 'Cavalos'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, game }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const take = Math.min(Math.max(Math.trunc(limit ?? 20), 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("history")
      .select("id,type,game,amount,balance_after,note,created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(take);
    if (game) query = query.eq("game", game);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { entries: data ?? [] },
    };
  },
});
