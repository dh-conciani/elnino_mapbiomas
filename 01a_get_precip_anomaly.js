/********************************************************************************
 * PRECIPITATION ANOMALY — STRONG EL NIÑO EVENTS
 *
 * ERA5-Land Monthly Aggregated
 * ECMWF/ERA5_LAND/MONTHLY_AGGR
 *
 * OBJECTIVE
 * ---------
 * Compare precipitation observed during EACH strong El Niño event against
 * a reference climatology composed of years without strong El Niño.
 *
 *
 * STRONG EL NIÑO EVENTS
 * ---------------------
 *
 *   1982/83
 *   1997/98
 *   2015/16
 *
 *
 * REFERENCE PERIOD
 * ----------------
 *
 *   1991–2020
 *
 * Strong El Niño seasons occurring inside the reference period are excluded.
 *
 *
 * ANOMALY
 * -------
 *
 *   anomaly(event, trimester)
 *
 *       =
 *
 *   precipitation(event, trimester)
 *
 *       -
 *
 *   mean precipitation(reference years, trimester)
 *
 *
 * PRODUCTS
 * --------
 *
 * 12 event-specific precipitation anomaly maps:
 *
 *   1982/83:
 *     DJF
 *     MAM
 *     JJA
 *     SON
 *
 *   1997/98:
 *     DJF
 *     MAM
 *     JJA
 *     SON
 *
 *   2015/16:
 *     DJF
 *     MAM
 *     JJA
 *     SON
 *
 *
 * Plus:
 *
 *   4 inter-event standard deviation maps
 *
 *     DJF
 *     MAM
 *     JJA
 *     SON
 *
 ********************************************************************************/


// =============================================================================
// 1. CONFIG
// =============================================================================

var CONFIG = {

  anoInicialReferencia:
    1991,

  anoFinalReferencia:
    2020,

  escalaExportacao:
    11132,

  assetDir:
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO'

};


// =============================================================================
// 2. STRONG EL NIÑO EVENTS
// =============================================================================

/*
 * The year stored for each trimester is the year in which
 * the trimester STARTS.
 *
 * Example:
 *
 * DJF 1982/83 starts in December 1982.
 *
 * MAM 1983 starts in March 1983.
 */


var EVENTOS = [

  {

    nome:
      '1982_83',

    label:
      '1982/83',

    DJF:
      1982,

    MAM:
      1983,

    JJA:
      1983,

    SON:
      1982

  },


  {

    nome:
      '1997_98',

    label:
      '1997/98',

    DJF:
      1997,

    MAM:
      1998,

    JJA:
      1998,

    SON:
      1997

  },


  {

    nome:
      '2015_16',

    label:
      '2015/16',

    DJF:
      2015,

    MAM:
      2016,

    JJA:
      2016,

    SON:
      2015

  }

];


// =============================================================================
// 3. TRIMESTERS
// =============================================================================

var TRIMESTRES = {

  DJF: {

    meses:
      [12, 1, 2],

    mesInicial:
      12,

    // Years in which strong-event DJF starts.
    anosEventos:
      [1982, 1997, 2015]

  },


  MAM: {

    meses:
      [3, 4, 5],

    mesInicial:
      3,

    anosEventos:
      [1983, 1998, 2016]

  },


  JJA: {

    meses:
      [6, 7, 8],

    mesInicial:
      6,

    anosEventos:
      [1983, 1998, 2016]

  },


  SON: {

    meses:
      [9, 10, 11],

    mesInicial:
      9,

    anosEventos:
      [1982, 1997, 2015]

  }

};


var NOMES_TRIMESTRES = [

  'DJF',
  'MAM',
  'JJA',
  'SON'

];


// =============================================================================
// 4. BRAZIL
// =============================================================================

var paises = ee.FeatureCollection(
  'FAO/GAUL/2015/level0'
);


var brasilFeature = ee.Feature(

  paises

    .filter(

      ee.Filter.eq(
        'ADM0_NAME',
        'Brazil'
      )

    )

    .first()

);


var brasil =
  brasilFeature.geometry();


var brasilExport =
  brasil.simplify(
    1000
  );


// States only for visual reference.

var estados = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
)

.filter(

  ee.Filter.eq(
    'ADM0_NAME',
    'Brazil'
  )

);


