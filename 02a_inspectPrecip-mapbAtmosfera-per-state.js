/*******************************************************************************
 * MAPBIOMAS ATMOSFERA
 * VISUALIZAÇÃO INTEGRADA POR ESTADO
 *
 * CONTEÚDO
 * --------
 * 1. Anomalia média de precipitação por estado
 *    - gráficos de barras
 *    - séries: 1997/98, 2015/16, 2023/24 e média dos 3 eventos
 *    - eixo X: SON | DJF | MAM | JJA
 *
 * 2. Precipitação acumulada trimestral por estado
 *    - gráficos de barras
 *    - séries:
 *        a) média dos 3 eventos de El Niño
 *        b) acumulado do evento 2023/24
 *        c) média de referência 1991–2020 sem os eventos fortes correspondentes
 *    - eixo X: SON | DJF | MAM | JJA
 *
 * LAYOUT
 * ------
 * Estados em ordem alfabética pela sigla, organizados em grade com 4 colunas.
 *
 * EXPORTAÇÕES
 * -----------
 * Este script exporta duas tabelas CSV:
 *   1. anomalia por estado, trimestre e evento
 *   2. acumulado por estado, trimestre e grupo de comparação
 *******************************************************************************/


// =============================================================================
// 1. CONFIGURAÇÃO
// =============================================================================

var CONFIG = {

  assetDir:
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO',

  mapbiomasPrecipAsset:
    'projects/mapbiomas-public/assets/brazil/atmosphere/collection1/' +
    'mapbiomas_brazil_collection1_precipitation_monthly_v2',

  anoInicialReferencia:
    1991,

  anoFinalReferencia:
    2020,

  escalaEstatistica:
    11132,

  colunasGrid:
    4,

  larguraPainelGrafico:
    '320px',

  alturaGraficoAnomalia:
    '190px',

  alturaGraficoAcumulado:
    '205px',

  usarEscalaAnomaliaFixa:
    true,

  yMinAnomalia:
    -350,

  yMaxAnomalia:
    350,

  usarEscalaAcumuladaFixa:
    true,

  yMinAcumulada:
    0,

  yMaxAcumulada:
    1600

};


// =============================================================================
// 2. EVENTOS E TRIMESTRES
// =============================================================================

var EVENTOS = [

  {
    nome: '1997_98',
    label: '1997/98',
    chartSeries: '01_1997_98'
  },

  {
    nome: '2015_16',
    label: '2015/16',
    chartSeries: '02_2015_16'
  },

  {
    nome: '2023_24',
    label: '2023/24',
    chartSeries: '03_2023_24'
  }

];


var TRIMESTRES = [

  {
    nome: 'SON',
    label: 'Set–Out–Nov',
    mesInicial: 9,
    ordem: 1,
    anosEventos: [1997, 2015, 2023],
    anosExcluirReferencia: [1997, 2015]
  },

  {
    nome: 'DJF',
    label: 'Dez–Jan–Fev',
    mesInicial: 12,
    ordem: 2,
    anosEventos: [1997, 2015, 2023],
    anosExcluirReferencia: [1997, 2015]
  },

  {
    nome: 'MAM',
    label: 'Mar–Abr–Mai',
    mesInicial: 3,
    ordem: 3,
    anosEventos: [1998, 2016, 2024],
    anosExcluirReferencia: [1998, 2016]
  },

  {
    nome: 'JJA',
    label: 'Jun–Jul–Ago',
    mesInicial: 6,
    ordem: 4,
    anosEventos: [1998, 2016, 2024],
    anosExcluirReferencia: [1998, 2016]
  }

];


// =============================================================================
// 3. ESTADOS DO BRASIL
// =============================================================================

var ESTADOS_UI = [
  {nome: 'Acre', sigla: 'AC'},
  {nome: 'Alagoas', sigla: 'AL'},
  {nome: 'Amapa', sigla: 'AP'},
  {nome: 'Amazonas', sigla: 'AM'},
  {nome: 'Bahia', sigla: 'BA'},
  {nome: 'Ceara', sigla: 'CE'},
  {nome: 'Distrito Federal', sigla: 'DF'},
  {nome: 'Espirito Santo', sigla: 'ES'},
  {nome: 'Goias', sigla: 'GO'},
  {nome: 'Maranhao', sigla: 'MA'},
  {nome: 'Mato Grosso', sigla: 'MT'},
  {nome: 'Mato Grosso do Sul', sigla: 'MS'},
  {nome: 'Minas Gerais', sigla: 'MG'},
  {nome: 'Para', sigla: 'PA'},
  {nome: 'Paraiba', sigla: 'PB'},
  {nome: 'Parana', sigla: 'PR'},
  {nome: 'Pernambuco', sigla: 'PE'},
  {nome: 'Piaui', sigla: 'PI'},
  {nome: 'Rio de Janeiro', sigla: 'RJ'},
  {nome: 'Rio Grande do Norte', sigla: 'RN'},
  {nome: 'Rio Grande do Sul', sigla: 'RS'},
  {nome: 'Rondonia', sigla: 'RO'},
  {nome: 'Roraima', sigla: 'RR'},
  {nome: 'Santa Catarina', sigla: 'SC'},
  {nome: 'Sao Paulo', sigla: 'SP'},
  {nome: 'Sergipe', sigla: 'SE'},
  {nome: 'Tocantins', sigla: 'TO'}
]

.sort(function(a, b) {
  return a.sigla < b.sigla ? -1 : (a.sigla > b.sigla ? 1 : 0);
});


var SIGLAS_ESTADOS = ee.Dictionary({
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapa': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceara': 'CE',
  'Distrito Federal': 'DF',
  'Espirito Santo': 'ES',
  'Goias': 'GO',
  'Maranhao': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Para': 'PA',
  'Paraiba': 'PB',
  'Parana': 'PR',
  'Pernambuco': 'PE',
  'Piaui': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondonia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'Sao Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO'
});


var estados = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
)

.filter(
  ee.Filter.eq(
    'ADM0_NAME',
    'Brazil'
  )
);


var estadosComSigla = estados.map(function(feature) {

  var nome = ee.String(
    feature.get('ADM1_NAME')
  );

  var sigla = ee.String(
    SIGLAS_ESTADOS.get(
      nome,
      nome
    )
  );

  return feature.set({
    estado_nome: nome,
    estado_sigla: sigla
  });

});


// =============================================================================
// 4. ANOMALIA — CARREGAR ASSETS JÁ EXPORTADOS
// =============================================================================

function carregarImagemAnomaliaEvento(
  nomeEvento,
  nomeTrimestre
) {

  var assetId =
    CONFIG.assetDir +
    '/mapbAtmosfera_precip_anomaly_elnino_' +
    nomeEvento +
    '_' +
    nomeTrimestre;


  return ee.Image(assetId)

    .select('anomalia_mm')

    .rename('valor_mm')

    .toFloat();

}


function reduzirAnomaliaPorEstado(
  imagem,
  propriedadesFixas
) {

  return imagem.reduceRegions({

    collection:
      estadosComSigla,

    reducer:
      ee.Reducer.mean(),

    scale:
      CONFIG.escalaEstatistica,

    crs:
      'EPSG:4326',

    maxPixelsPerRegion:
      1e13

  })

  .map(function(feature) {

    return ee.Feature(null, {

      estado_sigla:
        feature.get('estado_sigla'),

      estado_nome:
        feature.get('estado_nome'),

      valor_mm:
        feature.get('mean'),

      evento:
        propriedadesFixas.evento,

      event_label:
        propriedadesFixas.event_label,

      chart_series:
        propriedadesFixas.chart_series,

      trimestre:
        propriedadesFixas.trimestre,

      trimestre_label:
        propriedadesFixas.trimestre_label,

      chart_order:
        propriedadesFixas.chart_order,

      n_events:
        propriedadesFixas.n_events,

      dataset:
        'anomaly'

    });

  });

}


var colecoesAnomalia = [];


