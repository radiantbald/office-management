const buildingForm = document.getElementById("buildingForm");
const buildingNameInput = document.getElementById("buildingName");
const buildingAddressInput = document.getElementById("buildingAddress");
const buildingImageInput = document.getElementById("buildingImage");
const submitBtn = document.getElementById("submitBtn");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const editBuildingBtn = document.getElementById("editBuildingBtn");
const editFloorBtn = document.getElementById("editFloorBtn");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewImg = document.getElementById("imagePreviewImg");
const removeImageBtn = document.getElementById("removeImageBtn");
const imageHint = document.getElementById("imageHint");
const buildingModal = document.getElementById("buildingModal");
const floorPlanModal = document.getElementById("floorPlanModal");
const modalTitle = document.getElementById("modalTitle");
const floorsFields = document.getElementById("floorsFields");
const buildingUndergroundFloorsInput = document.getElementById("buildingUndergroundFloors");
const buildingAbovegroundFloorsInput = document.getElementById("buildingAbovegroundFloors");
const deleteBuildingBtn = document.getElementById("deleteBuildingBtn");
const buildingsGrid = document.getElementById("buildingsGrid");
const emptyState = document.getElementById("emptyState");
const statusBox = document.getElementById("status");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const buildingsPage = document.getElementById("buildingsPage");
const buildingPage = document.getElementById("buildingPage");
const floorsCount = document.getElementById("floorsCount");
const floorsList = document.getElementById("floorsList");
const floorsEmpty = document.getElementById("floorsEmpty");
const buildingStatus = document.getElementById("buildingStatus");
const floorPage = document.getElementById("floorPage");
const floorTitle = document.getElementById("floorTitle");
const floorSubtitle = document.getElementById("floorSubtitle");
const floorLevelTag = document.getElementById("floorLevelTag");
const floorStatus = document.getElementById("floorStatus");
const floorPlanPreview = document.getElementById("floorPlanPreview");
const floorPlanPlaceholder = document.getElementById("floorPlanPlaceholder");
const floorPlanCanvas = document.getElementById("floorPlanCanvas");
const floorPlanFile = document.getElementById("floorPlanFile");
const uploadFloorPlanBtn = document.getElementById("uploadFloorPlanBtn");
const breadcrumbBuildings = document.getElementById("breadcrumbBuildings");
const breadcrumbBuilding = document.getElementById("breadcrumbBuilding");

let buildings = [];
let editingId = null;
let currentBuilding = null;
let currentFloor = null;
let removeImage = false;
let previewObjectUrl = null;
const fallbackBuildingImages = [
  "/assets/buildings/1.png",
  "/assets/buildings/2.png",
  "/assets/buildings/3.png",
];

const apiRequest = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error || "Ошибка запроса";
    throw new Error(message);
  }
  return response.json();
};

const setStatus = (message, tone = "info") => {
  statusBox.textContent = message;
  statusBox.dataset.tone = tone;
};

const clearStatus = () => {
  statusBox.textContent = "";
  statusBox.dataset.tone = "";
};

const setBuildingStatus = (message, tone = "info") => {
  if (!buildingStatus) {
    return;
  }
  buildingStatus.textContent = message;
  buildingStatus.dataset.tone = tone;
};

const clearBuildingStatus = () => {
  if (!buildingStatus) {
    return;
  }
  buildingStatus.textContent = "";
  buildingStatus.dataset.tone = "";
};

const setFloorStatus = (message, tone = "info") => {
  if (!floorStatus) {
    return;
  }
  floorStatus.textContent = message;
  floorStatus.dataset.tone = tone;
};

const clearFloorStatus = () => {
  if (!floorStatus) {
    return;
  }
  floorStatus.textContent = "";
  floorStatus.dataset.tone = "";
};

const showImagePreview = (src) => {
  if (!imagePreview || !imagePreviewImg) {
    return;
  }
  imagePreviewImg.src = src;
  imagePreview.classList.remove("is-hidden");
  if (imageHint) {
    imageHint.classList.add("is-hidden");
  }
};

