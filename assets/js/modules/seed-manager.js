import { CatalogueStore } from "./catalogue-store.js";

export class SeedManager {
  constructor(store = new CatalogueStore()) {
    this.store = store;
    this.seedUrl = new URL("../../data/brands.json", import.meta.url);
  }

  async ensureSeeded() {
    const existing = await this.store.getBrands();
    if (existing.length) return existing;
    try {
      const response = await fetch(this.seedUrl);
      if (!response.ok) {
        throw new Error(`Failed to load seed data (${response.status})`);
      }
      const payload = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error("Seed data is not an array");
      }
      await this.store.setBrands(payload);
      return payload;
    } catch (error) {
      console.error("Failed to seed catalogue data", error);
      return existing;
    }
  }
}