Map.centerObject(
  brasil,
  4
);


// =============================================================================
// 5. ERA5-LAND
// =============================================================================

/*
 * DJF 2020 requires:
 *
 * December 2020
 * January 2021
 * February 2021
 *
 * Therefore ERA5 is loaded through March 2021.
 */


var era5Land = ee.ImageCollection(
  'ECMWF/ERA5_LAND/MONTHLY_AGGR'
)

  .filterDate(
    '1981-01-01',
    '2021-03-01'
  )

  .select(
    'total_precipitation_sum'
  )

  .map(

    function(image) {


      // meters -> millimeters

      var precipitacao = image

        .multiply(
          1000
        )

        // Remove small negative numerical artifacts.
        .max(
          0
        )

        .rename(
          'precipitacao_mm'
        );


      return precipitacao

        .copyProperties(

          image,

          [
            'system:time_start'
          ]

        );

    }

  );


// =============================================================================
// 6. TRIMESTER TOTAL
// =============================================================================

function calcularTotalTrimestral(
  anoInicial,
  mesInicial
) {


  anoInicial =
    ee.Number(
      anoInicial
    );


  var inicio = ee.Date.fromYMD(

    anoInicial,
    mesInicial,
    1

  );


  var fim = inicio.advance(
    3,
    'month'
  );


  /*
   * Example:
   *
   * DJF 1997/98
   *
   * =
   *
   * December 1997
   * +
   * January 1998
   * +
   * February 1998
   */


  return era5Land

    .filterDate(
      inicio,
      fim
    )

    .sum()

    .rename(
      'precipitacao_mm'
    )

    .toFloat();

}


// =============================================================================
// 7. REFERENCE YEARS FOR EACH TRIMESTER
// =============================================================================

function obterAnosReferencia(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[
      nomeTrimestre
    ];


  /*
   * Start with:
   *
   * 1991 ... 2020
   *
   * Then remove strong El Niño seasons.
   *
   *
   * Example DJF:
   *
   * strong events:
   *
   * 1982
   * 1997
   * 2015
   *
   * Within 1991–2020:
   *
   * 1997
   * 2015
   *
   * Therefore those seasons are excluded.
   */


  return ee.List.sequence(

    CONFIG.anoInicialReferencia,

    CONFIG.anoFinalReferencia

  )

  .removeAll(

    ee.List(
      config.anosEventos
    )

  );

}


// =============================================================================
// 8. REFERENCE COLLECTION
// =============================================================================

function criarColecaoReferencia(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[
      nomeTrimestre
    ];


  var anosReferencia =
    obterAnosReferencia(
      nomeTrimestre
    );


  var imagensReferencia =
    anosReferencia.map(

      function(ano) {


        ano =
          ee.Number(
            ano
          );


        return calcularTotalTrimestral(

          ano,

          config.mesInicial

        )

        .set({

          reference_year:
            ano,

          trimester:
            nomeTrimestre,

          dataset:
            'ERA5-Land'

        });

      }

    );


  return ee.ImageCollection.fromImages(
    imagensReferencia
  );

}


// =============================================================================
// 9. REFERENCE CLIMATOLOGY
// =============================================================================

function calcularMediaReferencia(
  nomeTrimestre
) {


  return criarColecaoReferencia(
    nomeTrimestre
  )

    .mean()

    .rename(
      'referencia_mm'
    )

    .toFloat()

    .set({

      variable:
        'reference_precipitation',

      trimester:
        nomeTrimestre,

      unit:
        'mm',

      reference_period:
        '1991-2020',

      reference_type:
        'years_without_strong_el_nino',

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR'

    });

}


// =============================================================================
// 10. EVENT-SPECIFIC ANOMALY
// =============================================================================

