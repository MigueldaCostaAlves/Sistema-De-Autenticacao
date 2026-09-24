# Decisões de arquitetura

## 1. Objetivo

Definir a arquitetura da primeira versão do serviço reutilizável de identidade antes de criar o modelo de dados e a API.

Estas decisões devem ser revistas quando houver requisitos de escala, múltiplos tenants, MFA, OAuth ou necessidades de conformidade mais exigentes.

## 2. Princípios

- Segurança por defeito.
- Menor privilégio.
- Validação no limite de cada sistema.
- Tokens revogáveis e sessões observáveis.
- Dados sensíveis minimizados.
- Contratos explícitos entre frontend, API e serviços externos.
- Falhas seguras e mensagens públicas genéricas.
- Componentes substituíveis, sem acoplar a identidade a uma aplicação específica.

## 3. Stack inicial

| Área | Decisão | Motivo |
| --- | --- | --- |
| Runtime | Node.js LTS | Ecossistema estável e adequado à API REST |
| Linguagem | TypeScript com modo strict | Reduz erros de contrato e facilita manutenção |
| HTTP | Fastify | API leve, validação e plugins com baixo overhead |
| Schemas | Zod | Schemas reutilizáveis entre validação e tipos TypeScript |
| Base de dados | PostgreSQL | Transações, constraints e suporte sólido a dados relacionais |
| Acesso à BD | Drizzle ORM | SQL explícito, migrations e tipagem próxima do modelo |
| Passwords | Argon2id | Hash resistente a brute force e memory-hard |
| Logs | Pino com redaction | Logs estruturados sem expor segredos |
| Testes | Vitest + testes HTTP | Feedback rápido e testes próximos do contrato |
| Rate limiting distribuído | Redis quando necessário | Estado partilhado entre instâncias da API |

O primeiro ambiente de desenvolvimento pode usar PostgreSQL e Redis em Docker. A API não deve depender de serviços geridos específicos do fornecedor.

## 4. Estrutura do serviço

A API será um monólito modular. Não haverá microserviços na primeira versão.

```text
src/
  app.ts                 # composição da aplicação Fastify
  server.ts              # arranque do processo HTTP
  config/                # configuração validada
  modules/
    auth/                # registo, login, logout e sessões
    recovery/            # recuperação de conta
    users/               # dados e estado da conta
    devices/             # dispositivos e sessões
    audit/               # eventos de segurança
    admin/               # operações administrativas futuras
  shared/
    db/                  # cliente, schema e migrations
    http/                # erros, hooks e respostas comuns
    security/            # hashing, tokens, cookies e rate limiting
    observability/       # logs e request IDs
```

As rotas não devem conter regras de negócio complexas. Cada módulo separa:

- Route handler: HTTP, autenticação do pedido e mapeamento de resposta.
- Schema: validação de entrada e saída.
- Service: regras de negócio e transações.
- Repository: acesso à base de dados.
- Events/audit: registo de eventos relevantes.

## 5. Fronteiras e confiança

### Frontend

É um cliente não confiável. Pode iniciar fluxos, mas nunca decide se um utilizador está autorizado nem fornece a sua própria identidade.

### API

É a fronteira de segurança principal. Valida dados, resolve a sessão, aplica autorização, executa regras de negócio e gera auditoria.

### Base de dados

É uma dependência interna protegida. Constraints, índices e transações reforçam as regras, mas não substituem a autorização na API.

### Serviços externos

Email, OAuth e Redis são dependências com falhas possíveis. Cada integração terá timeouts, erros controlados e configuração isolada.

## 6. Modelo de autenticação

A primeira versão usará sessões server-side associadas a um cookie seguro.

### Cookie de sessão

- Nome configurável, por exemplo `sid`.
- Valor aleatório e imprevisível.
- `HttpOnly` para impedir acesso JavaScript.
- `Secure` em produção.
- `SameSite=Lax` por defeito.
- Expiração absoluta e expiração por inatividade.
- O valor bruto nunca será guardado na base de dados; guardar apenas o seu hash.

A sessão contém uma referência ao utilizador, ao dispositivo, ao momento de criação e ao último uso. O servidor consulta a sessão a cada pedido autenticado.

### Motivo desta escolha

Sessões server-side permitem revogação imediata, gestão de dispositivos e controlo centralizado. Evitam colocar demasiada informação ou autoridade num JWT que permaneça válido depois de uma revogação.

JWT poderá ser adicionado mais tarde para integrações máquina-a-máquina, mas não será a base da sessão web inicial.

## 7. Fluxos principais

### Registo

1. Validar e normalizar os dados.
2. Verificar regras de password.
3. Criar hash Argon2id.
4. Criar utilizador numa transação.
5. Criar sessão inicial apenas se esse comportamento for explicitamente escolhido.
6. Registar evento de auditoria sem password ou token.
7. Devolver resposta pública mínima.

O comportamento público não deve confirmar se um email já está registado sem uma decisão explícita de produto.

### Login

