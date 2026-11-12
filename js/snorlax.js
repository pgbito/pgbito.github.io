const petStyles = `
    .stage {
        perspective: 400px;
        position: fixed;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        top: 0;
        left: 0;
        pointer-events: none; /* Let clicks pass through stage */
        z-index: 999998; /* Below taskbar but above most things */
    }

    .sprite {
        height: 100px;
        position: absolute;
        top: 0;
        left: 0;
        transition: transform 0.5s ease-in-out;
        transform: rotateY(0deg);
        transform-style: preserve-3d;
        pointer-events: auto; /* Catch clicks on sprite */
        cursor: pointer;
        filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.5));
    }

    .sprite.flipped {
        transform: rotateY(180deg);
    }

    body:not(.active) #pet-stage {
        display: none;
    }

    .speech-bubble {
        position: absolute;
        width: 200px;
        background: #ffffffe6;
        border: 2px solid #333;
        border-radius: 10px;
        padding: 10px;
        font-family: 'Comic Sans MS', sans-serif;
        font-size: 14px;
        color: #333;
        box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
        text-align: center;
        z-index: 999999;
        --tail-pos: 50%;
    }

    .speech-bubble::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: var(--tail-pos);
        margin-left: -10px;
        border-width: 10px 10px 0;
        border-style: solid;
        border-color: #333 transparent transparent transparent;
    }
    .speech-bubble::before {
        content: '';
        position: absolute;
        bottom: -7px;
        left: var(--tail-pos);
        margin-left: -8px;
        border-width: 8px 8px 0;
        border-style: solid;
        border-color: #ffffffe6 transparent transparent transparent;
        z-index: 1;
    }

    .speech-bubble.bubble-below::after {
        bottom: auto;
        top: -10px;
        border-width: 0 10px 10px;
        border-color: transparent transparent #333 transparent;
    }
    .speech-bubble.bubble-below::before {
        bottom: auto;
        top: -7px;
        border-width: 0 8px 8px;
        border-color: transparent transparent #ffffffe6 transparent;
    }
`;

// insertar styles
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = petStyles;
document.head.appendChild(styleSheet);

// insertar HTML
const stage = document.createElement("div");
stage.className = "stage";
stage.id = "pet-stage";
document.body.appendChild(stage);

const snorlax = document.createElement("div");
snorlax.id = "snorlax";
snorlax.className = "sprite";
snorlax.style.width = "150px"; // fix
snorlax.style.height = "150px";
snorlax.style.userSelect = "none";
snorlax.style.webkitUserSelect = "none";
snorlax.style.webkitUserDrag = "none";

const snorlaxImg = document.createElement("img");
snorlaxImg.src = "https://img.pokemondb.net/sprites/black-white/anim/normal/snorlax.gif";
snorlaxImg.id = "snorlax-img";
snorlaxImg.style.width = "100%";
snorlaxImg.style.height = "100%";
snorlaxImg.style.pointerEvents = "none";
snorlaxImg.draggable = false;
snorlax.appendChild(snorlaxImg);

stage.appendChild(snorlax);

const bubble = document.createElement("div");
bubble.className = "speech-bubble";
bubble.id = "pet-bubble";
stage.appendChild(bubble); // globo de texto en el stage

const spriteWidth = 100;
const spriteHeight = 100;

const getGroundY = () => Math.max(0, stage.clientHeight - spriteHeight - 40);

// arranca abajo en el suelo (sobre la taskbar), centrado horizontal
let x = (stage.clientWidth - spriteWidth) / 2;
let y = getGroundY();

let facingRight = false;
const speed = 3;
const wanderspeed = 0.45; // más lento y pesado para Snorlax

let jumpTarget = null;
let jumpStartX = 0;
let jumpStartY = 0;
let jumpTargetX = 0;
let jumpTargetY = 0;
let jumpProgress = 0;
let fallVy = 0;

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false
};

let usingKeyboard = false;

document.addEventListener("keydown", (event) => {
    if (event.key in keys) {
        keys[event.key] = true;
        usingKeyboard = true;
    }
});

