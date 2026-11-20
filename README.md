# Abençoada CRM

CRM para gerenciamento de contatos da Corretora Abençoada com autenticação Supabase, banco de dados PostgreSQL com RLS, histórico de atividades, integração com WhatsApp (20 mensagens prontas) e importação em massa de planilhas Excel/CSV.

## Arquivos do Projeto
- `index.html` — Estrutura completa da aplicação, telas de conexão/login, modais de cadastro, detalhes, diagnóstico e importação.
- `app.js` — Lógica completa em ES Modules, integração Supabase, validação, WhatsApp e importador SheetJS.
- `styles.css` — Identidade visual marrom, bege e off-white responsiva (celular, tablet e computador).
- `supabase-schema.sql` — Script SQL idempotente para criar/atualizar tabelas, índices, gatilhos e políticas RLS.

## Como publicar no GitHub Pages
1. Execute `supabase-schema.sql` no **SQL Editor** do seu projeto Supabase.
2. Em **Authentication → URL Configuration** no Supabase, defina a **Site URL** com o endereço do seu GitHub Pages.
3. Suba todos os arquivos desta pasta para a raiz (`main`) do seu repositório GitHub.
4. Ative o GitHub Pages em **Settings → Pages → Deploy from a branch (`main` / `/root`)**.
