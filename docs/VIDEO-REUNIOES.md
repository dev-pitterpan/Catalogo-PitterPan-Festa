# Videochamadas na agenda

## O que está preparado

O gestor salva o compromisso, reabre os detalhes e cria uma sala. O servidor gera um nome aleatório com 192 bits de entropia, persiste o link em `pitterpan_appointments.video_url` e incrementa a revisão do compromisso. Criar novamente reaproveita a sala e não substitui links externos. Nenhuma tabela, migração ou assinatura nova é necessária.

A página protegida `/gestor/reunioes/[id]/` exige admin/gestor (incluindo gerente de compras pela regra existente). Ela lê o compromisso no banco e carrega o SDK IFrame oficial somente após clicar em Entrar na chamada. O SDK vem exclusivamente da origem HTTPS configurada. Câmera e áudio começam desativados; a preparação da chamada continua sob controle do participante. Ao sair ou navegar, `dispose()` libera o cliente. Acesso negado ao microfone/câmera é tratado pela interface do Jitsi.

O convite contém assunto, data/hora de Brasília e link direto da sala no servidor Jitsi. O fornecedor acessa essa sala externa, sem login nem acesso ao gestor Pitter Pan. O servidor Jitsi pode exigir espera pelo organizador, autenticação ou senha segundo sua própria configuração. Copiar convite e preparar WhatsApp usam os dados salvos; o envio é manual, nunca automático. Salve mudanças de data, link ou fornecedor antes de enviar um novo convite.

Cancelar/concluir o compromisso bloqueia a entrada pela página do gestor, mas não apaga a sala nem revoga um link já compartilhado no servidor Jitsi. Encerramento, lobby, senha, bloqueio de convidados, gravação e retenção são responsabilidades do servidor Jitsi. A URL aleatória não substitui autenticação do organizador. A integração não emite JWT nem concede moderação por nome de usuário.

## Configuração que falta

Definir `JITSI_BASE_URL=https://video.SEU-DOMINIO` no projeto Vercel do gestor e fazer redeploy. Use somente a origem, sem caminho, credenciais, query ou fragmento. Sem essa variável válida, a interface informa que a configuração está pendente e desabilita criação de salas; não troca automaticamente para um provedor público. A configuração do ambiente não testa conectividade, câmera, qualidade ou autenticação: esses itens exigem o servidor real funcionando.

O servidor da loja hoje é Windows e fica ligado, mas capacidade, acesso externo e virtualização ainda não foram confirmados. O administrador deve avaliar uma VM Linux dedicada no Windows (por exemplo Hyper-V) ou uma implantação Docker Linux suportada; não instalar componentes de vídeo no Oracle/Winthor nem abrir portas de banco. Nenhum comando foi executado no servidor da empresa.

Confirmar com TI: versão/licença Windows e recursos de virtualização; CPU/RAM livres; participantes e reuniões simultâneas; upload de internet; IP público/CGNAT; domínio; roteador/firewall; HTTPS com certificado válido; atualização e reinicialização automática da VM/containers. O software Jitsi é aberto, mas máquina, conexão e manutenção não são isentas de custo operacional.

A implantação deve seguir a versão estável e a documentação oficial. Configurar PUBLIC_URL, senhas dos serviços, acesso autenticado para organizar reuniões e acesso de convidados, teste de lobby e eventual TURN para redes restritas. Em instalações típicas, TI precisa planejar HTTPS TCP 443 e mídia UDP 10000; validar as portas efetivas na implantação escolhida. Não disponibilizar um servidor de salas abertas sem controle de criação. A Vercel hospeda o painel, não o servidor de mídia.

## Validação antes de liberar

1. Abrir o domínio HTTPS fora da rede da loja, sem alerta de certificado.
2. Confirmar que visitante não cria/modera salas sem autenticação.
3. Configurar JITSI_BASE_URL e redeploy; criar uma sala num compromisso de teste.
4. Entrar no painel e, em outro dispositivo usando rede móvel, abrir o convite de fornecedor.
5. Testar autorização do anfitrião, espera/entrada de convidado, câmera, áudio, tela, saída e nova entrada. Não gravar sem decisão explícita e consentimento dos participantes.
6. Salvar alterações no compromisso e confirmar convite/horário; testar cancelamento e compreender que o link externo não é revogado automaticamente.

Código e testes locais não confirmam o funcionamento da infraestrutura ainda não instalada.

## Referências oficiais

- https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/
- https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe-functions/
- https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/
- https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart/
- https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-windows/
