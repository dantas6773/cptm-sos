const map = document.querySelector('.map');
const container = document.querySelector('.map-container');

let isDragging = false;
let startX;
let startY;
let currentX;
let currentY;

let scale;
const minScale = 0.5;
const maxScale = 3;

const containerWidth = container.clientWidth;
const containerHeight = container.clientHeight;
const mapWidth = 1313;
const mapHeight = 875;

resetPosition();

container.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX - currentX;
  startY = e.clientY - currentY;
  container.style.cursor = 'grabbing';
  disableTransition();
});

container.addEventListener('mouseup', () => {
  isDragging = false;
  container.style.cursor = 'grab';
});

container.addEventListener('mouseleave', () => {
  isDragging = false;
  container.style.cursor = 'grab';
});

container.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  let x = e.clientX - startX;
  let y = e.clientY - startY;

  const [minX, minY, maxX, maxY] = getLimits();

  x = Math.min(maxX, Math.max(minX, x));
  y = Math.min(maxY, Math.max(minY, y));

  currentX = x;
  currentY = y;

  updateTransform();
});

// 🎯 Zoom suave
container.addEventListener('wheel', (e) => {
  e.preventDefault();

  enableTransition();

  const delta = -e.deltaY * 0.001;
  const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));

  const rect = container.getBoundingClientRect();
  const offsetX = e.clientX - rect.left - currentX;
  const offsetY = e.clientY - rect.top - currentY;

  const scaleRatio = newScale / scale;

  currentX -= offsetX * (scaleRatio - 1);
  currentY -= offsetY * (scaleRatio - 1);

  scale = newScale;

  const [minX, minY, maxX, maxY] = getLimits();

  currentX = Math.min(maxX, Math.max(minX, currentX));
  currentY = Math.min(maxY, Math.max(minY, currentY));

  updateTransform();
});

// 🔥 Reset com clique duplo
container.addEventListener('dblclick', () => {
  enableTransition();
  resetPosition();
});

// 🧠 Funções de controle
function updateTransform() {
  map.style.transform = `scale(${scale})`;
  map.style.left = `${currentX}px`;
  map.style.top = `${currentY}px`;
}

function resetPosition() {
  scale = 1;
  currentX = (containerWidth - mapWidth) / 2;
  currentY = (containerHeight - mapHeight) / 2;
  updateTransform();
}

function getLimits() {
  const scaledWidth = mapWidth * scale;
  const scaledHeight = mapHeight * scale;

  const minX = containerWidth - scaledWidth;
  const minY = containerHeight - scaledHeight;
  const maxX = 0;
  const maxY = 0;

  return [minX, minY, maxX, maxY];
}

// 🔥 Ativar/desativar animação suave dinamicamente
function enableTransition() {
  map.style.transition = 'transform 0.3s ease, top 0.3s ease, left 0.3s ease';
}

function disableTransition() {
  map.style.transition = 'none';
}