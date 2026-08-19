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
  // o ícone e o rótulo acompanham o estado, para quem usa leitor de tela saber
  // o que o botão faz agora
  olho.setAttribute('aria-pressed', String(!saldoVisivel));
  olho.setAttribute('aria-label', saldoVisivel ? 'Ocultar saldo' : 'Mostrar saldo');
});

// Confirmação de que o alarme foi desligado. Quem desativa volta para a home, e
// a mensagem diz o que parou — a pessoa acabou de sair de um fluxo de emergência
// e não deve ficar em dúvida se ainda está sendo localizada.
function mostrarConfirmacaoDeAlarme() {
  if (localStorage.getItem('alarmeDesativado') !== '1') return false
  localStorage.removeItem('alarmeDesativado')

  mostrarConfirmacao({
    titulo: 'Alarme desativado',
    detalhe: 'A sirene parou e a sua localização deixou de ser compartilhada.',
  })
  return true
}

// Confirmação da compra de bilhetes. Quem compra volta para cá, onde o saldo
// novo está à vista — antes esta tela lia uma chave de localStorage que nenhuma
// outra escrevia e mostrava um alert(), a caixa do sistema que o resto do app já
// tinha deixado de usar.
function mostrarConfirmacaoDeCompra() {
  const bruto = localStorage.getItem('compraConcluida')
  if (!bruto) return
  localStorage.removeItem('compraConcluida')

  let dados
  try {
    dados = JSON.parse(bruto)
  } catch {
    return
  }

  // Só os dois números atravessam o armazenamento, e ainda assim são conferidos:
  // a frase é montada aqui, então nada de lá vira texto solto na tela.
  const quantidade = Number(dados?.quantidade)
  const total = Number(dados?.total)
  if (!Number.isInteger(quantidade) || quantidade <= 0 || !Number.isFinite(total)) return

  const bilhetes = quantidade === 1 ? '1 bilhete' : `${quantidade} bilhetes`

  mostrarConfirmacao({
    titulo: 'Compra concluída!',
    detalhe: `${bilhetes} — ${formatBRL(total)} foram adicionados ao seu saldo.`,
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  // O aviso do alarme tem precedência: é o mais importante dos dois, e as duas
  // caixas nunca devem aparecer empilhadas.
  if (!mostrarConfirmacaoDeAlarme()) mostrarConfirmacaoDeCompra()

  // saldo do usuário logado. O nome do cabeçalho é preenchido por auth.js, que
  // busca o usuário uma vez só e compartilha o resultado com esta chamada.
  async function carregarUsuarioBackend() {
    try {
      const usuario = await carregarUsuario()

      const saldo = usuario.saldo ?? 0
      const saldoFormatado = 'R$ ' + Number(saldo).toFixed(2).replace('.', ',')
      const saldoEl = document.getElementById('valor-saldo')
      if (saldoEl) {
        saldoEl.textContent = saldoFormatado
        saldoEl.dataset.valorReal = saldoFormatado
      }
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