function calcularMediaAnomaliaElNino(
  nomeTrimestre
) {

  var imagens = EVENTOS.map(function(evento) {

    return carregarImagemAnomaliaEvento(
      evento.nome,
      nomeTrimestre
    );

  });


  return ee.ImageCollection.fromImages(
    imagens
  )

  .mean()

  .rename(
    'valor_mm'
  )

  .toFloat()

  .set({
    event: 'elnino_mean',
    event_label: 'Média El Niño — 3 eventos',
    trimester: nomeTrimestre,
    n_events: EVENTOS.length,
    unit: 'mm_per_trimester'
  });

}


TRIMESTRES.forEach(function(trimestre) {

  EVENTOS.forEach(function(evento) {

    var imagem = carregarImagemAnomaliaEvento(
      evento.nome,
      trimestre.nome
    );

    colecoesAnomalia.push(
      reduzirAnomaliaPorEstado(
        imagem,
        {
          evento: evento.nome,
          event_label: evento.label,
          chart_series: evento.chartSeries,
          trimestre: trimestre.nome,
          trimestre_label: trimestre.label,
          chart_order: trimestre.ordem,
          n_events: 1
        }
      )
    );

  });


  var mediaAnomaliaElNino = calcularMediaAnomaliaElNino(
    trimestre.nome
  );


  colecoesAnomalia.push(
    reduzirAnomaliaPorEstado(
      mediaAnomaliaElNino,
      {
        evento: 'elnino_mean',
        event_label: 'Média El Niño — 3 eventos',
        chart_series: '04_elnino_mean',
        trimestre: trimestre.nome,
        trimestre_label: trimestre.label,
        chart_order: trimestre.ordem,
        n_events: EVENTOS.length
      }
    )
  );

});


var tabelaAnomalia = ee.FeatureCollection(
  colecoesAnomalia
).flatten();


// =============================================================================
// 5. ACUMULADO — NORMALIZAR COLEÇÃO MAPBIOMAS
// =============================================================================

var precipitacaoBruta = ee.ImageCollection(
  CONFIG.mapbiomasPrecipAsset
);


var anosDisponiveis = ee.List.sequence(
  1985,
  2024
);


var mesesDisponiveis = ee.List.sequence(
  1,
  12
);


var listaImagensMensais = mesesDisponiveis

  .map(function(mes) {

    mes = ee.Number(mes);

    var imagemMes = ee.Image(
      precipitacaoBruta
        .filter(
          ee.Filter.eq(
            'month',
            mes
          )
        )
        .first()
    );


    return anosDisponiveis.map(function(ano) {

      ano = ee.Number(ano);

      var nomeBanda = ee.String('precipitation_')
        .cat(
          ano.format('%d')
        );

      var data = ee.Date.fromYMD(
        ano,
        mes,
        1
      );


      return imagemMes

        .select(
          ee.List([
            nomeBanda
          ])
        )

        .rename(
          'precipitacao_mm'
        )

        .max(0)

        .toFloat()

        .set({
          year: ano,
          month: mes,
          'system:time_start': data.millis(),
          unit: 'mm',
          source: CONFIG.mapbiomasPrecipAsset
        });

    });

  })

  .flatten();


var precipitacaoMensal = ee.ImageCollection.fromImages(
  listaImagensMensais
)

.sort(
  'system:time_start'
);


function calcularTotalTrimestral(
  anoInicial,
  mesInicial
) {

  anoInicial = ee.Number(anoInicial);

  var inicio = ee.Date.fromYMD(
    anoInicial,
    mesInicial,
    1
  );

  var fim = inicio.advance(
    3,
    'month'
  );


  return precipitacaoMensal

    .filterDate(
      inicio,
      fim
    )

    .sum()

    .rename(
      'precipitacao_acumulada_mm'
    )

    .toFloat()

    .set({
      start_year: anoInicial,
      start_month: mesInicial,
      unit: 'mm_per_trimester'
    });

}


function obterAnosReferencia(
  trimestre
) {

  return ee.List.sequence(
    CONFIG.anoInicialReferencia,
    CONFIG.anoFinalReferencia
  )

  .removeAll(
    ee.List(
      trimestre.anosExcluirReferencia
    )
  );

}


