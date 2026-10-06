# Maltix

Painel responsivo de operação para cervejarias artesanais, com dashboard, mapa de tanques, acompanhamento de lotes, pedidos B2B e clientes. A primeira versão usa dados mockados em memória; as alterações ficam disponíveis durante a sessão do navegador.

## Executar

Requer Node.js 18 ou superior.

```bash
cd back/maltix
npm install
npm run build
cd ..
npm start
```

Abra [http://localhost:3001/maltix](http://localhost:3001/maltix). O backend existente continua servindo o site anterior na rota raiz.

Para desenvolver com recarga automática, execute `npm run dev` em `back/maltix` e `npm start` em `back` em outro terminal. O Vite estará disponível em [http://localhost:5173/maltix/](http://localhost:5173/maltix/).

## Estrutura

- `back/maltix/src`: aplicação React, estilos, tipos e dados de demonstração.
- `back/maltix/vite.config.ts`: servidor de desenvolvimento e build estático.
- `back/front/maltix`: destino do build, servido pelo Express em `/maltix`.
