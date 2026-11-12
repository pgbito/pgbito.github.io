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

const mew = document.createElement("div");
mew.id = "mew";
mew.className = "sprite";
mew.style.width = "150px"; // fix
mew.style.height = "100px";
mew.style.userSelect = "none";
mew.style.webkitUserSelect = "none";
mew.style.webkitUserDrag = "none";

const mewImg = document.createElement("img");
mewImg.src = "js/mew.gif";
mewImg.id = "mew-img";
mewImg.style.width = "100%";
mewImg.style.height = "100%";
mewImg.style.pointerEvents = "none";
mewImg.draggable = false;
mew.appendChild(mewImg);

stage.appendChild(mew);

const bubble = document.createElement("div");
bubble.className = "speech-bubble";
bubble.id = "pet-bubble";
stage.appendChild(bubble); // globo de texto en el stage

const spriteWidth = 100;
const spriteHeight = 100;

// arranca abajo, centrado horizontal
let x = (stage.clientWidth - spriteWidth) / 2;
let y = stage.clientHeight - spriteHeight;

let facingRight = false;
const speed = 4;
const wanderspeed = 1.2;

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
let snorlax_url = "https://img.pokemondb.net/sprites/black-white/anim/normal/snorlax.gif"

const phrases = [
    "u.u",
    "poco de bañazos todos",
    "hail grasa",
    "zZz..",
    "¿qué estás buscando?",
    "gracias youngbasedgod",
    "q es la vara",
    "me pusieron cacho con richar unu",
    "Sus papás se conocieron en vrchat",
    "Ud no es un mew cállese, ud es usagi y se acabó",
    "Usted sabía que no sé la diferencia entre < y >",
    "ahombrese legal",
    "Vea zorra",
    "Porque la puta zorra de sofía soto no informa ni picha",
    "Ya las mac del cole son la puta mierda más tediosa que han tocado mis manos",
    "Estoy jugando ruleta rusa con jorge a ver cuántas clases aguanto sin entregar nada",
    "Hijueputa pickme pensó que me iba a dejar mal según ella",
    "Kiwi es el verdadero goonerboy",
    "Mañana le digo a jeffrey que si me deja hacer el examen con una pacha",
    "Su puta mierda de mii se enamora de cualquier hijueputa menos de mí",
    "De q se salió el fantasma del juego y se le metió a usted",
    "De q el profe está escapado",
    "Seguro por eso ando con cara de culo",
    "No me puede doler la jupa por estrés laboral",
    "Yo no soy air conditioner boy",
    "Si no llega ningún bus bañazo",
    "De q berrinche mid cracking por estar desperate",
    "10 minutos buscando la mierda esa",
    "Jamás seré un eevee de cualquier tipo prefiero suicidarme",
    "Una vez tuve q hacerlo en el colegio a lo bañazo por querer farmear aura en física",
    "Ya basta me blusheo y me tiro por la ventana del bus",
    "La agarro a pichazos",
    "Espero q usted tenga pasta porque si no me voy a matar",
    "Jueputa larper",
    "Kiwi tmb es ninfómano",
    "Me fui a leer en qué aula me toca y no ví ni mierda",
    "No hice ni mierda de lo que me pidió",
    "Almohada de angry birds",
    "Frustración nivel dios",
    "Para ni mierda me levanté",
    "De q si el chofer no frena me tiro por la ventana y que el MOPT me pague el ataúd",
    "Prefiero tragarme un clavo oxidado antes que volver a pisar el aula de diseño",
    "La orientadora me vio con una cara de que si hablo me manda a internar a la Carit",
    "De q me dio un ataque de pánico pero aesthetic escuchando Crystal Castles",
    "Esa mae tiene cara de que todavía le pide permiso a la mamá para ir a Walmart",
    "Un día de estos le tiro la laptop por la jupa al profe y me largo a vivir debajo de un puente",
    "Tengo más ganas de morir que de averiguar qué entra en el examen de mate",
    "De q el cole huele a humedad y a bañazos sin futuro",
    "Ese mae cree que por andar stickers de Evangelion en la botella ya tiene aura",
    "Me voy a cambiar de identidad y hacerme pasar por un gato de la calle a ver si no me cobran impuestos",
    "Vea zorra, si no hay café ni me dirija la palabra",
    "De q mi salud mental depende al 100% de que no cancelen el bus de las 2",
    "Cállese la jupa, no ve que estoy disociando en paz?",
    "A veces siento que la profe de cívica me odia por ser superior moralmente",
    "Tres horas en bus para venir a escuchar a un viejo hablar paja, qué rica mi vida"
];

function showBubble(text) {
    bubble.innerText = text;
    bubble.style.opacity = 1;

    setTimeout(() => {
        bubble.style.opacity = 0;
    }, 4000);
}

mew.addEventListener("click", () => {
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    showBubble(randomPhrase);
    pickNewWanderDirection();
});

function pickNewWanderDirection() {
    const options = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 },
        { x: 1, y: 1 }, { x: 1, y: -1 },
        { x: -1, y: 1 }, { x: -1, y: -1 }
    ];
    if (state === "ON_WINDOW") {
        // Only walk left or right on the window
        const optionsWindow = [{ x: 1, y: 0 }, { x: -1, y: 0 }];
        wanderDir = optionsWindow[Math.floor(Math.random() * optionsWindow.length)];
        wanderTimer = 60 + Math.floor(Math.random() * 80);
    } else {
        wanderDir = options[Math.floor(Math.random() * options.length)];
        wanderTimer = 40 + Math.floor(Math.random() * 60);
    }
}

