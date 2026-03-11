let accounts=JSON.parse(localStorage.getItem("accounts")) || [

{ name:"Level 2450", fruit:"Leopard", price:150000 },
{ name:"Level 2300", fruit:"Dough", price:120000 }

]

let selectedAccount=""
let selectedPrice=""

function renderAccounts(){

let store=document.getElementById("store")

let search=document.getElementById("search").value.toLowerCase()

let filter=document.getElementById("filter").value

store.innerHTML=""

accounts.forEach(acc=>{

if(!acc.name.toLowerCase().includes(search)) return

if(filter!="all" && acc.price>filter) return

store.innerHTML+=`

<div class="card">

<img src="https://i.imgur.com/4YQZ4YB.png">

<h2>${acc.name}</h2>

<p>Fruit : ${acc.fruit}</p>

<p class="price">Rp${acc.price}</p>

<button onclick="buy('${acc.name}','${acc.price}')">Beli</button>

</div>

`

})

}

function buy(a,h){

selectedAccount=a
selectedPrice=h

document.getElementById("popup").style.display="flex"

document.getElementById("detail").innerHTML=
"Akun : "+a+"<br>Harga : Rp"+h

}

function closePopup(){

document.getElementById("popup").style.display="none"

}

function checkout(){

let pesan="Halo saya ingin membeli akun Blox Fruits\n\n"+
"Akun : "+selectedAccount+"\n"+
"Harga : Rp"+selectedPrice

let link="https://wa.me/6281234567890?text="+encodeURIComponent(pesan)

window.open(link)

}

function toggleAdmin(){

let panel=document.getElementById("adminPanel")

panel.style.display=panel.style.display==="block"?"none":"block"

}

function addAccount(){

let name=document.getElementById("name").value
let fruit=document.getElementById("fruit").value
let price=document.getElementById("price").value

accounts.push({name,fruit,price})

localStorage.setItem("accounts",JSON.stringify(accounts))

renderAccounts()

}

renderAccounts()