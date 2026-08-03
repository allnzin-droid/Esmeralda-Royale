import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "request_withdraw",
  title: "Solicitar saque",
  description: "Cria uma solicitação de saque (PIX) para o jogador autenticado. Requer saldo suficiente.",
  inputSchema: {
    amount: z.number().positive().describe("Valor do saque em reais."),
    pix_key: z.string().describe("Chave PIX para receber o valor."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ amount, pix_key }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const key = pix_key.trim();
    if (!key) return { content: [{ type: "text", text: "Chave PIX obrigatória" }], isError: true };
    if (!Number.isFinite(amount) || amount <= 0) {
      return { content: [{ type: "text", text: "Valor inválido" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data: bal } = await supabase.from("balances").select("amount").eq("user_id", userId).maybeSingle();
    if (Number(bal?.amount ?? 0) < amount) {
      return { content: [{ type: "text", text: "Saldo insuficiente" }], isError: true };
    }

    const { data, error } = await supabase
      .from("withdraw_requests")
      .insert({ user_id: userId, amount, pix_key: key, status: "pending" })
      .select("id,amount,status,created_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { request: data },
    };
  },
});