function calcularMediaElNino(
  trimestre
) {

  var imagens = ee.List(
    trimestre.anosEventos
  )

  .map(function(ano) {

    return calcularTotalTrimestral(
      ano,
      trimestre.mesInicial
    );

  });


  return ee.ImageCollection.fromImages(
    imagens
  )

  .mean()

  .rename(
    'precipitacao_media_mm'
  )

  .toFloat()

  .set({
    group: 'elnino_mean',
    group_label: 'El Niño — média 3 eventos',
    trimester: trimestre.nome,
    n_years: trimestre.anosEventos.length,
    years: trimestre.anosEventos.join(','),
    unit: 'mm_per_trimester'
  });

}


function calcularAcumuladoEvento2023_24(
  trimestre
) {

  // O terceiro ano de cada trimestre em anosEventos corresponde ao evento
  // 2023/24: SON e DJF começam em 2023; MAM e JJA começam em 2024.
  var anoInicial = trimestre.anosEventos[2];


  return calcularTotalTrimestral(
    anoInicial,
    trimestre.mesInicial
  )

  .rename(
    'precipitacao_media_mm'
  )

  .toFloat()

  .set({
    group: 'elnino_2023_24',
    group_label: 'El Niño 2023/24',
    trimester: trimestre.nome,
    start_year: anoInicial,
    n_years: 1,
    unit: 'mm_per_trimester'
  });

}


function calcularMediaReferencia(
  trimestre
) {

  var anos = obterAnosReferencia(
    trimestre
  );


  var imagens = anos.map(function(ano) {

    return calcularTotalTrimestral(
      ano,
      trimestre.mesInicial
    );

  });


  return ee.ImageCollection.fromImages(
    imagens
  )

  .mean()

  .rename(
    'precipitacao_media_mm'
  )

  .toFloat()

  .set({
    group: 'reference_mean',
    group_label: 'Sem El Niño forte — 1991–2020',
    trimester: trimestre.nome,
    n_years: anos.size(),
    reference_period: '1991-2020',
    excluded_start_years: trimestre.anosExcluirReferencia.join(','),
    unit: 'mm_per_trimester'
  });

}


function reduzirAcumuladoPorEstado(
  imagem,
  propriedadesFixas
) {

  return imagem.reduceRegions({

    collection:
      estadosComSigla,

    reducer:
      ee.Reducer.mean(),

    scale:
      CONFIG.escalaEstatistica,

    crs:
      'EPSG:4326',

    maxPixelsPerRegion:
      1e13

  })

  .map(function(feature) {

    return ee.Feature(null, {

      estado_sigla:
        feature.get('estado_sigla'),

      estado_nome:
        feature.get('estado_nome'),

      valor_mm:
        feature.get('mean'),

      grupo:
        propriedadesFixas.grupo,

      grupo_label:
        propriedadesFixas.grupo_label,

      chart_series:
        propriedadesFixas.chart_series,

      trimestre:
        propriedadesFixas.trimestre,

      trimestre_label:
        propriedadesFixas.trimestre_label,

      chart_order:
        propriedadesFixas.chart_order,

      n_years:
        propriedadesFixas.n_years,

      dataset:
        'accumulated'

    });

  });

}


var colecoesAcumulado = [];

TRIMESTRES.forEach(function(trimestre) {

  var mediaElNino = calcularMediaElNino(
    trimestre
  );

  var acumulado2023_24 = calcularAcumuladoEvento2023_24(
    trimestre
  );

  var anosReferencia = obterAnosReferencia(
    trimestre
  );

  var mediaReferencia = calcularMediaReferencia(
    trimestre
  );


  colecoesAcumulado.push(
    reduzirAcumuladoPorEstado(
      mediaElNino,
      {
        grupo: 'elnino_mean',
        grupo_label: 'El Niño — média 3 eventos',
        chart_series: '01_elnino_mean',
        trimestre: trimestre.nome,
        trimestre_label: trimestre.label,
        chart_order: trimestre.ordem,
        n_years: trimestre.anosEventos.length
      }
    )
  );


  colecoesAcumulado.push(
    reduzirAcumuladoPorEstado(
      acumulado2023_24,
      {
        grupo: 'elnino_2023_24',
        grupo_label: 'El Niño 2023/24',
        chart_series: '02_elnino_2023_24',
        trimestre: trimestre.nome,
        trimestre_label: trimestre.label,
        chart_order: trimestre.ordem,
        n_years: 1
      }
    )
  );


  colecoesAcumulado.push(
    reduzirAcumuladoPorEstado(
      mediaReferencia,
      {
        grupo: 'reference_mean',
        grupo_label: 'Sem El Niño forte — 1991–2020',
        chart_series: '03_reference_mean',
        trimestre: trimestre.nome,
        trimestre_label: trimestre.label,
        chart_order: trimestre.ordem,
        n_years: anosReferencia.size()
      }
    )
  );

});