document.addEventListener("keyup", (event) => {
    if (event.key in keys) {
        keys[event.key] = false;
        if (!keys.ArrowLeft && !keys.ArrowRight && !keys.ArrowUp && !keys.ArrowDown) {
            setTimeout(() => { usingKeyboard = false; }, 1000);
        }
    }
});

let wanderDir = { x: 0, y: 0 };
let wanderTimer = 0;
let state = "WANDERING"; // 
let sitCooldown = 0; // evitar quese vuelta a sentar
let sitTimer = 0; // tiempo en el que se sienta
let currentWindowElement = null; // The window we are sitting on

const phrases = [
    "yo lloro oyendo el padre nuestro y que",
    "yung beef y c.r.o te amo",
    "a su mama le dicen picha pq me la como toda",
    "bañazo",
    "pacha con cocaína",
    "me voy directo a la luna pero catapultado desde un cañon de plasma y llego hecho añicos",
    "hasta que se me olvide que fui tan ras playasoo",
    "de que mae me arranco el cuerpo",
    "YO NO ANDO GOONEANDO CON EGGMAN",
    "Hoy me voy a meter tussi perico alcohol drogas putas travestis putitos y enanos",
    "El casco q me había regalado Richar mae es gigantesco",
    "Creo q ya no voy despichado ya se volco el bus",
    "QIUEN ES ESTE MMAMAPICHAS",
    "No se sorprenda si mañana amanecen nuevos choferes",
    "mae amo hacer textos de mierda en chatgpt",
    "me está diciendo playo?",
    "esq como el vape es de playos",
    "De q como q mí mamá no me compro binder pq decía q era de playos",
    "Voy a ver si pago la mierda de gimnasio",
    "Y yo sonando el carro como bañazo",
    "No levanto ni mierda",
    "de q llega jueputa clavicular al mopt",
    "De q kinda true pero pura mierda",
    "QUE RICA SOFIA SOTO LEGAL PLAYO ☆*: .｡. o(≧▽≦)o .｡.:*☆",
    "voy a matar a todos los octavos esos y a todos los que le arruinaron la vida",
    "mae a mí se me callan las voces de la jupa",
    "estaba buscando mí fucking cédula",
    "no nos vamos a drogar más",
    "Sexo con profe edwin",
    "Hay un bañazo sonando la moto",
    "Gilipollas en el examen",
    "La gente es muy hijueputa ahora",
    "Que me olía el hocico a mierda",
    "uno mismo se ve como un bodrio",
    "Mae si el bus frena de pichazo salgo volando como un misil balístico",
    "Voy a ir al gimnasio a partirme la espalda solo para no pensar en estupideces",
    "El arroz con atún sabe a depresión pero le mete combustible a los bíceps",
    "De q si me muero pónganme Yung Beef en el entierro y una pacha en la tumba",
    "Mae vi un mae en la calle con tanta pinta de bañazo que casi me da algo en el pecho",
    "Hoy me levanté con ganas de meterle un manazo a una pared de estereofón",
    "Usted me ve aquí tranquilo pero por dentro estoy en pleno arco de villano",
    "Mae la jupa me va a reventar de tanta tontera que habla la gente en este país",
    "Tengo la energía de un gorila esquizofrénico en este momento legal",
    "Legalmente el MOPT debería regalarme la licencia por pura lástima",
    "Me tomé tres Monster y ahora escucho a Dios hablándome en código binario",
    "Ese examen lo voy a batear tan duro que van a tener que llamar a los bomberos",
    "De q si no entreno hoy pierdo el aura y eso sí que jamás playo",
    "Mae qué picha no tener un millón de dólares para comprarme un carro y chocarlo adrede",
    "Ahorita me da una sobredosis de cafeína y me pongo a pelear contra tres chatas en la parada"
];

function showBubble(text) {
    bubble.innerText = text;
    bubble.style.opacity = 1;

    setTimeout(() => {
        bubble.style.opacity = 0;
    }, 4000);
}

snorlax.addEventListener("click", () => {
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    showBubble(randomPhrase);
    pickNewWanderDirection();
});

