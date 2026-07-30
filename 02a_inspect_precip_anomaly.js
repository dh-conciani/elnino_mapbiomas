/********************************************************************************
 * INSPECTION — PRECIPITATION ANOMALY + INTER-EVENT VARIABILITY
 * STRONG EL NIÑO EVENTS
 *
 * Loads previously exported assets:
 *
 *   1. Precipitation anomaly
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
 *
 * Boundaries:
 *   - Brazil
 *   - MapBiomas biomes
 *
 * Units:
 *   anomaly = mm per trimester
 *   SD      = mm
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
// 2. LOAD PRECIPITATION ANOMALY ASSETS
// =============================================================================

var anomaliaDJF = ee.Image(
  ASSET_DIR + '/precip_anomaly_elnino_DJF'
);

var anomaliaMAM = ee.Image(
  ASSET_DIR + '/precip_anomaly_elnino_MAM'
);

var anomaliaJJA = ee.Image(
  ASSET_DIR + '/precip_anomaly_elnino_JJA'
);

var anomaliaSON = ee.Image(
  ASSET_DIR + '/precip_anomaly_elnino_SON'
);


// =============================================================================
// 3. LOAD STANDARD DEVIATION ASSETS
// =============================================================================

var stdDevDJF = ee.Image(
  ASSET_DIR + '/precip_stddev_elnino_DJF'
);

var stdDevMAM = ee.Image(
  ASSET_DIR + '/precip_stddev_elnino_MAM'
);

var stdDevJJA = ee.Image(
  ASSET_DIR + '/precip_stddev_elnino_JJA'
);

var stdDevSON = ee.Image(
  ASSET_DIR + '/precip_stddev_elnino_SON'
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
 * clip() is used only for map inspection.
 */


// -----------------------------------------------------------------------------
// Anomaly
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
// Standard deviation
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
// 7. ANOMALY VISUALIZATION
// =============================================================================

var PALETA_ANOMALIA = [

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

];


var VIS_ANOMALIA = {

  min:
    -300,

  max:
    300,

  palette:
    PALETA_ANOMALIA

};


// =============================================================================
// 8. STANDARD DEVIATION VISUALIZATION
// =============================================================================

/*
 * Low values:
 *   events behaved more similarly.
 *
 * High values:
 *   greater differences among the three
 *   strong El Niño events.
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
    200,

  palette:
    PALETA_STDDEV

};


// =============================================================================
// 9. ADD ANOMALY LAYERS
// =============================================================================

Map.addLayer(

  anomaliaDJFBrasil,

  VIS_ANOMALIA,

  '01 | DJF — precipitation anomaly',

  true

);


Map.addLayer(

  anomaliaMAMBrasil,

  VIS_ANOMALIA,

  '02 | MAM — precipitation anomaly',

  false

);


Map.addLayer(

  anomaliaJJABrasil,

  VIS_ANOMALIA,

  '03 | JJA — precipitation anomaly',

  false

);


Map.addLayer(

  anomaliaSONBrasil,

  VIS_ANOMALIA,

  '04 | SON — precipitation anomaly',

  false

);


// =============================================================================
// 10. ADD STANDARD DEVIATION LAYERS
// =============================================================================

Map.addLayer(

  stdDevDJFBrasil,

  VIS_STDDEV,

  '05 | DJF — inter-event SD',

  false

);


Map.addLayer(

  stdDevMAMBrasil,

  VIS_STDDEV,

  '06 | MAM — inter-event SD',

  false

);


Map.addLayer(

  stdDevJJABrasil,

  VIS_STDDEV,

  '07 | JJA — inter-event SD',

  false

);


Map.addLayer(

  stdDevSONBrasil,

  VIS_STDDEV,

  '08 | SON — inter-event SD',

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
// 14. ANOMALY LEGEND
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
        'El Niño precipitation anomaly',

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
          '8px 0 0 0'

      }

    })

  );


  Map.add(
    painel
  );

}


adicionarLegendaAnomalia();


// =============================================================================
// 15. STANDARD DEVIATION LEGEND
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
        'El Niño inter-event variability',

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
   * Matching VIS_STDDEV:
   *
   * min = 0
   * max = 200
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
// 16. CONSOLE INSPECTION — ANOMALY
// =============================================================================

print(
  'Anomaly DJF:',
  anomaliaDJF
);

print(
  'Anomaly MAM:',
  anomaliaMAM
);

print(
  'Anomaly JJA:',
  anomaliaJJA
);

print(
  'Anomaly SON:',
  anomaliaSON
);


// =============================================================================
// 17. CONSOLE INSPECTION — STANDARD DEVIATION
// =============================================================================

print(
  'SD DJF:',
  stdDevDJF
);

print(
  'SD MAM:',
  stdDevMAM
);

print(
  'SD JJA:',
  stdDevJJA
);

print(
  'SD SON:',
  stdDevSON
);


// =============================================================================
// 18. PROJECTION CHECK
// =============================================================================

print(
  'Anomaly projection:',
  anomaliaDJF.projection()
);


print(
  'Anomaly nominal scale:',
  anomaliaDJF
    .projection()
    .nominalScale()
);


print(
  'SD projection:',
  stdDevDJF.projection()
);


print(
  'SD nominal scale:',
  stdDevDJF
    .projection()
    .nominalScale()
);
