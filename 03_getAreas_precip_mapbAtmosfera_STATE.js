// =============================================================================
// MAPBIOMAS COLLECTION 11
// AREA BY BRAZILIAN STATE, LULC CLASS AND MAPBIOMAS ATMOSPHERE
// PRECIPITATION-ANOMALY PRODUCT
//
// This script reproduces the biome export logic at state level.
// One CSV task is created for every:
//
//   anomaly product × enabled period × state
//
// Default configuration:
//   4 products × 1 period (SON) × 27 states = 108 tasks
//
// If all four periods are enabled:
//   4 products × 4 periods × 27 states = 432 tasks
//
// OUTPUT COLUMNS:
//   classification_year
//   event_year_pair
//   anomaly_product
//   event_label
//   period
//   state_code
//   state_abbrev
//   state_name
//   macroregion
//   class
//   precip_anomaly_mm
//   anomaly_bin_mm
//   area_ha
// =============================================================================


// =============================================================================
// 1. SETTINGS
// =============================================================================

var PERIODS = [
  'SON'
  // 'DJF',
  // 'MAM',
  // 'JJA'
];


/*
 * Optional state subset.
 *
 * Use null to export all 27 states.
 * Examples:
 *   ['35']             -> São Paulo only
 *   ['33', '35']       -> Rio de Janeiro and São Paulo
 *   ['41', '42', '43'] -> Paraná, Santa Catarina and Rio Grande do Sul
 */
var STATE_CODES_TO_EXPORT = null;


/*
 * Precipitation-anomaly grouping interval in millimetres.
 * Set to 1 to preserve integer-millimetre classes.
 */
var ANOMALY_BIN_MM = 10;


/*
 * Increase to 16 if an individual reduction fails because of memory limits.
 */
var TILE_SCALE = 8;


/*
 * Reduction resolution: MapBiomas 30 m grid.
 */
var SCALE = 30;


var DRIVE_FOLDER =
  'Collection11-ElNino-MapbAtmosfera-State';


var OUTPUT_PREFIX =
  'c11-atm-anom-state-class';


// =============================================================================
// 2. ASSETS
// =============================================================================

var MAPBIOMAS_COLLECTION =
  'projects/mapbiomas-brazil/assets/' +
  'LAND-COVER/COLLECTION-11/INTEGRATION/classification-ft';


var MAPBIOMAS_VERSION =
  '0-4-13-w3y-5';


var PRECIP_DIR =
  'projects/mapbiomas-brazil/assets/' +
  'DEGRADATION/COLLECTION-10/ELNINO';


/*
 * Relevant attributes:
 *   CD_GEOCUF — IBGE state code stored as String
 *   NM_ESTADO — state name
 *   NM_REGIAO — Brazilian macroregion
 */
var STATES_ASSET =
  'projects/mapbiomas-workspace/AUXILIAR/estados-2017_old';


// =============================================================================
// 3. STATE CONFIGURATION
// =============================================================================

/*
 * Static names and abbreviations are used in output filenames and columns.
 * State boundaries themselves always come from STATES_ASSET, selected by
 * CD_GEOCUF.
 */
