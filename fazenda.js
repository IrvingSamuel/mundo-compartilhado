import * as THREE from 'three';
import { estado, mat, malha, caixa, grupo, mover, aproximar, rand, escolha, particula, balao } from './util.js';
import { matJanela } from './mundo.js';
import { recolherOvo } from './animais.js';

// ---------- Plantação ----------
const SECO = 0x9b6a3c, MOLHADO = 0x5e3d22, VERDE = 0x4caf50, VERDE2 = 0x2e7d32;
const EMOJI = { abobora: '🎃', milho: '🌽', cenoura: '🥕', morango: '🍓' };
export const TIPOS = Object.keys(EMOJI);

function folha(P, w, h, inclina, giro = 0, cor = VERDE) {
  const g = grupo(0, 0, 0, P);
  g.rotation.set(0, giro, inclina);
  caixa(w, h, w * 0.6, cor, 0, h / 2, 0, g);
}

const MADURO = {
  abobora(P) {
    for (let i = 0; i < 4; i++) folha(P, 0.2, 0.45, 1.0, (i * Math.PI) / 2, VERDE2);
    malha(new THREE.DodecahedronGeometry(0.38, 0), 0xf08a24, 0, 0.3, 0, P).scale.set(1, 0.8, 1);
    caixa(0.06, 0.15, 0.06, 0x5d4037, 0, 0.62, 0, P);
  },
  milho(P) {
    for (const [x, z] of [[-0.3, 0], [0.3, 0.15], [0, -0.3]]) {
      caixa(0.08, 1.5, 0.08, VERDE, x, 0.75, z, P);
      caixa(0.14, 0.32, 0.14, 0xf7d23e, x + 0.08, 0.9, z, P);
      caixa(0.04, 0.2, 0.04, 0xd4a017, x, 1.6, z, P);
    }
    for (let i = 0; i < 3; i++) folha(P, 0.06, 0.6, 0.8, i * 2.1);
  },
  cenoura(P) {
    for (let i = 0; i < 5; i++) folha(P, 0.06, 0.5, 0.35, i * 1.25, 0x66bb6a);
    caixa(0.22, 0.14, 0.22, 0xf57c1f, 0, 0.05, 0, P);
  },
  morango(P) {
    caixa(0.7, 0.35, 0.7, VERDE2, 0, 0.18, 0, P);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      caixa(0.12, 0.14, 0.12, 0xe53935, Math.cos(a) * 0.36, rand(0.12, 0.32), Math.sin(a) * 0.36, P);
    }
  },
};

export class Canteiro {
  constructor(x, z, tipo) {
    Object.assign(this, { x, z, tipo, t: rand(0, 5) });
    this.solo = caixa(1.5, 0.12, 1.5, SECO, x, 0.06, z);
    this.planta = grupo(x, 0.12, z);
    this.estagio = 1 + Math.floor(Math.random() * 4);
    this.molhar(Math.random() < 0.5);
    this.mostrar();
  }

  molhar(v = true) {
    this.regado = v;
    this.solo.material = mat(v ? MOLHADO : SECO);
  }

  colher() {
    balao(EMOJI[this.tipo], new THREE.Vector3(this.x, 1.2, this.z), { tam: 1 });
    for (let i = 0; i < 6; i++) particula(new THREE.Vector3(this.x, 0.2, this.z), { cor: 0x6b4226, tam: 0.1, vel: [rand(-1, 1), rand(1.5, 3), rand(-1, 1)], grav: 9, vida: 0.6 });
    estado.colheitas++;
    this.estagio = 1;
    this.molhar(false);
    this.mostrar();
  }

  mostrar() {
    const P = this.planta, e = this.estagio;
    P.clear();
    P.scale.setScalar(0.4);
    if (e === 1) for (const [a, b] of [[-0.3, 0.2], [0.25, -0.2], [0, 0.3]]) caixa(0.1, 0.06, 0.1, 0x5d3a1a, a, 0.03, b, P);
    else if (e === 2) { folha(P, 0.1, 0.3, -0.4); folha(P, 0.1, 0.3, 0.4); }
    else if (e === 3) for (let i = 0; i < 4; i++) folha(P, 0.14, 0.55, 0.5, (i * Math.PI) / 2);
    else MADURO[this.tipo](P);
  }

