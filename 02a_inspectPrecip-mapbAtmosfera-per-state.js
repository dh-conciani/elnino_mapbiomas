/*******************************************************************************
 * MAPBIOMAS ATMOSFERA
 * VISUALIZAÇÃO INTEGRADA POR ESTADO
 *
 * CONTEÚDO
 * --------
 * 1. Anomalia média de precipitação por estado
 *    - gráficos de barras
 *    - séries: 1997/98, 2015/16, 2023/24 e média dos 3 eventos
 *    - eixo X: SON | DJF | MAM | JJA | Set–Ago
 *
 * 2. Precipitação acumulada por período por estado
 *    - gráficos de barras
 *    - séries:
 *        a) média dos 3 eventos de El Niño
 *        b) acumulado do evento 2023/24
 *        c) média de referência 1991–2020 sem os eventos fortes correspondentes
 *    - eixo X: SON | DJF | MAM | JJA | Set–Ago
 *
 * O período Set–Ago acumula 12 meses, de setembro do ano inicial
 * até agosto do ano seguinte.
 *
 * LAYOUT
 * ------
 * Estados em ordem alfabética pela sigla, organizados em grade com 4 colunas.
 *
 * EXPORTAÇÕES
 * -----------
 * Este script exporta duas tabelas CSV:
 *   1. anomalia por estado, período e evento
 *   2. acumulado por estado, período e grupo de comparação
 *
 * As duas tabelas incluem o período anual Set–Ago e também são exportadas
 * em versões anuais separadas para facilitar análises posteriores.
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
    -1200,

  yMaxAnomalia:
    1200,

  usarEscalaAcumuladaFixa:
    true,

  yMinAcumulada:
    0,

  yMaxAcumulada:
    5000

};


// =============================================================================
// 2. EVENTOS E PERÍODOS
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


/*
 * Para SON, DJF, MAM e JJA, duracaoMeses = 3.
 *
 * Para ANUAL, duracaoMeses = 12 e o período é:
 *   setembro do ano inicial -> agosto do ano seguinte.
 *
 * Os anos em anosEventos são os anos de início de cada período.
 */

var PERIODOS = [

  {
    nome: 'SON',
    label: 'Set–Out–Nov',
    mesInicial: 9,
    duracaoMeses: 3,
    tipoPeriodo: 'trimestral',
    ordem: 1,
    anosEventos: [1997, 2015, 2023],
    anosExcluirReferencia: [1997, 2015]
  },

  {
    nome: 'DJF',
    label: 'Dez–Jan–Fev',
    mesInicial: 12,
    duracaoMeses: 3,
    tipoPeriodo: 'trimestral',
    ordem: 2,
    anosEventos: [1997, 2015, 2023],
    anosExcluirReferencia: [1997, 2015]
  },

  {
    nome: 'MAM',
    label: 'Mar–Abr–Mai',
    mesInicial: 3,
    duracaoMeses: 3,
    tipoPeriodo: 'trimestral',
    ordem: 3,
    anosEventos: [1998, 2016, 2024],
    anosExcluirReferencia: [1998, 2016]
  },

  {
    nome: 'JJA',
    label: 'Jun–Jul–Ago',
    mesInicial: 6,
    duracaoMeses: 3,
    tipoPeriodo: 'trimestral',
    ordem: 4,
    anosEventos: [1998, 2016, 2024],
    anosExcluirReferencia: [1998, 2016]
  },

  {
    nome: 'ANUAL',
    label: 'Set–Ago',
    mesInicial: 9,
    duracaoMeses: 12,
    tipoPeriodo: 'anual_setembro_agosto',
    ordem: 5,
    anosEventos: [1997, 2015, 2023],
    anosExcluirReferencia: [1997, 2015]
  }

];


// =============================================================================
// 3. ESTADOS DO BRASIL — MAPBIOMAS / IBGE 2017
// =============================================================================

/*
 * Fonte dos limites estaduais:
 *
 * projects/mapbiomas-workspace/AUXILIAR/estados-2017_old
 *
 * Campos originais:
 *   CD_GEOCUF
 *   NM_ESTADO
 *   NM_REGIAO
 */