function getActiveWindowTarget() {
    const windows = Array.from(document.querySelectorAll('.window.active, .window')).filter(win => {
        if (win.style.display === 'none') return false;
        if (win.id === 'mobile-detect-win') return false;
        if (win.querySelector('#progress_holder')) return false;
        const tb = win.querySelector('.title-bar');
        if (!tb) return false;
        const rect = tb.getBoundingClientRect();
        return rect.width > 60 && rect.height > 10;
    });
    if (!windows.length) return null;
    const win = windows[Math.floor(Math.random() * windows.length)];
    const tb = win.querySelector('.title-bar');
    const rect = tb.getBoundingClientRect();
    const sitSpriteHeight = 160;
    const padding = 20;
    const minX = Math.max(0, rect.left + padding);
    const maxX = Math.max(minX, rect.right - spriteWidth - padding);
    const targetX = minX + Math.random() * (maxX - minX);
    const targetY = rect.bottom - sitSpriteHeight;
    return { element: win, targetX, targetY };
}

function startJumpToWindow(target) {
    state = "JUMPING";
    jumpTarget = target;
    jumpStartX = x;
    jumpStartY = y;
    jumpTargetX = target.targetX;
    jumpTargetY = target.targetY;
    jumpProgress = 0;
}

function pickNewWanderDirection() {
    if (state === "ON_WINDOW") {
        // En la ventana camina despacito o se queda echado
        const optionsWindow = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
        wanderDir = optionsWindow[Math.floor(Math.random() * optionsWindow.length)];
        wanderTimer = 70 + Math.floor(Math.random() * 90);
    } else if (state === "WANDERING") {
        // Ocasionalmente salta a una ventana si hay alguna abierta
        if (sitCooldown === 0) {
            const target = getActiveWindowTarget();
            if (target && Math.random() < 0.22) {
                startJumpToWindow(target);
                return;
            }
        }

        // En el suelo es súper pesado y aturado (la mayor parte del tiempo quieto/durmiendo)
        const groundOptions = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: -1, y: 0 }
        ];
        wanderDir = groundOptions[Math.floor(Math.random() * groundOptions.length)];
        if (wanderDir.x === 0) {
            wanderTimer = 90 + Math.floor(Math.random() * 150); // rato largo aturado
        } else {
            wanderTimer = 40 + Math.floor(Math.random() * 60);  // pasitos cortos
        }
    }
}

pickNewWanderDirection();

function updateFacing(dirX) {
    if (dirX > 0 && !facingRight) {
        facingRight = true;
        snorlax.classList.add("flipped");
    }
    if (dirX < 0 && facingRight) {
        facingRight = false;
        snorlax.classList.remove("flipped");
    }
}

