import * as THREE from 'three';
import { estado, caixa, malha, mover, aproximar, rand, escolha, balao } from './util.js';

export const ovos = [];
const GEO_OVO = new THREE.SphereGeometry(0.09, 8, 6);

// Cada espécie é montada com caixas; extras() acrescenta focinho, chifres, crista etc.
export const ESPECIES = {
  vaca: {
    corpo: [0.85, 0.75, 1.5], cabeca: [0.5, 0.5, 0.55], perna: 0.6, lp: 0.2, cores: [0xf5f2ea, 0x9c6b3e], vel: 0.7,
    extras({ tronco, cabeca, cor }) {
      if (cor === 0xf5f2ea) {
        caixa(0.87, 0.4, 0.5, 0x2b2b2b, 0, 0.45, 0.25, tronco);
        caixa(0.5, 0.77, 0.45, 0x2b2b2b, -0.1, 0.375, -0.4, tronco);
      }
      caixa(0.36, 0.22, 0.12, 0xf2a5a5, 0, 0, 0.53, cabeca);
      for (const s of [-1, 1]) {
        caixa(0.08, 0.16, 0.08, 0xf3e5c0, s * 0.18, 0.4, 0.15, cabeca);
        caixa(0.18, 0.08, 0.1, cor, s * 0.32, 0.25, 0.15, cabeca);
      }
      caixa(0.3, 0.15, 0.3, 0xf2a5a5, 0, -0.05, -0.35, tronco);
      caixa(0.06, 0.5, 0.06, cor, 0, 0.45, -0.77, tronco);
    },
  },
  ovelha: {
    corpo: [0.8, 0.7, 1.0], cabeca: [0.32, 0.36, 0.38], perna: 0.42, lp: 0.13, cor: 0xf4f0e6, corCabeca: 0x3d3030, corPerna: 0x3d3030, corOlho: 0xffffff, vel: 0.6,
    extras({ tronco, cabeca }) {
      caixa(0.9, 0.5, 0.85, 0xf4f0e6, 0, 0.42, 0, tronco);
      caixa(0.36, 0.14, 0.3, 0xf4f0e6, 0, 0.36, 0.14, cabeca);
      for (const s of [-1, 1]) caixa(0.16, 0.07, 0.1, 0x3d3030, s * 0.22, 0.18, 0.12, cabeca);
    },
  },
  porco: {
    corpo: [0.62, 0.55, 0.95], cabeca: [0.46, 0.42, 0.36], perna: 0.25, lp: 0.15, cor: 0xf4a6b8, vel: 0.75, alturaCabeca: 0.55,
    extras({ tronco, cabeca }) {
      caixa(0.26, 0.18, 0.08, 0xe8869d, 0, 0.02, 0.34, cabeca);
      for (const s of [-1, 1]) {
        caixa(0.05, 0.06, 0.02, 0x7a3b4a, s * 0.06, 0.02, 0.385, cabeca);
        caixa(0.12, 0.04, 0.14, 0xe8869d, s * 0.16, 0.27, 0.08, cabeca).rotation.z = s * 0.4;
      }
      caixa(0.06, 0.06, 0.12, 0xe8869d, 0, 0.45, -0.52, tronco);
    },
  },
  galinha: {
    corpo: [0.32, 0.3, 0.42], cabeca: [0.2, 0.24, 0.2], perna: 0.2, lp: 0.05, cores: [0xfafafa, 0xd08a4c], corPerna: 0xf2a33a,
    bipede: true, alturaCabeca: 1.0, cabecaZ: 0.35, vel: 1.0, poeOvos: true, entraCasa: true,
    extras({ tronco, cabeca, cor }) {
      caixa(0.05, 0.1, 0.14, 0xe53935, 0, 0.21, 0.08, cabeca);
      caixa(0.08, 0.06, 0.1, 0xf2a33a, 0, 0.04, 0.2, cabeca);
      caixa(0.04, 0.08, 0.04, 0xe53935, 0, -0.04, 0.16, cabeca);
      caixa(0.2, 0.22, 0.1, cor, 0, 0.36, -0.22, tronco).rotation.x = -0.4;
      for (const s of [-1, 1]) caixa(0.04, 0.16, 0.26, cor, s * 0.17, 0.16, 0, tronco);
    },
  },
};