const clearImagePreview = () => {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  if (!imagePreview || !imagePreviewImg) {
    return;
  }
  imagePreviewImg.src = "";
  imagePreview.classList.add("is-hidden");
  if (imageHint) {
    imageHint.classList.remove("is-hidden");
  }
};

const floorPlanState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
};

const applyFloorPlanTransform = () => {
  if (!floorPlanCanvas) {
    return;
  }
  floorPlanCanvas.style.transform = `translate(${floorPlanState.translateX}px, ${floorPlanState.translateY}px) scale(${floorPlanState.scale})`;
};

const resetFloorPlanTransform = () => {
  floorPlanState.scale = 1;
  floorPlanState.translateX = 0;
  floorPlanState.translateY = 0;
  applyFloorPlanTransform();
};

const renderFloorPlan = (svgMarkup) => {
  if (!floorPlanPreview || !floorPlanPlaceholder || !floorPlanCanvas) {
    return;
  }
  floorPlanCanvas.innerHTML = "";
  if (!svgMarkup) {
    floorPlanPreview.classList.add("is-hidden");
    floorPlanPlaceholder.classList.remove("is-hidden");
    return;
  }
  floorPlanPreview.classList.remove("is-hidden");
  floorPlanPlaceholder.classList.add("is-hidden");
  floorPlanCanvas.innerHTML = svgMarkup;
  const svg = floorPlanCanvas.querySelector("svg");
  if (svg) {
    if (!svg.hasAttribute("viewBox")) {
      const width = parseFloat(svg.getAttribute("width"));
      const height = parseFloat(svg.getAttribute("height"));
      if (Number.isFinite(width) && Number.isFinite(height)) {
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      }
    }
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }
  resetFloorPlanTransform();
};

const setFormMode = (mode) => {
  if (mode === "edit") {
    submitBtn.textContent = "Сохранить";
    modalTitle.textContent = "Редактировать здание";
    if (deleteBuildingBtn) {
      deleteBuildingBtn.classList.remove("is-hidden");
    }
    if (buildingImageInput) {
      buildingImageInput.value = "";
      buildingImageInput.disabled = false;
    }
    if (floorsFields) {
      floorsFields.classList.add("is-hidden");
    }
    if (buildingUndergroundFloorsInput) {
      buildingUndergroundFloorsInput.disabled = true;
    }
    if (buildingAbovegroundFloorsInput) {
      buildingAbovegroundFloorsInput.disabled = true;
    }
    if (currentBuilding && currentBuilding.image_url) {
      showImagePreview(currentBuilding.image_url);
    } else {
      clearImagePreview();
    }
  } else {
    submitBtn.textContent = "Добавить";
    modalTitle.textContent = "Добавить здание";
    if (deleteBuildingBtn) {
      deleteBuildingBtn.classList.add("is-hidden");
    }
    if (buildingImageInput) {
      buildingImageInput.disabled = false;
    }
    if (floorsFields) {
      floorsFields.classList.remove("is-hidden");
    }
    if (buildingUndergroundFloorsInput) {
      buildingUndergroundFloorsInput.disabled = false;
    }
    if (buildingAbovegroundFloorsInput) {
      buildingAbovegroundFloorsInput.disabled = false;
    }
    clearImagePreview();
  }
};

const getBuildingImageUrl = (building) => {
  if (building.image_url) {
    return building.image_url;
  }
  const safeId = Number.isFinite(Number(building.id)) ? Number(building.id) : 0;
  const index = Math.abs(safeId) % fallbackBuildingImages.length;
  return fallbackBuildingImages[index];
};