pickNewWanderDirection();

function updateFacing(dirX) {
    if (dirX > 0 && !facingRight) {
        facingRight = true;
        mew.classList.add("flipped");
    }
    if (dirX < 0 && facingRight) {
        facingRight = false;
        mew.classList.remove("flipped");
    }
}

function checkWindowCollisions() {
    // Buscar ventanas activas (abiertas)
    const windows = document.querySelectorAll('.window.active');
    let foundWindow = null;

    // Centro de Mew
    const mewCenterX = x + (spriteWidth / 2);
    const mewCenterY = y + (spriteHeight / 2);

    windows.forEach(win => {
        if (win.style.display === 'none') return; // Ignorar ventanas ocultas
        if (win.id === 'mobile-detect-win') return; // Ignorar el popup de móviles
        // Ignorar la ventana de carga / progress bar si la hay
        if (win.querySelector('#progress_holder')) return;

        const titleBar = win.querySelector('.title-bar');
        if (!titleBar) return;

        const rect = titleBar.getBoundingClientRect();

        // El punto central inferior de Mew (sus pies)
        const mewFootX = x + (spriteWidth / 2);
        const mewFootY = y + spriteHeight;

        // Si los pies de Mew están dentro del title bar
        if (mewFootX >= rect.left && mewFootX <= rect.right &&
            mewFootY >= rect.top && mewFootY <= rect.bottom) {
            foundWindow = { rect: rect, element: win };
        }
    });

    return foundWindow;
}

function gameLoop() {
    let dirX = 0;
    let dirY = 0;

    if (sitCooldown > 0) {
        sitCooldown--;
    }

    if (state === "WANDERING" && sitCooldown === 0) {
        const winInfo = checkWindowCollisions();
        if (winInfo) {
            state = "ON_WINDOW";
            currentWindowElement = winInfo.element;

            // Adjust sprite for seated
            mewImg.src = "js/seated.png";
            mew.style.width = "180px"; // Make it slightly larger to compensate for empty padding
            mew.style.height = "180px"; // Fix squash

            // Snap to title bar
            const titleRect = winInfo.element.querySelector('.title-bar').getBoundingClientRect();
            // Align feet to the bottom of the title bar
            const sitSpriteHeight = 180;
            y = titleRect.bottom - sitSpriteHeight;

            // Hablar al sentarse el 30% de las veces
            if (Math.random() < 0.3) {
                const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
                showBubble(randomPhrase);
            }

            // Set random sit duration (3 to 5 seconds) assuming ~60 FPS
            sitTimer = 60 * (3 + Math.random() * 2);
        }
    }

    if (state === "ON_WINDOW") {
        sitTimer--;

        // Check if window closed or hidden
        if (!currentWindowElement || currentWindowElement.style.display === 'none') {
            sitTimer = 0;
        } else {
            // Keep attached to title bar in case it moves
            const titleBar = currentWindowElement.querySelector('.title-bar');
            if (titleBar) {
                const titleRect = titleBar.getBoundingClientRect();
                const sitSpriteHeight = 180;
                y = titleRect.bottom - sitSpriteHeight;

                // Keep X within window bounds
                const centerX = x + (spriteWidth / 2);
                if (centerX < titleRect.left) x = titleRect.left - (spriteWidth / 2);
                if (centerX > titleRect.right) x = titleRect.right - (spriteWidth / 2);
            }
        }

        if (sitTimer <= 0) {
            // Get up
            state = "WANDERING";
            currentWindowElement = null;
            mewImg.src = "js/mew.gif";
            mew.style.width = "150px";
            mew.style.height = "100px";
            sitCooldown = 120; // 2 seconds cooldown
            pickNewWanderDirection();
        }
    }

    if (state === "WANDERING") {
        if (usingKeyboard) {
            if (keys.ArrowRight) dirX += 1;
            if (keys.ArrowLeft) dirX -= 1;
            if (keys.ArrowUp) dirY -= 1;
            if (keys.ArrowDown) dirY += 1;
        } else {
            wanderTimer--;
            if (wanderTimer <= 0) {
                pickNewWanderDirection();
            }
            dirX = wanderDir.x;
            dirY = wanderDir.y;
        }
    }

    if (dirX !== 0) updateFacing(dirX);

    // Apply movement
    x += dirX * wanderspeed;
    if (state !== "ON_WINDOW") {
        y += dirY * wanderspeed;
    }

    // Boundaries: no se puede salir de la pantalla
    const maxX = stage.clientWidth - spriteWidth;
    const maxY = stage.clientHeight - spriteHeight;

    if (x < 0) {
        x = 0;
        if (!usingKeyboard) pickNewWanderDirection();
    }
    if (x > maxX) {
        x = maxX;
        if (!usingKeyboard) pickNewWanderDirection();
    }
    if (y < 0) {
        y = 0;
        if (!usingKeyboard) pickNewWanderDirection();
    }
    if (y > maxY) {
        y = maxY;
        if (!usingKeyboard) pickNewWanderDirection();
    }

    mew.style.left = x + "px";
    mew.style.top = y + "px";

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

        // Evitar que salga por arriba (pasarlo abajo de Mew)
        if (bY < 10) {
            bY = y + spriteHeight + 15;
            bubble.classList.add("bubble-below");
        } else {
            bubble.classList.remove("bubble-below");
        }

        // Posicionar el rabillo del globo para que siempre apunte a Mew
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
