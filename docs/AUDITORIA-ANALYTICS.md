# Auditoria de análises — 29/10/2026

Escopo: autenticação Shopify, consulta ShopifyQL, validação da resposta, rota administrativa, testes, origem do deploy e logs visíveis da Vercel. Não é uma auditoria integral de segurança de todo o catálogo.

## Evidências

- GitHub main: `5cebbfc6dfb045ae43cfac3069601333b3954154`; árvore idêntica ao código local auditado antes desta correção.
- Produção na Vercel: Ready, mesmo commit, deployment `CQBm95vXV8i8Lif4ohyKpM2r1R93`.
- As quatro variáveis SHOPIFY_SALES estão cadastradas. Valores secretos não foram revelados nem comparados com o computador do usuário.
- Diagnóstico executado pelo usuário confirmou read_reports no token local após aprovação da atualização de acesso. Isso não comprova sozinho os acessos do token de produção.
- A consulta usa os campos oficiais tableData/columns/rows/parseErrors da API 2026-10. O formato básico coincide com o exemplo oficial.
- O endpoint Analytics consulta a Shopify diretamente: migrar ou reimportar PostgreSQL não corrige sua autorização.

## Problemas confirmados no código

1. O cliente descartava o código ACCESS_DENIED e devolvia apenas erro GraphQL genérico.
2. A validação descartava a distinção entre parseErrors, resposta incompatível e ausência de tabela.
3. A rota convertia todas essas causas na mesma orientação sobre permissões e não registrava diagnóstico no servidor.

Correção preparada: códigos seguros ACCESS_DENIED, GRAPHQL_ERROR, QUERY_INVALID, RESPONSE_INVALID, NO_TABLE e ANALYTICS_UNAVAILABLE. O log não contém token, credenciais, dados de clientes, resposta bruta ou mensagens externas. A interface já exibe o campo error retornado pela rota.

## Causa de sintaxe confirmada após o diagnóstico

O painel retornou QUERY_INVALID após a publicação do diagnóstico. As consultas geravam `SINCE '2026-09-30' UNTIL '2026-10-29'`. A documentação oficial exige datas absolutas sem aspas: `SINCE 2026-09-30 UNTIL 2026-10-29`.

Correção: remover as aspas do período atual e anterior, incluindo vendas, evolução, canais, produtos e sessões. O teste verifica as seis consultas geradas e as datas dos dois períodos, além da independência da seção de sessões.

Referência de sintaxe: https://shopify.dev/docs/api/shopifyql/latest/syntax/since-until-during

## Limites e próximo passo

A correção resolve o defeito de sintaxe identificado. A execução autenticada em produção ainda depende de uma nova consulta pelo gestor: não há credenciais locais e o painel no navegador disponível exige login. Os testes com cliente simulado não comprovam permissões ou disponibilidade de todas as métricas na loja.

Referências: https://shopify.dev/docs/api/admin-graphql/latest/queries/shopifyqlQuery e https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes
