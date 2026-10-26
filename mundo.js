import * as THREE from 'three';
import { estado, mat, malha, caixa, grupo, rand, escolha, particula } from './util.js';

export const matJanela = new THREE.MeshLambertMaterial({ color: 0x4a5a6a, emissive: 0xffc861, emissiveIntensity: 0 });
const matAgua = new THREE.MeshLambertMaterial({ color: 0x4fb0e0 });
const matVagalume = new THREE.MeshBasicMaterial({ color: 0xfff38a });

const GEO_COPA = new THREE.IcosahedronGeometry(1, 0);
const GEO_PEDRA = new THREE.DodecahedronGeometry(0.5, 0);
const GEO_ASA = new THREE.PlaneGeometry(0.16, 0.14);
const GEO_LUZ = new THREE.SphereGeometry(0.06, 6, 4);
const CONES = [0, 1, 2].map(i => new THREE.ConeGeometry(1.5 - i * 0.35, 1.5, 7));

const CEU_DIA = new THREE.Color(0x8fd3ff), CEU_POR = new THREE.Color(0xffa070), CEU_NOITE = new THREE.Color(0x0e1a3a);
const LUZ_DIA = new THREE.Color(0xffffff), LUZ_POR = new THREE.Color(0xffb070), LUZ_NOITE = new THREE.Color(0x8fa8ff);

// Áreas ocupadas [x1, z1, x2, z2]: a decoração aleatória não nasce dentro delas.
const OCUPADO = [[-23, -19, -8, -7], [-19, -7, -1, 9], [-6, -21, 6, -10], [5, -20, 23, 4], [7, 6, 19, 16], [-9, 9, 1, 19], [-1.5, -13, 1.5, 11], [-31, 3, -20, 19]];
const livre = (x, z) => !OCUPADO.some(([a, b, c, d]) => x > a && x < c && z > b && z < d);

const copas = [], nuvens = [], insetos = [];

// Prisma triangular: ridge ao longo de x (padrão) ou de z (girar = false).
function telhado(comp, alt, base, cor, x, y, z, pai, girar = true) {
  const forma = new THREE.Shape([new THREE.Vector2(-base / 2, 0), new THREE.Vector2(base / 2, 0), new THREE.Vector2(0, alt)]);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: comp, bevelEnabled: false });
  geo.translate(0, 0, -comp / 2);
  if (girar) geo.rotateY(Math.PI / 2);
  return malha(geo, cor, x, y, z, pai);
}

function cerca(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), n = Math.max(1, Math.round(L / 1.6));
  for (let i = 0; i <= n; i++) caixa(0.18, 1.1, 0.18, 0x9c6b3e, x1 + (dx * i) / n, 0.55, z1 + (dz * i) / n);
  for (const y of [0.45, 0.85]) caixa(0.08, 0.12, L, 0xb98a55, (x1 + x2) / 2, y, (z1 + z2) / 2).rotation.y = Math.atan2(dx, dz);
}

let nCaminho = 0;
function caminho(x1, z1, x2, z2, w = 1.4) {
  const dx = x2 - x1, dz = z2 - z1;
  // alturas levemente diferentes evitam z-fighting nos cruzamentos
  const m = caixa(w, 0.04, Math.hypot(dx, dz) + w, 0xd8b47a, (x1 + x2) / 2, 0.02 + nCaminho++ * 0.003, (z1 + z2) / 2);
  m.rotation.y = Math.atan2(dx, dz);
  m.castShadow = false;
}