var ESTADOS_UI = [
  {nome: 'ACRE', sigla: 'AC'},
  {nome: 'ALAGOAS', sigla: 'AL'},
  {nome: 'AMAPÁ', sigla: 'AP'},
  {nome: 'AMAZONAS', sigla: 'AM'},
  {nome: 'BAHIA', sigla: 'BA'},
  {nome: 'CEARÁ', sigla: 'CE'},
  {nome: 'DISTRITO FEDERAL', sigla: 'DF'},
  {nome: 'ESPÍRITO SANTO', sigla: 'ES'},
  {nome: 'GOIÁS', sigla: 'GO'},
  {nome: 'MARANHÃO', sigla: 'MA'},
  {nome: 'MATO GROSSO', sigla: 'MT'},
  {nome: 'MATO GROSSO DO SUL', sigla: 'MS'},
  {nome: 'MINAS GERAIS', sigla: 'MG'},
  {nome: 'PARÁ', sigla: 'PA'},
  {nome: 'PARAÍBA', sigla: 'PB'},
  {nome: 'PARANÁ', sigla: 'PR'},
  {nome: 'PERNAMBUCO', sigla: 'PE'},
  {nome: 'PIAUÍ', sigla: 'PI'},
  {nome: 'RIO DE JANEIRO', sigla: 'RJ'},
  {nome: 'RIO GRANDE DO NORTE', sigla: 'RN'},
  {nome: 'RIO GRANDE DO SUL', sigla: 'RS'},
  {nome: 'RONDÔNIA', sigla: 'RO'},
  {nome: 'RORAIMA', sigla: 'RR'},
  {nome: 'SANTA CATARINA', sigla: 'SC'},
  {nome: 'SÃO PAULO', sigla: 'SP'},
  {nome: 'SERGIPE', sigla: 'SE'},
  {nome: 'TOCANTINS', sigla: 'TO'}
]

.sort(function(a, b) {
  return a.sigla < b.sigla ? -1 : (a.sigla > b.sigla ? 1 : 0);
});


/*
 * Código IBGE da unidade da federação -> sigla.
 *
 * Usar o código é mais robusto que usar NM_ESTADO, pois evita diferenças de
 * capitalização, acentos ou grafia.
 */

var SIGLAS_POR_CODIGO = ee.Dictionary({
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF'
});


var estados = ee.FeatureCollection(
  'projects/mapbiomas-workspace/AUXILIAR/estados-2017_old'
);