var tabelaAcumulada = ee.FeatureCollection(
  colecoesAcumulado
).flatten();


// =============================================================================
// 6. OPÇÕES DOS GRÁFICOS
// =============================================================================

function criarOpcoesGraficoAnomalia(
  sigla,
  nomeCompleto,
  mostrarLegenda
) {

  var opcoes = {

    title:
      sigla + ' — ' + nomeCompleto,

    hAxis: {
      title: '',
      ticks: [
        {v: 1, f: 'SON'},
        {v: 2, f: 'DJF'},
        {v: 3, f: 'MAM'},
        {v: 4, f: 'JJA'}
      ],
      textStyle: {
        fontSize: 9
      }
    },

    vAxis: {
      title: 'mm',
      baseline: 0,
      textStyle: {
        fontSize: 9
      },
      titleTextStyle: {
        fontSize: 10
      }
    },

    bar: {
      groupWidth: '72%'
    },

    legend: {
      position: mostrarLegenda ? 'bottom' : 'none',
      textStyle: {
        fontSize: 9
      }
    },

    chartArea: {
      left: 42,
      top: 22,
      width: '75%',
      height: mostrarLegenda ? '52%' : '64%'
    },

    series: {
      0: {color: '#3366cc'},
      1: {color: '#dc3912'},
      2: {color: '#ff9900'},
      3: {color: '#444444'}
    }

  };


  if (CONFIG.usarEscalaAnomaliaFixa) {

    opcoes.vAxis.viewWindow = {
      min: CONFIG.yMinAnomalia,
      max: CONFIG.yMaxAnomalia
    };

  }


  return opcoes;
}


function criarOpcoesGraficoAcumulado(
  sigla,
  nomeCompleto,
  mostrarLegenda
) {

  var opcoes = {

    title:
      sigla + ' — ' + nomeCompleto,

    hAxis: {
      title: '',
      ticks: [
        {v: 1, f: 'SON'},
        {v: 2, f: 'DJF'},
        {v: 3, f: 'MAM'},
        {v: 4, f: 'JJA'}
      ],
      textStyle: {
        fontSize: 9
      }
    },

    vAxis: {
      title: 'mm',
      baseline: 0,
      textStyle: {
        fontSize: 9
      },
      titleTextStyle: {
        fontSize: 10
      }
    },

    bar: {
      groupWidth: '72%'
    },

    legend: {
      position: mostrarLegenda ? 'bottom' : 'none',
      textStyle: {
        fontSize: 8
      }
    },

    chartArea: {
      left: 45,
      top: 24,
      width: '76%',
      height: mostrarLegenda ? '53%' : '65%'
    },

    series: {
      0: {
        color: '#d95f02'
      },
      1: {
        color: '#377eb8'
      },
      2: {
        color: '#1b9e77'
      }
    }

  };


  if (CONFIG.usarEscalaAcumuladaFixa) {

    opcoes.vAxis.viewWindow = {
      min: CONFIG.yMinAcumulada,
      max: CONFIG.yMaxAcumulada
    };

  }


  return opcoes;
}


// =============================================================================
// 7. CRIAR MINI-GRÁFICOS
// =============================================================================

