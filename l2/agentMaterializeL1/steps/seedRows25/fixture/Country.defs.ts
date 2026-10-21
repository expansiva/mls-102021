/// <mls fileReference="_102056_/l4/onboarding/ontology/Country.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingEntityCountry = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "entityId": "Country",
  "title": "Country",
  "description": "The module's own country list: two-letter ISO code and English name, loaded by the module seed and maintained by the company owner (add, edit, inactivate). Shown with the country name in the user language; platform records keep only the code.",
  "initialData": "Every ISO 3166-1 country with its two-letter code and English name, loaded by the module seed.",
  "displayField": "name",
  "relationships": {},
  "capabilities": {
    "read.byId": "Reads one country by its id when the owner opens it to edit its name; used by the company owner on the country list.",
    "locate.byColumn": "Lists countries filtered by status and ordered by name, paged; the active list feeds the country choice in the person and company forms, and the owner sees all statuses.",
    "locate.byText": "Searches the country list by part of the code or the English name; used by the company owner in the country search box.",
    "count": "Counts the countries a filter matches, to show the total on the country list header; used by the company owner.",
    "create": "Writes a new country with its two-letter ISO code and English name, active from the start; used by the company owner and by the module seed.",
    "update": "Fixes the English name or localized names of an existing country; used by the company owner. The code is not changed.",
    "transition": "Moves a country from active to inactive through the inactivateCountry transition, guarded by the module; used by the company owner.",
    "uniqueKey": "Refuses a second country with the same ISO code through a UNIQUE index on the code column; enforced by the engine on write."
  },
  "rules": [
    "countryCodeUnique",
    "countryCodeIsoTwoLetters",
    "onlyOwnerMaintainsCountries",
    "inactiveCountryNotSelectable",
    "unknownCountryNeverDefaulted"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "onboarding_country",
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
      "code": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "ISO code",
        "description": "Two-letter ISO country code in upper case. This is the only country value the platform person and company records keep.",
        "pattern": "^[A-Z]{2}$",
        "maxLength": 2
      },
      "name": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Name (English)",
        "description": "English name of the country. It is searched and used to sort the list. The screen shows the name in the user language.",
        "maxLength": 120
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "active",
            "title": "Active",
            "description": "Can be chosen in the person and company forms."
          },
          {
            "value": "inactive",
            "title": "Inactive",
            "description": "Can no longer be chosen in new forms."
          }
        ],
        "title": "Status",
        "description": "Whether the country can be chosen in new forms. Inactive countries stay on record but cannot be chosen."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Display data of the country that nothing filters by.",
        "fields": {
          "localizedNames": {
            "type": "object",
            "collection": true,
            "title": "Localized names",
            "description": "Name of the country in each language the screen supports. When the user language has no entry, the English name is shown.",
            "fields": {
              "locale": {
                "type": "string",
                "required": true,
                "title": "Language",
                "description": "Language code of the translated name, for example en or pt-BR.",
                "maxLength": 10
              },
              "name": {
                "type": "string",
                "required": true,
                "title": "Name in this language",
                "description": "Country name as shown to a person who uses this language.",
                "maxLength": 120
              }
            }
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "code"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "active",
      "reachedBy": "actor"
    },
    {
      "state": "inactive",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "inactivateCountry",
      "from": [
        "active"
      ],
      "to": "inactive",
      "by": [
        "companyOwner"
      ],
      "description": "The company owner inactivates a country so it can no longer be chosen in new person or company forms. Records that already hold its code are not changed.",
      "payload": [],
      "ruleRefs": [
        "onlyOwnerMaintainsCountries",
        "inactiveCountryNotSelectable"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OnboardingEntityCountryType = typeof onboardingEntityCountry;

export default onboardingEntityCountry;
