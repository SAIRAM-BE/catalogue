import { CatalogueStore } from "./catalogue-store.js";
import {
  cloneTemplate,
  clearChildren,
  formatSeatLabel,
  focusFirstInput,
} from "./dom-utils.js";
import { createId } from "./id.js";
import { SeedManager } from "./seed-manager.js";

export class CatalogueApp {
  constructor(config) {
    if (!config) throw new Error("CatalogueApp: config required");

    this.store = config.store ?? new CatalogueStore();

    this.brandListEl = config.brandListEl;
    this.brandSearchEl = config.brandSearchEl;
    this.detailsPanelEl = config.detailsPanelEl;
    this.addBrandBtn = config.addBrandBtn;
    this.modalBackdropEl = config.modalBackdropEl;
    this.modalTitleEl = config.modalTitleEl;
    this.modalFormEl = config.modalFormEl;
    this.closeModalBtn = config.closeModalBtn;
    this.cancelModalBtn = config.cancelModalBtn;
    this.addModelFieldBtn = config.addModelFieldBtn;
    this.modelFieldsContainerEl = config.modelFieldsContainerEl;
    this.formErrorEl = config.formErrorEl;

    this.brandFieldset = document.getElementById("brandFieldset");
    this.modelsFieldset = document.getElementById("modelsFieldset");

    this.templates = {
      brandItem: config.templates.brandItem,
      modelCard: config.templates.modelCard,
      brandDetails: document.getElementById("brandDetailsTemplate"),
      modelField: document.getElementById("modelFieldTemplate"),
    };

    if (
      !this.brandListEl ||
      !this.brandSearchEl ||
      !this.detailsPanelEl ||
      !this.addBrandBtn ||
      !this.modalBackdropEl ||
      !this.modalTitleEl ||
      !this.modalFormEl ||
      !this.closeModalBtn ||
      !this.cancelModalBtn ||
      !this.addModelFieldBtn ||
      !this.modelFieldsContainerEl ||
      !this.formErrorEl
    ) {
      throw new Error("CatalogueApp: Missing required DOM references");
    }

    this.state = {
      brands: [],
      filteredBrands: [],
      searchTerm: "",
      activeBrandId: null,
      modal: {
        isOpen: false,
        type: null,
        mode: null,
        brandId: null,
        modelId: null,
      },
    };

    this.emptyStateMarkup = this.detailsPanelEl.innerHTML;
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.seedManager = new SeedManager(this.store);
  }

  async init() {
    this.bindEvents();
    await this.loadBrands();
    this.renderBrandList();
    this.renderActiveBrand();
  }

  async loadBrands() {
    const brands = await this.seedManager.ensureSeeded();
    this.state.brands = Array.isArray(brands) ? brands : [];
    this.updateFilteredBrands();
    this.ensureActiveBrand();
  }

  bindEvents() {
    this.addBrandBtn.addEventListener("click", () => this.openBrandModal());
    this.brandSearchEl.addEventListener("input", (event) =>
      this.handleSearch(event.target.value)
    );
    this.brandListEl.addEventListener("click", (event) =>
      this.handleBrandListClick(event)
    );
    this.detailsPanelEl.addEventListener("click", (event) =>
      this.handleDetailsPanelClick(event)
    );
    this.closeModalBtn.addEventListener("click", () => this.closeModal());
    this.cancelModalBtn.addEventListener("click", () => this.closeModal());
    this.modalBackdropEl.addEventListener("click", (event) => {
      if (event.target === this.modalBackdropEl) {
        this.closeModal();
      }
    });
    this.modalFormEl.addEventListener("submit", (event) =>
      this.handleModalSubmit(event)
    );
    this.addModelFieldBtn.addEventListener("click", () =>
      this.addModelField()
    );
    this.modelFieldsContainerEl.addEventListener("click", (event) => {
      const button = event.target.closest(".remove-model-field");
      if (!button) return;
      const group = button.closest(".model-field-group");
      if (group) {
        group.remove();
      }
    });
  }

  handleKeyDown(event) {
    if (event.key === "Escape" && this.state.modal.isOpen) {
      this.closeModal();
    }
  }

  handleSearch(term) {
    this.state.searchTerm = term.toLowerCase();
    this.updateFilteredBrands();
    this.renderBrandList();
  }

