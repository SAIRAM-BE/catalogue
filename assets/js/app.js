import { CatalogueApp } from "./modules/catalogue-app.js";

document.addEventListener("DOMContentLoaded", () => {
  const app = new CatalogueApp({
    brandListEl: document.getElementById("brandList"),
    brandSearchEl: document.getElementById("brandSearch"),
    detailsPanelEl: document.querySelector(".model-details-panel"),
    addBrandBtn: document.getElementById("addBrandBtn"),
    modalBackdropEl: document.getElementById("modalBackdrop"),
    modalTitleEl: document.getElementById("modalTitle"),
    modalFormEl: document.getElementById("modalForm"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    cancelModalBtn: document.getElementById("cancelModalBtn"),
    addModelFieldBtn: document.getElementById("addModelFieldBtn"),
    modelFieldsContainerEl: document.getElementById("modelFields"),
    formErrorEl: document.getElementById("formError"),
    templates: {
      brandItem: document.getElementById("brandListItemTemplate"),
      modelCard: document.getElementById("modelCardTemplate"),
    },
  });

  app.init();
});

