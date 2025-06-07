const botao = document.getElementById('botao')
const nome = document.getElementById('name')

botao.addEventListener('click', function(event){
    event.preventDefault()
    if (nome.value) {
    window.location.href ='/assets/html/carregamento.html'
     localStorage.setItem('apelido', nome.value);
} else {
    alert('Preencha seu nome antes de avançar')
}
})

//testado