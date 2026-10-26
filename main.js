import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { estado, atualizarParticulas } from './util.js';
import { criarMundo } from './mundo.js';
import { Animal, AtorGLB, ovos } from './animais.js';
import { Canteiro, Trator, Fazendeiro, TIPOS } from './fazenda.js';

// Modelos do Sketchfab (um por membro, cada um com 3+ animações).
// clipes: nome da animação no .glb para cada ação (parado, andar, correr, comer, dormir; as ausentes caem em "parado").
// area: [x1, z1, x2, z2] onde o modelo passeia. giro: correção de rotação se o modelo não olhar para +z.
const SKETCHFAB = [
  { nome: '🦊 Raposa', arquivo: 'models/raposa.glb', altura: 0.7, vel: 1.2, area: [-30, 4, -21, 18], clipes: { parado: 'Survey', andar: 'Walk', correr: 'Run' } },
];

const cena = (estado.cena = new THREE.Scene());
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 30, 36);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controles = new OrbitControls(camera, renderer.domElement);
controles.target.set(0, 0, -1);
controles.enableDamping = true;
controles.maxPolarAngle = Math.PI / 2.2;
controles.minDistance = 5;
controles.maxDistance = 90;

const mundo = criarMundo();

const PASTO = [7.5, -10.5, 20.5, 1.5], CHIQUEIRO = [9, 8, 17, 13], QUINTAL = [-21, -14, -10, -8];
const rebanho = [
  ...[0, 1, 2].map(() => new Animal('vaca', PASTO, { x: 13, z: -10 })),
  ...[0, 1, 2].map(() => new Animal('ovelha', PASTO, { x: 17, z: -10 })),
];
const porcos = [0, 1, 2].map(() => new Animal('porco', CHIQUEIRO, { x: 16.4, z: 8.8 }));
const galinhas = Array.from({ length: 7 }, () => new Animal('galinha', QUINTAL, { x: -15.2, z: -15 }));
const seres = [...rebanho, ...porcos, ...galinhas];

const canteiros = [];
[-2.7, -0.9, 0.9, 2.7].forEach((z, linha) => {
  const xs = [-14.5, -12.7, -10.9, -9.1, -7.3, -5.5];
  // ordem em zigue-zague para o fazendeiro percorrer as fileiras sem voltar
  for (const x of linha % 2 ? xs.reverse() : xs) canteiros.push(new Canteiro(x, z, TIPOS[linha]));
});

const trator = new Trator();
const fazendeiro = new Fazendeiro({ canteiros, trator, galinhas, porcos, rebanho, ovos });

const visitantes = [];
const loader = new GLTFLoader();
for (const cfg of SKETCHFAB) {
  loader.load(cfg.arquivo, gltf => {
    const ator = new AtorGLB(cfg, gltf);
    seres.push(ator);
    visitantes.push(ator);
  }, undefined, err => console.error(`Falha ao carregar ${cfg.arquivo}`, err));
}

// ---------- Controles e HUD ----------
let acelerado = false, seguir = false;
addEventListener('keydown', e => {
  if (e.code === 'Space') { acelerado = true; e.preventDefault(); }
  if (e.code === 'KeyC') seguir = !seguir;
});
addEventListener('keyup', e => { if (e.code === 'Space') acelerado = false; });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const $ = id => document.getElementById(id);
function hud() {
  const h = Math.floor(estado.hora), m = Math.floor((estado.hora % 1) * 6) * 10;
  $('dia').textContent = `Dia ${estado.dia}`;
  $('hora').textContent = `${estado.noite ? '🌙' : '☀️'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${acelerado ? ' ⏩' : ''}`;
  $('tarefa').textContent = fazendeiro.tarefa;
  $('contadores').textContent = `🧺 ${estado.colheitas} colheitas · 🥚 ${estado.ovos} ovos`;
  $('visitantes').innerHTML = visitantes.map(a => `<div>${a.cfg.nome} <small>(Sketchfab)</small>: <b>${a.clipAtual}</b></div>`).join('');
  $('seguir').textContent = seguir ? 'Câmera seguindo o fazendeiro' : '';
}

const relogio = new THREE.Clock(), alvoCam = new THREE.Vector3();
let tHud = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(relogio.getDelta(), 0.05) * (acelerado ? 6 : 1);
  estado.t += dt;
  // 1 hora do jogo = 6 s de dia e 2 s de noite (a noite passa rápido)
  if ((estado.hora += dt / (estado.noite ? 2 : 6)) >= 24) { estado.hora -= 24; estado.dia++; }
  estado.noite = estado.hora >= 20 || estado.hora < 6;

  mundo.atualizar(dt);
  for (const s of seres) s.update(dt);
  for (const c of canteiros) c.update(dt);
  trator.update(dt);
  fazendeiro.update(dt);
  atualizarParticulas(dt);

  if (seguir) {
    const d = fazendeiro.g.getWorldPosition(alvoCam).sub(controles.target).multiplyScalar(Math.min(1, dt * 3));
    controles.target.add(d);
    camera.position.add(d);
  }
  controles.update();
  renderer.render(cena, camera);
  if ((tHud -= dt) < 0) { tHud = 0.2; hud(); }
});
