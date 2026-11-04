# Catálogo Digital e Gestão Comercial

## Estrutura

| Pasta                                        | Responsabilidade                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/catalogo-digital`                      | Aplicação pública: início, catálogos, busca, carrinho e checkout                                   |
| `apps/gestao-comercial`                      | Aplicação autenticada: vendas, pedidos, estoque, relatórios, agenda e equipe                       |
| `packages/shared/src/components`             | Componentes reutilizáveis; componentes da equipe em `admin`                                        |
| `packages/shared/src/server`                 | Shopify, banco, autenticação, vendas e validação no servidor                                       |
| `packages/shared/src/lib`, `types`, `styles` | Regras, tipos e estilos usados pelas aplicações                                                    |
| `packages/shared/next-config.ts`             | Configuração comum de segurança e build                                                            |
| `public`, `config`                           | Recursos e configurações versionados uma única vez                                                 |
| `scripts`, `tests`                           | Operação, migrações e verificações da solução                                                      |
| `src/app`                                    | Adaptadores temporários dos deployments antigos; implemente funcionalidades em `apps` e `packages` |

Não são dois repositórios duplicados. As aplicações têm rotas, builds, variáveis e processos separados, com dependências instaladas na raiz. Não copie uma aplicação isoladamente: ela depende de `packages/shared`, `scripts`, `public`, `config` e do lockfile da raiz.

No Windows, mantenha o repositório dentro de `C:\Projetos\bruno`. As pastas finais serão `<repositorio>\apps\catalogo-digital` e `<repositorio>\apps\gestao-comercial`. Renomear a pasta externa do repositório para `pitterpan-plataforma` é opcional e não altera o código nem exige renomear o repositório remoto.

## Desenvolvimento e builds

Execute `npm ci` na raiz. Copie o `.env.example` de cada aplicação para seu `.env`, preservando configurações existentes. O arquivo da aplicação prevalece sobre o `.env` legado da raiz; variáveis do ambiente de execução têm prioridade. Não coloque credenciais administrativas no catálogo público. Nenhum segredo pode usar prefixo `NEXT_PUBLIC_`.

| Comando na raiz          | Resultado                                                              |
| ------------------------ | ---------------------------------------------------------------------- |
| `npm run dev:catalogo`   | Catálogo na porta 3000                                                 |
| `npm run dev:gestao`     | Gestão na porta 3001                                                   |
| `npm run build:catalogo` | Build independente do catálogo                                         |
| `npm run build:gestao`   | Build independente da gestão                                           |
| `npm run start:catalogo` | Inicia o build do catálogo                                             |
| `npm run start:gestao`   | Inicia o build da gestão                                               |
| `npm run test:apps`      | Verificações HTTP de separação, proteção e recursos de ambos os builds |

O lançador copia `public` e `config` para as aplicações antes da execução. Essas cópias são geradas e ignoradas pelo Git. Edite apenas os originais na raiz. Não há links simbólicos que dependam de permissões especiais do Windows.

Os scripts de manutenção (`sales:sync`, `db:migrate`, etc.) continuam na raiz e utilizam seu `.env` quando executados com `--env-file=.env`. Preserve esse arquivo para a operação local; não envie ao GitHub.

## GitHub e Vercel

O repositório atual pode manter seu nome e histórico. Nomes profissionais para os projetos da Vercel:

| Projeto                      | Root Directory          | Build Command   |
| ---------------------------- | ----------------------- | --------------- |
| `pitterpan-catalogo-digital` | `apps/catalogo-digital` | `npm run build` |
| `pitterpan-gestao-comercial` | `apps/gestao-comercial` | `npm run build` |

Use framework Next.js, Node 24, instalação `npm ci --prefix ../..` (dependências e lockfile da raiz) e habilite **Include source files outside of the Root Directory in the Build Step** em ambos os projetos. Mantenha o diretório de saída padrão do Next. Os arquivos `vercel.json` de cada aplicação já definem instalação e build. Os comandos de build dentro de cada aplicação chamam o lançador compartilhado.

Configure as variáveis separadamente em cada projeto. Em produção, `NEXT_PUBLIC_CATALOG_URL` deve apontar para `https://catalogopitterpanfesta.vercel.app` nas duas aplicações. Essa variável é incorporada no build. O catálogo não precisa de `ADMIN_*`, `SHOPIFY_SALES_*`, `CRON_SECRET` nem `JITSI_BASE_URL`. A gestão usa suas credenciais de autenticação e vendas, além da fonte de produtos necessária para estoque e prévia dos catálogos.

Ambas podem ler a mesma base de produtos. A gestão continua responsável por sincronizações, vendas e webhooks. A separação não cria outra loja nem duplica o histórico. Separe permissões de banco e tokens conforme as operações necessárias em cada ambiente.

## Transição sem interromper os endereços existentes

1. Publique e valide os dois builds independentes em URLs de prévia.
2. Ajuste o Root Directory e variáveis dos projetos existentes, mantendo os domínios públicos atuais. Não exclua os deployments anteriores.
3. Verifique catálogo, checkout, login, vendas e sincronização. A gestão redireciona `/` para `/gestor/` em qualquer domínio.
4. Preserve o endpoint Shopify `/api/webhooks/shopify/sales/` no domínio da gestão. Se o domínio mudar, atualize a inscrição do webhook; configure também o agendamento externo que chama `/api/cron/sales/`.
5. Só remova `src/app` e os comandos legados depois de ambos os projetos estarem usando as novas pastas. Até lá, o build da raiz continua atendendo os dois endereços antigos.

Os endpoints públicos necessários à prévia de catálogos da equipe são compartilhados; login, rotas administrativas, cron e webhook existem apenas na gestão. O catálogo não lê a sessão da equipe para habilitar controles administrativos. A prévia autenticada permanece em `/gestor/[slug]/`.

## Manutenção

Mude as páginas na aplicação correspondente e regras comuns em `packages/shared`. Atualize testes e documentação junto com alterações de comportamento. Os caminhos antigos `src/components`, `src/server`, `src/lib` e `src/styles` citados em relatórios históricos agora correspondem a `packages/shared/src/...`.