  handleBrandListClick(event) {
    const actionBtn = event.target.closest(".icon-btn");
    const brandItem = event.target.closest(".brand-item");
    const brandId = brandItem?.dataset.brandId;

    if (!brandId) return;

    if (actionBtn?.classList.contains("edit-brand")) {
      this.openBrandModal({ brandId, mode: "edit" });
      return;
    }

    if (actionBtn?.classList.contains("delete-brand")) {
      this.handleBrandDelete(brandId);
      return;
    }

    const brandButton = event.target.closest(".brand-button");
    if (brandButton) {
      this.setActiveBrand(brandId);
    }
  }

  handleDetailsPanelClick(event) {
    const brandWrapper = event.target.closest(".brand-details");
    if (!brandWrapper) return;
    const brandId = brandWrapper.dataset.brandId;
    if (!brandId) return;

    if (event.target.closest(".add-model-btn")) {
      this.openModelModal({ brandId, mode: "create" });
      return;
    }

    if (event.target.closest(".edit-brand")) {
      this.openBrandModal({ brandId, mode: "edit" });
      return;
    }

    if (event.target.closest(".delete-brand")) {
      this.handleBrandDelete(brandId);
      return;
    }

    const editModelBtn = event.target.closest(".edit-model");
    if (editModelBtn) {
      const card = editModelBtn.closest(".model-card");
      const modelId = card?.dataset.modelId;
      if (modelId) {
        this.openModelModal({ brandId, modelId, mode: "edit" });
      }
      return;
    }

    const deleteModelBtn = event.target.closest(".delete-model");
    if (deleteModelBtn) {
      const card = deleteModelBtn.closest(".model-card");
      const modelId = card?.dataset.modelId;
      if (modelId) {
        this.handleModelDelete(brandId, modelId);
      }
    }
  }