1. Validar o pedido.
2. Procurar o utilizador por email normalizado.
3. Comparar a password com Argon2id.
4. Aplicar rate limiting e backoff em falhas.
5. Criar sessão e associar dispositivo após sucesso.
6. Registar sucesso ou falha na auditoria.
7. Devolver resposta genérica em falhas.

### Logout

A API invalida a sessão atual e regista o evento. O cliente limpa o estado local, mas a revogação válida é feita no servidor.

### Revogação

O utilizador pode revogar uma sessão específica ou todas as sessões, exceto a atual quando a experiência assim o exigir. A revogação deve ser transacional e auditada.

### Recuperação

1. Receber pedido com resposta pública uniforme.
2. Criar token aleatório de uso único e curta duração.
3. Guardar apenas o hash do token.
4. Enviar o link através de um adaptador de email.
5. Consumir o token numa transação.
6. Alterar a password e invalidar sessões existentes.
7. Registar o evento.

## 8. Autorização

A autenticação responde a “quem é o utilizador?”. A autorização responde a “o que pode fazer?”. São camadas separadas.

- Cada pedido protegido resolve o utilizador a partir da sessão.
- Nunca confiar num `userId` enviado pelo frontend para definir o proprietário.
- Operações administrativas exigem uma role explícita.
- Verificar autorização em cada operação, não apenas no frontend.
- Ações críticas podem exigir reautenticação ou MFA no futuro.

## 9. Contrato de erros

A API usará respostas de erro consistentes, sem stack traces ou detalhes internos:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Não foi possível validar as credenciais.",
    "requestId": "..."
  }
}
```

O `code` é estável para o frontend. A mensagem pode ser localizada no cliente quando não revelar informação sensível.

Categorias mínimas:

- `VALIDATION_ERROR`
- `INVALID_CREDENTIALS`
- `AUTHENTICATION_REQUIRED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `RATE_LIMITED`
- `CONFLICT`
- `INTERNAL_ERROR`

## 10. Transações e consistência

As operações seguintes devem ser atómicas:

- Criação de utilizador e respetivos dados iniciais.
- Consumo de token de recuperação e alteração de password.
- Revogação de sessão.
- Rotação ou substituição de refresh/session credentials, se forem adicionadas.
- Escrita de uma alteração crítica e respetivo evento de auditoria quando possível.

A auditoria não deve impedir um login seguro por uma falha temporária de observabilidade sem existir uma decisão explícita de fail closed para esse evento.

## 11. Configuração e segredos

- Validar todas as variáveis de ambiente no arranque.
- Falhar o arranque quando faltar uma configuração obrigatória.
- Separar configurações de desenvolvimento, teste e produção.
- Nunca guardar secrets no repositório.
- Nunca imprimir secrets nos logs.
- Usar rotação para chaves e credenciais externas.
- Definir `NODE_ENV`, URL da base de dados, segredo de sessão, origem permitida, limites e configuração de email.

## 12. Observabilidade

Cada pedido terá um `requestId` e logs estruturados com:

- Método e rota sem query sensível.
- Status HTTP e duração.
- Request ID.
- Resultado da operação.
- Identificador interno do utilizador quando já autenticado.

Não registar passwords, cookies, tokens, códigos MFA ou payloads completos de recuperação.

## 13. API versioning e compatibilidade

- Prefixo inicial: `/api/v1`.
- Contratos de entrada e saída documentados antes da implementação.
- Alterações incompatíveis exigem nova versão.
- Campos novos devem ser adicionados de forma compatível quando possível.
- O frontend depende dos códigos de erro e não de mensagens internas.

## 14. Evolução futura

### MFA

Adicionar fatores como TOTP ou passkeys sem alterar o conceito base de sessão. O desafio MFA deve ser temporário, limitado e auditado.

### OAuth

Usar Authorization Code Flow com PKCE, `state`, `nonce` e redirect URIs exatas. O vínculo entre uma identidade externa e uma conta local exige uma regra explícita.

### Escala

O monólito pode escalar horizontalmente quando as sessões forem guardadas numa base partilhada. Redis será introduzido para rate limiting, locks curtos ou sessões apenas se a necessidade for demonstrada.

## 15. Decisões adiadas

- JWT para integrações de serviço.
- Multi-tenancy.
- Provedor de email em produção.
- MFA obrigatório por role.
- Passkeys/WebAuthn.
- Estratégia de deploy e fornecedor de cloud.
- Retenção legal de auditoria.

Estas decisões devem ser registadas antes de a funcionalidade correspondente entrar em produção.

## 16. Critérios de aceitação

A arquitetura estará pronta para a fase de modelo de dados quando:

- O fluxo de sessão estiver escolhido e documentado.
- Os limites entre rota, serviço e repository estiverem definidos.
- Os erros públicos tiverem códigos estáveis.
- Os segredos e ambientes tiverem uma estratégia clara.
- Os eventos auditáveis estiverem identificados.
- As decisões adiadas não bloquearem o primeiro MVP.
