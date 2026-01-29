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
const floorPlanLayout = document.getElementById("floorPlanLayout");
const floorPlanActions = document.getElementById("floorPlanActions");
const floorPlanActionLabel = document.getElementById("floorPlanActionLabel");
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
const cancelFloorEditBtn = document.getElementById("cancelFloorEditBtn");
const addSpaceBtn = document.getElementById("addSpaceBtn");
const spaceModal = document.getElementById("spaceModal");
const spaceForm = document.getElementById("spaceForm");
const spaceNameField = document.getElementById("spaceNameField");
const spaceColorInput = document.getElementById("spaceColorInput");
const spaceSaveBtn = document.getElementById("spaceSaveBtn");
const spaceModalCloseBtn = document.getElementById("spaceModalCloseBtn");
const spaceCancelBtn = document.getElementById("spaceCancelBtn");
const spaceStatus = document.getElementById("spaceStatus");
const breadcrumbBuildings = document.getElementById("breadcrumbBuildings");
const breadcrumbBuilding = document.getElementById("breadcrumbBuilding");

let buildings = [];
let editingId = null;
let currentBuilding = null;
let currentFloor = null;
let isFloorEditing = false;
let hasFloorPlan = false;
let removeImage = false;
let previewObjectUrl = null;
const svgNamespace = "http://www.w3.org/2000/svg";
const lassoDefaults = {
  kind: "polygon",
  fillOpacity: 0.35,
};
const lassoState = {
  active: false,
  points: [],
  pendingPoints: null,
  svg: null,
  spacesLayer: null,
  previewLayer: null,
  previewPolygon: null,
  handlesLayer: null,
};
const spaceEditDefaults = {
  handleRadius: 4,
  edgeSnapDistance: 8,
};
const spaceEditState = {
  selectedPolygon: null,
  selectedLabel: null,
  handleElements: [],
  points: [],
  draggingIndex: null,
  isDragging: false,
  dragPointerId: null,
  lastHandleClickTime: 0,
  lastHandleClickIndex: null,
};
let floorPlanDirty = false;
const addSpaceBtnLabel = addSpaceBtn ? addSpaceBtn.textContent : "Добавить пространство";
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

const setSpaceStatus = (message, tone = "info") => {
  if (!spaceStatus) {
    return;
  }
  spaceStatus.textContent = message;
  spaceStatus.dataset.tone = tone;
};

const clearSpaceStatus = () => {
  if (!spaceStatus) {
    return;
  }
  spaceStatus.textContent = "";
  spaceStatus.dataset.tone = "";
};

const openSpaceModal = () => {
  if (!spaceModal) {
    return;
  }
  spaceModal.classList.add("is-open");
  spaceModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  clearSpaceStatus();
  if (spaceNameField) {
    spaceNameField.value = "";
    spaceNameField.focus();
  }
  if (spaceColorInput && !spaceColorInput.value) {
    spaceColorInput.value = "#60a5fa";
  }
};