function arvore(x, z, s = rand(0.8, 1.3), macas = false) {
  const g = grupo(x, 0, z);
  g.scale.setScalar(s);
  caixa(0.5, 2, 0.5, 0x7a4a24, 0, 1, 0, g);
  const copa = grupo(0, 2, 0, g);
  if (!macas && Math.random() < 0.35) {
    CONES.forEach((geo, i) => malha(geo, 0x2f7d4a, 0, 0.5 + i * 0.85, 0, copa));
  } else {
    malha(GEO_COPA, escolha([0x4caf50, 0x43a047, 0x5cb85c]), 0, 1.2, 0, copa).scale.set(1.6, 1.4, 1.6);
    malha(GEO_COPA, escolha([0x4caf50, 0x66bb6a]), 0.5, 2, 0.3, copa);
    if (macas) for (let i = 0; i < 7; i++) {
      const a = rand(0, Math.PI * 2);
      caixa(0.2, 0.2, 0.2, 0xe53935, Math.cos(a) * 1.5, rand(0.8, 1.8), Math.sin(a) * 1.5, copa);
    }
  }
  copa.userData.fase = rand(0, 10);
  copas.push(copa);
}

function flor(x, z) {
  caixa(0.04, 0.3, 0.04, 0x3f8f3f, x, 0.15, z);
  caixa(0.14, 0.1, 0.14, escolha([0xff6b8b, 0xffd84d, 0xb18cff, 0xffffff, 0xff8a3d]), x, 0.32, z);
}

function placa(texto, x, z) {
  const g = grupo(x, 0, z);
  caixa(0.15, 1.2, 0.15, 0x7a4a24, -0.9, 0.6, 0, g);
  caixa(0.15, 1.2, 0.15, 0x7a4a24, 0.9, 0.6, 0, g);
  caixa(2.4, 0.9, 0.1, 0xa0703c, 0, 1.25, 0, g);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c99a5b'; ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#4a2c12'; ctx.font = 'bold 54px Georgia, serif'; ctx.textAlign = 'center';
  texto.split('\n').forEach((linha, i) => ctx.fillText(linha, 256, 80 + i * 64));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  malha(new THREE.PlaneGeometry(2.3, 0.82), new THREE.MeshLambertMaterial({ map: t }), 0, 1.25, 0.06, g);
}

