import * as THREE from 'three';

// --- NANO BANANA PROCEDURAL TEXTURE & NORMAL MAP GENERATOR ---

function generateNormalMap(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const normCanvas = document.createElement('canvas');
    normCanvas.width = width;
    normCanvas.height = height;
    const nCtx = normCanvas.getContext('2d');
    const nImgData = nCtx.createImageData(width, height);
    const nData = nImgData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            // Simple Sobel-ish filter for normals
            const left = data[((y * width + Math.max(0, x - 1)) * 4)];
            const right = data[((y * width + Math.min(width - 1, x + 1)) * 4)];
            const up = data[(((Math.max(0, y - 1)) * width + x) * 4)];
            const down = data[(((Math.min(height - 1, y + 1)) * width + x) * 4)];

            const dx = (right - left) / 255;
            const dy = (down - up) / 255;
            const dz = 1.0 / 2.0; // Strength

            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            nData[i] = ((dx / len) * 0.5 + 0.5) * 255;
            nData[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
            nData[i + 2] = (dz / len) * 255;
            nData[i + 3] = 255;
        }
    }
    nCtx.putImageData(nImgData, 0, 0);
    return new THREE.CanvasTexture(normCanvas);
}

export function createEnemyTexture(type, state = 'idle', variant = 0) {
    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 512;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    const centerX = 256;
    const isHurt = state === 'hurt';
    
    let skinColor = '#FDC';
    let shirtColor = '#FFF';
    let suitColor = '#005';
    let tieColor = '#FE0';
    let fatLevel = 1.0;
    let scale = 1.0;
    let hairColor = '#654';
    let accessory = 'none';

    switch(type) {
        case 'jarnror': suitColor = '#111'; tieColor = '#F00'; fatLevel = 0.95; accessory = 'iron-pipe'; break;
        case 'bss_retro': suitColor = '#232'; shirtColor = '#DDD'; hairColor = 'none'; accessory = 'suspender-thin'; fatLevel = 1.1; break;
        case 'ian_bert': 
            if (variant % 2 === 0) { suitColor = '#555'; tieColor = '#0F0'; fatLevel = 1.6; hairColor = 'none'; accessory = 'smiling'; }
            else { suitColor = '#008'; tieColor = '#FFF'; fatLevel = 0.85; hairColor = '#FFF'; accessory = 'aristocrat'; }
            break;
        case 'lars_werner': suitColor = '#422'; shirtColor = '#CCC'; tieColor = 'none'; fatLevel = 1.2; hairColor = '#888'; accessory = 'snaps'; break;
        case 'nmr_elite': suitColor = '#111'; shirtColor = '#FFF'; tieColor = '#080'; accessory = 'armband'; fatLevel = 1.05; break;
        case 'm_retro': suitColor = '#004'; tieColor = '#8AF'; hairColor = '#FFF'; accessory = 'cigar'; fatLevel = 1.15; break;
        case 'ebba': suitColor = '#026'; shirtColor = '#8AF'; hairColor = '#FE0'; fatLevel = 0.9; accessory = 'falukorv'; break;
        case 'jimmie': suitColor = '#005'; tieColor = '#FE0'; fatLevel = 1.2; accessory = 'smug'; break;
        case 'ulf': suitColor = '#111'; tieColor = '#555'; fatLevel = 0.85; scale = 0.7; accessory = 'heavy-glasses'; break;
        default:
            const sdVariants = [
                { suit: '#345', tie: '#FE0', fat: 1.3, hair: '#654', acc: 'combover', skin: '#ECC' },
                { suit: '#222', tie: '#00F', fat: 1.4, hair: '#432', acc: 'glasses', skin: '#FDC' },
                { suit: '#444', tie: '#F00', fat: 1.2, hair: 'none', acc: 'sweaty', skin: '#FAA' }
            ];
            const v = sdVariants[variant % sdVariants.length];
            suitColor = v.suit; tieColor = v.tie; fatLevel = v.fat; hairColor = v.hair; accessory = v.acc; skinColor = v.skin;
    }

    if (isHurt) { suitColor = '#F00'; skinColor = '#FAA'; }

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(centerX * (1/scale - 1), 512 * (1/scale - 1));
    const bodyW = 200 * fatLevel;
    ctx.fillStyle = suitColor; ctx.fillRect(centerX - bodyW/2, 240, bodyW, 260);
    ctx.fillStyle = shirtColor; ctx.fillRect(centerX - 30, 240, 60, 160);
    if (tieColor !== 'none') {
        ctx.fillStyle = tieColor; ctx.beginPath(); ctx.moveTo(centerX, 250);
        ctx.lineTo(centerX + 20, 380); ctx.lineTo(centerX - 20, 380); ctx.fill();
    }
    ctx.fillStyle = skinColor; const headW = 140 * fatLevel;
    ctx.fillRect(centerX - headW/2, 80, headW, 160);
    ctx.fillStyle = hairColor;
    if (accessory === 'combover') {
        ctx.fillRect(centerX - headW/2 - 10, 80, headW + 10, 30); ctx.fillRect(centerX + headW/2 - 20, 80, 20, 100);
    } else if (hairColor !== 'none') {
        ctx.fillRect(centerX - headW/2 - 10, 80, headW + 20, 40);
    }
    ctx.fillStyle = '#000'; ctx.fillRect(centerX - 40, 150, 20, 20); ctx.fillRect(centerX + 20, 150, 20, 20); 
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath();
    if (accessory === 'smug') ctx.arc(centerX, 200, 30, 0.2, Math.PI - 0.2);
    else { ctx.moveTo(centerX - 30, 210); ctx.lineTo(centerX + 30, 210); }
    ctx.stroke();
    if (accessory === 'iron-pipe') { ctx.fillStyle = '#888'; ctx.fillRect(centerX + bodyW/2, 200, 30, 200); }
    if (accessory === 'falukorv') { ctx.fillStyle = '#C00'; ctx.beginPath(); ctx.arc(centerX + bodyW/2, 350, 40, 0, Math.PI*2); ctx.fill(); }
    if (accessory === 'armband') { ctx.fillStyle = '#F00'; ctx.fillRect(centerX - bodyW/2, 300, 40, 40); ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(centerX - bodyW/2 + 20, 320, 15, 0, Math.PI*2); ctx.fill(); }
    if (accessory === 'cigar') { ctx.fillStyle = '#421'; ctx.fillRect(centerX + 20, 210, 40, 10); }
    ctx.restore();
    
    const colorMap = new THREE.CanvasTexture(cvs);
    colorMap.magFilter = THREE.NearestFilter;
    const normalMap = generateNormalMap(cvs);
    
    return { colorMap, normalMap };
}

