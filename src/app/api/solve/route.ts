import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const rootConfigPath = path.join(process.cwd(), "data", "config.json");
const fallbackConfigPath = path.join(process.cwd(), "src", "data", "config.json");

async function resolveConfigPath() {
  try {
    await fs.access(rootConfigPath);
    return rootConfigPath;
  } catch {
    try {
      await fs.access(path.dirname(rootConfigPath));
    } catch {
      await fs.mkdir(path.dirname(rootConfigPath), { recursive: true });
    }
    if (await fileExists(fallbackConfigPath)) {
      return fallbackConfigPath;
    }
    return rootConfigPath;
  }
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { group } = await request.json();

    if (!group || !["group1", "group2", "group3", "group4"].includes(group)) {
      return NextResponse.json({ error: "Invalid puzzle group name" }, { status: 400 });
    }

    const configPath = await resolveConfigPath();
    const fileContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(fileContent);

    // Update solved status
    config[group].solved = true;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
    return NextResponse.json({ success: true, group, solved: true });
  } catch (error) {
    console.error("Error solving puzzle:", error);
    return NextResponse.json({ error: "Failed to update solved status" }, { status: 500 });
  }
}