function montar(s) {
  const g = new THREE.Group();
  const cor = s.cores ? escolha(s.cores) : s.cor;
  const [cw, ch, cd] = s.corpo, [hw, hh, hd] = s.cabeca, ph = s.perna, pw = s.lp;
  const tronco = new THREE.Group();
  tronco.position.y = ph;
  g.add(tronco);
  caixa(cw, ch, cd, cor, 0, ch / 2, 0, tronco);
  const cabeca = new THREE.Group();
  cabeca.position.set(0, ch * (s.alturaCabeca ?? 0.8), cd * (s.cabecaZ ?? 0.5));
  tronco.add(cabeca);
  caixa(hw, hh, hd, s.corCabeca ?? cor, 0, hh * 0.2, hd / 2 - 0.05, cabeca);
  for (const x of [-1, 1]) caixa(0.06, 0.07, 0.03, s.corOlho ?? 0x1a1a1a, x * hw * 0.3, hh * 0.35, hd - 0.04, cabeca);
  // ordem: traseiras primeiro, dianteiras depois (o deitar dobra cada par para um lado)
  const cantos = s.bipede ? [[-cw / 4, 0], [cw / 4, 0]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (cw / 2 - pw / 2), b * (cd / 2 - pw / 2)]);
  const pernas = cantos.map(([x, z]) => {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    tronco.add(p);
    caixa(pw, ph, pw, s.corPerna ?? cor, 0, -ph / 2, 0, p);
    return p;
  });
  s.extras?.({ g, tronco, cabeca, cor });
  s.altura ??= ph + ch + hh + 0.4;
  return { g, tronco, cabeca, pernas, fases: s.bipede ? [0, Math.PI] : [0, Math.PI, Math.PI, 0] };
}

export function recolherOvo(o) {
  estado.cena.remove(o);
  ovos.splice(ovos.indexOf(o), 1);
  balao('🥚', o.position.clone().setY(1.8));
  estado.ovos++;
}

// IA: passeia pela área, come, descansa; à noite volta para o "lar" e dorme.
export class Animal {
  constructor(especie, area, lar, corpo) {
    this.s = typeof especie === 'string' ? ESPECIES[especie] : especie;
    Object.assign(this, corpo ?? montar(this.s));
    this.area = area;
    this.lar = new THREE.Vector3(lar.x + rand(-1.2, 1.2), 0, lar.z + rand(-0.8, 0.8));
    this.g.position.set(rand(area[0], area[2]), 0, rand(area[1], area[3]));
    this.g.rotation.y = rand(0, Math.PI * 2);
    this.fase = rand(0, 10);
    this.estado = 'parado';
    this.timer = rand(0, 3);
    this.ovo = rand(10, 30);
    estado.cena.add(this.g);
  }

  escolher() {
    const r = Math.random(), [x1, z1, x2, z2] = this.area;
    if (r < 0.45) {
      this.estado = this.s.correr && r < 0.15 ? 'correr' : 'andar';
      this.alvo = { x: rand(x1, x2), z: rand(z1, z2) };
    } else {
      this.estado = r < 0.8 ? 'comer' : 'parado';
      this.timer = rand(2, 6);
    }
  }

  chamar(p, t) {
    if (!estado.noite) this.atracao = { p: p.clone().add(new THREE.Vector3(rand(-0.9, 0.9), 0, rand(-0.5, 0.5))), t };
  }

  segurar(t) {
    if (estado.noite) return;
    this.atracao = null;
    this.estado = 'parado';
    this.timer = t;
  }

  topo() {
    return this.g.position.clone().setY(this.s.altura);
  }