const renderBuildings = () => {
  if (!buildingsGrid || !emptyState) {
    return;
  }
  buildingsGrid.innerHTML = "";
  if (buildings.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  buildings.forEach((building) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "building-tile";
    tile.style.setProperty("--tile-image", `url("${getBuildingImageUrl(building)}")`);
    const name = document.createElement("strong");
    name.textContent = building.name;
    tile.append(name);
    tile.addEventListener("click", () => {
      clearStatus();
      window.location.assign(`/buildings/${encodeURIComponent(building.id)}`);
    });
    buildingsGrid.appendChild(tile);
  });
};

const setPageMode = (mode) => {
  if (!buildingsPage || !buildingPage) {
    return;
  }
  if (mode === "building") {
    buildingsPage.classList.add("is-hidden");
    buildingPage.classList.remove("is-hidden");
    if (floorPage) {
      floorPage.classList.add("is-hidden");
    }
    openAddModalBtn.classList.add("is-hidden");
    if (editBuildingBtn) {
      editBuildingBtn.classList.remove("is-hidden");
    }
    if (editFloorBtn) {
      editFloorBtn.classList.add("is-hidden");
    }
    if (pageTitle) {
      pageTitle.textContent = "Здание";
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = "Просмотр этажей и планировок.";
    }
    return;
  }
  if (mode === "floor") {
    buildingsPage.classList.add("is-hidden");
    buildingPage.classList.add("is-hidden");
    if (floorPage) {
      floorPage.classList.remove("is-hidden");
    }
    openAddModalBtn.classList.add("is-hidden");
    if (editBuildingBtn) {
      editBuildingBtn.classList.add("is-hidden");
    }
    if (editFloorBtn) {
      editFloorBtn.classList.remove("is-hidden");
    }
    if (pageTitle) {
      pageTitle.textContent = "Этаж";
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = "Загрузка плана и данные этажа.";
    }
    return;
  }
  buildingsPage.classList.remove("is-hidden");
  buildingPage.classList.add("is-hidden");
  if (floorPage) {
    floorPage.classList.add("is-hidden");
  }
  openAddModalBtn.classList.remove("is-hidden");
  if (editBuildingBtn) {
    editBuildingBtn.classList.add("is-hidden");
  }
  if (editFloorBtn) {
    editFloorBtn.classList.add("is-hidden");
  }
  if (pageTitle) {
    pageTitle.textContent = "Офисные здания";
  }
  if (pageSubtitle) {
    pageSubtitle.textContent = "Добавляйте здания и выбирайте нужное из списка.";
  }
};

const renderFloors = (floors) => {
  if (!floorsList || !floorsEmpty) {
    return;
  }
  floorsList.innerHTML = "";
  if (!floors || floors.length === 0) {
    floorsList.classList.add("is-hidden");
    floorsEmpty.classList.remove("is-hidden");
    return;
  }
  floorsList.classList.remove("is-hidden");
  floorsEmpty.classList.add("is-hidden");
  floors.forEach((floor) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "floor-card";

    const header = document.createElement("div");
    header.className = "floor-header";

    const title = document.createElement("div");
    title.className = "floor-title";
    title.textContent = floor.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `Этаж ${floor.level}`;

    header.append(title, badge);

    const meta = document.createElement("div");
    meta.className = "floor-meta";
    const spacesCount = Number.isFinite(floor.spacesCount) ? floor.spacesCount : 0;
    meta.textContent = `Пространств: ${spacesCount}`;

    card.append(header, meta);
    if (currentBuilding) {
      card.addEventListener("click", () => {
        clearBuildingStatus();
        window.location.assign(
          `/buildings/${encodeURIComponent(currentBuilding.id)}/floors/${encodeURIComponent(
            floor.level
          )}`
        );
      });
    }
    floorsList.appendChild(card);
  });
};

const resetForm = (mode = "create") => {
  buildingNameInput.value = "";
  buildingAddressInput.value = "";
  if (buildingUndergroundFloorsInput) {
    buildingUndergroundFloorsInput.value = "0";
  }
  if (buildingAbovegroundFloorsInput) {
    buildingAbovegroundFloorsInput.value = "0";
  }
  if (buildingImageInput) {
    buildingImageInput.value = "";
  }
  editingId = null;
  removeImage = false;
  setFormMode(mode);
};

