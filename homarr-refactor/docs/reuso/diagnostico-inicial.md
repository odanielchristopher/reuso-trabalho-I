# Diagnóstico e linha de base — 12/10/2026

Este registro é preparatório para o Trabalho 1. Não é o relatório final. Os requisitos abaixo foram conferidos no enunciado do professor recebido em 12/10/2026; o template do relatório ainda não foi disponibilizado. Nenhuma refatoração de produção foi aplicada nesta etapa.

## Decisão e caracterização implementada — 12/10/2026

O estudante selecionou **Facade no GridStack**, **Command nas alterações dos itens** e **Template Method nos repositórios de ícones**. O quarto padrão GoF ainda não foi escolhido. Foram criados 44 testes de caracterização em AAA, sem mudanças de produção: 29 casos de layout/hook/store e 15 de ícones. Antes não havia testes específicos dessas responsabilidades.

A suíte completa passou com 126 testes em 16 arquivos; typecheck mantém 15 erros anteriores e nenhum nos novos testes. Os testes usam dependências já instaladas; a instalação limpa continua bloqueada pelo pacote GridStack indisponível. A validação no navegador abriu o board e exercitou edição/salvamento, mas encontrou divergência de geometria após recarregar. A configuração original foi restaurada. Não há aprovação de equivalência funcional completa.

Consulte [registro de caracterização](validacao-antes-refatoracao.md) para cenários, mocks, resultados, evidências, limitação de instalação, comportamento suspeito e casos ainda pendentes. As notas anteriores deste diagnóstico permanecem como histórico; afirmações de ausência de testes ou de navegador não executado referem-se à inspeção anterior a esta etapa.

## Origem e ambiente observado

- Homarr 0.16.0; HEAD `c5873c6e4`, merge da PR #2335. Remote `git@github.com:ajnart/homarr.git`. Esses dados locais sustentam a origem em projeto de terceiros; não verificamos o estado atual do repositório remoto.
- TypeScript 5.1.6, Next.js 13.5.11, React 18, Vitest 0.33.0 e happy-dom, conforme manifesto/configuração e execução local.
- Nenhum AGENTS.md encontrado no checkout ou nos diretórios ancestrais consultados.
- O terminal começou em Node 24.15.0, sem `yarn` no PATH. Há Node 22.23.3 instalado e Yarn 3.6.0 em `.yarn/releases/yarn-3.6.0.cjs`. Usar o Node 22 evita a incompatibilidade ABI do SQLite instalado.
- Alterações preexistentes preservadas: `data/configs/default.json`, `package.json`, `yarn.lock`, `vendor/` e `yarn-install.log`.
- A dependência GridStack já aponta para `file:./vendor/fily-publish-gridstack`. O pacote local declara 0.0.13 e contém dist, README e licença MIT. Isso confirma a recuperação local aplicada, não a procedência de cada arquivo ou a reprodução do download informado. Não reinstalamos nem atualizamos dependências. Tratar este ajuste separadamente dos padrões.
- Existe `.env`; seus valores não são reproduzidos neste registro.

Na inspeção inicial, não foram encontrados enunciado/template no diretório do trabalho. Posteriormente, o estudante disponibilizou o enunciado do professor, conferido na seção seguinte. O template e a informação sobre permissão de IA continuam sem confirmação documental.

## Requisitos conferidos no enunciado do professor

Fonte: [enunciado do professor](</home/odanielrodrigues/Faculdade/2026.2/reuso/trabalho-I/Trabalho 1 – Refatoração com Padrões de Projeto em Sistema Legado.pdf>). Documento da UFC, Campus Quixadá, QXD0068, Prof. Francisco Victor da Silva Pinheiro, quatro páginas.

### Exigências confirmadas

