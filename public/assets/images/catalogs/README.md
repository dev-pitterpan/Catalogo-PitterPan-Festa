# Imagens dos catálogos

Esta pasta contém banners e imagens WebP das coleções.

Estrutura:

```text
assets/images/catalogs/<slug>/
├── banner.webp
├── produto-1.webp
├── produto-2.webp
└── ...
```

As referências utilizadas pelos produtos ficam exclusivamente em:

`data/catalogs/<slug>.json`

Para trocar uma imagem mantendo o mesmo caminho, substitua o arquivo.
Para usar outro nome, atualize o campo `image` no JSON correspondente.

Não são utilizadas imagens externas por CDN.
