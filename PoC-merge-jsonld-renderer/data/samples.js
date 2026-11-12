// Sample Work records for the "Load Work sample" button. The RISM record is rebuilt from the example (some labels trimmed). Replace it with a real API response.
const SAMPLE_DATA = {
  "rism": {
    "@context": "https://rism.online/api/v1/work.json",
    "id": "https://rism.online/works/51461",
    "type": "rism:Work",
    "label": {
      "es": [
        "The black knight–Sol Mayor, ETC 1"
      ],
      "pt": [
        "The black knight–Sol maior, ETC 1"
      ],
      "de": [
        "The black knight–G-Dur, ETC 1"
      ],
      "en": [
        "The black knight–G major, ETC 1"
      ],
      "pl": [
        "The black knight–G-dur, ETC 1"
      ],
      "it": [
        "The black knight–Sol maggiore, ETC 1"
      ],
      "fr": [
        "The black knight–Sol majeur, ETC 1"
      ]
    },
    "typeLabel": {
      "en": [
        "Work"
      ]
    },
    "creator": {
      "role": {
        "id": "http://id.loc.gov/vocabulary/relators/cre",
        "label": {
          "es": [
            "Compositor/Autor"
          ],
          "pt": [
            "Compositor/Autor"
          ],
          "de": [
            "Komponist/Autor"
          ],
          "en": [
            "Composer/Author"
          ],
          "pl": [
            "Kompozytor / Autor"
          ],
          "it": [
            "Compositore/Autore"
          ],
          "fr": [
            "Compositeur/Auteur"
          ]
        },
        "value": "cre"
      },
      "relatedTo": {
        "id": "https://rism.online/people/45128",
        "label": {
          "none": [
            "Elgar, Edward (1857-1934)"
          ]
        },
        "type": "rism:Person"
      }
    },
    "summary": [
      {
        "label": {
          "es": [
            "Número de Opus"
          ],
          "pt": [
            "Número de opus"
          ],
          "de": [
            "Opus"
          ],
          "en": [
            "Opus number"
          ],
          "pl": [
            "Numer opus"
          ],
          "it": [
            "N.o d'opera"
          ],
          "fr": [
            "No. de Opus"
          ]
        },
        "value": {
          "none": [
            "op. 25"
          ]
        },
        "type": [
          "dcterms:identifier",
          "pmo:OpusNumberStatement"
        ]
      },
      {
        "label": {
          "es": [
            "Tonalidad o modo"
          ],
          "pt": [
            "Tonalidade, modo"
          ],
          "de": [
            "Tonart, Modus"
          ],
          "en": [
            "Key or mode"
          ],
          "pl": [
            "Tonacja lub modus"
          ],
          "it": [
            "Tonalità, modo"
          ],
          "fr": [
            "Tonalité, mode"
          ]
        },
        "value": {
          "es": [
            "Sol Mayor"
          ],
          "pt": [
            "Sol maior"
          ],
          "de": [
            "G-Dur"
          ],
          "en": [
            "G major"
          ],
          "pl": [
            "G-dur"
          ],
          "it": [
            "Sol maggiore"
          ],
          "fr": [
            "Sol majeur"
          ]
        }
      },
      {
        "label": {
          "es": [
            "Resumen de Plantilla/Orgánico"
          ],
          "pt": [
            "Sintese da formação instrumental"
          ],
          "de": [
            "Besetzungshinweis"
          ],
          "en": [
            "Scoring summary"
          ],
          "pl": [
            "Podsumowanie obsady"
          ],
          "it": [
            "Organico sintetico"
          ],
          "fr": [
            "Instrumentation condensée"
          ]
        },
        "value": {
          "none": [
            "Coro, orch"
          ]
        }
      },
      {
        "label": {
          "es": [
            "Íncipit literario"
          ],
          "pt": [
            "Incipit literário"
          ],
          "de": [
            "Textincipit"
          ],
          "en": [
            "Text incipit"
          ],
          "pl": [
            "Incipit tekstowy"
          ],
          "it": [
            "Incipit testuale"
          ],
          "fr": [
            "Incipit du texte"
          ]
        },
        "value": {
          "none": [
            "'Twas Pentecost, the Feast of Gladness"
          ]
        }
      },
      {
        "label": {
          "es": [
            "Título uniforme"
          ],
          "pt": [
            "Título uniforme"
          ],
          "de": [
            "Einordnungstitel"
          ],
          "en": [
            "Standardized title"
          ],
          "pl": [
            "Znormalizowany tytuł"
          ],
          "it": [
            "Titolo uniforme"
          ],
          "fr": [
            "Titre uniforme"
          ]
        },
        "value": {
          "none": [
            "The black knight"
          ]
        },
        "type": [
          "dcterms:title",
          "rism:StandardizedTitle"
        ]
      },
      {
        "label": {
          "es": [
            "Fechas"
          ],
          "pt": [
            "Datas"
          ],
          "de": [
            "Datierungen"
          ],
          "en": [
            "Dates"
          ],
          "pl": [
            "Daty"
          ],
          "it": [
            "Date"
          ],
          "fr": [
            "Dates"
          ]
        },
        "value": {
          "none": [
            "1893 (1889-1893)"
          ]
        }
      },
      {
        "label": {
          "en": [
            "RISM ID number"
          ]
        },
        "value": {
          "none": [
            "works/51461"
          ]
        }
      }
    ],
    "partOf": {
      "label": {
        "es": [
          "Ítem integrante de"
        ],
        "pt": [
          "Item parte de"
        ],
        "de": [
          "In"
        ],
        "en": [
          "Item part of"
        ],
        "pl": [
          "Jest częścią…"
        ],
        "it": [
          "Fa parte di"
        ],
        "fr": [
          "Fait partie de"
        ]
      },
      "type": "rism:PartOfSection",
      "items": [
        {
          "relationshipType": "rism:PrimaryPartOf",
          "relatedTo": {
            "id": "https://rism.online/publications/51004623",
            "label": {
              "none": [
                "Elgar Thematic Catalogue"
              ]
            },
            "type": "rism:Publication",
            "typeLabel": {
              "en": [
                "Work catalog"
              ]
            },
            "status": {
              "label": {
                "en": [
                  "Partially completed"
                ]
              },
              "value": "partial"
            }
          },
          "workNumber": "ETC 1"
        },
        {
          "relationshipType": "rism:SecondaryPartOf",
          "relatedTo": {
            "id": "https://rism.online/publications/51004444",
            "label": {
              "none": [
                "Edward Elgar : a thematic catalogue and research guide"
              ]
            },
            "type": "rism:Publication",
            "typeLabel": {
              "en": [
                "Work catalog"
              ]
            },
            "status": {
              "label": {
                "en": [
                  "Alternate"
                ]
              },
              "value": "alternate"
            }
          },
          "workNumber": "KenE 1892-6"
        }
      ]
    },
    "recordHistory": {
      "type": "rism:RecordHistory",
      "created": {
        "label": {
          "en": [
            "Created on"
          ]
        },
        "value": "2026-04-08T08:22:28Z"
      },
      "updated": {
        "label": {
          "en": [
            "Last modification"
          ]
        },
        "value": "2026-09-02T11:48:06Z"
      }
    },
    "incipits": {
      "id": "https://rism.online/works/51461/incipits",
      "type": "rism:WorkIncipitsSection",
      "items": [
        {
          "id": "https://rism.online/works/51461/incipits/1.1.1",
          "type": "rism:Incipit",
          "label": {
            "none": [
              "1.1.1 Allegro maestoso"
            ]
          },
          "summary": [
            {
              "label": {
                "es": [
                  "Título del movimiento, tempo"
                ],
                "pt": [
                  "Título do movimento, tempo"
                ],
                "de": [
                  "Satztitel, Tempo"
                ],
                "en": [
                  "Title of movement, tempo"
                ],
                "pl": [
                  "Tytuł części, tempo"
                ],
                "it": [
                  "Intestazione, tempo"
                ],
                "fr": [
                  "Titre, tempo"
                ]
              },
              "value": {
                "none": [
                  "Allegro maestoso"
                ]
              }
            },
            {
              "label": {
                "es": [
                  "Íncipit literario"
                ],
                "pt": [
                  "Incipit literário"
                ],
                "de": [
                  "Textincipit"
                ],
                "en": [
                  "Text incipit"
                ],
                "pl": [
                  "Incipit tekstowy"
                ],
                "it": [
                  "Incipit testuale"
                ],
                "fr": [
                  "Incipit du texte"
                ]
              },
              "value": {
                "none": [
                  "'Twas Pentecost, the Feast of Gladness"
                ]
              }
            },
            {
              "label": {
                "es": [
                  "Tonalidad o modo"
                ],
                "pt": [
                  "Tonalidade, modo"
                ],
                "de": [
                  "Tonart, Modus"
                ],
                "en": [
                  "Key or mode"
                ],
                "pl": [
                  "Tonacja lub modus"
                ],
                "it": [
                  "Tonalità, modo"
                ],
                "fr": [
                  "Tonalité, mode"
                ]
              },
              "value": {
                "es": [
                  "Sol Mayor"
                ],
                "pt": [
                  "Sol maior"
                ],
                "de": [
                  "G-Dur"
                ],
                "en": [
                  "G major"
                ],
                "pl": [
                  "G-dur"
                ],
                "it": [
                  "Sol maggiore"
                ],
                "fr": [
                  "Sol majeur"
                ]
              }
            },
            {
              "label": {
                "es": [
                  "Indicación de compás"
                ],
                "pt": [
                  "Compasso"
                ],
                "de": [
                  "Metrum"
                ],
                "en": [
                  "Time signature"
                ],
                "pl": [
                  "Metrum"
                ],
                "it": [
                  "Misura"
                ],
                "fr": [
                  "Indication de mesure"
                ]
              },
              "value": {
                "none": [
                  "3/4"
                ]
              }
            }
          ],
          "properties": {
            "keysig": "n",
            "timesig": "3/4"
          }
        }
      ]
    },
    "formOfWork": {
      "items": [
        {
          "id": "https://rism.online/subjects/50001734",
          "type": "rism:Subject",
          "label": {
            "none": [
              "Choral music"
            ]
          },
          "value": "Choral+music"
        },
        {
          "id": "https://rism.online/subjects/25226",
          "type": "rism:Subject",
          "label": {
            "none": [
              "Cantatas"
            ]
          },
          "value": "Cantatas"
        }
      ]
    },
    "referencesNotes": {
      "id": "https://rism.online/works/51461/references-notes",
      "type": "rism:ReferencesNotesSection",
      "notes": [
        {
          "label": {
            "es": [
              "Catálogo de obras"
            ],
            "pt": [
              "Catálogo de obras"
            ],
            "de": [
              "Werkverzeichnis"
            ],
            "en": [
              "Catalog of works"
            ],
            "pl": [
              "Katalog utworów"
            ],
            "it": [
              "Catalogo delle opere"
            ],
            "fr": [
              "Catalogue des oeuvres"
            ]
          },
          "value": {
            "none": [
              "<span>[No author]. <i>Elgar Thematic Catalogue.</i>.</span> [ETC, 1]."
            ]
          }
        }
      ]
    },
    "relationships": {
      "id": "https://rism.online/works/51461/relationships",
      "items": [
        {
          "role": {
            "id": "http://id.loc.gov/vocabulary/relators/trl",
            "label": {
              "es": [
                "Traductor"
              ],
              "pt": [
                "Tradutor"
              ],
              "de": [
                "Übersetzer"
              ],
              "en": [
                "Translator"
              ],
              "pl": [
                "Tłumacz"
              ],
              "it": [
                "Traduttore"
              ],
              "fr": [
                "Traducteur"
              ]
            },
            "value": "trl"
          },
          "relatedTo": {
            "id": "https://rism.online/people/122036",
            "label": {
              "none": [
                "Longfellow, Henry Wadsworth (1807-1882)"
              ]
            },
            "type": "rism:Person"
          }
        },
        {
          "role": {
            "id": "http://id.loc.gov/vocabulary/relators/lyr",
            "label": {
              "es": [
                "Letrista"
              ],
              "pt": [
                "Letrista"
              ],
              "de": [
                "Textdichter"
              ],
              "en": [
                "Lyricist"
              ],
              "pl": [
                "Autor słów"
              ],
              "it": [
                "Poeta"
              ],
              "fr": [
                "Parolier"
              ]
            },
            "value": "lyr"
          },
          "relatedTo": {
            "id": "https://rism.online/people/127696",
            "label": {
              "none": [
                "Uhland, Ludwig (1787-1862)"
              ]
            },
            "type": "rism:Person"
          }
        },
        {
          "role": {
            "id": "http://id.loc.gov/vocabulary/relators/dte",
            "label": {
              "es": [
                "Dedicatario(a)"
              ],
              "pt": [
                "Dedicatário(a)"
              ],
              "de": [
                "Widmungsträger"
              ],
              "en": [
                "Dedicatee"
              ],
              "pl": [
                "Adresat dedykacji"
              ],
              "it": [
                "Dedicatario"
              ],
              "fr": [
                "Dédicataire"
              ]
            },
            "value": "dte"
          },
          "relatedTo": {
            "id": "https://rism.online/people/51041597",
            "label": {
              "none": [
                "Blair, Hugh (1864-1932)"
              ]
            },
            "type": "rism:Person"
          }
        }
      ]
    },
    "properties": {
      "keyMode": "G",
      "dates": {
        "earliestDate": 1893,
        "latestDate": 1893,
        "dateStatement": "1893 (1889-1893)"
      }
    }
  },
  "suppa": {
    "@context": "https://imranasif87.github.io/ETC-API/api/v1/work.json",
    "id": "https://rism.online/works/51461",
    "type": "suppa:Work",
    "derivedFrom": "https://rism.online/works/51461",
    "created": "2026-02-04T11:15:00Z",
    "updated": "2026-07-20T14:32:00Z",
    "etcIdentifier": "ETC-44",
    "relationships": {
      "items": [
        {
          "role": "etcrel:author",
          "relatedTo": "https://rism.online/people/45128",
          "note": "Edward Elgar"
        },
        {
          "role": "etcrel:recipient",
          "note": "August Jaeger",
          "certainty": "confirmed"
        },
        {
          "role": "etcrel:place",
          "note": "Malvern"
        },
        {
          "role": "etcrel:work",
          "relatedTo": "https://etc.web.ox.ac.uk/suppa/works/sea-pictures",
          "note": "Letter discusses progress on the Sea Pictures orchestration"
        }
      ]
    },
    "themes": {
      "items": [
        {
          "label": "Recurring wave-motif figure, first heard in 'Sea Slumber Song'",
          "relatedTo": "https://etc.web.ox.ac.uk/suppa/themes/example-sea-pictures-wave-motif"
        }
      ]
    },
    "dedicatees": {
      "items": [
        {
          "relatedTo": "https://etc.web.ox.ac.uk/suppa/people/example-clara-butt"
        }
      ]
    },
    "textSource": "Five settings of poems by Roden Noel, Elizabeth Barrett Browning, Richard Garnett, Adam Lindsay Gordon, and the composer's wife, Alice Elgar",
    "events": {
      "items": [
        {
          "type": "premiere",
          "place": "https://etc.web.ox.ac.uk/suppa/places/norwich",
          "date": "1899-10-05",
          "relatedTo": "https://etc.web.ox.ac.uk/suppa/events/sea-pictures-premiere-1899"
        }
      ]
    },
    "documents": {
      "items": [
        {
          "format": "programme",
          "date": "1899-10-05",
          "relatedTo": "https://etc.web.ox.ac.uk/suppa/documents/norwich-festival-programme-1899"
        }
      ]
    },
    "literature": {
      "items": [
        {
          "citation": "Kennedy, Michael. 1968. Portrait of Elgar. London: Oxford University Press."
        },
        {
          "citation": "Kent, Christopher. 2013. Edward Elgar: A Thematic Catalogue and Research Guide. New York; London: Routledge."
        }
      ]
    },
    "workNotes": "Illustrative example record. Values, including the derivedFrom RISM work URI, are placeholders for schema demonstration purposes and have not been verified against a live RISM work record."
  }
};

if (typeof module !== "undefined") module.exports = SAMPLE_DATA;
