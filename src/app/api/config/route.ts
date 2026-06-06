import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const rootConfigPath = path.join(process.cwd(), "data", "config.json");
const fallbackConfigPath = path.join(process.cwd(), "src", "data", "config.json");

async function resolveConfigPath() {
  if (await fileExists(rootConfigPath)) {
    return rootConfigPath;
  }

  await fs.mkdir(path.dirname(rootConfigPath), { recursive: true });

  if (await fileExists(fallbackConfigPath)) {
    const fallbackContent = await fs.readFile(fallbackConfigPath, "utf-8");
    await fs.writeFile(rootConfigPath, fallbackContent, "utf-8");
  }

  return rootConfigPath;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const configPath = await resolveConfigPath();
    const fileContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(fileContent);
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error reading configuration:", error);
    return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const updatedConfig = await request.json();
    
    // Simple validation
    const requiredGroups = ["group1", "group2", "group3", "group4"];
    for (const group of requiredGroups) {
      if (!updatedConfig[group]) {
        return NextResponse.json({ error: `Missing configuration for ${group}` }, { status: 400 });
      }
      if (
        !updatedConfig[group].name ||
        !updatedConfig[group].image ||
        !updatedConfig[group].clue ||
        typeof updatedConfig[group].rows !== "number" ||
        typeof updatedConfig[group].cols !== "number" ||
        typeof updatedConfig[group].solved !== "boolean"
      ) {
        return NextResponse.json(
          { error: `Group ${group} must contain name, image, clue, rows, cols, and solved status` },
          { status: 400 }
        );
      }
    }

    const configPath = await resolveConfigPath();
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), "utf-8");
    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error("Error updating configuration:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
