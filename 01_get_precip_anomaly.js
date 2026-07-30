/********************************************************************************
 * PRECIPITATION ANOMALY — STRONG EL NIÑO EVENTS
 *
 * ERA5-Land Monthly Aggregated
 * ECMWF/ERA5_LAND/MONTHLY_AGGR
 *
 * Climatology:
 *   1991–2020
 *
 * Strong El Niño events:
 *   1982/83
 *   1997/98
 *   2015/16
 *
 * Products:
 *
 *   1. Mean precipitation anomaly
 *      precip_anomaly_elnino_XXX
 *
 *   2. Inter-event standard deviation
 *      precip_stddev_elnino_XXX
 *
 * XXX:
 *   DJF
 *   MAM
 *   JJA
 *   SON
 ********************************************************************************/


// =============================================================================
// 1. CONFIG
// =============================================================================

var CONFIG = {

  inicioClimatologia:
    '1991-01-01',

  fimClimatologia:
    '2021-01-01',

  nAnosClimatologia:
    30,

  escalaExportacao:
    11132,

  assetDir:
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO'

};


// =============================================================================
// 2. TRIMESTERS
// =============================================================================

var TRIMESTRES = {

  DJF: {
    meses: [12, 1, 2],
    mesInicial: 12,
    anosEventos: [1982, 1997, 2015]
  },

  MAM: {
    meses: [3, 4, 5],
    mesInicial: 3,
    anosEventos: [1983, 1998, 2016]
  },

  JJA: {
    meses: [6, 7, 8],
    mesInicial: 6,
    anosEventos: [1983, 1998, 2016]
  },

  SON: {
    meses: [9, 10, 11],
    mesInicial: 9,
    anosEventos: [1982, 1997, 2015]
  }

};


var NOMES_TRIMESTRES = [
  'DJF',
  'MAM',
  'JJA',
  'SON'
];


// =============================================================================
// 3. BRAZIL
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
// 4. ERA5-LAND
// =============================================================================

var era5Land = ee.ImageCollection(
  'ECMWF/ERA5_LAND/MONTHLY_AGGR'
)

  .filterDate(
    '1981-01-01',
    '2021-01-01'
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
          ['system:time_start']
        );

    }
  );


// =============================================================================
// 5. TRIMESTER TOTAL FOR ONE EVENT
// =============================================================================

function calcularTotalTrimestral(
  anoInicial,
  mesInicial
) {


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
   * DJF 1982/83 =
   *
   * December 1982
   * +
   * January 1983
   * +
   * February 1983
   */


  return era5Land

    .filterDate(
      inicio,
      fim
    )

    .sum()

    .rename(
      'precipitacao_mm'
    );

}


// =============================================================================
// 6. COLLECTION OF THE THREE EL NIÑO EVENTS
// =============================================================================

function criarColecaoEventos(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[nomeTrimestre];


  var imagensEventos =
    config.anosEventos.map(

      function(ano) {

        return calcularTotalTrimestral(
          ano,
          config.mesInicial
        );

      }

    );


  return ee.ImageCollection.fromImages(
    imagensEventos
  );

}


// =============================================================================
// 7. MEAN OF EL NIÑO EVENTS
// =============================================================================

function calcularMediaEventos(
  nomeTrimestre
) {


  return criarColecaoEventos(
    nomeTrimestre
  )

    .mean()

    .rename(
      'media_eventos_mm'
    );

}


// =============================================================================
// 8. INTER-EVENT STANDARD DEVIATION
// =============================================================================

function calcularDesvioPadraoEventos(
  nomeTrimestre
) {


  /*
   * Standard deviation among:
   *
   * 1982/83
   * 1997/98
   * 2015/16
   *
   * LOW SD:
   * similar precipitation response among events.
   *
   * HIGH SD:
   * strong differences among events.
   */


  return criarColecaoEventos(
    nomeTrimestre
  )

    .reduce(
      ee.Reducer.stdDev()
    )

    .rename(
      'stddev_eventos_mm'
    )

    .toFloat();

}


// =============================================================================
// 9. CLIMATOLOGY MONTH FILTER
// =============================================================================

function filtroMesesTrimestre(
  nomeTrimestre
) {


  // DJF crosses calendar years.

  if (
    nomeTrimestre === 'DJF'
  ) {


    return ee.Filter.or(

      ee.Filter.calendarRange(
        12,
        12,
        'month'
      ),

      ee.Filter.calendarRange(
        1,
        2,
        'month'
      )

    );

  }


  var meses =
    TRIMESTRES[nomeTrimestre]
      .meses;


  return ee.Filter.calendarRange(
    meses[0],
    meses[2],
    'month'
  );

}


// =============================================================================
// 10. TRIMESTER CLIMATOLOGY — 1991–2020
// =============================================================================

function calcularClimatologia(
  nomeTrimestre
) {


  var colecaoClima =
    era5Land

      .filterDate(
        CONFIG.inicioClimatologia,
        CONFIG.fimClimatologia
      )

      .filter(
        filtroMesesTrimestre(
          nomeTrimestre
        )
      );


  /*
   * 30 years × 3 months = 90 monthly images.
   *
   * sum(90 months) / 30
   *
   * =
   *
   * mean trimester precipitation
   * during 1991–2020.
   */


  return colecaoClima

    .sum()

    .divide(
      CONFIG.nAnosClimatologia
    )

    .rename(
      'climatologia_mm'
    );

}


// =============================================================================
// 11. PRECIPITATION ANOMALY
// =============================================================================

