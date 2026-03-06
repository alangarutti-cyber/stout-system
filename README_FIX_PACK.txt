
# Stout System — Fix Pack (Base Estável + Reparador de Código)

Este pacote contém:
1) **scripts/repair-src.js** → Script que varre a pasta `src` do SEU projeto e corrige arquivos corrompidos (remove `...` indevidos, junta tokens quebrados como `Auth\nProvider`, etc.).
2) **src/App.jsx**, **src/main.jsx**, **src/components/ErrorBoundary.jsx**, **src/components/layout/MainLayout.jsx** → Núcleo limpo com roteamento protegido e captura de erro global.
3) **Tailwind pronto** → `tailwind.config.js`, `postcss.config.js`, `src/index.css`.
4) **package.additions.json** → Lista de dependências para garantir que tudo rode.

## Como usar (passo a passo)
> **Faça backup do seu repositório antes.**

### 0) Pré-requisitos
- Node 18+
- Projeto criado com Vite + React.

### 1) Copie os arquivos deste pacote
- Copie as pastas/arquivos **deste zip** para a raiz do SEU projeto.
- Isso vai **substituir** `src/App.jsx`, `src/main.jsx`, e criar `src/components/ErrorBoundary.jsx` e `src/components/layout/MainLayout.jsx`.

### 2) Instale as dependências recomendadas
No terminal, dentro do seu projeto, rode:
```
npm i react-router-dom @supabase/supabase-js lucide-react
npm i -D tailwindcss postcss autoprefixer
```
Se já tiver Tailwind: apenas garanta que seu `tailwind.config.js` contenha:
```
content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
plugins: [require("tailwindcss-animate")]
```
E rode:
```
npx tailwindcss init -p
```

### 3) Regenerar UI (shadcn) — recomendado
Você tem Radix e shadcn no projeto. Reinstale/regenere a UI limpa:
```
npm i -D shadcn-ui class-variance-authority tailwind-merge clsx tailwindcss-animate
npx shadcn@latest init
npx shadcn@latest add button input label textarea select checkbox switch tabs dialog dropdown-menu toast popover progress table card skeleton calendar
```
> Isso cria/atualiza `src/components/ui/*` **sem** arquivos corrompidos.

### 4) Reparar **seus** arquivos atuais de `src/`
Execute o reparador:
```
node scripts/repair-src.js
```
- Ele procura por `...` e por tokens quebrados por `\n` (ex.: `N\navigate` → `Navigate`, `co\nnst` → `const`, `Auth\nProvider` → `AuthProvider`), sem alterar strings/JSX normais.
- Um log `repair-report.json` será gerado na raiz indicando arquivos alterados.

### 5) Rodar o projeto
```
npm run dev
```
Se abrir normalmente, faça um commit com a base estável.
Em caso de erro de import específico, veja o log do terminal — agora o **ErrorBoundary** evita “tela branca total” e mostra de qual módulo veio o problema.

### 6) Variáveis de ambiente Supabase
Crie `.env` (ou `.env.local`) com:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Observações
- Este pack não inclui os seus módulos de negócio; ele cria a espinha dorsal estável **para todos os módulos** funcionarem e traz um reparador para limpar a corrupção nos arquivos existentes.
- Caso precise, posso gerar uma pasta `src/components/ui` completa aqui e anexar em outro pack.
