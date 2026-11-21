/// <mls fileReference="_102047_/l4/agents/ontology/OrganizationUser.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityOrganizationUser = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "OrganizationUser",
  "title": "Organization user",
  "description": "A person of the organization chosen from the platform user list: the person whose tools are restricted, or the person who called an agent in an execution.",
  "displayField": "details.identification.name",
  "relationships": {
    "toolRestrictions": {
      "relationshipId": "restrictionPerson",
      "to": "PersonToolRestriction",
      "via": "PersonToolRestriction.personId",
      "cardinality": "1:N",
      "title": "Tools this person may not use",
      "description": "The tools the company admin marked as unavailable to this person through any agent.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "requestedExecutions": {
      "relationshipId": "executionRequester",
      "to": "ExecutionSummary",
      "via": "ExecutionSummary.personId",
      "cardinality": "1:N",
      "title": "Executions this person requested",
      "description": "The agent executions in which this person called the agent.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "locate.users": "Lists the organization's users who have a platform login, filtered by name. The company admin uses it to choose the person to restrict and the person to simulate as.",
    "read.byId": "Fills in the names of people referenced by restrictions and by execution summaries, using their record ids, so the screens never show a technical id.",
    "locate.byName": "Finds a person by typed name in the people restrictions screen and the simulation person picker.",
    "listLinks": "Shows a person's level-1 links, such as the company they are a member of, when explaining in simulation why a tool can or cannot be used."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "onlyActiveUsersRestricted"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agents.OrganizationUser",
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
        "description": "The person's platform record as this module reads it.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "The person's name, shown in the people restrictions list and on executions in the activity tab.",
                "title": "Name"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Active"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactive"
                  },
                  {
                    "value": "Merged",
                    "title": "Merged"
                  },
                  {
                    "value": "Blocked",
                    "title": "Blocked"
                  }
                ],
                "title": "Status",
                "description": "Whether the person is still an active user. Only active users are offered for restrictions and for simulation."
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "The module roles on the record. agents.OrganizationUser marks that this module refers to the person.",
                "title": "Module roles"
              }
            },
            "description": "How the person is recognised in tool restrictions and in agent activity."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "This module keeps nothing from the base branch."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "This module keeps nothing from the person branch."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields the organization promoted. This module reads them and does not declare them."
          },
          "agents": {
            "type": "object",
            "owner": "module",
            "fields": {
              "loginEmail": {
                "type": "string",
                "derived": true,
                "title": "Login e-mail",
                "description": "The person's login e-mail, read from the platform login. It is never typed or stored by this module."
              }
            },
            "description": "Empty. The tools a person may not use are stored as person tool restriction rows, not on the person record."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityOrganizationUserType = typeof agentsEntityOrganizationUser;

export default agentsEntityOrganizationUser;