function calcularAnomaliaEvento(
  nomeTrimestre,
  anoEvento,
  nomeEvento,
  labelEvento
) {


  var config =
    TRIMESTRES[
      nomeTrimestre
    ];


  // ---------------------------------------------------------------------------
  // Observed precipitation during THIS El Niño event.
  // ---------------------------------------------------------------------------

  var observado =
    calcularTotalTrimestral(

      anoEvento,

      config.mesInicial

    );


  // ---------------------------------------------------------------------------
  // Reference precipitation without strong El Niño seasons.
  // ---------------------------------------------------------------------------

  var referencia =
    calcularMediaReferencia(
      nomeTrimestre
    );


  /*
   * ANOMALY =
   *
   * precipitation during individual event
   *
   * -
   *
   * mean precipitation during reference years
   * without strong El Niño.
   */


  return observado

    .subtract(
      referencia
    )

    .rename(
      'anomalia_mm'
    )

    .toFloat()

    .set({

      variable:
        'precipitation_anomaly',

      event:
        nomeEvento,

      event_label:
        labelEvento,

      event_start_year:
        anoEvento,

      trimester:
        nomeTrimestre,

      unit:
        'mm',

      reference_period:
        '1991-2020',

      reference:
        'years_without_strong_el_nino',

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR'

    });

}


// =============================================================================
// 11. CALCULATE ALL 12 EVENT-SPECIFIC ANOMALIES
// =============================================================================

var resultados = {};


EVENTOS.forEach(

  function(evento) {


    resultados[
      evento.nome
    ] = {};


    NOMES_TRIMESTRES.forEach(

      function(nomeTrimestre) {


        var anoEvento =
          evento[
            nomeTrimestre
          ];


        resultados[
          evento.nome
        ][
          nomeTrimestre
        ] = calcularAnomaliaEvento(

          nomeTrimestre,

          anoEvento,

          evento.nome,

          evento.label

        );

      }

    );

  }

);


// =============================================================================
// 12. COLLECTION OF EVENT ANOMALIES FOR ONE TRIMESTER
// =============================================================================

function criarColecaoAnomaliasEventos(
  nomeTrimestre
) {


  var imagens =
    EVENTOS.map(

      function(evento) {


        return resultados[
          evento.nome
        ][
          nomeTrimestre
        ];

      }

    );


  return ee.ImageCollection.fromImages(
    imagens
  );

}


// =============================================================================
// 13. INTER-EVENT STANDARD DEVIATION
// =============================================================================

function calcularDesvioPadraoAnomalias(
  nomeTrimestre
) {


  /*
   * Standard deviation between:
   *
   * anomaly 1982/83
   * anomaly 1997/98
   * anomaly 2015/16
   *
   *
   * Because the SAME reference is subtracted from
   * every event:
   *
   * SD(anomalies)
   *
   * =
   *
   * SD(raw event precipitation)
   *
   *
   * LOW SD:
   * more consistent precipitation response.
   *
   * HIGH SD:
   * greater difference among strong El Niño events.
   */


  return criarColecaoAnomaliasEventos(
    nomeTrimestre
  )

    .reduce(
      ee.Reducer.stdDev()
    )

    .rename(
      'stddev_anomalias_mm'
    )

    .toFloat()

    .set({

      variable:
        'precipitation_anomaly_inter_event_stddev',

      trimester:
        nomeTrimestre,

      unit:
        'mm',

      events:
        '1982/83, 1997/98, 2015/16',

      reference:
        '1991-2020 years without strong El Nino',

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR'

    });

}


// =============================================================================
// 14. STANDARD DEVIATION PRODUCTS
// =============================================================================

var resultadosStdDev = {};


NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    resultadosStdDev[
      nomeTrimestre
    ] = calcularDesvioPadraoAnomalias(
      nomeTrimestre
    );

  }

);


// =============================================================================
// 15. VISUALIZATION — PRECIPITATION ANOMALY
// =============================================================================

var VIS_ANOMALIA = {

  min:
    -300,

  max:
    300,

  palette: [

    '8b0000',
    'b2182b',
    'd6604d',
    'f4a582',
    'fddbc7',
    'fff7bc',

    'ffffff',

    'd1e5f0',
    '92c5de',
    '4393c3',
    '2166ac',
    '053061'

  ]

};


// =============================================================================
// 16. VISUALIZATION — STANDARD DEVIATION
// =============================================================================

var VIS_STDDEV = {

  min:
    0,

  max:
    200,

  palette: [

    'ffffff',
    'ffffcc',
    'ffeda0',
    'fed976',
    'feb24c',
    'fd8d3c',
    'fc4e2a',
    'e31a1c',
    'bd0026',
    '800026'

  ]

};


// =============================================================================
// 17. MAPS — 1982/83
// =============================================================================