  update(dt) {
    // só cresce com o solo regado; ao mudar de estágio o solo às vezes seca e pede água de novo
    if (this.regado && this.estagio < 4 && (this.t += dt) > 6) {
      this.t = 0;
      this.estagio++;
      this.molhar(Math.random() < 0.4);
      this.mostrar();
    }
    this.planta.scale.setScalar(aproximar(this.planta.scale.x, 1, dt * 6));
    this.planta.rotation.z = Math.sin(estado.t * 1.5 + this.x) * 0.04;
    if (this.estagio === 4 && !estado.noite && Math.random() < dt * 0.05) balao('✨', new THREE.Vector3(this.x, 0.9, this.z), { tam: 0.4, sobe: 0.5, vida: 1 });
  }
}

// ---------- Trator ----------
const ROTA = [[-10, 7], [-17, 6.5], [-18, 0], [-17, -5.5], [-10, -6], [-3, -5.5], [-2, 0], [-3, 6.5]];
const VERMELHO = 0xd63c2f, AMARELO = 0xf2c12e;

export class Trator {
  constructor() {
    this.curva = new THREE.CatmullRomCurve3(ROTA.map(([x, z]) => new THREE.Vector3(x, 0, z)), true);
    this.L = this.curva.getLength();
    Object.assign(this, { u: 0, voltas: 0, alvo: 0, ligado: false, fumaca: 0, rodas: [] });
    this.g = grupo();
    const C = (this.corpo = grupo(0, 0, 0, this.g));
    caixa(1.0, 0.5, 2.6, VERMELHO, 0, 0.85, 0.1, C);
    caixa(0.9, 0.75, 1.3, VERMELHO, 0, 1.25, 0.75, C);
    caixa(0.92, 0.5, 0.06, 0x333333, 0, 1.2, 1.41, C);
    for (const s of [-1, 1]) {
      caixa(0.18, 0.14, 0.05, matJanela, s * 0.3, 1.5, 1.42, C);
      caixa(0.5, 0.12, 1.2, VERMELHO, s * 0.78, 1.55, -0.7, C);
    }
    caixa(0.12, 0.9, 0.12, 0x444444, 0.3, 2.0, 1.0, C);
    caixa(0.55, 0.12, 0.5, 0x333333, 0, 1.2, -0.6, C);
    caixa(0.55, 0.5, 0.1, 0x333333, 0, 1.45, -0.88, C);
    caixa(0.05, 0.5, 0.05, 0x222222, 0, 1.5, 0.05, C);
    malha(new THREE.TorusGeometry(0.2, 0.04, 6, 12), 0x222222, 0, 1.75, -0.05, C).rotation.x = -0.8;
    this.assento = grupo(0, 1.26, -0.6, C);
    this.escape = new THREE.Vector3(0.3, 2.5, 1.0);
    for (const s of [-1, 1]) { this.roda(s * 0.8, -0.7, 0.75, 0.4); this.roda(s * 0.62, 1.0, 0.42, 0.3); }
    this.posicionar();
  }

  roda(x, z, r, w) {
    const g = grupo(x, r, z, this.g);
    malha(new THREE.CylinderGeometry(r, r, w, 12), 0x2b2b2b, 0, 0, 0, g).rotation.z = Math.PI / 2;
    malha(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 8), AMARELO, 0, 0, 0, g).rotation.z = Math.PI / 2;
    caixa(w + 0.04, r * 1.4, 0.12, AMARELO, 0, 0, 0, g);
    this.rodas.push({ g, r });
  }

  ligar(voltas) {
    Object.assign(this, { ligado: true, voltas: 0, alvo: voltas });
  }

  lateral() {
    return this.g.localToWorld(new THREE.Vector3(1.5, 0, -0.5));
  }

  posicionar() {
    const p = this.curva.getPointAt(this.u), d = this.curva.getTangentAt(this.u);
    this.g.position.copy(p);
    this.g.rotation.y = Math.atan2(d.x, d.z);
  }

  update(dt) {
    if (!this.ligado) return;
    const vel = 3.2;
    if ((this.u += (vel * dt) / this.L) >= 1) {
      this.u -= 1;
      if (++this.voltas >= this.alvo) { this.u = 0; this.ligado = false; }
    }
    this.posicionar();
    for (const r of this.rodas) r.g.rotation.x += (vel * dt) / r.r;
    this.corpo.position.y = Math.sin(estado.t * 25) * 0.02;
    if ((this.fumaca -= dt) < 0) {
      this.fumaca = 0.12;
      particula(this.corpo.localToWorld(this.escape.clone()), { cor: 0x555555, tam: 0.18, vel: [rand(-0.2, 0.2), 1.2, rand(-0.2, 0.2)], vida: 1.2, cresce: 1.2 });
    }
  }
}

