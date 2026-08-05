/********************************************************************************
 * EL NIÑO FORTE:
 * ANOMALIA DE PRECIPITAÇÃO + RESUMOS DA TSM NIÑO 3.4
 *
 * PRECIPITAÇÃO
 * ------------
 * MapBiomas Atmosfera — Precipitação mensal acumulada
 * projects/mapbiomas-public/assets/brazil/atmosphere/collection1/
 * mapbiomas_brazil_collection1_precipitation_monthly_v2
 *
 * TEMPERATURA DA SUPERFÍCIE DO MAR (TSM)
 * --------------------------------------
 * NOAA OISST V2.1
 * NOAA/CDR/OISST/V2_1
 *
 *
 * EVENTOS
 * -------
 * 1997/98
 * 2015/16
 * 2023/24
 *
 * Nota: 1982/83 não é incluído porque a série de precipitação
 * do MapBiomas Atmosfera começa em 1985.
 *
 *
 * REFERÊNCIA DA PRECIPITAÇÃO
 * --------------------------
 * 1991–2020
 *
 * Os períodos associados aos eventos fortes de El Niño
 * dentro da referência são excluídos.
 *
 *
 * ANOMALIA DE PRECIPITAÇÃO
 * ------------------------
 *
 * precipitação sazonal do evento
 *
 * menos
 *
 * precipitação média da referência sem El Niño forte
 *
 *
 * ANOMALIA DA TSM
 * ---------------
 *
 * Média sazonal da anomalia diária da TSM do NOAA OISST.
 *
 * Região Niño 3.4:
 *
 * 5°S–5°N
 * 170°W–120°W
 *
 *
 * FACET
 * -----
 *
 * linhas:
 *   eventos de El Niño
 *
 * colunas:
 *   SON | DJF | MAM | JJA | SET–AGO
 *
 * SET–AGO representa o período completo do evento:
 * setembro do ano inicial até agosto do ano seguinte (12 meses).
 *
 *
 * CADA MAPA MOSTRA:
 *
 * 1. Brasil:
 *      anomalia da precipitação
 *      vermelho -> branco -> azul
 *
 *      Para SET–AGO, a anomalia corresponde ao total acumulado de 12 meses
 *      menos a média de referência dos períodos setembro–agosto.
 *
 * 2. Contorno da região Niño 3.4
 *
 * 3. Caixa com o valor médio da anomalia da TSM em Niño 3.4
 *
 * A camada raster da TSM não é desenhada nos mapas.
 *
 *
 * IMPORTANTE
 * ----------
 *
 * A métrica Niño 3.4 calculada com OISST NÃO é o ONI oficial da NOAA.
 *
 ********************************************************************************/


// =============================================================================
// 1. CONFIGURAÇÃO
// =============================================================================

var CONFIG = {

  anoInicialReferencia:
    1991,

  anoFinalReferencia:
    2020,

  anoInicialPrecipitacao:
    1985,

  anoFinalPrecipitacao:
    2024,

  escalaExportacao:
    11132,

  escalaSST:
    27830,

  assetDir:
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO',

  prefixoSaida:
    'mapbAtmosfera_'

};


// =============================================================================
// 2. EVENTOS DE EL NIÑO
// =============================================================================

var EVENTOS = [


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
      1997,

    ANUAL:
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
      2015,

    ANUAL:
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
      2023,

    ANUAL:
      2023

  }

];


// =============================================================================
// 3. PERÍODOS SAZONAIS E ANUAL SETEMBRO–AGOSTO
// =============================================================================

/*
 * Ordem visual do FACET:
 *
 * SON | DJF | MAM | JJA | SET–AGO
 *
 * O período ANUAL começa em setembro do ano inicial e termina em agosto
 * do ano seguinte, totalizando 12 meses.
 *
 * Ordem cronológica usada no GRÁFICO DA TSM:
 *
 * SON -> DJF -> MAM -> JJA
 *
 * O agregado SET–AGO não entra na linha temporal sazonal da TSM porque é
 * um resumo dos mesmos 12 meses, não uma etapa posterior da sequência.
 */


var TRIMESTRES = {

  DJF: {

    mesInicial:
      12,

    duracaoMeses:
      3,

    label:
      'Dez–Jan–Fev',

    ordemGrafico:
      2,

    tipoPeriodo:
      'trimestral',

    anosEventos: [
      1982,
      1997,
      2015,
      2023
    ]

  },


  MAM: {

    mesInicial:
      3,

    duracaoMeses:
      3,

    label:
      'Mar–Abr–Mai',

    ordemGrafico:
      3,

    tipoPeriodo:
      'trimestral',

    anosEventos: [
      1983,
      1998,
      2016,
      2024
    ]

  },


  JJA: {

    mesInicial:
      6,

    duracaoMeses:
      3,

    label:
      'Jun–Jul–Ago',

    ordemGrafico:
      4,

    tipoPeriodo:
      'trimestral',

    anosEventos: [
      1983,
      1998,
      2016,
      2024
    ]

  },


  SON: {

    mesInicial:
      9,

    duracaoMeses:
      3,

    label:
      'Set–Out–Nov',

    ordemGrafico:
      1,

    tipoPeriodo:
      'trimestral',

    anosEventos: [
      1982,
      1997,
      2015,
      2023
    ]

  },


  ANUAL: {

    mesInicial:
      9,

    duracaoMeses:
      12,

    label:
      'Set–Ago',

    ordemGrafico:
      5,

    tipoPeriodo:
      'anual_setembro_agosto',

    // Anos de início dos eventos. Dentro da referência 1991–2020,
    // somente 1997 e 2015 são removidos; 2023 está fora da referência.
    anosEventos: [
      1982,
      1997,
      2015,
      2023
    ]

  }

};