- Trabalho em dupla. O sistema deve ter complexidade suficiente para problemas e oportunidades reais e estar funcional antes das modificações (página 1).
- Selecionar **ao menos quatro padrões GoF**, com relação explícita problema → padrão → refatoração → benefício. Aplicações sem justificativa técnica, feitas apenas para cumprir quantidade, não são válidas (página 2).
- Documentar, para cada refatoração, problema, estrutura original, padrão, justificativa, alteração, estrutura resultante e benefícios. Preservar o comportamento original sempre que possível (página 2).
- Apresentar evidências de funcionamento das principais funcionalidades após as refatorações. O enunciado admite testes automatizados, existentes, novos casos ou demonstração documentada; não impõe uma ferramenta nem cobertura percentual (páginas 2–3).
- Comparar antes/depois quanto a acoplamento, coesão, duplicação, extensão, substituição, manutenção, organização e reutilização. Métricas quantitativas são opcionais, quando possíveis; benefícios devem ter evidência, mesmo sem métricas (página 3).
- Código em **repositório público no GitHub**, contendo versão original, versão refatorada, código, README com descrição, instruções de execução, integrantes e relatório PDF. Histórico Git deve mostrar evolução; branches/tags/releases são recomendados para distinguir versões, não um formato obrigatório (página 3).
- Relatório com **mínimo de oito páginas** (página 3).
- Apresentação presencial de **oito minutos por dupla**, com problemas, código original, escolhas/justificativas, principais refatorações, comparação e benefícios. Ambos devem demonstrar domínio do código e dos padrões (página 4).
- Entrega **e apresentação em 14/10/2026**. PDF anexado ao repositório e entregue também pelo ambiente definido na disciplina (página 4).

### Conteúdo exigido do relatório

O enunciado enumera estes dez tópicos; esta lista não pretende reproduzir um template ainda não recebido:

1. Introdução e descrição do sistema escolhido.
2. Estrutura e funcionamento geral do sistema.
3. Problemas identificados antes da refatoração.
4. Oportunidades de reutilização encontradas.
5. Padrões selecionados e justificativas.
6. Refatorações realizadas.
7. Comparação do código ou estrutura antes/depois.
8. Validação das funcionalidades.
9. Análise dos ganhos de reutilização, manutenção e extensibilidade.
10. Conclusão.

Diagramas simplificados, código e outras representações devem ser usados quando pertinentes. A síntese por padrão em problema/padrão/justificativa/benefício é recomendada; não deve substituir a análise.

### Ajustes ao contexto inicial e consequências para o plano

**Origem do sistema:** o enunciado permite projeto acadêmico anterior, open source pequeno/médio ou sistema do professor. Portanto, a proibição de trabalho próprio não consta deste PDF. A escolha de um projeto de terceiros permanece a restrição/preferência informada pelo estudante, ou possível orientação adicional ainda não documentada. Não é motivo para trocar o Homarr.

**IA:** o PDF não menciona permissão, proibição ou forma de declaração de uso de IA. A permissão relatada pelo estudante permanece informação de outra origem. Manter o registro transparente do uso efetivo, como solicitado, sem atribuir essa exigência ao PDF.

**Template:** o mínimo de quatro padrões e oito páginas está confirmado no enunciado; a alegação de três padrões no template continua pendente da leitura desse outro documento. O PDF não decide explicitamente se ampliar um padrão preexistente, como Template Method dos ícones, conta como uma nova aplicação. Exigir mudança concreta e benefício demonstrável; não contar apenas reconhecimento do padrão já presente.

**Funcionalidade anterior às mudanças:** os 82 testes aprovados e o build aprovado são evidências parciais. Ainda falta executar/documentar as funcionalidades principais no navegador antes das refatorações, especialmente o layout, e caracterizar as integrações afetadas. O enunciado não exige testes de caracterização nominalmente: essa é nossa escolha metodológica para sustentar equivalência.

**Publicação e marcos:** o remote atual aponta ao repositório original, e as alterações de recuperação já estão na árvore local. Antes da implementação, organizar um repositório da dupla e marcos claros para código original, ajuste de execução e refatorações, sem apagar alterações existentes. Repositório público é exigência da entrega, não uma instrução nesta mensagem para publicar arquivos agora. Não publicar .env, bancos, configurações pessoais ou logs sensíveis junto às evidências.

