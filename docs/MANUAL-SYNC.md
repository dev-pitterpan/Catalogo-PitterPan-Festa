# Sincronização pelo gestor

Administradores e Gerentes de Compras encontram **Sincronizar** no topo do gestor e **Sincronizar agora** na seção Sincronizações. O POST exige sessão e origem válida. Não há endpoint público para iniciar importações.

A execução usa Workflow SDK da Vercel (`workflow`), com etapas duráveis. Fechar o navegador não cancela o trabalho. Não depende de um cron nem adiciona agendamento periódico. Em produção, requer acesso às variáveis de sistema da Vercel (`VERCEL_DEPLOYMENT_ID`) e o serviço Workflow disponível no projeto/plano. O backend local do SDK atende desenvolvimento, não produção.

As credenciais de catálogo `SHOPIFY_*`, de pedidos `SHOPIFY_SALES_*` e `DATABASE_URL` existentes continuam sendo usadas. Não há credencial no navegador nem transferência do segredo para a fila: o argumento do workflow é só o UUID da tarefa. A tabela de acompanhamento é criada aditivamente no primeiro acesso. As tabelas existentes de catálogo e vendas devem estar migradas.

Etapas:

1. Exportação bulk da Shopify. A espera usa suspensão durável, sem manter uma função ocupada.
2. Download JSONL para uma versão de preparação. URLs assinadas não são persistidas no job nem retornadas ao navegador.
3. Normalização em lotes de 250 variantes. Cada lote é transacional e pode ser repetido.
4. Sincronização de pedidos usando a fila/checkpoint e lease existentes.
5. Validação e publicação atômica do catálogo; invalidação do cache persistente da vitrine. O cache em memória de outras instâncias da vitrine direta pode permanecer por até cinco minutos.

O índice parcial permite uma tarefa ativa por vez. O workflow assume a propriedade da tarefa; execução duplicada não pode marcar o trabalho do proprietário como falho. Uma versão vazia, de outra loja ou com queda superior a 20% nos itens/coleções continua bloqueada pelas regras existentes. Se outro administrador publicar uma versão durante o trabalho, a comparação com a versão inicial impede sobrescrevê-la.

Falhas encerram o acompanhamento com mensagem segura. Os dados já publicados continuam acessíveis; pedidos podem ter sido atualizados em páginas antes de uma falha posterior. Uma nova tentativa cria uma nova importação, enquanto o worker de pedidos reaproveita seu checkpoint. O painel verifica execuções interrompidas e libera tarefas sem inicialização após dez minutos ou que ultrapassem três horas. Não há exclusão automática das versões anteriores.

A conclusão atualiza o banco; telas abertas em outras abas precisam de nova consulta. A seção de vendas mantém seu polling existente. Shopify Analytics é consultado separadamente e pode ter atraso de processamento da própria Shopify.

Os testes locais simulam Shopify e executam SQL real com PGlite: exclusividade, importação incompleta, repetição de lote/publicação e preservação da versão ativa. A validação autenticada em produção requer acesso à sessão da loja.
