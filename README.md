# Pitter Pan Festas — Next.js + TypeScript

Catálogos sazonais migrados para **Next.js App Router**, React e TypeScript estrito. Esta versão substitui a estrutura anterior com Vite. O documento HTML é definido em `src/app/layout.tsx`; não há `index.html` manual.

## Executar no Windows

Instale Node.js 24 ou superior. Extraia o ZIP em uma pasta nova e abra o PowerShell na pasta que contém `package.json`:

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:3000/`. O ZIP inclui `.env` com valores locais e `.env.example` como modelo. Para recriar a configuração local:

```powershell
Copy-Item .env.example .env
```

A instalação inicial requer internet para baixar os pacotes npm. Depois de instaladas as dependências, o código, os estilos e ícones são servidos pela aplicação, sem bibliotecas via CDN e sem fontes remotas. No modo JSON, as fotos são locais; no modo Shopify, as fotos são obtidas pelo servidor da origem Shopify e servidas com cache. Site da loja e WhatsApp continuam sendo links externos.

## Compilar e executar a versão de produção local

```powershell
npm run build
npm start
```

O Next.js gera `.next/`, e o processo Node atende a aplicação. Não abra arquivos `.tsx` diretamente no navegador. Pare o desenvolvimento antes de iniciar a produção na mesma porta.

## Tecnologias implementadas

| Tecnologia                 | Uso                                                    |
| -------------------------- | ------------------------------------------------------ |
| Next.js App Router         | Páginas, layouts, metadados e renderização no servidor |
| React + TypeScript estrito | Interface e contratos tipados                          |
| Tailwind CSS + PostCSS     | Estilos compilados localmente e tokens da marca        |
| Lucide React               | Ícones de interface locais                             |
| TanStack Query             | Consultas e cache da interface                         |
| Zod                        | Validação de JSON e ambiente                           |
| Node.js                    | Execução local e servidor do Next.js                   |
| Prettier                   | Formatação do projeto                                  |

Vite e React Router foram removidos. A navegação usa `next/link` e `next/navigation`.

## Organização

```text
src/
  app/
    layout.tsx             Documento raiz e providers
    page.tsx               Seleção dos catálogos
    [slug]/page.tsx         Catálogo público
    gestor/page.tsx        Seleção do gestor
    gestor/[slug]/page.tsx  Catálogo do gestor
    api/health/route.ts     Diagnóstico do servidor
    error.tsx              Recuperação de erros
    not-found.tsx          Página inexistente
  components/              Cards, sidebar, carregamento, carrinho e compartilhamento
    manager/               Interface inicial do gestor
  hooks/                   Estado do orçamento e carregamento da página
  providers/               Integrações de contexto da interface
  config/                  Configuração centralizada do cache
  schemas/                 Validação Zod
  types/                   Contratos de produtos e catálogos
  server/                  Leitura de dados exclusiva do servidor
  services/                Consultas do navegador e futura integração de API
  lib/                     Busca, rotas e mensagem do orçamento
  styles/                  Temas sazonais e estilos preservados
  global.css               Entrada dos estilos e tokens Tailwind
public/
  assets/                  Imagens e ícones originais
  data/                    Catálogos, manifesto e configuração da loja
scripts/
  run-next.ts              Inicialização local compatível com Windows/Linux
