# Central de gestão Pitter Pan

## Rotas

| Rota                      | Função                                                  | Acesso                                              |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| `/login/`                 | Login da equipe                                         | Público                                             |
| `/gestor/`                | Indicadores, categorias e alertas                       | Equipe                                              |
| `/gestor/produtos/`       | Produtos, filtros e CSV da página                       | Equipe                                              |
| `/gestor/estoque/`        | Estoque baixo, alto, zero e desconhecido                | Equipe                                              |
| `/gestor/ofertas/`        | Preço menor que o preço anterior cadastrado             | Equipe                                              |
| `/gestor/catalogos/`      | Catálogos e links públicos para clientes                | Equipe                                              |
| `/gestor/alteracoes/`     | Comparação das duas versões publicadas                  | Equipe                                              |
| `/gestor/sincronizacoes/` | Estado das últimas 20 importações                       | Equipe                                              |
| `/gestor/calendario/`     | Planejamento das últimas/próximas campanhas cadastradas | Equipe consulta; gestor/admin cadastram e atualizam |
| `/gestor/relatorios/`     | Resumo em CSV e acesso aos relatórios                   | Equipe                                              |
| `/gestor/usuarios/`       | Cadastro e desativação de contas                        | Administrador                                       |
| `/gestor/configuracoes/`  | Limites de estoque e estado da integração               | Administrador                                       |
| `/gestor/[slug]/`         | Visão do gestor de uma coleção                          | Equipe                                              |
| `/[slug]/` e `/`          | Catálogos para clientes                                 | Público, sem login                                  |

As APIs administrativas estão em `/api/admin/*`. Cada handler valida a sessão e, quando necessário, o papel. As APIs públicas de catálogo e checkout continuam públicas; não são usadas como fonte de informação administrativa privada.

## Ativar a conta principal

Não existe senha padrão. Com o projeto atualizado no seu computador:

```powershell
git pull --ff-only
npm run admin:setup
```

O terminal solicita e-mail, nome e senha (12 a 128 caracteres, sem eco). O comando salva no `.env` local `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD_HASH` e `ADMIN_SESSION_SECRET`. Preserva as outras variáveis. O hash usa scrypt com salt aleatório; a senha não é armazenada nem impressa. A chave de sessão tem 48 bytes aleatórios.

No projeto correto da Vercel, cadastre esses quatro valores em Settings → Environment Variables → Production. Copie somente os valores, sem as aspas delimitadoras do `.env`, e faça novo deploy. Nunca envie o `.env`, o hash, a chave ou a senha no chat, em prints ou ao GitHub.

Sem essas variáveis, o acesso administrativo permanece fechado e o login explica que aguarda ativação. Os catálogos públicos continuam funcionando.

A conta principal usa a configuração do servidor e funciona antes do banco estar preparado. Para trocar sua senha, execute o setup novamente e atualize as variáveis no ambiente correto: a alteração do hash/chave revoga suas sessões antigas. Recuperação por e-mail e MFA não estão implementados.

## Banco e equipe

Use exclusivamente o banco do catálogo. Nenhuma migração é executada automaticamente pelo deploy ou ao abrir uma página:

```powershell
npm run db:migrate
```

A migração é aditiva: cria tabelas com prefixo `pitterpan_admin_` para contas, tentativas de login, preferências, eventos administrativos e campanhas. Não altera dados de outros projetos nem reescreve os produtos publicados.

Após preparar o banco, o administrador pode cadastrar até 50 contas adicionais, escolher papéis e desativar/reativar acessos. As contas desativadas deixam de acessar na próxima verificação. O papel é conferido novamente no servidor, não aceito do navegador. A conta principal e a própria conta não podem ser desativadas pela tela.

Atendimento consulta e compartilha. Gestor também organiza o calendário. Administrador cadastra acessos e altera limites. Mudanças de contas e preferências são registradas sem senha ou hash no log de eventos do banco.

## Dados do painel

