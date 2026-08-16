# MSN Modern Server

API HTTP e entrega em tempo real do MSN Modern. O servidor autentica usuários,
mantém sessões, distribui material público de chaves por dispositivo e armazena
somente envelopes cifrados das mensagens.

## Executar localmente

Na raiz do repositório:

```bash
docker compose up -d mongodb
cp server/.env.example server/.env
npm --prefix server install
npm run server:dev
```

Verificação de saúde:

```bash
curl http://127.0.0.1:3333/health
```

Não reutilize o usuário, a senha do MongoDB ou o `JWT_SECRET` do arquivo de
exemplo em produção. O MongoDB local só é publicado em `127.0.0.1`.

## API inicial

Exceto cadastro, login, refresh, logout e health, envie o access token em
`Authorization: Bearer <token>`.

| Método | Rota | Função |
| --- | --- | --- |
| `POST` | `/auth/register` | Criar conta e sessão |
| `POST` | `/auth/login` | Entrar |
| `POST` | `/auth/refresh` | Rotacionar refresh token |
| `POST` | `/auth/logout` | Revogar refresh token |
| `GET` | `/me` | Obter usuário autenticado |
| `GET` | `/users?email=...` | Localizar usuário por e-mail exato |
| `PUT` | `/devices/:deviceId` | Registrar dispositivo e bundle público |
| `POST` | `/devices/:deviceId/prekeys` | Repor one-time prekeys e signed prekey |
| `DELETE` | `/devices/:deviceId` | Revogar dispositivo |
| `POST` | `/users/:userId/key-bundles` | Obter bundles e consumir uma OPK por dispositivo |
| `POST` | `/conversations/direct` | Criar ou recuperar conversa direta |
| `GET` | `/conversations` | Listar conversas |
| `GET` | `/conversations/:id/messages` | Paginar envelopes cifrados |
| `POST` | `/conversations/:id/messages` | Persistir e entregar envelopes cifrados |

O Socket.IO recebe o access token em `auth.token`. Eventos emitidos pelo
servidor: `message:new`, `presence:snapshot`, `presence:changed` e
`typing:changed`. O cliente envia `typing:set` com
`conversationId` e `isTyping`.

## Contrato de criptografia ponta a ponta

Esta camada implementa o papel do servidor, não a cifra do cliente. Cada
dispositivo gera e mantém localmente:

- a chave privada de identidade;
- a chave privada da signed prekey;
- as chaves privadas das one-time prekeys;
- o estado das sessões e do Double Ratchet.

Somente as partes públicas são enviadas por `PUT /devices/:deviceId`. Para cada
dispositivo de destino, o cliente cria um envelope com:

```json
{
  "recipientUserId": "ObjectId do usuário",
  "recipientDeviceId": "UUID do dispositivo",
  "type": "prekey",
  "payload": "mensagem serializada e cifrada em base64"
}
```

O `type` passa a ser `ratchet` depois da mensagem inicial. Uma mensagem enviada
tem um `clientMessageId` UUID para idempotência, `senderDeviceId`,
`protocol: "signal-v1"` e um envelope para cada dispositivo que deve conseguir
abri-la. Para sincronização multidispositivo, isso inclui os outros dispositivos
do próprio remetente.

O servidor valida participantes e dispositivos, mas não consegue validar ou
ler o conteúdo criptográfico de `payload`. Chaves privadas e texto puro nunca
devem ser enviados à API, gravados no MongoDB ou incluídos em logs.

### Cliente Web Crypto do protótipo

O cliente atual também registra chaves em `PUT /e2ee/devices/:deviceId` e usa
`webcrypto-p256-v1`: ECDH P-256 efêmero, derivação HKDF-SHA-256 e AES-256-GCM.
Ele cria envelopes para os dispositivos do destinatário e do remetente, o que
permite entrega offline e sincronização do histórico sem texto puro no servidor.

### Garantias e limites

A cifra Web Crypto fornece confidencialidade ponta a ponta para o protótipo,
mas ainda não equivale ao Signal/Double Ratchet auditado: não há verificação de
identidade, proteção forte pós-comprometimento nem armazenamento nativo seguro.
E2EE protege o
conteúdo, não metadados como participantes, horários, tamanho aproximado e IP.
HTTPS/WSS continua obrigatório em produção.

Antes de produção também são necessários verificação de identidade (safety
numbers/QR), rotação de signed prekeys, reposição automática de OPKs, backup
seguro de chaves, política de dispositivos vinculados e auditoria independente.

Referências de protocolo:

- [PQXDH](https://signal.org/docs/specifications/pqxdh/)
- [Double Ratchet](https://signal.org/docs/specifications/doubleratchet/)
- [Sesame para múltiplos dispositivos](https://signal.org/docs/specifications/sesame/)
