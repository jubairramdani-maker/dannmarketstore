document.addEventListener("DOMContentLoaded", function() {

    // =============================
    // FLASH SALE COUNTDOWN (100 jam)
    // =============================
    let savedEnd = localStorage.getItem("flashEnd");
    let countDownDate;

    if(savedEnd){
        countDownDate = new Date(savedEnd).getTime();
    } else {
        countDownDate = new Date();
        countDownDate.setHours(countDownDate.getHours() + 100); // 100 jam dari sekarang
        localStorage.setItem("flashEnd", countDownDate);
    }

    function updateCountdown(){
        let now = new Date().getTime();
        let distance = countDownDate - now;

        let days = Math.floor(distance / (1000*60*60*24));
        let hours = Math.floor((distance % (1000*60*60*24))/(1000*60*60));
        let minutes = Math.floor((distance % (1000*60*60))/(1000*60));
        let seconds = Math.floor((distance % (1000*60))/1000);

        if(document.getElementById("days")) document.getElementById("days").innerText = days.toString().padStart(2,"0");
        if(document.getElementById("hours")) document.getElementById("hours").innerText = hours.toString().padStart(2,"0");
        if(document.getElementById("minutes")) document.getElementById("minutes").innerText = minutes.toString().padStart(2,"0");
        if(document.getElementById("seconds")) document.getElementById("seconds").innerText = seconds.toString().padStart(2,"0");

        if(distance < 0){
            clearInterval(timerInterval);
            let flashSection = document.querySelector(".flash-sale");
            if(flashSection) flashSection.innerHTML="<h2>Flash Sale Telah Berakhir!</h2>";
            localStorage.removeItem("flashEnd");
        }
    }

    let timerInterval = setInterval(updateCountdown,1000);
    updateCountdown();

    // =============================
    // BANNER SLIDER
    // =============================
    let currentSlide = 0;
    const slides = document.querySelectorAll(".banner-slider .slide");

    function showNextSlide(){
        if(slides.length === 0) return;
        currentSlide = (currentSlide + 1) % slides.length;
        const offset = -currentSlide * 100;
        document.querySelector(".banner-slider .slides").style.transform = `translateX(${offset}%)`;
    }
    setInterval(showNextSlide, 4000);

    // =============================
    // SEARCH AKUN
    // =============================
    window.searchAccount = function() {
        let input = document.getElementById("searchInput");
        if(!input) return;
        let filter = input.value.toLowerCase();
        let products = document.querySelectorAll(".product-grid .product");
        products.forEach(prod=>{
            let text = prod.querySelector("h3").innerText.toLowerCase();
            prod.style.display = text.includes(filter) ? "block" : "none";
        });
    }

    // =============================
    // BUY BUTTON (WhatsApp)
    // =============================
    window.buy = function(item){
        let phone = "6281240617628"; // Ganti nomor WA kamu
        let message = encodeURIComponent("Halo, saya ingin membeli: " + item);
        window.open("https://wa.me/" + phone + "?text=" + message, "_blank");
    }

});