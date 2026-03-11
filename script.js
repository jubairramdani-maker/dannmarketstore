function order(product){

let message="Halo saya ingin membeli "+product

let link="https://wa.me/6281240617628?text="+encodeURIComponent(message)

window.open(link)

}