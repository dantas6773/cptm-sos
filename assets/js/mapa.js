// ============================
// MAPA (zoom e pan)
// ============================
(function initPanZoomMap() {
  const map = document.querySelector('.map');
  const container = document.querySelector('.map-container');
  if (!map || !container) return;

  let isDragging = false;
  let startX, startY;
  let currentX, currentY;
  let scale;

  const minScale = 0.5;
  const maxScale = 3;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const mapWidth = 1313;
  const mapHeight = 875;

  // posiciona mapa inicialmente no centro
  resetPosition();

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    container.style.cursor = 'grabbing';
    disableTransition();
  });

  container.addEventListener('mouseup', stopDrag);
  container.addEventListener('mouseleave', stopDrag);

  function stopDrag() {
    isDragging = false;
    container.style.cursor = 'grab';
  }

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

    // calcula novo scale
    const delta = -e.deltaY * 0.001;
    const newScale = clamp(scale + delta, minScale, maxScale);

    // ponto do cursor como pivot do zoom
    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - currentX;
    const offsetY = e.clientY - rect.top - currentY;
    const scaleRatio = newScale / scale;

    currentX -= offsetX * (scaleRatio - 1);
    currentY -= offsetY * (scaleRatio - 1);

    scale = newScale;

    // limita dentro da moldura
    const [minX, minY, maxX, maxY] = getLimits();
    currentX = clamp(currentX, minX, maxX);
    currentY = clamp(currentY, minY, maxY);

    updateTransform();
  });

  // duplo clique = reset
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

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }
})();


// ============================
// TELA / OVERLAY DE MAPA EXPANDIDO
// ============================
document.addEventListener('DOMContentLoaded', () => {
  const botaoExpandir = document.getElementById('expandir');
  const overlay = document.getElementById('overlay');
  const btnVoltar = document.getElementById('btn-voltar');

  if (botaoExpandir && overlay && btnVoltar) {
    botaoExpandir.addEventListener('click', () => {
      overlay.classList.remove('hidden');
    });

    btnVoltar.addEventListener('click', () => {
      overlay.classList.add('hidden');
    });
  }
});


// ============================
// FOOTER (NAVEGAÇÃO)
// ============================
document.addEventListener('DOMContentLoaded', () => {
  const botaoHome = document.querySelector('.home');
  const botaoDenuncia = document.querySelector('.denuncia');

  if (botaoHome) {
    botaoHome.addEventListener('click', () => {
      window.location.href = 'home.html';
    });
  }

  if (botaoDenuncia) {
    botaoDenuncia.addEventListener('click', () => {
      window.location.href = 'pré-denucia.html';
    });
  }
});