const openModal = (mode = "create") => {
  buildingModal.classList.add("is-open");
  buildingModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setFormMode(mode);
};

const closeModal = () => {
  buildingModal.classList.remove("is-open");
  buildingModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearStatus();
};

const resetFloorPlanUpload = () => {
  if (floorPlanFile) {
    floorPlanFile.value = "";
  }
};

const openFloorPlanModal = () => {
  if (!currentFloor) {
    setFloorStatus("Сначала выберите этаж.", "error");
    return;
  }
  clearFloorStatus();
  resetFloorPlanUpload();
  if (floorPlanModal) {
    floorPlanModal.classList.add("is-open");
    floorPlanModal.setAttribute("aria-hidden", "false");
  }
  document.body.classList.add("modal-open");
};

const closeFloorPlanModal = () => {
  if (floorPlanModal) {
    floorPlanModal.classList.remove("is-open");
    floorPlanModal.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("modal-open");
  resetFloorPlanUpload();
};

const openEditModal = () => {
  if (!currentBuilding) {
    setStatus("Не удалось определить здание для редактирования.", "error");
    return;
  }
  clearStatus();
  buildingNameInput.value = currentBuilding.name || "";
  buildingAddressInput.value = currentBuilding.address || "";
  editingId = currentBuilding.id;
  removeImage = false;
  openModal("edit");
};

const deleteCurrentBuilding = async () => {
  const targetId = editingId || (currentBuilding ? currentBuilding.id : null);
  if (!targetId) {
    setStatus("Не удалось определить здание для удаления.", "error");
    return;
  }
  const confirmed = window.confirm("Удалить здание? Это действие нельзя отменить.");
  if (!confirmed) {
    return;
  }
  if (deleteBuildingBtn) {
    deleteBuildingBtn.disabled = true;
  }
  try {
    await apiRequest(`/api/buildings/${targetId}`, { method: "DELETE" });
    closeModal();
    window.location.assign("/buildings");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    if (deleteBuildingBtn) {
      deleteBuildingBtn.disabled = false;
    }
  }
};

const refreshBuildings = async () => {
  const data = await apiRequest("/api/buildings");
  buildings = Array.isArray(data.items) ? data.items : [];
};

const getBuildingIdFromPath = () => {
  const match = window.location.pathname.match(/^\/buildings\/(\d+)(?:\/)?$/);
  if (!match) {
    return null;
  }
  const id = Number(match[1]);
  return Number.isNaN(id) ? null : id;
};

const getFloorParamsFromPath = () => {
  const match = window.location.pathname.match(/^\/buildings\/(\d+)\/floors\/(-?\d+)(?:\/)?$/);
  if (!match) {
    return null;
  }
  const buildingID = Number(match[1]);
  const floorNumber = Number(match[2]);
  if (Number.isNaN(buildingID) || Number.isNaN(floorNumber)) {
    return null;
  }
  return { buildingID, floorNumber };
};

const traceImageToSvg = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Файл не выбран."));
      return;
    }
    if (!window.ImageTracer || typeof window.ImageTracer.imageToSVG !== "function") {
      reject(new Error("Не удалось загрузить модуль преобразования изображения."));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    window.ImageTracer.imageToSVG(
      objectUrl,
      (svg) => {
        URL.revokeObjectURL(objectUrl);
        resolve(svg);
      },
      { scale: 1 }
    );
  });

