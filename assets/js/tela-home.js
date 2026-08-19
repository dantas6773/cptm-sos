const botao_pix = document.getElementsByClassName('recarga')[0]
const botao_qrcode = document.getElementById('botao-qrcode')
const botao_denuncia = document.getElementsByClassName('botao-footer denuncia')[0]
const botao_mapa = document.getElementsByClassName('mapa')[0]

botao_pix.addEventListener('click', function() {
    window.location.href = 'pagamento.html'
})

botao_qrcode.addEventListener('click', function() {
    window.location.href = 'QR.html'
})

botao_denuncia.addEventListener('click', function() {
    window.location.href = 'pré-denucia.html'
})

botao_mapa.addEventListener('click', function(){
    window.location.href = 'mapa.html'
})

const olho = document.getElementById('olho');
const valorSaldo = document.getElementById('valor-saldo');

let saldoVisivel = true;

olho.addEventListener('click', () => {
  saldoVisivel = !saldoVisivel;
  valorSaldo.textContent = saldoVisivel ? valorSaldo.dataset.valorReal || 'R$ 0,00' : '********';
});

document.addEventListener('DOMContentLoaded', async () => {
  const confirmation = localStorage.getItem('confirmationMessage')
  if (confirmation) {
      requestAnimationFrame(() => {
          setTimeout(() => {
              alert(confirmation)
              localStorage.removeItem('confirmationMessage')
          }, 50)
      })
  }

  // busca nome + saldo reais do usuário logado em uma única chamada autenticada
  async function carregarUsuarioBackend() {
    try {
      const resp = await authFetch('/api/usuario')
      if (!resp.ok) throw new Error('Erro ao buscar usuário no servidor')

      const data = await resp.json()

      const saldo = data.usuario?.saldo ?? 0
      const saldoFormatado = 'R$ ' + Number(saldo).toFixed(2).replace('.', ',')
      const saldoEl = document.getElementById('valor-saldo')
      if (saldoEl) {
        saldoEl.textContent = saldoFormatado
        saldoEl.dataset.valorReal = saldoFormatado
      }

      const nomeCompleto = data.usuario?.nome || 'Usuário'
      const primeiroNome = nomeCompleto.split(' ')[0] || nomeCompleto
      const boasEl = document.getElementById('boas-vindas')
      if (boasEl) boasEl.textContent = `Olá, ${primeiroNome}`
    } catch (error) {
      console.error('Erro ao carregar usuário do backend:', error)
    }
  }

  await carregarUsuarioBackend()
})

// Indicadores de página do carrossel de avisos. O carrossel já rolava, mas nada
// sinalizava quantos avisos existem nem em qual a pessoa está — o segundo card
// aparecia cortado na borda e podia passar por corte acidental de layout.
// O ponto e vírgula inicial é necessário: o bloco acima termina em `})` sem
// pontuação, e sem ele o interpretador lê os dois como uma chamada só.
;(() => {
  const lista = document.querySelector(".avisos-lista");
  const indicadores = document.querySelector(".avisos-indicadores");
  if (!lista || !indicadores) return;

  const cards = [...lista.querySelectorAll(".aviso-card")];
  if (cards.length < 2) return;

  cards.forEach((_, i) => {
    const ponto = document.createElement("button");
    ponto.type = "button";
    ponto.setAttribute("role", "tab");
    ponto.setAttribute("aria-label", `Aviso ${i + 1} de ${cards.length}`);
    ponto.setAttribute("aria-selected", i === 0 ? "true" : "false");
    ponto.addEventListener("click", () => {
      lista.scrollTo({ left: cards[i].offsetLeft - lista.offsetLeft, behavior: "smooth" });
    });
    indicadores.appendChild(ponto);
  });

  const pontos = [...indicadores.children];

  function marcarAtual() {
    // o card ativo é o que estiver mais próximo da borda esquerda da lista
    const centro = lista.scrollLeft + lista.clientWidth / 2;
    let atual = 0;
    let menorDistancia = Infinity;

    cards.forEach((card, i) => {
      const meio = card.offsetLeft - lista.offsetLeft + card.offsetWidth / 2;
      const distancia = Math.abs(meio - centro);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        atual = i;
      }
    });

    pontos.forEach((p, i) => p.setAttribute("aria-selected", i === atual ? "true" : "false"));
  }

  lista.addEventListener("scroll", () => {
    window.clearTimeout(lista.dataset.temporizador);
    lista.dataset.temporizador = window.setTimeout(marcarAtual, 60);
  });

  marcarAtual();
})();
