# Auditoria técnica — 3 de novembro de 2026

## Escopo e limites

Revisão de código das rotas públicas e administrativas, autenticação/autorização, consultas SQL, integrações Shopify, agenda, videochamadas, imagens, cache, dependências e estrutura. Verificação automatizada local com dados simulados. Não é certificação de segurança, pentest de infraestrutura nem reconciliação com pedidos reais. Não foram alterados dados de produção, credenciais, políticas da Shopify, esquema financeiro ou URLs públicas.

## Correções

- Criado `src/server/http/body.ts`: leitor JSON compartilhado que limita bytes durante o recebimento, inclusive sem Content-Length ou com tamanho declarado incorreto. JSON inválido retorna 400; excesso retorna 413; cancela o stream e libera o leitor. Evita carregar entradas arbitrariamente grandes antes da validação Zod.
- Aplicado ao login, carrinho, checkout, configurações, usuários, campanhas, atualização de clientes, agenda e criação de salas. Limite geral de 32 KiB; agenda mantém 1.500.000 bytes para importações; salas mantêm 2.000 bytes. Autenticação e origem continuam sendo verificadas antes de ler entradas administrativas.
- Configuração central de cabeçalhos privados para `/api/admin`, `/api/auth`, `/api/cron`, `/gestor` e `/login`: no-store, noindex e política de referência limitada à mesma origem. Recusas por perfil também recebem no-store.
- CSP mínima: impede enquadramento da aplicação, objetos incorporados e alteração de base para outra origem. Não bloqueia scripts do Next, mapas, imagens Shopify nem o iframe Jitsi. CSP estrita com nonces exigiria validação específica de todos esses recursos.
- Log de falha inesperada no checkout deixa de imprimir o objeto de erro; resposta pública continua genérica.
- Dependências compatíveis atualizadas no lockfile. Overrides mantêm Zod na versão direta corrigida e Undici na linha 7 corrigida. Não foi usado `npm audit fix --force`.
- Inicialização local detecta ausência do CSS Leaflet e orienta `npm ci` antes de iniciar o Next.

## Rotas e controles examinados

| Área                           | Controle observado                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogos, categorias, banners | Acesso público intencional; validação de filtros/slug; SVG sem interpolação de texto não confiável                                        |
| Carrinho e checkout            | IDs/quantidades validados; produtos e variantes consultados no servidor; URL Shopify controlada; nenhum pagamento executado pelo catálogo |
| Imagens                        | HTTPS, domínios Shopify permitidos, redirecionamento recusado, MIME restrito e limite de 15 MB                                            |
| Login/logout                   | Verificação de origem; cookie HttpOnly/Secure em produção/SameSite; destino restrito ao gestor; limite de tentativas                      |
| APIs administrativas           | Sessão conferida no servidor; perfis específicos em usuários, preferências, vendas, análises, mapa e agenda; CSRF por origem nas mutações |
| Cron                           | Bearer secreto comparado em tempo constante; exige segredo com pelo menos 32 caracteres                                                   |
| Webhooks                       | HMAC dos bytes originais, loja/tópico/ID validados, limite de 2 MB, deduplicação no banco; payload pessoal bruto não persistido           |
| Agenda                         | SQL parametrizado; tabelas/campos provenientes de schemas controlados; revisão otimista e bloqueio transacional; auditoria de alterações  |
| Jitsi                          | Origem HTTPS configurada, sala aleatória, rota interna protegida; servidor de mídia ainda depende da implantação e autenticação próprias  |
| Financeiro                     | Recebido, reembolsado, pendente, cancelado e expirado permanecem separados; moeda/loja e pedidos de teste filtrados                       |

## Autenticação e dados

Assinatura HMAC com comparação em tempo constante, expiração de oito horas, audiência fixa e versão vinculada à senha. Sessões de contas desativadas são recusadas; perfil é relido do banco. Senhas usam scrypt com salt. Contas bootstrap dependem das variáveis de ambiente e não são administradas pela tela de equipe. O perfil gerente_compras herda permissões de administrador por decisão existente; não foi alterado silenciosamente.

Consultas analisadas usam parâmetros para valores; fragmentos SQL dinâmicos são montados a partir de opções fixas/schemas, não de nomes arbitrários enviados pelo cliente. Não foi identificado uso de dangerouslySetInnerHTML com dados de clientes. O mapa usa nomes textuais e localizações aproximadas de municípios; não representa endereços de entrega.

Agenda é um espaço compartilhado entre os perfis autorizados, não uma agenda privada por usuário. Acesso a notas e fornecedores segue esse modelo. Isso deve ser considerado ao cadastrar observações pessoais.

## Estrutura e semântica

Mantida a separação entre `app` (rotas), `components` (interface), `lib` (regras compartilhadas) e `server` (persistência e integrações). A extração do leitor HTTP elimina duplicação sem mover grandes conjuntos de arquivos nem mudar contratos existentes. Documento raiz continua em pt-BR. Botões e navegação existentes, labels de controles e dados monetários foram examinados por código; acessibilidade visual, contraste e navegação assistiva completos não foram verificados em navegador real.

## Pendências e limites operacionais

- Os alertas moderados de minimatch na cadeia de ferramentas exigem avaliação do mantenedor/versão principal; não foi imposta uma substituição global incompatível. Registrar o resultado atual de npm audit ao atualizar dependências.
- O limite de login usa banco compartilhado quando a tabela existe; sem banco/tabela há fallback em memória por instância. Confirmar migração aplicada em produção. Proteção global de tráfego/volume é responsabilidade adicional da hospedagem/WAF.
- Não foram verificadas configurações reais de backup/restauração, retenção de dados pessoais, permissões do PostgreSQL, TLS da conexão, acesso à Vercel/GitHub e logs externos. Exigem acesso e evidência operacional.
- Jitsi depende de servidor, domínio, HTTPS e configuração de autenticação/lobby. Cancelar um compromisso não revoga automaticamente um link externo.
- Indicadores financeiros seguem a data do pedido e valores importados; não são um livro-caixa por data de cada transação.
- Publicação automática do código não substitui instalação das dependências no computador Windows.

## Erro local do Leaflet

O import `leaflet/dist/leaflet.css` é válido e o pacote está em dependencies e no lockfile. O erro fornecido indica instalação local ausente/incompleta ou checkout sem dependências sincronizadas. Com o servidor parado, na pasta do projeto:

```powershell
npm ci
npm run dev
```

Se persistir após instalação concluída, conferir `npm ls leaflet` e `Test-Path .\node_modules\leaflet\dist\leaflet.css`. Não apagar o .env. O texto “Histórico restaurado” é do terminal e não confirma que a consulta de permissões foi executada novamente; a saída antiga sem read_customers não prova regressão atual. A compactação do cache do Turbopack é informativa.

## Referências

- https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- https://nextjs.org/docs/messages/module-not-found
- https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249

## Resultado da verificação desta revisão

- 73 testes automatizados aprovados (incluindo limite de bytes, UTF-8 e stream sem tamanho confiável).
- Typecheck e build de produção aprovados.
- Teste HTTP aprovado: 12 rotas SSR, autenticação, CSRF, cookies, checkout, assets, 404/405 e novas verificações de limite/cabeçalhos.
- npm audit --omit=dev: 0 críticos, 0 altos, 23 moderados. Os totais incluem pacotes afetados indiretamente, não 23 falhas distintas na aplicação. A atualização principal global de minimatch ficou pendente de compatibilidade com seus consumidores.
- Não realizado teste visual de navegador nem teste real de videochamada/servidor Windows.
