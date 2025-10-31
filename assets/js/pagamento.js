const seta_voltar = document.getElementById('divvoltar')

const apelido = localStorage.getItem('apelido')
const apelido_lim = apelido.slice(0, 7); //corta o nome para 7 letras pq nao tem espaço no header
document.getElementById('boas-vindas').textContent = `Olá, ${apelido_lim}`

seta_voltar.addEventListener('click', function(){
    window.location.href = '/assets/html/home.html'
})

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

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]')
    const currentUserId = Number(localStorage.getItem('currentUserId')) || 1
    const user = usuarios.find(u => Number(u.id) === currentUserId) || usuarios[0]

    if (user) {
        const saldoText = 'R$' + (Number(user.saldo || 0)).toFixed(2).replace('.', ',')
        const dinheiroEl = document.getElementById('dinheiro')
        if (dinheiroEl) dinheiroEl.textContent = saldoText

        const boas = document.getElementById('boas-vindas')
        if (boas) {
            const nome = user.nome || ''
            boas.textContent = 'Olá, ' + (nome.split(' ')[0] || 'Usuário')
        }
    }

    
    const metodoBtns = document.querySelectorAll('.mets')
    metodoBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault()
            window.location.href = 'pagamento-pós.html'
        })
    })
})