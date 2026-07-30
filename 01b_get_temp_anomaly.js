/********************************************************************************
 * TEMPERATURE ANOMALY — STRONG EL NIÑO EVENTS
 *
 * ERA5-Land Monthly Aggregated
 * ECMWF/ERA5_LAND/MONTHLY_AGGR
 *
 * Variable:
 *   2 m air temperature
 *
 * Original unit:
 *   Kelvin
 *
 * Output unit:
 *   degrees Celsius (°C)
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
 *   1. Mean temperature anomaly
 *      temperature_anomaly_elnino_XXX
 *
 *   2. Inter-event standard deviation
 *      temperature_stddev_elnino_XXX
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


// States only for visualization.

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
// 4. ERA5-LAND — 2 M AIR TEMPERATURE
// =============================================================================

var era5Land = ee.ImageCollection(
  'ECMWF/ERA5_LAND/MONTHLY_AGGR'
)

  .filterDate(
    '1981-01-01',
    '2021-01-01'
  )

  .select(
    'temperature_2m'
  )

  .map(
    function(image) {


      /*
       * ERA5-Land temperature_2m:
       *
       * Original unit = Kelvin
       *
       * Celsius:
       *
       * °C = K - 273.15
       */


      var temperatura = image

        .subtract(
          273.15
        )

        .rename(
          'temperatura_celsius'
        )

        .toFloat();


      return temperatura
        .copyProperties(
          image,
          ['system:time_start']
        );

    }
  );


print(
  'ERA5-Land temperature collection:',
  era5Land
);


// =============================================================================
// 5. MEAN TEMPERATURE OF ONE TRIMESTER / EVENT
// =============================================================================

