# Modelo de ameaças

## 1. Objetivo

Definir o que o sistema de identidade protege, contra que ameaças e quais são os controlos mínimos necessários antes de ligar uma base de dados ou disponibilizar a API.

Este documento cobre a primeira versão do sistema:

- Registo e autenticação de utilizadores
- Login, logout e sessões
- Recuperação de conta
- Gestão de dispositivos
- Revogação de sessões e tokens
- Auditoria de eventos de segurança
- Futuros fluxos MFA e OAuth

## 2. Limites do sistema

### Dentro do sistema

- API REST de identidade
- Interface web cliente
- Armazenamento de utilizadores, sessões e tokens
- Serviço de email para recuperação de conta
- Registos de auditoria
- Gestão de configuração e segredos

### Fora do sistema

- Sistema operativo e dispositivo do utilizador
- Navegador do utilizador
- Provedor de email
- Provedores OAuth externos
- Infraestrutura de alojamento, DNS e CDN
- Código das aplicações que integram esta identidade

Uma fronteira de confiança não é uma garantia de segurança. Dados recebidos de qualquer cliente ou serviço externo devem ser validados e tratados como não confiáveis.

## 3. Ativos a proteger

| Ativo | Impacto se comprometido | Proteção principal |
| --- | --- | --- |
| Passwords | Compromisso de contas e reutilização noutros serviços | Hash lento e resistente a brute force; nunca guardar passwords em texto simples |
| Sessões e refresh tokens | Acesso direto a contas | Tokens aleatórios, expiração, rotação e revogação |
| Tokens de recuperação | Tomada de controlo de conta | Token de uso único, curto prazo e nunca guardado em texto simples |
| Dados de utilizador | Exposição de informação pessoal | Minimização, autorização e encriptação em trânsito |
| Segredos da aplicação | Falsificação de tokens e acesso à infraestrutura | Secret manager, rotação e ausência de secrets no repositório |
| Registos de auditoria | Perda de rastreabilidade e investigação | Integridade, retenção e acesso restrito |
| Disponibilidade da API | Impossibilidade de autenticar ou terminar sessões | Rate limiting, timeouts, monitorização e recuperação |

## 4. Atores e capacidades

### Utilizador legítimo

Pode criar uma conta, autenticar-se, terminar a sessão e gerir os seus dispositivos autorizados.

### Atacante não autenticado

Pode enviar pedidos à API, observar respostas públicas e tentar explorar validação, login, registo e recuperação de conta.

### Atacante com password roubada

Pode tentar autenticar-se como um utilizador legítimo. A password, por si só, não deve permitir acesso ilimitado sem controlos adicionais.

### Atacante com sessão roubada

Pode agir como a vítima até a sessão expirar ou ser revogada. Este é um cenário de alto impacto.

### Utilizador autenticado malicioso

Pode tentar aceder a dados de outra conta, manipular identificadores ou abusar de funcionalidades administrativas.

### Serviço externo comprometido

Um provedor de email ou OAuth pode devolver dados inválidos, estar indisponível ou sofrer compromisso. A aplicação não deve confiar cegamente nesses dados.

### Administrador

Tem capacidades elevadas e deve ser sujeito a autorização explícita, MFA, auditoria e princípio do menor privilégio.

## 5. Superfícies de ataque

- Endpoints públicos de registo, login e recuperação
- Cookies, access tokens e refresh tokens
- Formulários e dados enviados pelo navegador
- Integrações de email e OAuth
- Endpoints de sessões, dispositivos e logout
- Painel administrativo
- Base de dados e backups
- Logs, métricas e mensagens de erro
- Configuração, chaves e variáveis de ambiente
- Dependências do backend e do frontend

## 6. Ameaças prioritárias e controlos

### T1. Brute force e credential stuffing

**Cenário:** o atacante tenta muitas passwords ou usa credenciais vazadas.

**Impacto:** tomada de contas e indisponibilidade.

**Controlos:**

- Rate limiting por IP, conta e dispositivo
- Respostas de login genéricas para não revelar se o email existe
- Backoff progressivo e alertas para tentativas anormais
- Passwords com comprimento mínimo e verificação contra passwords comprometidas
- MFA numa fase posterior

### T2. Passwords expostas

**Cenário:** passwords guardadas em texto simples, logs ou mensagens de erro.

**Impacto:** compromisso massivo de contas.

**Controlos:**

- Hash com Argon2id, ou bcrypt configurado com custo adequado
- Salt único por password através da biblioteca de hash
- Nunca registar passwords, tokens ou códigos MFA
- Permitir rotação do algoritmo e rehash no login

### T3. Roubo ou reutilização de sessão

**Cenário:** um token é obtido através de malware, XSS, dispositivo perdido ou rede insegura.

**Impacto:** acesso à conta sem password.

**Controlos:**

- HTTPS obrigatório
- Cookies `HttpOnly`, `Secure` e `SameSite` quando a sessão usar cookies
- Tokens curtos e refresh tokens rotativos
- Hash dos refresh tokens na base de dados
- Revogação individual e global
- Mostrar dispositivos e atividade recentes
- Invalidar sessões após alterações críticas da conta

### T4. Cross-site scripting e roubo de tokens

**Cenário:** conteúdo não confiável é renderizado no frontend.

**Impacto:** execução de código no contexto do utilizador.

**Controlos:**

- Escapar conteúdo por defeito
- Evitar `innerHTML` com dados externos
- Content Security Policy
- Sanitização quando HTML for realmente necessário
- Cookies HttpOnly para impedir acesso JavaScript a sessões

