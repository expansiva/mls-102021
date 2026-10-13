/// <mls fileReference="_102047_/l4/ordenServicio/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "ordenServicio",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Recibe el aparato del cliente, abre la orden de servicio con los datos del cliente, el aparato, el defecto informado y fotos, y al final entrega el aparato y finaliza la orden.",
      "personEntity": ""
    },
    {
      "actorId": "tecnico",
      "kind": "internal",
      "origin": "named",
      "title": "Técnico",
      "description": "Analiza el aparato, registra el diagnóstico, las piezas necesarias con costo interno y el valor del presupuesto; si el cliente aprueba, realiza la reparación, registra lo que hizo y marca la orden como lista.",
      "personEntity": ""
    },
    {
      "actorId": "cliente",
      "kind": "external",
      "origin": "named",
      "title": "Cliente",
      "description": "Accede al portal, ve solamente sus propias órdenes con estado, diagnóstico y valor del presupuesto, y aprueba o rechaza el presupuesto.",
      "personEntity": "Cliente"
    }
  ],
  "grants": [
    {
      "grantId": "recepcionistaClientes",
      "actorRef": "recepcionista",
      "title": "Clientes del servicio técnico",
      "description": "El recepcionista busca, registra o reutiliza el registro del cliente al abrir una orden de servicio.",
      "entityRefs": [
        "Cliente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos los clientes de la organización, para localizarlos por documento o nombre."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Ve el registro completo del cliente: identificación, contactos y consentimiento."
      }
    },
    {
      "grantId": "recepcionistaOrdenes",
      "actorRef": "recepcionista",
      "title": "Apertura y entrega de órdenes",
      "description": "El recepcionista abre las órdenes de servicio con el aparato, el defecto informado y las fotos, y entrega y finaliza las órdenes listas.",
      "entityRefs": [
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas las órdenes de servicio de la organización."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Ve la orden completa salvo las anotaciones internas del técnico y el costo interno de las piezas.",
        "deniedFields": [
          "OrdenServicio.details.anotacionesTecnico",
          "OrdenServicio.details.costoInternoPiezas"
        ]
      }
    },
    {
      "grantId": "tecnicoOrdenes",
      "actorRef": "tecnico",
      "title": "Diagnóstico, presupuesto y reparación",
      "description": "El técnico analiza las órdenes, registra diagnóstico, anotaciones, piezas con costo interno y valor del presupuesto, y luego registra la reparación y marca la orden como lista.",
      "entityRefs": [
        "OrdenServicio",
        "PiezaOrden"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas las órdenes de servicio y sus piezas de la organización."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Ve el registro completo de las órdenes y de las piezas, incluidos los costos internos."
      }
    },
    {
      "grantId": "tecnicoClientes",
      "actorRef": "tecnico",
      "title": "Consulta del cliente de la orden",
      "description": "El técnico ve quién es el cliente de la orden que analiza o repara.",
      "entityRefs": [
        "Cliente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Clientes de la organización vinculados a las órdenes."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Solo el nombre y los contactos del cliente.",
        "allowedFields": [
          "Cliente.details.identification.name",
          "Cliente.details.base.contacts"
        ]
      }
    },
    {
      "grantId": "clienteMisOrdenes",
      "actorRef": "cliente",
      "title": "Mis órdenes en el portal",
      "description": "El cliente ve solamente sus propias órdenes con estado, aparato, diagnóstico y valor del presupuesto, y aprueba o rechaza el presupuesto.",
      "entityRefs": [
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Solo las órdenes cuyo cliente es la persona que inició sesión.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Nunca ve las anotaciones internas del técnico ni el costo interno de las piezas.",
        "deniedFields": [
          "OrdenServicio.details.anotacionesTecnico",
          "OrdenServicio.details.costoInternoPiezas"
        ]
      }
    },
    {
      "grantId": "clienteMiRegistro",
      "actorRef": "cliente",
      "title": "Mis datos",
      "description": "El cliente ve su propio registro en el portal.",
      "entityRefs": [
        "Cliente"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Solo el registro de la persona que inició sesión.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Ve su nombre, sus contactos y su consentimiento de privacidad.",
        "allowedFields": [
          "Cliente.details.identification.name",
          "Cliente.details.base.contacts",
          "Cliente.details.person.privacyConsent"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type OrdenServicioAccessType = typeof ordenServicioAccess;

export default ordenServicioAccess;
