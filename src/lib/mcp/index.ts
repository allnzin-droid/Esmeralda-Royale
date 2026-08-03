import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getBalanceTool from "./tools/get-balance";
import getHistoryTool from "./tools/get-history";
import listRequestsTool from "./tools/list-requests";
import requestWithdrawTool from "./tools/request-withdraw";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "esmeralda-royale",
  title: "Esmeralda Royale",
  version: "0.1.0",
  instructions:
    "Ferramentas do Esmeralda Royale para o jogador autenticado: consultar saldo, ver histórico de jogadas, listar depósitos/saques e solicitar um saque via PIX.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getBalanceTool, getHistoryTool, listRequestsTool, requestWithdrawTool],
});
