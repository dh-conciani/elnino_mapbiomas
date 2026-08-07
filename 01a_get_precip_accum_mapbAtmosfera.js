// =============================================================================
// SON — PRECIPITAÇÃO ACUMULADA
// MapBiomas Atmosfera
//
// SAÍDAS: EXATAMENTE 4 ASSETS
//
// 1) SON 1997  = Set + Out + Nov de 1997
// 2) SON 2015  = Set + Out + Nov de 2015
// 3) SON 2023  = Set + Out + Nov de 2023
// 4) REFERÊNCIA = média dos totais SON de 1991–2020,
//                 excluindo 1997 e 2015 (El Niño forte dentro da referência)
//
// IMPORTANTE:
// - NÃO calcula anomalia de precipitação.
// - Cada raster dos eventos é o TOTAL ACUMULADO de SON, em mm.
// - O raster de referência é a MÉDIA, pixel a pixel, dos totais SON
//   dos anos de referência selecionados.
// =============================================================================


// =============================================================================
// 1. CONFIGURAÇÃO
// =============================================================================

var CONFIG = {

  anoInicialReferencia: 1991,
  anoFinalReferencia: 2020,

  anoInicialPrecipitacao: 1985,
  anoFinalPrecipitacao: 2024,

  escalaExportacao: 11132,

  assetDir:
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO',

  prefixoSaida:
    'mapbAtmosfera_'

};


// =============================================================================
// 2. EVENTOS — ANO DO SON
// =============================================================================
//
// SON de cada evento:
// 1997/98 -> Set-Out-Nov de 1997
// 2015/16 -> Set-Out-Nov de 2015
// 2023/24 -> Set-Out-Nov de 2023
// =============================================================================

var EVENTOS = [

  {
    nome: '1997_98',
    label: '1997/98',
    anoSON: 1997
  },

  {
    nome: '2015_16',
    label: '2015/16',
    anoSON: 2015
  },

  {
    nome: '2023_24',
    label: '2023/24',
    anoSON: 2023
  }

];


// =============================================================================
// 3. CONFIGURAÇÃO DE SON
// =============================================================================

var SON = {

  mesInicial: 9,
  duracaoMeses: 3,
  label: 'Set-Out-Nov'

};


// =============================================================================
// 4. BRASIL
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

var brasilExport =
  brasil.simplify(
    1000
  );


// =============================================================================
// 5. MAPBIOMAS ATMOSFERA — PRECIPITAÇÃO MENSAL
// =============================================================================
//
// Coleção original:
// - 12 imagens, uma por mês;
// - propriedade "month": 1...12;
// - cada imagem contém bandas precipitation_1985 ... precipitation_2024;
// - unidade: mm de precipitação mensal acumulada.
//
// A coleção é normalizada abaixo para:
// - uma imagem por ano/mês;
// - banda única "precipitacao_mm";
// - propriedades year, month e system:time_start.
// =============================================================================

var MAPBIOMAS_PRECIP_ASSET =
  'projects/mapbiomas-public/assets/brazil/atmosphere/collection1/' +
  'mapbiomas_brazil_collection1_precipitation_monthly_v2';


var mapbiomasPrecipitacaoBruta =
  ee.ImageCollection(
    MAPBIOMAS_PRECIP_ASSET
  );


var anosMapbiomas =
  ee.List.sequence(
    CONFIG.anoInicialPrecipitacao,
    CONFIG.anoFinalPrecipitacao
  );


var mesesMapbiomas =
  ee.List.sequence(
    1,
    12
  );


var imagensMensaisMapbiomas =
  mesesMapbiomas
    .map(

      function(mes) {

        mes = ee.Number(mes);

        var imagemDoMes =
          ee.Image(

            mapbiomasPrecipitacaoBruta
              .filter(
                ee.Filter.eq(
                  'month',
                  mes
                )
              )
              .first()

          );

        return anosMapbiomas
          .map(

            function(ano) {

              ano = ee.Number(ano);

              var nomeBanda =
                ee.String(
                  'precipitation_'
                )
                .cat(
                  ano.format('%d')
                );

              var data =
                ee.Date.fromYMD(
                  ano,
                  mes,
                  1
                );

              return imagemDoMes
                .select(
                  ee.List([
                    nomeBanda
                  ])
                )
                .rename(
                  'precipitacao_mm'
                )
                .max(
                  0
                )
                .toFloat()
                .set({

                  year: ano,

                  month: mes,

                  'system:time_start':
                    data.millis(),

                  unit: 'mm',

                  source:
                    MAPBIOMAS_PRECIP_ASSET

                });

            }

          );

      }

    )
    .flatten();


var mapbiomasPrecipitacaoMensal =
  ee.ImageCollection.fromImages(
    imagensMensaisMapbiomas
  )
  .sort(
    'system:time_start'
  );


