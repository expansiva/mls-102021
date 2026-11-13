/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/createRecebimento.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createRecebimento",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/recebimentoRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/recebimento.defs.ts",
    "_102047_/l4/compras/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createRecebimento",
    "entityId": "Recebimento",
    "operation": "create",
    "rulesApplied": [
      "quantidadeRecebidaPositiva",
      "recebimentoAtualizaSituacaoPedido",
      "recebimentoDaEntradaEstoque",
      "recebimentoNaoExcedeSaldo",
      "recebimentoSomentePedidoEmAberto"
    ],
    "effects": []
  }
} as const;

export default definition;