**Escolha dos quatro:** priorizar problemas concretos e escopo validável. Template Method é alternativa sob avaliação, não quarto padrão aprovado. As aplicações repetidas de Strategy/Adapter em outros domínios não representam tipos adicionais de padrão.

## Verificações executadas

Os logs estão em `evidencias/`. As execuções ocorreram antes de qualquer mudança em código de produção.

1. Node 24, `DATABASE_URL=:memory: node .yarn/releases/yarn-3.6.0.cjs test:run`: código 1; 10 arquivos passaram, quatro falharam na coleta; 63 testes passaram. O módulo better-sqlite3 exige ABI 127, enquanto Node 24 exige 137. Não é evidência de regressão funcional do Homarr.
2. Node 22.23.3, mesmo comando e banco em memória: 14 arquivos e 82 testes passaram. Não exercita serviços externos reais ou drag-and-drop.
3. `typecheck`: 15 diagnósticos, também presentes com Node 22. Três campos ausentes em `Partial<User>` nos testes de convites; cinco chamadas sem argumento nos testes Pi-hole; sete configurações incompletas nos testes TorrentTile. Não corrigidos nesta etapa.
4. `lint`: código 1, antes de analisar o código, por `eslintConfig.ignoreDuringBuilds` inválido no package.json. A opção também existe no local adequado em next.config.js. Correção futura deve ser separada dos padrões.
5. `git diff --check`: passou para as mudanças rastreadas existentes.
6. Node 22, `NEXT_TELEMETRY_DISABLED=1 DATABASE_URL=file:/tmp/homarr-baseline.sqlite node .yarn/releases/yarn-3.6.0.cjs build`: primeira execução falhou com EPERM na porta interna do Next.js durante coleta de páginas. Repetição autorizada fora do sandbox terminou com código 0. Há avisos de compilação/Edge Runtime, Browserslist desatualizado e chamadas de sessão NextAuth sem servidor em localhost:3000 durante geração. O build ignora lint pela configuração do projeto; não torna o lint/typecheck independentes aprovados.

Não iniciamos `dev` nem exercitamos o dashboard no navegador nesta etapa. O build aprovado não comprova o comportamento interativo. A validação manual antes/depois permanece parte obrigatória do plano de layout.

Comando reproduzível para os testes aprovados:

```sh
PATH=/home/odanielrodrigues/.nvm/versions/node/v22.23.3/bin:$PATH DATABASE_URL=:memory: node .yarn/releases/yarn-3.6.0.cjs test:run
```

`db:migrate` não foi aplicado ao banco do estudante. Cobertura não foi executada; nenhum percentual é afirmado. Novos testes de caracterização ainda devem ser escritos antes da primeira refatoração.

## Evidências e candidatos

### Strategy — candidato forte

`src/server/api/routers/download.ts:78`, `GetDataFromClient`, concentra cinco casos em um switch. `reduceTorrent` já reutiliza `AllClientData` nas três bibliotecas torrent. A rota `downloadRouter.get` coordena consulta concorrente e falhas parciais; não precisa conhecer a implementação dos clientes.

Proposta: contrato de consulta por app retornando `NormalizedDownloadAppStat`, estratégias por integração e seleção por registro tipado. Manter normalização torrent compartilhada; funções/objetos TypeScript podem implementar Strategy sem cinco classes vazias. A seleção continuará existindo, mas nova integração deverá entrar no registro e implementação, sem alterar a coordenação de falhas da rota. Demonstrar isso por dependências e testes, não por redução artificial de linhas.

Alternativa: apenas extrair cada caso em funções. É suficiente se não houver um contrato intercambiável consumido pelo contexto. Não chamar uma coleção de funções desconectadas de Strategy.

Caracterizar: cada integração, parâmetros de construção, totais torrent, campos preservados, fila vazia, integração desconhecida omitida, uma falha sem eliminar os sucessos e inclusão do ID em failedApps. A ordem de failedApps depende da resolução das consultas; não prometer ordenação por configuração.

