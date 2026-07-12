const btn = document.getElementById("surpriseBtn");
const imageBox = document.getElementById("imageReveal");
const typingText = document.getElementById("typingText");
const music = document.getElementById("music");

const message =
"Happy Birthday, my love 😈🔥 you own my heart, my thoughts, and every wild desire in between 😘❤️‍🔥Tonight isn’t just about candles and cake—it’s about passion, obsession, and you being dangerously unforgettable 🖤🔥🎂";

let i = 0;
function typeText(){
    if(i < message.length){
        typingText.innerHTML += message.charAt(i);
        i++;
        setTimeout(typeText,80);
    }
}
const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

function firework(x,y){
    const p=[];
    for(let i=0;i<50;i++){
        p.push({
            x,y,
            a:Math.random()*Math.PI*2,
            s:Math.random()*8+2,
            l:60
        });
    }
    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        p.forEach(o=>{
            o.x+=Math.cos(o.a)*o.s;
            o.y+=Math.sin(o.a)*o.s;
            o.l--;
            ctx.fillStyle="white";
            ctx.fillRect(o.x,o.y,2,2);
        });
        if(p[0].l>0) requestAnimationFrame(animate);
    }
    animate();
}

function sparkles(){
    for(let i=0;i<20;i++){
        setTimeout(()=>{
            firework(
                Math.random()*innerWidth,
                Math.random()*innerHeight/2
            );
        },i*150);
    }
}

btn.addEventListener("click",()=>{
    imageBox.classList.remove("hidden");
    imageBox.classList.add("show");

    typingText.innerHTML="";
    i=0;
    typeText();
    sparkles();

    music.play();
});
function createBgHeart() {
    const heart = document.createElement("div");
    heart.className = "bg-heart";

    const hearts = ["💖", "🔥", "🎶", "❤️"];
    heart.innerHTML = hearts[Math.floor(Math.random() * hearts.length)];

    heart.style.left = Math.random() * 100 + "vw";
    heart.style.fontSize = Math.random() * 20 + 36 + "px";
    heart.style.animationDuration = Math.random() * 2 + 4 + "s";

    document.body.appendChild(heart);

    setTimeout(() => {
        heart.remove();
    }, 10000);
}

setInterval(createBgHeart, 400);