const closeSpaceModal = () => {
  if (!spaceModal) {
    return;
  }
  spaceModal.classList.remove("is-open");
  spaceModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearSpaceStatus();
  if (spaceForm) {
    spaceForm.reset();
  }
  lassoState.pendingPoints = null;
  lassoState.points = [];
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

const ensureSpaceLayers = (svg) => {
  if (!svg) {
    return;
  }
  let spacesLayer = svg.querySelector("#spacesLayer");
  if (!spacesLayer) {
    spacesLayer = document.createElementNS(svgNamespace, "g");
    spacesLayer.setAttribute("id", "spacesLayer");
    svg.appendChild(spacesLayer);
  }
  let previewLayer = svg.querySelector("#lassoLayer");
  if (!previewLayer) {
    previewLayer = document.createElementNS(svgNamespace, "g");
    previewLayer.setAttribute("id", "lassoLayer");
    svg.appendChild(previewLayer);
  }
  let handlesLayer = svg.querySelector("#spaceHandlesLayer");
  if (!handlesLayer) {
    handlesLayer = document.createElementNS(svgNamespace, "g");
    handlesLayer.setAttribute("id", "spaceHandlesLayer");
    svg.appendChild(handlesLayer);
  }
  lassoState.svg = svg;
  lassoState.spacesLayer = spacesLayer;
  lassoState.previewLayer = previewLayer;
  lassoState.handlesLayer = handlesLayer;
};

const resetLassoPreview = () => {
  if (lassoState.previewPolygon) {
    lassoState.previewPolygon.remove();
  }
  lassoState.previewPolygon = null;
};

const setLassoActive = (active) => {
  lassoState.active = active;
  if (floorPlanPreview) {
    floorPlanPreview.classList.toggle("is-lasso", active);
  }
  if (addSpaceBtn) {
    addSpaceBtn.textContent = active ? "Отменить выделение" : addSpaceBtnLabel;
    addSpaceBtn.setAttribute("aria-pressed", String(active));
  }
};

const getSvgPoint = (event) => {
  const svg = lassoState.svg;
  if (!svg) {
    return null;
  }
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
};

const updateLassoPreview = (cursorPoint) => {
  if (!lassoState.previewPolygon) {
    return;
  }
  const points = [...lassoState.points];
  if (cursorPoint) {
    points.push(cursorPoint);
  }
  if (points.length === 0) {
    lassoState.previewPolygon.removeAttribute("points");
    return;
  }
  lassoState.previewPolygon.setAttribute(
    "points",
    points.map((point) => `${point.x},${point.y}`).join(" ")
  );
};

const startLassoMode = () => {
  if (!currentFloor) {
    setFloorStatus("Сначала выберите этаж.", "error");
    return;
  }
  if (!isFloorEditing) {
    setFloorStatus("Сначала включите режим редактирования.", "error");
    return;
  }
  if (!hasFloorPlan || !lassoState.svg) {
    setFloorStatus("Сначала загрузите план этажа.", "error");
    return;
  }
  setLassoActive(true);
  clearSpaceSelection();
  ensureSpaceLayers(lassoState.svg);
  lassoState.points = [];
  lassoState.pendingPoints = null;
  resetLassoPreview();
  if (lassoState.previewLayer) {
    const previewPolygon = document.createElementNS(svgNamespace, "polygon");
    previewPolygon.classList.add("lasso-preview");
    lassoState.previewLayer.appendChild(previewPolygon);
    lassoState.previewPolygon = previewPolygon;
  }
  setFloorStatus(
    "Кликните по плану, чтобы поставить точки. Двойной клик — завершить, Esc — отменить.",
    "info"
  );
};

const cancelLassoMode = (message = "") => {
  if (!lassoState.active && lassoState.points.length === 0) {
    return;
  }
  setLassoActive(false);
  lassoState.points = [];
  lassoState.pendingPoints = null;
  resetLassoPreview();
  if (message) {
    setFloorStatus(message, "info");
  }
};

const finishLassoMode = () => {
  if (lassoState.points.length < 3) {
    setFloorStatus("Нужно минимум 3 точки для пространства.", "error");
    return;
  }
  lassoState.pendingPoints = [...lassoState.points];
  setLassoActive(false);
  resetLassoPreview();
  openSpaceModal();
};

const createSpacePolygon = (points, name, color) => {
  if (!lassoState.svg || !lassoState.spacesLayer || points.length < 3) {
    return null;
  }
  const polygon = document.createElementNS(svgNamespace, "polygon");
  polygon.classList.add("space-polygon");
  polygon.setAttribute(
    "points",
    points.map((point) => `${point.x},${point.y}`).join(" ")
  );
  polygon.setAttribute("fill", color);
  polygon.setAttribute("data-space-name", name);
  polygon.setAttribute("data-space-color", color);

  const centroid = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= points.length;
  centroid.y /= points.length;

  const label = document.createElementNS(svgNamespace, "text");
  label.classList.add("space-label");
  label.setAttribute("x", centroid.x.toString());
  label.setAttribute("y", centroid.y.toString());
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.setAttribute("data-space-name", name);
  label.textContent = name;

  lassoState.spacesLayer.appendChild(polygon);
  lassoState.spacesLayer.appendChild(label);
  return { polygon, label };
};

const escapeSelectorValue = (value) => {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
};

const parsePolygonPoints = (polygon) => {
  const raw = polygon.getAttribute("points");
  if (!raw) {
    return [];
  }
  return raw
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map((value) => Number(value));
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return { x, y };
    })
    .filter(Boolean);
};