// ---------- Fazendeiro ----------
const AZUL = 0x3d6ebf, CAMISA = 0xe2574c, PELE = 0xf2c9a0, CABELO = 0x6b3e1f, BOTA = 0x5d3a1a, PALHA = 0xe8c35a;
const v = new THREE.Vector3();

function* ir(f, alvo, dist = 0.2) {
  f.acao = 'andar';
  for (;;) {
    const p = typeof alvo === 'function' ? alvo() : alvo;
    if (mover(f.g, p.x, p.z, f.vel, f.dt, dist)) break;
    yield;
  }
  f.acao = 'parado';
}

function* esperar(f, s, acao) {
  f.acao = acao;
  for (let t = s; t > 0; t -= f.dt) yield;
  f.acao = 'parado';
}

const olhar = (f, x, z) => (f.g.rotation.y = Math.atan2(x - f.g.position.x, z - f.g.position.z));

function* regar(f, { canteiros }) {
  const secos = canteiros.filter(c => !c.regado && c.estagio < 4).slice(0, 12);
  if (!secos.length) return;
  f.ferramenta = 'regador';
  for (const c of secos) {
    yield* ir(f, { x: c.x, z: c.z + 1.1 });
    olhar(f, c.x, c.z);
    yield* esperar(f, 1.0, 'regar');
    c.molhar();
  }
  f.ferramenta = null;
}

function* colher(f, { canteiros }) {
  const maduros = canteiros.filter(c => c.estagio === 4).slice(0, 8);
  if (!maduros.length) return;
  f.ferramenta = 'cesta';
  for (const c of maduros) {
    yield* ir(f, { x: c.x, z: c.z + 1.1 });
    olhar(f, c.x, c.z);
    yield* esperar(f, 0.8, 'colher');
    c.colher();
  }
  f.ferramenta = null;
}

function* galinheiro(f, { galinhas, ovos }) {
  f.ferramenta = 'cesta';
  yield* ir(f, { x: -15, z: -8.6 });
  olhar(f, -15, -12);
  galinhas.forEach(g => g.chamar(new THREE.Vector3(-15, 0, -10.4), 6));
  yield* esperar(f, 3, 'alimentar');
  for (const o of [...ovos]) {
    yield* ir(f, o.position, 0.6);
    yield* esperar(f, 0.5, 'colher');
    recolherOvo(o);
  }
  f.ferramenta = null;
}

function* passeioDeTrator(f, { trator }) {
  yield* ir(f, trator.lateral());
  trator.assento.add(f.g);
  f.g.position.set(0, -0.45, 0);
  f.g.rotation.set(0, 0, 0);
  f.acao = 'dirigir';
  trator.ligar(2);
  while (trator.ligado) yield;
  estado.cena.add(f.g);
  const p = trator.lateral();
  f.g.position.set(p.x, 0, p.z);
  f.g.rotation.y = trator.g.rotation.y;
  f.acao = 'parado';
}

function* chiqueiro(f, { porcos }) {
  f.ferramenta = 'cesta';
  yield* ir(f, { x: 4, z: 15.6 });
  yield* ir(f, { x: 13, z: 15.2 });
  olhar(f, 13, 13);
  porcos.forEach(p => p.chamar(new THREE.Vector3(13, 0, 12.3), 7));
  yield* esperar(f, 2.5, 'alimentar');
  yield* esperar(f, 2.5, 'parado');
  balao('❤️', escolha(porcos).topo());
  f.ferramenta = null;
  yield* ir(f, { x: 4, z: 15.6 });
}

