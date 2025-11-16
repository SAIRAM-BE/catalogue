const STORAGE_KEY = "klw-catalogue-brands-v1";

export class CatalogueStore {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  async getBrands() {
    return this._load();
  }

  async setBrands(brands) {
    this._persist(Array.isArray(brands) ? brands : []);
    return this._load();
  }

  async saveBrand(brand) {
    if (!brand || !brand.id) throw new Error("saveBrand: brand with id required");
    const brands = await this._load();
    const idx = brands.findIndex((item) => item.id === brand.id);
    if (idx >= 0) {
      brands[idx] = brand;
    } else {
      brands.push(brand);
    }
    this._persist(brands);
    return brand;
  }

  async deleteBrand(brandId) {
    const brands = await this._load();
    const filtered = brands.filter((brand) => brand.id !== brandId);
    this._persist(filtered);
    return filtered;
  }

  async addModel(brandId, model) {
    const brands = await this._load();
    const brand = brands.find((item) => item.id === brandId);
    if (!brand) throw new Error("Brand not found");
    brand.models = Array.isArray(brand.models) ? brand.models : [];
    brand.models.push(model);
    this._persist(brands);
    return model;
  }

  async updateModel(brandId, model) {
    const brands = await this._load();
    const brand = brands.find((item) => item.id === brandId);
    if (!brand) throw new Error("Brand not found");
    const idx = brand.models.findIndex((item) => item.id === model.id);
    if (idx === -1) throw new Error("Model not found");
    brand.models[idx] = model;
    this._persist(brands);
    return model;
  }

  async deleteModel(brandId, modelId) {
    const brands = await this._load();
    const brand = brands.find((item) => item.id === brandId);
    if (!brand) throw new Error("Brand not found");
    brand.models = brand.models.filter((model) => model.id !== modelId);
    this._persist(brands);
    return brand.models;
  }

  async clearAll() {
    localStorage.removeItem(this.storageKey);
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (error) {
      console.warn("Failed to load catalogue from storage", error);
      return [];
    }
  }

  _persist(brands) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(brands));
    } catch (error) {
      console.warn("Failed to persist catalogue to storage", error);
    }
  }
}

