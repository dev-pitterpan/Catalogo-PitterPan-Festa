# Agenda e fornecedores

Página `/gestor/agenda/`, com abas de calendário, fornecedores e notas. Acesso somente a administradores, gerente de compras (herda admin) e gestores. Dados compartilhados no mesmo ambiente; responsável original de cada reunião/nota é preservado. Atendimento não tem acesso à página nem à API.

## Organização

- `src/lib/agenda`: tipos, validação de entrada, calendário em Brasília, normalização de telefone e leitor da exportação HTML.
- `src/server/agenda`: estrutura aditiva e persistência SQL com parâmetros, controle de revisão e registro de autor/ação.
- `src/app/api/admin/agenda`: autenticação, verificação de origem, validação e limites das requisições.
- `src/components/admin/agenda`: componentes separados para calendário, edição de compromissos, fornecedores, importação e notas.
- `src/styles/admin/agenda.css`: visual e adaptação de telas desta área.

A estrutura PostgreSQL é preparada no primeiro acesso autenticado, com lock de migração para evitar concorrência. Usa DATABASE_URL existente; nenhuma credencial Oracle ou WhatsApp é necessária. O usuário do banco precisa poder criar as novas tabelas. Falhas são exibidas na tela.

## Importação

Abra Fornecedores → Importar fornecedores do WinThor e selecione `fornecedores.html`. O arquivo fornecido pelo usuário contém 552 registros, códigos únicos, razão social, UF, nome do estado, outro campo de nome, CEP, periodicidade e cadastro. Não tem contatos/telefones/e-mails. Importamos somente código, fornecedor, outro nome e UF, sem inventar dados. HTML é lido como documento separado; jamais inserido como HTML na página. Arquivo bruto/dados de fornecedores não são publicados no repositório.

O usuário revisa a prévia e clica Importar. Operação atômica, até 2.000 registros por arquivo, máximo 3 MB local/1,5 MB de JSON na API. O código WinThor identifica cada fornecedor. Reimportação atualiza nome, nome alternativo e UF, preservando telefone, contato, e-mail, link de catálogo, notas e reuniões. Fornecedores ausentes do novo arquivo não são excluídos.

## Agenda e notas

Calendário mensal com 42 dias e reuniões do intervalo visível. Clicar no dia abre cadastro; clicar no compromisso abre edição. Horários em Brasília. Situações agendado, concluído e cancelado; cancelados ficam na lista do dia, sem ocupar a grade. Um responsável não pode ter dois compromissos agendados com sobreposição; horários adjacentes são permitidos. Máximo 24h por compromisso. Edição concorrente exige reabrir quando a revisão mudou.

Notas têm título, fornecedor opcional e texto simples com prévia de títulos `# ` e tarefas `- [ ]` / `- [x]`. Marcar tarefas modifica o rascunho: é necessário Salvar nota. Não é editor colaborativo em tempo real; não executa HTML. Leituras limitadas a 5.000 fornecedores, 2.000 compromissos por intervalo (até 93 dias), 1.000 notas mais recentes. Listas exibem lotes de 20.

Links externos somente HTTPS. WhatsApp usa `wa.me` com telefone brasileiro validado sintaticamente; o gestor confirma se o número possui WhatsApp. Sem telefone válido, atalho desabilitado. Mensagem e catálogo são preparados na ficha e abertos para revisão/envio no WhatsApp; o sistema não envia automaticamente e não importa conversas. Videochamadas usam link cadastrado: não criam salas automaticamente. Não há notificações por e-mail/push nem sincronização com Google Calendar nesta versão.

## Verificação

`node --experimental-strip-types --test tests/agenda.test.ts`, `npm run typecheck`, `npm run build` e verificações HTTP do projeto. Integração PostgreSQL validada com PGlite, sem conexão ao banco real do WinThor.