// ============================
// DROPDOWNS ORIGEM / DESTINO + GERAR MAPA
// ============================
document.addEventListener('DOMContentLoaded', () => {
  // elementos principais do dropdown
  const toggleOrigem = document.getElementById('toggle-origem');
  const toggleDestino = document.getElementById('toggle-destino');
  const panelOrigem = document.getElementById('panel-origem');
  const panelDestino = document.getElementById('panel-destino');
  const listOrigem = document.getElementById('list-origem');
  const listDestino = document.getElementById('list-destino');
  const gerarBtn = document.getElementById('gerar-mapa-btn');

  if (!toggleOrigem || !toggleDestino || !panelOrigem || !panelDestino || !listOrigem || !listDestino) {
    return;
  }

  // estado atual escolhido
  let origemSelected = null;
  let destinoSelected = null;

  // lista inicial de estações (edite aqui)
  const DEFAULT_STATIONS = [
    'Pedro II',
    'São Bento',
    'Júlio Prestes'
  ];

  // cópia independente para cada dropdown (será preenchida pela API ou pelo fallback)
  let origemItems = [];
  let destinoItems = [];

  // busca estações no backend; se falhar, usa DEFAULT_STATIONS
  async function fetchStations() {
    try {
      const resp = await fetch('http://localhost:5001/api/estacoes');
      if (!resp.ok) throw new Error('Resposta inválida');
      const list = await resp.json();
      if (!Array.isArray(list) || list.length === 0) throw new Error('Lista vazia');
      return list;
    } catch (err) {
      console.warn('Não foi possível carregar estações do servidor, tentando fallback local (../src/estacoes.json)...', err);

      // tentativa de fallback para o arquivo JSON local (quando a página é servida por um server estático)
      try {
        const localResp = await fetch('./assets/src/estacoes.json');
        if (localResp.ok) {
          const localList = await localResp.json();
          // estacoes.json tem estrutura de linhas com campo trajeto -> extrair nomes
          if (Array.isArray(localList)) {
            const names = [];
            localList.forEach((linha) => {
              if (Array.isArray(linha.trajeto)) linha.trajeto.forEach((n) => names.push(n));
            });
            const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
            return unique;
          }
        }
      } catch (err2) {
        console.warn('Falha ao carregar ../src/estacoes.json:', err2);
      }

      // último recurso: fallback mínimo embutido
      return DEFAULT_STATIONS;
    }
  }

  // renderiza lista de opções dentro de um dropdown
  function renderList(container, items, tipo) {
    container.innerHTML = '';

    items.forEach((name, idx) => {
      const li = document.createElement('li');
      li.className = 'dropdown-item';

      const span = document.createElement('span');
      span.className = 'item-text';
      span.innerText = name;

      // ações (Editar / Remover)
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

      // Selecionar estação
      span.addEventListener('click', (ev) => {
        ev.stopPropagation();

        if (tipo === 'origem') {
          origemSelected = name;
          toggleOrigem.innerText = `${name} ▾`;
          panelOrigem.classList.add('hidden');
        } else {
          destinoSelected = name;
          toggleDestino.innerText = `${name} ▾`;
          panelDestino.classList.add('hidden');
        }
      });

      // Editar nome da estação
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

        // substitui conteúdo visual temporariamente
        li.innerHTML = '';
        li.appendChild(input);
        li.appendChild(save);
        li.appendChild(cancel);

        save.addEventListener('click', () => {
          const newVal = input.value.trim();
          if (!newVal) {
            alert('Nome inválido');
            return;
          }

          // atualiza array
          items[idx] = newVal;

          // se o item editado era o selecionado, atualiza também
          if (tipo === 'origem' && origemSelected === name) {
            origemSelected = newVal;
            toggleOrigem.innerText = `${newVal} ▾`;
          }
          if (tipo === 'destino' && destinoSelected === name) {
            destinoSelected = newVal;
            toggleDestino.innerText = `${newVal} ▾`;
          }

          renderList(container, items, tipo);
        });

        cancel.addEventListener('click', () => {
          renderList(container, items, tipo);
        });
      });

      // Remover estação
      delBtn.addEventListener('click', () => {
        if (!confirm(`Remover estação "${name}"?`)) return;

        // se você remover a estação selecionada, limpa seleção
        if (tipo === 'origem' && origemSelected === name) {
          origemSelected = null;
          toggleOrigem.innerText = 'Selecionar ▾';
        }
        if (tipo === 'destino' && destinoSelected === name) {
          destinoSelected = null;
          toggleDestino.innerText = 'Selecionar ▾';
        }

        items.splice(idx, 1);
        renderList(container, items, tipo);
      });
    });
  }

  // busca estações e renderiza o conteúdo inicial
  (async () => {
    const lista = await fetchStations();
    origemItems = [...lista];
    destinoItems = [...lista];

    renderList(listOrigem, origemItems, 'origem');
    renderList(listDestino, destinoItems, 'destino');
  })();

  // abre/fecha dropdowns
  function closeAllDropdowns() {
    panelOrigem.classList.add('hidden');
    panelDestino.classList.add('hidden');
  }

  toggleOrigem.addEventListener('click', (e) => {
    e.stopPropagation();
    const alreadyOpen = !panelOrigem.classList.contains('hidden');
    closeAllDropdowns();
    if (!alreadyOpen) panelOrigem.classList.remove('hidden');
  });

  toggleDestino.addEventListener('click', (e) => {
    e.stopPropagation();
    const alreadyOpen = !panelDestino.classList.contains('hidden');
    closeAllDropdowns();
    if (!alreadyOpen) panelDestino.classList.remove('hidden');
  });

  // clicar fora = fecha os dois
  document.addEventListener('click', (e) => {
    const el = e.target;
    const insideOrigem = el.closest && el.closest('#dropdown-origem');
    const insideDestino = el.closest && el.closest('#dropdown-destino');
    if (!insideOrigem && !insideDestino) {
      closeAllDropdowns();
    }
  });

  // botão "GERAR MAPA"
  if (gerarBtn) {
    gerarBtn.addEventListener('click', async (e) => {
      e.stopPropagation(); // não fecha dropdown sem querer

      if (!origemSelected || !destinoSelected) {
        alert('Escolha origem e destino primeiro.');
        return;
      }

      // envia pro backend
      try {
        const resp = await fetch('http://localhost:5001/gera-mapa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: origemSelected,
            destination: destinoSelected
          })
        });

        const data = await resp.json();
        console.log('Resposta /gera-mapa:', data);

        if (!resp.ok || data.ok === false) {
          alert('Erro ao gerar mapa. Veja o console.');
          return;
        }

        alert(
          `Mapa solicitado!\nOrigem: ${origemSelected}\nDestino: ${destinoSelected}`
        );
      } catch (err) {
        console.error('Erro ao chamar /gera-mapa', err);
        alert('Erro ao gerar mapa (ver console)');
      }
    });
  }
});