O dashboard lê a versão publicada do PostgreSQL quando o banco está disponível e preparado, mesmo que a vitrine pública ainda esteja em modo Shopify. Não varre a loja inteira da Shopify a cada abertura do painel. Se a base ainda não estiver pronta, indicadores aparecem como indisponíveis e a interface explica a preparação necessária.

No modo JSON sem banco, os indicadores usam os arquivos locais e mostram explicitamente a origem. Quantidades ausentes não viram zero. Não são dados simulados da loja inteira.

- Produtos: IDs distintos de produto Shopify; variantes: linhas publicadas.
- Ofertas: `compare_at_price > price`, sem inferir vigência de campanha, frete ou descontos automáticos.
- Estoque baixo: quantidade positiva até o limite configurado. Estoque alto: quantidade maior ou igual ao outro limite. Zero/negativo e desconhecido são separados.
- Quantidades são agregadas da última importação, não disponibilidade em tempo real por loja/local nem reserva.
- Alterações: comparação por ID de variante entre a versão ativa e a anterior publicada; acompanha nome, preço, estoque, imagem e categoria. A primeira importação é referência inicial, não milhares de falsas novidades.
- Removido/despublicado não significa vendido. Vendas e faturamento precisam de integração específica com pedidos.
- CSV de produtos exporta a página visível; CSV de relatórios exporta o resumo operacional. Campos que poderiam virar fórmulas no Excel são neutralizados.
- Campanhas são cadastradas manualmente com data, observação e catálogo opcional. A agenda mostra até 200 registros; não envia mensagens, lembretes ou publicações automaticamente.

Antes de trocar a origem pública, siga `docs/SHOPIFY.md`: importação → revisão → publicação → validação. O deploy do painel não ativa PostgreSQL nem inicia importações.

## Segurança e manutenção

Sessões assinadas com HMAC-SHA256, duração de oito horas, cookies HttpOnly/SameSite=Lax e Secure com prefixo `__Host-` em produção. Senhas usam scrypt (`N=32768,r=8,p=1`) com salt individual. Endpoints de escrita verificam origem e permissões; redirecionamentos pós-login são limitados a rotas do gestor. Credenciais não são serializadas na interface.

O login limita oito tentativas por e-mail a cada janela de 15 minutos. Com a tabela preparada, o limite é compartilhado pelo banco; sem ela, há fallback de memória por instância. Regras de WAF na hospedagem podem complementar a proteção, especialmente antes da migração. Não há cadastro público.

O visual usa CSS com profundidade e ilustração em perspectiva, sem motor WebGL, fontes externas ou bibliotecas por CDN. O CSS base é isolado em `src/styles/admin.css`, com acabamento do dashboard em `src/styles/admin/dashboard.css`; componentes ficam em `src/components/admin`, autenticação em `src/server/auth` e dados em `src/server/admin`. As páginas usam o grupo `(dashboard)` para compartilhar o shell, mantendo o catálogo de uma coleção com seu próprio layout.

Validação local: testes de criptografia, permissões, comparação real de snapshots com PostgreSQL/PGlite, estoque desconhecido, ofertas, login HTTP, CSRF, cookies, redirecionamento, APIs privadas e páginas públicas. Contas, credenciais e dados de teste nunca são usados para ativar a produção.

### Compatibilidade do hash local

O setup salva o hash em uma forma sem `$` para impedir a expansão de variáveis do Next. Hashes antigos continuam válidos: `npm run dev` e `npm start` normalizam a configuração em memória, sem reescrever o `.env` ou trocar a senha. Depois de atualizar o código, reinicie o servidor local. O fingerprint das sessões usa a forma canônica, preservando a compatibilidade com os valores já configurados na Vercel.

### Acabamento visual do dashboard

O painel compartilha a linguagem clara da vitrine: base azul suave, superfícies translúcidas e bordas discretas. A navegação é agrupada por operação, planejamento e gestão, com indicação de navegação pendente. Cards de catálogos reutilizam os banners e ícones da vitrine. O carregamento usa placeholders de estrutura, sem números simulados nem espera artificial. O tema contempla redução de movimento, foco visível, navegação móvel com contenção de foco e alvos maiores para toque.
