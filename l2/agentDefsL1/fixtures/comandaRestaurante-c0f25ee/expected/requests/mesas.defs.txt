/// <mls fileReference="_102047_/l1/comandaRestaurante/layer_2_application/requests/mesas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "mesas",
  "moduleName": "comandaRestaurante",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/createMesa.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listMesa.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/updateMesa.defs.ts"
  ],
  "data": {
    "pageId": "mesas",
    "requests": [
      {
        "route": "comandaRestaurante.mesas.carregarMesas",
        "kind": "qry",
        "uses": [
          "listMesa"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "mesas",
            "entity": "Mesa",
            "items": "",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "code",
                "path": "code"
              },
              {
                "field": "details.disponivel",
                "path": "details.disponivel"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega as mesas da casa para o caixa consultar seus códigos, conferir a disponibilidade e selecionar uma mesa para manutenção.\nEntrada: Não recebe parâmetros; considera o escopo organizacional autorizado para o caixa.\nProcessamento: Obtém as mesas visíveis ao caixa e as ordena pelo código. Para cada mesa, compõe identificador, versão, código e disponibilidade. A disponibilidade é derivada pela inexistência de comanda aberta vinculada e é calculada nesta consulta, sem ser gravada. A lista representa o conjunto físico de mesas da casa e é carregada integralmente, sem paginação.\nSaída: Retorna as mesas no formato consumido pela lista e pelo formulário selecionado. A versão acompanha cada registro para permitir atualização concorrente segura.",
          "purpose": "Carrega as mesas da casa para o caixa consultar seus códigos, conferir a disponibilidade e selecionar uma mesa para manutenção.",
          "input": "Não recebe parâmetros; considera o escopo organizacional autorizado para o caixa.",
          "processing": "Obtém as mesas visíveis ao caixa e as ordena pelo código. Para cada mesa, compõe identificador, versão, código e disponibilidade. A disponibilidade é derivada pela inexistência de comanda aberta vinculada e é calculada nesta consulta, sem ser gravada. A lista representa o conjunto físico de mesas da casa e é carregada integralmente, sem paginação.",
          "output": "Retorna as mesas no formato consumido pela lista e pelo formulário selecionado. A versão acompanha cada registro para permitir atualização concorrente segura."
        }
      },
      {
        "route": "comandaRestaurante.mesas.criarMesa",
        "kind": "cmd",
        "uses": [
          "createMesa"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "mesa",
            "entity": "Mesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "code",
                "path": "code"
              },
              {
                "field": "details.disponivel",
                "path": "details.disponivel"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Cadastra uma mesa para a operação do restaurante e devolve seu estado completo para redesenhar a página.\nEntrada: code é o código da nova mesa informado pelo caixa.\nProcessamento: Cria a mesa com o código recebido, aplicando as validações de criação e a unicidade do código no repositório. Depois compõe o identificador, a versão, o código e a disponibilidade. A disponibilidade é derivada da inexistência de comanda aberta vinculada, é calculada no retorno e não é gravada pelo comando.\nSaída: Retorna a mesa criada no formato usado pela lista e pelo formulário, permitindo inseri-la na lista sem uma segunda chamada.",
          "purpose": "Cadastra uma mesa para a operação do restaurante e devolve seu estado completo para redesenhar a página.",
          "input": "code é o código da nova mesa informado pelo caixa.",
          "processing": "Cria a mesa com o código recebido, aplicando as validações de criação e a unicidade do código no repositório. Depois compõe o identificador, a versão, o código e a disponibilidade. A disponibilidade é derivada da inexistência de comanda aberta vinculada, é calculada no retorno e não é gravada pelo comando.",
          "output": "Retorna a mesa criada no formato usado pela lista e pelo formulário, permitindo inseri-la na lista sem uma segunda chamada."
        }
      },
      {
        "route": "comandaRestaurante.mesas.atualizarMesa",
        "kind": "cmd",
        "uses": [
          "updateMesa"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "mesa",
            "entity": "Mesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "code",
                "path": "code"
              },
              {
                "field": "details.disponivel",
                "path": "details.disponivel"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Atualiza o código da mesa selecionada e devolve seu estado completo e corrente para redesenhar a página.\nEntrada: id identifica a mesa selecionada, version protege a gravação contra atualização concorrente e code é o código informado pelo caixa.\nProcessamento: Localiza a mesa pelo identificador, confere a versão recebida e atualiza seu código, aplicando as validações de manutenção e a unicidade do código. Em seguida compõe o identificador, a nova versão, o código e a disponibilidade derivada. A disponibilidade é calculada pela inexistência de comanda aberta vinculada e não é armazenada por este comando.\nSaída: Retorna a mesa atualizada no formato da lista e do formulário, permitindo atualizar a linha e manter a versão corrente sem nova consulta.",
          "purpose": "Atualiza o código da mesa selecionada e devolve seu estado completo e corrente para redesenhar a página.",
          "input": "id identifica a mesa selecionada, version protege a gravação contra atualização concorrente e code é o código informado pelo caixa.",
          "processing": "Localiza a mesa pelo identificador, confere a versão recebida e atualiza seu código, aplicando as validações de manutenção e a unicidade do código. Em seguida compõe o identificador, a nova versão, o código e a disponibilidade derivada. A disponibilidade é calculada pela inexistência de comanda aberta vinculada e não é armazenada por este comando.",
          "output": "Retorna a mesa atualizada no formato da lista e do formulário, permitindo atualizar a linha e manter a versão corrente sem nova consulta."
        }
      }
    ]
  }
} as const;

export default definition;
