function buy(product){

let nomor="6281240617628"

let pesan="Halo saya ingin membeli "+product

let link="https://wa.me/"+nomor+"?text="+encodeURIComponent(pesan)

window.open(link)

}


let banner=[
"images/banner1.jpg",
"images/banner2.jpg"
]

let i=0

setInterval(function(){

i++

if(i>=banner.length){
i=0
}

document.getElementById("slider").src=banner[i]

},)


document.getElementById("search").addEventListener("keyup",function(){

let value=this.value.toLowerCase()

let products=document.querySelectorAll(".product")

products.forEach(function(card){

let text=card.innerText.toLowerCase()

if(text.includes(value)){
card.style.display="block"
}else{
card.style.display="none"
}

})

})