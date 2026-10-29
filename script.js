/* ─── Performance Bar Chart (Pure Canvas) ─── */
(function () {
    const canvas = document.getElementById('perfChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const data = [
        { label: 'ECB',  enc: 95, dec: 95, color: '#f87171' },
        { label: 'CBC',  enc: 52, dec: 88, color: '#fbbf24' },
        { label: 'CFB',  enc: 50, dec: 85, color: '#60a5fa' },
        { label: 'OFB',  enc: 48, dec: 48, color: '#2dd4bf' },
        { label: 'CTR',  enc: 93, dec: 93, color: '#818cf8' },
        { label: 'GCM',  enc: 88, dec: 88, color: '#34d399' },
    ];

    function draw() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;

        ctx.clearRect(0, 0, W, H);

        const left   = 60;
        const right  = 30;
        const top    = 40;
        const bottom = 60;
        const chartW = W - left - right;
        const chartH = H - top - bottom;

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = top + chartH - (chartH * i / 5);
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + chartW, y);
            ctx.stroke();

            ctx.fillStyle = '#6b7a99';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText((i * 20) + '%', left - 10, y + 4);
        }

        // Bars
        const groupW  = chartW / data.length;
        const barW    = groupW * 0.28;
        const gap     = 6;

        data.forEach((d, i) => {
            const x = left + groupW * i + (groupW - barW * 2 - gap) / 2;

            // Encrypt bar
            const encH = (d.enc / 100) * chartH;
            const encY = top + chartH - encH;
            ctx.fillStyle = d.color;
            roundRect(ctx, x, encY, barW, encH, 4);
            ctx.fill();

            // Decrypt bar
            const decH = (d.dec / 100) * chartH;
            const decY = top + chartH - decH;
            ctx.fillStyle = d.color + '88';
            roundRect(ctx, x + barW + gap, decY, barW, decH, 4);
            ctx.fill();

            // Labels
            ctx.fillStyle = '#e8ecf4';
            ctx.font = 'bold 13px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(d.label, x + barW + gap / 2, top + chartH + 24);

            // Values
            ctx.fillStyle = d.color;
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText(d.enc + '%', x + barW / 2, encY - 6);
            ctx.fillStyle = d.color + 'cc';
            ctx.fillText(d.dec + '%', x + barW + gap + barW / 2, decY - 6);
        });

        // Title
        ctx.fillStyle = '#e8ecf4';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Relative Throughput (% of theoretical max)', W / 2, 20);

        // Legend
        const legX = W / 2 - 80;
        const legY = top + chartH + 46;

        ctx.fillStyle = '#6c8cff';
        ctx.fillRect(legX, legY, 12, 12);
        ctx.fillStyle = '#c8cfe0';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Encrypt', legX + 18, legY + 10);

        ctx.fillStyle = '#6c8cff88';
        ctx.fillRect(legX + 100, legY, 12, 12);
        ctx.fillStyle = '#c8cfe0';
        ctx.fillText('Decrypt', legX + 118, legY + 10);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // Responsive resize
    function resizeCanvas() {
        canvas.style.width  = '100%';
        canvas.style.height = '380px';
        draw();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
})();

/* ─── Smooth reveal on scroll ─── */
(function () {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.mode-card, .perf-card, .vuln-card, .rec-card, .overview-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity .6s ease, transform .6s ease';
        observer.observe(el);
    });
})();

/* ═══════════════════════════════════════════════════════
   AES LIVE DEMO — Encrypt & Decrypt with all modes
   Uses Web Crypto API for AES-CBC, AES-CTR, AES-GCM.
   ECB, CFB, OFB built on top of single-block AES encrypt.
   ═══════════════════════════════════════════════════════ */

/* ── Key Size Selection ── */
let selectedKeySize = 256;