function criarPainelGraficoAnomalia(
  sigla,
  nomeCompleto,
  mostrarLegenda
) {

  var subset = tabelaAnomalia

    .filter(
      ee.Filter.eq(
        'estado_sigla',
        sigla
      )
    )

    .sort('chart_order');


  var grafico = ui.Chart.feature.groups(

    subset,
    'chart_order',
    'valor_mm',
    'chart_series'

  )

  .setSeriesNames([
    '1997/98',
    '2015/16',
    '2023/24',
    'Média El Niño — 3 eventos'
  ])

  .setChartType(
    'ColumnChart'
  )

  .setOptions(
    criarOpcoesGraficoAnomalia(
      sigla,
      nomeCompleto,
      mostrarLegenda
    )
  );


  grafico.style().set({
    height: CONFIG.alturaGraficoAnomalia,
    stretch: 'horizontal'
  });


  return ui.Panel({

    widgets: [
      grafico
    ],

    style: {
      width: CONFIG.larguraPainelGrafico,
      margin: '4px',
      padding: '4px',
      border: '1px solid #cccccc',
      backgroundColor: 'ffffff'
    }

  });

}


function criarPainelGraficoAcumulado(
  sigla,
  nomeCompleto,
  mostrarLegenda
) {

  var subset = tabelaAcumulada

    .filter(
      ee.Filter.eq(
        'estado_sigla',
        sigla
      )
    )

    .sort('chart_order');


  var grafico = ui.Chart.feature.groups(

    subset,
    'chart_order',
    'valor_mm',
    'chart_series'

  )

  .setSeriesNames([
    'El Niño — média 3 eventos',
    'El Niño 2023/24',
    'Sem El Niño forte — 1991–2020'
  ])

  .setChartType(
    'ColumnChart'
  )

  .setOptions(
    criarOpcoesGraficoAcumulado(
      sigla,
      nomeCompleto,
      mostrarLegenda
    )
  );


  grafico.style().set({
    height: CONFIG.alturaGraficoAcumulado,
    stretch: 'horizontal'
  });


  return ui.Panel({

    widgets: [
      grafico
    ],

    style: {
      width: CONFIG.larguraPainelGrafico,
      margin: '4px',
      padding: '4px',
      border: '1px solid #cccccc',
      backgroundColor: 'ffffff'
    }

  });

}


// =============================================================================
// 8. MONTAR AS GRADES
// =============================================================================

function criarSecaoAnomalia() {

  var painel = ui.Panel({
    layout: ui.Panel.Layout.Flow('vertical'),
    style: {
      stretch: 'horizontal',
      backgroundColor: 'ffffff',
      margin: '0 0 16px 0'
    }
  });


  painel.add(
    ui.Label({
      value: '1. Anomalia média de precipitação por estado',
      style: {
        fontWeight: 'bold',
        fontSize: '18px',
        margin: '0 0 4px 0'
      }
    })
  );


  painel.add(
    ui.Label({
      value:
        'Gráficos de barras com 1997/98, 2015/16, 2023/24 e a média estadual dos 3 eventos de El Niño.',
      style: {
        fontSize: '11px',
        color: '555555',
        margin: '0 0 2px 0'
      }
    })
  );


  painel.add(
    ui.Label({
      value:
        'Eixo X: SON → DJF → MAM → JJA | Eixo Y: mm por trimestre | Estados em ordem alfabética pela sigla.',
      style: {
        fontSize: '10px',
        color: '777777',
        margin: '0 0 10px 0'
      }
    })
  );


  var linhaAtual = null;

  ESTADOS_UI.forEach(function(estado, indice) {

    if (indice % CONFIG.colunasGrid === 0) {
      linhaAtual = ui.Panel({
        layout: ui.Panel.Layout.Flow('horizontal'),
        style: {
          stretch: 'horizontal'
        }
      });

      painel.add(linhaAtual);
    }


    linhaAtual.add(
      criarPainelGraficoAnomalia(
        estado.sigla,
        estado.nome,
        indice === 0
      )
    );

  });


  return painel;
}