Map.addLayer(

  resultados['1982_83'].DJF.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '01 | 1982/83 — DJF',

  true

);


Map.addLayer(

  resultados['1982_83'].MAM.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '02 | 1982/83 — MAM',

  false

);


Map.addLayer(

  resultados['1982_83'].JJA.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '03 | 1982/83 — JJA',

  false

);


Map.addLayer(

  resultados['1982_83'].SON.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '04 | 1982/83 — SON',

  false

);


// =============================================================================
// 18. MAPS — 1997/98
// =============================================================================

Map.addLayer(

  resultados['1997_98'].DJF.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '05 | 1997/98 — DJF',

  false

);


Map.addLayer(

  resultados['1997_98'].MAM.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '06 | 1997/98 — MAM',

  false

);


Map.addLayer(

  resultados['1997_98'].JJA.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '07 | 1997/98 — JJA',

  false

);


Map.addLayer(

  resultados['1997_98'].SON.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '08 | 1997/98 — SON',

  false

);


// =============================================================================
// 19. MAPS — 2015/16
// =============================================================================

Map.addLayer(

  resultados['2015_16'].DJF.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '09 | 2015/16 — DJF',

  false

);


Map.addLayer(

  resultados['2015_16'].MAM.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '10 | 2015/16 — MAM',

  false

);


Map.addLayer(

  resultados['2015_16'].JJA.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '11 | 2015/16 — JJA',

  false

);


Map.addLayer(

  resultados['2015_16'].SON.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '12 | 2015/16 — SON',

  false

);


// =============================================================================
// 20. STANDARD DEVIATION MAPS
// =============================================================================

Map.addLayer(

  resultadosStdDev.DJF.clip(
    brasilExport
  ),

  VIS_STDDEV,

  '13 | Inter-event SD — DJF',

  false

);


Map.addLayer(

  resultadosStdDev.MAM.clip(
    brasilExport
  ),

  VIS_STDDEV,

  '14 | Inter-event SD — MAM',

  false

);


Map.addLayer(

  resultadosStdDev.JJA.clip(
    brasilExport
  ),

  VIS_STDDEV,

  '15 | Inter-event SD — JJA',

  false

);


Map.addLayer(

  resultadosStdDev.SON.clip(
    brasilExport
  ),

  VIS_STDDEV,

  '16 | Inter-event SD — SON',

  false

);


// =============================================================================
// 21. OPTIONAL — REFERENCE CLIMATOLOGY MAPS
// =============================================================================

Map.addLayer(

  calcularMediaReferencia(
    'DJF'
  ).clip(
    brasilExport
  ),

  {
    min:
      0,

    max:
      1000,

    palette: [
      'ffffcc',
      'c2e699',
      '78c679',
      '31a354',
      '006837'
    ]
  },

  'Reference precipitation — DJF',

  false

);


Map.addLayer(

  calcularMediaReferencia(
    'MAM'
  ).clip(
    brasilExport
  ),

  {
    min:
      0,

    max:
      1000,

    palette: [
      'ffffcc',
      'c2e699',
      '78c679',
      '31a354',
      '006837'
    ]
  },

  'Reference precipitation — MAM',

  false

);


Map.addLayer(

  calcularMediaReferencia(
    'JJA'
  ).clip(
    brasilExport
  ),

  {
    min:
      0,

    max:
      1000,

    palette: [
      'ffffcc',
      'c2e699',
      '78c679',
      '31a354',
      '006837'
    ]
  },

  'Reference precipitation — JJA',

  false

);


Map.addLayer(

  calcularMediaReferencia(
    'SON'
  ).clip(
    brasilExport
  ),

  {
    min:
      0,

    max:
      1000,

    palette: [
      'ffffcc',
      'c2e699',
      '78c679',
      '31a354',
      '006837'
    ]
  },

  'Reference precipitation — SON',

  false

);


// =============================================================================
// 22. STATE BOUNDARIES
// =============================================================================

var linhasEstados = ee.Image()

  .byte()

  .paint({

    featureCollection:
      estados,

    color:
      1,

    width:
      1

  })

  .selfMask();


Map.addLayer(

  linhasEstados,

  {

    palette:
      ['555555']

  },

  'State boundaries',

  true

);


// =============================================================================
// 23. GENERIC LEGEND ROW
// =============================================================================