const stringifyPoints = (points) =>
  points.map((point) => `${point.x},${point.y}`).join(" ");

const stripEditorArtifacts = (svg) => {
  if (!svg) {
    return;
  }
  const handlesLayer = svg.querySelector("#spaceHandlesLayer");
  if (handlesLayer) {
    handlesLayer.remove();
  }
  svg.querySelectorAll(".space-handle").forEach((handle) => handle.remove());
  svg.querySelectorAll(".space-polygon.is-selected").forEach((polygon) => {
    polygon.classList.remove("is-selected");
  });
};

const getCleanFloorPlanMarkup = () => {
  if (!lassoState.svg) {
    return "";
  }
  const clone = lassoState.svg.cloneNode(true);
  stripEditorArtifacts(clone);
  return new XMLSerializer().serializeToString(clone);
};

const getPolygonLabel = (polygon) => {
  if (!lassoState.spacesLayer) {
    return null;
  }
  const name = polygon.getAttribute("data-space-name");
  if (name) {
    const escapedName = escapeSelectorValue(name);
    const found = lassoState.spacesLayer.querySelector(
      `.space-label[data-space-name="${escapedName}"]`
    );
    if (found) {
      return found;
    }
  }
  const nextElement = polygon.nextElementSibling;
  if (nextElement && nextElement.classList.contains("space-label")) {
    if (name) {
      nextElement.setAttribute("data-space-name", name);
    }
    return nextElement;
  }
  return null;
};

const updatePolygonLabelPosition = (polygon, points) => {
  const label = getPolygonLabel(polygon);
  if (!label || points.length === 0) {
    return;
  }
  const centroid = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= points.length;
  centroid.y /= points.length;
  label.setAttribute("x", centroid.x.toString());
  label.setAttribute("y", centroid.y.toString());
};

const clearSpaceSelection = () => {
  if (spaceEditState.handleElements.length > 0) {
    spaceEditState.handleElements.forEach((handle) => handle.remove());
  }
  if (spaceEditState.selectedPolygon) {
    spaceEditState.selectedPolygon.classList.remove("is-selected");
  }
  spaceEditState.selectedPolygon = null;
  spaceEditState.selectedLabel = null;
  spaceEditState.handleElements = [];
  spaceEditState.points = [];
  spaceEditState.draggingIndex = null;
  spaceEditState.isDragging = false;
  spaceEditState.dragPointerId = null;
};

