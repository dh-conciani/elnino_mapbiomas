/********************************************************************************
 * EL NIÑO FORTE:
 * ANOMALIA DA TEMPERATURA DO AR A 2 M + ANOMALIA DA TSM NO MESMO MAPA
 *
 * TEMPERATURA DO AR A 2 M
 * ----------------------
 * ERA5-Land Monthly Aggregated
 * ECMWF/ERA5_LAND/MONTHLY_AGGR
 *
 * TEMPERATURA DA SUPERFÍCIE DO MAR (TSM)
 * --------------------------------------
 * NOAA OISST V2.1
 * NOAA/CDR/OISST/V2_1
 *
 *
 * EVENTOS
 * -------
 * 1982/83
 * 1997/98
 * 2015/16
 * 2023/24
 *
 *
 * REFERÊNCIA DA TEMPERATURA DO AR A 2 M
 * --------------------------
 * 1991–2020
 *
 * Os períodos associados aos eventos fortes de El Niño
 * dentro da referência são excluídos.
 *
 *
 * ANOMALIA DA TEMPERATURA DO AR A 2 M
 * ------------------------
 *
 * temperatura média sazonal do evento
 *
 * menos
 *
 * temperatura média sazonal da referência sem El Niño forte
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
 *   SON | DJF | MAM | JJA
 *
 *
 * CADA MAPA MOSTRA SIMULTANEAMENTE:
 *
 * 1. Pacífico:
 *      anomalia da TSM
 *      roxo -> branco -> laranja
 *
 * 2. Brasil:
 *      anomalia da temperatura do ar a 2 m
 *      vermelho -> branco -> azul
 *
 * 3. Região Niño 3.4
 *
 * 4. Valor médio da anomalia da TSM em Niño 3.4
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

  escalaExportacao:
    11132,

  escalaSST:
    27830,

  assetDir:
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO'

};


// =============================================================================
// 2. EVENTOS DE EL NIÑO
// =============================================================================

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
// 3. TRIMESTRES
// =============================================================================

/*
 * Ordem visual do FACET:
 *
 * SON | DJF | MAM | JJA
 *
 *
 * Ordem cronológica usada no GRÁFICO:
 *
 * SON -> DJF -> MAM -> JJA
 */


var TRIMESTRES = {

  DJF: {

    mesInicial:
      12,

    label:
      'Dez–Jan–Fev',

    ordemGrafico:
      2,

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

    label:
      'Mar–Abr–Mai',

    ordemGrafico:
      3,

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

    label:
      'Jun–Jul–Ago',

    ordemGrafico:
      4,

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

    label:
      'Set–Out–Nov',

    ordemGrafico:
      1,

    anosEventos: [
      1982,
      1997,
      2015,
      2023
    ]

  }

};


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
// 5. REGIÃO NIÑO 3.4
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
// 8. ERA5-LAND — TEMPERATURA DO AR A 2 M
// =============================================================================

var era5Land = ee.ImageCollection(
  'ECMWF/ERA5_LAND/MONTHLY_AGGR'
)

.filterDate(
  '1981-01-01',
  '2025-01-01'
)

.select(
  'temperature_2m'
)

