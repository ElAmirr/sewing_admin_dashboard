import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("data");

class MetadataRepository {
  constructor() {
    this.cache = {
      machines: [],
      operators: [],
      supervisors: [],
    };
    this.lastLoaded = 0;
    this.CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
  }

  async loadIfNeeded() {
    const now = Date.now();
    if (this.cache.machines.length > 0 && now - this.lastLoaded < this.CACHE_TTL) {
      return;
    }

    try {
      const [machines, operators, supervisors] = await Promise.all([
        this.readJSON("machines.json"),
        this.readJSON("operators.json"),
        this.readJSON("supervisors.json"),
      ]);

      this.cache = { machines, operators, supervisors };
      this.lastLoaded = now;
      console.log("✅ Metadata loaded into cache");
    } catch (error) {
      console.error("❌ Failed to load metadata:", error);
    }
  }

  async readJSON(filename) {
    try {
      const filePath = path.join(DATA_DIR, filename);
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async getMachines() {
    await this.loadIfNeeded();
    return this.cache.machines;
  }

  async getOperators() {
    await this.loadIfNeeded();
    return this.cache.operators;
  }

  async getSupervisors() {
    await this.loadIfNeeded();
    return this.cache.supervisors;
  }
}

export const metadataRepository = new MetadataRepository();
