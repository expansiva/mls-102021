/// <mls fileReference="_102047_/l4/hiringPipeline/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "hiringPipeline",
  "actors": [
    {
      "actorId": "recruiter",
      "kind": "internal",
      "origin": "named",
      "title": "Recruiter",
      "description": "Opens job positions, registers candidates, records applications and moves them through screening and interview, and rejects them with a reason.",
      "personEntity": ""
    },
    {
      "actorId": "hiringManager",
      "kind": "internal",
      "origin": "named",
      "title": "Hiring Manager",
      "description": "Hiring manager of a position; decides when an application moves to offer and when it is hired.",
      "personEntity": "HiringManager"
    }
  ],
  "grants": [
    {
      "grantId": "recruiterPipeline",
      "actorRef": "recruiter",
      "title": "Manage positions and applications",
      "description": "The recruiter opens job positions, records applications and moves them through screening, interview and rejection for every position of the organization.",
      "entityRefs": [
        "JobPosition",
        "Application"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All job positions and applications of the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The recruiter reads the whole position and application, including rejection details and derived counts."
      }
    },
    {
      "grantId": "recruiterCandidates",
      "actorRef": "recruiter",
      "title": "Register and search candidates",
      "description": "The recruiter searches for candidates to avoid duplicates, registers them with name, e-mail and source, and maintains their e-mail records.",
      "entityRefs": [
        "Candidate",
        "CandidateEmail"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All candidates and candidate e-mail records of the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The recruiter reads the whole candidate record, including the document used for deduplication, and the e-mail record."
      }
    },
    {
      "grantId": "recruiterHiringManagers",
      "actorRef": "recruiter",
      "title": "Choose the hiring manager of a position",
      "description": "The recruiter sees hiring managers to assign one when opening a position.",
      "entityRefs": [
        "HiringManager"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All hiring managers of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Name, status and contact summary of the hiring manager; no consent or other personal data.",
        "allowedFields": [
          "HiringManager.details.identification.name",
          "HiringManager.details.identification.status",
          "HiringManager.details.base.contacts"
        ]
      }
    },
    {
      "grantId": "managerOwnPipeline",
      "actorRef": "hiringManager",
      "title": "My positions and their applications",
      "description": "The hiring manager sees the positions they manage and their applications, extends offers and confirms hires.",
      "entityRefs": [
        "JobPosition",
        "Application"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Positions whose hiring manager is the signed-in person, and the applications to those positions.",
        "anchorEntity": "HiringManager"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole position and application, including stage history, rejection details and derived counts."
      }
    },
    {
      "grantId": "managerCandidates",
      "actorRef": "hiringManager",
      "title": "Candidates of my positions",
      "description": "The hiring manager reviews the candidates who applied to the positions they manage.",
      "entityRefs": [
        "Candidate"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Candidates with at least one application to a job position whose hiring manager is the signed-in person.",
        "anchorEntity": "Candidate"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Name, contacts and source of the candidate; the national document and consent data stay hidden.",
        "allowedFields": [
          "Candidate.details.identification.name",
          "Candidate.details.identification.status",
          "Candidate.details.identification.countryCode",
          "Candidate.details.base.aliases",
          "Candidate.details.base.contacts",
          "Candidate.details.hiringPipeline"
        ],
        "deniedFields": [
          "Candidate.details.identification.docType",
          "Candidate.details.identification.docId",
          "Candidate.details.person.privacyConsent"
        ]
      }
    },
    {
      "grantId": "managerCandidateEmails",
      "actorRef": "hiringManager",
      "title": "E-mail of candidates of my positions",
      "description": "The hiring manager sees the e-mail address of candidates who applied to their positions.",
      "entityRefs": [
        "CandidateEmail"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "E-mail records linked to candidates that have an application to a position managed by the signed-in person."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The e-mail address and whether it is verified.",
        "allowedFields": [
          "CandidateEmail.details.identification.name",
          "CandidateEmail.details.contactChannel.value",
          "CandidateEmail.details.contactChannel.isVerified"
        ]
      }
    },
    {
      "grantId": "managerSelf",
      "actorRef": "hiringManager",
      "title": "My hiring manager record",
      "description": "The hiring manager sees their own record as shown on their positions.",
      "entityRefs": [
        "HiringManager"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Only the record of the signed-in hiring manager.",
        "anchorEntity": "HiringManager"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole own record."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type HiringPipelineAccessType = typeof hiringPipelineAccess;

export default hiringPipelineAccess;
