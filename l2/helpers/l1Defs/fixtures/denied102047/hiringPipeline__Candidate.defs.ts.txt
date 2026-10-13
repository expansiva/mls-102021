/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/Candidate.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityCandidate = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "Candidate",
  "title": "Candidate",
  "description": "A person who applies to job positions. Name lives in the master record, the e-mail is a linked contact channel, the resume is a platform attachment; the module namespace keeps only the candidate's source.",
  "displayField": "details.identification.name",
  "relationships": {
    "applications": {
      "relationshipId": "applicationCandidate",
      "to": "Application",
      "via": "Application.candidateId",
      "cardinality": "1:N",
      "title": "Applications",
      "description": "The applications this candidate has made to job positions.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "emails": {
      "relationshipId": "candidateEmail",
      "to": "CandidateEmail",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "E-mails",
      "description": "The candidate's e-mail addresses, linked as contact channels (HasContact).",
      "role": "HasContact"
    },
    "jobPositions": {
      "relationshipId": "jobPositionCandidates",
      "to": "JobPosition",
      "via": "Application",
      "cardinality": "N:N",
      "title": "Positions applied to",
      "description": "The job positions this candidate applied to, read through their applications.",
      "mode": "throughTable",
      "path": "JobPosition.id <- Application.jobPositionId, Application.candidateId -> Candidate.id",
      "derived": true,
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Reads the candidate by mdmId to show them on the application list and the application screen; used by recruiters and hiring managers.",
    "locate.byName": "Finds candidates whose name contains the typed text, filtered to the hiringPipeline.Candidate role; used by the recruiter before registering and when recording an application.",
    "locate.byContact": "Finds the candidate who owns a given e-mail address so the recruiter does not register the same person twice.",
    "locate.byDocument": "Finds the person holding a national document, when the recruiter has one, to deduplicate before registering.",
    "register.createOrAttach": "Registers the candidate: looks the person up, creates the master record only when absent, attaches the hiringPipeline.Candidate role and writes the source; used by the recruiter.",
    "edit.platformFields": "Lets the recruiter correct the candidate's name, other names and privacy consent on the master record.",
    "edit.moduleNamespace": "Lets the recruiter change the candidate's source in the hiringPipeline namespace.",
    "link.contact": "Adds the candidate's e-mail as a ContactChannel linked by HasContact when the recruiter registers or updates the candidate.",
    "attach.document": "Stores the candidate's resume (file or link) against the record under the resume category; uploaded by the recruiter and opened by recruiters and hiring managers.",
    "listLinks": "Shows the candidate's linked e-mails and other relationships on the candidate screen for recruiters.",
    "inactivate": "Takes a candidate out of use without deleting them, and reactivates them later; done by the recruiter.",
    "comment": "Lets recruiters and hiring managers leave notes about the candidate.",
    "tag": "Lets the recruiter label candidates with free tags (skills, talent pool) inside the hiringPipeline namespace.",
    "statusHistory.read": "Shows recruiters when the candidate record was inactivated or reactivated, and by whom.",
    "audit": "Tells an administrator who changed the candidate record and when."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships",
    "rule-person-privacy-consent-required-br-eu",
    "candidateRequiresEmail",
    "candidateSourceRequired"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "hiringPipeline.Candidate",
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
        "description": "The master Person record of the candidate as the platform stores it, plus this module's namespace.",
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
                    "value": "Person",
                    "title": "Person"
                  }
                ],
                "description": "Always Person for a candidate.",
                "title": "Subtype"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Full name of the candidate, used to search for them before registering and shown on every application.",
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
                "description": "Platform status of the record; an inactive candidate is no longer offered when recording applications."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN"
                  },
                  {
                    "value": "Passport",
                    "title": "Passport"
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Driver's license"
                  },
                  {
                    "value": "NationalId",
                    "title": "National ID"
                  },
                  {
                    "value": "CPF",
                    "title": "CPF"
                  },
                  {
                    "value": "Other",
                    "title": "Other"
                  }
                ],
                "title": "Document type",
                "description": "Type of national document, when the recruiter has it; used only to deduplicate."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "National document number of the candidate, when known; used only to deduplicate.",
                "title": "Document number"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Country of the candidate (ISO 3166-1 alpha-2); decides the privacy rules that apply.",
                "title": "Country"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Registered at",
                "description": "When the candidate record was created."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Updated at",
                "description": "When the candidate record was last changed."
              }
            },
            "description": "Platform identification of the candidate; the name is what recruiters search and see."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Other names the candidate is known by, such as a nickname or maiden name, which help find them.",
                "title": "Other names"
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Summary of the candidate's linked contact channels; the candidate's e-mail appears here.",
                "title": "Contacts"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Compact keys the platform keeps for the candidate's links.",
                "title": "Relationship keys"
              }
            },
            "description": "Platform base data of the candidate."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Candidate's consent to have their personal data processed for recruiting; required for residents of Brazil or the EU.",
                "title": "Privacy consent"
              }
            },
            "description": "Platform person data; the hiring pipeline does not use any of it besides consent."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields promoted by the organization; read only in this module."
          },
          "hiringPipeline": {
            "type": "object",
            "owner": "module",
            "fields": {
              "source": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "referral",
                    "title": "Referral"
                  },
                  {
                    "value": "jobBoard",
                    "title": "Job board"
                  },
                  {
                    "value": "linkedIn",
                    "title": "LinkedIn"
                  },
                  {
                    "value": "careerSite",
                    "title": "Career site"
                  },
                  {
                    "value": "agency",
                    "title": "Agency"
                  },
                  {
                    "value": "event",
                    "title": "Event"
                  },
                  {
                    "value": "other",
                    "title": "Other"
                  }
                ],
                "title": "Source",
                "description": "Channel through which the candidate reached the organization, recorded by the recruiter at registration."
              }
            },
            "description": "What the hiring pipeline knows about the candidate: only where the candidate came from."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type HiringPipelineEntityCandidateType = typeof hiringPipelineEntityCandidate;

export default hiringPipelineEntityCandidate;