tests/                     Regras de negócio e verificação HTTP/SSR
docs/                      Arquitetura e manutenção
```

## Configuração de ambiente

| Variável                  | Função                                         | Padrão               |
| ------------------------- | ---------------------------------------------- | -------------------- |
| `HOST`                    | Endereço local para desenvolvimento e produção | `127.0.0.1`          |
| `PORT`                    | Porta do servidor                              | `3000`               |
| `NEXT_PUBLIC_CATALOG_URL` | Domínio público para compartilhamento          | Configuração em JSON |
| `NEXT_TELEMETRY_DISABLED` | Desativa telemetria do framework               | `1`                  |

O launcher carrega `.env` e valida endereço e porta. O Next.js também tem suporte aos arquivos de ambiente. Variáveis do sistema têm prioridade sobre `.env`. Reinicie após alterar o ambiente. Variáveis `NEXT_PUBLIC_` são públicas e incorporadas à compilação do navegador; mudanças na produção exigem recompilar. Nunca use esse prefixo para senhas ou tokens. `.env` é ignorado pelo Git; `.env.example` é versionável.

Não foram criados segredos fictícios de banco ou autenticação. O painel de edição ainda não está implementado.

## Comandos

| Comando                | Função                                             |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Servidor Next.js de desenvolvimento                |
| `npm run build`        | Compilação de produção com verificação de tipos    |
| `npm start`            | Servidor Next.js da versão compilada               |
| `npm run typecheck`    | Verificação TypeScript                             |
| `npm test`             | Busca, orçamento, compatibilidade e dados          |
| `npm run test:server`  | Verificação HTTP e HTML das 12 rotas após compilar |
| `npm run format`       | Formatação do código                               |
| `npm run format:check` | Conferência de formatação                          |

## Dados e imagens

Os 50 produtos e cinco coleções foram preservados. Edite os arquivos em `public/data/catalogs/`. Dados da loja e WhatsApp ficam em `public/data/config/site.json`.

As imagens originais permanecem em `public/assets/images/catalogs/`. Substitua-as por seus WebP mantendo os nomes ou atualize `image`/`banner` no JSON. Mantenha os IDs estáveis para preservar o carrinho. As páginas leem JSON no servidor por requisição; alterações em código ou estilos exigem nova compilação em produção. O cache da interface pode manter os dados por até um minuto; recarregue a página para revisar uma alteração imediatamente.

## Estado desta entrega

Catálogos públicos, gestor de visualização/compartilhamento, busca, quantidades, orçamento persistido e mensagem agrupada para WhatsApp. O carrinho antigo continua compatível quando acessado na mesma origem (protocolo, domínio e porta). Mudar a porta não transporta automaticamente dados do navegador.

O painel autenticado para editar produtos e trocar fotos ainda será implementado. O banco e a importação Shopify já são opcionais; JSON é a fonte inicial até a configuração descrita abaixo.

A inspeção visual e as interações completas no navegador devem ser conferidas localmente; o navegador automatizado não estava disponível neste ambiente.

## Catálogo em escala e Shopify

A estrutura opcional de PostgreSQL inclui importação Shopify em lotes, versões com publicação transacional, preços por variante, busca/filtros no servidor, grade de 20 itens e navegação de categorias por departamento com pesquisa/paginação. O modo inicial continua usando os JSONs existentes. A ativação depende de banco e credenciais reais; consulte [docs/SHOPIFY.md](docs/SHOPIFY.md) para a sequência completa e os limites. `npm run test:scale` valida 13.518 variantes simuladas, sem chamar a loja real.

## Central de gestão e login

O painel usa `/gestor/`, com rotas de produtos, estoque, ofertas, catálogos, alterações, sincronizações, calendário, relatórios, equipe e configurações. O acesso da equipe é protegido; clientes continuam abrindo `/[slug]/` sem login.

Execute `npm run admin:setup` para definir a conta principal localmente. Cadastre as variáveis geradas no ambiente correto da Vercel antes de entrar. Não existe senha padrão e o acesso permanece fechado sem configuração. Para dados completos e outras contas, prepare o banco exclusivo e publique a importação conforme [docs/ADMIN.md](docs/ADMIN.md).

### Vendas Shopify

O módulo de vendas em `/gestor/vendas/` usa credenciais próprias, importação retomável e fila autenticada de eventos. Consulte [docs/VENDAS.md](docs/VENDAS.md) para ativar sem substituir a integração atual do catálogo. A publicação do código não executa migrações nem agenda sincronizações automaticamente.