function chao(cena) {
  const geo = new THREE.PlaneGeometry(160, 160, 60, 60).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const paleta = [0x7ec850, 0x74bf47, 0x86d15a, 0x6db542].map(c => new THREE.Color(c)), cores = [];
  for (let i = 0; i < geo.attributes.position.count; i += 3) {
    const c = escolha(paleta);
    for (let k = 0; k < 3; k++) cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.receiveShadow = true;
  cena.add(m);
}

function casa() {
  const g = grupo(0, 0, -16);
  caixa(8.4, 0.5, 6.4, 0x9e9e9e, 0, 0.25, 0, g);
  caixa(8, 3.2, 6, 0xc68a4c, 0, 2.1, 0, g);
  for (let y = 0.9; y < 3.6; y += 0.6) caixa(8.05, 0.06, 6.05, 0xa86f38, 0, y, 0, g);
  telhado(9, 2.4, 7.2, 0xc0392b, 0, 3.7, 0, g);
  caixa(0.9, 2.2, 0.9, 0x8d8d8d, 2.4, 5, -1, g);
  caixa(1.3, 2.1, 0.15, 0x6d3f1d, 0, 1.55, 3.0, g);
  for (const x of [-2.4, 2.4]) {
    caixa(1.4, 1.2, 0.08, 0xf4ead5, x, 2.2, 2.99, g);
    caixa(1.2, 1, 0.12, matJanela, x, 2.2, 3.02, g);
  }
  caixa(2, 0.25, 1, 0x9e9e9e, 0, 0.12, 3.5, g);
  // banco onde o fazendeiro descansa
  caixa(1.8, 0.1, 0.5, 0xa0703c, 4, 0.45, -11);
  caixa(1.8, 0.5, 0.08, 0xa0703c, 4, 0.75, -11.25);
  for (const x of [3.3, 4.7]) caixa(0.1, 0.45, 0.4, 0x7a4a24, x, 0.22, -11);
  // lampião
  caixa(0.15, 2.2, 0.15, 0x333333, -1.6, 1.1, -12);
  caixa(0.35, 0.4, 0.35, matJanela, -1.6, 2.35, -12);
  for (let x = 1.6; x < 3.9; x += 0.45) { flor(x, -12.6); flor(-x, -12.6); }
}

function celeiro() {
  const g = grupo(14, 0, -15.5);
  caixa(8, 4.5, 6, 0xb03a2e, 0, 2.25, 0, g);
  for (const x of [-3.95, 3.95]) for (const z of [-2.95, 2.95]) caixa(0.25, 4.5, 0.25, 0xf5f5f5, x, 2.25, z, g);
  telhado(6.8, 3, 8.8, 0x5d4037, 0, 4.5, 0, g, false);
  caixa(3.4, 3.6, 0.1, 0xf5f5f5, 0, 1.8, 3.0, g);
  caixa(3, 3.4, 0.12, 0x7b2a20, 0, 1.7, 3.02, g);
  for (const a of [0.72, -0.72]) caixa(0.15, 4.4, 0.05, 0xf5f5f5, 0, 1.7, 3.1, g).rotation.z = a;
  caixa(1.2, 1, 0.12, matJanela, 0, 5.4, 3.42, g);
  // silo
  malha(new THREE.CylinderGeometry(1.4, 1.4, 6, 10), 0xb0bec5, 19.8, 3, -16.5);
  malha(new THREE.SphereGeometry(1.4, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0x78909c, 19.8, 6, -16.5);
  // fardos de feno e bebedouro
  for (const [x, y, z] of [[8.5, 0.4, -10.8], [9.7, 0.4, -10.8], [9.1, 1.2, -10.8]]) caixa(1.1, 0.8, 1.4, 0xe8c35a, x, y, z);
  caixa(0.8, 0.6, 2, 0x8d5a2b, 20.5, 0.3, -2);
  caixa(0.6, 0.05, 1.8, 0x4fb0e0, 20.5, 0.62, -2);
  // pasto: o lado do celeiro fica sem cerca
  cerca(6, -12, 10, -12); cerca(18, -12, 22, -12); cerca(22, -12, 22, 3); cerca(22, 3, 6, 3);
  cerca(6, 3, 6, -3); cerca(6, -6, 6, -12);
}

function galinheiro() {
  const g = grupo(-16, 0, -17);
  caixa(3.6, 2.2, 3, 0xe0b77a, 0, 1.1, 0, g);
  telhado(4, 1.4, 3.6, 0x8e3b2f, 0, 2.2, 0, g);
  caixa(0.7, 0.9, 0.1, 0x6d3f1d, 0.8, 0.55, 1.52, g);
  caixa(0.6, 0.06, 1.2, 0xa0703c, 0.8, 0.25, 2.0, g).rotation.x = 0.35;
  caixa(0.7, 0.6, 0.1, matJanela, -0.8, 1.3, 1.52, g);
}

function chiqueiro() {
  cerca(8, 7, 18, 7); cerca(18, 7, 18, 14); cerca(18, 14, 8, 14); cerca(8, 14, 8, 7);
  malha(new THREE.CircleGeometry(1.8, 8), 0x6b4a2b, 11, 0.03, 10.5).rotation.x = -Math.PI / 2;
  caixa(1.6, 0.5, 0.6, 0x8d5a2b, 13, 0.25, 13.2);
  caixa(1.4, 0.05, 0.4, 0xc9a05a, 13, 0.52, 13.2);
  for (const [x, z] of [[15.2, 7.6], [17.6, 7.6], [15.2, 10], [17.6, 10]]) caixa(0.15, 1.6, 0.15, 0x7a4a24, x, 0.8, z);
  caixa(2.8, 0.12, 2.8, 0xa0703c, 16.4, 1.65, 8.8).rotation.x = -0.12;
}

function lago() {
  const agua = malha(new THREE.CircleGeometry(4, 10), matAgua, -4, 0.05, 14);
  agua.rotation.x = -Math.PI / 2;
  agua.castShadow = false;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    malha(GEO_PEDRA, 0x9e9e9e, -4 + Math.cos(a) * 4.2, 0.1, 14 + Math.sin(a) * 4.2).scale.set(rand(0.6, 1), 0.5, rand(0.6, 1));
  }
  for (const [x, z] of [[-5.5, 13], [-2.5, 15.5], [-4, 12]]) malha(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 8), 0x3f8f3f, x, 0.08, z);
  caixa(0.15, 0.12, 0.15, 0xff8fb3, -5.5, 0.14, 13);
  for (let i = 0; i < 8; i++) caixa(0.06, rand(0.6, 1.2), 0.06, 0x558b2f, -7.6 + rand(-0.3, 0.3), 0.4, 15 + rand(-1.5, 1.5));
}

