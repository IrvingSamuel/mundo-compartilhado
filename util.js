import * as THREE from 'three';

// Estado global da simulação (relógio do jogo, contadores do HUD).
export const estado = { cena: null, t: 0, hora: 6, dia: 1, noite: false, colheitas: 0, ovos: 0 };

export const rand = (a, b) => a + Math.random() * (b - a);
export const escolha = lista => lista[Math.floor(Math.random() * lista.length)];
export const aproximar = (atual, alvo, k) => atual + (alvo - atual) * Math.min(1, k);

const mats = new Map();
export function mat(cor) {
  if (!mats.has(cor)) mats.set(cor, new THREE.MeshLambertMaterial({ color: cor, flatShading: true }));
  return mats.get(cor);
}

export function malha(geo, cor, x = 0, y = 0, z = 0, pai = estado.cena) {
  const m = new THREE.Mesh(geo, typeof cor === 'number' ? mat(cor) : cor);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  pai.add(m);
  return m;
}

const GEO_CAIXA = new THREE.BoxGeometry(1, 1, 1);
export function caixa(w, h, d, cor, x, y, z, pai) {
  const m = malha(GEO_CAIXA, cor, x, y, z, pai);
  m.scale.set(w, h, d);
  return m;
}

export function grupo(x = 0, y = 0, z = 0, pai = estado.cena) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  pai.add(g);
  return g;
}

export function virarPara(obj, ang, dt) {
  const d = Math.atan2(Math.sin(ang - obj.rotation.y), Math.cos(ang - obj.rotation.y));
  obj.rotation.y += d * Math.min(1, dt * 8);
}

// Anda em direção a (x, z); devolve true quando chegou.
export function mover(obj, x, z, vel, dt, dist = 0.15) {
  const dx = x - obj.position.x, dz = z - obj.position.z, d = Math.hypot(dx, dz);
  if (d <= dist) return true;
  const passo = Math.min(d, vel * dt);
  obj.position.x += (dx / d) * passo;
  obj.position.z += (dz / d) * passo;
  virarPara(obj, Math.atan2(dx, dz), dt);
  return false;
}

// Partículas (fumaça, água, sementes) e balões de emoji compartilham o mesmo ciclo de vida.
const particulas = [];
const GEO_PART = new THREE.BoxGeometry(1, 1, 1);

function nascer(obj, pos, tam, { vel = [0, 1, 0], vida = 1, grav = 0, cresce = 0 }) {
  obj.position.copy(pos);
  obj.scale.setScalar(tam);
  obj.userData = { v: new THREE.Vector3(...vel), vida, vida0: vida, grav, cresce };
  estado.cena.add(obj);
  particulas.push(obj);
}

export function particula(pos, { cor = 0xffffff, tam = 0.15, ...resto } = {}) {
  nascer(new THREE.Mesh(GEO_PART, new THREE.MeshLambertMaterial({ color: cor, transparent: true })), pos, tam, resto);
}

const texturas = new Map();
function texturaEmoji(txt) {
  if (!texturas.has(txt)) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 64, 72);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    texturas.set(txt, t);
  }
  return texturas.get(txt);
}

export function balao(txt, pos, { tam = 0.9, sobe = 1.2, vida = 1.6 } = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaEmoji(txt), transparent: true, depthWrite: false }));
  nascer(s, pos, tam, { vel: [0, sobe, 0], vida });
}

export function atualizarParticulas(dt) {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i], u = p.userData;
    if ((u.vida -= dt) <= 0) {
      estado.cena.remove(p);
      p.material.dispose();
      particulas.splice(i, 1);
      continue;
    }
    u.v.y -= u.grav * dt;
    p.position.addScaledVector(u.v, dt);
    p.scale.multiplyScalar(1 + u.cresce * dt);
    p.rotation.x += dt * 2;
    p.material.opacity = Math.min(1, (u.vida / u.vida0) * 2);
  }
}