// Períodos mostrados nos mapas, resumos e exportações.
var NOMES_PERIODOS = [

  'SON',
  'DJF',
  'MAM',
  'JJA',
  'ANUAL'

];


// Somente as quatro estações entram na linha cronológica do gráfico da TSM.
var NOMES_TRIMESTRES = [

  'SON',
  'DJF',
  'MAM',
  'JJA'

];


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


var brasil =
  brasilFeature.geometry();


var brasilExport =
  brasil.simplify(
    1000
  );


var estados = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
)

.filter(

  ee.Filter.eq(
    'ADM0_NAME',
    'Brazil'
  )

);


// =============================================================================
// 4. REGIÃO NIÑO 3.4
// =============================================================================

var nino34 = ee.Geometry.Rectangle(

  [
    -170,
    -5,
    -120,
    5
  ],

  null,

  false

);


// =============================================================================
// 6. REGIÃO DO PACÍFICO PARA A TSM
// =============================================================================

var regiaoPacifico = ee.Geometry.Rectangle(

  [
    -180,
    -30,
    -70,
    30
  ],

  null,

  false

);


// =============================================================================
// 7. EXTENSÃO DO MAPA COMBINADO
// =============================================================================

/*
 * O mapa precisa mostrar:
 *
 * Pacífico tropical + América do Sul.
 */

var regiaoMapaCombinado = ee.Geometry.Rectangle(

  [
    -180,
    -40,
    -30,
    30
  ],

  null,

  false

);


// =============================================================================
// 8. MAPBIOMAS ATMOSFERA — PRECIPITAÇÃO MENSAL
// =============================================================================

/*
 * Estrutura da coleção original:
 *
 * - 12 imagens: uma imagem para cada mês;
 * - propriedade "month": 1 a 12;
 * - cada imagem possui uma banda por ano:
 *     precipitation_1985 ... precipitation_2024;
 * - unidade: mm de precipitação mensal acumulada.
 *
 * Para preservar a lógica temporal usada anteriormente com ERA5-Land,
 * a coleção é normalizada para:
 *
 * - 480 imagens mensais (40 anos × 12 meses);
 * - uma única banda: precipitacao_mm;
 * - propriedades year, month e system:time_start.
 */

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


        mes =
          ee.Number(
            mes
          );


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


              ano =
                ee.Number(
                  ano
                );


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

                // Remove eventuais valores negativos residuais.

                .max(
                  0
                )

                .toFloat()

                .set({

                  year:
                    ano,

                  month:
                    mes,

                  'system:time_start':
                    data.millis(),

                  unit:
                    'mm',

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


// Verificações esperadas:
//
// coleção bruta: 12 imagens
// coleção normalizada: 480 imagens

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
// 9. NOAA OISST — TSM
//
// Mantida para calcular caixas, classificações, tabela e gráfico.
// A imagem raster não é adicionada aos mapas do facet.
// =============================================================================

var oisst = ee.ImageCollection(
  'NOAA/CDR/OISST/V2_1'
)

.filterDate(
  '1981-09-01',
  '2025-01-01'
)

.filterBounds(
  regiaoPacifico
)

.select(
  'anom'
)

.map(

  function(image) {


    /*
     * Fator de escala OISST:
     *
     * 0.01
     *
     * resultado em graus Celsius.
     */

    return image

      .multiply(
        0.01
      )

      .rename(
        'sst_anomaly_C'
      )

      .copyProperties(

        image,

        [
          'system:time_start'
        ]

      );

  }

);


// =============================================================================
// 10. PRECIPITAÇÃO TOTAL DO PERÍODO
// =============================================================================

/*
 * duracaoMeses = 3  -> trimestre
 * duracaoMeses = 12 -> setembro do ano inicial até agosto do ano seguinte
 */

function calcularTotalPeriodo(
  anoInicial,
  mesInicial,
  duracaoMeses
) {


  anoInicial =
    ee.Number(
      anoInicial
    );


  duracaoMeses =
    ee.Number(
      duracaoMeses
    );


  var inicio = ee.Date.fromYMD(

    anoInicial,
    mesInicial,
    1

  );


  var fim = inicio.advance(
    duracaoMeses,
    'month'
  );


  return mapbiomasPrecipitacaoMensal

    .filterDate(
      inicio,
      fim
    )

    .sum()

    .rename(
      'precipitacao_mm'
    )

    .toFloat()

    .set({

      start_year:
        anoInicial,

      start_month:
        mesInicial,

      duration_months:
        duracaoMeses,

      end_exclusive:
        fim.format('YYYY-MM-dd'),

      unit:
        'mm'

    });

}


// =============================================================================
// 11. ANOS DA REFERÊNCIA
// =============================================================================

function obterAnosReferencia(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[
      nomeTrimestre
    ];


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
// 12. COLEÇÃO DE REFERÊNCIA
// =============================================================================

function criarColecaoReferencia(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[
      nomeTrimestre
    ];


  var anos =
    obterAnosReferencia(
      nomeTrimestre
    );


  var imagens =
    anos.map(

      function(ano) {


        ano =
          ee.Number(
            ano
          );


        return calcularTotalPeriodo(

          ano,

          config.mesInicial,

          config.duracaoMeses

        )

        .set({

          reference_year:
            ano,

          trimester:
            nomeTrimestre

        });

      }

    );


  return ee.ImageCollection.fromImages(
    imagens
  );

}


// =============================================================================
// 13. PRECIPITAÇÃO MÉDIA DA REFERÊNCIA
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

    .toFloat();

}


// =============================================================================
// 14. ANOMALIA DE PRECIPITAÇÃO
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


  var observado =
    calcularTotalPeriodo(

      anoEvento,

      config.mesInicial,

      config.duracaoMeses

    );


  var referencia =
    calcularMediaReferencia(
      nomeTrimestre
    );


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

      trimester:
        nomeTrimestre,

      period_label:
        config.label,

      period_type:
        config.tipoPeriodo,

      duration_months:
        config.duracaoMeses,

      start_month:
        config.mesInicial,

      start_year:
        anoEvento,

      unit:
        'mm',

      reference_period:
        '1991-2020',

      reference:
        'years_without_strong_el_nino',

      reference_period_definition:
        ee.String(
          ee.Algorithms.If(
            ee.Number(config.duracaoMeses).eq(12),
            'September_of_start_year_to_August_of_following_year',
            'three_month_season'
          )
        ),

      source:
        MAPBIOMAS_PRECIP_ASSET

    });

}