  update(dt) {
    this.fase += dt;
    if (estado.noite) {
      if (this.estado !== 'dormir') { this.estado = 'casa'; this.atracao = null; }
    } else if (this.estado === 'dormir' || this.estado === 'casa') {
      this.g.visible = true;
      this.escolher();
    }

    if (this.atracao) {
      const p = this.atracao.p;
      this.estado = mover(this.g, p.x, p.z, this.s.vel * 1.6, dt, 0.25) ? 'comer' : 'andar';
      if ((this.atracao.t -= dt) <= 0) { this.atracao = null; this.escolher(); }
    } else switch (this.estado) {
      case 'casa':
        if (mover(this.g, this.lar.x, this.lar.z, this.s.vel * 1.4, dt)) {
          this.estado = 'dormir';
          if (this.s.entraCasa) this.g.visible = false;
        }
        break;
      case 'dormir':
        if (this.g.visible && Math.random() < dt * 0.25) balao('💤', this.topo(), { tam: 0.6, sobe: 0.6 });
        break;
      case 'andar':
      case 'correr':
        if (mover(this.g, this.alvo.x, this.alvo.z, this.s.vel * (this.estado === 'correr' ? 3 : 1), dt)) this.escolher();
        break;
      default:
        if ((this.timer -= dt) <= 0) this.escolher();
    }

    if (this.s.poeOvos && !estado.noite && (this.ovo -= dt) <= 0) {
      this.ovo = rand(25, 50);
      if (ovos.length < 6) {
        const o = malha(GEO_OVO, 0xfff3d6, this.g.position.x, 0.11, this.g.position.z);
        o.scale.y = 1.3;
        ovos.push(o);
      }
    }
    this.pose(dt);
  }

  pose(dt) {
    const e = this.estado, t = this.fase, s = this.s, k = dt * 12;
    const anda = e === 'andar' || e === 'correr' || e === 'casa', dorme = e === 'dormir';
    const freq = e === 'correr' ? 16 : 9;
    this.pernas.forEach((p, i) => {
      const alvo = dorme ? (i < 2 ? 1.5 : -1.5) : anda ? Math.sin(t * freq + this.fases[i]) * 0.5 : 0;
      p.rotation.x = aproximar(p.rotation.x, alvo, k);
    });
    this.tronco.position.y = aproximar(this.tronco.position.y, dorme ? s.lp * 0.5 : s.perna + (anda ? Math.abs(Math.sin(t * freq)) * 0.03 : 0), k);
    const baixar = e === 'comer' ? (s.bipede ? Math.max(0, Math.sin(t * 9)) : 0.75 + Math.sin(t * 3) * 0.08) : dorme ? 0.35 : 0;
    this.cabeca.rotation.x = aproximar(this.cabeca.rotation.x, baixar, k);
    this.cabeca.rotation.y = aproximar(this.cabeca.rotation.y, e === 'parado' ? Math.sin(t * 0.9) * 0.5 : 0, k);
  }
}

// Modelo importado (Sketchfab): mesma IA, mas cada ação toca um clipe de animação do .glb.
export class AtorGLB extends Animal {
  constructor(cfg, gltf) {
    const obj = gltf.scene;
    obj.updateMatrixWorld(true);
    obj.scale.multiplyScalar(cfg.altura / new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).y);
    obj.updateMatrixWorld(true);
    obj.position.y -= new THREE.Box3().setFromObject(obj).min.y;
    obj.rotation.y = cfg.giro ?? 0;
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const g = new THREE.Group();
    g.add(obj);
    const [x1, z1, x2, z2] = cfg.area;
    super({ vel: cfg.vel ?? 1, correr: !!cfg.clipes.correr, altura: cfg.altura + 0.5 }, cfg.area, { x: (x1 + x2) / 2, z: (z1 + z2) / 2 }, { g });
    this.cfg = cfg;
    this.clips = gltf.animations;
    this.mixer = new THREE.AnimationMixer(obj);
    for (const nome of Object.values(cfg.clipes)) {
      if (!THREE.AnimationClip.findByName(this.clips, nome)) console.warn(`${cfg.nome}: clipe "${nome}" não existe. Disponíveis:`, this.clips.map(c => c.name));
    }
  }

  pose(dt) {
    const c = this.cfg.clipes;
    const nome = { andar: c.andar, casa: c.andar, correr: c.correr ?? c.andar, comer: c.comer, dormir: c.dormir }[this.estado] ?? c.parado;
    if (nome !== this.clipAtual) {
      const clip = THREE.AnimationClip.findByName(this.clips, nome);
      if (clip) {
        const nova = this.mixer.clipAction(clip).reset().play();
        this.acaoAtual?.crossFadeTo(nova, 0.3);
        this.acaoAtual = nova;
      }
      this.clipAtual = nome;
    }
    this.mixer.update(dt);
  }
}
