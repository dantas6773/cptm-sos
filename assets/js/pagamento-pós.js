const incrementarBilhetes = document.getElementById("incrementar-bilhetes")
const decrementarBilhetes = document.getElementById("decrecimo-bilhetes")
const quantidadeBilhetes = document.getElementById("quantidade-bilhetes")
const valorBilhetes = document.getElementById("valor-bilhetes")


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