print(
  'MapBiomas precipitação — coleção bruta',
  mapbiomasPrecipitacaoBruta
);

print(
  'MapBiomas precipitação — coleção mensal normalizada',
  mapbiomasPrecipitacaoMensal
);

print(
  'N de imagens mensais normalizadas (esperado: 480)',
  mapbiomasPrecipitacaoMensal.size()
);


// =============================================================================
// 6. FUNÇÃO — TOTAL ACUMULADO DE SON
// =============================================================================
//
// Soma:
// setembro + outubro + novembro
//
// Resultado:
// precipitação total acumulada do trimestre SON, em mm.
// =============================================================================

function calcularTotalSON(
  ano
) {

  ano = ee.Number(
    ano
  );

  var inicio =
    ee.Date.fromYMD(
      ano,
      SON.mesInicial,
      1
    );

  var fim =
    inicio.advance(
      SON.duracaoMeses,
      'month'
    );

  return mapbiomasPrecipitacaoMensal

    .filterDate(
      inicio,
      fim
    )

    .sum()

    .rename(
      'precipitacao_total_SON_mm'
    )

    .toFloat()

    .set({

      variable:
        'total_accumulated_precipitation',

      trimester:
        'SON',

      period_label:
        SON.label,

      start_year:
        ano,

      start_month:
        SON.mesInicial,

      duration_months:
        SON.duracaoMeses,

      unit:
        'mm',

      source:
        MAPBIOMAS_PRECIP_ASSET

    });

}


// =============================================================================
// 7. SON ACUMULADO — 1997/98
// =============================================================================

var precipitacaoSON_1997_98 =
  calcularTotalSON(
    1997
  )
  .set({

    event:
      '1997_98',

    event_label:
      '1997/98'

  });


print(
  'SON 1997/98 — precipitação total acumulada (mm)',
  precipitacaoSON_1997_98
);


// =============================================================================
// 8. SON ACUMULADO — 2015/16
// =============================================================================

var precipitacaoSON_2015_16 =
  calcularTotalSON(
    2015
  )
  .set({

    event:
      '2015_16',

    event_label:
      '2015/16'

  });


print(
  'SON 2015/16 — precipitação total acumulada (mm)',
  precipitacaoSON_2015_16
);


// =============================================================================
// 9. SON ACUMULADO — 2023/24
// =============================================================================

var precipitacaoSON_2023_24 =
  calcularTotalSON(
    2023
  )
  .set({

    event:
      '2023_24',

    event_label:
      '2023/24'

  });


print(
  'SON 2023/24 — precipitação total acumulada (mm)',
  precipitacaoSON_2023_24
);


// =============================================================================
// 10. ANOS DA REFERÊNCIA
// =============================================================================
//
// Referência: 1991–2020.
//
// Mantendo a definição dos eventos fortes do script original,
// são removidos os SON de:
//
// 1997
// 2015
//
// 1982 está fora da referência.
// 2023 está fora da referência.
// =============================================================================

var anosElNinoForteSON = ee.List([
  1982,
  1997,
  2015,
  2023
]);


var anosReferenciaSON =
  ee.List.sequence(

    CONFIG.anoInicialReferencia,

    CONFIG.anoFinalReferencia

  )
  .removeAll(
    anosElNinoForteSON
  );


print(
  'Anos usados na referência SON',
  anosReferenciaSON
);

print(
  'N de anos usados na referência SON',
  anosReferenciaSON.size()
);


// =============================================================================
// 11. COLEÇÃO DOS TOTAIS SON DA REFERÊNCIA
// =============================================================================

var totaisSONReferencia =
  ee.ImageCollection.fromImages(

    anosReferenciaSON.map(

      function(ano) {

        ano = ee.Number(
          ano
        );

        return calcularTotalSON(
          ano
        )
        .set({

          reference_year:
            ano,

          reference_period:
            '1991-2020',

          reference:
            'without_strong_el_nino_years'

        });

      }

    )

  );


print(
  'Coleção dos totais SON da referência',
  totaisSONReferencia
);


// =============================================================================
// 12. MÉDIA DOS TOTAIS SON DA REFERÊNCIA
// =============================================================================
//
// Para cada pixel:
//
// média = mean(
//   total SON 1991,
//   total SON 1992,
//   ...,
//   total SON 2020
// )
//
// excluindo 1997 e 2015.
// =============================================================================

var mediaSONReferencia =
  totaisSONReferencia

    .mean()

    .rename(
      'precipitacao_media_total_SON_referencia_mm'
    )

    .toFloat()

    .set({

      variable:
        'mean_total_accumulated_precipitation',

      trimester:
        'SON',

      period_label:
        SON.label,

      reference_period:
        '1991-2020',

      reference:
        'without_strong_el_nino_years',

      excluded_years:
        '1997,2015',

      unit:
        'mm',

      source:
        MAPBIOMAS_PRECIP_ASSET

    });