const rebuildSpaceHandles = () => {
  if (!lassoState.handlesLayer) {
    return;
  }
  spaceEditState.handleElements.forEach((handle) => handle.remove());
  spaceEditState.handleElements = spaceEditState.points.map((point, index) => {
    const handle = document.createElementNS(svgNamespace, "circle");
    handle.classList.add("space-handle");
    handle.setAttribute("cx", point.x.toString());
    handle.setAttribute("cy", point.y.toString());
    handle.setAttribute("r", spaceEditDefaults.handleRadius.toString());
    handle.dataset.index = String(index);
    handle.addEventListener("pointerdown", (event) => {
      if (!isFloorEditing || lassoState.active) {
        return;
      }
      const now = event.timeStamp || Date.now();
      const isDoubleClick =
        spaceEditState.lastHandleClickIndex === index &&
        now - spaceEditState.lastHandleClickTime < 300;
      spaceEditState.lastHandleClickTime = now;
      spaceEditState.lastHandleClickIndex = index;
      if (isDoubleClick) {
        event.preventDefault();
        event.stopPropagation();
        if (spaceEditState.points.length <= 3) {
          setFloorStatus("У пространства должно быть минимум 3 точки.", "error");
          return;
        }
        spaceEditState.points.splice(index, 1);
        updateSelectedPolygon();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      spaceEditState.draggingIndex = index;
      spaceEditState.isDragging = true;
      spaceEditState.dragPointerId = event.pointerId;
      if (floorPlanPreview) {
        floorPlanPreview.setPointerCapture(event.pointerId);
      }
    });
    lassoState.handlesLayer.appendChild(handle);
    return handle;
  });
};

const updateSpaceHandlesPosition = () => {
  if (spaceEditState.handleElements.length === 0) {
    return;
  }
  spaceEditState.handleElements.forEach((handle, index) => {
    const point = spaceEditState.points[index];
    if (!point) {
      return;
    }
    handle.setAttribute("cx", point.x.toString());
    handle.setAttribute("cy", point.y.toString());
  });
};

const updateSelectedPolygon = () => {
  if (!spaceEditState.selectedPolygon) {
    return;
  }
  spaceEditState.selectedPolygon.setAttribute("points", stringifyPoints(spaceEditState.points));
  updatePolygonLabelPosition(spaceEditState.selectedPolygon, spaceEditState.points);
  if (spaceEditState.handleElements.length !== spaceEditState.points.length) {
    rebuildSpaceHandles();
  } else {
    updateSpaceHandlesPosition();
  }
  floorPlanDirty = true;
};

const selectSpacePolygon = (polygon) => {
  clearSpaceSelection();
  spaceEditState.selectedPolygon = polygon;
  spaceEditState.selectedLabel = getPolygonLabel(polygon);
  spaceEditState.points = parsePolygonPoints(polygon);
  polygon.classList.add("is-selected");
  rebuildSpaceHandles();
};

const distanceToSegment = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.min(Math.max(t, 0), 1);
  const projX = start.x + clamped * dx;
  const projY = start.y + clamped * dy;
  return Math.hypot(point.x - projX, point.y - projY);
};

const findEdgeInsertionIndex = (points, cursorPoint, tolerance = spaceEditDefaults.edgeSnapDistance) => {
  if (points.length < 2) {
    return null;
  }
  let bestIndex = null;
  let bestDistance = Infinity;
  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    const distance = distanceToSegment(cursorPoint, point, nextPoint);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  if (bestDistance <= tolerance) {
    return bestIndex;
  }
  return null;
};

const getEdgeSnapTolerance = () => {
  const scale = floorPlanState.scale || 1;
  const scaled = spaceEditDefaults.edgeSnapDistance / Math.max(scale, 0.1);
  return Math.min(Math.max(scaled, 4), 24);
};

const findSpacePolygonFromEvent = (event) => {
  const target = event.target;
  if (target instanceof SVGElement) {
    const polygonTarget =
      typeof target.closest === "function" ? target.closest(".space-polygon") : null;
    if (polygonTarget && polygonTarget instanceof SVGElement) {
      return polygonTarget;
    }
    if (target.classList.contains("space-polygon")) {
      return target;
    }
  }
  if (typeof event.composedPath === "function") {
    const path = event.composedPath();
    const polygonInPath = path.find(
      (node) => node instanceof SVGElement && node.classList?.contains("space-polygon")
    );
    if (polygonInPath) {
      return polygonInPath;
    }
  }
  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    if (hit instanceof SVGElement) {
      const polygonHit =
        typeof hit.closest === "function" ? hit.closest(".space-polygon") : null;
      if (polygonHit && polygonHit instanceof SVGElement) {
        return polygonHit;
      }
      if (hit.classList.contains("space-polygon")) {
        return hit;
      }
    }
  }
  return null;
};

