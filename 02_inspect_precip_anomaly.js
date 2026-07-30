/********************************************************************************
 * INSPEÇÃO — ANOMALIAS TRIMESTRAIS DE PRECIPITAÇÃO / EL NIÑO
 *
 * Loads the previously exported anomaly assets.
 *
 * - Masks visualization to Brazil
 * - Displays MapBiomas biome boundaries
 * - Uses the same visualization range for all trimesters
 * - Adds anomaly legend
 *
 * Unit:
 *   mm per trimester
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
// 3. BRAZIL BOUNDARY
// =============================================================================

// Use Brazil administrative boundary only for masking the anomaly images.

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


var brasil = brasilFeature.geometry();


Map.centerObject(
  brasil,
  4
);


// =============================================================================
// 4. MASK ANOMALIES TO BRAZIL
// =============================================================================

/*
 * The original exported ee.Images remain untouched.
 *
 * These versions are only for inspection.
 */

var djfBrasil = anomaliaDJF
  .clip(brasil);

var mamBrasil = anomaliaMAM
  .clip(brasil);

var jjaBrasil = anomaliaJJA
  .clip(brasil);

var sonBrasil = anomaliaSON
  .clip(brasil);


// =============================================================================
// 5. MAPBIOMAS BIOMES
// =============================================================================

var biomas = ee.FeatureCollection(
  BIOMES_ASSET
);


print(
  'Biomes:',
  biomas
);

print(
  'Example biome feature:',
  biomas.first()
);


// =============================================================================
// 6. ANOMALY VISUALIZATION
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

  min: -300,

  max: 300,

  palette:
    PALETA_ANOMALIA

};


// =============================================================================
// 7. ADD TRIMESTERS
// =============================================================================

Map.addLayer(
  djfBrasil,
  VIS_ANOMALIA,
  '01 | DJF — El Niño precipitation anomaly',
  true
);


Map.addLayer(
  mamBrasil,
  VIS_ANOMALIA,
  '02 | MAM — El Niño precipitation anomaly',
  false
);


Map.addLayer(
  jjaBrasil,
  VIS_ANOMALIA,
  '03 | JJA — El Niño precipitation anomaly',
  false
);


Map.addLayer(
  sonBrasil,
  VIS_ANOMALIA,
  '04 | SON — El Niño precipitation anomaly',
  false
);


// =============================================================================
// 8. BIOME BOUNDARIES
// =============================================================================

/*
 * Draw only the outlines.
 *
 * The 5 km buffer in the biome asset therefore does not affect
 * the precipitation mask.
 */

var linhasBiomas = ee.Image(0)
  .byte()
  .paint({
    featureCollection: biomas,
    color: 1,
    width: 2
  })
  .selfMask();


Map.addLayer(
  linhasBiomas,
  {
    palette: ['333333']
  },
  'Biome boundaries',
  true
);


// =============================================================================
// 9. BRAZIL NATIONAL BOUNDARY
// =============================================================================

var linhaBrasil = ee.Image(0)
  .byte()
  .paint({
    featureCollection: ee.FeatureCollection([
      brasilFeature
    ]),
    color: 1,
    width: 2
  })
  .selfMask();


Map.addLayer(
  linhaBrasil,
  {
    palette: ['000000']
  },
  'Brazil boundary',
  true
);


// =============================================================================
// 10. LEGEND
// =============================================================================

function adicionarLegenda() {

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


  // Title

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


  // Unit

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


    var caixaCor = ui.Label({

      style: {

        backgroundColor:
          '#' + cores[i],

        padding:
          '8px',

        margin:
          '0 6px 3px 0',

        border:
          '1px solid #999999'

      }

    });


    var texto = ui.Label({

      value:
        textos[i],

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
          texto
        ],

        layout:
          ui.Panel.Layout.Flow(
            'horizontal'
          )

      })

    );

  }


  // Footer

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


adicionarLegenda();


// =============================================================================
// 11. CONSOLE INSPECTION
// =============================================================================

print(
  'DJF',
  anomaliaDJF
);

print(
  'MAM',
  anomaliaMAM
);

print(
  'JJA',
  anomaliaJJA
);

print(
  'SON',
  anomaliaSON
);


print(
  'Projection:',
  anomaliaDJF.projection()
);


print(
  'Nominal scale:',
  anomaliaDJF
    .projection()
    .nominalScale()
);
