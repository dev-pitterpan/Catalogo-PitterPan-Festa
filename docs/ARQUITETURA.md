# Arquitetura

## Rotas e renderização

Next.js App Router substitui Vite, o HTML de entrada e React Router. `src/app/layout.tsx` define o documento raiz. Páginas públicas e do gestor têm rotas próprias. Slugs são conferidos no manifesto e os inexistentes retornam 404. Metadados são gerados por catálogo.

As páginas usam renderização dinâmica: o servidor lê o manifesto e os JSONs, valida com Zod e envia conteúdo inicial para a interface React. Isso fornece o HTML dos produtos na resposta inicial. O navegador mantém busca, carrinho, compartilhamento e cache com TanStack Query. A navegação interna utiliza Next Link.

## Separação de responsabilidades

- `src/app`: entradas das páginas e endpoints.
- `src/server`: operações exclusivas do servidor e leitura de arquivos.
- `src/services`: atualização dos dados pela interface; ponto de integração para uma futura API.
- `src/schemas`: validação dos dados em execução.
- `src/types`: contratos usados pelo restante do código.
- `src/hooks`: estado, persistência e consultas.
- `src/components`: apresentação e interações.

O cache do React no servidor dura a requisição. O QueryClient é criado por instância do provider, sem compartilhar dados entre requisições do servidor. Dados recebidos do servidor são usados como estado inicial das consultas.

## Carrinho e hidratação

A renderização no servidor e a primeira renderização do navegador começam com seleção vazia. Após a hidratação, o hook lê o carrinho antigo do localStorage e somente então habilita a gravação. Isso evita apagar uma seleção salva antes de sua leitura. A chave original é preservada.

O painel de orçamento mantém o foco do teclado enquanto aberto, fecha com Escape e devolve o foco ao botão de origem. Bloqueios do localStorage mostram um aviso e preservam a seleção em memória.

## Estilos e imagens

Tailwind é compilado localmente com PostCSS. Os temas originais são carregados pela entrada global de CSS. Os estilos da página inicial foram limitados ao contêiner `.manager-page` para evitar interferência entre páginas durante a navegação do Next.js. As imagens e os ícones temáticos originais permanecem em `public/assets`.

## Ambiente

O processo Node roda o servidor Next.js. `scripts/run-next.ts` carrega e valida o `.env` para iniciar dev ou produção com endereço e porta locais. Variáveis públicas têm prefixo `NEXT_PUBLIC_`. Nenhum segredo é enviado para componentes. Não há CDN nem fontes remotas.

## Futuro painel administrativo

A próxima fase deve separar autenticação, permissões, produtos, coleções e mídia. Endpoints autenticados podem ficar em `src/app/api`. As operações de banco e armazenamento ficam em `src/server`, e o frontend acessa a camada de serviços.

A escolha do banco depende do uso: SQLite para um único servidor local, ou PostgreSQL para operação compartilhada. Uploads precisam validar formato/tamanho e usar um diretório próprio de mídia, fora de `.next` e do código. Não há login, upload ou gravação nesta versão.

A validação de existência do catálogo ocorre antes da resposta da página, sem boundary global de carregamento que antecipe o streaming. Isso preserva o status HTTP 404 para slugs inexistentes. O estado de carregamento é um componente de interface.