const bindSpaceInteractions = (svg) => {
  if (!svg || svg.dataset.spaceInteractions === "true") {
    return;
  }
  svg.dataset.spaceInteractions = "true";
  svg.addEventListener("dblclick", (event) => {
    if (!isFloorEditing || lassoState.active) {
      return;
    }
    const polygon = findSpacePolygonFromEvent(event);
    if (polygon) {
      event.preventDefault();
      event.stopPropagation();
      selectSpacePolygon(polygon);
    }
  });
  svg.addEventListener("click", (event) => {
    if (!isFloorEditing || lassoState.active) {
      return;
    }
    if (event.detail && event.detail > 1) {
      return;
    }
    const target = event.target;
    const handleTarget =
      target instanceof SVGElement && typeof target.closest === "function"
        ? target.closest(".space-handle")
        : null;
    if (handleTarget || (target instanceof SVGElement && target.classList.contains("space-handle"))) {
      return;
    }
    const polygon = findSpacePolygonFromEvent(event);
    if (polygon) {
      event.preventDefault();
      event.stopPropagation();
      if (spaceEditState.selectedPolygon !== polygon) {
        selectSpacePolygon(polygon);
      }
      const point = getSvgPoint(event);
      if (!point) {
        return;
      }
      const tolerance = getEdgeSnapTolerance();
      const insertionIndex = findEdgeInsertionIndex(spaceEditState.points, point, tolerance);
      if (insertionIndex === null) {
        return;
      }
      spaceEditState.points.splice(insertionIndex + 1, 0, point);
      updateSelectedPolygon();
      return;
    }
    clearSpaceSelection();
  });
};

const updateFloorPlanActionLabel = () => {
  if (uploadFloorPlanBtn) {
    uploadFloorPlanBtn.textContent = hasFloorPlan ? "Изменить план" : "Загрузить план";
  }
  if (floorPlanActionLabel) {
    floorPlanActionLabel.textContent = hasFloorPlan
      ? "Новый план этажа (изображение)"
      : "План этажа (изображение)";
  }
};

const resetFloorEditForm = () => {
  if (floorPlanFile) {
    floorPlanFile.value = "";
  }
  cancelLassoMode();
  closeSpaceModal();
};

const setFloorEditMode = (editing) => {
  isFloorEditing = editing;
  if (floorPlanLayout) {
    floorPlanLayout.classList.toggle("is-editing", editing);
  }
  if (floorPlanActions) {
    floorPlanActions.classList.toggle("is-hidden", !editing);
    floorPlanActions.setAttribute("aria-hidden", String(!editing));
  }
  if (editFloorBtn) {
    editFloorBtn.textContent = editing ? "Сохранить" : "Редактировать";
    editFloorBtn.classList.toggle("primary", editing);
    editFloorBtn.classList.toggle("ghost", !editing);
  }
  if (!editing) {
    clearSpaceSelection();
    resetFloorEditForm();
  }
};