function calcularMediaTrimestral(
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
   * IMPORTANT:
   *
   * Temperature is averaged, NOT summed.
   *
   * Example for DJF 1982/83:
   *
   * (December 1982
   *  + January 1983
   *  + February 1983) / 3
   *
   * This produces the mean temperature
   * of the trimester in °C.
   */


  return era5Land

    .filterDate(
      inicio,
      fim
    )

    .mean()

    .rename(
      'temperatura_media_celsius'
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


        return calcularMediaTrimestral(
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
// 7. MEAN TEMPERATURE OF EL NIÑO EVENTS
// =============================================================================

function calcularMediaEventos(
  nomeTrimestre
) {


  /*
   * Mean of the three strong El Niño events.
   */


  return criarColecaoEventos(
    nomeTrimestre
  )

    .mean()

    .rename(
      'media_eventos_celsius'
    );

}


// =============================================================================
// 8. INTER-EVENT STANDARD DEVIATION
// =============================================================================

function calcularDesvioPadraoEventos(
  nomeTrimestre
) {


  /*
   * Standard deviation among the three
   * strong El Niño events.
   *
   *
   * LOW SD:
   *
   * The three events had similar
   * trimester temperatures.
   *
   *
   * HIGH SD:
   *
   * The events differed substantially
   * from one another.
   *
   *
   * Unit:
   * °C
   */


  return criarColecaoEventos(
    nomeTrimestre
  )

    .reduce(
      ee.Reducer.stdDev()
    )

    .rename(
      'stddev_eventos_celsius'
    )

    .toFloat();

}


// =============================================================================
// 9. CLIMATOLOGY MONTH FILTER
// =============================================================================

function filtroMesesTrimestre(
  nomeTrimestre
) {


  /*
   * DJF crosses the calendar year.
   */


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
// 10. TRIMESTER TEMPERATURE CLIMATOLOGY — 1991–2020
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
   * For temperature:
   *
   * 30 years × 3 months
   * =
   * 90 monthly temperature images.
   *
   *
   * We calculate:
   *
   * mean(all 90 images)
   *
   *
   * This produces the climatological
   * mean temperature for the trimester.
   *
   *
   * IMPORTANT:
   *
   * Unlike precipitation, we DO NOT:
   *
   * sum() / 30
   *
   * because temperature is not an
   * accumulated variable.
   */


  return colecaoClima

    .mean()

    .rename(
      'climatologia_celsius'
    );

}


// =============================================================================
// 11. TEMPERATURE ANOMALY
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
   * TEMPERATURE ANOMALY =
   *
   * mean temperature during
   * strong El Niño events
   *
   * MINUS
   *
   * 1991–2020 climatological
   * trimester temperature
   *
   *
   * Positive:
   * warmer during El Niño.
   *
   * Negative:
   * cooler during El Niño.
   *
   *
   * Unit:
   * °C
   */


  return mediaEventos

    .subtract(
      climatologia
    )

    .rename(
      'anomalia_celsius'
    )

    .toFloat()

    .set({

      variable:
        'temperature_anomaly',

      trimester:
        nomeTrimestre,

      unit:
        'degC',

      climatology:
        '1991-2020',

      event:
        'strong_el_nino',

      event_years:
        config.anosEventos,

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR',

      source_band:
        'temperature_2m'

    });

}


// =============================================================================
// 12. CALCULATE ALL PRODUCTS
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
// 13. VISUALIZATION — TEMPERATURE ANOMALY
// =============================================================================

/*
 * Blue:
 * cooler than climatology
 *
 * White:
 * close to climatology
 *
 * Red:
 * warmer than climatology
 */


var VIS_ANOMALIA = {

  min:
    -3,

  max:
    3,

  palette: [

    '313695',
    '4575b4',
    '74add1',
    'abd9e9',
    'e0f3f8',

    'ffffff',

    'fee090',
    'fdae61',
    'f46d43',
    'd73027',
    'a50026'

  ]

};


// =============================================================================
// 14. VISUALIZATION — STANDARD DEVIATION
// =============================================================================

var VIS_STDDEV = {

  min:
    0,

  max:
    2,

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
// 15. TEMPERATURE ANOMALY MAPS
// =============================================================================

Map.addLayer(

  resultados.DJF.anomaly.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '01 | Temperature anomaly — DJF',

  true

);


Map.addLayer(

  resultados.MAM.anomaly.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '02 | Temperature anomaly — MAM',

  false

);


Map.addLayer(

  resultados.JJA.anomaly.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '03 | Temperature anomaly — JJA',

  false

);


Map.addLayer(

  resultados.SON.anomaly.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '04 | Temperature anomaly — SON',

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

  '05 | Temperature SD — DJF',

  false

);


Map.addLayer(

  resultados.MAM.stdDev.clip(
    brasilExport
  ),

  VIS_STDDEV,

  '06 | Temperature SD — MAM',

  false

);


Map.addLayer(

  resultados.JJA.stdDev.clip(
    brasilExport
  ),

  VIS_STDDEV,

  '07 | Temperature SD — JJA',

  false

);


Map.addLayer(

  resultados.SON.stdDev.clip(
    brasilExport
  ),

  VIS_STDDEV,

  '08 | Temperature SD — SON',

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
// 19. TEMPERATURE ANOMALY LEGEND
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
        'El Niño temperature anomaly',

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
        'Mean 2 m air temperature — °C',

      style: {

        fontSize:
          '11px',

        margin:
          '0 0 8px 0'

      }

    })

  );


  var cores = [

    '313695',
    '4575b4',
    '74add1',
    'abd9e9',

    'ffffff',

    'fee090',
    'f46d43',
    'd73027',
    'a50026'

  ];


  var textos = [

    '≤ −3 °C',

    '−3 to −2 °C',

    '−2 to −1 °C',

    '−1 to 0 °C',

    '≈ 0 °C',

    '0 to 1 °C',

    '1 to 2 °C',

    '2 to 3 °C',

    '≥ 3 °C'

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
        'Temperature inter-event variability',

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
        'Standard deviation — °C',

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

    '0–0.2 °C',

    '0.2–0.4 °C',

    '0.4–0.6 °C',

    '0.6–0.8 °C',

    '0.8–1.0 °C',

    '1.0–1.2 °C',

    '1.2–1.4 °C',

    '1.4–1.6 °C',

    '1.6–1.8 °C',

    '1.8–2.0+ °C'

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
// 21. EXPORT TEMPERATURE ANOMALY
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =
      'temperature_anomaly_elnino_' +
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

        'anomalia_celsius':
          'mode'

      }

    });


    print(
      'Temperature anomaly export:',
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
      'temperature_stddev_elnino_' +
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
            'temperature_inter_event_stddev',

          trimester:
            nomeTrimestre,

          unit:
            'degC',

          event:
            'strong_el_nino',

          event_years:
            TRIMESTRES[
              nomeTrimestre
            ].anosEventos,

          source:
            'ECMWF/ERA5_LAND/MONTHLY_AGGR',

          source_band:
            'temperature_2m'

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

        'stddev_eventos_celsius':
          'mode'

      }

    });


    print(
      'Temperature SD export:',
      assetId
    );

  }

);


// =============================================================================
// 23. CHECK
// =============================================================================

print(
  'DJF temperature anomaly',
  resultados.DJF.anomaly
);

print(
  'DJF temperature SD',
  resultados.DJF.stdDev
);


print(
  'MAM temperature anomaly',
  resultados.MAM.anomaly
);

print(
  'MAM temperature SD',
  resultados.MAM.stdDev
);


print(
  'JJA temperature anomaly',
  resultados.JJA.anomaly
);

print(
  'JJA temperature SD',
  resultados.JJA.stdDev
);


print(
  'SON temperature anomaly',
  resultados.SON.anomaly
);

print(
  'SON temperature SD',
  resultados.SON.stdDev
);


print(
  'Exports configured: 4 temperature anomalies + 4 temperature SD.'
);