function selectKeySize(btn) {
    document.querySelectorAll('#key-size-group .radio-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedKeySize = parseInt(btn.dataset.value);

    const roundsMap = { 128: 10, 192: 12, 256: 14 };
    const rounds = roundsMap[selectedKeySize];
    document.getElementById('rounds-display').innerHTML =
        '<span class="rounds-badge">' + rounds + ' rounds</span>';
}

const MODE_META = [
    { id: 'ecb', name: 'ECB', full: 'Electronic Codebook',     css: 'ecb', color: '#f87171' },
    { id: 'cbc', name: 'CBC', full: 'Cipher Block Chaining',   css: 'cbc', color: '#fbbf24' },
    { id: 'cfb', name: 'CFB', full: 'Cipher Feedback',         css: 'cfb', color: '#60a5fa' },
    { id: 'ofb', name: 'OFB', full: 'Output Feedback',         css: 'ofb', color: '#2dd4bf' },
    { id: 'ctr', name: 'CTR', full: 'Counter Mode',            css: 'ctr', color: '#818cf8' },
    { id: 'gcm', name: 'GCM', full: 'Galois/Counter Mode',     css: 'gcm', color: '#34d399' },
];

function toHex(buf) {
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function xorBytes(a, b) {
    const out = new Uint8Array(Math.min(a.length, b.length));
    for (let i = 0; i < out.length; i++) out[i] = a[i] ^ b[i];
    return out;
}

function pkcs7Pad(data) {
    const pad = 16 - (data.length % 16);
    const out = new Uint8Array(data.length + pad);
    out.set(data);
    out.fill(pad, data.length);
    return out;
}

function pkcs7Unpad(data) {
    const pad = data[data.length - 1];
    if (pad < 1 || pad > 16) return data;
    for (let i = data.length - pad; i < data.length; i++) {
        if (data[i] !== pad) return data;
    }
    return data.slice(0, data.length - pad);
}

/**
 * Single-block AES encrypt using AES-CBC with zero IV.
 * AES-CBC(zero_IV, P) = AES_encrypt(P XOR 0) = AES_encrypt(P)
 * Web Crypto adds a PKCS7 padding block → 32 bytes out; we take first 16.
 */
async function aesBlockEncrypt(key, block16) {
    const iv = new Uint8Array(16);
    const result = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, block16);
    return new Uint8Array(result).slice(0, 16);
}

/**
 * Single-block AES decrypt.
 * Strategy: Build a 2-block ciphertext [C, E] for CBC decrypt with IV=0.
 * We craft E so the CBC output's last block = all 0x10 (valid PKCS7 full-block padding).
 * CBC decrypt: P1 = AES_dec(C) XOR IV = AES_dec(C) ← this is what we want
 *              P2 = AES_dec(E) XOR C = should be [0x10 * 16]
 * So: AES_dec(E) = [0x10 * 16] XOR C → E = AES_enc([0x10 * 16] XOR C)
 */
async function aesBlockDecrypt(encKey, decKey, block16) {
    const padBlock = new Uint8Array(16).fill(16); // 0x10 = valid PKCS7 full padding
    const feedInput = xorBytes(padBlock, block16);
    const dummyBlock = await aesBlockEncrypt(encKey, feedInput);

    const twoBlocks = new Uint8Array(32);
    twoBlocks.set(block16, 0);
    twoBlocks.set(dummyBlock, 16);

    const iv = new Uint8Array(16);
    const result = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, decKey, twoBlocks);
    // result = P1 only (P2 was the padding block and gets stripped)
    return new Uint8Array(result).slice(0, 16);
}

/* ── ECB ── */
async function ecbEncrypt(encKey, _decKey, plaintext) {
    const padded = pkcs7Pad(plaintext);
    const out = new Uint8Array(padded.length);
    for (let i = 0; i < padded.length; i += 16) {
        const enc = await aesBlockEncrypt(encKey, padded.slice(i, i + 16));
        out.set(enc, i);
    }
    return out;
}

async function ecbDecrypt(encKey, decKey, ciphertext) {
    const out = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i += 16) {
        const dec = await aesBlockDecrypt(encKey, decKey, ciphertext.slice(i, i + 16));
        out.set(dec, i);
    }
    return pkcs7Unpad(out);
}