var estadosComSigla = estados.map(function(feature) {

  var codigo = ee.String(
    feature.get('CD_GEOCUF')
  );

  var nome = ee.String(
    feature.get('NM_ESTADO')
  );

  var regiao = ee.String(
    feature.get('NM_REGIAO')
  );

  var sigla = ee.String(
    SIGLAS_POR_CODIGO.get(
      codigo
    )
  );


  return feature.set({
    estado_codigo: codigo,
    estado_nome: nome,
    estado_regiao: regiao,
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

      estado_codigo:
        feature.get('estado_codigo'),

      estado_regiao:
        feature.get('estado_regiao'),

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

      period_type:
        propriedadesFixas.period_type,

      duration_months:
        propriedadesFixas.duration_months,

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
    unit: 'mm_per_period'
  });

}


PERIODOS.forEach(function(periodo) {

  EVENTOS.forEach(function(evento) {

    var imagem = carregarImagemAnomaliaEvento(
      evento.nome,
      periodo.nome
    );

    colecoesAnomalia.push(
      reduzirAnomaliaPorEstado(
        imagem,
        {
          evento: evento.nome,
          event_label: evento.label,
          chart_series: evento.chartSeries,
          trimestre: periodo.nome,
          trimestre_label: periodo.label,
          period_type: periodo.tipoPeriodo,
          duration_months: periodo.duracaoMeses,
          chart_order: periodo.ordem,
          n_events: 1
        }
      )
    );

  });


  var mediaAnomaliaElNino = calcularMediaAnomaliaElNino(
    periodo.nome
  );


  colecoesAnomalia.push(
    reduzirAnomaliaPorEstado(
      mediaAnomaliaElNino,
      {
        evento: 'elnino_mean',
        event_label: 'Média El Niño — 3 eventos',
        chart_series: '04_elnino_mean',
        trimestre: periodo.nome,
        trimestre_label: periodo.label,
        period_type: periodo.tipoPeriodo,
        duration_months: periodo.duracaoMeses,
        chart_order: periodo.ordem,
        n_events: EVENTOS.length
      }
    )
  );

});


var tabelaAnomalia = ee.FeatureCollection(
  colecoesAnomalia
).flatten();


// Subconjunto anual Set–Ago, útil para exportações e análises específicas.
var tabelaAnomaliaAnual = tabelaAnomalia
  .filter(
    ee.Filter.eq(
      'trimestre',
      'ANUAL'
    )
  );


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


function calcularTotalPeriodo(
  anoInicial,
  mesInicial,
  duracaoMeses
) {

  anoInicial = ee.Number(anoInicial);
  duracaoMeses = ee.Number(duracaoMeses);

  var inicio = ee.Date.fromYMD(
    anoInicial,
    mesInicial,
    1
  );

  var fim = inicio.advance(
    duracaoMeses,
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
      duration_months: duracaoMeses,
      end_exclusive: fim.format('YYYY-MM-dd'),
      unit: 'mm_per_period'
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

    return calcularTotalPeriodo(
      ano,
      trimestre.mesInicial,
      trimestre.duracaoMeses
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
    period_label: trimestre.label,
    period_type: trimestre.tipoPeriodo,
    duration_months: trimestre.duracaoMeses,
    n_years: trimestre.anosEventos.length,
    years: trimestre.anosEventos.join(','),
    unit: 'mm_per_period'
  });

}


function calcularAcumuladoEvento2023_24(
  trimestre
) {

  // O terceiro ano de cada trimestre em anosEventos corresponde ao evento
  // 2023/24: SON e DJF começam em 2023; MAM e JJA começam em 2024.
  var anoInicial = trimestre.anosEventos[2];


  return calcularTotalPeriodo(
    anoInicial,
    trimestre.mesInicial,
    trimestre.duracaoMeses
  )

  .rename(
    'precipitacao_media_mm'
  )

  .toFloat()

  .set({
    group: 'elnino_2023_24',
    group_label: 'El Niño 2023/24',
    trimester: trimestre.nome,
    period_label: trimestre.label,
    period_type: trimestre.tipoPeriodo,
    duration_months: trimestre.duracaoMeses,
    start_year: anoInicial,
    n_years: 1,
    unit: 'mm_per_period'
  });

}


function calcularMediaReferencia(
  trimestre
) {

  var anos = obterAnosReferencia(
    trimestre
  );


  var imagens = anos.map(function(ano) {

    return calcularTotalPeriodo(
      ano,
      trimestre.mesInicial,
      trimestre.duracaoMeses
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
    period_label: trimestre.label,
    period_type: trimestre.tipoPeriodo,
    duration_months: trimestre.duracaoMeses,
    n_years: anos.size(),
    reference_period: '1991-2020',
    excluded_start_years: trimestre.anosExcluirReferencia.join(','),
    unit: 'mm_per_period'
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

      estado_codigo:
        feature.get('estado_codigo'),

      estado_regiao:
        feature.get('estado_regiao'),

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

      period_type:
        propriedadesFixas.period_type,

      duration_months:
        propriedadesFixas.duration_months,

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

PERIODOS.forEach(function(trimestre) {

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
        period_type: trimestre.tipoPeriodo,
        duration_months: trimestre.duracaoMeses,
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
        period_type: trimestre.tipoPeriodo,
        duration_months: trimestre.duracaoMeses,
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
        period_type: trimestre.tipoPeriodo,
        duration_months: trimestre.duracaoMeses,
        chart_order: trimestre.ordem,
        n_years: anosReferencia.size()
      }
    )
  );

});


var tabelaAcumulada = ee.FeatureCollection(
  colecoesAcumulado
).flatten();


// Subconjunto anual Set–Ago, útil para exportações e análises específicas.
var tabelaAcumuladaAnual = tabelaAcumulada
  .filter(
    ee.Filter.eq(
      'trimestre',
      'ANUAL'
    )
  );


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
        {v: 4, f: 'JJA'},
        {v: 5, f: 'Set–Ago'}
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
        {v: 4, f: 'JJA'},
        {v: 5, f: 'Set–Ago'}
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
        'Eixo X: SON → DJF → MAM → JJA → Set–Ago | Eixo Y: anomalia em mm por período | Estados em ordem alfabética pela sigla.',
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
      value: '2. Precipitação acumulada por período por estado — El Niño × referência',
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
        'Eixo X: SON → DJF → MAM → JJA → Set–Ago | Eixo Y: precipitação acumulada em mm por período | Estados em ordem alfabética pela sigla.',
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
      'O painel reúne anomalia de precipitação e precipitação acumulada trimestral e anual Set–Ago, ambas resumidas por estado.',
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
  'Estados MapBiomas/IBGE 2017 — esperado: 27 feições',
  estadosComSigla.size()
);

print(
  'Amostra dos estados com código, sigla, nome e região',
  estadosComSigla.limit(5)
);

print(
  'Tabela de anomalia por estado',
  tabelaAnomalia
);

print(
  'Coleção mensal normalizada — esperado: 480 imagens',
  precipitacaoMensal.size()
);

PERIODOS.forEach(function(trimestre) {

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

print(
  'Tabela anual Set–Ago de anomalia por estado',
  tabelaAnomaliaAnual
);

print(
  'Tabela anual Set–Ago de acumulado por estado',
  tabelaAcumuladaAnual
);

print(
  'N de registros da tabela de anomalia — esperado: 540',
  tabelaAnomalia.size()
);

print(
  'N de registros anuais de anomalia — esperado: 108',
  tabelaAnomaliaAnual.size()
);

print(
  'N de registros da tabela acumulada — esperado: 405',
  tabelaAcumulada.size()
);

print(
  'N de registros anuais acumulados — esperado: 81',
  tabelaAcumuladaAnual.size()
);


// =============================================================================
// 11. EXPORTAÇÕES
// =============================================================================

Export.table.toDrive({

  collection:
    tabelaAnomalia,

  description:
    'mapbAtmosfera_state_anomaly_events_mean_with_annual_long',

  fileNamePrefix:
    'mapbAtmosfera_state_anomaly_events_mean_with_annual_long',

  fileFormat:
    'CSV',

  selectors: [
    'estado_sigla',
    'estado_nome',
    'estado_codigo',
    'estado_regiao',
    'trimestre',
    'trimestre_label',
    'period_type',
    'duration_months',
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
    'mapbAtmosfera_state_accumulated_precip_with_annual_mean_2023_24_vs_reference',

  fileNamePrefix:
    'mapbAtmosfera_state_accumulated_precip_with_annual_mean_2023_24_vs_reference',

  fileFormat:
    'CSV',

  selectors: [
    'estado_sigla',
    'estado_nome',
    'estado_codigo',
    'estado_regiao',
    'trimestre',
    'trimestre_label',
    'period_type',
    'duration_months',
    'chart_order',
    'grupo',
    'grupo_label',
    'chart_series',
    'n_years',
    'valor_mm',
    'dataset'
  ]

});


// =============================================================================
// 12. EXPORTAÇÕES ANUAIS SET–AGO SEPARADAS
// =============================================================================

Export.table.toDrive({

  collection:
    tabelaAnomaliaAnual,

  description:
    'mapbAtmosfera_state_anomaly_ANUAL_SetAgo_events_and_mean',

  fileNamePrefix:
    'mapbAtmosfera_state_anomaly_ANUAL_SetAgo_events_and_mean',

  fileFormat:
    'CSV',

  selectors: [
    'estado_sigla',
    'estado_nome',
    'estado_codigo',
    'estado_regiao',
    'trimestre',
    'trimestre_label',
    'period_type',
    'duration_months',
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
    tabelaAcumuladaAnual,

  description:
    'mapbAtmosfera_state_accumulated_ANUAL_SetAgo_mean_2023_24_vs_reference',

  fileNamePrefix:
    'mapbAtmosfera_state_accumulated_ANUAL_SetAgo_mean_2023_24_vs_reference',

  fileFormat:
    'CSV',

  selectors: [
    'estado_sigla',
    'estado_nome',
    'estado_codigo',
    'estado_regiao',
    'trimestre',
    'trimestre_label',
    'period_type',
    'duration_months',
    'chart_order',
    'grupo',
    'grupo_label',
    'chart_series',
    'n_years',
    'valor_mm',
    'dataset'
  ]

});


print(
  'Período anual incluído: Set–Ago (12 meses, setembro do ano inicial até agosto do ano seguinte).'
);

print(
  'Referência anual: períodos iniciados entre 1991 e 2020, excluindo 1997 e 2015.'
);