const renderFloorPlan = (svgMarkup) => {
  if (!floorPlanPreview || !floorPlanPlaceholder || !floorPlanCanvas) {
    return;
  }
  floorPlanDirty = false;
  clearSpaceSelection();
  hasFloorPlan = Boolean(svgMarkup);
  updateFloorPlanActionLabel();
  floorPlanCanvas.innerHTML = "";
  if (!svgMarkup) {
    floorPlanPreview.classList.add("is-hidden");
    floorPlanPlaceholder.classList.remove("is-hidden");
    lassoState.svg = null;
    lassoState.spacesLayer = null;
    lassoState.previewLayer = null;
    return;
  }
  floorPlanPreview.classList.remove("is-hidden");
  floorPlanPlaceholder.classList.add("is-hidden");
  floorPlanCanvas.innerHTML = svgMarkup;
  const svg = floorPlanCanvas.querySelector("svg");
  if (svg) {
    stripEditorArtifacts(svg);
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
    ensureSpaceLayers(svg);
    bindSpaceInteractions(svg);
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
    setFloorEditMode(false);
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
    setFloorEditMode(false);
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
  setFloorEditMode(false);
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
    const planSvg = floorDetails && floorDetails.plan_svg ? floorDetails.plan_svg : "";
    currentFloor = { ...floor, plan_svg: planSvg };
    renderFloorPlan(planSvg);
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
  editFloorBtn.addEventListener("click", async () => {
    if (!currentFloor) {
      setFloorStatus("Сначала выберите этаж.", "error");
      return;
    }
    clearFloorStatus();
    if (isFloorEditing) {
      if (floorPlanDirty && lassoState.svg) {
        editFloorBtn.disabled = true;
        try {
          const svgMarkup = getCleanFloorPlanMarkup();
          const updated = await apiRequest(`/api/floors/${currentFloor.id}`, {
            method: "PUT",
            body: JSON.stringify({ plan_svg: svgMarkup }),
          });
          currentFloor = { ...currentFloor, plan_svg: updated.plan_svg || svgMarkup };
          floorPlanDirty = false;
          setFloorStatus("Изменения плана сохранены.", "success");
        } catch (error) {
          setFloorStatus(error.message, "error");
          return;
        } finally {
          editFloorBtn.disabled = false;
        }
      }
      setFloorEditMode(false);
      return;
    }
    setFloorEditMode(true);
  });
}

if (cancelFloorEditBtn) {
  cancelFloorEditBtn.addEventListener("click", () => {
    setFloorEditMode(false);
  });
}

if (uploadFloorPlanBtn) {
  uploadFloorPlanBtn.addEventListener("click", async () => {
    if (!currentFloor) {
      setFloorStatus("Сначала выберите этаж.", "error");
      return;
    }
    if (!isFloorEditing) {
      setFloorStatus("Сначала включите режим редактирования.", "error");
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
      currentFloor = { ...currentFloor, plan_svg: updated.plan_svg || svgMarkup };
      renderFloorPlan(updated.plan_svg || svgMarkup);
      floorPlanFile.value = "";
      setFloorStatus("План этажа обновлен.", "success");
    } catch (error) {
      setFloorStatus(error.message, "error");
    } finally {
      uploadFloorPlanBtn.disabled = false;
    }
  });
}

if (addSpaceBtn) {
  addSpaceBtn.addEventListener("click", async () => {
    if (lassoState.active) {
      cancelLassoMode("Выделение отменено.");
      return;
    }
    clearFloorStatus();
    startLassoMode();
  });
}

if (spaceForm) {
  spaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentFloor) {
      setSpaceStatus("Сначала выберите этаж.", "error");
      return;
    }
    const points = lassoState.pendingPoints;
    if (!points || points.length < 3) {
      setSpaceStatus("Сначала выделите область на плане.", "error");
      return;
    }
    const name = spaceNameField ? spaceNameField.value.trim() : "";
    const color = spaceColorInput && spaceColorInput.value ? spaceColorInput.value : "#60a5fa";
    if (!name) {
      setSpaceStatus("Укажите название пространства.", "error");
      return;
    }
    clearSpaceStatus();
    if (spaceSaveBtn) {
      spaceSaveBtn.disabled = true;
    }
    let createdElements = null;
    try {
      createdElements = createSpacePolygon(points, name, color);
      if (!createdElements || !lassoState.svg) {
        throw new Error("Не удалось создать пространство на плане.");
      }
      const svgMarkup = new XMLSerializer().serializeToString(lassoState.svg);
      await apiRequest("/api/spaces", {
        method: "POST",
        body: JSON.stringify({
          floor_id: currentFloor.id,
          name,
          kind: lassoDefaults.kind,
        }),
      });
      const updated = await apiRequest(`/api/floors/${currentFloor.id}`, {
        method: "PUT",
        body: JSON.stringify({ plan_svg: svgMarkup }),
      });
      currentFloor = { ...currentFloor, plan_svg: updated.plan_svg || svgMarkup };
      setFloorStatus("Пространство добавлено.", "success");
      closeSpaceModal();
    } catch (error) {
      if (createdElements) {
        createdElements.polygon.remove();
        createdElements.label.remove();
      }
      setSpaceStatus(error.message, "error");
    } finally {
      if (spaceSaveBtn) {
        spaceSaveBtn.disabled = false;
      }
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
    const target = event.target;
    if (
      isFloorEditing &&
      ((target instanceof SVGElement &&
        (target.classList.contains("space-polygon") || target.classList.contains("space-handle"))) ||
        findSpacePolygonFromEvent(event))
    ) {
      return;
    }
    if (lassoState.active) {
      event.preventDefault();
      const point = getSvgPoint(event);
      if (point) {
        lassoState.points.push(point);
        updateLassoPreview();
      }
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
    if (spaceEditState.isDragging) {
      const point = getSvgPoint(event);
      if (point && Number.isInteger(spaceEditState.draggingIndex)) {
        spaceEditState.points[spaceEditState.draggingIndex] = point;
        updateSelectedPolygon();
      }
      return;
    }
    if (lassoState.active) {
      const point = getSvgPoint(event);
      updateLassoPreview(point);
      return;
    }
    if (!floorPlanState.isDragging) {
      return;
    }
    floorPlanState.translateX = floorPlanState.dragOriginX + (event.clientX - floorPlanState.dragStartX);
    floorPlanState.translateY = floorPlanState.dragOriginY + (event.clientY - floorPlanState.dragStartY);
    applyFloorPlanTransform();
  });

  floorPlanPreview.addEventListener("dblclick", (event) => {
    if (lassoState.active) {
      event.preventDefault();
      finishLassoMode();
      return;
    }
    if (!isFloorEditing) {
      return;
    }
    const polygon = findSpacePolygonFromEvent(event);
    if (!polygon) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const wasSelected = spaceEditState.selectedPolygon === polygon;
    if (!wasSelected) {
      selectSpacePolygon(polygon);
    }
    const point = getSvgPoint(event);
    if (point) {
      const tolerance = getEdgeSnapTolerance();
      const insertionIndex = findEdgeInsertionIndex(spaceEditState.points, point, tolerance);
      if (insertionIndex !== null) {
        spaceEditState.points.splice(insertionIndex + 1, 0, point);
        updateSelectedPolygon();
        return;
      }
    }
    if (wasSelected) {
      clearSpaceSelection();
    }
  });

  const stopDragging = (event) => {
    if (!floorPlanState.isDragging) {
      if (spaceEditState.isDragging) {
        spaceEditState.isDragging = false;
        spaceEditState.draggingIndex = null;
        if (floorPlanPreview && spaceEditState.dragPointerId !== null) {
          floorPlanPreview.releasePointerCapture(spaceEditState.dragPointerId);
        }
        spaceEditState.dragPointerId = null;
      }
      return;
    }
    floorPlanState.isDragging = false;
    floorPlanPreview.classList.remove("is-dragging");
    if (event && typeof event.pointerId === "number") {
      floorPlanPreview.releasePointerCapture(event.pointerId);
    }
    if (spaceEditState.isDragging) {
      spaceEditState.isDragging = false;
      spaceEditState.draggingIndex = null;
      spaceEditState.dragPointerId = null;
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

if (spaceModal) {
  spaceModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.modalClose === "true") {
      closeSpaceModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (lassoState.active) {
      cancelLassoMode("Выделение отменено.");
      return;
    }
    if (spaceModal && spaceModal.classList.contains("is-open")) {
      closeSpaceModal();
      return;
    }
    if (buildingModal.classList.contains("is-open")) {
      closeModal();
    }
    return;
  }
  if (event.key === "Enter" && lassoState.active) {
    finishLassoMode();
  }
});

init();