// =============================================================================
// 15. IMAGEM MÉDIA DA ANOMALIA DA TSM NO PERÍODO
// =============================================================================

function criarImagemSSTPeriodo(
  anoInicial,
  mesInicial,
  duracaoMeses
) {


  anoInicial =
    ee.Number(
      anoInicial
    );


  duracaoMeses =
    ee.Number(
      duracaoMeses
    );


  var inicio = ee.Date.fromYMD(

    anoInicial,
    mesInicial,
    1

  );


  var fim = inicio.advance(
    duracaoMeses,
    'month'
  );


  return oisst

    .filterDate(
      inicio,
      fim
    )

    .mean()

    .rename(
      'sst_anomaly_C'
    )

    .toFloat()

    .set({

      start_year:
        anoInicial,

      start_month:
        mesInicial,

      duration_months:
        duracaoMeses,

      unit:
        'degrees_Celsius',

      source:
        'NOAA/CDR/OISST/V2_1'

    });

}


// =============================================================================
// 16. MÉDIA DA TSM NA REGIÃO NIÑO 3.4
// =============================================================================

function calcularSSTNino34Imagem(
  imagemSST
) {


  var media =
    imagemSST.reduceRegion({

      reducer:
        ee.Reducer.mean(),

      geometry:
        nino34,

      scale:
        CONFIG.escalaSST,

      bestEffort:
        true,

      maxPixels:
        1e8

    })

    .get(
      'sst_anomaly_C'
    );


  return ee.Number(
    media
  );

}


// =============================================================================
// 17. CLASSIFICAÇÃO DA INTENSIDADE — SERVER SIDE
// =============================================================================

function classificarIntensidadeSST(
  valor
) {


  valor =
    ee.Number(
      valor
    );


  return ee.String(

    ee.Algorithms.If(

      valor.gte(
        2.0
      ),

      'Muito forte',


      ee.Algorithms.If(

        valor.gte(
          1.5
        ),

        'Forte',


        ee.Algorithms.If(

          valor.gte(
            1.0
          ),

          'Moderado',


          ee.Algorithms.If(

            valor.gte(
              0.5
            ),

            'Fraco',

            'Abaixo do limiar de El Niño'

          )

        )

      )

    )

  );

}


// =============================================================================
// 18. CLASSIFICAÇÃO DA INTENSIDADE — INTERFACE
// =============================================================================

function classificarIntensidadeClient(
  valor
) {


  if (
    valor >= 2.0
  ) {

    return 'MUITO FORTE';

  }


  if (
    valor >= 1.5
  ) {

    return 'FORTE';

  }


  if (
    valor >= 1.0
  ) {

    return 'MODERADO';

  }


  if (
    valor >= 0.5
  ) {

    return 'FRACO';

  }


  return 'ABAIXO DO LIMIAR DE EL NIÑO';

}


// =============================================================================
// 19. CALCULAR TODOS OS PRODUTOS
// =============================================================================

var resultados = {};

var resultadosSSTValor = {};

var resultadosSSTImagem = {};

var featuresSST = [];


