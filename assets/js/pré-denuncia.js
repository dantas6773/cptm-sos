voltar = document.getElementById('voltar')
organizador = document.getElementById('organizador')
faça_uma_denuncia = document.getElementById('faça-uma-denuncia')

voltar.addEventListener('click', function() {
    window.location.href = '/assets/html/home.html'
})

organizador.addEventListener('click', function(){
    window.location.href = '/assets/html/denuncia.html'
})

faça_uma_denuncia.addEventListener('click', function(){
    window.location.href = '/assets/html/formularioDenuncia.html'
})

