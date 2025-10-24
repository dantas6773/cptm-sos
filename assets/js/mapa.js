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

container.addEventListener('dblclick', () => {
  enableTransition();
  resetPosition();
});

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

function enableTransition() {
  map.style.transition = 'transform 0.3s ease, top 0.3s ease, left 0.3s ease';
}

function disableTransition() {
  map.style.transition = 'none';
}


document.addEventListener("DOMContentLoaded", function () {
    const botaoExpandir = document.getElementById("expandir");
    const overlay = document.getElementById("overlay");
    const btnVoltar = document.getElementById("btn-voltar");

    botaoExpandir.addEventListener("click", () => {
        overlay.classList.remove("hidden");
    });

    btnVoltar.addEventListener("click", () => {
        overlay.classList.add("hidden");
    });
});

const botao_home = document.getElementsByClassName('home')[0]
const botao_denuncia = document.getElementsByClassName('denuncia')[0]

botao_home.addEventListener('click', function(){
  window.location.href = '/assets/html/home.html'
})

botao_denuncia.addEventListener('click', function() {
    window.location.href = '/assets/html/pré-denucia.html'
})


document.addEventListener("DOMContentLoaded", function () {
    const pesquisaContainer = document.querySelector('.container-pesquisa');
    const trajetoInfo = document.getElementById('trajeto-info');
    const voltarTrajeto = document.getElementById('btn-voltar-trajeto');
    const lupa = document.getElementById('lupa');

    pesquisaContainer.addEventListener('click', function() {
        pesquisaContainer.classList.add('hidden');
        trajetoInfo.classList.remove('hidden');
        lupa.classList.add('hidden');
    });

    voltarTrajeto.addEventListener('click', function() {
        trajetoInfo.classList.add('hidden');
        pesquisaContainer.classList.remove('hidden');
        lupa.classList.remove('hidden');
    });
});

// --- Dois objetos clicáveis que abrem duas listas diferentes ---
document.addEventListener('DOMContentLoaded', function () {
  // Dropdowns ORIGEM / DESTINO com edição de itens
  const toggleOrigem = document.getElementById('toggle-origem');
  const toggleDestino = document.getElementById('toggle-destino');
  const panelOrigem = document.getElementById('panel-origem');
  const panelDestino = document.getElementById('panel-destino');
  const listOrigem = document.getElementById('list-origem');
  const listDestino = document.getElementById('list-destino');

  if (!toggleOrigem || !toggleDestino) return;

  // Lista fixa de estações definida no código (edite aqui para adicionar/remover estações)
  const DEFAULT_STATIONS = [
    'Pedro II',
    'São Bento',
    'Júlio Prestes'
  ];

  // Cada dropdown mantém seu próprio array de itens (iniciado a partir de DEFAULT_STATIONS)
  const origemItems = [...DEFAULT_STATIONS];
  const destinoItems = [...DEFAULT_STATIONS];

  function renderList(container, items) {
    container.innerHTML = '';
    items.forEach((name, idx) => {
      const li = document.createElement('li');
      li.className = 'dropdown-item';

      const span = document.createElement('span');
      span.className = 'item-text';
      span.innerText = name;

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'item-edit';
      editBtn.type = 'button';
      editBtn.innerText = 'Editar';

      const delBtn = document.createElement('button');
      delBtn.className = 'item-delete';
      delBtn.type = 'button';
      delBtn.innerText = 'Remover';

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(span);
      li.appendChild(actions);
      container.appendChild(li);

      // Edit handler
      editBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = name;
        input.className = 'edit-input';

        const save = document.createElement('button');
        save.type = 'button';
        save.innerText = 'Salvar';
        save.className = 'item-save';

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.innerText = 'Cancelar';
        cancel.className = 'item-cancel';

        // substituir conteúdo visual
        li.innerHTML = '';
        li.appendChild(input);
        li.appendChild(save);
        li.appendChild(cancel);

        save.addEventListener('click', () => {
          const newVal = input.value.trim();
          if (!newVal) return alert('Nome inválido');
          items[idx] = newVal;
          renderList(container, items);
        });
        cancel.addEventListener('click', () => renderList(container, items));
      });

      delBtn.addEventListener('click', () => {
        if (!confirm(`Remover estação "${name}"?`)) return;
        items.splice(idx, 1);
        renderList(container, items);
      });
    });
  }

  // Inicial render
  renderList(listOrigem, origemItems);
  renderList(listDestino, destinoItems);

  // Toggle panels
  function closeAll() {
    panelOrigem.classList.add('hidden');
    panelDestino.classList.add('hidden');
  }
  toggleOrigem.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !panelOrigem.classList.contains('hidden');
    closeAll();
    if (!open) panelOrigem.classList.remove('hidden');
  });
  toggleDestino.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !panelDestino.classList.contains('hidden');
    closeAll();
    if (!open) panelDestino.classList.remove('hidden');
  });

  // No add handlers: itens só podem ser alterados via código (DEFAULT_STATIONS) ou edição/remover nos lists

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    const p = e.target;
    if (!p.closest || (!p.closest('#dropdown-origem') && !p.closest('#dropdown-destino'))) {
      closeAll();
    }
  });

  // GERAR MAPA button handler (simple placeholder)
  const gerarBtn = document.getElementById('gerar-mapa-btn');
  gerarBtn && gerarBtn.addEventListener('click', (e) => {
    // impede que o click borbulhe para document (que fecha os dropdowns)
    e.stopPropagation();
    // exemplo: usar seleção atual, aqui apenas um placeholder
    alert('Gerando mapa...');
    // TODO: implementar comportamento real (criar rota, centralizar mapa, etc.)
  });
});
