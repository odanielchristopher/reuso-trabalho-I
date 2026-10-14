# Trabalho 1 — Reuso de Software

Projeto acadêmico da disciplina de Reuso de Software da UFC. O trabalho analisa e refatora o **Homarr 0.16.0**, um dashboard para organizar aplicações e serviços de um servidor, com widgets e layout editável.

O objetivo é aplicar padrões GoF a problemas concretos, preservando funcionalidades e comparando a versão original com a refatorada. O projeto utiliza TypeScript, React, Next.js, SQLite/Drizzle, Zustand e Vitest. O sistema de origem é [ajnart/homarr](https://github.com/ajnart/homarr), sob licença MIT; as licenças existentes devem ser preservadas.

## Integrantes

1. Daniel Christopher Souza Rodrigues
2. Francisco Gustavo Martins de Sousa

## Organização

- `homarr/`: código original para comparação.
- `homarr-refactor/`: versão em que são aplicadas as refatorações e os testes de caracterização.
- `homarr-refactor/docs/reuso/`: diagnóstico, registro de validação e evidências disponíveis.

## Pré-requisitos

Os comandos abaixo são para Linux/macOS, executados em um terminal. Instale Git e **Node.js 22**. No ambiente de desenvolvimento foi utilizada a versão 22.23.3. Se utilizar nvm:

```sh
nvm install 22.23.3
nvm use 22.23.3
```

Use o **Yarn 3.6.0 incluído em cada aplicação**, sem depender de um Yarn global. Os comandos usam `node .yarn/releases/yarn-3.6.0.cjs`; execute-os dentro de `homarr-refactor` ou da cópia de execução da original, nunca na raiz `trabalho-I`.

Dependências nativas, como `better-sqlite3`, podem exigir Python 3, make e compilador C/C++ quando não houver binário compatível. Se aparecer erro de ABI após trocar Node, reinstale/recompile as dependências com a versão de Node escolhida.

## Instalar a versão refatorada e lidar com GridStack

A dependência original `fily-publish-gridstack@0.0.13` apresentou erro 404 no download do tarball. O checkout atual da versão refatorada contém o pacote em `vendor/fily-publish-gridstack` e o referencia assim:

```json
"fily-publish-gridstack": "file:./vendor/fily-publish-gridstack"
```

Essa cópia local evita depender do tarball ausente. Ela declara versão 0.0.13 e inclui os arquivos distribuídos e a licença; não foi auditada sua equivalência byte a byte com o tarball original. A recuperação da dependência é um ajuste de ambiente, não um padrão GoF. Não substitua por outra versão de GridStack sem avaliar compatibilidade.

A partir da raiz do repositório:

```sh
cd homarr-refactor
node .yarn/releases/yarn-3.6.0.cjs install
```

**Observação do checkout em 13/10/2026:** a conferência com `install --immutable` retornou YN0028 porque o hash da dependência local registrado no lockfile precisa ser atualizado. Por isso, o comando inicial acima permite atualizar o lockfile. Revise o diff de `yarn.lock`: mudanças esperadas são a resolução/hash/checksum do pacote local. Não atualize indiscriminadamente as versões das outras dependências. Após sincronizar e versionar o lockfile, as próximas instalações podem usar:

```sh
node .yarn/releases/yarn-3.6.0.cjs install --immutable
```

Se `vendor/fily-publish-gridstack` não existir, obtenha a cópia incluída neste repositório. Se o erro ainda mencionar `npm:0.0.13` ou a URL do tarball, confira se está na versão refatorada e se o manifesto aponta para `file:`. Não apague o lockfile como primeira tentativa.

A instalação limpa completa não foi comprovada na verificação realizada para este README; o teste de instalação imutável parou na divergência do lockfile. Outras dependências ainda precisam de acesso à rede.

## Configurar ambiente e banco

Dentro da aplicação escolhida, crie `.env` a partir do exemplo, caso ainda não exista:

```sh
cp -n .env.example .env
mkdir -p database
```

O exemplo configura `DATABASE_URL="file:./database/db.sqlite"`. Troque `NEXTAUTH_SECRET="anything"` por um segredo local gerado com:

```sh
openssl rand -base64 32
```

Copie o resultado para `NEXTAUTH_SECRET` no `.env`. Não publique esse arquivo nem credenciais no Git. Em seguida, aplique as migrações:

```sh
node .yarn/releases/yarn-3.6.0.cjs db:migrate
```

O comando altera o banco apontado por `DATABASE_URL`; faça backup antes se já houver dados pessoais. A configuração dos boards fica em `data/configs/`, separada do banco de usuários.

## Executar

Desenvolvimento:

```sh
node .yarn/releases/yarn-3.6.0.cjs dev --hostname 127.0.0.1
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000). Se a porta estiver ocupada, use a porta indicada pelo terminal ou escolha explicitamente outra:

```sh
node .yarn/releases/yarn-3.6.0.cjs dev --hostname 127.0.0.1 --port 3001
```

Em uma instalação nova, siga o onboarding da aplicação. Em um banco existente, utilize sua conta local. Algumas integrações e fontes de ícones dependem de serviços externos.

Para executar o build de produção, pare primeiro o servidor de desenvolvimento desta mesma pasta, evitando geração concorrente de artefatos em `.next`:

```sh
node .yarn/releases/yarn-3.6.0.cjs build
node .yarn/releases/yarn-3.6.0.cjs start --hostname 127.0.0.1 --port 3000
```

O script de build existente define um segredo temporário para a compilação; a execução deve utilizar o segredo configurado no ambiente. O build ignora lint pela configuração existente e não substitui as verificações independentes.

## Executar os testes

Na pasta da versão refatorada, suíte completa, sem modo de observação:

```sh
DATABASE_URL=:memory: node .yarn/releases/yarn-3.6.0.cjs test:run
```

Testes de caracterização de ícones:

```sh
DATABASE_URL=:memory: node .yarn/releases/yarn-3.6.0.cjs test:run src/tools/server/images/icon-repositories.spec.ts
```

Testes de caracterização de layout:

```sh
DATABASE_URL=:memory: node .yarn/releases/yarn-3.6.0.cjs test:run src/components/Dashboard/Wrappers/gridstack/gridstack-characterization.spec.tsx
```

Modo de observação:

```sh
DATABASE_URL=:memory: node .yarn/releases/yarn-3.6.0.cjs test
```

Os scripts de teste já definem `SKIP_ENV_VALIDATION=1`. Os 44 testes de caracterização foram criados antes das refatorações, organizados em Arrange–Act–Assert, e suas expectativas são mantidas para comparação. As execuções anteriores registraram **126 testes aprovados em 16 arquivos** na versão refatorada.

Os testes de layout simulam GridStack; os de ícones simulam HTTP/filesystem. Eles exercitam a integração programática e a transformação de dados, mas não comprovam drag-and-drop real, disponibilidade dos catálogos externos ou equivalência funcional completa. Consulte o registro de validação para cenários e limites.

Verificações adicionais:

```sh
node .yarn/releases/yarn-3.6.0.cjs typecheck
node .yarn/releases/yarn-3.6.0.cjs lint
```

Na linha de base foram registrados 15 erros de tipos em testes antigos e falha de configuração do lint. Não tratar o build bem-sucedido como aprovação dessas verificações. O estudante apresentou execução de build concluída com 64/64 páginas; a seleção visual dos ícones e a resposta vazia do catálogo Tabler ficaram pendentes na validação de Template Method.

## Executar a versão original sem alterar a referência

`homarr` mantém a dependência original do registro. Sua instalação pode falhar no tarball 404. Para comparar comportamento, use uma **cópia separada**, aplicando somente a recuperação da dependência nessa cópia. Os comandos abaixo partem da raiz do repositório e criam um diretório temporário:

```sh
original_run_dir=$(mktemp -d /tmp/homarr-original-run.XXXXXX)
cp -a homarr/. "$original_run_dir/"
mkdir -p "$original_run_dir/vendor"
cp -a homarr-refactor/vendor/fily-publish-gridstack "$original_run_dir/vendor/"
cd "$original_run_dir"
node - <<'JS'
const fs = require('fs');
const file = 'package.json';
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.dependencies['fily-publish-gridstack'] = 'file:./vendor/fily-publish-gridstack';
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
JS
node .yarn/releases/yarn-3.6.0.cjs install
```

Depois siga os passos de ambiente, migrações e execução acima dentro dessa cópia. Use banco próprio e outra porta para comparar as duas versões; não compartilhe um banco pessoal por engano. Os mesmos comandos de suíte completa funcionam na original, mas os novos arquivos de caracterização pertencem à versão refatorada. A suíte original tinha 82 testes em 14 arquivos na linha de base.

Esse procedimento adapta o ambiente da cópia de execução; não altera `homarr/` nem aplica as refatorações nela. Não foi feita instalação limpa dessa cópia durante a escrita deste README.

## Documentação e entrega

Consulte o [diagnóstico](homarr-refactor/docs/reuso/diagnostico-inicial.md), a [validação antes das refatorações](homarr-refactor/docs/reuso/validacao-antes-refatoracao.md) e a [pasta de evidências](homarr-refactor/docs/reuso/evidencias/). Preserve registros de decisões, trechos antes/depois, resultados e contribuições reais de estudante/IA.