function criarSecaoAcumulada() {

  var painel = ui.Panel({
    layout: ui.Panel.Layout.Flow('vertical'),
    style: {
      stretch: 'horizontal',
      backgroundColor: 'ffffff',
      margin: '8px 0 0 0'
    }
  });


  painel.add(
    ui.Label({
      value: '2. Precipitação acumulada trimestral por estado — El Niño × referência',
      style: {
        fontWeight: 'bold',
        fontSize: '18px',
        margin: '0 0 4px 0'
      }
    })
  );


  painel.add(
    ui.Label({
      value:
        'Barras laranja: média dos 3 eventos | Barras azuis: evento 2023/24 | Barras verdes: referência 1991–2020 sem os eventos fortes correspondentes.',
      style: {
        fontSize: '11px',
        color: '555555',
        margin: '0 0 2px 0'
      }
    })
  );


  painel.add(
    ui.Label({
      value:
        'Eixo X: SON → DJF → MAM → JJA | Eixo Y: precipitação acumulada em mm por trimestre | Estados em ordem alfabética pela sigla.',
      style: {
        fontSize: '10px',
        color: '777777',
        margin: '0 0 10px 0'
      }
    })
  );


  var linhaAtual = null;

  ESTADOS_UI.forEach(function(estado, indice) {

    if (indice % CONFIG.colunasGrid === 0) {
      linhaAtual = ui.Panel({
        layout: ui.Panel.Layout.Flow('horizontal'),
        style: {
          stretch: 'horizontal'
        }
      });

      painel.add(linhaAtual);
    }


    linhaAtual.add(
      criarPainelGraficoAcumulado(
        estado.sigla,
        estado.nome,
        indice === 0
      )
    );

  });


  return painel;
}


// =============================================================================
// 9. APLICAÇÃO
// =============================================================================

var painelPrincipal = ui.Panel({

  layout:
    ui.Panel.Layout.Flow('vertical'),

  style: {
    stretch: 'both',
    backgroundColor: 'ffffff',
    padding: '8px'
  }

});


painelPrincipal.add(
  ui.Label({
    value: 'MapBiomas Atmosfera — visualização integrada por estado',
    style: {
      fontWeight: 'bold',
      fontSize: '20px',
      margin: '0 0 4px 0'
    }
  })
);


painelPrincipal.add(
  ui.Label({
    value:
      'O painel reúne anomalia de precipitação e precipitação acumulada trimestral, ambas resumidas por estado.',
    style: {
      fontSize: '11px',
      color: '555555',
      margin: '0 0 12px 0'
    }
  })
);


painelPrincipal.add(
  criarSecaoAnomalia()
);

painelPrincipal.add(
  criarSecaoAcumulada()
);


ui.root.clear();
ui.root.add(painelPrincipal);


// =============================================================================
// 10. VERIFICAÇÕES
// =============================================================================

print(
  'Tabela de anomalia por estado',
  tabelaAnomalia
);

print(
  'Coleção mensal normalizada — esperado: 480 imagens',
  precipitacaoMensal.size()
);

TRIMESTRES.forEach(function(trimestre) {

  print(
    'Anos da referência | ' + trimestre.nome,
    obterAnosReferencia(trimestre)
  );

  print(
    'N da referência | ' + trimestre.nome,
    obterAnosReferencia(trimestre).size()
  );

});

print(
  'Tabela de acumulado por estado',
  tabelaAcumulada
);


// =============================================================================
// 11. EXPORTAÇÕES
// =============================================================================

Export.table.toDrive({

  collection:
    tabelaAnomalia,

  description:
    'mapbAtmosfera_state_anomaly_events_and_mean_barchart_long',

  fileNamePrefix:
    'mapbAtmosfera_state_anomaly_events_and_mean_barchart_long',

  fileFormat:
    'CSV',

  selectors: [
    'estado_sigla',
    'estado_nome',
    'trimestre',
    'trimestre_label',
    'chart_order',
    'evento',
    'event_label',
    'chart_series',
    'n_events',
    'valor_mm',
    'dataset'
  ]

});


Export.table.toDrive({

  collection:
    tabelaAcumulada,

  description:
    'mapbAtmosfera_state_accumulated_precip_mean_2023_24_vs_reference',

  fileNamePrefix:
    'mapbAtmosfera_state_accumulated_precip_mean_2023_24_vs_reference',

  fileFormat:
    'CSV',

  selectors: [
    'estado_sigla',
    'estado_nome',
    'trimestre',
    'trimestre_label',
    'chart_order',
    'grupo',
    'grupo_label',
    'chart_series',
    'n_years',
    'valor_mm',
    'dataset'
  ]

});