var STATE_REGIONS = [
  {code: '11', abbrev: 'RO', name: 'Rondônia',             macroregion: 'Norte'},
  {code: '12', abbrev: 'AC', name: 'Acre',                 macroregion: 'Norte'},
  {code: '13', abbrev: 'AM', name: 'Amazonas',             macroregion: 'Norte'},
  {code: '14', abbrev: 'RR', name: 'Roraima',              macroregion: 'Norte'},
  {code: '15', abbrev: 'PA', name: 'Pará',                 macroregion: 'Norte'},
  {code: '16', abbrev: 'AP', name: 'Amapá',                macroregion: 'Norte'},
  {code: '17', abbrev: 'TO', name: 'Tocantins',            macroregion: 'Norte'},

  {code: '21', abbrev: 'MA', name: 'Maranhão',             macroregion: 'Nordeste'},
  {code: '22', abbrev: 'PI', name: 'Piauí',                macroregion: 'Nordeste'},
  {code: '23', abbrev: 'CE', name: 'Ceará',                macroregion: 'Nordeste'},
  {code: '24', abbrev: 'RN', name: 'Rio Grande do Norte',  macroregion: 'Nordeste'},
  {code: '25', abbrev: 'PB', name: 'Paraíba',              macroregion: 'Nordeste'},
  {code: '26', abbrev: 'PE', name: 'Pernambuco',           macroregion: 'Nordeste'},
  {code: '27', abbrev: 'AL', name: 'Alagoas',              macroregion: 'Nordeste'},
  {code: '28', abbrev: 'SE', name: 'Sergipe',              macroregion: 'Nordeste'},
  {code: '29', abbrev: 'BA', name: 'Bahia',                macroregion: 'Nordeste'},

  {code: '31', abbrev: 'MG', name: 'Minas Gerais',         macroregion: 'Sudeste'},
  {code: '32', abbrev: 'ES', name: 'Espírito Santo',       macroregion: 'Sudeste'},
  {code: '33', abbrev: 'RJ', name: 'Rio de Janeiro',       macroregion: 'Sudeste'},
  {code: '35', abbrev: 'SP', name: 'São Paulo',            macroregion: 'Sudeste'},

  {code: '41', abbrev: 'PR', name: 'Paraná',               macroregion: 'Sul'},
  {code: '42', abbrev: 'SC', name: 'Santa Catarina',       macroregion: 'Sul'},
  {code: '43', abbrev: 'RS', name: 'Rio Grande do Sul',    macroregion: 'Sul'},

  {code: '50', abbrev: 'MS', name: 'Mato Grosso do Sul',   macroregion: 'Centro-Oeste'},
  {code: '51', abbrev: 'MT', name: 'Mato Grosso',          macroregion: 'Centro-Oeste'},
  {code: '52', abbrev: 'GO', name: 'Goiás',                macroregion: 'Centro-Oeste'},
  {code: '53', abbrev: 'DF', name: 'Distrito Federal',     macroregion: 'Centro-Oeste'}
];


if (STATE_CODES_TO_EXPORT !== null) {
  STATE_REGIONS = STATE_REGIONS.filter(
    function(stateRegion) {
      return STATE_CODES_TO_EXPORT.indexOf(stateRegion.code) >= 0;
    }
  );
}


// =============================================================================
// 4. PRECIPITATION-ANOMALY PRODUCTS
// =============================================================================

var ANOMALY_PRODUCTS = [
  {
    key: 'elnino_1997_98',
    eventYearPair: '1997/98',
    eventLabel: 'El Niño 1997/98',
    classificationYear: 1997,
    assetPrefix: 'mapbAtmosfera_precip_anomaly_elnino_1997_98_'
  },
  {
    key: 'elnino_2015_16',
    eventYearPair: '2015/16',
    eventLabel: 'El Niño 2015/16',
    classificationYear: 2015,
    assetPrefix: 'mapbAtmosfera_precip_anomaly_elnino_2015_16_'
  },
  {
    key: 'elnino_2023_24',
    eventYearPair: '2023/24',
    eventLabel: 'El Niño 2023/24',
    classificationYear: 2023,
    assetPrefix: 'mapbAtmosfera_precip_anomaly_elnino_2023_24_'
  },
  {
    key: 'mean_3_events',
    eventYearPair: '1997/98 + 2015/16 + 2023/24',
    eventLabel: 'Média de 1997/98, 2015/16 e 2023/24',
    classificationYear: 2025,
    assetPrefix: 'mapbAtmosfera_precip_anomaly_mean_3elnino_'
  }
];


// =============================================================================
// 5. DATA SOURCES AND CACHES
// =============================================================================

var brazilStates =
  ee.FeatureCollection(STATES_ASSET);


var CLASSIFICATION_CACHE = {};
var STATE_FEATURE_CACHE = {};
var STATE_MASK_CACHE = {};
var STATE_BOUNDS_CACHE = {};


// =============================================================================
// 6. LOAD MAPBIOMAS CLASSIFICATION
// =============================================================================

function loadClassification(classificationYear) {
  var cacheKey = String(classificationYear);

  if (!CLASSIFICATION_CACHE[cacheKey]) {
    var bandName =
      'classification_' + classificationYear;

    CLASSIFICATION_CACHE[cacheKey] =
      ee.ImageCollection(MAPBIOMAS_COLLECTION)
        .filter(
          ee.Filter.eq(
            'version',
            MAPBIOMAS_VERSION
          )
        )
        .select(bandName)
        .mosaic()
        .rename('class')
        .toInt16()
        .selfMask()
        .set({
          classification_year: classificationYear,
          mapbiomas_version: MAPBIOMAS_VERSION
        });
  }

  return ee.Image(CLASSIFICATION_CACHE[cacheKey]);
}


// =============================================================================
// 7. LOAD PRECIPITATION ANOMALY
// =============================================================================

