# Maltix

Plataforma de gestão para cervejarias artesanais. O Maltix mantém seu onboarding, painel de produção, tanques, lotes e status, e incorpora os módulos operacionais da Cervejaria Biesdorf.

## Publicar no GitHub Pages

1. Envie este projeto para um repositório GitHub com a branch padrão chamada `main`.
2. Em **Settings → Pages**, selecione **GitHub Actions** como fonte de publicação.
3. Faça push para `main` ou execute manualmente **Actions → Deploy Maltix to GitHub Pages → Run workflow**.

O workflow instala as dependências, constrói o site e publica a aplicação. O caminho base é configurado com o nome do repositório, então a página funciona em URLs de projeto do GitHub Pages.

## Executar localmente

Requer Node.js 20 ou superior.

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

O Maltix usa a configuração pública do aplicativo Web Firebase existente da Cervejaria Biesdorf, portanto não precisa de Actions secrets para inicializar Auth e Firestore no GitHub Pages. A chave Firebase Web é identificador público do cliente, não uma credencial administrativa; a segurança dos dados depende das regras do Firestore. O domínio `joaobiesdorf.github.io` já foi adicionado aos domínios autorizados do Firebase Authentication.

O login operacional usa contas Biesdorf já existentes. O cadastro Maltix continua disponível como demonstração local e não cria usuários no Firebase nem grava nas coleções operacionais. Os módulos Biesdorf reutilizam as coleções existentes (`pedidos`, `clientes`, `equipamentos`, `eventos` e `cervejas`); esta integração não cria nem migra coleções ou documentos. As telas de produção Maltix (tanques e lotes) continuam usando seus dados locais de demonstração.

O arquivo de conta de serviço do Firebase Admin é usado apenas pelo backend local e não deve ser publicado, enviado ao GitHub ou inserido no aplicativo web. A configuração do cliente Web não contém chave privada. As regras atuais do Firestore exigem autenticação para ler e gravar.