function adicionarLinhaLegenda(
  painel,
  cor,
  texto
) {


  var caixaCor = ui.Label({

    style: {

      backgroundColor:
        '#' + cor,

      padding:
        '8px',

      margin:
        '0 6px 3px 0',

      border:
        '1px solid #999999'

    }

  });


  var label = ui.Label({

    value:
      texto,

    style: {

      fontSize:
        '11px',

      margin:
        '0 0 3px 0'

    }

  });


  painel.add(

    ui.Panel({

      widgets: [

        caixaCor,
        label

      ],

      layout:
        ui.Panel.Layout.Flow(
          'horizontal'
        )

    })

  );

}


// =============================================================================
// 24. ANOMALY LEGEND
// =============================================================================

function adicionarLegendaAnomalia() {


  var painel = ui.Panel({

    style: {

      position:
        'bottom-left',

      padding:
        '8px 12px',

      backgroundColor:
        'ffffff'

    }

  });


  painel.add(

    ui.Label({

      value:
        'El Niño precipitation anomaly',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '14px'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'event − non-El Niño reference',

      style: {

        fontSize:
          '11px',

        margin:
          '0 0 2px 0'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'mm per trimester',

      style: {

        fontSize:
          '11px',

        margin:
          '0 0 8px 0'

      }

    })

  );


  var cores = [

    '8b0000',
    'd6604d',
    'f4a582',
    'fddbc7',

    'ffffff',

    'd1e5f0',
    '4393c3',
    '053061'

  ];


  var textos = [

    '≤ −300 mm',
    '−300 to −200 mm',
    '−200 to −100 mm',
    '−100 to 0 mm',

    '≈ 0 mm',

    '0 to 100 mm',
    '100 to 200 mm',
    '≥ 300 mm'

  ];


  for (
    var i = 0;
    i < cores.length;
    i++
  ) {


    adicionarLinhaLegenda(

      painel,

      cores[i],

      textos[i]

    );

  }


  painel.add(

    ui.Label({

      value:
        'Reference: 1991–2020',

      style: {

        fontSize:
          '10px',

        color:
          '666666',

        margin:
          '7px 0 0 0'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'Strong El Niño seasons excluded',

      style: {

        fontSize:
          '10px',

        color:
          '666666',

        margin:
          '2px 0 0 0'

      }

    })

  );


  Map.add(
    painel
  );

}


adicionarLegendaAnomalia();


// =============================================================================
// 25. STANDARD DEVIATION LEGEND
// =============================================================================

function adicionarLegendaStdDev() {


  var painel = ui.Panel({

    style: {

      position:
        'bottom-right',

      padding:
        '8px 12px',

      backgroundColor:
        'ffffff'

    }

  });


  painel.add(

    ui.Label({

      value:
        'Inter-event variability',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '14px'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'SD of event anomalies — mm',

      style: {

        fontSize:
          '11px',

        margin:
          '0 0 8px 0'

      }

    })

  );


  var cores = [

    'ffffff',
    'ffffcc',
    'ffeda0',
    'fed976',
    'feb24c',
    'fd8d3c',
    'fc4e2a',
    'e31a1c',
    'bd0026',
    '800026'

  ];


  var textos = [

    '0–20 mm',
    '20–40 mm',
    '40–60 mm',
    '60–80 mm',
    '80–100 mm',
    '100–120 mm',
    '120–140 mm',
    '140–160 mm',
    '160–180 mm',
    '180–200+ mm'

  ];


  for (
    var i = 0;
    i < cores.length;
    i++
  ) {


    adicionarLinhaLegenda(

      painel,

      cores[i],

      textos[i]

    );

  }


  painel.add(

    ui.Label({

      value:
        'Low SD = similar event response',

      style: {

        fontSize:
          '10px',

        color:
          '666666',

        margin:
          '7px 0 0 0'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'High SD = stronger event differences',

      style: {

        fontSize:
          '10px',

        color:
          '666666',

        margin:
          '2px 0 0 0'

      }

    })

  );


  Map.add(
    painel
  );

}


adicionarLegendaStdDev();


// =============================================================================
// 26. EXPORT — 12 EVENT-SPECIFIC ANOMALIES
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_TRIMESTRES.forEach(

      function(nomeTrimestre) {


        var nomeAsset =

          'precip_anomaly_elnino_' +

          evento.nome +

          '_' +

          nomeTrimestre;


        var assetId =

          CONFIG.assetDir +

          '/' +

          nomeAsset;


        var image =

          resultados[
            evento.nome
          ][
            nomeTrimestre
          ];


        Export.image.toAsset({

          image:
            image,

          description:
            nomeAsset,

          assetId:
            assetId,

          region:
            brasilExport,

          scale:
            CONFIG.escalaExportacao,

          crs:
            'EPSG:4326',

          maxPixels:
            1e13,

          shardSize:
            128,

          pyramidingPolicy: {

            'anomalia_mm':
              'mean'

          }

        });


        print(

          'Anomaly export:',

          assetId

        );

      }

    );

  }

);


// =============================================================================
// 27. EXPORT — 4 INTER-EVENT STANDARD DEVIATION MAPS
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =

      'precip_anomaly_stddev_elnino_' +

      nomeTrimestre;


    var assetId =

      CONFIG.assetDir +

      '/' +

      nomeAsset;


    Export.image.toAsset({

      image:
        resultadosStdDev[
          nomeTrimestre
        ],

      description:
        nomeAsset,

      assetId:
        assetId,

      region:
        brasilExport,

      scale:
        CONFIG.escalaExportacao,

      crs:
        'EPSG:4326',

      maxPixels:
        1e13,

      shardSize:
        128,

      pyramidingPolicy: {

        'stddev_anomalias_mm':
          'mean'

      }

    });


    print(

      'SD export:',

      assetId

    );

  }

);


