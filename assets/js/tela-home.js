const apelido = localStorage.getItem('apelido')
const apelido_lim = apelido.slice(0, 7); //corta o nome para 7 letras pq nao tem espaço no header
const botao_pix = document.getElementById('botao-pix')

document.getElementById('boas-vindas').textContent = `Olá, ${apelido_lim}`

botao_pix.addEventListener('click', function() {
    window.location.href = '/assets/html/pagamento.html'
})

botao_qrcode = document.getElementById('botao-qrcode')

botao_qrcode.addEventListener('click', function() {
    window.location.href = '/assets/html/QR.html'
})
