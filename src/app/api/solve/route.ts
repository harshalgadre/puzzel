import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const configPath = path.join(process.cwd(), "src", "data", "config.json");

export async function POST(request: Request) {
  try {
    const { group } = await request.json();

    if (!group || !["group1", "group2", "group3", "group4"].includes(group)) {
      return NextResponse.json({ error: "Invalid puzzle group name" }, { status: 400 });
    }

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
