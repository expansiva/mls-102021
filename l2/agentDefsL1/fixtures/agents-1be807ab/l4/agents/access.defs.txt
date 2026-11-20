/// <mls fileReference="_102047_/l4/agents/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "agents",
  "actors": [
    {
      "actorId": "companyAdmin",
      "kind": "internal",
      "origin": "named",
      "title": "Company admin",
      "description": "Creates virtual employees, reviews and activates or discards drafts, changes agent behavior, adjusts each agent's tools, configures agents, simulates them by role and marks per person the tools that person may not use through any agent.",
      "personEntity": "OrganizationUser"
    },
    {
      "actorId": "organizationMember",
      "kind": "internal",
      "origin": "named",
      "title": "Organization member",
      "description": "Sees the agents and their activity, simulates an agent as themselves and changes only their own conduct with an agent that acts on their behalf.",
      "personEntity": "OrganizationUser"
    }
  ],
  "grants": [
    {
      "grantId": "adminManageAgents",
      "actorRef": "companyAdmin",
      "title": "Manage agents, drafts and behavior",
      "description": "The company admin sees every agent and draft of the organization, creates virtual employees, activates or discards drafts, configures agents, changes or undoes their behavior and simulates them by person or role, always through the cm.",
      "entityRefs": [
        "Agent",
        "AgentDraft",
        "AgentBehavior",
        "AgentSimulation"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All agents and drafts of the organization as the cm keeps them."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The admin reads everything the cm returns about agents, drafts, behavior and simulations; screens still hide technical references."
      }
    },
    {
      "grantId": "adminManageTools",
      "actorRef": "companyAdmin",
      "title": "Manage the tool catalog, agent tools and people restrictions",
      "description": "The company admin browses the tool tree, turns tools on or off for each agent and marks per person the tools that person may not use through any agent.",
      "entityRefs": [
        "Tool",
        "AgentTool",
        "PersonToolRestriction"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "The whole tool catalog, every agent's tool choices and every person's restrictions in the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Everything except the stable release code of the tool and the whole stored catalog item, which are technical and never shown.",
        "deniedFields": [
          "Tool.toolKey",
          "Tool.details.catalogItem"
        ]
      }
    },
    {
      "grantId": "adminChoosePeople",
      "actorRef": "companyAdmin",
      "title": "Choose organization users",
      "description": "The company admin picks organization users from the platform user list to restrict their tools, simulate as them or name them responsible for an agent.",
      "entityRefs": [
        "OrganizationUser"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All users of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Name, whether the user is active and the login e-mail read from the platform login.",
        "allowedFields": [
          "OrganizationUser.details.identification.name",
          "OrganizationUser.details.identification.status",
          "OrganizationUser.details.agents.loginEmail"
        ]
      }
    },
    {
      "grantId": "adminReadActivity",
      "actorRef": "companyAdmin",
      "title": "Read agent activity",
      "description": "The company admin reads the execution summaries the cm sent for every agent, newest first.",
      "entityRefs": [
        "ExecutionSummary"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Every execution of every agent of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Everything about the execution except the cm's technical execution reference.",
        "deniedFields": [
          "ExecutionSummary.executionRef"
        ]
      }
    },
    {
      "grantId": "adminOwnConduct",
      "actorRef": "companyAdmin",
      "title": "My own conduct with an agent",
      "description": "The company admin, like any member, reads and changes how an agent that acts on their behalf behaves for them.",
      "entityRefs": [
        "PersonalConduct"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only the conduct whose person is the person signed in, for agents that act on their behalf."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole conduct of the signed-in person and the history of their own changes."
      }
    },
    {
      "grantId": "memberSeeAgents",
      "actorRef": "organizationMember",
      "title": "See the agents",
      "description": "Every organization member sees the agent cards and the overview: name, what it is, who it talks to, on whose behalf it acts, whether it is on and who is responsible.",
      "entityRefs": [
        "Agent"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All agents of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Card and overview fields; the limits of the configuration scenario are for the admin.",
        "allowedFields": [
          "Agent.name",
          "Agent.definition",
          "Agent.talksTo",
          "Agent.onBehalfOf",
          "Agent.isOn",
          "Agent.responsible"
        ]
      }
    },
    {
      "grantId": "memberReadActivity",
      "actorRef": "organizationMember",
      "title": "See what the agents did",
      "description": "Every organization member reads the executions of the agents, newest first: when, how long, cost, actions and results, whether a person took over and the link to the conversation.",
      "entityRefs": [
        "ExecutionSummary"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Executions of all agents of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Everything about the execution except the cm's technical execution reference.",
        "deniedFields": [
          "ExecutionSummary.executionRef"
        ]
      }
    },
    {
      "grantId": "memberSeePeopleNames",
      "actorRef": "organizationMember",
      "title": "See who called an agent",
      "description": "Members see the name of the person who called an agent in the activity and of the person responsible for it.",
      "entityRefs": [
        "OrganizationUser"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Users of the organization shown in agent cards and activity."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Only the person's name and login e-mail.",
        "allowedFields": [
          "OrganizationUser.details.identification.name",
          "OrganizationUser.details.agents.loginEmail"
        ]
      }
    },
    {
      "grantId": "memberReadToolCatalog",
      "actorRef": "organizationMember",
      "title": "Read the tool tree",
      "description": "Members read the readable names and descriptions of the tools, so simulation results show the module, subject and action in plain words.",
      "entityRefs": [
        "Tool"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "The whole tool catalog."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Readable names, description and whether the tool was removed; no technical code, release data or whole stored catalog item.",
        "allowedFields": [
          "Tool.moduleName",
          "Tool.subject",
          "Tool.name",
          "Tool.status",
          "Tool.details.moduleTitle",
          "Tool.details.subjectTitle",
          "Tool.details.description"
        ]
      }
    },
    {
      "grantId": "memberSimulateAsMyself",
      "actorRef": "organizationMember",
      "title": "Simulate an agent as myself",
      "description": "A member checks which tools an agent can or cannot use for them and why, and how it reads a sentence they type.",
      "entityRefs": [
        "AgentSimulation"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only simulations run for the person signed in; a member never simulates another person or a role."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The whole simulation result for themselves, without the role choice reserved to the admin.",
        "deniedFields": [
          "AgentSimulation.roleName"
        ]
      }
    },
    {
      "grantId": "memberOwnConduct",
      "actorRef": "organizationMember",
      "title": "Change my conduct with an agent",
      "description": "A member reads and changes how an agent that acts on their behalf behaves for them, and sees the history of their own changes.",
      "entityRefs": [
        "PersonalConduct"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only the conduct whose person is the person signed in, for agents that act on their behalf."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole conduct of the signed-in member and the history of their own changes."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type AgentsAccessType = typeof agentsAccess;

export default agentsAccess;