function insetosNasce(cena) {
  const centros = [[-4, 14], [0, -10], [-24, 0], [10, 18], [-10, 0], [3, -12]];
  for (let i = 0; i < 12; i++) {
    const g = grupo();
    const m = new THREE.MeshLambertMaterial({ color: escolha([0xffd84d, 0xff8fb3, 0x8fd3ff, 0xffffff, 0xff8a3d]), side: THREE.DoubleSide });
    const asas = [-1, 1].map(s => {
      const p = grupo(0, 0, 0, g);
      const a = new THREE.Mesh(GEO_ASA, m);
      a.position.x = s * 0.08;
      a.rotation.x = -Math.PI / 2;
      p.add(a);
      return p;
    });
    const luz = new THREE.Mesh(GEO_LUZ, matVagalume);
    g.add(luz);
    const [cx, cz] = escolha(centros);
    insetos.push({ g, asas, luz, cx, cz, f: rand(0.3, 0.7), fase: rand(0, 10) });
  }
}

export function criarMundo() {
  const cena = estado.cena;
  cena.fog = new THREE.Fog(0x8fd3ff, 60, 140);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x6b8f4e, 1);
  cena.add(hemi);
  const sol = new THREE.DirectionalLight(0xffffff, 2.5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0005;
  sol.shadow.normalBias = 0.03;
  Object.assign(sol.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, far: 150 });
  cena.add(sol);
  const lampiao = new THREE.PointLight(0xffb347, 0, 14, 1.5);
  lampiao.position.set(-1.6, 2.6, -11.6);
  cena.add(lampiao);

  const pos = [];
  for (let i = 0; i < 400; i++) {
    const a = rand(0, Math.PI * 2), e = rand(0.15, 1.4);
    pos.push(Math.cos(a) * Math.cos(e) * 120, Math.sin(e) * 120, Math.sin(a) * Math.cos(e) * 120);
  }
  const geoEstrelas = new THREE.BufferGeometry();
  geoEstrelas.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const estrelas = new THREE.Points(geoEstrelas, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, fog: false }));
  cena.add(estrelas);

  chao(cena);
  casa();
  celeiro();
  galinheiro();
  chiqueiro();
  lago();
  caminho(0, -12.6, 0, 10);
  caminho(0, -4.5, 5, -4.5);
  caminho(0, -7, -15, -7);
  caminho(0, 1, -2.5, 1);
  caminho(0, 10, -1.5, 12, 1.2);
  caminho(0, 6, 7, 15.5, 1.2);
  placa('Fazenda\nCompartilhada', 1.9, 9.5);

  for (const [x, z] of [[-6, -14], [-7, -20], [7.5, -19.5]]) arvore(x, z, 1, true);
  for (const [x, z] of [[-24, -2], [26, 10], [-6, -23], [24, 18], [10, 21], [-14, 18]]) arvore(x, z);
  for (let i = 0; i < 70; i++) {
    const a = rand(0, Math.PI * 2), r = rand(30, 55);
    arvore(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 0; i < 160; i++) {
    const x = rand(-28, 28), z = rand(-24, 24);
    if (!livre(x, z)) continue;
    const tipo = Math.random();
    if (tipo < 0.55) flor(x, z);
    else if (tipo < 0.8) malha(GEO_COPA, escolha([0x4caf50, 0x388e3c]), x, 0.3, z).scale.set(0.7, 0.5, 0.7);
    else malha(GEO_PEDRA, 0x9e9e9e, x, 0.15, z).scale.set(rand(0.6, 1.4), 0.6, rand(0.6, 1.4));
  }
  for (let i = 0; i < 8; i++) {
    const g = grupo(rand(-75, 75), rand(22, 30), rand(-50, 30));
    for (let j = 0; j < 4; j++) caixa(rand(3, 6), rand(1.2, 2), rand(3, 5), 0xffffff, rand(-3, 3), rand(-0.5, 0.5), rand(-2, 2), g);
    nuvens.push(g);
  }
  insetosNasce(cena);

  const ceu = new THREE.Color(), chamine = new THREE.Vector3(2.4, 6.3, -17);
  let fumaca = 0;

  return {
    atualizar(dt) {
      const t = estado.t, noite = estado.noite;
      // sol percorre o céu das 6h às 20h; de noite vira luar azulado
      const a = THREE.MathUtils.clamp((estado.hora - 6) / 14, 0, 1) * Math.PI, elev = Math.sin(a);
      const dia = noite ? 0 : THREE.MathUtils.smoothstep(elev, 0, 0.35);
      const por = noite ? 0 : 1 - THREE.MathUtils.smoothstep(elev, 0.05, 0.45);
      if (noite) sol.position.set(-20, 40, 20);
      else sol.position.set(Math.cos(a) * 40, 10 + elev * 40, 25);
      sol.color.copy(LUZ_NOITE).lerp(LUZ_DIA, dia).lerp(LUZ_POR, por * 0.8);
      sol.intensity = 0.5 + 2.2 * dia;
      hemi.intensity = 0.35 + 0.8 * dia;
      ceu.copy(CEU_NOITE).lerp(CEU_DIA, dia).lerp(CEU_POR, por * 0.7);
      cena.background = ceu;
      cena.fog.color.copy(ceu);
      estrelas.material.opacity = 1 - dia;
      matJanela.emissiveIntensity = 1 - dia;
      lampiao.intensity = (1 - dia) * 8;

      for (const c of copas) c.rotation.z = Math.sin(t * 1.2 + c.userData.fase) * 0.03;
      for (const n of nuvens) if ((n.position.x += dt * 1.5) > 80) n.position.x = -80;

      if ((fumaca -= dt) < 0) {
        fumaca = 0.25;
        particula(chamine, { cor: 0xdddddd, tam: 0.25, vel: [0.3, 0.8, rand(-0.1, 0.1)], vida: 3, cresce: 0.5 });
      }
      matAgua.color.setHSL(0.55, 0.65, 0.55 + Math.sin(t * 2) * 0.03);
      if (!noite && Math.random() < dt * 0.2) {
        particula(new THREE.Vector3(-4 + rand(-2, 2), 0.1, 14 + rand(-2, 2)), { cor: 0xff8c42, tam: 0.2, vel: [rand(-0.5, 0.5), 3.5, rand(-0.5, 0.5)], grav: 9, vida: 0.75 });
      }

      // borboletas de dia, vagalumes de noite
      for (const i of insetos) {
        const k = t * i.f + i.fase;
        i.g.position.set(i.cx + Math.sin(k) * 3, (noite ? 1.6 : 1) + Math.sin(k * 2.3) * 0.4, i.cz + Math.cos(k * 0.8) * 3);
        i.g.rotation.y = k;
        i.asas.forEach((p, s) => { p.visible = !noite; p.rotation.z = (s ? 1 : -1) * Math.sin(t * 20 + i.fase) * 0.9; });
        i.luz.visible = noite;
      }
    },
  };
}
