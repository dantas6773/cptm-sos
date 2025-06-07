const seta_voltar = document.getElementById('divvoltar')

const apelido = localStorage.getItem('apelido')
const apelido_lim = apelido.slice(0, 7); //corta o nome para 7 letras pq nao tem espaço no header
document.getElementById('boas-vindas').textContent = `Olá, ${apelido_lim}`

seta_voltar.addEventListener('click', function(){
    window.location.href = '/assets/html/home.html'
})

// testado