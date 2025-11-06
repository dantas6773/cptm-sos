const apelido = localStorage.getItem('apelido')
const apelido_lim = apelido.slice(0, 7); //corta o nome para 7 letras pq nao tem espaço no header
document.getElementById('boas-vindas').textContent = `Olá, ${apelido_lim}`


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
    valorSaldo.textContent = saldoVisivel ? 'R$117,50' : '********';
  });

document.addEventListener('DOMContentLoaded', async () => {
    
    if (!localStorage.getItem('usuarios')) {
        try {
            const resp = await fetch('../src/usuario.json')
            if (resp.ok) {
                const data = await resp.json()
                localStorage.setItem('usuarios', JSON.stringify(data.usuarios || []))
            }
        } catch (err) {
            console.error('Erro ao carregar usuario.json:', err)
        }
    }

    const usuariosJson = localStorage.getItem('usuarios')
    if (usuariosJson) {
        try {
            const usuarios = JSON.parse(usuariosJson)
            const currentUserId = Number(localStorage.getItem('currentUserId')) || 1
            const user = usuarios.find(u => Number(u.id) === currentUserId) || usuarios[0]

            if (user) {
                
                const saldoText = 'R$' + (Number(user.saldo || 0)).toFixed(2).replace('.',',')
                const possibleSaldoIds = ['valor-saldo', 'dinheiro', 'saldo', 'valorSaldo']
                possibleSaldoIds.forEach(id => {
                    const el = document.getElementById(id)
                    if (el) el.textContent = saldoText
                })

                const boasEl = document.getElementById('boas-vindas')
                if (boasEl) {
                    const nome = user.nome || ''
                    const primeiroNome = nome.split(' ')[0] || nome || 'Usuário'
                    boasEl.textContent = `Olá, ${primeiroNome}`
                }
            }
        } catch (err) {
            console.error('Erro ao processar usuarios no localStorage:', err)
        }
    }

    
    const confirmation = localStorage.getItem('confirmationMessage')
    if (confirmation) {
        
        requestAnimationFrame(() => {
            setTimeout(() => {
                alert(confirmation)
                localStorage.removeItem('confirmationMessage')
            }, 50) 
        })
    }
})