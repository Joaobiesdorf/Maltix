# Maltix

Plataforma de demonstração para gestão de cervejarias artesanais. O site inclui uma página pública, telas de acesso e cadastro, configuração de cervejaria e um painel interativo de operação.

## Publicar no GitHub Pages

1. Envie este projeto para um repositório GitHub com a branch padrão chamada `main`.
2. Em **Settings → Pages**, selecione **GitHub Actions** como fonte de publicação.
3. Faça push para `main` ou execute manualmente **Actions → Deploy Maltix to GitHub Pages → Run workflow**.

O workflow instala as dependências, constrói o site e publica a aplicação. O caminho base é configurado com o nome do repositório, então a página funciona em URLs de projeto do GitHub Pages.

## Executar localmente

Requer Node.js 18 ou superior.

```bash
cd back/maltix
npm install
npm run dev
```

Abra [http://localhost:5173/maltix/](http://localhost:5173/maltix/). Para validar a versão de produção:

```bash
npm run typecheck
npm run build
```

O build é escrito em `back/front/maltix`, que também continua sendo servido pelo Express em `/maltix`.

## Sobre contas e dados

GitHub Pages hospeda arquivos estáticos e não oferece autenticação, banco de dados ou envio de formulários. Os fluxos de entrar, criar conta e cadastrar cervejaria neste projeto são demonstrações apenas no navegador: não validam credenciais, não enviam nem persistem os dados e não devem ser usados com senhas ou informações reais. Para uso em produção, conecte um backend e um provedor de autenticação antes de coletar dados.
