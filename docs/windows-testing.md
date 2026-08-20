# Distribuição de testes no Windows

Para os testes atuais, o cliente é compilado com uma URL HTTPS estável para o
backend e o instalador Windows é publicado sem assinatura Authenticode.

## 1. Instalador de teste

O Microsoft Defender SmartScreen considera a assinatura Authenticode e a
reputação do arquivo/publicador. Trocar NSIS por outro formato não substitui uma
assinatura confiável, e um certificado autoassinado continua sem confiança nos
computadores dos testadores.

O workflow gera o executável e o instalador NSIS para testes sem exigir um
serviço externo nem certificado de assinatura. Por isso, o SmartScreen pode
mostrar um aviso ao abrir o instalador em outro computador. Esse alerta só
poderá ser tratado corretamente quando houver uma assinatura confiável para
distribuição.

Configure apenas esta variable no repositório GitHub:

- `VITE_API_URL`: URL HTTPS pública e estável do backend, sem barra final.

Nunca salve `JWT_SECRET` ou o token do ngrok em variables comuns, arquivos
versionados ou argumentos de build do frontend.

## 2. Backend público por ngrok

O ngrok deve rodar na máquina que mantém o backend e o MongoDB ativos. Um túnel
iniciado em um runner hospedado pelo GitHub desapareceria quando o workflow
terminasse e não exporia a sua máquina local.

Na máquina do backend:

```bash
docker compose up -d mongodb
cp server/.env.example server/.env
npm --prefix server ci
npm run server:build
npm --prefix server start
```

Use valores de produção no `server/.env`, especialmente um `JWT_SECRET` novo e
forte. Para o cliente Tauri no Windows, mantenha ao menos estas origens em
`CORS_ORIGIN`:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
CORS_ORIGIN=http://tauri.localhost,https://tauri.localhost,tauri://localhost
```

Em outro terminal, autentique o agente e abra o endpoint:

```bash
ngrok config add-authtoken SEU_TOKEN
ngrok http 3333 --url https://SEU-DOMINIO-ESTAVEL.ngrok.app
```

Confirme antes de distribuir:

```bash
curl https://SEU-DOMINIO-ESTAVEL.ngrok.app/health
```

Defina essa mesma URL em `VITE_API_URL` nas variables do GitHub e execute o
workflow. O campo `api_url` da execução manual pode substituí-la para um build
específico.

Um endereço aleatório do ngrok também funciona, mas cada mudança exige um novo
build do aplicativo porque `VITE_API_URL` é incorporada ao frontend. Para
testes recorrentes, use um domínio estável e execute o agente como serviço na
máquina do backend.
