/// <mls fileReference="_102047_/l4/agendaClinica/ontology/ContatoPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityContatoPaciente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "ContatoPaciente",
  "title": "Contato do paciente",
  "description": "Canal de contato do paciente, usado para a confirmação telefônica da consulta.",
  "displayField": "details.identification.name",
  "relationships": {
    "paciente": {
      "relationshipId": "patientContacts",
      "to": "Paciente",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Paciente do contato",
      "description": "Vínculo HasContact que associa este canal de contato ao paciente para confirmação de consultas.",
      "direction": "to",
      "required": "Sempre que o canal for usado para confirmar consultas do paciente.",
      "role": "HasContact"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um canal de contato pelo identificador, por leitura direta do cadastro mestre, para a recepcionista visualizar o telefone do paciente.",
    "locate.byContact": "Localiza o canal pelo número de telefone informado, pela busca de contato no cadastro mestre, para a recepcionista identificar o paciente ao confirmar uma consulta.",
    "register.createOrAttach": "Cria ou vincula um canal telefônico já existente pelo tipo e número do contato, associando o papel da agenda clínica, para a recepcionista cadastrar o telefone do paciente.",
    "edit.platformFields": "Atualiza o nome e o número do canal telefônico nos campos da plataforma, para a recepcionista manter o contato do paciente correto.",
    "inactivate": "Inativa um canal telefônico que não deve mais ser usado, pela alteração de status do cadastro mestre, para a recepcionista manter os contatos do paciente atualizados.",
    "link": "Vincula este canal ao paciente por meio do relacionamento HasContact, para a recepcionista disponibilizar o telefone na confirmação de consultas.",
    "unlink": "Encerra o vínculo HasContact entre o canal e o paciente preservando seu histórico, para a recepcionista remover um telefone que deixou de pertencer ao paciente.",
    "listLinks": "Lista os vínculos do canal de contato e sua vigência pelo relacionamento HasContact, para a recepcionista conferir a qual paciente o telefone pertence.",
    "audit": "Consulta quem alterou o canal de contato e quando no histórico de auditoria, para a recepcionista ou a administração rastrear manutenções do cadastro."
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
        "description": "Dados do canal de contato do paciente mantidos no cadastro mestre.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual a clínica reconhece o canal de contato do paciente.",
                "title": "Nome do contato",
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
                "description": "País ao qual o canal de contato está associado.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Identificação do canal de contato no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns do cadastro mestre; nenhum dado base adicional é usado pela agenda clínica neste papel."
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
                    "description": "Número telefônico para contato com o paciente."
                  }
                ],
                "title": "Tipo de contato",
                "description": "Tipo do canal usado para confirmação telefônica das consultas.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "Número de telefone do paciente utilizado pela recepcionista na confirmação da consulta.",
                "title": "Telefone",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "Contato verificado",
                "description": "Indica se o canal de contato foi verificado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Telefone do paciente usado pela recepcionista para confirmar consultas."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, apenas lidos pela agenda clínica."
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
} as const satisfies Ns5OntologyEntityV3;

export type AgendaClinicaEntityContatoPacienteType = typeof agendaClinicaEntityContatoPaciente;

export default agendaClinicaEntityContatoPaciente;
