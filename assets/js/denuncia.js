const slider = document.getElementById('slider');
const button = document.getElementById('slider-button');
const text = document.querySelector('.slider-text');



let isDragging = false;
let startX;
let currentX = 0;

const sliderPadding = 3;
const maxMove = slider.clientWidth - button.clientWidth - sliderPadding * 2;


function startDrag(x) {
    isDragging = true;
    startX = x - currentX;
}


function duringDrag(x) {
    if (!isDragging) return;
    currentX = x - startX;
    if (currentX < 0) currentX = 0;
    if (currentX > maxMove) currentX = maxMove;
    button.style.transform = `translateX(${currentX}px)`;
    const opacity = 0.7 - (currentX / maxMove);
    text.style.opacity = opacity;
}

const botoes = document.getElementById('botoes');
const cpfContainer = document.getElementById('cpf-container');
const voltarBtn = document.getElementById('voltar');
const cadeado = document.getElementById('cadeado');
const inputCpf = document.getElementById('cpf-input');

function ativarTelaCpf() {
    button.style.transform = `translateX(${maxMove}px)`;
    button.style.pointerEvents = 'none'; 
    cadeado.src = '../imagem/setaCircular.png'; 

    botoes.classList.add('hidden');
    button.classList.add('hidden');
    cpfContainer.classList.remove('hidden');
}

function voltarTelaInicial() {
    currentX = 0;
    button.style.transform = `translateX(0px)`;
    button.style.pointerEvents = 'auto';
    cadeado.src = '../imagem/cadeado.png'; 

    botoes.classList.remove('hidden');
    button.classList.remove('hidden');
    cpfContainer.classList.add('hidden');
    text.style.opacity = 0.7;

    inputCpf.value = '';
}

voltarBtn.addEventListener('click', voltarTelaInicial);


function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (currentX >= maxMove) {
        ativarTelaCpf();
    } else {
        currentX = 0;
        button.style.transform = `translateX(0px)`;
        text.style.opacity = 0.7;
    }
}



button.addEventListener('mousedown', e => startDrag(e.clientX));
document.addEventListener('mousemove', e => duringDrag(e.clientX));
document.addEventListener('mouseup', endDrag);


button.addEventListener('touchstart', e => startDrag(e.touches[0].clientX));
document.addEventListener('touchmove', e => {
    duringDrag(e.touches[0].clientX);
});
document.addEventListener('touchend', endDrag);


const sirene = document.getElementById('sirene');
const iconeSirene = document.getElementById('icone-sirene');
const textoSirene = document.getElementById('texto-sirene');
const audioSirene = new Audio('../sons/sirene.wav');

let sireneAtiva = false;

sirene.addEventListener('click', () => {
    sireneAtiva = !sireneAtiva;

    if (sireneAtiva) {
        sirene.style.backgroundColor = '#ED1C24';
        textoSirene.style.color = '#F4F4F4';
        iconeSirene.src = '../imagem/sireneBranca.png';
        audioSirene.play();
    } else {
        sirene.style.backgroundColor = ''; 
        textoSirene.style.color = '';
        iconeSirene.src = '../imagem/sirene.png'; 
        audioSirene.pause();
        audioSirene.currentTime = 0;
    }
});

const meEncontre = document.getElementById('meEncontre');
const iconeMeEncontre = meEncontre.querySelector('img#escudo');
const textoMeEncontre = meEncontre.querySelector('h4#texto-meEncontre');

let encontreAtivo = false;

meEncontre.addEventListener('click', () => {
    encontreAtivo = !encontreAtivo;

    if (encontreAtivo) {
        meEncontre.style.backgroundColor = '#ED1C24';
        textoMeEncontre.style.color = '#F4F4F4';
        iconeMeEncontre.src = '../imagem/escudoBranco.png'; 

        alert('              🚓 As autoridades locais já estão indo até você 🚓        Mantenha o botão ligado para continuar compartilhando a sua localização.');
    } else {
        meEncontre.style.backgroundColor = '';
        textoMeEncontre.style.color = '';
        iconeMeEncontre.src = '../imagem/escudo.png';
        alert('Você parou de compartilhar a sua localização')
    }
});


const ligar190 = document.getElementById('ligar190');
const iconeLigar = ligar190.querySelector('img');
const textoLigar = ligar190.querySelector('h4');

ligar190.addEventListener('mousedown', () => {
    ligar190.style.backgroundColor = '#ED1C24';
    textoLigar.style.color = '#F4F4F4';
    iconeLigar.src = '../imagem/telefoneBranco.png'; 
});

ligar190.addEventListener('mouseup', () => {
    ligar190.style.backgroundColor = '';
    textoLigar.style.color = '';
    iconeLigar.src = '../imagem/telefone.png'; 
});

const seta_circular = document.getElementById('cpf-button')

seta_circular.addEventListener('click', function(){
    window.location.href = '/assets/html/pré-denucia.html'
})

//testado