### Adapter — candidato forte e independente

`download.ts:142/173` e `usenet/router.ts:272` repetem construção dos clientes, conversão da fila, tamanhos, progresso e ETA. A rota Usenet também converte callbacks em Promises em info, history, pause e resume. `NzbgetClient` já valida opções e instancia a biblioteca, mas não adapta suas operações nem formatos.

Proposta: adaptadores SABnzbd/NZBGet com operações orientadas às necessidades do Homarr, incluindo consulta, histórico e pause/resume quando necessário. Reutilizar tradução nas duas rotas. Strategy escolhe o comportamento; Adapter esconde assinaturas e representações externas. Não criar adaptadores torrent apenas para aumentar a contagem: AllClientData já fornece um contrato comum.

Preservar diferenças reais das rotas: SABnzbd usa paginação e noofslots; NZBGet atualmente retorna todos os grupos e total pelo tamanho do array. A chave SAB ausente é aceita como string vazia em download e rejeitada na rota Usenet. Os erros TRPC e validação pertencem à fronteira das rotas; não uniformizá-los silenciosamente.

Caracterizar também callbacks com erro/resultado ausente, rejeição nas rotas, argumentos de pauseDownload(false), queuePause/queueResume, conversão de horário e parâmetros de paginação.

### Facade — candidato forte, aproveitando o que já existe

`gridstack/init-gridstack.ts:7`, `initializeGridstack`, já centraliza inicialização, colunas, eventos, batching, DOM e inclusão de apps/widgets. Isso é uma abstração existente; apenas renomeá-la não demonstra uma nova aplicação útil de Facade.

`gridstack/use-gridstack.ts` ainda coordena dimensões, refs/tipos GridStack e desligamento dos eventos. `WrapperContent.tsx` também conhece o tipo GridStack. Proposta: fachada que realmente reúna operações de layout e assinatura/liberação dos eventos, com eventos próprios do Homarr e estado explícito de edição. Hook continua com useEffect, refs e ciclo de vida React; decisões sobre a configuração não entram na fachada.

Caracterizar opções sidebar/wrapper/category, atributos gs-x/y/w/h, inclusão de apps e widgets, posições desconhecidas, ordem de batching, callbacks e cleanup. Testes com biblioteca simulada verificam a integração programática; validação real no navegador deve mover, redimensionar, transferir e alternar edição nos tamanhos de tela relevantes.

### Command — candidato condicionado a reuso real

`use-gridstack.ts:91/145`, onChange/onAdd, combinam leitura do DOM, seleção do item e alteração de shape/area. Repetem reconstrução dos arrays de apps/widgets. Há outro emissor concreto: `Modals/ChangePosition/ChangeAppPositionModal.tsx:25` e `ChangeWidgetPositionModal.tsx:24` atualizam posição/dimensões via formulário.

Isso fortalece a proposta: comandos com dados próprios (tipo, ID, tamanho de tela, geometria e área quando aplicável), contrato de execução comum e receptor de configuração, invocados por eventos e formulários. Separar obtenção dos dados do evento da aplicação da ação. Não adicionar histórico ou desfazer/refazer.

Alternativa mais simples: funções puras compartilhadas. Se a implementação terminar apenas em duas funções chamadas diretamente por um handler, o benefício de Command pode não compensar o custo e não deve ser contado automaticamente. Avaliar o segundo emissor antes de decidir; não afirmar quatro padrões aprovados agora.

Caracterizar item correto, ID ausente/inexistente, apps/widgets, preservação dos demais itens e shapes, mudança de área sidebar/categoria/wrapper e regra de regeneração. Hoje o item alterado vai para o fim do array: preservar ou registrar explicitamente uma correção separada.

## Outras oportunidades GoF — inspeção adicional em 12/10/2026

Esta seção amplia as opções, não aprova sua implementação. As evidências são de leitura do checkout; benefícios, equivalência funcional e desempenho ainda não foram demonstrados. Uma segunda aplicação de Strategy ou Adapter continua sendo o mesmo tipo de padrão e não aumenta a quantidade de padrões distintos do trabalho.