function* carinho(f, { rebanho }) {
  const a = escolha(rebanho);
  yield* ir(f, { x: 4.8, z: -4.5 });
  yield* ir(f, { x: 7.5, z: -4.5 });
  a.segurar(8);
  yield* ir(f, () => a.g.position, 1.2);
  olhar(f, a.g.position.x, a.g.position.z);
  yield* esperar(f, 1.6, 'acariciar');
  balao('❤️', a.topo());
  yield* esperar(f, 0.8, 'parado');
  yield* ir(f, { x: 7.5, z: -4.5 });
  yield* ir(f, { x: 4.8, z: -4.5 });
}

function* descanso(f) {
  yield* ir(f, { x: 4, z: -10.3 });
  f.g.position.set(4, 0, -10.95);
  f.g.rotation.y = 0;
  yield* esperar(f, 5, 'sentar');
  f.g.position.z = -10.3;
  yield* esperar(f, 1.8, 'acenar');
}

function* dormir(f) {
  f.tarefa = '🏠 Voltando para casa';
  yield* ir(f, { x: 0, z: -12.4 });
  f.g.visible = false;
  f.tarefa = '😴 Dormindo';
  while (estado.noite) yield;
  f.g.visible = true;
  balao('☀️', f.g.position.clone().setY(2.4));
}

const TAREFAS = [
  ['💧 Regando a plantação', regar],
  ['🧺 Colhendo', colher],
  ['🐔 Alimentando as galinhas', galinheiro],
  ['🚜 Arando com o trator', passeioDeTrator],
  ['🐷 Alimentando os porcos', chiqueiro],
  ['❤️ Fazendo carinho no rebanho', carinho],
  ['🪑 Descansando', descanso],
];

function* rotina(f, ctx) {
  for (;;) for (const [nome, tarefa] of TAREFAS) {
    if (estado.noite) yield* dormir(f);
    f.tarefa = nome;
    yield* tarefa(f, ctx);
  }
}

