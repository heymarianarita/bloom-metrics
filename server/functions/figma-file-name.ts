import { getCredential } from "../credentials.ts";
import type { FnHandler } from "./types.ts";

const FILE_KEY_RE = /^[A-Za-z0-9]{10,64}$/;

const handler: FnHandler = async (req) => {
  const json = (body: unknown, status = 200) => ({ status, body });

  const token = await getCredential("FIGMA_ACCESS_TOKEN");
  if (!token) {
    return json({
      configured: false,
      error: "Figma is not configured",
      details: "Add your Figma access token under Settings, Dynamic sources.",
    });
  }

  let fileKey: string | undefined;
  if (req.method === "POST") {
    fileKey = typeof req.body?.fileKey === "string" ? req.body.fileKey.trim() : undefined;
  } else {
    fileKey = req.query.get("fileKey")?.trim() ?? undefined;
  }

  if (!fileKey || !FILE_KEY_RE.test(fileKey)) {
    return json({ error: "A valid Figma file key is required" }, 400);
  }

  const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, {
    headers: { "X-Figma-Token": token },
  });
  if (!res.ok) {
    return json({ error: "Could not read that Figma file", status: res.status }, 200);
  }
  const data: any = await res.json();
  return json({
    configured: true,
    fileKey,
    name: typeof data?.name === "string" ? data.name : fileKey,
    lastModified: data?.lastModified ?? null,
  });
};

export default handler;
