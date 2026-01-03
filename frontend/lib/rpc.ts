import { createConnectTransport } from "@connectrpc/connect-node";
import { createClient } from "@connectrpc/connect";
import { AuthService } from "@/proto/auth/v1/auth_service_pb";

// Allow self-signed certs for internal cluster communication if needed
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const transport = createConnectTransport({
  baseUrl: process.env.AUTH_SERVICE_URL!,
  httpVersion: "1.1",
});

export const authClient = createClient(AuthService, transport);