### 1. Template Method — ampliar o fluxo dos repositórios de ícones

**Prioridade: alta para avaliação como alternativa ao Command.** Arquivos: `src/tools/server/images/abstract-icons-repository.ts`, `github-icons-repository.ts`, `jsdelivr-icons-repository.ts` e `unpkg-icons-repository.ts`.

**Observação:** `AbstractIconRepository.fetch` já define um algoritmo comum de executar `fetchInternally`, capturar exceção, registrar falha e devolver resultado normalizado. Portanto, há um Template Method existente, com método abstrato como ponto de extensão. As implementações remotas ainda repetem consulta HTTP, leitura de JSON, seleção/transformação das entradas e montagem de `{ entries, count, success, name, copyright }`. GitHub e jsDelivr repetem especialmente seleção de extensões, remoção de banners/logos, extração do nome e substituição de partes da URL.

**Proposta:** manter a base atual e avaliar uma base específica para fontes remotas que fixe a sequência consulta → leitura → seleção/normalização → resultado, deixando etapas variáveis em métodos protegidos. GitHub/jsDelivr/unpkg forneceriam interpretação de seus formatos, filtros e construção de URLs. LocalIconsRepository continuaria com seu fluxo de filesystem. Não impor uma consulta HTTP à fonte local.

**Participantes:** base remota com método template; subclasses como implementações das etapas; `iconRouter.all` e consulta de containers como clientes. O cliente não precisa conhecer a sequência interna de cada fonte.

**Alternativa:** extrair uma função de montagem do resultado e utilitários de arquivos/URLs. Se só essa extração tiver valor e não houver sequência comum suficiente, preferi-la; não ampliar a hierarquia para justificar o nome do padrão.

**Validação antes/depois:** resposta vazia; erro de rede/JSON; filtros específicos de cada fonte; ordem SVG antes de PNG exclusiva do GitHub; tamanhos e copyright; nomes e URLs; falha devolvendo name vazio como hoje; fonte local ausente. Mockar fetch/fs e executar os métodos reais. Caracterizar o comportamento HTTP atual: as implementações não verificam response.ok explicitamente; acrescentar essa verificação seria uma mudança a avaliar separadamente.

**Benefício esperado e custo:** reduzir montagem e sequência repetidas, deixando visíveis as diferenças entre fontes. Custo: herança adicional e risco de abstrair formatos diferentes em excesso. É uma ampliação de padrão preexistente, não descoberta de ausência total de Template Method. Confirmar no enunciado se essa modalidade atende ao requisito de aplicação.

### Seleção recomendada para a próxima discussão

A primeira alternativa de **tipo distinto** a investigar é Template Method nos ícones: há repetição concreta e testes determinísticos possíveis sem serviços reais. A ressalva é que o padrão já existe parcialmente; a mudança precisa ampliar seu valor e atender ao enunciado. Strategy/Adapter de DNS e mídia, e Facade de Prowlarr, são opções para substituir o domínio escolhido, não para aumentar a contagem de padrões distintos. Singleton existente e Proxy condicionado não são boas escolhas para fechar a exigência acadêmica neste momento.

Não recomendo State apenas para substituir os switches de status visual, Builder apenas para montar objetos de configuração, nem Factory Method apenas para mover um switch de construção a uma função: não foi identificado nesta inspeção um motivo suficiente que compense essas abstrações. Uma fábrica simples por registro pode ajudar as estratégias, mas não é automaticamente Factory Method GoF, cujo ponto de criação é redefinido por subclasses. Composite, Observer e Chain of Responsibility também não são justificados somente pela presença de árvore React, callbacks ou middleware tRPC.

Para qualquer alternativa escolhida: criar caracterização antes da mudança, registrar participantes e colaboração, manter cenários/expectativas depois e documentar custos. Nenhuma destas propostas foi implementada ou validada funcionalmente nesta inspeção adicional.

## Comportamentos suspeitos — não corrigidos