### T5. Cross-site request forgery

**Cenário:** outro site força o navegador a enviar uma ação autenticada.

**Impacto:** logout forçado, alteração de conta ou revogação indevida.

**Controlos:**

- `SameSite=Lax` ou `Strict` quando compatível
- CSRF token em operações que alteram estado
- Validar `Origin` e `Referer` quando apropriado
- Não usar pedidos GET para ações destrutivas

### T6. Recuperação de conta abusada

**Cenário:** o atacante descobre se um email existe, reutiliza um token ou força muitos pedidos.

**Impacto:** tomada de conta e enumeração de utilizadores.

**Controlos:**

- Resposta igual para emails existentes e inexistentes
- Token aleatório, com expiração curta e uso único
- Guardar apenas o hash do token
- Invalidar tokens anteriores após uso ou alteração de password
- Rate limiting e auditoria
- Não incluir dados sensíveis no URL após a recuperação

### T7. Enumeração de contas

**Cenário:** diferenças de mensagens, status ou tempos revelam quais emails estão registados.

**Impacto:** recolha de dados para ataques posteriores.

**Controlos:**

- Mensagens públicas uniformes
- Status codes consistentes
- Tempos de resposta semelhantes quando possível
- Monitorização de padrões de enumeração

### T8. Broken access control / IDOR

**Cenário:** um utilizador altera um identificador e vê sessões, dispositivos ou dados de outra conta.

**Impacto:** exposição ou manipulação de contas.

**Controlos:**

- Derivar a identidade do utilizador da sessão autenticada
- Nunca confiar num `userId` enviado pelo cliente para autorização
- Verificar autorização em cada pedido
- Testes específicos de acesso horizontal e vertical

### T9. Injeção e dados inválidos

**Cenário:** payloads malformados chegam à API ou à base de dados.

**Impacto:** corrupção, fuga de dados ou execução de comandos.

**Controlos:**

- Validação por schema no limite da API
- Queries parametrizadas ou ORM seguro
- Limites de tamanho e profundidade dos pedidos
- Normalização de emails antes da comparação
- Content-Type estrito e rejeição de campos desconhecidos quando possível

### T10. OAuth mal configurado

**Cenário:** redirect URI permissivo, ausência de `state` ou mistura de identidades por email.

**Impacto:** login CSRF, account linking indevido ou tomada de conta.

**Controlos:**

- Authorization Code Flow com PKCE
- Redirect URIs exatas, nunca wildcards em produção
- Validar `state`, `nonce`, issuer, audience e assinatura
- Não ligar contas apenas por email sem prova adicional
- Guardar apenas os dados necessários do provedor

### T11. Abuso de privilégios administrativos

**Cenário:** uma conta administrativa comprometida ou uma autorização excessiva permite alterar utilizadores.

**Impacto:** compromisso sistémico.

**Controlos:**

- MFA obrigatório para administradores
- RBAC e menor privilégio
- Reautenticação para ações sensíveis
- Auditoria imutável e alertas
- Separação entre administração e operação normal

### T12. Fuga de informação através de logs

**Cenário:** logs incluem passwords, tokens, cookies ou dados pessoais.

**Impacto:** compromisso indireto e problemas de privacidade.

**Controlos:**

- Lista explícita de campos proibidos nos logs
- Mascaramento de emails e IPs quando necessário
- Acesso restrito e retenção definida
- Correlação por request ID sem guardar segredos

### T13. Denial of service

**Cenário:** o atacante sobrecarrega login, recuperação, registo ou envio de email.

**Impacto:** indisponibilidade e custos inesperados.

**Controlos:**

- Rate limiting e quotas
- Limites de payload e timeouts
- Filas para operações de email
- Cache apenas para dados não sensíveis
- Monitorização e proteção na infraestrutura

## 7. Decisões mínimas para a primeira versão

1. Usar sessões server-side ou refresh tokens revogáveis, em vez de guardar estado de autenticação apenas no frontend.
2. Guardar apenas hashes de passwords e tokens sensíveis.
3. Aplicar HTTPS, cookies seguros e proteção CSRF quando a autenticação usar cookies.
4. Validar todos os inputs com schemas no backend.
5. Criar auditoria para login aceite, login falhado, logout, recuperação e revogação.
6. Não revelar se uma conta existe em registo e recuperação.
7. Separar configuração de desenvolvimento e produção.
8. Definir expiração e revogação antes de implementar a ligação ao frontend.

## 8. Limitações conhecidas

- Nenhum controlo impede um utilizador de entregar voluntariamente a sua password ou o seu código MFA.
- Segurança do dispositivo e do navegador está fora do controlo direto da aplicação.
- Email não deve ser tratado como fator forte quando o próprio email está comprometido.
- Rate limiting distribuído exige infraestrutura partilhada em produção.
- Auditoria ajuda a investigar incidentes, mas não impede o incidente por si só.
- MFA, OAuth e administração exigem uma revisão específica antes de serem ativados.

## 9. Critérios de aceitação

O modelo de ameaças será considerado refletido na implementação quando:

- Cada endpoint tiver validação e autorização definida.
- Passwords e tokens nunca aparecerem em logs ou respostas.
- Existirem testes para brute force, enumeração, IDOR, recuperação e revogação.
- Sessões puderem expirar e ser revogadas individualmente.
- Eventos de segurança relevantes forem auditados.
- Os segredos forem fornecidos por ambiente ou secret manager.
- As decisões divergentes deste documento forem registadas e justificadas.
