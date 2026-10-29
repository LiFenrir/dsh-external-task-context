# Contexto de tarefas externas (dsh-external-task-context)

Veja na barra lateral direita do DSH Web o prompt de delegação, o contexto de execução e o resultado retornado pelas tarefas de subagentes externos (Claude Code, Codex, ACP).

## Features and location

- **Botão no cabeçalho da sessão**: quando a sessão atual tem tarefas externas registradas, aparece o botão «Tarefas externas N»; ao clicar, a página do plugin abre na barra lateral direita (em um painel novo quando há espaço).
- **Painel lateral**: a coluna esquerda lista as tarefas externas (rótulo ou id curto, status, hora de início); a direita mostra a tarefa selecionada. A mais recente é selecionada por padrão; uma seleção explícita é mantida enquanto a tarefa existir.
- **Detalhes**: status, horários de início e término, nome da ferramenta, prompt de delegação, diretório de trabalho, provedor/modelo/esforço de raciocínio/preset, conteúdo retornado e resumo de encerramento. Textos acima de 64 KiB são truncados com um aviso localizado.

## Data sources

Tudo o que é exibido já está registrado no **log da sessão pai**; o plugin não adiciona eventos de sessão nem altera o comportamento visível ao modelo:

1. `tool/call`: o JSON de argumentos da ferramenta de delegação; `description` é o rótulo do catálogo e `prompt` a tarefa delegada, com `cwd`, `provider`, `model`, `reasoning_effort` e `agent_preset` opcionais.
2. `subagent/catalog` v2: estabelece o id estável do filho externo.
3. Um `user/message` posterior com `source.kind === 'subagent-settled'`: o resumo de encerramento e o texto final do filho, mais um diagnóstico opcional.

O host dobra esses eventos na projeção `externalTaskContexts`; o cliente apenas lê essa projeção.

## Known limitations

Provedores externos executam em outro processo e o DSH não persiste seus passos internos nem suas chamadas de ferramentas; um filho externo não tem sessão local nem transcrição. Por isso este plugin só pode mostrar o contexto de delegação e o resultado retornado, nunca o contexto privado do agente externo, seu raciocínio interno ou a cadeia completa de ferramentas. Em `0.2.1-rc.2`, o provedor Claude Code usa `persistSession: false`.

Além disso, a correspondência por rótulo só é aplicada quando é inequívoca; no máximo as 20 delegações sem par mais recentes são mantidas; e eventos herdados por fork (`seq < inheritedEventCount`) não são atribuídos à sessão atual.

## Installation

Requer DSH `0.2.2-alpha.2` ou mais recente e Node `^22.19 || >=24`.

### Via npm

```sh
dsh plugin add @lifenrir/dsh-external-task-context
```

### Via git

```sh
dsh plugin add git+https://github.com/LiFenrir/dsh-external-task-context.git
```

### Via diretório local

```sh
git clone https://github.com/LiFenrir/dsh-external-task-context.git
cd dsh-external-task-context
pnpm install
pnpm run build
dsh plugin add /caminho/absoluto/para/dsh-external-task-context
```

A compilação local gera `lib/index.js` (host) e `lib/client.js` (cliente web).

Depois, habilite o bundle nesse perfil. Reinicie o aplicativo ou reabra a sessão para carregar a projeção do host e o bundle do cliente.

## Usage

1. Peça ao modelo que delegue trabalho por uma ferramenta de subagente externo.
2. Quando a delegação aparecer, clique no botão «Tarefas externas» no cabeçalho.
3. Escolha uma tarefa à esquerda para ver o prompt, o contexto e o resultado.

## Privacy

A projeção é persistida com o cache de projeções da sessão, portanto o prompt e o resultado são armazenados uma segunda vez fora do log da sessão. Trate-os com a mesma sensibilidade em ambientes compartilhados ou ao exportar uma sessão.