function loadAnomaly(product, period) {
  var assetId =
    PRECIP_DIR +
    '/' +
    product.assetPrefix +
    period;

  return ee.Image(assetId)
    .select([0])
    .divide(ANOMALY_BIN_MM)
    .round()
    .multiply(ANOMALY_BIN_MM)
    .rename('precip_anomaly_mm')
    .toInt32()
    .set({
      anomaly_product: product.key,
      event_year_pair: product.eventYearPair,
      event_label: product.eventLabel,
      period: period,
      classification_year: product.classificationYear,
      anomaly_asset: assetId,
      anomaly_bin_mm: ANOMALY_BIN_MM
    });
}


// =============================================================================
// 8. STATE FEATURE, MASK AND BOUNDS
// =============================================================================

function getStateFeature(stateRegion) {
  var cacheKey = stateRegion.code;

  if (!STATE_FEATURE_CACHE[cacheKey]) {
    STATE_FEATURE_CACHE[cacheKey] =
      ee.Feature(
        brazilStates
          .filter(
            ee.Filter.eq(
              'CD_GEOCUF',
              stateRegion.code
            )
          )
          .first()
      );
  }

  return ee.Feature(STATE_FEATURE_CACHE[cacheKey]);
}


function getStateMask(stateRegion) {
  var cacheKey = stateRegion.code;

  if (!STATE_MASK_CACHE[cacheKey]) {
    var stateFeature =
      getStateFeature(stateRegion);

    STATE_MASK_CACHE[cacheKey] =
      ee.Image.constant(1)
        .byte()
        .clip(stateFeature.geometry())
        .selfMask()
        .rename('state_mask');
  }

  return ee.Image(STATE_MASK_CACHE[cacheKey]);
}


function getStateBounds(stateRegion) {
  var cacheKey = stateRegion.code;

  if (!STATE_BOUNDS_CACHE[cacheKey]) {
    STATE_BOUNDS_CACHE[cacheKey] =
      getStateFeature(stateRegion)
        .geometry()
        .bounds(1);
  }

  return ee.Geometry(STATE_BOUNDS_CACHE[cacheKey]);
}


// =============================================================================
// 9. PIXEL AREA
// =============================================================================

var pixelAreaHa =
  ee.Image.pixelArea()
    .divide(10000)
    .rename('area_ha');


// =============================================================================
// 10. INTERNAL CLASS + ANOMALY ENCODING
// =============================================================================

/*
 * group_id = class × GROUP_STRIDE + anomaly + ANOMALY_OFFSET
 */
var ANOMALY_OFFSET = 100000;
var GROUP_STRIDE = 200001;


// =============================================================================
// 11. CALCULATE ONE PRODUCT × PERIOD × STATE
// =============================================================================

function calculateProductPeriodState(
  product,
  period,
  stateRegion
) {
  var classification =
    loadClassification(product.classificationYear);

  var anomaly =
    loadAnomaly(product, period);

  var stateMask =
    getStateMask(stateRegion);

  var stateBounds =
    getStateBounds(stateRegion);

  var validMask =
    classification
      .mask()
      .and(anomaly.mask())
      .and(stateMask.unmask(0).eq(1));

  var classImage =
    classification
      .updateMask(validMask)
      .toInt32();

  var anomalyImage =
    anomaly
      .updateMask(validMask)
      .toInt32();

  var groupId =
    classImage
      .multiply(GROUP_STRIDE)
      .add(anomalyImage)
      .add(ANOMALY_OFFSET)
      .rename('group_id')
      .toInt32();

  var reductionImage =
    pixelAreaHa
      .updateMask(validMask)
      .addBands(groupId);

  var result =
    reductionImage.reduceRegion({
      reducer:
        ee.Reducer
          .sum()
          .group({
            groupField: 1,
            groupName: 'group_id'
          }),

      // The raster mask preserves the exact state boundary. The rectangular
      // bounds reduce geometry complexity and usually improve stability.
      geometry: stateBounds,
      scale: SCALE,
      crs: classification.projection(),
      maxPixels: 1e13,
      tileScale: TILE_SCALE
    });

  var groups =
    ee.List(
      ee.Dictionary(result)
        .get(
          'groups',
          ee.List([])
        )
    );

  var rows = groups.map(
    function(groupItem) {
      groupItem =
        ee.Dictionary(groupItem);

      var encoded =
        ee.Number(
          groupItem.get('group_id')
        );

      var classId =
        encoded
          .divide(GROUP_STRIDE)
          .floor();

      var precipAnomaly =
        encoded
          .mod(GROUP_STRIDE)
          .subtract(ANOMALY_OFFSET);

      return ee.Feature(
        null,
        {
          classification_year: product.classificationYear,
          event_year_pair: product.eventYearPair,
          anomaly_product: product.key,
          event_label: product.eventLabel,
          period: period,
          state_code: stateRegion.code,
          state_abbrev: stateRegion.abbrev,
          state_name: stateRegion.name,
          macroregion: stateRegion.macroregion,
          class: classId,
          precip_anomaly_mm: precipAnomaly,
          anomaly_bin_mm: ANOMALY_BIN_MM,
          area_ha: groupItem.get('sum')
        }
      );
    }
  );

  return ee.FeatureCollection(rows);
}


