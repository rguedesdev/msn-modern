# MSN Modern

Cliente desktop inspirado no MSN Messenger, construído com React, TypeScript e
Tauri. O servidor fica em [`server/`](server/) e usa Node.js, Fastify, Socket.IO,
Mongoose e MongoDB.

## Desenvolvimento

Requisitos: Node.js 22+, Rust compatível com Tauri, Docker e Docker Compose.

```bash
# Banco de dados
docker compose up -d mongodb

# Backend
cp server/.env.example server/.env
npm --prefix server install
npm run server:dev

# Cliente, em outro terminal
npm install
npm run tauri dev
```

O backend escuta em `http://127.0.0.1:3333` por padrão. Consulte o
[`server/README.md`](server/README.md) para rotas e decisões de segurança.

## Fluxos conectados

O cliente já usa a API para cadastro, login, renovação de sessão, busca de
usuário por e-mail, criação/listagem de conversas e notificações em tempo real.
A sessão fica em `localStorage` para ser compartilhada entre a janela principal
e as janelas nativas de conversa.

O envio e o histórico offline usam envelopes cifrados no cliente com ECDH P-256,
HKDF-SHA-256 e AES-256-GCM. O servidor e o MongoDB recebem somente ciphertext.
Esta implementação é adequada ao protótipo; antes de produção ainda são
necessários armazenamento nativo seguro das chaves, verificação de identidade e
auditoria criptográfica independente.

Para testar com duas contas, cadastre a primeira, encerre a sessão, cadastre a
segunda e adicione a outra conta usando o e-mail exato. A conversa passará a
aparecer para ambas.

## Comandos úteis

```bash
npm run build
npm run lint
npm run server:build
npm run server:test
```

## Testes distribuídos no Windows

Consulte [docs/windows-testing.md](docs/windows-testing.md) para configurar o
build de teste no GitHub e um endpoint HTTPS estável para o backend via ngrok.
