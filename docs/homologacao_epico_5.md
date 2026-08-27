# Relatório de Homologação da Nossa Equipe: Segurança (Épico 5)

Este documento mapeia cada um dos requisitos solicitados originalmente no Épico 5, descrevendo exatamente como nossa equipe resolveu o problema no código e como você pode testar cada uma dessas melhorias na sua máquina.

---

## 🛡️ Rastreio de Requisitos do Épico 5

| Requisito Solicitado | O Que Nós Implementamos | Como / Onde Testar |
| :--- | :--- | :--- |
| **1. Definir política de acesso aos dados** | Preparamos a fundação de segurança criando o endpoint `/api/auth/login` e o decorador `@require_auth` no backend (`api_server/server.py`). Como combinamos, usamos um acesso estático temporário para construir as rotas RBAC futuramente. | Inspecione `api_server/server.py` (linha 47) para ver o bloqueio por Token. |
| **2. Remover credenciais do código-fonte** | Auditamos o código do backend (`server.py`) e do robô. Todas as strings de banco de dados e e-mails foram parametrizadas para leitura dinâmica com `os.getenv()`. | Busque por strings fixas (senhas) no código Python. Nenhuma credencial foi chumbada. |
| **3. Configurar variáveis de ambiente** | Centralizamos a gestão no arquivo `.env` e mapeamos os valores de forma dinâmica dentro do arquivo `docker-compose.yml`. | Veja o bloco `environment:` dos serviços no `docker-compose.yml`. |
| **4. Configurar armazenamento seguro** | Como a aplicação rodará localmente por enquanto, garantimos que `.env` não vaze para o controle de versão nem para as imagens geradas, atualizando nosso `.gitignore` e `.dockerignore`. | Rode `git status` e confira se arquivos como `.env` e pastas `scratch/` são ignorados. |
| **5. Proteger credenciais do bot** | As credenciais `EMAIL_PASSWORD` do bot agora fluem com segurança direto do `docker-compose.yml` para a memória do container `datalens-rpa`, sem estarem salvas no script do bot. | Verifique o serviço `rpa-bot` no `docker-compose.yml`. |
| **6. Não expor credenciais no frontend** | Realizamos uma auditoria completa na pasta `dashboard/` e garantimos que nenhuma variável iniciada com `VITE_` está expondo segredos de banco ou do bot para o lado do cliente (browser). | No `dashboard/package.json` ou código, não existem vazamentos de secrets. |
| **7. Implementar HTTPS** | Criamos um servidor `nginx` atuando como Proxy Reverso (porta 443). Ele possui um Dockerfile customizado que gera automaticamente **Certificados SSL autoassinados gratuitos**. | No navegador, digite `https://localhost` (testaremos isso no roteiro abaixo). |
| **8. Implementar logs de acesso** | Adicionamos um *Middleware* no backend (`@app.before_request`) que loga IP, rota, método e o tempo que a API levou para responder. | Veja os logs rodando `docker compose logs api`. |
| **9. Implementar logs de ações críticas** | Configuramos a geração de um arquivo super restrito `audit.log` (via pacote `logging`) para armazenar qualquer acesso negado ou tentativa de login na plataforma. | O arquivo será gerado na raiz ou lido via logs. Teste acessar `/api/auth/login` e observe o registro. |
| **10. Revisar permissões da aplicação** | Refizemos a configuração de rede do Docker. Nós bloqueamos o acesso direto do mundo externo às portas 80 (frontend) e 5001 (backend). O NGINX agora é a única entrada oficial. | Tente acessar `http://localhost:5173` ou `5001`. Deve falhar. |

---

## 🧪 Guia Prático de Homologação (Passo a Passo)

Para validarmos se todas essas blindagens funcionaram, siga estes 3 passos simples no seu terminal:

### Passo 1: Preparar o Docker e Iniciar os Ambientes
Para que os comandos abaixo funcionem, você precisa ter o "motor" do Docker ligado no seu computador.

> [!IMPORTANT]
> **Pré-requisito Vital:** Antes de digitar qualquer comando, certifique-se de abrir o aplicativo **Docker Desktop** no seu Windows (pesquise no Menu Iniciar). Aguarde até que o ícone dele mostre que o sistema está rodando (geralmente uma barra verde ou mensagem "Engine running"). Se você rodar o comando com ele fechado, receberá um erro de conexão do tipo `error during connect... open //./pipe/dockerDesktopLinuxEngine`.

Com o Docker Desktop aberto e rodando, abra o terminal na pasta do projeto e digite o comando abaixo para construir e ligar a nossa nova rede segura:
```bash
docker compose up --build -d
```
> *Aguarde o NGINX gerar o certificado OpenSSL e a API carregar os dados.*

### Passo 2: Validar a Blindagem de Rede e HTTPS (Requisitos 7 e 10)
Vamos testar se as portas antigas vulneráveis estão devidamente bloqueadas:
- ❌ **Bloqueio Frontend:** Tente acessar `http://localhost:5173`. A página não deve carregar.
- ❌ **Bloqueio Backend:** Tente acessar `http://localhost:5001/api/dashboard`. Não deve carregar.
- ✅ **Acesso Protegido HTTPS:** Acesse **`https://localhost`**.
  > *Lembrete: Como o certificado SSL é nosso (autoassinado grátis), o Chrome/Edge dirá que "A Conexão não é particular". Clique em **Avançado > Ir para localhost** para acessar seu dashboard com segurança local.*

### Passo 3: Validar os Logs de Acesso e Auditoria (Requisitos 8 e 9)
Enquanto você navega e clica pelo Dashboard seguro, os nossos logs estarão gravando. Volte ao terminal e digite:
```bash
# Para atestar que a API está registrando os acessos HTTP
docker compose logs api
```
*(Você verá logs novos no formato `[ACCESS] 192.168.0.x GET /api/dashboard ...` provando que o requisito 8 está ativo).*