const loadBuildingPage = async (buildingID) => {
  setPageMode("building");
  clearBuildingStatus();
  try {
    await refreshBuildings();
    const building = buildings.find((item) => item.id === buildingID);
    if (!building) {
      currentBuilding = null;
      if (editBuildingBtn) {
        editBuildingBtn.classList.add("is-hidden");
      }
      setBuildingStatus("Здание не найдено.", "error");
      if (pageTitle) {
        pageTitle.textContent = "Здание не найдено";
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = "Проверьте ссылку или вернитесь к списку.";
      }
      renderFloors([]);
      return;
    }
    currentBuilding = building;
    if (pageTitle) {
      pageTitle.textContent = building.name;
    }

    const floorsResponse = await apiRequest(`/api/buildings/${buildingID}/floors`);
    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    const floorsWithSpaces = await Promise.all(
      floors.map(async (floor) => {
        const spacesResponse = await apiRequest(`/api/floors/${floor.id}/spaces`);
        const spaces = Array.isArray(spacesResponse.items) ? spacesResponse.items : [];
        return { ...floor, spacesCount: spaces.length };
      })
    );
    if (floorsCount) {
      floorsCount.textContent = `${floorsWithSpaces.length}`;
    }
    renderFloors(floorsWithSpaces);
  } catch (error) {
    setBuildingStatus(error.message, "error");
  }
};

const loadFloorPage = async (buildingID, floorNumber) => {
  setPageMode("floor");
  clearFloorStatus();
  renderFloorPlan("");
  currentFloor = null;
  try {
    await refreshBuildings();
    const building = buildings.find((item) => item.id === buildingID);
    if (!building) {
      currentBuilding = null;
      setFloorStatus("Здание не найдено.", "error");
      if (pageTitle) {
        pageTitle.textContent = "Здание не найдено";
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = "Проверьте ссылку или вернитесь к списку.";
      }
      return;
    }
    currentBuilding = building;
    if (breadcrumbBuilding) {
      breadcrumbBuilding.href = `/buildings/${encodeURIComponent(building.id)}`;
      breadcrumbBuilding.textContent = building.name || "Здание";
    }
    if (pageTitle) {
      pageTitle.textContent = `Этаж ${floorNumber}`;
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = building.name || "";
    }

    const floorsResponse = await apiRequest(`/api/buildings/${buildingID}/floors`);
    const floors = Array.isArray(floorsResponse.items) ? floorsResponse.items : [];
    const floor = floors.find((item) => item.level === floorNumber);
    if (!floor) {
      setFloorStatus("Этаж не найден.", "error");
      if (floorTitle) {
        floorTitle.textContent = `Этаж ${floorNumber}`;
      }
      if (floorSubtitle) {
        floorSubtitle.textContent = building.address || "";
      }
      if (floorLevelTag) {
        floorLevelTag.textContent = `Этаж ${floorNumber}`;
      }
      return;
    }
    currentFloor = floor;
    if (floorTitle) {
      floorTitle.textContent = floor.name || `Этаж ${floor.level}`;
    }
    if (floorSubtitle) {
      floorSubtitle.textContent = "";
      floorSubtitle.textContent = "";
    }
    if (floorLevelTag) {
      floorLevelTag.textContent = `Этаж ${floor.level}`;
    }

    const floorDetails = await apiRequest(`/api/floors/${floor.id}`);
    if (floorDetails && floorDetails.plan_svg) {
      renderFloorPlan(floorDetails.plan_svg);
    } else {
      renderFloorPlan("");
    }
  } catch (error) {
    setFloorStatus(error.message, "error");
  }
};

buildingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  const name = buildingNameInput.value.trim();
  const address = buildingAddressInput.value.trim();
  if (!name || !address) {
    setStatus("Заполните название и адрес здания.", "error");
    return;
  }

  try {
    let created = false;
    if (editingId) {
      await apiRequest(`/api/buildings/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ name, address }),
      });
      if (buildingImageInput && buildingImageInput.files[0]) {
        const formData = new FormData();
        formData.append("image", buildingImageInput.files[0]);
        await apiRequest(`/api/buildings/${editingId}/image`, {
          method: "POST",
          body: formData,
        });
        removeImage = false;
      } else if (removeImage) {
        const formData = new FormData();
        formData.append("remove", "true");
        await apiRequest(`/api/buildings/${editingId}/image`, {
          method: "POST",
          body: formData,
        });
      }
    } else {
      const undergroundFloorsRaw = buildingUndergroundFloorsInput
        ? buildingUndergroundFloorsInput.value.trim()
        : "";
      const abovegroundFloorsRaw = buildingAbovegroundFloorsInput
        ? buildingAbovegroundFloorsInput.value.trim()
        : "";
      const undergroundFloors = undergroundFloorsRaw === "" ? 0 : Number(undergroundFloorsRaw);
      const abovegroundFloors = abovegroundFloorsRaw === "" ? 0 : Number(abovegroundFloorsRaw);
      if (
        !Number.isFinite(undergroundFloors) ||
        !Number.isFinite(abovegroundFloors) ||
        undergroundFloors < 0 ||
        abovegroundFloors < 0 ||
        !Number.isInteger(undergroundFloors) ||
        !Number.isInteger(abovegroundFloors)
      ) {
        setStatus("Количество этажей должно быть целым числом от 0.", "error");
        return;
      }
      const formData = new FormData();
      formData.append("name", name);
      formData.append("address", address);
      formData.append("underground_floors", String(undergroundFloors));
      formData.append("aboveground_floors", String(abovegroundFloors));
      if (buildingImageInput && buildingImageInput.files[0]) {
        formData.append("image", buildingImageInput.files[0]);
      }
      const result = await apiRequest("/api/buildings", {
        method: "POST",
        body: formData,
      });
      editingId = result.id;
      created = true;
    }
    await refreshBuildings();
    renderBuildings();
    resetForm();
    if (created) {
      closeModal();
      setStatus("Здание добавлено.", "success");
    } else {
      const updated = buildings.find((item) => item.id === editingId);
      if (updated) {
        currentBuilding = updated;
      }
      if (currentBuilding) {
        currentBuilding = { ...currentBuilding, name, address };
      }
      if (buildingTitle) {
        buildingTitle.textContent = name;
      }
      if (buildingAddressText) {
        buildingAddressText.textContent = address;
      }
      if (pageTitle) {
        pageTitle.textContent = name;
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = address;
      }
      closeModal();
      setBuildingStatus("Здание обновлено.", "success");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
});

openAddModalBtn.addEventListener("click", () => {
  clearStatus();
  resetForm("create");
  openModal("create");
});

if (editBuildingBtn) {
  editBuildingBtn.addEventListener("click", () => {
    openEditModal();
  });
}

if (buildingImageInput) {
  buildingImageInput.addEventListener("change", () => {
    if (buildingImageInput.files && buildingImageInput.files[0]) {
      removeImage = false;
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
      previewObjectUrl = URL.createObjectURL(buildingImageInput.files[0]);
      showImagePreview(previewObjectUrl);
    } else if (!removeImage && currentBuilding && currentBuilding.image_url && editingId) {
      showImagePreview(currentBuilding.image_url);
    } else {
      clearImagePreview();
    }
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    removeImage = true;
    if (buildingImageInput) {
      buildingImageInput.value = "";
    }
    clearImagePreview();
  });
}

if (deleteBuildingBtn) {
  deleteBuildingBtn.addEventListener("click", () => {
    deleteCurrentBuilding();
  });
}

if (editFloorBtn) {
  editFloorBtn.addEventListener("click", () => {
    openFloorPlanModal();
  });
}

if (uploadFloorPlanBtn) {
  uploadFloorPlanBtn.addEventListener("click", async () => {
    if (!currentFloor) {
      setFloorStatus("Сначала выберите этаж.", "error");
      return;
    }
    if (!floorPlanFile || !floorPlanFile.files || !floorPlanFile.files[0]) {
      setFloorStatus("Выберите изображение с планом.", "error");
      return;
    }
    clearFloorStatus();
    uploadFloorPlanBtn.disabled = true;
    try {
      const svgMarkup = await traceImageToSvg(floorPlanFile.files[0]);
      const updated = await apiRequest(`/api/floors/${currentFloor.id}`, {
        method: "PUT",
        body: JSON.stringify({ plan_svg: svgMarkup }),
      });
      currentFloor = updated;
      renderFloorPlan(updated.plan_svg || svgMarkup);
      floorPlanFile.value = "";
      setFloorStatus("План этажа обновлен.", "success");
      closeFloorPlanModal();
    } catch (error) {
      setFloorStatus(error.message, "error");
    } finally {
      uploadFloorPlanBtn.disabled = false;
    }
  });
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

if (floorPlanPreview && floorPlanCanvas) {
  const minScale = 0.5;
  const maxScale = 4;
  floorPlanPreview.addEventListener("wheel", (event) => {
    if (!floorPlanCanvas.firstElementChild) {
      return;
    }
    event.preventDefault();
    const rect = floorPlanPreview.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clamp(floorPlanState.scale * zoomFactor, minScale, maxScale);
    if (nextScale === floorPlanState.scale) {
      return;
    }
    const offsetX = (cursorX - floorPlanState.translateX) / floorPlanState.scale;
    const offsetY = (cursorY - floorPlanState.translateY) / floorPlanState.scale;
    floorPlanState.scale = nextScale;
    floorPlanState.translateX = cursorX - offsetX * nextScale;
    floorPlanState.translateY = cursorY - offsetY * nextScale;
    applyFloorPlanTransform();
  });

  floorPlanPreview.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (!floorPlanCanvas.firstElementChild) {
      return;
    }
    floorPlanState.isDragging = true;
    floorPlanState.dragStartX = event.clientX;
    floorPlanState.dragStartY = event.clientY;
    floorPlanState.dragOriginX = floorPlanState.translateX;
    floorPlanState.dragOriginY = floorPlanState.translateY;
    floorPlanPreview.classList.add("is-dragging");
    floorPlanPreview.setPointerCapture(event.pointerId);
  });

  floorPlanPreview.addEventListener("pointermove", (event) => {
    if (!floorPlanState.isDragging) {
      return;
    }
    floorPlanState.translateX = floorPlanState.dragOriginX + (event.clientX - floorPlanState.dragStartX);
    floorPlanState.translateY = floorPlanState.dragOriginY + (event.clientY - floorPlanState.dragStartY);
    applyFloorPlanTransform();
  });

  const stopDragging = (event) => {
    if (!floorPlanState.isDragging) {
      return;
    }
    floorPlanState.isDragging = false;
    floorPlanPreview.classList.remove("is-dragging");
    if (event && typeof event.pointerId === "number") {
      floorPlanPreview.releasePointerCapture(event.pointerId);
    }
  };

  floorPlanPreview.addEventListener("pointerup", stopDragging);
  floorPlanPreview.addEventListener("pointercancel", stopDragging);
  floorPlanPreview.addEventListener("pointerleave", stopDragging);
}

const init = async () => {
  const floorParams = getFloorParamsFromPath();
  if (floorParams) {
    await loadFloorPage(floorParams.buildingID, floorParams.floorNumber);
    return;
  }
  const buildingID = getBuildingIdFromPath();
  if (buildingID) {
    await loadBuildingPage(buildingID);
    return;
  }
  setPageMode("list");
  try {
    await refreshBuildings();
    renderBuildings();
  } catch (error) {
    setStatus(error.message, "error");
  }
};

buildingModal.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.dataset.modalClose === "true") {
    closeModal();
  }
});

if (floorPlanModal) {
  floorPlanModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.modalClose === "true") {
      closeFloorPlanModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (buildingModal.classList.contains("is-open")) {
    closeModal();
  }
  if (floorPlanModal && floorPlanModal.classList.contains("is-open")) {
    closeFloorPlanModal();
  }
});

init();
