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
 *   2023/24
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
 * 16 event-specific precipitation anomaly maps:
 *
 *   4 El Niño events × 4 trimesters
 *
 * Plus:
 *
 *   4 inter-event standard deviation maps
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
 * that seasonal period starts.
 *
 * DJF:
 * year = December year
 *
 * Example:
 *
 * DJF 2023/24 =
 * December 2023
 * January 2024
 * February 2024
 *
 *
 * For SON the year is the first year of the El Niño event.
 *
 * For MAM and JJA the year is the second year.
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

  },


  {

    nome:
      '2023_24',

    label:
      '2023/24',

    DJF:
      2023,

    MAM:
      2024,

    JJA:
      2024,

    SON:
      2023

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

    anosEventos:
      [1982, 1997, 2015, 2023]

  },


  MAM: {

    meses:
      [3, 4, 5],

    mesInicial:
      3,

    anosEventos:
      [1983, 1998, 2016, 2024]

  },


  JJA: {

    meses:
      [6, 7, 8],

    mesInicial:
      6,

    anosEventos:
      [1983, 1998, 2016, 2024]

  },


  SON: {

    meses:
      [9, 10, 11],

    mesInicial:
      9,

    anosEventos:
      [1982, 1997, 2015, 2023]

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
 * The collection must now contain the 2023/24 event.
 *
 * Latest seasonal period used:
 *
 * JJA 2024 =
 *
 * June 2024
 * July 2024
 * August 2024
 *
 * We load through January 2025 for safety.
 */


var era5Land = ee.ImageCollection(
  'ECMWF/ERA5_LAND/MONTHLY_AGGR'
)

  .filterDate(
    '1981-01-01',
    '2025-01-01'
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
   * Reference:
   *
   * 1991–2020
   *
   * Strong El Niño seasons are removed.
   *
   *
   * IMPORTANT:
   *
   * 2023/24 does NOT need to be removed because it is outside
   * the 1991–2020 reference period.
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


  // Observed precipitation during THIS event.

  var observado =
    calcularTotalTrimestral(

      anoEvento,

      config.mesInicial

    );


  // Non-strong-El-Niño reference climatology.

  var referencia =
    calcularMediaReferencia(
      nomeTrimestre
    );


  /*
   * ANOMALY =
   *
   * event precipitation
   *
   * minus
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
// 11. CALCULATE ALL EVENT-SPECIFIC ANOMALIES
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
// 13. MEAN ANOMALY ACROSS THE FOUR EVENTS
// =============================================================================

function calcularMediaAnomaliasEventos(
  nomeTrimestre
) {


  return criarColecaoAnomaliasEventos(
    nomeTrimestre
  )

    .mean()

    .rename(
      'media_anomalias_mm'
    )

    .toFloat()

    .set({

      variable:
        'mean_precipitation_anomaly_strong_el_nino',

      trimester:
        nomeTrimestre,

      unit:
        'mm',

      events:
        '1982/83, 1997/98, 2015/16, 2023/24',

      reference:
        '1991-2020 years without strong El Nino',

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR'

    });

}


// =============================================================================
// 14. INTER-EVENT STANDARD DEVIATION
// =============================================================================

function calcularDesvioPadraoAnomalias(
  nomeTrimestre
) {


  /*
   * Standard deviation among:
   *
   * 1982/83
   * 1997/98
   * 2015/16
   * 2023/24
   *
   *
   * LOW SD:
   * similar precipitation anomaly among events.
   *
   * HIGH SD:
   * strong differences among events.
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

      n_events:
        4,

      events:
        '1982/83, 1997/98, 2015/16, 2023/24',

      reference:
        '1991-2020 years without strong El Nino',

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR'

    });

}


// =============================================================================
// 15. SUMMARY PRODUCTS
// =============================================================================

var resultadosMedia = {};

var resultadosStdDev = {};


NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    resultadosMedia[
      nomeTrimestre
    ] = calcularMediaAnomaliasEventos(
      nomeTrimestre
    );


    resultadosStdDev[
      nomeTrimestre
    ] = calcularDesvioPadraoAnomalias(
      nomeTrimestre
    );

  }

);


// =============================================================================
// 16. VISUALIZATION — PRECIPITATION ANOMALY
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
// 17. VISUALIZATION — STANDARD DEVIATION
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
// 18. MAPS — 1982/83
// =============================================================================

Map.addLayer(
  resultados['1982_83'].DJF.clip(brasilExport),
  VIS_ANOMALIA,
  '01 | 1982/83 — DJF',
  true
);


Map.addLayer(
  resultados['1982_83'].MAM.clip(brasilExport),
  VIS_ANOMALIA,
  '02 | 1982/83 — MAM',
  false
);


Map.addLayer(
  resultados['1982_83'].JJA.clip(brasilExport),
  VIS_ANOMALIA,
  '03 | 1982/83 — JJA',
  false
);


Map.addLayer(
  resultados['1982_83'].SON.clip(brasilExport),
  VIS_ANOMALIA,
  '04 | 1982/83 — SON',
  false
);


// =============================================================================
// 19. MAPS — 1997/98
// =============================================================================

Map.addLayer(
  resultados['1997_98'].DJF.clip(brasilExport),
  VIS_ANOMALIA,
  '05 | 1997/98 — DJF',
  false
);


Map.addLayer(
  resultados['1997_98'].MAM.clip(brasilExport),
  VIS_ANOMALIA,
  '06 | 1997/98 — MAM',
  false
);


Map.addLayer(
  resultados['1997_98'].JJA.clip(brasilExport),
  VIS_ANOMALIA,
  '07 | 1997/98 — JJA',
  false
);


Map.addLayer(
  resultados['1997_98'].SON.clip(brasilExport),
  VIS_ANOMALIA,
  '08 | 1997/98 — SON',
  false
);


// =============================================================================
// 20. MAPS — 2015/16
// =============================================================================

Map.addLayer(
  resultados['2015_16'].DJF.clip(brasilExport),
  VIS_ANOMALIA,
  '09 | 2015/16 — DJF',
  false
);


Map.addLayer(
  resultados['2015_16'].MAM.clip(brasilExport),
  VIS_ANOMALIA,
  '10 | 2015/16 — MAM',
  false
);


Map.addLayer(
  resultados['2015_16'].JJA.clip(brasilExport),
  VIS_ANOMALIA,
  '11 | 2015/16 — JJA',
  false
);


Map.addLayer(
  resultados['2015_16'].SON.clip(brasilExport),
  VIS_ANOMALIA,
  '12 | 2015/16 — SON',
  false
);


// =============================================================================
// 21. MAPS — 2023/24
// =============================================================================

Map.addLayer(
  resultados['2023_24'].DJF.clip(brasilExport),
  VIS_ANOMALIA,
  '13 | 2023/24 — DJF',
  false
);


Map.addLayer(
  resultados['2023_24'].MAM.clip(brasilExport),
  VIS_ANOMALIA,
  '14 | 2023/24 — MAM',
  false
);


Map.addLayer(
  resultados['2023_24'].JJA.clip(brasilExport),
  VIS_ANOMALIA,
  '15 | 2023/24 — JJA',
  false
);


Map.addLayer(
  resultados['2023_24'].SON.clip(brasilExport),
  VIS_ANOMALIA,
  '16 | 2023/24 — SON',
  false
);


// =============================================================================
// 22. MEAN ANOMALY OF FOUR EVENTS
// =============================================================================

Map.addLayer(
  resultadosMedia.DJF.clip(brasilExport),
  VIS_ANOMALIA,
  '17 | Mean anomaly — DJF',
  false
);


Map.addLayer(
  resultadosMedia.MAM.clip(brasilExport),
  VIS_ANOMALIA,
  '18 | Mean anomaly — MAM',
  false
);


Map.addLayer(
  resultadosMedia.JJA.clip(brasilExport),
  VIS_ANOMALIA,
  '19 | Mean anomaly — JJA',
  false
);


Map.addLayer(
  resultadosMedia.SON.clip(brasilExport),
  VIS_ANOMALIA,
  '20 | Mean anomaly — SON',
  false
);


// =============================================================================
// 23. STANDARD DEVIATION MAPS
// =============================================================================

Map.addLayer(
  resultadosStdDev.DJF.clip(brasilExport),
  VIS_STDDEV,
  '21 | Inter-event SD — DJF',
  false
);


Map.addLayer(
  resultadosStdDev.MAM.clip(brasilExport),
  VIS_STDDEV,
  '22 | Inter-event SD — MAM',
  false
);


Map.addLayer(
  resultadosStdDev.JJA.clip(brasilExport),
  VIS_STDDEV,
  '23 | Inter-event SD — JJA',
  false
);


Map.addLayer(
  resultadosStdDev.SON.clip(brasilExport),
  VIS_STDDEV,
  '24 | Inter-event SD — SON',
  false
);


// =============================================================================
// 24. REFERENCE CLIMATOLOGY
// =============================================================================

var VIS_REFERENCIA = {

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

};


NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    Map.addLayer(

      calcularMediaReferencia(
        nomeTrimestre
      ).clip(
        brasilExport
      ),

      VIS_REFERENCIA,

      'Reference precipitation — ' +
      nomeTrimestre,

      false

    );

  }

);


// =============================================================================
// 25. STATE BOUNDARIES
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
// 26. GENERIC LEGEND ROW
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
// 27. ANOMALY LEGEND
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
// 28. STANDARD DEVIATION LEGEND
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
        'SD of four event anomalies — mm',

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
        'High SD = stronger differences among events',

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
// 29. EXPORT — 16 EVENT-SPECIFIC ANOMALIES
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
// 30. EXPORT — MEAN ANOMALY OF FOUR EVENTS
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =

      'precip_anomaly_mean_4elnino_' +

      nomeTrimestre;


    var assetId =

      CONFIG.assetDir +

      '/' +

      nomeAsset;


    Export.image.toAsset({

      image:
        resultadosMedia[
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

        'media_anomalias_mm':
          'mean'

      }

    });


    print(
      'Mean anomaly export:',
      assetId
    );

  }

);


// =============================================================================
// 31. EXPORT — INTER-EVENT STANDARD DEVIATION
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =

      'precip_anomaly_stddev_4elnino_' +

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
// 32. CHECK REFERENCE YEARS
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    print(

      'Reference years — ' +
      nomeTrimestre,

      obterAnosReferencia(
        nomeTrimestre
      )

    );


    print(

      'Reference N — ' +
      nomeTrimestre,

      criarColecaoReferencia(
        nomeTrimestre
      ).size()

    );

  }

);


// =============================================================================
// 33. CHECK ALL EVENT ANOMALIES
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_TRIMESTRES.forEach(

      function(nomeTrimestre) {


        print(

          evento.label +
          ' — ' +
          nomeTrimestre,

          resultados[
            evento.nome
          ][
            nomeTrimestre
          ]

        );

      }

    );

  }

);


// =============================================================================
// 34. CHECK 2023/24 SPECIFICALLY
// =============================================================================

print(
  '2023/24 — SON',
  resultados['2023_24'].SON
);


print(
  '2023/24 — DJF',
  resultados['2023_24'].DJF
);


print(
  '2023/24 — MAM',
  resultados['2023_24'].MAM
);


print(
  '2023/24 — JJA',
  resultados['2023_24'].JJA
);


// =============================================================================
// 35. CHECK SUMMARY PRODUCTS
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    print(

      'Mean anomaly — ' +
      nomeTrimestre,

      resultadosMedia[
        nomeTrimestre
      ]

    );


    print(

      'Inter-event SD — ' +
      nomeTrimestre,

      resultadosStdDev[
        nomeTrimestre
      ]

    );

  }

);


// =============================================================================
// 36. FINAL CHECK
// =============================================================================

print(
  'Configured exports:'
);


print(
  '16 individual anomaly maps'
);


print(
  '4 mean anomaly maps'
);


print(
  '4 inter-event standard deviation maps'
);


print(
  'Events: 1982/83, 1997/98, 2015/16, 2023/24'
);

// =============================================================================
// FACET MAP
//
// COLUMNS = SEASONS
//
//   DJF = Dez–Jan–Fev
//   MAM = Mar–Abr–Mai
//   JJA = Jun–Jul–Ago
//   SON = Set–Out–Nov
//
// ROWS = EL NIÑO EVENTS
//
//   1982/83
//   1997/98
//   2015/16
//   2023/24
//
// =============================================================================


// =============================================================================
// 1. FACET LABELS
// =============================================================================

var ROTULOS_TRIMESTRES = {

  DJF:
    'Dez–Jan–Fev',

  MAM:
    'Mar–Abr–Mai',

  JJA:
    'Jun–Jul–Ago',

  SON:
    'Set–Out–Nov'

};


// =============================================================================
// 2. CREATE ONE MINI-MAP
// =============================================================================

function criarMapaFacet(
  evento,
  nomeTrimestre
) {


  var mapa = ui.Map();


  // ---------------------------------------------------------------------------
  // Hide controls to maximize map area.
  // ---------------------------------------------------------------------------

  mapa.setControlVisibility(
    false
  );


  // ---------------------------------------------------------------------------
  // Add anomaly.
  // ---------------------------------------------------------------------------

  mapa.addLayer(

    resultados[
      evento.nome
    ][
      nomeTrimestre
    ]

    .clip(
      brasilExport
    ),

    VIS_ANOMALIA,

    evento.label +
      ' — ' +
      nomeTrimestre,

    true

  );


  // ---------------------------------------------------------------------------
  // State boundaries.
  // ---------------------------------------------------------------------------

  mapa.addLayer(

    linhasEstados,

    {
      palette:
        ['555555']
    },

    'States',

    true

  );


  // ---------------------------------------------------------------------------
  // Label inside each map.
  // ---------------------------------------------------------------------------

  mapa.add(

    ui.Label({

      value:

        evento.label +
        '  |  ' +
        nomeTrimestre,

      style: {

        position:
          'top-left',

        fontWeight:
          'bold',

        fontSize:
          '10px',

        color:
          '222222',

        backgroundColor:
          'ffffff',

        padding:
          '3px 5px',

        margin:
          '4px',

        border:
          '1px solid #bbbbbb'

      }

    })

  );


  // ---------------------------------------------------------------------------
  // Map cell style.
  // ---------------------------------------------------------------------------

  mapa.style().set({

    stretch:
      'both',

    border:
      '1px solid #cccccc'

  });


  return mapa;

}


// =============================================================================
// 3. COLUMN HEADERS
// =============================================================================

function criarCabecalhoFacet() {


  var painel = ui.Panel({

    layout:
      ui.Panel.Layout.Flow(
        'horizontal'
      ),

    style: {

      stretch:
        'horizontal',

      height:
        '38px',

      backgroundColor:
        'ffffff'

    }

  });


  // Empty top-left corner.
  painel.add(

    ui.Label({

      value:
        'El Niño',

      style: {

        width:
          '90px',

        fontWeight:
          'bold',

        fontSize:
          '12px',

        textAlign:
          'center',

        padding:
          '10px 2px',

        backgroundColor:
          'eeeeee',

        border:
          '1px solid #cccccc'

      }

    })

  );


  NOMES_TRIMESTRES.forEach(

    function(nomeTrimestre) {


      painel.add(

        ui.Label({

          value:
            ROTULOS_TRIMESTRES[
              nomeTrimestre
            ],

          style: {

            stretch:
              'horizontal',

            fontWeight:
              'bold',

            fontSize:
              '12px',

            textAlign:
              'center',

            padding:
              '10px 2px',

            backgroundColor:
              'eeeeee',

            border:
              '1px solid #cccccc'

          }

        })

      );

    }

  );


  return painel;

}


// =============================================================================
// 4. CREATE SHARED LEGEND
// =============================================================================

function criarLegendaFacet() {


  var painel = ui.Panel({

    layout:
      ui.Panel.Layout.Flow(
        'horizontal'
      ),

    style: {

      stretch:
        'horizontal',

      backgroundColor:
        'ffffff',

      padding:
        '4px 8px',

      border:
        '1px solid #cccccc'

    }

  });


  painel.add(

    ui.Label({

      value:
        'Precipitation anomaly (mm):',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '11px',

        margin:
          '4px 10px 0 0'

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

    '≤ −300',

    '−300 to −200',

    '−200 to −100',

    '−100 to 0',

    '≈ 0',

    '0 to 100',

    '100 to 200',

    '≥ 300'

  ];


  for (
    var i = 0;
    i < cores.length;
    i++
  ) {


    var caixa = ui.Label({

      style: {

        backgroundColor:
          '#' + cores[i],

        padding:
          '8px',

        margin:
          '0 3px 0 0',

        border:
          '1px solid #999999'

      }

    });


    var texto = ui.Label({

      value:
        textos[i],

      style: {

        fontSize:
          '9px',

        margin:
          '3px 7px 0 0'

      }

    });


    painel.add(

      ui.Panel({

        widgets: [

          caixa,
          texto

        ],

        layout:
          ui.Panel.Layout.Flow(
            'horizontal'
          )

      })

    );

  }


  return painel;

}


// =============================================================================
// 5. BUILD FACET GRID
// =============================================================================

var mapasFacet = [];


var painelGrid = ui.Panel({

  layout:
    ui.Panel.Layout.Flow(
      'vertical'
    ),

  style: {

    stretch:
      'both',

    backgroundColor:
      'ffffff'

  }

});


// -----------------------------------------------------------------------------
// Add X-axis headers.
// -----------------------------------------------------------------------------

painelGrid.add(
  criarCabecalhoFacet()
);


// -----------------------------------------------------------------------------
// One row per El Niño event.
// -----------------------------------------------------------------------------

EVENTOS.forEach(

  function(evento) {


    var linha = ui.Panel({

      layout:
        ui.Panel.Layout.Flow(
          'horizontal'
        ),

      style: {

        stretch:
          'both'

      }

    });


    // -------------------------------------------------------------------------
    // Y-axis label.
    // -------------------------------------------------------------------------

    var rotuloAno = ui.Panel({

      widgets: [

        ui.Label({

          value:
            evento.label,

          style: {

            fontWeight:
              'bold',

            fontSize:
              '12px',

            textAlign:
              'center',

            stretch:
              'horizontal',

            padding:
              '8px 2px'

          }

        })

      ],

      layout:
        ui.Panel.Layout.Flow(
          'vertical'
        ),

      style: {

        width:
          '90px',

        stretch:
          'vertical',

        backgroundColor:
          'eeeeee',

        border:
          '1px solid #cccccc'

      }

    });


    linha.add(
      rotuloAno
    );


    // -------------------------------------------------------------------------
    // Four seasonal maps.
    // -------------------------------------------------------------------------

    NOMES_TRIMESTRES.forEach(

      function(nomeTrimestre) {


        var mapa = criarMapaFacet(

          evento,

          nomeTrimestre

        );


        mapasFacet.push(
          mapa
        );


        linha.add(
          mapa
        );

      }

    );


    painelGrid.add(
      linha
    );

  }

);


// =============================================================================
// 6. LINK ALL 16 MAPS
// =============================================================================

/*
 * Moving or zooming one map moves all others.
 *
 * This is essential for spatial comparison:
 *
 * same bounding box
 * same zoom
 * same geographic position
 */

var linkerFacet = ui.Map.Linker(

  mapasFacet,

  'change-bounds'

);


// =============================================================================
// 7. TITLE
// =============================================================================

var painelTitulo = ui.Panel({

  widgets: [

    ui.Label({

      value:
        'Strong El Niño precipitation anomalies — Brazil',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '18px',

        margin:
          '2px 8px'

      }

    }),


    ui.Label({

      value:
        'Observed seasonal precipitation − 1991–2020 non-strong-El-Niño reference',

      style: {

        fontSize:
          '11px',

        color:
          '555555',

        margin:
          '0 8px 4px 8px'

      }

    })

  ],

  layout:
    ui.Panel.Layout.Flow(
      'vertical'
    ),

  style: {

    stretch:
      'horizontal',

    backgroundColor:
      'ffffff',

    padding:
      '3px'

  }

});


// =============================================================================
// 8. COMPLETE FACET APPLICATION
// =============================================================================

var painelAplicacao = ui.Panel({

  widgets: [

    painelTitulo,

    painelGrid,

    criarLegendaFacet()

  ],

  layout:
    ui.Panel.Layout.Flow(
      'vertical'
    ),

  style: {

    stretch:
      'both',

    backgroundColor:
      'ffffff'

  }

});


// =============================================================================
// 9. REPLACE DEFAULT MAP WITH FACET VIEW
// =============================================================================

ui.root.clear();


ui.root.add(
  painelAplicacao
);


// =============================================================================
// 10. INITIAL MAP EXTENT
// =============================================================================

/*
 * Because all maps are linked, centering the first map
 * propagates the same extent to all 16 maps.
 */

mapasFacet[0].centerObject(

  brasil,

  4

);
