# Login Pitter Pan — proposta implementada

A tela `/login/` segue a proposta aprovada: coluna azul com título branco/amarelo e arte de festa; formulário branco gelo, ação azul e detalhe vermelho/amarelo no rodapé. O layout adapta proporções e arte no celular. Textos e campos são HTML; a ilustração não contém o formulário.

## Arquivos

- `src/app/login/page.tsx`: estrutura, metadados e verificação da sessão.
- `src/components/admin/LoginForm.tsx`: campos, exibição da senha, ajuda e envio de login.
- `src/styles/admin/login.css`: acabamento isolado com `.party-login`.
- `public/assets/images/admin/login-party.webp`: arte local, 1536 × 1024, alpha preservado, aproximadamente 190 KB. O Next também oferece versões responsivas.

A imagem foi preparada com a ferramenta integrada `image_gen`, usando a imagem aprovada como referência visual; a versão WebP otimiza a entrega da mesma composição. O original gerado foi preservado fora do código publicado. Não há motor 3D, fonte remota ou dependência de CDN para compor a interface.

## Prompt final da arte

> Use case: background-extraction / precise-object-edit. Asset type: transparent decorative 3D artwork for a real login website. The provided image is the APPROVED UI mockup, only a reference for the illustration. Output ONLY the 3D party composition seen in its lower-left area: the royal blue gift box with luxurious gold/yellow satin bow and ribbon, narrow red ribbon accent, one glossy red balloon and one glossy yellow balloon to the right of the gift, curled red, yellow and blue ribbon streamers scattered on the floor, and a few round confetti. Preserve the same sophisticated 3D style, proportions, palette, soft studio lighting, direction and quality of materials as the reference. Do NOT include the UI, lettering, logos, headlines, form, rectangles, background panel, browser frame or any text. Genuine transparent alpha background, with soft semi-transparent grounding shadows below the objects. Landscape artwork around 3:2, gift left-of-center and balloons on its right, all objects fully inside image with a small margin. Full composition occupies most of the canvas. Colors exactly Pitter Pan royal blue #2F3F91, vivid red #F21F26, sunny gold/yellow #FFD51A. Not a wireframe, not flat vector; polished photorealistic 3D illustration matching the approved mockup. Avoid extra props, extra balloons or white backdrop. This output is a reusable web asset, not a new login mockup.

## Controles de acesso

“Manter conectado” preserva o cookie por até oito horas, como já ocorria antes. Desmarcado, o cookie não recebe duração persistente; o token continua limitado a oito horas. Nenhuma senha é salva no navegador pela aplicação. O comportamento de restauração de sessões ao reabrir o navegador depende do próprio navegador.

“Esqueci minha senha” abre orientação de recuperação com o administrador. Não envia e-mail nem simula uma solicitação. A recuperação automática por e-mail permanece fora desta entrega.

A configuração da conta, os hashes existentes, a proteção das APIs e o acesso público aos catálogos permanecem compatíveis. Não é necessário redefinir a senha ou recriar o `.env` para aplicar o visual.
