# Importação do histórico real

Import autenticado via Firebase Admin SDK, exclusivamente em `tenants/morada-credito/processes`. O CSV e as credenciais permanecem fora do repositório. Não usa localStorage, seed ou demoMode. O parser existente fornece conversão numérica, datas e cálculo da comissão ausente; valores manuais, inclusive zero, são preservados.

Instale as dependências com `bun install --frozen-lockfile`. Valide primeiro (não acessa Firestore nem consulta duplicatas):

```sh
npm run import:history -- --file '/caminho/fora/do/repositorio/historico.csv'
```

Após revisão, validação de qualidade e aprovação de produto sobre o acesso ao histórico sem `ownerUid` (restrito a OWNER/ADMIN), configure ADC com uma service account autorizada para o projeto de produção e execute com o ID do projeto explicitamente informado:

```sh
export GOOGLE_APPLICATION_CREDENTIALS='/caminho/seguro/service-account.json'
npm run import:history -- --file '/caminho/fora/do/repositorio/historico.csv' --project 'ID_DO_PROJETO' --database '(default)' --write
```

Use o database ID correto se o projeto usa um banco nomeado. O SDK respeita `FIRESTORE_EMULATOR_HOST`; remova essa variável para produção. Nunca registre credenciais ou conteúdo integral de registros no terminal. ADC também permite identidade de serviço sem arquivo de chave.

Sem `--write`, nenhuma gravação ocorre. O modo de gravação consulta cada ID e usa `create()` com precondição de inexistência, protegendo contra concorrência. Reexecuções pulam documentos existentes, sem atualização; o script não oferece sobrescrita. IDs usam `import_` mais a proposta com percent encoding (reversível e sem colisões por substituição de caracteres). Propostas iguais dentro do CSV também são puladas após a primeira criação.

Enums desconhecidos, inclusive banco, são rejeitados por linha, sem fallback. O relatório JSON inclui importados, duplicatas, linhas puladas, erros de enum por linha/campo, outros erros de validação/gravação e alertas de financiamento superior ao imóvel. Conteúdo de células desconhecidas e mensagens brutas de exceção são omitidos para evitar vazamento de PII. Erros resultam em exit code 1; registros válidos podem ser gravados mesmo quando outros são rejeitados. Alertas não bloqueiam. Linhas contam o cabeçalho como linha 1. CSV esperado: UTF-8 (BOM opcional), ponto-e-vírgula e um registro por linha; células entre aspas e aspas escapadas são aceitas, quebras de linha internas não.

O cabeçalho deve manter todas as 21 colunas do layout original, mesmo quando os valores de uma coluna forem vazios; apenas as colunas adicionais de cartório e protocolo RGI são opcionais. Confirme esse layout em cada exportação de produção. Os números devem vir sem separador de milhar e sem símbolo de moeda: por exemplo, `1200000,00` ou `1200000.00`, nunca `1.200.000,00` ou `R$ 500.000,00`.

Nenhum documento recebe `ownerUid`. As regras atuais usam OWNER/ADMIN/ANALYST e permitem leitura desses documentos a OWNER e ADMIN; ANALYST não pode ler nem editar esse histórico. O papel MANAGER não faz parte do modelo de acesso. O import não altera RBAC.

Decisão de produto confirmada: os 68 registros históricos sem `ownerUid` podem ser visualizados e editados somente por OWNER e ADMIN do tenant `morada-credito`. Nenhum ANALYST pode visualizar ou editar esses processos. O gate de governança está liberado.

Verificações:

```sh
npm run test:import
npm run typecheck:import
npm run lint
npm run build
```

Os testes usam apenas dados fictícios e um armazenamento em memória para verificar idempotência e concorrência. Não substituem os testes de integração no emulador ou em ambiente autorizado. A validação também deve verificar a regressão da importação pela UI, pois `src/utils/storage.ts` é compartilhado com o app.