/* ── CBC ── */
async function cbcEncrypt(encKey, _decKey, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const padded = pkcs7Pad(plaintext);
    const out = new Uint8Array(padded.length);
    let prev = iv;
    for (let i = 0; i < padded.length; i += 16) {
        const xored = xorBytes(padded.slice(i, i + 16), prev);
        const enc = await aesBlockEncrypt(encKey, xored);
        out.set(enc, i);
        prev = enc;
    }
    const result = new Uint8Array(16 + out.length);
    result.set(iv);
    result.set(out, 16);
    return result;
}

async function cbcDecrypt(encKey, decKey, ciphertext) {
    const iv = ciphertext.slice(0, 16);
    const data = ciphertext.slice(16);
    const out = new Uint8Array(data.length);
    let prev = iv;
    for (let i = 0; i < data.length; i += 16) {
        const block = data.slice(i, i + 16);
        const dec = await aesBlockDecrypt(encKey, decKey, block);
        const plain = xorBytes(dec, prev);
        out.set(plain, i);
        prev = block;
    }
    return pkcs7Unpad(out);
}

/* ── CFB (only needs AES encrypt direction) ── */
async function cfbEncrypt(encKey, _decKey, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const out = new Uint8Array(plaintext.length);
    let feedback = iv;
    for (let i = 0; i < plaintext.length; i += 16) {
        const ks = await aesBlockEncrypt(encKey, feedback);
        const len = Math.min(16, plaintext.length - i);
        const cipher = new Uint8Array(16);
        for (let j = 0; j < len; j++) {
            cipher[j] = plaintext[i + j] ^ ks[j];
            out[i + j] = cipher[j];
        }
        feedback = cipher;
    }
    const result = new Uint8Array(16 + plaintext.length);
    result.set(iv);
    result.set(out, 16);
    return result;
}

async function cfbDecrypt(encKey, _decKey, ciphertext) {
    const iv = ciphertext.slice(0, 16);
    const data = ciphertext.slice(16);
    const out = new Uint8Array(data.length);
    let feedback = iv;
    for (let i = 0; i < data.length; i += 16) {
        const ks = await aesBlockEncrypt(encKey, feedback);
        const len = Math.min(16, data.length - i);
        const cBlock = new Uint8Array(16);
        for (let j = 0; j < len; j++) {
            cBlock[j] = data[i + j];
            out[i + j] = data[i + j] ^ ks[j];
        }
        feedback = cBlock;
    }
    return out;
}

/* ── OFB (only needs AES encrypt direction) ── */
async function ofbEncrypt(encKey, _decKey, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const out = new Uint8Array(plaintext.length);
    let feedback = iv;
    for (let i = 0; i < plaintext.length; i += 16) {
        feedback = await aesBlockEncrypt(encKey, feedback);
        const len = Math.min(16, plaintext.length - i);
        for (let j = 0; j < len; j++) out[i + j] = plaintext[i + j] ^ feedback[j];
    }
    const result = new Uint8Array(16 + plaintext.length);
    result.set(iv);
    result.set(out, 16);
    return result;
}

async function ofbDecrypt(encKey, _decKey, ciphertext) {
    const iv = ciphertext.slice(0, 16);
    const data = ciphertext.slice(16);
    const out = new Uint8Array(data.length);
    let feedback = iv;
    for (let i = 0; i < data.length; i += 16) {
        feedback = await aesBlockEncrypt(encKey, feedback);
        const len = Math.min(16, data.length - i);
        for (let j = 0; j < len; j++) out[i + j] = data[i + j] ^ feedback[j];
    }
    return out;
}

/* ── CTR (native Web Crypto) ── */
async function ctrEncrypt(_encKey, _decKey, plaintext, rawKey) {
    const ctrKey = await crypto.subtle.importKey('raw', rawKey,
        { name: 'AES-CTR' }, false, ['encrypt']);
    const counter = crypto.getRandomValues(new Uint8Array(16));
    const enc = await crypto.subtle.encrypt(
        { name: 'AES-CTR', counter, length: 64 }, ctrKey, plaintext);
    const result = new Uint8Array(16 + enc.byteLength);
    result.set(counter);
    result.set(new Uint8Array(enc), 16);
    return result;
}

