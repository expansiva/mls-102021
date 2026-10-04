/// <mls fileReference="_102047_/l4/agendaClinica/ontology/ContatoPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityContatoPaciente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "ContatoPaciente",
  "title": "Contato do paciente",
  "description": "Canal de contato mestre do paciente, consultado pela recepção para confirmação telefônica.",
  "displayField": "details.identification.name",
  "relationships": {
    "pacientes": {
      "relationshipId": "pacienteHasContact",
      "to": "Paciente",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Paciente vinculado",
      "description": "Paciente que possui este canal de contato mestre para a recepção realizar confirmações.",
      "direction": "to",
      "required": "Nunca é obrigatório para o canal de contato existir.",
      "role": "HasContact"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um canal de contato pelo identificador mestre, por leitura direta do registro, para a recepcionista preencher e conferir os dados do paciente.",
    "locate.byName": "Localiza canais de contato pelo nome identificado no cadastro, pela busca textual no índice mestre, para a recepcionista encontrar um canal já registrado.",
    "locate.byContact": "Localiza o registro mestre associado a um telefone, pela busca do valor do canal de contato, para a recepcionista evitar duplicidade ao cadastrar ou confirmar o telefone.",
    "register.createOrAttach": "Cria ou reutiliza um canal de telefone mestre e anexa o papel da agenda clínica, por busca prévia do contato e vínculo do namespace do módulo, para a recepcionista cadastrar o telefone do paciente.",
    "edit.platformFields": "Atualiza o nome e os dados permitidos do canal de contato mestre, pela atualização do registro MDM, para a recepcionista corrigir um telefone de paciente.",
    "inactivate": "Inativa ou reativa o canal de contato sem removê-lo, pela alteração da situação mestre, para a recepcionista deixar de usar um telefone desatualizado.",
    "link": "Vincula este canal de contato ao paciente por meio do relacionamento mestre HasContact versionado, para a recepcionista disponibilizar o telefone nas confirmações.",
    "unlink": "Encerra o vínculo HasContact preservando seu histórico, pela inativação do relacionamento mestre, para a recepcionista desvincular um telefone que não pertence mais ao paciente.",
    "listLinks": "Exibe os pacientes relacionados e a vigência dos vínculos, pela consulta de relacionamentos MDM, para a recepcionista conferir a quem o telefone está associado.",
    "statusHistory.read": "Mostra as mudanças de situação do canal de contato, pelo histórico de status mestre, para a recepcionista conferir quando um telefone foi ativado ou inativado.",
    "audit": "Mostra quem alterou os dados do canal e quando, pela auditoria mestre, para a recepção rastrear mudanças no telefone do paciente."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-contact-value-unique-per-type"
  ],
  "kind": "role",
  "subtype": "ContactChannel",
  "roleTag": "agendaClinica.ContatoPaciente",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento mestre do canal de contato usado pela recepção para confirmar consultas.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "ContactChannel",
                    "title": "Canal de contato",
                    "description": "Canal de contato mestre."
                  }
                ],
                "description": "Identifica este registro mestre como um canal de contato.",
                "title": "Tipo do cadastro mestre",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Identificação legível do canal de contato para a recepção.",
                "title": "Nome do canal",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo",
                    "description": "Canal disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Canal fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Canal incorporado a outro cadastro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Canal bloqueado pela organização."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação mestre do canal de contato utilizado nas confirmações.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 0,
                "default": "US",
                "description": "Código do país aplicável ao canal de contato.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do canal de contato mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados base do registro mestre que a agenda clínica consulta quando necessário."
          },
          "contactChannel": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contactType": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "Phone",
                    "title": "Telefone",
                    "description": "Telefone para contato com o paciente."
                  }
                ],
                "title": "Tipo de contato",
                "description": "Tipo do canal usado para a confirmação telefônica de consultas.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "Número de telefone do paciente, armazenado sem mascaramento.",
                "title": "Telefone",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "Telefone verificado",
                "description": "Indica se o telefone foi verificado como pertencente ao paciente.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Telefone mestre vinculado ao paciente e usado pela recepção na confirmação de consultas."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, somente para leitura pela agenda clínica."
          },
          "agendaClinica": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgendaClinicaEntityContatoPacienteType = typeof agendaClinicaEntityContatoPaciente;

export default agendaClinicaEntityContatoPaciente;