export class Fazendeiro {
  constructor(ctx) {
    this.g = grupo(2, 0, -10);
    const c = (this.corpo = grupo(0, 0, 0, this.g));
    this.pernas = [-0.13, 0.13].map(x => {
      const p = grupo(x, 0.85, 0, c);
      caixa(0.22, 0.7, 0.24, AZUL, 0, -0.35, 0, p);
      caixa(0.25, 0.17, 0.32, BOTA, 0, -0.76, 0.03, p);
      return p;
    });
    const T = (this.tronco = grupo(0, 0.85, 0, c));
    caixa(0.5, 0.62, 0.3, CAMISA, 0, 0.31, 0, T);
    caixa(0.52, 0.2, 0.32, AZUL, 0, 0.08, 0, T);
    caixa(0.34, 0.3, 0.04, AZUL, 0, 0.3, 0.16, T);
    for (const s of [-1, 1]) caixa(0.07, 0.32, 0.04, AZUL, s * 0.13, 0.5, 0.16, T);
    this.bracos = [-0.32, 0.32].map(x => {
      const b = grupo(x, 0.58, 0, T);
      caixa(0.15, 0.5, 0.16, CAMISA, 0, -0.25, 0, b);
      caixa(0.13, 0.12, 0.13, PELE, 0, -0.55, 0, b);
      return b;
    });
    const cab = grupo(0, 0.62, 0, T);
    caixa(0.36, 0.36, 0.34, PELE, 0, 0.18, 0, cab);
    caixa(0.38, 0.14, 0.36, CABELO, 0, 0.32, -0.01, cab);
    caixa(0.38, 0.28, 0.08, CABELO, 0, 0.2, -0.17, cab);
    for (const s of [-1, 1]) caixa(0.05, 0.07, 0.02, 0x1a1a1a, s * 0.08, 0.2, 0.172, cab);
    malha(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 10), PALHA, 0, 0.4, 0, cab);
    malha(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 10), PALHA, 0, 0.5, 0, cab);
    malha(new THREE.CylinderGeometry(0.225, 0.225, 0.06, 10), 0xc0392b, 0, 0.44, 0, cab);
    // ferramentas na mão direita
    const mao = this.bracos[1];
    this.regador = grupo(0, -0.58, 0.12, mao);
    caixa(0.18, 0.2, 0.26, 0x7f9cb5, 0, 0, 0, this.regador);
    this.bico = caixa(0.05, 0.05, 0.3, 0x7f9cb5, 0, 0.05, 0.25, this.regador);
    this.bico.rotation.x = -0.5;
    this.cesta = grupo(0, -0.62, 0.1, mao);
    caixa(0.32, 0.18, 0.24, 0xa0703c, 0, 0, 0, this.cesta);
    caixa(0.28, 0.04, 0.2, 0xf2d16b, 0, 0.09, 0, this.cesta);

    Object.assign(this, { acao: 'parado', tarefa: '', ferramenta: null, fase: 0, vel: 2.4, dt: 0 });
    this.rotina = rotina(this, ctx);
  }

  update(dt) {
    this.dt = dt;
    this.rotina.next();
    this.pose(dt);
  }

  pose(dt) {
    const t = (this.fase += dt), a = this.acao, k = dt * 10;
    let pernas = [0, 0], bracos = [0, 0], bracoZ = 0, tronco = 0, y = 0;
    if (a === 'andar') {
      const s = Math.sin(t * 9);
      pernas = [s * 0.6, -s * 0.6];
      bracos = [-s * 0.5, s * 0.5];
      y = Math.abs(Math.cos(t * 9)) * 0.05;
    } else if (a === 'regar') bracos = [0, -1.1];
    else if (a === 'colher') { tronco = 0.7; bracos = [-0.9 - Math.sin(t * 6) * 0.2, -0.9 + Math.sin(t * 6) * 0.2]; }
    else if (a === 'alimentar') bracos = [0, -0.6 - Math.max(0, Math.sin(t * 5)) * 0.9];
    else if (a === 'acariciar') { tronco = 0.2; bracos = [0, -1.2 + Math.sin(t * 6) * 0.15]; }
    else if (a === 'sentar' || a === 'dirigir') { pernas = [-1.5, -1.5]; y = -0.4; if (a === 'dirigir') bracos = [-1, -1]; }
    else if (a === 'acenar') bracoZ = 2.6 + Math.sin(t * 10) * 0.35;
    else bracos = [Math.sin(t * 1.5) * 0.04, -Math.sin(t * 1.5) * 0.04];

    this.pernas.forEach((p, i) => (p.rotation.x = aproximar(p.rotation.x, pernas[i], k)));
    this.bracos.forEach((b, i) => (b.rotation.x = aproximar(b.rotation.x, bracos[i], k)));
    this.bracos[1].rotation.z = aproximar(this.bracos[1].rotation.z, bracoZ, k);
    this.tronco.rotation.x = aproximar(this.tronco.rotation.x, tronco, k);
    this.corpo.position.y = aproximar(this.corpo.position.y, y, k);
    this.regador.visible = this.ferramenta === 'regador';
    this.cesta.visible = this.ferramenta === 'cesta';

    const frente = [Math.sin(this.g.rotation.y), Math.cos(this.g.rotation.y)];
    if (a === 'regar' && Math.random() < dt * 40) {
      particula(this.bico.getWorldPosition(v), { cor: 0x5fb4ff, tam: 0.07, vel: [frente[0] * 1.2 + rand(-0.2, 0.2), 0, frente[1] * 1.2 + rand(-0.2, 0.2)], grav: 9, vida: 0.45 });
    }
    if (a === 'alimentar' && Math.random() < dt * 25) {
      particula(this.cesta.getWorldPosition(v), { cor: 0xf2d16b, tam: 0.06, vel: [frente[0] * 2 + rand(-0.6, 0.6), 1.5, frente[1] * 2 + rand(-0.6, 0.6)], grav: 6, vida: 0.7 });
    }
  }
}