.map(

  function(image) {

    return image

      // Kelvin -> graus Celsius

      .subtract(
        273.15
      )

      .rename(
        'temperatura_2m_C'
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
// 9. NOAA OISST — TSM
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
// 10. TEMPERATURA MÉDIA TRIMESTRAL DO AR A 2 M
// =============================================================================

function calcularMediaTrimestralTemperatura2m(
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

    .mean()

    .rename(
      'temperatura_2m_C'
    )

    .toFloat();

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


        return calcularMediaTrimestralTemperatura2m(

          ano,

          config.mesInicial

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
// 13. TEMPERATURA DO AR A 2 M MÉDIA DA REFERÊNCIA
// =============================================================================

function calcularMediaReferenciaTemperatura2m(
  nomeTrimestre
) {


  return criarColecaoReferencia(
    nomeTrimestre
  )

    .mean()

    .rename(
      'referencia_temperatura_C'
    )

    .toFloat();

}


// =============================================================================
// 14. ANOMALIA DA TEMPERATURA DO AR A 2 M
// =============================================================================

function calcularAnomaliaTemperatura2mEvento(
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
    calcularMediaTrimestralTemperatura2m(

      anoEvento,

      config.mesInicial

    );


  var referencia =
    calcularMediaReferenciaTemperatura2m(
      nomeTrimestre
    );


  return observado

    .subtract(
      referencia
    )

    .rename(
      'anomalia_temperatura_C'
    )

    .toFloat()

    .set({

      variable:
        'temperature_2m_anomaly',

      event:
        nomeEvento,

      event_label:
        labelEvento,

      trimester:
        nomeTrimestre,

      unit:
        'degrees_Celsius',

      reference_period:
        '1991-2020',

      reference:
        'years_without_strong_el_nino',

      source:
        'ECMWF/ERA5_LAND/MONTHLY_AGGR'

    });

}


// =============================================================================
// 15. IMAGEM TRIMESTRAL DA ANOMALIA DA TSM
// =============================================================================

function criarImagemSSTTrimestral(
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


    NOMES_TRIMESTRES.forEach(

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
          criarImagemSSTTrimestral(

            ano,

            config.mesInicial

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
        // Anomalia da temperatura do ar a 2 m
        // ---------------------------------------------------------------------

        var temperatura2m =
          calcularAnomaliaTemperatura2mEvento(

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
        ] = temperatura2m;


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


// =============================================================================
// 20. COLEÇÃO DAS ANOMALIAS DE TEMPERATURA DO AR A 2 M
// =============================================================================

function criarColecaoAnomaliasTemperatura2mEventos(
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
// 21. MÉDIA DAS ANOMALIAS DE TEMPERATURA DO AR A 2 M
// =============================================================================

function calcularMediaAnomaliasTemperatura2m(
  nomeTrimestre
) {


  return criarColecaoAnomaliasTemperatura2mEventos(
    nomeTrimestre
  )

    .mean()

    .rename(
      'media_anomalias_temperatura_C'
    )

    .toFloat();

}


// =============================================================================
// 22. DESVIO-PADRÃO ENTRE EVENTOS
// =============================================================================

function calcularDesvioPadraoAnomaliasTemperatura2m(
  nomeTrimestre
) {


  return criarColecaoAnomaliasTemperatura2mEventos(
    nomeTrimestre
  )

    .reduce(
      ee.Reducer.stdDev()
    )

    .rename(
      'stddev_anomalias_temperatura_C'
    )

    .toFloat();

}


// =============================================================================
// 23. PRODUTOS RESUMIDOS
// =============================================================================

var resultadosMediaTemperatura = {};

var resultadosStdDevTemperatura = {};


NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    resultadosMediaTemperatura[
      nomeTrimestre
    ] = calcularMediaAnomaliasTemperatura2m(
      nomeTrimestre
    );


    resultadosStdDevTemperatura[
      nomeTrimestre
    ] = calcularDesvioPadraoAnomaliasTemperatura2m(
      nomeTrimestre
    );

  }

);


// =============================================================================
// 24. PALETA — ANOMALIA DA TEMPERATURA DO AR A 2 M
// =============================================================================

/*
 * Azul:
 * temperatura abaixo da referência
 *
 * Branco:
 * aproximadamente zero
 *
 * Vermelho:
 * temperatura acima da referência
 */

var VIS_T2M = {

  min:
    -3,

  max:
    3,

  palette: [

    '053061',
    '2166ac',
    '4393c3',
    '92c5de',
    'd1e5f0',

    'ffffff',

    'fddbc7',
    'f4a582',
    'd6604d',
    'b2182b',
    '8b0000'

  ]

};


// =============================================================================
// 25. PALETA — ANOMALIA DA TSM
// =============================================================================

/*
 * PALETA DIFERENTE DA TEMPERATURA DO AR A 2 M.
 *
 * Roxo:
 * TSM mais fria
 *
 * Branco:
 * aproximadamente zero
 *
 * Laranja:
 * TSM mais quente
 */

var VIS_SST = {

  min:
    -3,

  max:
    3,

  palette: [

    '3f007d',
    '54278f',
    '756bb1',
    '9e9ac8',
    'cbc9e2',

    'f7f7f7',

    'fee6ce',
    'fdd0a2',
    'fdae6b',
    'f16913',
    'd94801',
    '8c2d04'

  ]

};


// =============================================================================
// 26. LIMITES ESTADUAIS
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
// 27. LIMITES DOS PAÍSES
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
// 28. CONTORNO DA REGIÃO NIÑO 3.4
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
// 29. CRIAR UM MAPA DO FACET
//
// IMPORTANTE:
//
// SST e temperatura do ar a 2 m aparecem NO MESMO MAPA.
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
  // 1. ANOMALIA DA TSM — PACÍFICO
  // ===========================================================================

  var imagemSST =

    resultadosSSTImagem[
      evento.nome
    ][
      nomeTrimestre
    ]

    .clip(
      regiaoPacifico
    );


  mapa.addLayer(

    imagemSST,

    VIS_SST,

    'Anomalia da TSM',

    true

  );


  // ===========================================================================
  // 2. ANOMALIA DA TEMPERATURA DO AR A 2 M — BRASIL
  // ===========================================================================

  var imagemTemperatura2m =

    resultados[
      evento.nome
    ][
      nomeTrimestre
    ]

    .clip(
      brasilExport
    );


  mapa.addLayer(

    imagemTemperatura2m,

    VIS_T2M,

    'Anomalia da temperatura do ar a 2 m',

    true

  );


  // ===========================================================================
  // 3. LIMITES DOS PAÍSES
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
  // 4. LIMITES ESTADUAIS DO BRASIL
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
  // 5. REGIÃO NIÑO 3.4
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
  // 6. IDENTIFICAÇÃO DO EVENTO / PERÍODO
  // ===========================================================================

  var labelPeriodo =
    ui.Label({

      value:

        evento.label +
        ' | ' +
        nomeTrimestre,

      style: {

        fontWeight:
          'bold',

        fontSize:
          '11px',

        backgroundColor:
          'ffffff',

        padding:
          '3px 5px',

        margin:
          '0 0 2px 0'

      }

    });


  // ===========================================================================
  // 7. VALOR DA ANOMALIA NIÑO 3.4
  // ===========================================================================

  var labelSST =
    ui.Label({

      value:
        'Niño 3.4: calculando...',

      style: {

        fontWeight:
          'bold',

        fontSize:
          '10px',

        backgroundColor:
          'ffffff',

        padding:
          '2px 5px',

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
          '9px',

        backgroundColor:
          'ffffff',

        padding:
          '1px 5px 3px 5px',

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
          '4px',

        padding:
          '2px',

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
  // 8. ATUALIZAR VALOR DA TSM
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
  // 9. ESTILO DO MAPA
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


  NOMES_TRIMESTRES.forEach(

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
// 31. MÁXIMO DA TSM ENTRE OS QUATRO PERÍODOS EXIBIDOS
// =============================================================================

function calcularMaxSSTEvento(
  evento
) {


  var valores = [];


  NOMES_TRIMESTRES.forEach(

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
// 32. LEGENDA — TEMPERATURA DO AR A 2 M
// =============================================================================

function criarLegendaTemperatura2m() {


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
        'Anomalia da temperatura do ar a 2 m',

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
        '°C',

      style: {

        fontSize:
          '10px',

        margin:
          '0 0 8px 0'

      }

    })

  );


  var cores = [

    '053061',
    '2166ac',
    '4393c3',
    '92c5de',

    'ffffff',

    'fddbc7',
    'f4a582',
    '8b0000'

  ];


  var textos = [

    '≤ −3 °C',
    '−3 a −2 °C',
    '−2 a −1 °C',
    '−1 a 0 °C',

    '≈ 0 °C',

    '0 a +1 °C',
    '+1 a +2 °C',
    '≥ +3 °C'

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
        'Azul = mais frio | Vermelho = mais quente',

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
// 33. LEGENDA — TSM
// =============================================================================

function criarLegendaCorSST() {


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
        'Anomalia da TSM',

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
        'NOAA OISST — temperatura da superfície do mar',

      style: {

        fontSize:
          '10px',

        margin:
          '0 0 8px 0'

      }

    })

  );


  var cores = [

    '3f007d',
    '756bb1',
    'cbc9e2',

    'f7f7f7',

    'fee6ce',
    'fdae6b',
    'd94801'

  ];


  var textos = [

    '≤ −3 °C',
    '−2 a −1 °C',
    '−1 a 0 °C',

    '≈ 0 °C',

    '0 a +1 °C',
    '+1 a +2 °C',
    '≥ +3 °C'

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
        'Roxo = resfriamento | Laranja = aquecimento',

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
// 34. LEGENDA — INTENSIDADE NIÑO 3.4
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
// 35. CONSTRUIR O FACET 4 × 4
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
            '12px',

          textAlign:
            'center',

          stretch:
            'horizontal',

          margin:
            '5px 0 3px 0'

        }

      });


    var labelPico =
      ui.Label({

        value:
          'máx. exibido: ...',

        style: {

          fontSize:
            '8px',

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
            '9px',

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
            '115px',

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

    NOMES_TRIMESTRES.forEach(

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

  tabelaSST,

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
          'Anomalias de temperatura do ar a 2 m e TSM durante eventos fortes de El Niño',

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
          'Pacífico tropical: anomalia da TSM | Brasil: anomalia de temperatura do ar a 2 m',

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
          'TSM: NOAA OISST | Temperatura do ar a 2 m: ERA5-Land',

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

      criarLegendaTemperatura2m(),

      criarLegendaCorSST(),

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

  'Anomalias sazonais da TSM na região Niño 3.4',

  tabelaSST

);


// =============================================================================
// 44. VALORES DA TSM
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_TRIMESTRES.forEach(

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

NOMES_TRIMESTRES.forEach(

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
// 46. EXPORTAR 16 ANOMALIAS DE TEMPERATURA DO AR A 2 M
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_TRIMESTRES.forEach(

      function(nomeTrimestre) {


        var nomeAsset =

          'temperature_2m_anomaly_elnino_' +

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

            'anomalia_temperatura_C':
              'mean'

          }

        });

      }

    );

  }

);


// =============================================================================
// 47. EXPORTAR 16 MAPAS DE ANOMALIA DA TSM
// =============================================================================

EVENTOS.forEach(

  function(evento) {


    NOMES_TRIMESTRES.forEach(

      function(nomeTrimestre) {


        var nomeAsset =

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
    'nino34_OISST_intensidade_eventos_elnino',

  fileNamePrefix:
    'nino34_OISST_intensidade_eventos_elnino',

  fileFormat:
    'CSV',

  selectors: [

    'event',
    'event_label',
    'trimester',
    'period_label',
    'year',
    'sst_anomaly_C',
    'intensity'

  ]

});


// =============================================================================
// 49. EXPORTAR MÉDIA DAS ANOMALIAS DE TEMPERATURA DO AR A 2 M
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =

      'temperature_2m_anomaly_mean_4elnino_' +

      nomeTrimestre;


    Export.image.toAsset({

      image:
        resultadosMediaTemperatura[
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

        'media_anomalias_temperatura_C':
          'mean'

      }

    });

  }

);


// =============================================================================
// 50. EXPORTAR DESVIO-PADRÃO ENTRE EVENTOS
// =============================================================================

NOMES_TRIMESTRES.forEach(

  function(nomeTrimestre) {


    var nomeAsset =

      'temperature_2m_anomaly_stddev_4elnino_' +

      nomeTrimestre;


    Export.image.toAsset({

      image:
        resultadosStdDevTemperatura[
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

        'stddev_anomalias_temperatura_C':
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
  'Eventos: 1982/83, 1997/98, 2015/16 e 2023/24.'
);


print(
  'Pacífico: anomalia sazonal da TSM — NOAA OISST.'
);


print(
  'Brasil: anomalia sazonal de temperatura do ar a 2 m — ERA5-Land.'
);


print(
  'As duas variáveis são mostradas no MESMO mapa.'
);


print(
  'Temperatura do ar a 2 m: azul → branco → vermelho.'
);


print(
  'TSM: roxo → branco → laranja.'
);


print(
  'Retângulo preto = região Niño 3.4.'
);


print(
  'Gráfico da TSM: ordem cronológica SON → DJF → MAM → JJA.'
);
