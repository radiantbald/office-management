const fileInput = document.getElementById("fileInput");
const vectorizeBtn = document.getElementById("vectorizeBtn");
const rasterPreview = document.getElementById("rasterPreview");
const svgContainer = document.getElementById("svgContainer");
const downloadBtn = document.getElementById("downloadBtn");
const workingCanvas = document.getElementById("workingCanvas");

let currentImage = null;
let currentSvg = "";

const resetOutput = () => {
  svgContainer.innerHTML =
    '<div class="placeholder">Загрузите изображение для векторизации</div>';
  downloadBtn.disabled = true;
  currentSvg = "";
};

const DEFAULT_OPTIONS = {
  ...ImageTracer.optionpresets.detailed,
  linefilter: false,
};

const getOptions = () => ({ ...DEFAULT_OPTIONS });

const getImageData = () => {
  const ctx = workingCanvas.getContext("2d");
  const scale = 1;
  const sourceWidth = currentImage.naturalWidth;
  const sourceHeight = currentImage.naturalHeight;
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  workingCanvas.width = targetWidth;
  workingCanvas.height = targetHeight;
  ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
};

const renderSvg = (svgString) => {
  svgContainer.innerHTML = svgString;
  const svgElement = svgContainer.querySelector("svg");
  if (svgElement) {
    const widthAttr = svgElement.getAttribute("width");
    const heightAttr = svgElement.getAttribute("height");
    const width = widthAttr ? Number.parseFloat(widthAttr) : null;
    const height = heightAttr ? Number.parseFloat(heightAttr) : null;
    if (!svgElement.hasAttribute("viewBox") && width && height) {
      svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
    svgElement.removeAttribute("width");
    svgElement.removeAttribute("height");
    svgElement.setAttribute("preserveAspectRatio", "xMinYMin meet");
    svgElement.style.width = "100%";
    svgElement.style.height = "auto";
    svgElement.style.overflow = "visible";
    svgElement.style.display = "block";
  }
  downloadBtn.disabled = false;
};

const vectorize = () => {
  if (!currentImage) {
    return;
  }

  const imageData = getImageData();
  const options = getOptions();
  currentSvg = ImageTracer.imagedataToSVG(imageData, options);
  renderSvg(currentSvg);
};

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    vectorizeBtn.disabled = true;
    rasterPreview.removeAttribute("src");
    resetOutput();
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    currentImage = image;
    rasterPreview.src = objectUrl;
    vectorizeBtn.disabled = false;
    resetOutput();
  };
  image.onerror = () => {
    vectorizeBtn.disabled = true;
    rasterPreview.removeAttribute("src");
    resetOutput();
    URL.revokeObjectURL(objectUrl);
  };
  image.src = objectUrl;
});

vectorizeBtn.addEventListener("click", vectorize);

downloadBtn.addEventListener("click", () => {
  if (!currentSvg) {
    return;
  }
  const blob = new Blob([currentSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "floor-plan.svg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