EVENTOS.forEach(

  function(evento) {


    resultados[
      evento.nome
    ] = {};


    resultadosSSTValor[
      evento.nome
    ] = {};


    resultadosSSTImagem[
      evento.nome
    ] = {};


    NOMES_PERIODOS.forEach(

      function(nomeTrimestre) {


        var config =
          TRIMESTRES[
            nomeTrimestre
          ];


        var ano =
          evento[
            nomeTrimestre
          ];


        // ---------------------------------------------------------------------
        // Campo espacial da TSM
        // ---------------------------------------------------------------------

        var imagemSST =
          criarImagemSSTPeriodo(

            ano,

            config.mesInicial,

            config.duracaoMeses

          );


        // ---------------------------------------------------------------------
        // Média em Niño 3.4
        // ---------------------------------------------------------------------

        var sstNino34 =
          calcularSSTNino34Imagem(
            imagemSST
          );


        var intensidade =
          classificarIntensidadeSST(
            sstNino34
          );


        resultadosSSTImagem[
          evento.nome
        ][
          nomeTrimestre
        ] = imagemSST;


        resultadosSSTValor[
          evento.nome
        ][
          nomeTrimestre
        ] = sstNino34;


        // ---------------------------------------------------------------------
        // Anomalia de precipitação
        // ---------------------------------------------------------------------

        var precipitacao =
          calcularAnomaliaEvento(

            nomeTrimestre,

            ano,

            evento.nome,

            evento.label

          )

          .set({

            nino34_sst_anomaly_C:
              sstNino34,

            nino34_intensity:
              intensidade

          });


        resultados[
          evento.nome
        ][
          nomeTrimestre
        ] = precipitacao;


        // ---------------------------------------------------------------------
        // Tabela da TSM
        // ---------------------------------------------------------------------

        featuresSST.push(

          ee.Feature(

            null,

            {

              event:
                evento.nome,

              event_label:
                evento.label,

              trimester:
                nomeTrimestre,

              period_label:
                config.label,

              period_type:
                config.tipoPeriodo,

              duration_months:
                config.duracaoMeses,

              chart_order:
                config.ordemGrafico,

              year:
                ano,

              sst_anomaly_C:
                sstNino34,

              intensity:
                intensidade

            }

          )

        );

      }

    );

  }

);


var tabelaSST =
  ee.FeatureCollection(
    featuresSST
  );


// A linha temporal da TSM usa somente SON, DJF, MAM e JJA.
// O período ANUAL é um agregado dos mesmos 12 meses e permanece na tabela,
// nas caixas dos mapas e nas exportações, mas não é conectado à sequência.
var tabelaSSTSazonal = tabelaSST
  .filter(
    ee.Filter.neq(
      'trimester',
      'ANUAL'
    )
  );


// =============================================================================
// 20. COLEÇÃO DAS ANOMALIAS DE PRECIPITAÇÃO
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
// 21. MÉDIA DAS ANOMALIAS DE PRECIPITAÇÃO
// =============================================================================

function calcularMediaAnomalias(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[
      nomeTrimestre
    ];


  return criarColecaoAnomaliasEventos(
    nomeTrimestre
  )

    .mean()

    .rename(
      'media_anomalias_mm'
    )

    .toFloat()

    .set({
      period: nomeTrimestre,
      period_label: config.label,
      period_type: config.tipoPeriodo,
      duration_months: config.duracaoMeses,
      n_events: EVENTOS.length,
      unit: 'mm'
    });

}


// =============================================================================
// 22. DESVIO-PADRÃO ENTRE EVENTOS
// =============================================================================

function calcularDesvioPadraoAnomalias(
  nomeTrimestre
) {


  var config =
    TRIMESTRES[
      nomeTrimestre
    ];


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
      period: nomeTrimestre,
      period_label: config.label,
      period_type: config.tipoPeriodo,
      duration_months: config.duracaoMeses,
      n_events: EVENTOS.length,
      unit: 'mm'
    });

}


// =============================================================================
// 23. PRODUTOS RESUMIDOS
// =============================================================================

var resultadosMedia = {};

var resultadosStdDev = {};


