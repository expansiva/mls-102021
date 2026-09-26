/// <mls fileReference="_102047_/l1/agendaClinica/materialization/agentMaterializeL1/scenarioCatalog.ts" enhancement="_blank"/>

// Declarative backend scenarios. A server loads this module as data.
export const scenarioCatalog = {
  "schemaVersion": "2026-09-25-m1-scenario-catalog-v1",
  "moduleName": "agendaClinica",
  "store": "memory",
  "scenarios": [
    {
      "scenarioId": "Consulta",
      "source": "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
      "artifactType": "domainEntity",
      "artifactId": "Consulta",
      "handlerId": "structure.domainEntity",
      "productionFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.test.ts",
      "cases": [
        {
          "caseId": "Consulta.compile",
          "gate": "compile",
          "source": "domainEntity structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "ConsultaRepository",
      "source": "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
      "artifactType": "repositoryPort",
      "artifactId": "ConsultaRepository",
      "handlerId": "structure.repositoryPort",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.test.ts",
      "cases": [
        {
          "caseId": "ConsultaRepository.compile",
          "gate": "compile",
          "source": "repositoryPort structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "ContatoPaciente",
      "source": "_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.defs.ts",
      "artifactType": "domainEntity",
      "artifactId": "ContatoPaciente",
      "handlerId": "structure.domainEntity",
      "productionFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.test.ts",
      "cases": [
        {
          "caseId": "ContatoPaciente.compile",
          "gate": "compile",
          "source": "domainEntity structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "Paciente",
      "source": "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
      "artifactType": "domainEntity",
      "artifactId": "Paciente",
      "handlerId": "structure.domainEntity",
      "productionFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.test.ts",
      "cases": [
        {
          "caseId": "Paciente.compile",
          "gate": "compile",
          "source": "domainEntity structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "Profissional",
      "source": "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts",
      "artifactType": "domainEntity",
      "artifactId": "Profissional",
      "handlerId": "structure.domainEntity",
      "productionFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.test.ts",
      "cases": [
        {
          "caseId": "Profissional.compile",
          "gate": "compile",
          "source": "domainEntity structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "accessScope",
      "source": "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
      "artifactType": "accessScope",
      "artifactId": "accessScope",
      "handlerId": "structure.accessScope",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.test.ts",
      "cases": [
        {
          "caseId": "accessScope.compile",
          "gate": "compile",
          "source": "accessScope structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "agenda",
      "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.defs.ts",
      "artifactType": "httpController",
      "artifactId": "agenda",
      "handlerId": "structure.httpController",
      "productionFile": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.test.ts",
      "cases": [
        {
          "caseId": "agenda.auth.cmdRegistrarAtendimento",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.defs.ts#agendaClinica.agenda.cmdRegistrarAtendimento",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.agenda.cmdRegistrarAtendimento",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "agenda.auth.qryListConsulta",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.defs.ts#agendaClinica.agenda.qryListConsulta",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.agenda.qryListConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "agenda.compile",
          "gate": "compile",
          "source": "httpController structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "agenda.contract.cmdRegistrarAtendimento.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.defs.ts#agendaClinica.agenda.cmdRegistrarAtendimento",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "profissional",
          "routine": "agendaClinica.agenda.cmdRegistrarAtendimento",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "agenda.contract.qryListConsulta.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.defs.ts#agendaClinica.agenda.qryListConsulta",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "profissional",
          "routine": "agendaClinica.agenda.qryListConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "consultas",
      "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts",
      "artifactType": "httpController",
      "artifactId": "consultas",
      "handlerId": "structure.httpController",
      "productionFile": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.test.ts",
      "cases": [
        {
          "caseId": "consultas.auth.cmdCreateConsulta",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.cmdCreateConsulta",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.consultas.cmdCreateConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.auth.cmdRegistrarFalta",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.cmdRegistrarFalta",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.consultas.cmdRegistrarFalta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.auth.cmdUpdateConsulta",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.cmdUpdateConsulta",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.consultas.cmdUpdateConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.auth.qryListConsulta",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.qryListConsulta",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.consultas.qryListConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.auth.qryListPaciente",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.qryListPaciente",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.consultas.qryListPaciente",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.auth.qryListProfissional",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.qryListProfissional",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.consultas.qryListProfissional",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.compile",
          "gate": "compile",
          "source": "httpController structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.contract.cmdCreateConsulta.pacienteId",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.cmdCreateConsulta",
          "expectation": "A body without pacienteId is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "pacienteId omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.consultas.cmdCreateConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.contract.cmdRegistrarFalta.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.cmdRegistrarFalta",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.consultas.cmdRegistrarFalta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.contract.cmdUpdateConsulta.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.cmdUpdateConsulta",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.consultas.cmdUpdateConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.contract.qryListConsulta.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.qryListConsulta",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.consultas.qryListConsulta",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.contract.qryListPaciente.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.qryListPaciente",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.consultas.qryListPaciente",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "consultas.contract.qryListProfissional.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts#agendaClinica.consultas.qryListProfissional",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.consultas.qryListProfissional",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "createConsulta",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
      "artifactType": "usecase",
      "artifactId": "createConsulta",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.test.ts",
      "cases": [
        {
          "caseId": "createConsulta.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "createConsulta.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "createConsulta.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "createPaciente",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts",
      "artifactType": "usecase",
      "artifactId": "createPaciente",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.test.ts",
      "cases": [
        {
          "caseId": "createPaciente.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "createPaciente.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "createPaciente.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "listConsulta",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
      "artifactType": "usecase",
      "artifactId": "listConsulta",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.test.ts",
      "cases": [
        {
          "caseId": "listConsulta.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "listConsulta.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "listConsulta.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "listPaciente",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
      "artifactType": "usecase",
      "artifactId": "listPaciente",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.test.ts",
      "cases": [
        {
          "caseId": "listPaciente.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "listPaciente.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "listPaciente.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "listProfissional",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
      "artifactType": "usecase",
      "artifactId": "listProfissional",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.test.ts",
      "cases": [
        {
          "caseId": "listProfissional.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "listProfissional.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "listProfissional.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "pacientes",
      "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts",
      "artifactType": "httpController",
      "artifactId": "pacientes",
      "handlerId": "structure.httpController",
      "productionFile": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.test.ts",
      "cases": [
        {
          "caseId": "pacientes.auth.cmdCreatePaciente",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts#agendaClinica.pacientes.cmdCreatePaciente",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.pacientes.cmdCreatePaciente",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "pacientes.auth.qryListPaciente",
          "gate": "auth",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts#agendaClinica.pacientes.qryListPaciente",
          "expectation": "An http caller with no authority is refused before the usecase.",
          "preconditions": [
            "verifiedAuthorities is empty",
            "source is http"
          ],
          "actorId": "",
          "routine": "agendaClinica.pacientes.qryListPaciente",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 403,
            "errorCode": "FORBIDDEN_ACTOR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "pacientes.compile",
          "gate": "compile",
          "source": "httpController structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "pacientes.contract.cmdCreatePaciente.details",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts#agendaClinica.pacientes.cmdCreatePaciente",
          "expectation": "A body without details is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "details omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.pacientes.cmdCreatePaciente",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "pacientes.contract.qryListPaciente.id",
          "gate": "contract",
          "source": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts#agendaClinica.pacientes.qryListPaciente",
          "expectation": "A body without id is VALIDATION_ERROR before the usecase runs.",
          "preconditions": [
            "id omitted"
          ],
          "actorId": "recepcionista",
          "routine": "agendaClinica.pacientes.qryListPaciente",
          "mutating": false,
          "expect": {
            "ok": false,
            "status": 400,
            "errorCode": "VALIDATION_ERROR",
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "registrarAtendimento",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts",
      "artifactType": "usecase",
      "artifactId": "registrarAtendimento",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.test.ts",
      "cases": [
        {
          "caseId": "registrarAtendimento.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "registrarAtendimento.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "registrarAtendimento.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "registrarFalta",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts",
      "artifactType": "usecase",
      "artifactId": "registrarFalta",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.test.ts",
      "cases": [
        {
          "caseId": "registrarFalta.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "registrarFalta.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "registrarFalta.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    },
    {
      "scenarioId": "updateConsulta",
      "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.defs.ts",
      "artifactType": "usecase",
      "artifactId": "updateConsulta",
      "handlerId": "structure.usecase",
      "productionFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.ts",
      "testFile": "_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.test.ts",
      "cases": [
        {
          "caseId": "updateConsulta.compile",
          "gate": "compile",
          "source": "usecase structure",
          "expectation": "The emitted file imports. A broken import is a failure, not an expected red.",
          "preconditions": [],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 0,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": null,
          "mandatory": true,
          "synthetic": []
        },
        {
          "caseId": "updateConsulta.reachesStub",
          "gate": "business",
          "source": "_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.defs.ts#operation",
          "expectation": "A valid call reaches the structure stub. Import, auth and database errors are not this red.",
          "preconditions": [
            "memory store",
            "no database"
          ],
          "actorId": "",
          "routine": "",
          "mutating": false,
          "expect": {
            "ok": true,
            "status": 200,
            "errorCode": null,
            "ruleId": null,
            "forbiddenFields": [],
            "isolatedActorField": null
          },
          "expectedFailure": {
            "caseId": "updateConsulta.reachesStub",
            "stage": "structure",
            "errorCode": "USECASE_NOT_IMPLEMENTED",
            "status": 501
          },
          "mandatory": true,
          "synthetic": []
        }
      ]
    }
  ]
} as const;