// =============================================================================
// 12. EXPORTS
// =============================================================================

ANOMALY_PRODUCTS.forEach(
  function(product) {
    PERIODS.forEach(
      function(period) {
        STATE_REGIONS.forEach(
          function(stateRegion) {
            var outputName =
              OUTPUT_PREFIX +
              '-' + product.key +
              '-y' + product.classificationYear +
              '-' + period +
              '-s' + stateRegion.code +
              '-' + stateRegion.abbrev;

            var areas =
              calculateProductPeriodState(
                product,
                period,
                stateRegion
              );

            Export.table.toDrive({
              collection: areas,
              description: outputName,
              folder: DRIVE_FOLDER,
              fileNamePrefix: outputName,
              fileFormat: 'CSV',
              selectors: [
                'classification_year',
                'event_year_pair',
                'anomaly_product',
                'event_label',
                'period',
                'state_code',
                'state_abbrev',
                'state_name',
                'macroregion',
                'class',
                'precip_anomaly_mm',
                'anomaly_bin_mm',
                'area_ha'
              ]
            });

            print(
              'Configured:',
              outputName,
              '| event:', product.eventYearPair,
              '| LULC:', product.classificationYear,
              '| period:', period,
              '| state:', stateRegion.abbrev,
              '| state code:', stateRegion.code
            );
          }
        );
      }
    );
  }
);


// =============================================================================
// 13. OPTIONAL SINGLE-TASK TEST
// =============================================================================

/*
 * Recommended workflow:
 *   1. temporarily comment Section 12;
 *   2. enable this test;
 *   3. inspect the result;
 *   4. then restore the full export block.
 */

/*
var testProduct = ANOMALY_PRODUCTS[0];
var testState = STATE_REGIONS.filter(
  function(stateRegion) {
    return stateRegion.code === '35';
  }
)[0];

var test = calculateProductPeriodState(
  testProduct,
  'SON',
  testState
);

print(
  'Test — São Paulo:',
  test.limit(30)
);
*/


// =============================================================================
// 14. VISUAL CHECK
// =============================================================================

var VIS_ANOMALY = {
  min: -500,
  max: 500,
  palette: [
    '67001f',
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
    '053061',
    '02213d'
  ]
};


Map.setCenter(-54, -14, 4);


Map.addLayer(
  loadAnomaly(
    ANOMALY_PRODUCTS[2],
    'SON'
  ),
  VIS_ANOMALY,
  'MapBiomas Atmosfera — El Niño 2023/24 — SON',
  true
);


Map.addLayer(
  brazilStates.style({
    color: '303030',
    fillColor: '00000000',
    width: 1
  }),
  {},
  'Limites estaduais',
  true
);


// =============================================================================
// 15. FINAL CHECKS
// =============================================================================

var selectedStateCodes =
  STATE_REGIONS.map(
    function(stateRegion) {
      return stateRegion.code;
    }
  );


var selectedStatesInAsset =
  brazilStates.filter(
    ee.Filter.inList(
      'CD_GEOCUF',
      selectedStateCodes
    )
  );


print(
  'Selected state codes:',
  selectedStateCodes
);


print(
  'Number of configured states:',
  STATE_REGIONS.length
);


print(
  'Number of selected states found in asset:',
  selectedStatesInAsset.size()
);


print(
  'Names found in state asset:',
  selectedStatesInAsset.aggregate_array('NM_ESTADO')
);


print(
  'Number of anomaly products:',
  ANOMALY_PRODUCTS.length
);


print(
  'Enabled periods:',
  PERIODS
);


print(
  'Number of export tasks:',
  ANOMALY_PRODUCTS.length *
    PERIODS.length *
    STATE_REGIONS.length
);


print(
  'Expected with SON only and all states: 4 × 1 × 27 = 108'
);


print(
  'Expected with four periods and all states: 4 × 4 × 27 = 432'
);


print(
  'Anomaly bin:',
  ANOMALY_BIN_MM,
  'mm'
);


print(
  'Area unit: hectares'
);