  async handleBrandDelete(brandId) {
    const brand = this.state.brands.find((item) => item.id === brandId);
    if (!brand) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove ${brand.name}?`
    );
    if (!confirmed) return;

    await this.store.deleteBrand(brandId);
    this.state.brands = this.state.brands.filter((item) => item.id !== brandId);
    this.updateFilteredBrands();
    if (this.state.activeBrandId === brandId) {
      this.state.activeBrandId = this.state.brands[0]?.id ?? null;
    }
    this.renderBrandList();
    this.renderActiveBrand();
  }

  async handleModelDelete(brandId, modelId) {
    const brand = this.state.brands.find((item) => item.id === brandId);
    if (!brand) return;
    const model = brand.models?.find((item) => item.id === modelId);
    const confirmed = window.confirm(
      `Delete ${model?.name ?? "this model"} from ${brand.name}?`
    );
    if (!confirmed) return;

    await this.store.deleteModel(brandId, modelId);
    brand.models = brand.models.filter((item) => item.id !== modelId);
    this.renderActiveBrand();
  }

  openBrandModal({ brandId = null, mode = "create" } = {}) {
    this.state.modal = {
      isOpen: true,
      type: "brand",
      mode,
      brandId,
      modelId: null,
    };
    this.configureModalForBrand();
    this.clearFormError();
    this.resetModelFields();

    if (mode === "edit" && brandId) {
      const brand = this.state.brands.find((item) => item.id === brandId);
      if (!brand) return;
      this.modalTitleEl.textContent = `Edit ${brand.name}`;
      this.modalFormEl.brandName.value = brand.name;
      this.modalFormEl.brandLogo.value = brand.logoUrl ?? "";
      brand.models?.forEach((model) =>
        this.addModelField(model, { removable: true })
      );
      if (!brand.models?.length) {
        this.addModelField();
      }
    } else {
      this.modalTitleEl.textContent = "Add Brand";
      this.modalFormEl.reset();
      this.addModelField();
    }

    this.showModal();
  }

  openModelModal({ brandId, modelId = null, mode = "create" }) {
    const brand = this.state.brands.find((item) => item.id === brandId);
    if (!brand) return;
    const model =
      mode === "edit"
        ? brand.models?.find((item) => item.id === modelId)
        : null;

    this.modalFormEl.reset();
    this.state.modal = {
      isOpen: true,
      type: "model",
      mode,
      brandId,
      modelId: model?.id ?? null,
    };

    this.configureModalForModel(brand);
    this.clearFormError();
    this.resetModelFields();

    if (mode === "edit" && model) {
      this.modalTitleEl.textContent = `Edit ${model.name}`;
      this.addModelField(model, { removable: false, focus: true });
    } else {
      this.modalTitleEl.textContent = `Add Model for ${brand.name}`;
      this.addModelField({}, { removable: false, focus: true });
    }

    this.showModal();
  }

  configureModalForBrand() {
    this.brandFieldset.classList.remove("hidden");
    this.modelsFieldset.classList.remove("hidden");
    this.modelsFieldset.querySelector("legend").textContent = "Models";
    this.addModelFieldBtn.classList.remove("hidden");
    this.addModelFieldBtn.disabled = false;
    this.modalFormEl.brandName.required = true;
    this.modalFormEl.brandLogo.required = true;
  }

  configureModalForModel(brand) {
    this.brandFieldset.classList.add("hidden");
    this.modalFormEl.brandName.required = false;
    this.modalFormEl.brandLogo.required = false;
    this.addModelFieldBtn.classList.add("hidden");
    this.addModelFieldBtn.disabled = true;
    this.modelsFieldset.classList.remove("hidden");
    this.modelsFieldset.querySelector("legend").textContent = `Model for ${
      brand.name
    }`;
  }

  resetModelFields() {
    clearChildren(this.modelFieldsContainerEl);
  }

  addModelField(
    data = { name: "", seats: "", image: "" },
    options = { removable: true, focus: false }
  ) {
    const template = this.templates.modelField;
    const group = cloneTemplate(template);
    if (data.id) {
      group.dataset.modelId = data.id;
    }
    const [nameInput] = group.querySelectorAll('input[name="modelName"]');
    if (nameInput) {
      nameInput.value = data.name ?? "";
    }
    const seatsInput = group.querySelector('input[name="modelSeats"]');
    if (seatsInput) {
      seatsInput.value = data.seats ?? "";
    }
    const imgInput = group.querySelector('input[name="modelImage"]');
    if (imgInput) {
      imgInput.value = data.image ?? data.interiorImage ?? "";
    }
    const removeBtn = group.querySelector(".remove-model-field");
    if (!options.removable) {
      removeBtn.classList.add("hidden");
      removeBtn.disabled = true;
    }
    this.modelFieldsContainerEl.appendChild(group);

    if (options.focus) {
      focusFirstInput(group);
    }
  }

  showModal() {
    this.modalBackdropEl.classList.remove("hidden");
    this.modalBackdropEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", this.boundKeyHandler);
  }

  closeModal() {
    this.modalBackdropEl.classList.add("hidden");
    this.modalBackdropEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", this.boundKeyHandler);
    this.modalFormEl.reset();
    this.resetModelFields();
    this.clearFormError();
    this.modalTitleEl.textContent = "Add Brand";
    this.brandFieldset.classList.remove("hidden");
    this.modelsFieldset.classList.remove("hidden");
    this.modelsFieldset.querySelector("legend").textContent = "Models";
    this.addModelFieldBtn.classList.remove("hidden");
    this.addModelFieldBtn.disabled = false;
    this.state.modal = {
      isOpen: false,
      type: null,
      mode: null,
      brandId: null,
      modelId: null,
    };
  }

  handleModalSubmit(event) {
    event.preventDefault();
    const { modal } = this.state;
    if (modal.type === "brand") {
      this.submitBrandForm();
    } else if (modal.type === "model") {
      this.submitModelForm();
    }
  }

  submitBrandForm() {
    const name = this.modalFormEl.brandName.value.trim();
    const logo = this.modalFormEl.brandLogo.value.trim();

    if (!name) {
      this.showFormError("Brand name is required.");
      return;
    }

    if (!logo) {
      this.showFormError("Brand logo URL is required.");
      return;
    }

    if (!this.isValidUrl(logo)) {
      this.showFormError("Please provide a valid logo URL (https://).");
      return;
    }

    const models = this.collectModelFields({ requireAtLeastOne: true });
    if (!models) return;
    const normalizedModels = models.map((model) => ({
      ...model,
      id: model.id ?? createId("model"),
    }));

    const existingBrandId =
      this.state.modal.mode === "edit" ? this.state.modal.brandId : null;
    if (this.isDuplicateBrandName(name, existingBrandId)) {
      this.showFormError("Brand name already exists in the catalogue.");
      return;
    }

    if (this.hasDuplicateModelNames(normalizedModels)) {
      this.showFormError("Model names within a brand must be unique.");
      return;
    }

    const brandId =
      this.state.modal.mode === "edit" && this.state.modal.brandId
        ? this.state.modal.brandId
        : createId("brand");

    const brand = {
      id: brandId,
      name,
      logoUrl: logo,
      models: normalizedModels,
    };

    this.persistBrand(brand);
  }

  async persistBrand(brand) {
    await this.store.saveBrand(brand);
    const idx = this.state.brands.findIndex((item) => item.id === brand.id);
    if (idx >= 0) {
      this.state.brands[idx] = brand;
    } else {
      this.state.brands.push(brand);
    }
    this.updateFilteredBrands();
    this.state.activeBrandId = brand.id;
    this.renderBrandList();
    this.renderActiveBrand();
    this.closeModal();
  }

  submitModelForm() {
    const models = this.collectModelFields({
      requireAtLeastOne: true,
      expectSingle: true,
    });
    if (!models) return;
    const model = models[0];
    const brandId = this.state.modal.brandId;
    if (!brandId) return;
    const brand = this.state.brands.find((item) => item.id === brandId);
    if (!brand) return;

    const conflict = brand.models?.some(
      (item) =>
        item.name.toLowerCase() === model.name.toLowerCase() &&
        (this.state.modal.mode !== "edit" || item.id !== this.state.modal.modelId)
    );
    if (conflict) {
      this.showFormError(
        `${model.name} is already listed under ${brand.name}.`
      );
      return;
    }

    if (this.state.modal.mode === "edit") {
      model.id = this.state.modal.modelId;
      this.persistModelUpdate(brand, model);
    } else {
      model.id = createId("model");
      this.persistModelCreate(brand, model);
    }
  }

  async persistModelCreate(brand, model) {
    await this.store.addModel(brand.id, model);
    brand.models = Array.isArray(brand.models) ? brand.models : [];
    brand.models.push(model);
    this.renderActiveBrand();
    this.renderBrandList();
    this.closeModal();
  }

  async persistModelUpdate(brand, model) {
    await this.store.updateModel(brand.id, model);
    const idx = brand.models.findIndex((item) => item.id === model.id);
    if (idx >= 0) {
      brand.models[idx] = model;
    }
    this.renderActiveBrand();
    this.renderBrandList();
    this.closeModal();
  }

  collectModelFields({
    requireAtLeastOne = false,
    expectSingle = false,
  } = {}) {
    const groups = Array.from(
      this.modelFieldsContainerEl.querySelectorAll(".model-field-group")
    );
    if (!groups.length) {
      if (requireAtLeastOne) {
        this.showFormError("Please add at least one model.");
        return null;
      }
      return [];
    }

    const models = [];
    for (const group of groups) {
      const nameInput = group.querySelector('input[name="modelName"]');
      const seatsInput = group.querySelector('input[name="modelSeats"]');
      const imageInput = group.querySelector('input[name="modelImage"]');

      const name = nameInput?.value.trim();
      const seats = Number.parseInt(seatsInput?.value, 10);
      const image = imageInput?.value.trim();

      if (!name) {
        this.showFormError("Each model requires a name.");
        return null;
      }

      if (Number.isNaN(seats) || seats <= 0) {
        this.showFormError("Seats should be a positive number.");
        return null;
      }

      if (!image || !this.isValidUrl(image)) {
        this.showFormError("Provide a valid interior image URL (https://).");
        return null;
      }

      models.push({
        id: group.dataset.modelId ?? null,
        name,
        seats,
        interiorImage: image,
      });
    }

    if (expectSingle && models.length !== 1) {
      this.showFormError("Exactly one model is required.");
      return null;
    }

    this.clearFormError();
    return models;
  }

  renderBrandList() {
    clearChildren(this.brandListEl);
    if (!this.state.filteredBrands.length) {
      const placeholder = document.createElement("li");
      placeholder.className = "brand-list-empty";
      placeholder.textContent = this.state.searchTerm
        ? "No brands match your search."
        : "No brands yet. Add a brand to get started.";
      this.brandListEl.appendChild(placeholder);
      return;
    }

    this.state.filteredBrands
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((brand) => {
        const item = cloneTemplate(this.templates.brandItem);
        item.dataset.brandId = brand.id;
        const button = item.querySelector(".brand-button");
        button.dataset.brandId = brand.id;
        const nameEl = item.querySelector(".brand-name");
        nameEl.textContent = brand.name;
        const icon = item.querySelector(".brand-icon");
        icon.src = brand.logoUrl;
        icon.alt = `${brand.name} logo`;
        item
          .querySelectorAll(".icon-btn")
          .forEach((btn) => (btn.dataset.brandId = brand.id));
        if (brand.id === this.state.activeBrandId) {
          item.classList.add("is-active");
        }
        this.brandListEl.appendChild(item);
      });
  }

  renderActiveBrand() {
    const brand = this.state.brands.find(
      (item) => item.id === this.state.activeBrandId
    );
    if (!brand) {
      this.renderEmptyState();
      return;
    }

    const detail = cloneTemplate(this.templates.brandDetails);
    detail.dataset.brandId = brand.id;
    const logo = detail.querySelector(".brand-details-logo");
    logo.src = brand.logoUrl;
    logo.alt = `${brand.name} logo`;
    detail.querySelector(".brand-details-name").textContent = brand.name;
    const modelCount = brand.models?.length ?? 0;
    detail.querySelector(
      ".brand-model-count"
    ).textContent = `${modelCount} ${modelCount === 1 ? "model" : "models"}`;

    detail
      .querySelectorAll(".edit-brand, .delete-brand")
      .forEach((btn) => (btn.dataset.brandId = brand.id));
    detail.querySelector(".add-model-btn").dataset.brandId = brand.id;

    const grid = detail.querySelector(".model-grid");
    clearChildren(grid);
    if (!modelCount) {
      const empty = document.createElement("p");
      empty.className = "brand-list-empty";
      empty.textContent =
        "No models added yet. Use “Add Model” to showcase seat cover work.";
      grid.appendChild(empty);
    } else {
      brand.models
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((model) => {
          const card = cloneTemplate(this.templates.modelCard);
          card.dataset.modelId = model.id;
          const photo = card.querySelector(".model-photo");
          photo.src = model.interiorImage;
          photo.alt = `${model.name} interior`;
          card.querySelector(".model-name").textContent = model.name;
          card.querySelector(".model-seats").textContent = formatSeatLabel(
            model.seats
          );
          card
            .querySelectorAll(".edit-model, .delete-model")
            .forEach((btn) => {
              btn.dataset.brandId = brand.id;
              btn.dataset.modelId = model.id;
            });
          grid.appendChild(card);
        });
    }

    clearChildren(this.detailsPanelEl);
    this.detailsPanelEl.appendChild(detail);
  }

  renderEmptyState() {
    this.detailsPanelEl.innerHTML = this.emptyStateMarkup;
  }

  setActiveBrand(brandId) {
    if (this.state.activeBrandId === brandId) return;
    this.state.activeBrandId = brandId;
    this.renderBrandList();
    this.renderActiveBrand();
  }

  ensureActiveBrand() {
    if (!this.state.brands.length) {
      this.state.activeBrandId = null;
      return;
    }
    const exists = this.state.brands.some(
      (brand) => brand.id === this.state.activeBrandId
    );
    if (!exists) {
      this.state.activeBrandId = this.state.brands[0].id;
    }
  }

  updateFilteredBrands() {
    const term = this.state.searchTerm.trim();
    if (!term) {
      this.state.filteredBrands = [...this.state.brands];
      return;
    }
    this.state.filteredBrands = this.state.brands.filter((brand) => {
      const matchesBrand = brand.name.toLowerCase().includes(term);
      const matchesModel = brand.models?.some((model) =>
        model.name.toLowerCase().includes(term)
      );
      return matchesBrand || matchesModel;
    });
  }

  showFormError(message) {
    this.formErrorEl.textContent = message;
  }

  clearFormError() {
    this.formErrorEl.textContent = "";
  }

  isValidUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (error) {
      return false;
    }
  }

  isDuplicateBrandName(name, currentId) {
    const key = name.toLowerCase();
    return this.state.brands.some(
      (brand) => brand.name.toLowerCase() === key && brand.id !== currentId
    );
  }

  hasDuplicateModelNames(models) {
    const seen = new Set();
    for (const model of models) {
      const key = model.name.toLowerCase();
      if (seen.has(key)) {
        return true;
      }
      seen.add(key);
    }
    return false;
  }
}

