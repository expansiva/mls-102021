/// <mls fileReference="_102056_/l4/onboarding/ontology/PrivacyText.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingEntityPrivacyText = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "entityId": "PrivacyText",
  "title": "Privacy text",
  "description": "Read-only privacy text, one per version, loaded by the module seed. The current version is the latest one; it is shown with an unchecked acceptance when the chosen country requires consent.",
  "displayField": "version",
  "relationships": {},
  "capabilities": {
    "read.byId": "Reads one version of the privacy text by its id, for example to show again the text the person accepted.",
    "locate.byColumn": "Finds the current privacy text by ordering on the published date, newest first, and taking the first row; the Complete my access screen reads it along with the person data.",
    "count": "Counts the privacy text versions loaded by the seed, so the screen can tell when no text is available and consent cannot be asked.",
    "uniqueKey": "Stops the seed from loading two rows with the same version, so every consent points at exactly one text.",
    "create": "Used only by the module seed to load each version of the privacy text; no screen creates, edits or deletes a privacy text."
  },
  "rules": [
    "privacyTextReadOnly",
    "currentPrivacyTextIsLatest",
    "privacyTextVersionUnique",
    "consentRecordsShownVersion"
  ],
  "writer": "crud",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "onboarding_privacytext",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "publishedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Published at",
        "description": "When this version was loaded by the module seed. The current version is the latest one, so the list is ordered by this date."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Content of this version of the privacy text.",
        "fields": {
          "title": {
            "type": "string",
            "required": true,
            "title": "Title",
            "description": "Heading shown above the privacy text on the consent request.",
            "maxLength": 200
          },
          "body": {
            "type": "text",
            "required": true,
            "title": "Text",
            "description": "Full privacy text shown with the unchecked acceptance box when the chosen country requires consent."
          },
          "language": {
            "type": "string",
            "title": "Language",
            "description": "Language the text is written in (for example en or pt-BR).",
            "maxLength": 10
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "version"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OnboardingEntityPrivacyTextType = typeof onboardingEntityPrivacyText;

export default onboardingEntityPrivacyText;
