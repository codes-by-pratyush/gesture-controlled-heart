const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ---------------- GLOBAL STATE ----------------
let fistClosed = false;
let heartFormationSpeed = 0.05; // change this value


// ---------------- PARTICLE CLASS ----------------
class Particle {
    constructor(index, total) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;

        this.baseSpeed = 4.2;
        this.vx = (Math.random() - 0.5) * this.baseSpeed;
        this.vy = (Math.random() - 0.5) * this.baseSpeed;

        this.radius = 1;

        // HEART TARGET (PARAMETRIC EQUATION)
        const t = (index / total) * Math.PI * 2;

        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy =
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t);

        const scale = 12;

        this.tx = canvas.width / 2 + hx * scale;
        this.ty = canvas.height / 2 - hy * scale;
    }

    update() {
        if (fistClosed) {
            // Smooth attraction to heart shape
            this.x += (this.tx - this.x) * heartFormationSpeed;
            this.y += (this.ty - this.y) * heartFormationSpeed;

        } else {
            // Faster free motion when hand is open
            const speedMultiplier = 2.5;
            this.x += this.vx * speedMultiplier;
            this.y += this.vy * speedMultiplier;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#e8c2c2";
        ctx.fill();
    }
}

// ---------------- CREATE PARTICLES ----------------
const PARTICLE_COUNT = 300;
const particles = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle(i, PARTICLE_COUNT));
}

// ---------------- CONNECTION LINES ----------------
function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 60) {
                ctx.strokeStyle = `rgba(255,80,100,${1 - dist / 60})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

// ---------------- ANIMATION LOOP ----------------
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    if (fistClosed) {
        drawConnections();
    }

    requestAnimationFrame(animate);
}
animate();

// ---------------- MEDIAPIPE HANDS ----------------
const hands = new Hands({
    locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
});

hands.onResults(onResults);

const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 640,
    height: 480,
});
camera.start();

// ---------------- GESTURE LOGIC ----------------
function isFist(landmarks) {
    return (
        landmarks[8].y > landmarks[6].y &&
        landmarks[12].y > landmarks[10].y &&
        landmarks[16].y > landmarks[14].y &&
        landmarks[20].y > landmarks[18].y
    );
}

function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        fistClosed = isFist(landmarks);
    } else {
        // Hand left frame → reset
        fistClosed = false;
    }
}
