/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/requests/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "pacientes",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts"
  ],
  "data": {
    "pageId": "pacientes",
    "requests": [
      {
        "route": "agendaClinica.pacientes.loadPatients",
        "kind": "qry",
        "uses": [
          "listPaciente",
          "getPaciente"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "patients.items.details",
            "reason": "DISCLOSURE: Route agendaClinica.pacientes.loadPatients projects items.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "list",
            "path": "patients",
            "entity": "Paciente",
            "items": "items",
            "page": "patients.page",
            "pageSize": "patients.pageSize",
            "hasMore": "patients.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "patients.items.details.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "patients.details.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "patients",
            "pages": "patients"
          },
          {
            "name": "pageSize",
            "target": "patients",
            "pages": "patients"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Inicializa a área de localização de pacientes sem trazer cadastros antes de a recepcionista informar um nome.\nEntrada: page e pageSize definem a primeira janela da lista. Como a página abriu sem critério de nome, não há termo de busca.\nProcessamento: Prepara a lista paginada em estado vazio quando não há busca nominal. Não consulta nem transfere todos os pacientes; a localização é feita sob demanda por searchPatients.\nSaída: Retorna patients no contrato paginado para alimentar a lista em estado inicial, preservando a mesma estrutura usada pela busca.",
          "purpose": "Inicializa a área de localização de pacientes sem trazer cadastros antes de a recepcionista informar um nome.",
          "input": "page e pageSize definem a primeira janela da lista. Como a página abriu sem critério de nome, não há termo de busca.",
          "processing": "Prepara a lista paginada em estado vazio quando não há busca nominal. Não consulta nem transfere todos os pacientes; a localização é feita sob demanda por searchPatients.",
          "output": "Retorna patients no contrato paginado para alimentar a lista em estado inicial, preservando a mesma estrutura usada pela busca."
        }
      },
      {
        "route": "agendaClinica.pacientes.searchPatients",
        "kind": "qry",
        "uses": [
          "listPaciente",
          "getPaciente"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "patients.items.details",
            "reason": "DISCLOSURE: Route agendaClinica.pacientes.searchPatients projects items.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "list",
            "path": "patients",
            "entity": "Paciente",
            "items": "items",
            "page": "patients.page",
            "pageSize": "patients.pageSize",
            "hasMore": "patients.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "patients.items.details.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "patients.details.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "patients",
            "pages": "patients"
          },
          {
            "name": "pageSize",
            "target": "patients",
            "pages": "patients"
          },
          {
            "name": "nameSearch",
            "target": "patients",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Localiza pacientes pelo nome para a recepcionista escolher quem seguirá para o agendamento.\nEntrada: nameSearch é o nome informado pela recepcionista; page e pageSize definem a janela solicitada dos resultados.\nProcessamento: Pesquisa Paciente pelo índice de nome, aplica o termo informado e retorna somente a página solicitada. Compõe cada resultado com identificador, nome, situação e número de documento, sem carregar a ficha completa.\nSaída: Retorna patients paginado, já no formato compacto que a lista apresenta para identificar e selecionar um paciente.",
          "purpose": "Localiza pacientes pelo nome para a recepcionista escolher quem seguirá para o agendamento.",
          "input": "nameSearch é o nome informado pela recepcionista; page e pageSize definem a janela solicitada dos resultados.",
          "processing": "Pesquisa Paciente pelo índice de nome, aplica o termo informado e retorna somente a página solicitada. Compõe cada resultado com identificador, nome, situação e número de documento, sem carregar a ficha completa.",
          "output": "Retorna patients paginado, já no formato compacto que a lista apresenta para identificar e selecionar um paciente."
        }
      },
      {
        "route": "agendaClinica.pacientes.loadPatientDetail",
        "kind": "qry",
        "uses": [
          "getPaciente"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "patient.details",
            "reason": "DISCLOSURE: Route agendaClinica.pacientes.loadPatientDetail projects details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "entity",
            "path": "patient",
            "entity": "Paciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "patient.details.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "patient.details.base",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.base",
                "path": "details.base"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "patient.details.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "patient.details.base",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a ficha do paciente que a recepcionista selecionou para confirmar sua identificação antes de ir ao agendamento.\nEntrada: patientId é o identificador do resultado escolhido na lista.\nProcessamento: Lê o paciente selecionado e compõe sua identificação completa e seu bloco base autorizado. A situação é devolvida como campo derivado do cadastro mestre, sem ser gravada por esta consulta.\nSaída: Retorna patient para a ficha de conferência, evitando carregar dados completos de todos os itens da lista.",
          "purpose": "Carrega a ficha do paciente que a recepcionista selecionou para confirmar sua identificação antes de ir ao agendamento.",
          "input": "patientId é o identificador do resultado escolhido na lista.",
          "processing": "Lê o paciente selecionado e compõe sua identificação completa e seu bloco base autorizado. A situação é devolvida como campo derivado do cadastro mestre, sem ser gravada por esta consulta.",
          "output": "Retorna patient para a ficha de conferência, evitando carregar dados completos de todos os itens da lista."
        }
      },
      {
        "route": "agendaClinica.pacientes.savePatient",
        "kind": "cmd",
        "uses": [
          "createPaciente"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "unresolved",
            "path": "patient.details",
            "reason": "DISCLOSURE: Route agendaClinica.pacientes.savePatient projects details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "entity",
            "path": "patient",
            "entity": "Paciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "patient.details.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "patient.details.base",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.base",
                "path": "details.base"
              }
            ]
          },
          {
            "kind": "entity",
            "path": "patientListItem",
            "entity": "Paciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "patientListItem.details.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "patient.details.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "patient.details.base",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "patientListItem.details.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Cadastra ou associa o novo paciente informado pela recepcionista e o deixa imediatamente disponível para conferência e agendamento.\nEntrada: name é o nome obrigatório de identificação; docType e docId são o tipo e o número do documento quando informados no formulário.\nProcessamento: Executa Paciente.create por meio do cadastro mestre createOrAttach: valida o formato do documento quando ele for informado, procura identidade existente pelo documento e cria ou associa o papel de paciente conforme necessário. A situação, o subtipo e os dados base retornados são determinados pelo cadastro mestre; não são recebidos como campos graváveis da página.\nSaída: Retorna a ficha completa do paciente cadastrado e sua projeção compacta para atualizar a ficha e inserir ou atualizar o resultado correspondente na lista sem uma segunda chamada.",
          "purpose": "Cadastra ou associa o novo paciente informado pela recepcionista e o deixa imediatamente disponível para conferência e agendamento.",
          "input": "name é o nome obrigatório de identificação; docType e docId são o tipo e o número do documento quando informados no formulário.",
          "processing": "Executa Paciente.create por meio do cadastro mestre createOrAttach: valida o formato do documento quando ele for informado, procura identidade existente pelo documento e cria ou associa o papel de paciente conforme necessário. A situação, o subtipo e os dados base retornados são determinados pelo cadastro mestre; não são recebidos como campos graváveis da página.",
          "output": "Retorna a ficha completa do paciente cadastrado e sua projeção compacta para atualizar a ficha e inserir ou atualizar o resultado correspondente na lista sem uma segunda chamada."
        }
      }
    ]
  }
} as const;

export default definition;
