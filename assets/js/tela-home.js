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
