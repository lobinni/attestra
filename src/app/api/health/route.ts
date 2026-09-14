import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import deployment from "../../../../deployments/studionet.json";

export const dynamic = "force-dynamic";

/**
 * Vercel health check: prove the RPC is chain 61999 and the configured live
 * contract answers with the expected protocol version. No database is involved.
 */
export async function GET() {
  try {
    const rpc = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || deployment.rpcUrl;
    const address =
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || deployment.contract.address;

    const chainResponse = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      cache: "no-store",
    });
    const chainPayload = (await chainResponse.json()) as { result?: string };
    if (Number.parseInt(chainPayload.result || "0x0", 16) !== 61999) {
      throw new Error("RPC did not report chain 61999");
    }

    const client = createClient({ chain: studionet, endpoint: rpc });
    const raw = await client.readContract({
      address: address as `0x${string}`,
      functionName: "get_protocol_info",
      args: [],
      stateStatus: "accepted",
    } as never);
    const info = (typeof raw === "string" ? JSON.parse(raw) : raw) as {
      version?: string;
      mandate_count?: number;
      current_tick?: number;
    };
    if (info.version !== deployment.contract.version) {
      throw new Error("Configured contract returned an unexpected version");
    }

    return Response.json({
      ok: true,
      network: deployment.chainName,
      chainId: deployment.chainId,
      contract: address,
      version: info.version,
      mandateCount: info.mandate_count,
      currentTick: info.current_tick,
      sourceVerified:
        address.toLowerCase() === deployment.contract.address.toLowerCase(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Live contract unavailable",
      },
      { status: 503 },
    );
  }
}
