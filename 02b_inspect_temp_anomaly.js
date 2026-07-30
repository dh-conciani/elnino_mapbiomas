/********************************************************************************
 * INSPECTION — TEMPERATURE ANOMALY + INTER-EVENT VARIABILITY
 * STRONG EL NIÑO EVENTS
 *
 * Loads previously exported assets:
 *
 *   1. Temperature anomaly
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
 *
 * Boundaries:
 *   - Brazil
 *   - MapBiomas biomes
 *
 * Units:
 *   anomaly = °C
 *   SD      = °C
 *
 * Temperature variable:
 *   Mean 2 m air temperature
 *
 * Climatology:
 *   1991–2020
 ********************************************************************************/


// =============================================================================
// 1. ASSET DIRECTORIES
// =============================================================================

var ASSET_DIR =
  'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO';


var BIOMES_ASSET =
  'projects/mapbiomas-workspace/AUXILIAR/bioma_2025_e250k_5kbuffer';


// =============================================================================
// 2. LOAD TEMPERATURE ANOMALY ASSETS
// =============================================================================

var anomaliaDJF = ee.Image(
  ASSET_DIR + '/temperature_anomaly_elnino_DJF'
);

var anomaliaMAM = ee.Image(
  ASSET_DIR + '/temperature_anomaly_elnino_MAM'
);

var anomaliaJJA = ee.Image(
  ASSET_DIR + '/temperature_anomaly_elnino_JJA'
);

var anomaliaSON = ee.Image(
  ASSET_DIR + '/temperature_anomaly_elnino_SON'
);


// =============================================================================
// 3. LOAD TEMPERATURE STANDARD DEVIATION ASSETS
// =============================================================================

var stdDevDJF = ee.Image(
  ASSET_DIR + '/temperature_stddev_elnino_DJF'
);

var stdDevMAM = ee.Image(
  ASSET_DIR + '/temperature_stddev_elnino_MAM'
);

var stdDevJJA = ee.Image(
  ASSET_DIR + '/temperature_stddev_elnino_JJA'
);

var stdDevSON = ee.Image(
  ASSET_DIR + '/temperature_stddev_elnino_SON'
);


// =============================================================================
// 4. BRAZIL BOUNDARY
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


Map.centerObject(
  brasil,
  4
);


// =============================================================================
// 5. CLIP ONLY FOR VISUALIZATION
// =============================================================================

/*
 * Original exported assets remain untouched.
 *
 * clip() is applied only to the map display.
 */


// -----------------------------------------------------------------------------
// Temperature anomaly
// -----------------------------------------------------------------------------

var anomaliaDJFBrasil =
  anomaliaDJF.clip(brasil);

var anomaliaMAMBrasil =
  anomaliaMAM.clip(brasil);

var anomaliaJJABrasil =
  anomaliaJJA.clip(brasil);

var anomaliaSONBrasil =
  anomaliaSON.clip(brasil);


// -----------------------------------------------------------------------------
// Temperature standard deviation
// -----------------------------------------------------------------------------

var stdDevDJFBrasil =
  stdDevDJF.clip(brasil);

var stdDevMAMBrasil =
  stdDevMAM.clip(brasil);

var stdDevJJABrasil =
  stdDevJJA.clip(brasil);

var stdDevSONBrasil =
  stdDevSON.clip(brasil);


// =============================================================================
// 6. MAPBIOMAS BIOMES
// =============================================================================

var biomas = ee.FeatureCollection(
  BIOMES_ASSET
);


print(
  'Biomes:',
  biomas
);


// =============================================================================
// 7. TEMPERATURE ANOMALY VISUALIZATION
// =============================================================================

/*
 * Negative anomaly:
 * cooler than 1991–2020 climatology.
 *
 * Positive anomaly:
 * warmer than 1991–2020 climatology.
 */

var PALETA_ANOMALIA = [

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

];


var VIS_ANOMALIA = {

  min:
    -3,

  max:
    3,

  palette:
    PALETA_ANOMALIA

};


// =============================================================================
// 8. STANDARD DEVIATION VISUALIZATION
// =============================================================================

/*
 * Low SD:
 *   more similar trimester temperatures
 *   among the three strong El Niño events.
 *
 * High SD:
 *   greater inter-event variability.
 */