// =============================================================================
// 28. CHECK REFERENCE YEARS
// =============================================================================

print(
  'Reference years — DJF',
  obterAnosReferencia(
    'DJF'
  )
);


print(
  'Reference years — MAM',
  obterAnosReferencia(
    'MAM'
  )
);


print(
  'Reference years — JJA',
  obterAnosReferencia(
    'JJA'
  )
);


print(
  'Reference years — SON',
  obterAnosReferencia(
    'SON'
  )
);


// =============================================================================
// 29. CHECK REFERENCE COLLECTION SIZE
// =============================================================================

print(

  'Reference N — DJF',

  criarColecaoReferencia(
    'DJF'
  ).size()

);


print(

  'Reference N — MAM',

  criarColecaoReferencia(
    'MAM'
  ).size()

);


print(

  'Reference N — JJA',

  criarColecaoReferencia(
    'JJA'
  ).size()

);


print(

  'Reference N — SON',

  criarColecaoReferencia(
    'SON'
  ).size()

);


// =============================================================================
// 30. CHECK EVENT ANOMALIES
// =============================================================================

print(
  '1982/83 — DJF',
  resultados['1982_83'].DJF
);


print(
  '1982/83 — MAM',
  resultados['1982_83'].MAM
);


print(
  '1982/83 — JJA',
  resultados['1982_83'].JJA
);


print(
  '1982/83 — SON',
  resultados['1982_83'].SON
);


print(
  '1997/98 — DJF',
  resultados['1997_98'].DJF
);


print(
  '1997/98 — MAM',
  resultados['1997_98'].MAM
);


print(
  '1997/98 — JJA',
  resultados['1997_98'].JJA
);


print(
  '1997/98 — SON',
  resultados['1997_98'].SON
);


print(
  '2015/16 — DJF',
  resultados['2015_16'].DJF
);


print(
  '2015/16 — MAM',
  resultados['2015_16'].MAM
);


print(
  '2015/16 — JJA',
  resultados['2015_16'].JJA
);


print(
  '2015/16 — SON',
  resultados['2015_16'].SON
);


// =============================================================================
// 31. CHECK STANDARD DEVIATION
// =============================================================================

print(
  'Inter-event anomaly SD — DJF',
  resultadosStdDev.DJF
);


print(
  'Inter-event anomaly SD — MAM',
  resultadosStdDev.MAM
);


print(
  'Inter-event anomaly SD — JJA',
  resultadosStdDev.JJA
);


print(
  'Inter-event anomaly SD — SON',
  resultadosStdDev.SON
);


// =============================================================================
// 32. FINAL CHECK
// =============================================================================

print(
  'Configured exports: 12 event anomalies + 4 inter-event SD.'
);
