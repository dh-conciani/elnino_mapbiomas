/********************************************************************************
 * ANOMALIA TRIMESTRAL DE PRECIPITAÇÃO — EL NIÑO FORTE
 *
 * ERA5-Land Monthly Aggregated
 * ECMWF/ERA5_LAND/MONTHLY_AGGR
 *
 * Climatologia: 1991–2020
 *
 * Eventos:
 *   1982/83
 *   1997/98
 *   2015/16
 *
 * Saída:
 *   precip_anomaly_elnino_DJF
 *   precip_anomaly_elnino_MAM
 *   precip_anomaly_elnino_JJA
 *   precip_anomaly_elnino_SON
 ********************************************************************************/


// =============================================================================
// 1. CONFIG
// =============================================================================

var CONFIG = {

  inicioClimatologia: '1991-01-01',
  fimClimatologia: '2021-01-01',

  nAnosClimatologia: 30,

  escalaExportacao: 11132,

  assetDir:
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO'

};


// =============================================================================
// 2. TRIMESTRES
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
// 3. BRASIL
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


var brasil = brasilFeature.geometry();


// Simplificação adequada para uma imagem com ~11 km de resolução.
// Reduz bastante o custo de rasterização da geometria no export.

var brasilExport = brasil.simplify(
  1000
);


// Estados apenas para visualização.

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

      // metros -> milímetros

      return image
        .multiply(1000)
        .max(0)
        .rename(
          'precipitacao_mm'
        )
        .copyProperties(
          image,
          ['system:time_start']
        );

    }
  );


// =============================================================================
// 5. TOTAL TRIMESTRAL DE UM EVENTO
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
// 6. MÉDIA DOS EVENTOS EL NIÑO
// =============================================================================

function calcularMediaEventos(
  nomeTrimestre
) {

  var config =
    TRIMESTRES[nomeTrimestre];


  // Client-side list pequena:
  // somente três eventos.

  var imagensEventos =
    config.anosEventos.map(
      function(ano) {

        return calcularTotalTrimestral(
          ano,
          config.mesInicial
        );

      }
    );


  return ee.ImageCollection
    .fromImages(
      imagensEventos
    )

    .mean()

    .rename(
      'media_eventos_mm'
    );

}


// =============================================================================
// 7. FILTRO DOS MESES DA CLIMATOLOGIA
// =============================================================================

function filtroMesesTrimestre(
  nomeTrimestre
) {

  /*
   * DJF cruza dezembro -> janeiro.
   *
   * Para os demais trimestres,
   * calendarRange simples é suficiente.
   */

  if (nomeTrimestre === 'DJF') {

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
    TRIMESTRES[nomeTrimestre].meses;


  return ee.Filter.calendarRange(
    meses[0],
    meses[2],
    'month'
  );

}


// =============================================================================
// 8. CLIMATOLOGIA TRIMESTRAL
// =============================================================================

function calcularClimatologia(
  nomeTrimestre
) {

  /*
   * O código anterior fazia:
   *
   * mean(Jan) + mean(Fev) + mean(Mar)
   *
   * etc.
   *
   * Como existem 30 anos completos:
   *
   * sum(todos os 90 meses) / 30
   *
   * é matematicamente equivalente e produz
   * um grafo de processamento mais simples.
   */


  var colecaoClima = era5Land

    .filterDate(
      CONFIG.inicioClimatologia,
      CONFIG.fimClimatologia
    )

    .filter(
      filtroMesesTrimestre(
        nomeTrimestre
      )
    );


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
// 9. CALCULAR ANOMALIA
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
   * IMPORTANTE:
   *
   * NÃO usamos clip() aqui.
   *
   * A imagem continua no grid original do ERA5-Land.
   * O recorte será aplicado somente no Map / Export.
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
// 10. CALCULAR OS 4 TRIMESTRES
// =============================================================================

var anomalias = {};


NOMES_TRIMESTRES.forEach(
  function(nomeTrimestre) {

    anomalias[nomeTrimestre] =
      calcularAnomalia(
        nomeTrimestre
      );

  }
);


// =============================================================================
// 11. VISUALIZAÇÃO
// =============================================================================

var VIS_ANOMALIA = {

  min: -300,

  max: 300,

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
// 12. MAPAS PARA INSPEÇÃO
// =============================================================================

/*
 * Clip somente para DISPLAY.
 *
 * Só DJF fica ligado inicialmente para evitar
 * várias requisições simultâneas ao servidor.
 */


Map.addLayer(

  anomalias.DJF.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '01 | Anomalia El Niño — DJF',

  true

);


Map.addLayer(

  anomalias.MAM.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '02 | Anomalia El Niño — MAM',

  false

);


Map.addLayer(

  anomalias.JJA.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '03 | Anomalia El Niño — JJA',

  false

);


Map.addLayer(

  anomalias.SON.clip(
    brasilExport
  ),

  VIS_ANOMALIA,

  '04 | Anomalia El Niño — SON',

  false

);


// =============================================================================
// 13. LIMITES ESTADUAIS
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
    palette: ['555555']
  },

  'Limites estaduais',

  true

);


// =============================================================================
// 14. LEGENDA
// =============================================================================

function adicionarLegenda() {

  var painel = ui.Panel({

    style: {

      position:
        'bottom-left',

      padding:
        '8px 12px'

    }

  });


  painel.add(

    ui.Label({

      value:
        'Anomalia de precipitação — El Niño',

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
        'mm por trimestre',

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
    '−300 a −200 mm',
    '−200 a −100 mm',
    '−100 a 0 mm',
    '≈ 0 mm',
    '0 a 100 mm',
    '100 a 200 mm',
    '≥ 300 mm'

  ];


  for (
    var i = 0;
    i < cores.length;
    i++
  ) {

    painel.add(

      ui.Panel({

        widgets: [

          ui.Label({

            style: {

              backgroundColor:
                '#' + cores[i],

              padding:
                '8px',

              margin:
                '0 6px 3px 0'

            }

          }),


          ui.Label({

            value:
              textos[i],

            style: {

              fontSize:
                '11px',

              margin:
                '0 0 3px 0'

            }

          })

        ],

        layout:
          ui.Panel.Layout.Flow(
            'horizontal'
          )

      })

    );

  }


  Map.add(
    painel
  );

}


adicionarLegenda();


// =============================================================================
// 15. EXPORTS
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


    /*
     * NÃO fazemos clip() da imagem.
     *
     * O "region" controla onde a imagem será exportada.
     *
     * brasilExport é uma versão simplificada do limite,
     * adequada à resolução de ~11 km.
     */


    Export.image.toAsset({

      image:
        anomalias[nomeTrimestre],

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


      // Tile menor para deixar o processamento
      // do batch export mais conservador em memória.

      shardSize:
        128,


      // Conforme solicitado.

      pyramidingPolicy: {
        'anomalia_mm': 'mode'
      }

    });


    print(
      'Task criada:',
      nomeAsset
    );

  }
);


// =============================================================================
// 16. CHECK
// =============================================================================

print(
  'DJF',
  anomalias.DJF
);

print(
  'MAM',
  anomalias.MAM
);

print(
  'JJA',
  anomalias.JJA
);

print(
  'SON',
  anomalias.SON
);


print(
  'As quatro tasks devem aparecer na aba Tasks.'
);
