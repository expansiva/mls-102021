/// <mls fileReference="_102047_/l4/agents/ontology/AgentSimulation.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentSimulation = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentSimulation",
  "title": "Agent simulation",
  "description": "A simulation run by the cm at two levels: what the agent can do for a person or role, and what it understands from a sentence. Nothing is saved.",
  "displayField": "sentence",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "simulationSavesNothing",
    "memberSimulatesOnlyAsSelf",
    "adminSimulatesByRole",
    "onlyToolsOnAreConsidered",
    "personRestrictionAppliesInRequest",
    "noTechnicalIdsOnScreen"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "agent": {
        "type": "record",
        "required": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The agent being simulated, or the ready draft under review."
      },
      "level": {
        "type": "enum",
        "required": true,
        "values": [
          {
            "value": "whatItCan",
            "title": "What it can",
            "description": "Which tools the agent can or cannot use for a chosen person or role, and why."
          },
          {
            "value": "whatItUnderstands",
            "title": "What it understands",
            "description": "For a sentence: whether it asks for an action, which path of the tree and which actions."
          }
        ],
        "title": "Simulation level",
        "description": "Which question the simulation answers."
      },
      "subjectKind": {
        "type": "enum",
        "values": [
          {
            "value": "person",
            "title": "A person"
          },
          {
            "value": "role",
            "title": "A role"
          }
        ],
        "title": "Simulate for",
        "description": "Whether the 'what it can' level is run for a person or for a role. Members always simulate as themselves."
      },
      "person": {
        "type": "record",
        "to": [
          "OrganizationUser"
        ],
        "title": "Person",
        "description": "The person the simulation is run for; for an organization member, always themselves."
      },
      "roleName": {
        "type": "string",
        "title": "Role",
        "description": "The role the company admin chose to simulate, shown by its readable name.",
        "maxLength": 120
      },
      "sentence": {
        "type": "text",
        "title": "Sentence",
        "description": "The sample request typed to see what the agent understands from it.",
        "maxLength": 2000
      },
      "toolVerdicts": {
        "type": "object",
        "collection": true,
        "title": "Tools for this person or role",
        "description": "Each tool that is on for the agent, with whether it can be used now and why.",
        "fields": {
          "tool": {
            "type": "record",
            "required": true,
            "to": [
              "Tool"
            ],
            "title": "Tool",
            "description": "The catalog tool being judged."
          },
          "moduleName": {
            "type": "string",
            "required": true,
            "title": "Module",
            "description": "Readable name of the module the tool belongs to."
          },
          "subjectName": {
            "type": "string",
            "required": true,
            "title": "Subject",
            "description": "Readable name of the subject inside the module."
          },
          "actionName": {
            "type": "string",
            "required": true,
            "title": "Action",
            "description": "Readable name of the action."
          },
          "canUse": {
            "type": "boolean",
            "required": true,
            "title": "Can be used",
            "description": "Whether the agent may use this tool for this person or role in a request now."
          },
          "reason": {
            "type": "enum",
            "required": true,
            "values": [
              {
                "value": "allowed",
                "title": "Allowed"
              },
              {
                "value": "restrictedForPerson",
                "title": "This person may not use it through any agent"
              },
              {
                "value": "notPermittedForRole",
                "title": "The person's role does not allow it"
              },
              {
                "value": "removedFromRelease",
                "title": "Removed from the current release"
              }
            ],
            "title": "Why",
            "description": "The reason the tool can or cannot be used."
          },
          "reasonText": {
            "type": "string",
            "title": "Explanation",
            "description": "One plain-language line explaining the reason.",
            "maxLength": 300
          }
        }
      },
      "understanding": {
        "type": "object",
        "title": "What it understands",
        "description": "How the agent reads the sentence.",
        "fields": {
          "asksForAction": {
            "type": "boolean",
            "required": true,
            "title": "Asks for an action",
            "description": "Whether the sentence asks the agent to do something with a tool."
          },
          "moduleName": {
            "type": "string",
            "title": "Module",
            "description": "Readable name of the module of the tree path the sentence leads to."
          },
          "subjectName": {
            "type": "string",
            "title": "Subject",
            "description": "Readable name of the subject of the tree path the sentence leads to."
          },
          "actions": {
            "type": "object",
            "collection": true,
            "title": "Actions",
            "description": "The actions the agent would use for the sentence.",
            "fields": {
              "tool": {
                "type": "record",
                "required": true,
                "to": [
                  "Tool"
                ],
                "title": "Tool",
                "description": "The catalog tool the action corresponds to."
              },
              "actionName": {
                "type": "string",
                "required": true,
                "title": "Action",
                "description": "Readable name of the action."
              }
            }
          },
          "explanation": {
            "type": "text",
            "title": "Explanation",
            "description": "A short plain-language explanation of how the sentence was read.",
            "maxLength": 1000
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentSimulationType = typeof agentsEntityAgentSimulation;

export default agentsEntityAgentSimulation;