var PALETA_STDDEV = [

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


var VIS_STDDEV = {

  min:
    0,

  max:
    2,

  palette:
    PALETA_STDDEV

};


// =============================================================================
// 9. ADD TEMPERATURE ANOMALY LAYERS
// =============================================================================

Map.addLayer(

  anomaliaDJFBrasil,

  VIS_ANOMALIA,

  '01 | DJF — temperature anomaly',

  true

);


Map.addLayer(

  anomaliaMAMBrasil,

  VIS_ANOMALIA,

  '02 | MAM — temperature anomaly',

  false

);


Map.addLayer(

  anomaliaJJABrasil,

  VIS_ANOMALIA,

  '03 | JJA — temperature anomaly',

  false

);


Map.addLayer(

  anomaliaSONBrasil,

  VIS_ANOMALIA,

  '04 | SON — temperature anomaly',

  false

);


// =============================================================================
// 10. ADD TEMPERATURE STANDARD DEVIATION LAYERS
// =============================================================================

Map.addLayer(

  stdDevDJFBrasil,

  VIS_STDDEV,

  '05 | DJF — temperature inter-event SD',

  false

);


Map.addLayer(

  stdDevMAMBrasil,

  VIS_STDDEV,

  '06 | MAM — temperature inter-event SD',

  false

);


Map.addLayer(

  stdDevJJABrasil,

  VIS_STDDEV,

  '07 | JJA — temperature inter-event SD',

  false

);


Map.addLayer(

  stdDevSONBrasil,

  VIS_STDDEV,

  '08 | SON — temperature inter-event SD',

  false

);


// =============================================================================
// 11. BIOME BOUNDARIES
// =============================================================================

var linhasBiomas = ee.Image(0)

  .byte()

  .paint({

    featureCollection:
      biomas,

    color:
      1,

    width:
      2

  })

  .selfMask();


Map.addLayer(

  linhasBiomas,

  {
    palette:
      ['333333']
  },

  'Biome boundaries',

  true

);


// =============================================================================
// 12. BRAZIL NATIONAL BOUNDARY
// =============================================================================

var linhaBrasil = ee.Image(0)

  .byte()

  .paint({

    featureCollection:
      ee.FeatureCollection([
        brasilFeature
      ]),

    color:
      1,

    width:
      2

  })

  .selfMask();


Map.addLayer(

  linhaBrasil,

  {
    palette:
      ['000000']
  },

  'Brazil boundary',

  true

);


// =============================================================================
// 13. GENERIC LEGEND ROW
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
// 14. TEMPERATURE ANOMALY LEGEND
// =============================================================================

function adicionarLegendaAnomalia() {


  var painel = ui.Panel({

    style: {

      position:
        'bottom-left',

      padding:
        '8px 12px',

      backgroundColor:
        'white'

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
          '14px',

        margin:
          '0 0 4px 0'

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
          '8px 0 0 0'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'Positive = warmer | Negative = cooler',

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
// 15. TEMPERATURE STANDARD DEVIATION LEGEND
// =============================================================================

function adicionarLegendaStdDev() {


  var painel = ui.Panel({

    style: {

      position:
        'bottom-right',

      padding:
        '8px 12px',

      backgroundColor:
        'white'

    }

  });


  painel.add(

    ui.Label({

      value:
        'El Niño temperature variability',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '14px',

        margin:
          '0 0 4px 0'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'Inter-event standard deviation — °C',

      style: {

        fontSize:
          '11px',

        margin:
          '0 0 8px 0'

      }

    })

  );


  /*
   * Matching VIS_STDDEV:
   *
   * min = 0 °C
   * max = 2 °C
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
          '8px 0 0 0'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'High SD = greater inter-event variability',

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
// 16. CONSOLE INSPECTION — TEMPERATURE ANOMALY
// =============================================================================

print(
  'Temperature anomaly DJF:',
  anomaliaDJF
);

print(
  'Temperature anomaly MAM:',
  anomaliaMAM
);

print(
  'Temperature anomaly JJA:',
  anomaliaJJA
);

print(
  'Temperature anomaly SON:',
  anomaliaSON
);


// =============================================================================
// 17. CONSOLE INSPECTION — STANDARD DEVIATION
// =============================================================================

print(
  'Temperature SD DJF:',
  stdDevDJF
);

print(
  'Temperature SD MAM:',
  stdDevMAM
);

print(
  'Temperature SD JJA:',
  stdDevJJA
);

print(
  'Temperature SD SON:',
  stdDevSON
);


// =============================================================================
// 18. PROJECTION CHECK
// =============================================================================

print(
  'Temperature anomaly projection:',
  anomaliaDJF.projection()
);


print(
  'Temperature anomaly nominal scale:',
  anomaliaDJF
    .projection()
    .nominalScale()
);


print(
  'Temperature SD projection:',
  stdDevDJF.projection()
);


print(
  'Temperature SD nominal scale:',
  stdDevDJF
    .projection()
    .nominalScale()
);