function calcularAnomalia(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[nomeTrimestre];


  var mediaEventos =
    calcularMediaEventos(
      nomeTrimestre
    );


  var climatologia =
    calcularClimatologia(
      nomeTrimestre
    );


  /*
   * ANOMALY =
   *
   * mean strong-El-Niño precipitation
   * -
   * 1991–2020 climatological precipitation
   */


  return mediaEventos

    .subtract(
      climatologia
    )

    .rename(
      'anomalia_mm'
    )

    .toFloat()

    .set({

      variable:
        'precipitation_anomaly',

      trimester:
        nomeTrimestre,

      unit:
        'mm',

      climatology:
        '1991-2020',

      event:
        'strong_el_nino',

      event_years:
        config.anosEventos,

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR'

    });

}


// =============================================================================
// 12. CALCULATE PRODUCTS
// =============================================================================

var resultados = {};


NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    resultados[nomeTrimestre] = {

      anomaly:
        calcularAnomalia(
          nomeTrimestre
        ),

      stdDev:
        calcularDesvioPadraoEventos(
          nomeTrimestre
        )

    };

  }

);


// =============================================================================
// 13. VISUALIZATION — PRECIPITATION ANOMALY
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
// 14. VISUALIZATION — STANDARD DEVIATION
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
// 15. ANOMALY MAPS
// =============================================================================

Map.addLayer(
  resultados.DJF.anomaly.clip(
    brasilExport
  ),
  VIS_ANOMALIA,
  '01 | Anomaly — DJF',
  true
);


Map.addLayer(
  resultados.MAM.anomaly.clip(
    brasilExport
  ),
  VIS_ANOMALIA,
  '02 | Anomaly — MAM',
  false
);


Map.addLayer(
  resultados.JJA.anomaly.clip(
    brasilExport
  ),
  VIS_ANOMALIA,
  '03 | Anomaly — JJA',
  false
);


Map.addLayer(
  resultados.SON.anomaly.clip(
    brasilExport
  ),
  VIS_ANOMALIA,
  '04 | Anomaly — SON',
  false
);


// =============================================================================
// 16. STANDARD DEVIATION MAPS
// =============================================================================

Map.addLayer(
  resultados.DJF.stdDev.clip(
    brasilExport
  ),
  VIS_STDDEV,
  '05 | SD events — DJF',
  false
);


Map.addLayer(
  resultados.MAM.stdDev.clip(
    brasilExport
  ),
  VIS_STDDEV,
  '06 | SD events — MAM',
  false
);


Map.addLayer(
  resultados.JJA.stdDev.clip(
    brasilExport
  ),
  VIS_STDDEV,
  '07 | SD events — JJA',
  false
);


Map.addLayer(
  resultados.SON.stdDev.clip(
    brasilExport
  ),
  VIS_STDDEV,
  '08 | SD events — SON',
  false
);


// =============================================================================
// 17. STATE BOUNDARIES
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
// 18. GENERIC LEGEND ROW
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
// 19. ANOMALY LEGEND
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
        'Climatology: 1991–2020',

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


  Map.add(
    painel
  );

}


adicionarLegendaAnomalia();


// =============================================================================
// 20. STANDARD DEVIATION LEGEND
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
        'Standard deviation — mm',

      style: {

        fontSize:
          '11px',

        margin:
          '0 0 8px 0'

      }

    })

  );


  /*
   * Same range as VIS_STDDEV:
   *
   * 0–200 mm.
   */

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
        'Low SD = more consistent response',

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
        'High SD = greater variation among events',

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
// 21. EXPORT PRECIPITATION ANOMALY
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =
      'precip_anomaly_elnino_' +
      nomeTrimestre;


    var assetId =
      CONFIG.assetDir +
      '/' +
      nomeAsset;


    var image =
      resultados[nomeTrimestre]
        .anomaly;


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
          'mode'

      }

    });


    print(
      'Anomaly export:',
      assetId
    );

  }

);


// =============================================================================
// 22. EXPORT STANDARD DEVIATION
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =
      'precip_stddev_elnino_' +
      nomeTrimestre;


    var assetId =
      CONFIG.assetDir +
      '/' +
      nomeAsset;


    var image =
      resultados[nomeTrimestre]
        .stdDev

        .set({

          variable:
            'precipitation_inter_event_stddev',

          trimester:
            nomeTrimestre,

          unit:
            'mm',

          event:
            'strong_el_nino',

          event_years:
            TRIMESTRES[
              nomeTrimestre
            ].anosEventos,

          source:
            'ECMWF/ERA5_LAND/MONTHLY_AGGR'

        });


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

        'stddev_eventos_mm':
          'mode'

      }

    });


    print(
      'SD export:',
      assetId
    );

  }

);


// =============================================================================
// 23. CHECK
// =============================================================================

print(
  'DJF anomaly',
  resultados.DJF.anomaly
);

print(
  'DJF SD',
  resultados.DJF.stdDev
);


print(
  'MAM anomaly',
  resultados.MAM.anomaly
);

print(
  'MAM SD',
  resultados.MAM.stdDev
);


print(
  'JJA anomaly',
  resultados.JJA.anomaly
);

print(
  'JJA SD',
  resultados.JJA.stdDev
);


print(
  'SON anomaly',
  resultados.SON.anomaly
);

print(
  'SON SD',
  resultados.SON.stdDev
);


print(
  'Exports configured: 4 anomaly + 4 SD.'
);
