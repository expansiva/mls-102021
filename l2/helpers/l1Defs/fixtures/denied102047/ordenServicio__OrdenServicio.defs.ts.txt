/// <mls fileReference="_102047_/l4/ordenServicio/ontology/OrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityOrdenServicio = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "ordenServicio",
  "entityId": "OrdenServicio",
  "title": "Orden de servicio",
  "description": "Orden abierta por el recepcionista con el cliente, los datos del aparato, el defecto informado y las fotos (adjuntos de la plataforma); recibe el diagnóstico y las anotaciones internas del técnico, el valor del presupuesto, la respuesta del cliente y lo realizado en la reparación. Ciclo: abierta, presupuestada, aprobada o rechazada, lista, finalizada.",
  "displayField": "numero",
  "relationships": {
    "cliente": {
      "relationshipId": "ordenCliente",
      "to": "Cliente",
      "via": "OrdenServicio.clienteId",
      "cardinality": "N:1",
      "title": "Cliente de la orden",
      "description": "Cada orden pertenece a un cliente, que solo ve sus propias órdenes en el portal.",
      "mode": "fk",
      "required": true
    },
    "piezas": {
      "relationshipId": "piezaOrden",
      "to": "PiezaOrden",
      "via": "PiezaOrden.ordenServicioId",
      "cardinality": "1:N",
      "title": "Piezas de la orden",
      "description": "Piezas necesarias que el técnico registra con cantidad y costo interno.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre una orden por su id para que el técnico la revise, el recepcionista la confirme y el cliente vea su detalle en el portal (sin costos internos ni anotaciones del técnico).",
    "locate.byColumn": "Lista órdenes filtradas por estado, cliente y fecha de apertura: el técnico ve las abiertas y aprobadas, el recepcionista las listas, y el cliente solo las suyas.",
    "locate.byText": "Busca una orden por su número en el mostrador cuando el cliente viene a retirar el aparato; lo usa el recepcionista.",
    "count": "Cuenta las órdenes por estado para los contadores de pendientes del técnico y del recepcionista.",
    "listByForeignKey": "Lista las órdenes de un cliente por clienteId, base de la vista «mis órdenes» del portal y del historial del cliente en recepción.",
    "create": "El recepcionista abre la orden con el cliente, el aparato y el defecto informado, en estado abierta.",
    "update": "El técnico registra el diagnóstico, sus anotaciones internas y el trabajo realizado sin cambiar el estado.",
    "transition": "Mueve la orden por su ciclo: el técnico emite el presupuesto y la marca lista, el cliente aprueba o rechaza desde el portal y el recepcionista finaliza.",
    "uniqueKey": "Impide dos órdenes con el mismo número; lo garantiza el motor al escribir.",
    "transaction": "Graba juntas la emisión del presupuesto y las piezas registradas por el técnico, todo o nada.",
    "read.mdmRecord": "Lee del registro maestro el nombre y los contactos del cliente al que apunta la orden, para recepción y entrega.",
    "sequence.next": "Emite el número de orden que citan el recepcionista y el cliente, al abrir la orden.",
    "attach.document": "Guarda las fotos del aparato que el recepcionista toma al abrir la orden, y el técnico las consulta al analizarlo.",
    "statusHistory.read": "Muestra cuándo y quién movió la orden entre estados, en la ficha de la orden para recepción y técnico."
  },
  "rules": [
    "numeroOrdenUnico",
    "clienteVeSoloSusOrdenes",
    "costoInternoOcultoAlCliente",
    "anotacionesTecnicoOcultasAlCliente",
    "presupuestoRequiereDiagnosticoYValor",
    "clienteSoloRespondeSusOrdenes",
    "listaRequiereTrabajoRealizado",
    "fotosAparatoEnAdjuntos"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "ordenServicio_ordenservicio",
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
      "numero": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Número de orden",
        "description": "Número de la orden que el recepcionista y el cliente citan; lo emite la secuencia de la plataforma al abrir la orden.",
        "maxLength": 20
      },
      "clienteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Cliente"
        ],
        "title": "Cliente",
        "description": "Cliente dueño del aparato; el portal muestra al cliente solamente las órdenes que apuntan a él."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "abierta",
            "title": "Abierta",
            "description": "Aparato recibido, pendiente de análisis del técnico."
          },
          {
            "value": "presupuestada",
            "title": "Presupuestada",
            "description": "Presupuesto emitido, a la espera de la respuesta del cliente."
          },
          {
            "value": "aprobada",
            "title": "Aprobada",
            "description": "El cliente aprobó el presupuesto; pendiente de reparación."
          },
          {
            "value": "rechazada",
            "title": "Rechazada",
            "description": "El cliente rechazó el presupuesto; la orden se cierra y el aparato queda disponible para retiro."
          },
          {
            "value": "lista",
            "title": "Lista",
            "description": "Reparación concluida, aparato listo para entrega."
          },
          {
            "value": "finalizada",
            "title": "Finalizada",
            "description": "Aparato entregado al cliente y orden cerrada."
          }
        ],
        "title": "Estado",
        "description": "Etapa del ciclo de la orden de servicio."
      },
      "fechaApertura": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Fecha de apertura",
        "description": "Momento en que el recepcionista abrió la orden; ordena las listas de órdenes."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalles",
        "description": "Datos de la orden que se muestran pero no se filtran.",
        "fields": {
          "aparato": {
            "type": "object",
            "required": true,
            "title": "Aparato",
            "description": "Datos del aparato que el cliente trae al servicio técnico.",
            "fields": {
              "tipo": {
                "type": "string",
                "required": true,
                "title": "Tipo de aparato",
                "description": "Clase de aparato (televisor, celular, notebook, consola…).",
                "maxLength": 80
              },
              "marca": {
                "type": "string",
                "title": "Marca",
                "description": "Marca del aparato.",
                "maxLength": 80
              },
              "modelo": {
                "type": "string",
                "title": "Modelo",
                "description": "Modelo del aparato.",
                "maxLength": 80
              },
              "numeroSerie": {
                "type": "string",
                "title": "Número de serie",
                "description": "Número de serie del aparato, cuando es legible.",
                "maxLength": 80
              },
              "accesorios": {
                "type": "text",
                "title": "Accesorios entregados",
                "description": "Accesorios que el cliente dejó junto con el aparato (cargador, control, funda…)."
              },
              "estadoFisico": {
                "type": "text",
                "title": "Estado físico",
                "description": "Observaciones del recepcionista sobre golpes, rayas o faltantes visibles al recibir el aparato."
              }
            }
          },
          "defectoInformado": {
            "type": "text",
            "required": true,
            "title": "Defecto informado",
            "description": "Falla que el cliente relata al entregar el aparato, registrada por el recepcionista."
          },
          "diagnostico": {
            "type": "text",
            "title": "Diagnóstico",
            "description": "Diagnóstico del técnico; el cliente lo ve en el portal."
          },
          "anotacionesTecnico": {
            "type": "text",
            "title": "Anotaciones del técnico",
            "description": "Notas internas del técnico sobre el análisis y la reparación; nunca se muestran al cliente."
          },
          "presupuesto": {
            "type": "object",
            "title": "Presupuesto",
            "description": "Valor que se propone al cliente y su respuesta.",
            "fields": {
              "valor": {
                "type": "money",
                "title": "Valor del presupuesto",
                "description": "Valor que el cliente pagará por la reparación; lo define el técnico al emitir el presupuesto y el cliente lo ve en el portal.",
                "min": 0
              },
              "fechaEmision": {
                "type": "timestamp",
                "title": "Fecha de emisión",
                "description": "Momento en que el técnico emitió el presupuesto."
              },
              "fechaRespuesta": {
                "type": "timestamp",
                "title": "Fecha de respuesta",
                "description": "Momento en que el cliente aprobó o rechazó el presupuesto desde el portal."
              },
              "motivoRechazo": {
                "type": "text",
                "title": "Motivo del rechazo",
                "description": "Comentario opcional del cliente al rechazar el presupuesto."
              }
            }
          },
          "reparacion": {
            "type": "object",
            "title": "Reparación",
            "description": "Lo que el técnico realizó en el aparato.",
            "fields": {
              "trabajoRealizado": {
                "type": "text",
                "title": "Trabajo realizado",
                "description": "Descripción de lo que hizo el técnico en la reparación."
              },
              "fechaLista": {
                "type": "timestamp",
                "title": "Fecha de lista",
                "description": "Momento en que el técnico marcó la orden como lista para entrega."
              }
            }
          },
          "entrega": {
            "type": "object",
            "title": "Entrega",
            "description": "Cierre de la orden en el mostrador.",
            "fields": {
              "fechaEntrega": {
                "type": "timestamp",
                "title": "Fecha de entrega",
                "description": "Momento en que el recepcionista entregó el aparato y finalizó la orden."
              },
              "observaciones": {
                "type": "text",
                "title": "Observaciones de entrega",
                "description": "Notas del recepcionista al entregar el aparato."
              }
            }
          },
          "costoInternoPiezas": {
            "type": "money",
            "derived": true,
            "title": "Costo interno de piezas",
            "description": "Suma de la cantidad por el costo interno de cada pieza registrada por el técnico en esta orden; nunca se muestra al cliente."
          },
          "disponibleParaRetiro": {
            "type": "boolean",
            "derived": true,
            "title": "Disponible para retiro",
            "description": "La orden está lista o fue rechazada, y por eso el aparato puede ser retirado por el cliente."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "abierta",
      "reachedBy": "actor"
    },
    {
      "state": "presupuestada",
      "reachedBy": "actor"
    },
    {
      "state": "aprobada",
      "reachedBy": "actor"
    },
    {
      "state": "rechazada",
      "reachedBy": "actor"
    },
    {
      "state": "lista",
      "reachedBy": "actor"
    },
    {
      "state": "finalizada",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "emitirPresupuesto",
      "from": [
        "abierta"
      ],
      "to": "presupuestada",
      "by": [
        "tecnico"
      ],
      "description": "El técnico, con el diagnóstico registrado, define el valor del presupuesto y lo emite para que el cliente lo responda en el portal.",
      "payload": [
        "details.diagnostico",
        "details.presupuesto.valor"
      ],
      "ruleRefs": [
        "presupuestoRequiereDiagnosticoYValor"
      ]
    },
    {
      "transitionId": "aprobarPresupuesto",
      "from": [
        "presupuestada"
      ],
      "to": "aprobada",
      "by": [
        "cliente"
      ],
      "description": "El cliente aprueba el presupuesto de su orden desde el portal y la orden pasa al técnico para la reparación.",
      "payload": [],
      "ruleRefs": [
        "clienteSoloRespondeSusOrdenes"
      ]
    },
    {
      "transitionId": "rechazarPresupuesto",
      "from": [
        "presupuestada"
      ],
      "to": "rechazada",
      "by": [
        "cliente"
      ],
      "description": "El cliente rechaza el presupuesto desde el portal; la orden se cierra como rechazada y el aparato queda disponible para retiro.",
      "payload": [
        "details.presupuesto.motivoRechazo"
      ],
      "ruleRefs": [
        "clienteSoloRespondeSusOrdenes"
      ]
    },
    {
      "transitionId": "marcarLista",
      "from": [
        "aprobada"
      ],
      "to": "lista",
      "by": [
        "tecnico"
      ],
      "description": "El técnico registra lo que hizo en la reparación y marca la orden como lista para entrega.",
      "payload": [
        "details.reparacion.trabajoRealizado"
      ],
      "ruleRefs": [
        "listaRequiereTrabajoRealizado"
      ]
    },
    {
      "transitionId": "finalizar",
      "from": [
        "lista"
      ],
      "to": "finalizada",
      "by": [
        "recepcionista"
      ],
      "description": "El recepcionista entrega el aparato reparado al cliente y finaliza la orden.",
      "payload": [
        "details.entrega.observaciones"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OrdenServicioEntityOrdenServicioType = typeof ordenServicioEntityOrdenServicio;

export default ordenServicioEntityOrdenServicio;
