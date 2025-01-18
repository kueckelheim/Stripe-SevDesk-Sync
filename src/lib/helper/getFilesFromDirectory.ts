import fs from "fs/promises";

export default async (dir: string) => {
  try {
    const files = await fs.readdir(dir);
    return files;
  } catch (error) {
    console.error("Error reading directory:", error);
    process.exit(1);
  }
};
