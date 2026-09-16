# Auditoria LGPD — v1

## Eventos e acesso

`auditLog` é uma coleção raiz, somente de inserção para clientes. As regras exigem `actorUid == request.auth.uid`, `timestamp == request.time`, campos permitidos e pares action/outcome válidos. Somente os dois e-mails de `MORADA_OPERATOR_EMAILS`, com e-mail verificado no Firebase Auth, podem ler os eventos. O helper `isMoradaOperator()` é utilizado exclusivamente em `auditLog`; ele não concede acesso a tenants, processos ou perfis.

Uma negação só gera `ACCESS_DENIED_CROSS_TENANT` quando o perfil do próprio ator permite confirmar que o tenant alvo é diferente do seu. Negações RBAC no mesmo tenant, perfis não resolvidos e outros erros não recebem essa classificação. O UID é capturado no início da operação; eventos de uma sessão encerrada não são atribuídos à conta seguinte.

O salvamento de um processo pela tela de edição registra alterações de CPF e de ownerUid após confirmação do Firestore. As exportações CSV/JSON, tanto na navegação quanto na gestão de dados, registram `EXPORT_DATA` com `resourceId: 'ALL'` após disparar o download. O navegador não informa se o arquivo foi efetivamente salvo em disco. Importações, sincronizações em lote e download interno do Firestore não são gatilhos de ação sensível nesta v1.

O payload é construído campo a campo: não recebe o processo completo, valores antigos/novos nem mensagens de erro. Para processos, `resourceId` recebe apenas o ID do documento; operações sem um único documento usam string vazia (ou `ALL` nas exportações). Nomes, CPF, telefone e e-mail do processo não são enviados.

## Limites da auditoria pelo cliente

Uma aplicação modificada pode omitir eventos ou inventar action, targetTenantId, actorRole e resourceId. As regras impedem atribuir a entrada a outro UID, alterar/apagar logs e adicionar campos fora do schema; elas não comprovam que a ação aconteceu nem detectam PII deliberadamente colocada em uma string de metadados. A escrita da ação e do log também não é atômica. Esses limites exigem evolução no servidor para uma trilha autoritativa; a v1 registra os fluxos instrumentados do app. Falhas de auditoria não desfazem ações já concluídas.

## Retenção

A retenção aprovada é de 12 meses. A v1 não ativa a política TTL nativa: exclusões TTL exigem billing habilitado no projeto Firebase. Por decisão de produto, o billing não foi habilitado nesta entrega. Portanto, a expiração **não é automática**. Um operador deve executar a limpeza periodicamente até que uma política nativa seja aprovada e ativada.

O script usa o campo `timestamp` do servidor, calcula o corte de 12 meses e não imprime documentos nem dados pessoais. Ele consulta somente a coleção raiz `auditLog`. O modo padrão apenas conta os documentos vencidos:

```sh
GOOGLE_APPLICATION_CREDENTIALS='/caminho/seguro/service-account.json' npm run prune:audit -- --project morada-credito-crm --database '(default)'
```

Depois de revisar o total e obter autorização para excluir, execute o mesmo comando com `--write`. O script remove somente documentos cujo `timestamp` é anterior ao corte. Não o agende sem aprovação operacional.

Quando billing e TTL forem aprovados, a política nativa pode usar `auditLog.timestamp` com offset de retenção. A configuração exige permissão `datastore.indexes.update` e deve ser feita no banco `(default)` do projeto `morada-credito-crm`. A exclusão pelo TTL não é imediata após o vencimento.

Referências: [políticas TTL](https://firebase.google.com/docs/firestore/ttl) e [exigência de billing para exclusões TTL](https://firebase.google.com/docs/firestore/quotas).