async function ctrDecrypt(_encKey, _decKey, ciphertext, rawKey) {
    const counter = ciphertext.slice(0, 16);
    const data = ciphertext.slice(16);
    const ctrKey = await crypto.subtle.importKey('raw', rawKey,
        { name: 'AES-CTR' }, false, ['decrypt']);
    const dec = await crypto.subtle.decrypt(
        { name: 'AES-CTR', counter, length: 64 }, ctrKey, data);
    return new Uint8Array(dec);
}

/* ── GCM (native Web Crypto) ── */
async function gcmEncrypt(_encKey, _decKey, plaintext, rawKey) {
    const gcmKey = await crypto.subtle.importKey('raw', rawKey,
        { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 }, gcmKey, plaintext);
    const result = new Uint8Array(12 + enc.byteLength);
    result.set(iv);
    result.set(new Uint8Array(enc), 12);
    return result;
}

async function gcmDecrypt(_encKey, _decKey, ciphertext, rawKey) {
    const iv = ciphertext.slice(0, 12);
    const data = ciphertext.slice(12);
    const gcmKey = await crypto.subtle.importKey('raw', rawKey,
        { name: 'AES-GCM' }, false, ['decrypt']);
    const dec = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 }, gcmKey, data);
    return new Uint8Array(dec);
}

/* ── Dispatcher ── */
const MODES = {
    ecb: { encrypt: ecbEncrypt, decrypt: ecbDecrypt },
    cbc: { encrypt: cbcEncrypt, decrypt: cbcDecrypt },
    cfb: { encrypt: cfbEncrypt, decrypt: cfbDecrypt },
    ofb: { encrypt: ofbEncrypt, decrypt: ofbDecrypt },
    ctr: { encrypt: ctrEncrypt, decrypt: ctrDecrypt },
    gcm: { encrypt: gcmEncrypt, decrypt: gcmDecrypt },
};

