/********************************************************************************
 * INSPEÇÃO — ANOMALIAS TRIMESTRAIS DE PRECIPITAÇÃO / EL NIÑO
 *
 * Assets já processados:
 *
 *   precip_anomaly_elnino_DJF
 *   precip_anomaly_elnino_MAM
 *   precip_anomaly_elnino_JJA
 *   precip_anomaly_elnino_SON
 *
 * Unidade:
 *   mm por trimestre
 *
 * Climatologia original:
 *   1991–2020
 ********************************************************************************/


// =============================================================================
// 1. ASSETS
// =============================================================================

var ASSET_DIR =
  'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO';


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
// 2. BRASIL E ESTADOS
// =============================================================================

var paises = ee.FeatureCollection(
  'FAO/GAUL/2015/level0'
);


var brasil = ee.Feature(
  paises
    .filter(
      ee.Filter.eq(
        'ADM0_NAME',
        'Brazil'
      )
    )
    .first()
).geometry();


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
// 3. VISUALIZAÇÃO
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
// 4. MAPAS — TODOS OS TRIMESTRES
// =============================================================================

Map.addLayer(
  anomaliaDJF,
  VIS_ANOMALIA,
  '01 | DJF — El Niño precipitation anomaly',
  true
);


Map.addLayer(
  anomaliaMAM,
  VIS_ANOMALIA,
  '02 | MAM — El Niño precipitation anomaly',
  false
);


Map.addLayer(
  anomaliaJJA,
  VIS_ANOMALIA,
  '03 | JJA — El Niño precipitation anomaly',
  false
);


Map.addLayer(
  anomaliaSON,
  VIS_ANOMALIA,
  '04 | SON — El Niño precipitation anomaly',
  false
);


// =============================================================================
// 5. LIMITES ESTADUAIS
// =============================================================================

var linhasEstados = ee.Image(0)
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
    palette: ['555555']
  },
  'State boundaries',
  true
);


// =============================================================================
// 6. LIMITE DO BRASIL
// =============================================================================

var linhaBrasil = ee.Image(0)
  .byte()
  .paint({

    featureCollection:
      ee.FeatureCollection([
        ee.Feature(brasil)
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
    palette: ['000000']
  },
  'Brazil boundary',
  true
);


// =============================================================================
// 7. LEGENDA
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


  // ---------------------------------------------------------------------------
  // Título
  // ---------------------------------------------------------------------------

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


  // ---------------------------------------------------------------------------
  // Unidade
  // ---------------------------------------------------------------------------

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


  // ---------------------------------------------------------------------------
  // Cores
  // ---------------------------------------------------------------------------

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


  // ---------------------------------------------------------------------------
  // Informação adicional
  // ---------------------------------------------------------------------------

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
// 8. INSPEÇÃO DOS ASSETS NO CONSOLE
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


// Projection / pixel information

print(
  'DJF projection',
  anomaliaDJF.projection()
);

print(
  'DJF nominal scale',
  anomaliaDJF.projection().nominalScale()
);