print(
  'Referência — média da precipitação total acumulada SON (mm)',
  mediaSONReferencia
);


// =============================================================================
// 13. VISUALIZAÇÃO OPCIONAL
// =============================================================================
//
// Apenas para conferir os resultados no mapa.
// NÃO altera as exportações.
// =============================================================================

var VIS_PRECIP = {

  min:
    0,

  max:
    1000,

  palette: [
    'ffffcc',
    'c2e699',
    '78c679',
    '31a354',
    '006837',
    '253494'
  ]

};


Map.centerObject(
  brasil,
  4
);


Map.addLayer(
  precipitacaoSON_1997_98.clip(brasilExport),
  VIS_PRECIP,
  'SON 1997/98 — total acumulado'
);


Map.addLayer(
  precipitacaoSON_2015_16.clip(brasilExport),
  VIS_PRECIP,
  'SON 2015/16 — total acumulado'
);


Map.addLayer(
  precipitacaoSON_2023_24.clip(brasilExport),
  VIS_PRECIP,
  'SON 2023/24 — total acumulado'
);


Map.addLayer(
  mediaSONReferencia.clip(brasilExport),
  VIS_PRECIP,
  'SON referência — média 1991–2020 sem 1997/2015'
);


// =============================================================================
// 14. EXPORTAÇÃO — EXATAMENTE 4 OUTPUTS
// =============================================================================


// -----------------------------------------------------------------------------
// OUTPUT 1 — SON 1997/98
// -----------------------------------------------------------------------------

var nomeAsset1997 =
  CONFIG.prefixoSaida +
  'precip_total_SON_elnino_1997_98';


Export.image.toAsset({

  image:
    precipitacaoSON_1997_98,

  description:
    nomeAsset1997,

  assetId:
    CONFIG.assetDir +
    '/' +
    nomeAsset1997,

  region:
    brasilExport,

  scale:
    CONFIG.escalaExportacao,

  crs:
    'EPSG:4326',

  maxPixels:
    1e13,

  pyramidingPolicy: {

    'precipitacao_total_SON_mm':
      'mean'

  }

});


// -----------------------------------------------------------------------------
// OUTPUT 2 — SON 2015/16
// -----------------------------------------------------------------------------

var nomeAsset2015 =
  CONFIG.prefixoSaida +
  'precip_total_SON_elnino_2015_16';


Export.image.toAsset({

  image:
    precipitacaoSON_2015_16,

  description:
    nomeAsset2015,

  assetId:
    CONFIG.assetDir +
    '/' +
    nomeAsset2015,

  region:
    brasilExport,

  scale:
    CONFIG.escalaExportacao,

  crs:
    'EPSG:4326',

  maxPixels:
    1e13,

  pyramidingPolicy: {

    'precipitacao_total_SON_mm':
      'mean'

  }

});


// -----------------------------------------------------------------------------
// OUTPUT 3 — SON 2023/24
// -----------------------------------------------------------------------------

var nomeAsset2023 =
  CONFIG.prefixoSaida +
  'precip_total_SON_elnino_2023_24';


Export.image.toAsset({

  image:
    precipitacaoSON_2023_24,

  description:
    nomeAsset2023,

  assetId:
    CONFIG.assetDir +
    '/' +
    nomeAsset2023,

  region:
    brasilExport,

  scale:
    CONFIG.escalaExportacao,

  crs:
    'EPSG:4326',

  maxPixels:
    1e13,

  pyramidingPolicy: {

    'precipitacao_total_SON_mm':
      'mean'

  }

});


// -----------------------------------------------------------------------------
// OUTPUT 4 — REFERÊNCIA SON 1991–2020 SEM 1997/2015
// -----------------------------------------------------------------------------

var nomeAssetReferencia =
  CONFIG.prefixoSaida +
  'precip_mean_total_SON_reference_1991_2020_without_strong_elnino';


Export.image.toAsset({

  image:
    mediaSONReferencia,

  description:
    nomeAssetReferencia,

  assetId:
    CONFIG.assetDir +
    '/' +
    nomeAssetReferencia,

  region:
    brasilExport,

  scale:
    CONFIG.escalaExportacao,

  crs:
    'EPSG:4326',

  maxPixels:
    1e13,

  pyramidingPolicy: {

    'precipitacao_media_total_SON_referencia_mm':
      'mean'

  }

});


// =============================================================================
// 15. VERIFICAÇÃO FINAL
// =============================================================================

print(
  'Configurado: 4 exports de precipitação SON.'
);

print(
  '1/4: SON 1997/98 — total acumulado.'
);

print(
  '2/4: SON 2015/16 — total acumulado.'
);

print(
  '3/4: SON 2023/24 — total acumulado.'
);

print(
  '4/4: média SON 1991–2020, excluindo 1997 e 2015.'
);

print(
  'Nenhuma anomalia de precipitação é calculada ou exportada.'
);
