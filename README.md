# Mundo Compartilhado 🌾

Fazenda low-poly em **Three.js** inspirada em Stardew Valley: um bioma que se mantém sozinho, com ciclo de dia e noite, plantação que cresce, animais com rotina própria e um fazendeiro que repete um loop de tarefas.

Atividade de ICG: cena 3D com objetos importados do [Sketchfab](https://sketchfab.com/3d-models), cada um com pelo menos 3 animações.

## Como executar em localhost

O projeto é HTML + JavaScript puro (ES modules). O Three.js vem de CDN, então **não há build nem `npm install`**. Só é preciso servir a pasta por HTTP: abrir o `index.html` direto (`file://`) **não funciona**, porque o navegador bloqueia o carregamento de módulos e de arquivos `.glb`.

### Pré-requisitos

- [Git](https://git-scm.com/)
- **Uma** destas opções para servir os arquivos:
  - [Node.js](https://nodejs.org/) 18+ (traz o `npx`), **ou**
  - [Python](https://www.python.org/) 3
- Um navegador com WebGL (Chrome, Edge ou Firefox atualizados)
- Conexão com a internet (Three.js e a fonte são carregados de CDN)

### Passo a passo

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/IrvingSamuel/mundo-compartilhado.git
   cd mundo-compartilhado
   ```

2. Suba um servidor HTTP na porta 8080. Use **uma** das opções:

   ```bash
   # Opção A: Node.js
   npx -y http-server -p 8080 -c-1

   # Opção B: Python 3
   python -m http.server 8080
   ```

   Deixe esse terminal aberto. O servidor fica rodando até você apertar `Ctrl+C`.

3. Abra no navegador: **http://localhost:8080**

4. Confira se deu certo: a fazenda aparece, o relógio no canto superior direito avança e o painel da esquerda mostra a tarefa atual do fazendeiro.

> **Para agentes / verificação automática:** depois do passo 2, `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/main.js` deve retornar `200`. Se a porta 8080 estiver ocupada, use outra (por exemplo `-p 5500` ou `http.server 5500`) e ajuste a URL.

### Controles

| Ação | Comando |
|------|---------|
| Girar / aproximar a câmera | Arrastar com o mouse / roda do mouse |
| Acelerar o tempo (6×) | Segurar `Espaço` |
| Câmera seguindo o fazendeiro | `C` (liga/desliga) |

### Problemas comuns

- **Tela azul vazia:** a página foi aberta via `file://` ou sem internet. Use o servidor do passo 2 e verifique a conexão.
- **Modelo não aparece:** abra o console do navegador (F12). Se o caminho do `.glb` estiver errado, aparece `Falha ao carregar ...`. Se o nome de um clipe estiver errado, a lista de clipes disponíveis é mostrada.

## O que acontece na cena

- **Fazendeiro:** rotina em loop. Ele rega, colhe, alimenta as galinhas e recolhe os ovos, dirige o trator, alimenta os porcos, faz carinho no rebanho e descansa no banco. À noite dorme em casa.
- **Plantação:** 24 canteiros (abóbora, milho, cenoura e morango). Só crescem regados, passam por 4 estágios e são replantados após a colheita.
- **Animais:** vacas, ovelhas, porcos e galinhas, cada um andando, comendo, parando e dormindo. As galinhas botam ovos.
- **Ambiente:** ciclo de dia e noite, estrelas, fumaça na chaminé, nuvens, árvores ao vento, peixes no lago, borboletas e vagalumes.

## Adicionando o modelo de cada membro (Sketchfab)

1. No Sketchfab, filtre por **Downloadable** + **Animated** e baixe em **glTF Binary (.glb)** um modelo com **3 ou mais animações**.
2. Coloque o arquivo em `models/`.
3. Adicione uma entrada na lista `SKETCHFAB` no topo de [`main.js`](main.js):

   ```js
   { nome: '🐄 Vaca', arquivo: 'models/vaca.glb', altura: 1.5, vel: 0.8,
     area: [7.5, -10.5, 20.5, 1.5],               // [x1, z1, x2, z2] onde ele passeia
     clipes: { parado: 'Idle', andar: 'Walk', comer: 'Eat' } },  // nomes das animações no .glb
   ```

   As ações aceitas são `parado`, `andar`, `correr`, `comer` e `dormir`; as que faltarem usam `parado`. Se o modelo aparecer de lado, ajuste `giro` (em radianos, por exemplo `giro: -Math.PI / 2`).

## Estrutura

| Arquivo | Conteúdo |
|---------|----------|
| `index.html` | Página, HUD e import map do Three.js |
| `main.js` | Montagem da cena, loop principal, HUD e lista de modelos do Sketchfab |
| `mundo.js` | Cenário (casa, celeiro, galinheiro, lago, árvores) e ciclo de dia e noite |
| `animais.js` | Espécies procedurais, IA dos animais e ator para modelos `.glb` |
| `fazenda.js` | Plantação, trator e rotina do fazendeiro |
| `util.js` | Materiais, partículas, balões de emoji e movimentação |
| `models/` | Modelos `.glb` |

## Créditos

- [Three.js](https://threejs.org/) r160
- `models/raposa.glb`: modelo *Fox* do [glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox) (Khronos Group), de PixelMannen (CC0), com rig e animação de tomkranis no Sketchfab (CC BY 4.0) e conversão para glTF de AsoboStudio e scurest
