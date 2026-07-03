import { getOptionMetadata } from "../../../src/lib/providers/options/metadata";

export async function GET() {
  const payload = await getOptionMetadata();

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
