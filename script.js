function order(product){

let pesan="Halo saya ingin membeli "+product

let link="https://wa.me/6281240617628?text="+encodeURIComponent(pesan)

window.open(link)

}