const incrementarBilhetes = document.getElementById("incrementar-bilhetes")
const decrementarBilhetes = document.getElementById("decrecimo-bilhetes")
const quantidadeBilhetes = document.getElementById("quantidade-bilhetes")
const valorBilhetes = document.getElementById("valor-bilhetes")
const comprarBotao = document.getElementById("comprar")

let quantidade = Number(quantidadeBilhetes.textContent)
let valor = Number(valorBilhetes.textContent.replace(",","."))

//para adicionar bilhtes
incrementarBilhetes.addEventListener("mousedown", (event)=>{
    event.preventDefault()
    quantidade = quantidade + 1
    valor = 5.20 * quantidade
    quantidadeBilhetes.textContent = quantidade
    valorBilhetes.textContent = valor.toFixed(2).replace(".",",")
})

//para retirar bilhets
decrementarBilhetes.addEventListener("mousedown",(event)=>{
    event.preventDefault()
    if(quantidade > 0){
        event.preventDefault()
        quantidade = quantidade - 1
        valor = 5.20 * quantidade
        quantidadeBilhetes.textContent = quantidade
        valorBilhetes.textContent = valor.toFixed(2).replace(".", ",")
    }
})

// Ao clicar em COMPRAR:
comprarBotao.addEventListener("click", async (event)=>{
    event.preventDefault()
    if (!valor || valor <= 0) return

    const currentUserId = Number(localStorage.getItem("currentUserId")) || 1

    try {
        const resp = await fetch("http://localhost:5001/api/usuario/saldo", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentUserId, amount: Number(valor) })
        })
        if (!resp.ok) throw new Error("Falha ao atualizar saldo no servidor")
        const json = await resp.json()
        if (localStorage.getItem("usuarios")) {
            const usuarios = JSON.parse(localStorage.getItem("usuarios"))
            const idx = usuarios.findIndex(u => Number(u.id) === currentUserId)
            if (idx >= 0) usuarios[idx] = json.usuario
            localStorage.setItem("usuarios", JSON.stringify(usuarios))
        }
        const valorFormatado = Number(valor).toFixed(2).replace(".",",")
        localStorage.setItem("confirmationMessage", `O saldo de ${valorFormatado} reais foi adiconado com sucesso na sua carteira.`)
        window.location.href = "home.html"
    } catch (err) {
        console.error(err)
        alert("Não foi possível atualizar o saldo no servidor. Tente novamente mais tarde.")
    }
})


document.addEventListener('DOMContentLoaded', async () => {
    // garante que exista lista de usuarios no localStorage
    if (!localStorage.getItem('usuarios')) {
        try {
            const resp = await fetch('/src/usuario.json')
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
        const boasEl = document.getElementById('boas-vindas') || document.querySelector('.logo h1') || document.querySelector('h1')
        if (boasEl) {
            const nome = String(user.nome || '')
            const primeiroNome = nome.split(' ')[0] || nome || 'Usuário'
            boasEl.textContent = `Olá, ${primeiroNome}`
        }
    }

    const voltarEl = document.getElementById('voltar') 
                   || document.getElementById('divvoltar') 
                   || document.getElementById('seta')

    if (voltarEl) {
        voltarEl.style.cursor = 'pointer'
        voltarEl.addEventListener('click', (e) => {
            e.preventDefault()
            window.location.href = 'pagamento.html'
        })
    }
})