- SABnzbd: download usa kbpersec × 1024; Usenet info usa × 1000. Também há MB decimal na fila e × 1024² em sizeLeft. São inconsistências observáveis; determinar intenção/unidade real antes de corrigir.
- `getNzbgetState` duplicado reconhece `'PAUSED '` com espaço final. `'PAUSED'` cai em downloading. Caracterizar os dois valores; a resposta externa real ainda não foi verificada.
- Divisão por DownloadRate ou FileSizeMB zero pode produzir Infinity/NaN. Não substituir por zero sem registrar mudança de comportamento.
- A inicialização GridStack encaminha somente `nodes.at(0)` para change/added. Eventos com vários nós podem perder atualizações. Efeito funcional ainda não reproduzido no navegador.
- O efeito de inicialização não depende explicitamente de isEditMode/shapeSize e cleanup apenas remove eventos. Investigar alternância de edição e liberação sem assumir que destroy é obrigatório ou seguro para DOM gerenciado por React.
- Os handlers atualizam a store sem solicitar salvamento em arquivo; updateConfig tem esse comportamento opcional. `components/layout/Templates/BoardLayout.tsx:125`, ToggleEditModeButton, salva via config.save ao sair da edição pelo fluxo save. Este caminho precisa ser exercitado e recarregado no navegador; não confundir memória com persistência. O atalho mod+E chama toggleEditMode diretamente: investigar se também preserva o salvamento esperado.

## Plano incremental proposto

1. Fixar Node 22 para execução e guardar esta linha de base. Enunciado conferido; obter o template e registrar a origem da orientação sobre IA quando disponíveis. Documentar funcionamento anterior no navegador e organizar os marcos Git/entregáveis exigidos. Ajustes de execução/lint/testes antigos ficam em mudanças separadas, caso sejam escolhidos.
2. Escrever testes de caracterização das rotas reais com clientes/configuração externos simulados; manter coordenação, normalização e handlers reais. Mock de sessão/banco na fronteira quando necessário, sem substituir a rota por uma implementação falsa. Registrar bugs como comportamento atual, sem expectativas silenciosamente corrigidas.
3. Discutir e aplicar Strategy; repetir os mesmos cenários e expectativas. Adaptar apenas montagem quando necessária. Registrar participantes, custos e benefício demonstrado.
4. Discutir e aplicar Adapter; reutilizar os testes anteriores e ampliar apenas operações ainda não cobertas. Preservar diferenças de paginação, unidades e erros até decisão separada sobre bugs.
5. Caracterizar integração GridStack/hook/store, obter evidência de navegador antes das mudanças de layout e discutir Facade. Repetir cenários após a mudança, incluindo salvar/recarregar uma configuração de teste.
6. Decidir Command com os emissores evento/formulário. Se a extração simples vencer, procurar outro candidato no código com evidência e discutir antes de implementar. Não inventar um quarto padrão para fechar a contagem.

Critério de avanço: cenários afetados passam com expectativas preservadas, diff de produção delimitado, falhas globais anteriores discriminadas, resultados de navegador separados dos mocks. Build e typecheck não substituem evidência funcional. Não há melhoria de desempenho ou métricas de manutenção comprovadas nesta etapa.

## Participação efetiva da IA nesta etapa

A IA leu a solicitação, inspecionou código/Git/configurações, executou verificações, diagnosticou a incompatibilidade de Node, avaliou candidatos e alternativas e redigiu este registro/plano. Na ampliação solicitada, inspecionou ícones, DNS, mídia, Prowlarr e Docker, distinguiu padrões preexistentes de oportunidades e acrescentou propostas e critérios de validação. Após receber o enunciado, conferiu requisitos e corrigiu a distinção entre exigências do professor e orientações do estudante. Nenhum novo teste/build foi executado nessas ampliações documentais. O estudante forneceu contexto e propostas iniciais. A dupla ainda não confirmou escolhas finais ou validação manual; não atribuir isso a ela. Não houve implementação dos padrões, novos testes ou revisão do relatório final nesta etapa.
