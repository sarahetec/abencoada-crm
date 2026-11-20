# Abençoada CRM — primeira versão

## Funcionalidades preparadas
- Dashboard e contadores.
- Cadastro, edição, pesquisa e filtros de leads.
- Arquivamento reversível e restauração.
- Biblioteca pesquisável com 20 modelos de mensagens e botão de copiar.
- Botão WhatsApp com mensagem inicial preenchida; nunca envia automaticamente.
- Confirmação manual para mudar o status para “Mensagem enviada”.
- Histórico de cadastro, edição, arquivamento e confirmação de envio.
- Supabase como banco de dados remoto.

## Configuração do Supabase
1. Crie um projeto no Supabase.
2. Abra SQL Editor e execute `supabase-schema.sql`.
3. Em Authentication > Users, crie seu usuário com e-mail e senha.
4. Em Project Settings > API, copie Project URL e a chave publicável (anon/public).
5. Nunca use a chave `service_role` no navegador.

## Testar localmente
Abra a pasta no VS Code. Instale a extensão Live Server e abra `index.html` com Live Server. Informe a URL e a chave publicável na tela inicial. A configuração fica na sessão atual do navegador.

## GitHub e publicação
Crie um repositório **Private** chamado `abencoada-crm` e envie os arquivos desta pasta. Para disponibilizar como site, conecte o repositório a um serviço de hospedagem estática, como Cloudflare Pages.

## Atenção
Não cadastre dados reais antes de configurar autenticação e executar o SQL. A chave publicável é própria para frontend, mas a segurança depende das políticas RLS. O Supabase e a hospedagem gratuitos têm limites de uso. Esta versão ainda não importa Excel/CSV e a biblioteca de mensagens está fixa no código; essas serão próximas melhorias.
