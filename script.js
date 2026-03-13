// Tombol beli otomatis ke WhatsApp
function buy(item){
    let phone = "6281240617628"; // ganti nomor WA kamu
    let message = encodeURIComponent("Halo, saya ingin membeli: " + item);
    window.open("https://wa.me/" + phone + "?text=" + message, "_blank");
}

// Flash Sale Countdown
let countDownDate = new Date();
countDownDate.setHours(countDownDate.getHours() + 24);

function updateCountdown(){
    let now = new Date().getTime();
    let distance = countDownDate - now;
    let days = Math.floor(distance / (1000*60*60*24));
    let hours = Math.floor((distance % (1000*60*60*24))/(1000*60*60));
    let minutes = Math.floor((distance % (1000*60*60))/(1000*60));
    let seconds = Math.floor((distance % (1000*60))/1000);

    document.getElementById("days").innerText = days.toString().padStart(2,"0");
    document.getElementById("hours").innerText = hours.toString().padStart(2,"0");
    document.getElementById("minutes").innerText = minutes.toString().padStart(2,"0");
    document.getElementById("seconds").innerText = seconds.toString().padStart(2,"0");

    if(distance < 0){
        clearInterval(timerInterval);
        document.querySelector(".flash-sale").innerHTML="<h2>Flash Sale Telah Berakhir!</h2>";
    }
}
let timerInterval = setInterval(updateCountdown,1000);
updateCountdown();

// Search akun
function searchAccount(){
    let input = document.getElementById("searchInput").value.toLowerCase();
    let products = document.querySelectorAll(".product-grid .product");
    products.forEach(prod=>{
        let text = prod.querySelector("h3").innerText.toLowerCase();
        prod.style.display = text.includes(input)?"block":"none";
    });
}

// Banner Slider
let currentSlide = 0;
const slides = document.querySelectorAll(".banner-slider .slide");
function showNextSlide(){
    currentSlide = (currentSlide +1) % slides.length;
    const offset = -currentSlide * 100;
    document.querySelector(".banner-slider .slides").style.transform = `translateX(${offset}%)`;
}
setInterval(showNextSlide,4000); // 4 detik per banner