function gameLoop() {
    let dirX = 0;
    const groundY = getGroundY();

    if (sitCooldown > 0) {
        sitCooldown--;
    }

    if (state === "JUMPING") {
        jumpProgress += 0.022; // Salto suave en arco
        if (jumpProgress >= 1) {
            state = "ON_WINDOW";
            currentWindowElement = jumpTarget.element;
            x = jumpTargetX;
            y = jumpTargetY;
            snorlax.style.width = "160px";
            snorlax.style.height = "160px";

            // Hablar al sentarse en la ventana
            if (Math.random() < 0.35) {
                const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
                showBubble(randomPhrase);
            }
            sitTimer = 60 * (3 + Math.random() * 3); // 3 a 6 segundos sentado
        } else {
            const t = jumpProgress;
            x = jumpStartX + (jumpTargetX - jumpStartX) * t;
            const linearY = jumpStartY + (jumpTargetY - jumpStartY) * t;
            const arcHeight = Math.max(90, Math.abs(jumpTargetY - jumpStartY) * 0.4 + 70);
            y = linearY - 4 * arcHeight * t * (1 - t);
            if (jumpTargetX !== jumpStartX) {
                updateFacing(jumpTargetX - jumpStartX);
            }
        }
    } else if (state === "ON_WINDOW") {
        sitTimer--;

        if (!currentWindowElement || currentWindowElement.style.display === 'none') {
            sitTimer = 0;
        } else {
            const titleBar = currentWindowElement.querySelector('.title-bar');
            if (titleBar) {
                const titleRect = titleBar.getBoundingClientRect();
                const sitSpriteHeight = 160;
                y = titleRect.bottom - sitSpriteHeight;

                const centerX = x + (spriteWidth / 2);
                if (centerX < titleRect.left) x = titleRect.left - (spriteWidth / 2);
                if (centerX > titleRect.right) x = titleRect.right - (spriteWidth / 2);
            }
        }

        if (sitTimer <= 0) {
            // Se tira de la ventana de vuelta al suelo con gravedad
            state = "FALLING";
            fallVy = 1;
            currentWindowElement = null;
            snorlax.style.width = "110px";
            snorlax.style.height = "100px";
        } else {
            wanderTimer--;
            if (wanderTimer <= 0) {
                pickNewWanderDirection();
            }
            dirX = wanderDir.x;
            x += dirX * wanderspeed;
            if (dirX !== 0) updateFacing(dirX);
        }
    } else if (state === "FALLING") {
        fallVy += 0.6; // gravedad
        y += fallVy;
        if (y >= groundY) {
            y = groundY;
            fallVy = 0;
            state = "WANDERING";
            sitCooldown = 180 + Math.floor(Math.random() * 240); // 3 a 7s cooldown para volver a saltar
            wanderDir = { x: 0, y: 0 };
            wanderTimer = 90; // aterriza y descansa aturado
        }
    } else if (state === "WANDERING") {
        y = groundY; // Siempre en el suelo sobre la taskbar

        if (usingKeyboard) {
            if (keys.ArrowRight) dirX += 1;
            if (keys.ArrowLeft) dirX -= 1;
            if (keys.ArrowUp && sitCooldown === 0) {
                const target = getActiveWindowTarget();
                if (target) startJumpToWindow(target);
            }
        } else {
            wanderTimer--;
            if (wanderTimer <= 0) {
                pickNewWanderDirection();
            }
            dirX = wanderDir.x;
        }

        if (dirX !== 0) updateFacing(dirX);
        x += dirX * wanderspeed;

        // Limites horizontales de pantalla
        const maxX = stage.clientWidth - spriteWidth;
        if (x < 0) {
            x = 0;
            if (!usingKeyboard) pickNewWanderDirection();
        }
        if (x > maxX) {
            x = maxX;
            if (!usingKeyboard) pickNewWanderDirection();
        }
    }

    snorlax.style.left = x + "px";
    snorlax.style.top = y + "px";

    // Posicionar globo de texto dinámicamente
    if (bubble.style.opacity == 1) {
        const bubbleWidth = bubble.offsetWidth;
        const bubbleHeight = bubble.offsetHeight;

        let bX = x + (spriteWidth / 2) - (bubbleWidth / 2);
        let bY = y - bubbleHeight - 15;

        // Evitar que salga por los lados
        if (bX < 10) bX = 10;
        if (bX + bubbleWidth > stage.clientWidth - 10) {
            bX = stage.clientWidth - bubbleWidth - 10;
        }

        // Evitar que salga por arriba (pasarlo abajo de snorlax)
        if (bY < 10) {
            bY = y + spriteHeight + 15;
            bubble.classList.add("bubble-below");
        } else {
            bubble.classList.remove("bubble-below");
        }

        // Posicionar el rabillo del globo para que siempre apunte a snorlax
        let tailPos = (x + (spriteWidth / 2)) - bX;
        if (tailPos < 20) tailPos = 20;
        if (tailPos > bubbleWidth - 20) tailPos = bubbleWidth - 20;

        bubble.style.setProperty('--tail-pos', tailPos + 'px');
        bubble.style.left = bX + "px";
        bubble.style.top = bY + "px";
    }

    requestAnimationFrame(gameLoop);
}

// Start loop
gameLoop();

// Iniciar con un mensaje después de 5 segundos
setTimeout(() => {
    showBubble("haii :3");
}, 5000);