NOMES_PERIODOS.forEach(

  function(nomeTrimestre) {


    resultadosMedia[
      nomeTrimestre
    ] = calcularMediaAnomalias(
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
// 24. PALETA — ANOMALIA DE PRECIPITAÇÃO
// =============================================================================

/*
 * Vermelho:
 * déficit de precipitação
 *
 * Branco:
 * aproximadamente zero
 *
 * Azul:
 * excesso de precipitação
 */

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

    'ffffff',

    'd1e5f0',
    '92c5de',
    '4393c3',
    '2166ac',
    '053061'

  ]

};


// =============================================================================
// 25. LIMITES ESTADUAIS
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


// =============================================================================
// 26. LIMITES DOS PAÍSES
// =============================================================================

var linhasPaises = ee.Image()

  .byte()

  .paint({

    featureCollection:
      paises,

    color:
      1,

    width:
      1

  })

  .selfMask();


// =============================================================================
// 27. CONTORNO DA REGIÃO NIÑO 3.4
// =============================================================================

var bordaNino34 = ee.Image()

  .byte()

  .paint({

    featureCollection:
      ee.FeatureCollection([

        ee.Feature(
          nino34
        )

      ]),

    color:
      1,

    width:
      2

  })

  .selfMask();


// =============================================================================
// 28. CRIAR UM MAPA DO FACET
//
// A camada raster da TSM foi removida da visualização.
// Os cálculos, caixas e resumos Niño 3.4 são preservados.
// =============================================================================

function criarMapaFacet(
  evento,
  nomeTrimestre
) {


  var mapa =
    ui.Map();


  mapa.setControlVisibility(
    false
  );


  // ===========================================================================
  // 1. ANOMALIA DE PRECIPITAÇÃO — BRASIL
  // ===========================================================================

  var imagemPrecipitacao =

    resultados[
      evento.nome
    ][
      nomeTrimestre
    ]

    .clip(
      brasilExport
    );


  mapa.addLayer(

    imagemPrecipitacao,

    VIS_ANOMALIA,

    'Anomalia de precipitação',

    true

  );


  // ===========================================================================
  // 2. LIMITES DOS PAÍSES
  // ===========================================================================

  mapa.addLayer(

    linhasPaises,

    {

      palette:
        ['777777']

    },

    'Limites dos países',

    true

  );


  // ===========================================================================
  // 3. LIMITES ESTADUAIS DO BRASIL
  // ===========================================================================

  mapa.addLayer(

    linhasEstados,

    {

      palette:
        ['333333']

    },

    'Limites estaduais',

    true

  );


  // ===========================================================================
  // 4. REGIÃO NIÑO 3.4
  // ===========================================================================

  mapa.addLayer(

    bordaNino34,

    {

      palette:
        ['111111']

    },

    'Região Niño 3.4',

    true

  );


  // ===========================================================================
  // 5. IDENTIFICAÇÃO DO EVENTO / PERÍODO
  // ===========================================================================

  var labelPeriodo =
    ui.Label({

      value:

        evento.label +
        ' | ' +
        TRIMESTRES[nomeTrimestre].label,

      style: {

        fontWeight:
          'bold',

        fontSize:
          '10px',

        backgroundColor:
          'ffffff',

        padding:
          '2px 4px',

        margin:
          '0 0 1px 0'

      }

    });


  // ===========================================================================
  // 6. VALOR DA ANOMALIA NIÑO 3.4
  // ===========================================================================

  var labelSST =
    ui.Label({

      value:
        'Niño 3.4: calculando...',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '9px',

        backgroundColor:
          'ffffff',

        padding:
          '1px 4px',

        margin:
          '0'

      }

    });


  var labelIntensidade =
    ui.Label({

      value:
        '',

      style: {

        fontSize:
          '8px',

        backgroundColor:
          'ffffff',

        padding:
          '1px 4px 2px 4px',

        margin:
          '0'

      }

    });


  var painelInfo =
    ui.Panel({

      widgets: [

        labelPeriodo,
        labelSST,
        labelIntensidade

      ],

      layout:
        ui.Panel.Layout.Flow(
          'vertical'
        ),

      style: {

        position:
          'top-left',

        margin:
          '3px',

        padding:
          '1px',

        width:
          '112px',

        border:
          '1px solid #aaaaaa',

        backgroundColor:
          'ffffff'

      }

    });


  mapa.add(
    painelInfo
  );


  // ===========================================================================
  // 7. ATUALIZAR VALOR DA TSM
  // ===========================================================================

  resultadosSSTValor[
    evento.nome
  ][
    nomeTrimestre
  ]

  .evaluate(

    function(valor) {


      if (
        valor === null
      ) {


        labelSST.setValue(
          'Niño 3.4: sem dados'
        );


        return;

      }


      var sinal =
        valor > 0
          ? '+'
          : '';


      // Decimal em português.

      var valorTexto =
        valor
          .toFixed(2)
          .replace('.', ',');


      labelSST.setValue(

        'Niño 3.4: ' +

        sinal +

        valorTexto +

        ' °C'

      );


      labelIntensidade.setValue(

        classificarIntensidadeClient(
          valor
        )

      );

    }

  );


  // ===========================================================================
  // 8. ESTILO DO MAPA
  // ===========================================================================

  mapa.style().set({

    stretch:
      'both',

    border:
      '1px solid #cccccc'

  });


  return mapa;

}


// =============================================================================
// 30. CABEÇALHO DAS COLUNAS
// =============================================================================