/* ── Main Demo Runner ── */
async function runFullDemo() {
    const input = document.getElementById('plaintext-input').value;
    if (!input.trim()) {
        document.getElementById('demo-status').textContent = '⚠️ Please enter some text!';
        return;
    }

    const btn = document.getElementById('run-demo-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Running...';
    document.getElementById('demo-status').textContent = '';
    document.getElementById('demo-results').innerHTML = '';
    document.getElementById('timing-section').style.display = 'none';

    const plainBytes = new TextEncoder().encode(input);

    // Generate a shared AES-256 key
    const masterKey = await crypto.subtle.generateKey(
        { name: 'AES-CBC', length: 256 }, true, ['encrypt', 'decrypt']);
    const rawKey = await crypto.subtle.exportKey('raw', masterKey);

    // Import keys for CBC (used by ECB, CBC, CFB, OFB internally)
    const encKey = await crypto.subtle.importKey('raw', rawKey,
        { name: 'AES-CBC' }, false, ['encrypt']);
    const decKey = await crypto.subtle.importKey('raw', rawKey,
        { name: 'AES-CBC' }, false, ['decrypt']);

    const results = [];

    for (const meta of MODE_META) {
        const mode = MODES[meta.id];
        let ciphertext, decrypted, encTime, decTime;

        try {
            // ENCRYPT
            const t0 = performance.now();
            ciphertext = await mode.encrypt(encKey, decKey, plainBytes, rawKey);
            const t1 = performance.now();
            encTime = t1 - t0;

            // DECRYPT
            const t2 = performance.now();
            decrypted = await mode.decrypt(encKey, decKey, ciphertext, rawKey);
            const t3 = performance.now();
            decTime = t3 - t2;
        } catch (err) {
            console.error(meta.name + ' error:', err);
            results.push({ ...meta, error: err.message });
            continue;
        }

        const decText = new TextDecoder().decode(decrypted);
        const match = decText === input;

        results.push({
            ...meta,
            cipherHex: toHex(ciphertext),
            decryptedText: decText,
            encTime: encTime.toFixed(3),
            decTime: decTime.toFixed(3),
            totalTime: (encTime + decTime).toFixed(3),
            encTimeRaw: encTime,
            decTimeRaw: decTime,
            match,
        });
    }

    renderResults(results);
    renderTimingBars(results);

    btn.disabled = false;
    btn.textContent = '🚀 Encrypt & Decrypt All Modes';
    document.getElementById('demo-status').textContent = '✅ Done!';
}

function renderResults(results) {
    const container = document.getElementById('demo-results');
    container.innerHTML = results.map(r => {
        if (r.error) {
            return '<div class="demo-result-card">' +
                '<div class="demo-card-header ' + r.css + '">' +
                    '<h4>' + r.name + '</h4>' +
                    '<span class="demo-mode-full">' + r.full + '</span>' +
                '</div>' +
                '<div class="demo-card-body">' +
                    '<div class="demo-match match-no">❌ Error: ' + escapeHtml(r.error) + '</div>' +
                '</div>' +
            '</div>';
        }
        return '<div class="demo-result-card">' +
            '<div class="demo-card-header ' + r.css + '">' +
                '<h4>' + r.name + '</h4>' +
                '<span class="demo-mode-full">' + r.full + '</span>' +
            '</div>' +
            '<div class="demo-card-body">' +
                '<div class="demo-field">' +
                    '<div class="demo-field-label">🔒 Ciphertext (hex)</div>' +
                    '<div class="demo-field-value ciphertext-out">' + r.cipherHex + '</div>' +
                '</div>' +
                '<div class="demo-field">' +
                    '<div class="demo-field-label">🔓 Decrypted Text</div>' +
                    '<div class="demo-field-value plaintext-out">' + escapeHtml(r.decryptedText) + '</div>' +
                '</div>' +
                '<div class="demo-timing">' +
                    '<div class="timing-pill enc-time">' +
                        '<div class="timing-label">Encrypt</div>' +
                        '<div class="timing-value">' + r.encTime + ' ms</div>' +
                    '</div>' +
                    '<div class="timing-pill dec-time">' +
                        '<div class="timing-label">Decrypt</div>' +
                        '<div class="timing-value">' + r.decTime + ' ms</div>' +
                    '</div>' +
                '</div>' +
                '<div class="demo-match ' + (r.match ? 'match-yes' : 'match-no') + '">' +
                    (r.match ? '✅ Decrypted text matches original!' : '❌ Mismatch — decryption failed') +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

function renderTimingBars(results) {
    const section = document.getElementById('timing-section');
    const container = document.getElementById('timing-bars');
    const valid = results.filter(r => !r.error);
    if (!valid.length) { section.style.display = 'none'; return; }

    section.style.display = '';
    const maxTime = Math.max(...valid.map(r => r.encTimeRaw + r.decTimeRaw));

    container.innerHTML = valid.map(r => {
        const encPct = maxTime > 0 ? (r.encTimeRaw / maxTime * 100) : 0;
        const decPct = maxTime > 0 ? (r.decTimeRaw / maxTime * 100) : 0;
        const total = r.encTimeRaw + r.decTimeRaw;
        return '<div class="timing-bar-row">' +
            '<div class="timing-bar-label" style="color:' + r.color + '">' + r.name + '</div>' +
            '<div class="timing-bar-track">' +
                '<div class="timing-bar-fill enc-bar" style="width:' + encPct + '%">' + r.encTime + '</div>' +
                '<div class="timing-bar-fill dec-bar" style="width:' + decPct + '%">' + r.decTime + '</div>' +
            '</div>' +
            '<div class="timing-bar-total">' + total.toFixed(3) + ' ms</div>' +
        '</div>';
    }).join('') +
    '<div class="timing-legend">' +
        '<span><span class="dot dot-enc"></span> Encrypt (ms)</span>' +
        '<span><span class="dot dot-dec"></span> Decrypt (ms)</span>' +
    '</div>';
}

function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Active nav highlight ─── */
(function () {
    const links = document.querySelectorAll('.hero-nav a');
    const sections = [];
    links.forEach(a => {
        const id = a.getAttribute('href').slice(1);
        const sec = document.getElementById(id);
        if (sec) sections.push({ el: sec, link: a });
    });

    window.addEventListener('scroll', () => {
        const y = window.scrollY + 120;
        let current = sections[0];
        sections.forEach(s => {
            if (s.el.offsetTop <= y) current = s;
        });
        links.forEach(l => l.style.borderColor = '');
        if (current) current.link.style.borderColor = '#6c8cff';
    });
})();