export function createWallDecoration(type) {
    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 512;
    const ctx = cvs.getContext('2d');
    
    // Background paper texture
    ctx.fillStyle = '#DDD'; ctx.fillRect(0,0,512,512);
    for(let i=0; i<1000; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.05})`;
        ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
    }
    
    switch(type) {
        case 'swedish':
            ctx.fillStyle = '#005293'; ctx.fillRect(50, 50, 412, 412);
            ctx.fillStyle = '#FECC02'; ctx.fillRect(180, 50, 60, 412); ctx.fillRect(50, 220, 412, 60);
            break;
        case 'nydemokrati':
            ctx.fillStyle = '#EEE'; ctx.fillRect(80, 40, 352, 432);
            ctx.fillStyle = '#FF0'; ctx.beginPath(); ctx.arc(256, 150, 80, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.stroke();
            ctx.fillStyle = '#000'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
            ctx.fillText('DRAG UNDER', 256, 350); ctx.fillText('GALOSCHERNA!', 256, 410);
            break;
        case 'ultima_thule':
            ctx.fillStyle = '#111'; ctx.fillRect(80, 40, 352, 432);
            ctx.fillStyle = '#AAA'; ctx.font = 'bold 50px serif'; ctx.textAlign = 'center';
            ctx.fillText('ULTIMA', 256, 200); ctx.fillText('THULE', 256, 280);
            ctx.fillStyle = '#C00'; ctx.font = 'bold 30px Arial'; ctx.fillText('SVERIGE ÄR VÅRT', 256, 380);
            break;
        case 'valstuga':
            ctx.fillStyle = '#C00'; ctx.fillRect(80, 40, 352, 432);
            ctx.fillStyle = '#FFF'; ctx.font = 'bold 60px Arial'; ctx.textAlign = 'center';
            ctx.fillText('VALSTUGA', 256, 200);
            ctx.font = '30px Arial'; ctx.fillText('KOM IN OCH SNACKA!', 256, 300);
            break;
        case 'demokrati':
            ctx.fillStyle = '#DAA520'; ctx.fillRect(80, 40, 352, 432); // Gold
            ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 10; ctx.strokeRect(90, 50, 332, 412);
            ctx.fillStyle = '#000'; ctx.font = 'bold 40px serif'; ctx.textAlign = 'center';
            ctx.fillText('DEMOKRATI', 256, 200);
            ctx.font = 'italic 20px serif'; ctx.fillText('Sveriges sista hopp', 256, 300);
            break;
        case 'foliehatt':
            ctx.fillStyle = '#333'; ctx.fillRect(80, 40, 352, 432);
            ctx.fillStyle = '#AAA'; // Silver
            ctx.beginPath(); ctx.moveTo(256, 100); ctx.lineTo(350, 300); ctx.lineTo(162, 300); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
            ctx.fillText('DE VET ALLT!', 256, 380);
            break;
        case 'jarnror_prop':
            ctx.fillStyle = '#222'; ctx.fillRect(80, 40, 352, 432);
            ctx.fillStyle = '#888'; ctx.fillRect(150, 150, 20, 250); // The pipe
            ctx.fillStyle = '#F00'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
            ctx.fillText('STÅLSTARK', 256, 120);
            break;
    }
    
    const colorMap = new THREE.CanvasTexture(cvs);
    const normalMap = generateNormalMap(cvs);
    
    return { colorMap, normalMap };
}
