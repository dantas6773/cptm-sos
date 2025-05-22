const botao = document.getElementById('botao')
const nome = document.getElementById('name')

botao.addEventListener('click', function(event){
    event.preventDefault()
    if (nome.value) {
    window.location.href ='carregamento.html'
} else {
    alert('Preencha seu nome antes de avançar')
}
})