function criarCabecalhoFacet() {


  var painel =
    ui.Panel({

      layout:
        ui.Panel.Layout.Flow(
          'horizontal'
        ),

      style: {

        stretch:
          'horizontal',

        height:
          '42px'

      }

    });


  painel.add(

    ui.Label({

      value:
        'El Niño',

      style: {

        width:
          '115px',

        fontWeight:
          'bold',

        textAlign:
          'center',

        padding:
          '11px 2px',

        backgroundColor:
          'eeeeee',

        border:
          '1px solid #cccccc'

      }

    })

  );


  NOMES_PERIODOS.forEach(

    function(nomeTrimestre) {


      painel.add(

        ui.Label({

          value:
            TRIMESTRES[
              nomeTrimestre
            ].label,

          style: {

            stretch:
              'horizontal',

            fontWeight:
              'bold',

            fontSize:
              '11px',

            textAlign:
              'center',

            padding:
              '11px 2px',

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
// 31. MÁXIMO DA TSM ENTRE OS CINCO PERÍODOS EXIBIDOS
// =============================================================================

function calcularMaxSSTEvento(
  evento
) {


  var valores = [];


  NOMES_PERIODOS.forEach(

    function(nomeTrimestre) {


      valores.push(

        resultadosSSTValor[
          evento.nome
        ][
          nomeTrimestre
        ]

      );

    }

  );


  return ee.Number(

    ee.List(
      valores
    )

    .reduce(
      ee.Reducer.max()
    )

  );

}


// =============================================================================
// 32. LEGENDA — PRECIPITAÇÃO
// =============================================================================

function criarLegendaAnomalia() {


  var painel =
    ui.Panel({

      style: {

        padding:
          '8px',

        backgroundColor:
          'ffffff'

      }

    });


  painel.add(

    ui.Label({

      value:
        'Anomalia de precipitação',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '13px'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'Evento − referência sem El Niño forte',

      style: {

        fontSize:
          '10px',

        margin:
          '0 0 2px 0'

      }

    })

  );


  painel.add(

    ui.Label({

      value:
        'mm por período',

      style: {

        fontSize:
          '10px',

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
                '0 6px 2px 0',

              border:
                '1px solid #999999'

            }

          }),


          ui.Label({

            value:
              textos[i],

            style: {

              fontSize:
                '10px',

              margin:
                '2px 0 0 0'

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


  painel.add(

    ui.Label({

      value:
        'Vermelho = déficit | Azul = excesso',

      style: {

        fontSize:
          '9px',

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
        'Referência: 1991–2020',

      style: {

        fontSize:
          '9px',

        color:
          '666666',

        margin:
          '2px 0 0 0'

      }

    })

  );


  return painel;

}


// =============================================================================
// 33. LEGENDA — INTENSIDADE NIÑO 3.4
// =============================================================================

function criarLegendaIntensidadeSST() {


  var painel =
    ui.Panel({

      style: {

        padding:
          '8px',

        margin:
          '7px 0 0 0',

        backgroundColor:
          'ffffff'

      }

    });


  painel.add(

    ui.Label({

      value:
        'Intensidade do aquecimento — Niño 3.4',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '13px'

      }

    })

  );


  var textos = [

    '< +0,5 °C — abaixo do limiar',

    '+0,5 a +0,99 °C — fraco',

    '+1,0 a +1,49 °C — moderado',

    '+1,5 a +1,99 °C — forte',

    '≥ +2,0 °C — muito forte'

  ];


  textos.forEach(

    function(texto) {


      painel.add(

        ui.Label({

          value:
            texto,

          style: {

            fontSize:
              '10px',

            margin:
              '1px 0'

          }

        })

      );

    }

  );


  painel.add(

    ui.Label({

      value:
        'Classificação descritiva OISST; não corresponde ao ONI oficial.',

      style: {

        fontSize:
          '9px',

        color:
          '666666',

        margin:
          '7px 0 0 0'

      }

    })

  );


  return painel;

}


// =============================================================================
// 35. CONSTRUIR O FACET 3 × 5
// =============================================================================

var mapasFacet = [];


var painelGrid =
  ui.Panel({

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


painelGrid.add(
  criarCabecalhoFacet()
);


EVENTOS.forEach(

  function(evento) {


    var linha =
      ui.Panel({

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
    // CABEÇALHO DA LINHA
    // -------------------------------------------------------------------------

    var labelEvento =
      ui.Label({

        value:
          evento.label,

        style: {

          fontWeight:
            'bold',

          fontSize:
            '11px',

          textAlign:
            'center',

          stretch:
            'horizontal',

          margin:
            '4px 0 2px 0'

        }

      });


    var labelPico =
      ui.Label({

        value:
          'máx. exibido: ...',

        style: {

          fontSize:
            '7px',

          textAlign:
            'center',

          stretch:
            'horizontal'

        }

      });


    var labelClasse =
      ui.Label({

        value:
          '',

        style: {

          fontSize:
            '8px',

          fontWeight:
            'bold',

          textAlign:
            'center',

          stretch:
            'horizontal',

          margin:
            '2px 0'

        }

      });


    var painelAno =
      ui.Panel({

        widgets: [

          labelEvento,
          labelPico,
          labelClasse

        ],

        layout:
          ui.Panel.Layout.Flow(
            'vertical'
          ),

        style: {

          width:
            '96px',

          stretch:
            'vertical',

          backgroundColor:
            'eeeeee',

          border:
            '1px solid #cccccc'

        }

      });


    // -------------------------------------------------------------------------
    // Maior valor entre os quatro períodos exibidos.
    // -------------------------------------------------------------------------

    calcularMaxSSTEvento(
      evento
    )

    .evaluate(

      function(valor) {


        if (
          valor === null
        ) {

          return;

        }


        var sinal =
          valor > 0
            ? '+'
            : '';


        var textoValor =
          valor
            .toFixed(2)
            .replace('.', ',');


        labelPico.setValue(

          'máx. exibido: ' +

          sinal +

          textoValor +

          ' °C'

        );


        labelClasse.setValue(

          classificarIntensidadeClient(
            valor
          )

        );

      }

    );


    linha.add(
      painelAno
    );


    // -------------------------------------------------------------------------
    // QUATRO MAPAS
    // -------------------------------------------------------------------------

    NOMES_PERIODOS.forEach(

      function(nomeTrimestre) {


        var mapa =
          criarMapaFacet(

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
// 36. SINCRONIZAR TODOS OS MAPAS
// =============================================================================

var linkerFacet = ui.Map.Linker(

  mapasFacet,

  'change-bounds'

);


// =============================================================================
// 37. GRÁFICO — EVOLUÇÃO DA TSM
//
// A ordem é CRONOLÓGICA:
//
// SON -> DJF -> MAM -> JJA
// =============================================================================

var graficoSST = ui.Chart.feature.groups(

  tabelaSSTSazonal,

  'chart_order',

  'sst_anomaly_C',

  'event_label'

)

.setChartType(
  'LineChart'
)

.setOptions({

  title:
    'Evolução da anomalia da TSM na região Niño 3.4',

  hAxis: {

    title:
      'Sequência sazonal do evento',

    ticks: [

      {

        v:
          1,

        f:
          'SON'

      },

      {

        v:
          2,

        f:
          'DJF'

      },

      {

        v:
          3,

        f:
          'MAM'

      },

      {

        v:
          4,

        f:
          'JJA'

      }

    ]

  },


  vAxis: {

    title:
      'Anomalia da TSM (°C)',

    baseline:
      0,

    viewWindow: {

      min:
        -2,

      max:
        3.5

    }

  },


  lineWidth:
    2,


  pointSize:
    5,


  legend: {

    position:
      'bottom',

    textStyle: {

      fontSize:
        9

    }

  },


  chartArea: {

    left:
      60,

    top:
      45,

    width:
      '74%',

    height:
      '58%'

  }

});


// =============================================================================
// 38. TÍTULO
// =============================================================================

var painelTitulo =
  ui.Panel({

    widgets: [

      ui.Label({

        value:
          'Anomalias de precipitação durante eventos fortes de El Niño',

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
          'Brasil: anomalia trimestral e Set–Ago | Niño 3.4: valores e classificação OISST',

        style: {

          fontSize:
            '11px',

          color:
            '555555',

          margin:
            '0 8px 2px 8px'

        }

      }),


      ui.Label({

        value:
          'Mapas: MapBiomas Atmosfera | Resumos Niño 3.4: NOAA OISST',

        style: {

          fontSize:
            '10px',

          color:
            '777777',

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
        'ffffff'

    }

  });


// =============================================================================
// 39. PAINEL LATERAL
// =============================================================================

var painelLateral =
  ui.Panel({

    widgets: [

      criarLegendaAnomalia(),


      criarLegendaIntensidadeSST(),

      ui.Label({

        value:
          'Evolução da temperatura do oceano',

        style: {

          fontWeight:
            'bold',

          fontSize:
            '13px',

          margin:
            '12px 8px 0 8px'

        }

      }),

      graficoSST

    ],

    layout:
      ui.Panel.Layout.Flow(
        'vertical'
      ),

    style: {

      width:
        '355px',

      padding:
        '5px',

      backgroundColor:
        'ffffff'

    }

  });


// =============================================================================
// 40. CORPO PRINCIPAL
// =============================================================================

var painelCorpo =
  ui.Panel({

    widgets: [

      painelGrid,

      painelLateral

    ],

    layout:
      ui.Panel.Layout.Flow(
        'horizontal'
      ),

    style: {

      stretch:
        'both'

    }

  });


// =============================================================================
// 41. APLICAÇÃO
// =============================================================================

var painelAplicacao =
  ui.Panel({

    widgets: [

      painelTitulo,

      painelCorpo

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


ui.root.clear();


ui.root.add(
  painelAplicacao
);


// =============================================================================
// 42. EXTENSÃO INICIAL
//
// Todos os mapas estão sincronizados.
// =============================================================================

mapasFacet[0].setCenter(

  -105,

  -5,

  2

);


// =============================================================================
// 43. TABELA DA TSM
// =============================================================================

print(

  'Anomalias sazonais e Set–Ago da TSM na região Niño 3.4',

  tabelaSST

);


// =============================================================================
// 44. VALORES DA TSM
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_PERIODOS.forEach(

      function(nomeTrimestre) {


        print(

          evento.label +
          ' | ' +
          nomeTrimestre +
          ' | anomalia TSM Niño 3.4',

          resultadosSSTValor[
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
// 45. VERIFICAR ANOS DE REFERÊNCIA
// =============================================================================

NOMES_PERIODOS.forEach(

  function(nomeTrimestre) {


    print(

      'Anos da referência | ' +
      nomeTrimestre,

      obterAnosReferencia(
        nomeTrimestre
      )

    );


    print(

      'N da referência | ' +
      nomeTrimestre,

      criarColecaoReferencia(
        nomeTrimestre
      ).size()

    );

  }

);


// =============================================================================
// 46. EXPORTAR 15 ANOMALIAS DE PRECIPITAÇÃO
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_PERIODOS.forEach(

      function(nomeTrimestre) {


        var nomeAsset =

          CONFIG.prefixoSaida +

          'precip_anomaly_elnino_' +

          evento.nome +

          '_' +

          nomeTrimestre;


        Export.image.toAsset({

          image:

            resultados[
              evento.nome
            ][
              nomeTrimestre
            ],

          description:
            nomeAsset,

          assetId:
            CONFIG.assetDir +
            '/' +
            nomeAsset,

          region:
            brasilExport,

          scale:
            CONFIG.escalaExportacao,

          crs:
            'EPSG:4326',

          maxPixels:
            1e13,

          pyramidingPolicy: {

            'anomalia_mm':
              'mean'

          }

        });

      }

    );

  }

);


// =============================================================================
// 47. EXPORTAR 15 MAPAS DE ANOMALIA DA TSM
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_PERIODOS.forEach(

      function(nomeTrimestre) {


        var nomeAsset =

          CONFIG.prefixoSaida +

          'sst_anomaly_pacific_elnino_' +

          evento.nome +

          '_' +

          nomeTrimestre;


        var imagem =

          resultadosSSTImagem[
            evento.nome
          ][
            nomeTrimestre
          ]

          .set({

            event:
              evento.nome,

            event_label:
              evento.label,

            trimester:
              nomeTrimestre,

            period_label:
              TRIMESTRES[nomeTrimestre].label,

            period_type:
              TRIMESTRES[nomeTrimestre].tipoPeriodo,

            duration_months:
              TRIMESTRES[nomeTrimestre].duracaoMeses,

            nino34_sst_anomaly_C:

              resultadosSSTValor[
                evento.nome
              ][
                nomeTrimestre
              ],

            source:
              'NOAA/CDR/OISST/V2_1'

          });


        Export.image.toAsset({

          image:
            imagem,

          description:
            nomeAsset,

          assetId:
            CONFIG.assetDir +
            '/' +
            nomeAsset,

          region:
            regiaoPacifico,

          scale:
            CONFIG.escalaSST,

          crs:
            'EPSG:4326',

          maxPixels:
            1e13,

          pyramidingPolicy: {

            'sst_anomaly_C':
              'mean'

          }

        });

      }

    );

  }

);


// =============================================================================
// 48. EXPORTAR TABELA DA TSM
// =============================================================================

Export.table.toDrive({

  collection:
    tabelaSST,

  description:
    CONFIG.prefixoSaida +
    'nino34_OISST_intensidade_eventos_elnino',

  fileNamePrefix:
    CONFIG.prefixoSaida +
    'nino34_OISST_intensidade_eventos_elnino',

  fileFormat:
    'CSV',

  selectors: [

    'event',
    'event_label',
    'trimester',
    'period_label',
    'period_type',
    'duration_months',
    'year',
    'sst_anomaly_C',
    'intensity'

  ]

});


// =============================================================================
// 49. EXPORTAR MÉDIA DAS ANOMALIAS DE PRECIPITAÇÃO
// =============================================================================

NOMES_PERIODOS.forEach(

  function(nomeTrimestre) {


    var nomeAsset =

      CONFIG.prefixoSaida +

      'precip_anomaly_mean_3elnino_' +

      nomeTrimestre;


    Export.image.toAsset({

      image:
        resultadosMedia[
          nomeTrimestre
        ],

      description:
        nomeAsset,

      assetId:
        CONFIG.assetDir +
        '/' +
        nomeAsset,

      region:
        brasilExport,

      scale:
        CONFIG.escalaExportacao,

      crs:
        'EPSG:4326',

      maxPixels:
        1e13,

      pyramidingPolicy: {

        'media_anomalias_mm':
          'mean'

      }

    });

  }

);


// =============================================================================
// 50. EXPORTAR DESVIO-PADRÃO ENTRE EVENTOS
// =============================================================================

NOMES_PERIODOS.forEach(

  function(nomeTrimestre) {


    var nomeAsset =

      CONFIG.prefixoSaida +

      'precip_anomaly_stddev_3elnino_' +

      nomeTrimestre;


    Export.image.toAsset({

      image:
        resultadosStdDev[
          nomeTrimestre
        ],

      description:
        nomeAsset,

      assetId:
        CONFIG.assetDir +
        '/' +
        nomeAsset,

      region:
        brasilExport,

      scale:
        CONFIG.escalaExportacao,

      crs:
        'EPSG:4326',

      maxPixels:
        1e13,

      pyramidingPolicy: {

        'stddev_anomalias_mm':
          'mean'

      }

    });

  }

);


// =============================================================================
// 51. VERIFICAÇÃO FINAL
// =============================================================================

print(
  'Análise configurada.'
);


print(
  'Nota: 1982/83 foi removido porque o MapBiomas Atmosfera começa em 1985.'
);


print(
  'Eventos: 1997/98, 2015/16 e 2023/24.'
);


print(
  'A camada raster da TSM não é desenhada nos mapas.'
);


print(
  'Brasil: anomalia sazonal e anual Set–Ago de precipitação — MapBiomas Atmosfera.'
);


print(
  'Período ANUAL: setembro do ano inicial até agosto do ano seguinte (12 meses).'
);


print(
  'Referência ANUAL: períodos Set–Ago iniciados entre 1991 e 2020, excluindo 1997 e 2015.'
);


print(
  'Os valores, caixas, classificações, tabela e gráfico Niño 3.4 são preservados.'
);


print(
  'Precipitação: vermelho → branco → azul.'
);



print(
  'Retângulo preto = região Niño 3.4; sem preenchimento raster da TSM.'
);


print(
  'Prefixo de todas as saídas: mapbAtmosfera_.'
);


print(
  'Gráfico da TSM: ordem cronológica SON → DJF → MAM → JJA; o agregado Set–Ago não é conectado à linha.'
);
