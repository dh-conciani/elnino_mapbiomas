/********************************************************************************
 * MAPBIOMAS COLLECTION 11
 * AREA BY BIOME, LULC CLASS AND 2 M AIR-TEMPERATURE ANOMALY
 *
 * TEMPERATURE-ANOMALY PRODUCTS
 * ----------------------------
 * 1. El Niño 1982/83  -> LULC 1985
 * 2. El Niño 1997/98  -> LULC 1997
 * 3. El Niño 2015/16  -> LULC 2015
 * 4. El Niño 2023/24  -> LULC 2023
 * 5. Mean anomaly of the four events -> LULC 2025
 *
 * PERIODS
 * -------
 * DJF | MAM | JJA | SON
 *
 * TEMPERATURE BINNING
 * -------------------
 * Bin width: 0.1 °C
 *
 * Examples:
 *   -1.26 °C -> -1.3 °C
 *   -1.24 °C -> -1.2 °C
 *   +0.46 °C -> +0.5 °C
 *
 * Internally, temperature bins are represented as integer tenths of a degree.
 * This avoids grouping directly on floating-point values.
 *
 * OUTPUT COLUMNS
 * --------------
 * classification_year
 * event_year_pair
 * anomaly_product
 * event_label
 * period
 * biome
 * class
 * temperature_anomaly_C
 * temperature_anomaly_C_1dp
 * anomaly_bin_C
 * area_ha
 *
 * NUMBER OF EXPORT TASKS
 * ----------------------
 * 5 products x 4 periods x 6 biomes = 120 CSV tasks
 *
 * EXPECTED TEMPERATURE ASSETS
 * ---------------------------
 * temperature_2m_anomaly_elnino_1982_83_DJF
 * temperature_2m_anomaly_elnino_1982_83_MAM
 * temperature_2m_anomaly_elnino_1982_83_JJA
 * temperature_2m_anomaly_elnino_1982_83_SON
 *
 * temperature_2m_anomaly_elnino_1997_98_DJF
 * ...
 *
 * temperature_2m_anomaly_mean_4elnino_DJF
 * temperature_2m_anomaly_mean_4elnino_MAM
 * temperature_2m_anomaly_mean_4elnino_JJA
 * temperature_2m_anomaly_mean_4elnino_SON
 ********************************************************************************/


// =============================================================================
// 1. SETTINGS
// =============================================================================

var PERIODS = [
  'DJF',
  'MAM',
  'JJA',
  'SON'
];

var BIOME_IDS = [
  1,
  2,
  3,
  4,
  5,
  6
];

/*
 * Required bin width: 0.1 °C.
 * Keep this value at 0.1 unless the integer encoding below is also changed.
 */
var ANOMALY_BIN_C = 0.1;

/*
 * 0.1 °C bins are stored internally as integer tenths:
 *
 *   -1.3 °C -> -13
 *   +0.5 °C ->  +5
 */
var ANOMALY_SCALE_FACTOR = 10;

/*
 * Increase to 16 if a particular export reaches a memory limit.
 */
var TILE_SCALE = 8;

var SCALE = 30;

var DRIVE_FOLDER =
  'Collection11-ElNino-Temperature2m';

var OUTPUT_PREFIX =
  'collection11-temperature-2m-anomaly-biome-class';

/*
 * true  = create all 120 Drive tasks
 * false = configure only the optional test/visual checks
 */
var CREATE_ALL_EXPORT_TASKS = true;


// =============================================================================
// 2. ASSETS
// =============================================================================

var MAPBIOMAS_COLLECTION =
  'projects/mapbiomas-brazil/assets/' +
  'LAND-COVER/COLLECTION-11/INTEGRATION/classification-ft';

var MAPBIOMAS_VERSION =
  '0-4-13-w3y-5';

var TEMPERATURE_DIR =
  'projects/mapbiomas-brazil/assets/' +
  'DEGRADATION/COLLECTION-10/ELNINO';

var BIOMES_ASSET =
  'projects/mapbiomas-workspace/' +
  'AUXILIAR/biome_2025_buf5k_30m';


// =============================================================================
// 3. TEMPERATURE-ANOMALY PRODUCTS
// =============================================================================

var ANOMALY_PRODUCTS = [
  {
    key: 'elnino_1982_83',
    eventYearPair: '1982/83',
    eventLabel: 'El Niño 1982/83',
    classificationYear: 1985,
    assetPrefix: 'temperature_2m_anomaly_elnino_1982_83_'
  },
  {
    key: 'elnino_1997_98',
    eventYearPair: '1997/98',
    eventLabel: 'El Niño 1997/98',
    classificationYear: 1997,
    assetPrefix: 'temperature_2m_anomaly_elnino_1997_98_'
  },
  {
    key: 'elnino_2015_16',
    eventYearPair: '2015/16',
    eventLabel: 'El Niño 2015/16',
    classificationYear: 2015,
    assetPrefix: 'temperature_2m_anomaly_elnino_2015_16_'
  },
  {
    key: 'elnino_2023_24',
    eventYearPair: '2023/24',
    eventLabel: 'El Niño 2023/24',
    classificationYear: 2023,
    assetPrefix: 'temperature_2m_anomaly_elnino_2023_24_'
  },
  {
    key: 'mean_4_events',
    eventYearPair: '1982/83 + 1997/98 + 2015/16 + 2023/24',
    eventLabel: 'Média de 1982/83, 1997/98, 2015/16 e 2023/24',
    classificationYear: 2025,
    assetPrefix: 'temperature_2m_anomaly_mean_4elnino_'
  }
];


// =============================================================================
// 4. PROCESSING REGION
// =============================================================================

/*
 * A rectangular processing region is lighter than a complex national polygon.
 * Final pixels are still restricted by the intersection of:
 *
 *   MapBiomas classification mask
 *   temperature-anomaly mask
 *   selected biome mask
 */
var BRAZIL_BBOX = ee.Geometry.Rectangle(
  [-74.5, -34.5, -33.5, 6.0],
  null,
  false
);


// =============================================================================
// 5. MAPBIOMAS CLASSIFICATION CACHE
// =============================================================================

var CLASSIFICATION_CACHE = {};

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

  return ee.Image(
    CLASSIFICATION_CACHE[cacheKey]
  );
}


// =============================================================================
// 6. PRELOAD CLASSIFICATIONS
// =============================================================================

var CLASSIFICATION_YEARS = [
  1985,
  1997,
  2015,
  2023,
  2025
];

CLASSIFICATION_YEARS.forEach(function(year) {
  var classification =
    loadClassification(year);

  print(
    'MapBiomas classification ' + year + ':',
    classification
  );

  print(
    'Projection — classification ' + year + ':',
    classification.projection()
  );
});


// =============================================================================
// 7. BIOMES
// =============================================================================

var biomes =
  ee.Image(BIOMES_ASSET)
    .rename('biome')
    .toInt16()
    .selfMask();

print('Biomes:', biomes);


// =============================================================================
// 8. TEMPERATURE-ANOMALY CACHE
// =============================================================================

var ANOMALY_CACHE = {};


// =============================================================================
// 9. LOAD AND BIN TEMPERATURE ANOMALY
// =============================================================================

/*
 * The source assets contain temperature anomaly in degrees Celsius.
 *
 * Binning procedure:
 *
 *   source anomaly / 0.1
 *   round to nearest integer
 *
 * The returned image therefore contains integer tenths of a degree:
 *
 *   -13 means -1.3 °C
 *    +5 means +0.5 °C
 *
 * This integer representation is used for robust grouped reductions.
 */
function loadAnomaly(product, period) {
  var cacheKey =
    product.key + '_' + period;

  if (!ANOMALY_CACHE[cacheKey]) {
    var assetId =
      TEMPERATURE_DIR +
      '/' +
      product.assetPrefix +
      period;

    var source =
      ee.Image(assetId)
        .select([0])
        .rename('temperature_anomaly_source_C')
        .toFloat();

    var anomalyTenths =
      source
        .divide(ANOMALY_BIN_C)
        .round()
        .rename('temperature_anomaly_tenths')
        .toInt32()
        .set({
          anomaly_product: product.key,
          event_year_pair: product.eventYearPair,
          event_label: product.eventLabel,
          period: period,
          classification_year: product.classificationYear,
          anomaly_asset: assetId,
          anomaly_bin_C: ANOMALY_BIN_C,
          anomaly_scale_factor: ANOMALY_SCALE_FACTOR
        });

    ANOMALY_CACHE[cacheKey] =
      anomalyTenths;
  }

  return ee.Image(
    ANOMALY_CACHE[cacheKey]
  );
}


// =============================================================================
// 10. DISPLAY VERSION IN DEGREES CELSIUS
// =============================================================================

function anomalyForDisplay(product, period) {
  return loadAnomaly(product, period)
    .divide(ANOMALY_SCALE_FACTOR)
    .rename('temperature_anomaly_C')
    .toFloat();
}


// =============================================================================
// 11. PIXEL AREA
// =============================================================================

var pixelAreaHa =
  ee.Image.pixelArea()
    .divide(10000)
    .rename('area_ha');


// =============================================================================
// 12. INTERNAL CLASS + TEMPERATURE-BIN ENCODING
// =============================================================================

/*
 * Each export processes only one biome, so biome does not need to be encoded.
 *
 * The anomaly is encoded as integer tenths of a degree:
 *
 *   group_id =
 *       class * GROUP_STRIDE
 *       + anomaly_tenths
 *       + ANOMALY_OFFSET
 *
 * ANOMALY_OFFSET = 1000 and GROUP_STRIDE = 2001 support bins from
 * -100.0 °C through +100.0 °C, far beyond the expected data range.
 */
var ANOMALY_OFFSET = 1000;
var GROUP_STRIDE = 2001;


// =============================================================================
// 13. CALCULATE ONE PRODUCT x PERIOD x BIOME
// =============================================================================

function calculateProductPeriodBiome(
  product,
  period,
  biomeIdValue
) {
  var biomeId =
    ee.Number(biomeIdValue);

  var classification =
    loadClassification(
      product.classificationYear
    );

  /*
   * Integer tenths of a degree.
   */
  var anomalyTenths =
    loadAnomaly(
      product,
      period
    );

  var biomeMask =
    biomes.eq(biomeId);

  var validMask =
    classification
      .mask()
      .and(anomalyTenths.mask())
      .and(biomeMask);

  var classImage =
    classification
      .updateMask(validMask)
      .toInt32();

  var anomalyTenthsImage =
    anomalyTenths
      .updateMask(validMask)
      .toInt32();

  var groupId =
    classImage
      .multiply(GROUP_STRIDE)
      .add(anomalyTenthsImage)
      .add(ANOMALY_OFFSET)
      .rename('group_id')
      .toInt32();

  /*
   * Band 0 = area_ha
   * Band 1 = group_id
   */
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
      geometry: BRAZIL_BBOX,
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

  var rows = groups.map(function(groupItem) {
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

    var anomalyTenthsValue =
      encoded
        .mod(GROUP_STRIDE)
        .subtract(ANOMALY_OFFSET);

    /*
     * Exact one-decimal numeric value because it is reconstructed from an
     * integer number of tenths.
     */
    var temperatureAnomalyC =
      anomalyTenthsValue
        .divide(ANOMALY_SCALE_FACTOR);

    return ee.Feature(
      null,
      {
        classification_year:
          product.classificationYear,

        event_year_pair:
          product.eventYearPair,

        anomaly_product:
          product.key,

        event_label:
          product.eventLabel,

        period:
          period,

        biome:
          biomeId,

        class:
          classId,

        /* Numeric field for analysis. */
        temperature_anomaly_C:
          temperatureAnomalyC,

        /* Text field that always preserves exactly one displayed decimal. */
        temperature_anomaly_C_1dp:
          temperatureAnomalyC.format('%.1f'),

        anomaly_bin_C:
          ANOMALY_BIN_C,

        area_ha:
          groupItem.get('sum')
      }
    );
  });

  return ee.FeatureCollection(rows)
    .sort('class')
    .set({
      anomaly_product: product.key,
      event_year_pair: product.eventYearPair,
      event_label: product.eventLabel,
      classification_year: product.classificationYear,
      period: period,
      biome: biomeIdValue,
      anomaly_bin_C: ANOMALY_BIN_C
    });
}


// =============================================================================
// 14. EXPORTS
// =============================================================================

if (CREATE_ALL_EXPORT_TASKS) {
  ANOMALY_PRODUCTS.forEach(function(product) {
    PERIODS.forEach(function(period) {
      BIOME_IDS.forEach(function(biomeId) {
        var outputName =
          OUTPUT_PREFIX +
          '-' +
          product.key +
          '-lulc-' +
          product.classificationYear +
          '-' +
          period +
          '-biome-' +
          biomeId;

        var areas =
          calculateProductPeriodBiome(
            product,
            period,
            biomeId
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
            'biome',
            'class',
            'temperature_anomaly_C',
            'temperature_anomaly_C_1dp',
            'anomaly_bin_C',
            'area_ha'
          ]
        });

        print(
          'Configured:',
          outputName,
          '| event:',
          product.eventYearPair,
          '| LULC:',
          product.classificationYear,
          '| period:',
          period,
          '| biome:',
          biomeId
        );
      });
    });
  });
}


// =============================================================================
// 15. OPTIONAL SINGLE-TASK TEST
// =============================================================================

/*
 * Recommended first test:
 *
 *   product index 0 = El Niño 1982/83
 *   period SON
 *   biome 1
 */

var TEST_PRODUCT_INDEX = 0;
var TEST_PERIOD = 'SON';
var TEST_BIOME = 1;

var testProduct =
  ANOMALY_PRODUCTS[TEST_PRODUCT_INDEX];

var test =
  calculateProductPeriodBiome(
    testProduct,
    TEST_PERIOD,
    TEST_BIOME
  );

print(
  'Single-task test:',
  testProduct.eventLabel,
  '| event pair:',
  testProduct.eventYearPair,
  '| LULC:',
  testProduct.classificationYear,
  '| period:',
  TEST_PERIOD,
  '| biome:',
  TEST_BIOME,
  test.limit(20)
);


// =============================================================================
// 16. VISUALIZATION PARAMETERS
// =============================================================================

/*
 * Negative anomaly = colder = blue
 * Zero = white
 * Positive anomaly = warmer = red
 */
var VIS_ANOMALY = {
  min: -3,
  max: 3,
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
// 17. VISUAL CHECK
// =============================================================================

Map.setCenter(-54, -14, 4);

ANOMALY_PRODUCTS.forEach(function(product, index) {
  Map.addLayer(
    anomalyForDisplay(
      product,
      'SON'
    ),
    VIS_ANOMALY,
    product.eventLabel + ' — SON',
    index === 3
  );
});


// =============================================================================
// 18. MAPBIOMAS CLASSIFICATION LAYERS
// =============================================================================

CLASSIFICATION_YEARS.forEach(function(year) {
  Map.addLayer(
    loadClassification(year),
    {},
    'MapBiomas Collection 11 — ' + year,
    false
  );
});


// =============================================================================
// 19. BIOMES
// =============================================================================

Map.addLayer(
  biomes.randomVisualizer(),
  {},
  'Biomas',
  false
);


// =============================================================================
// 20. PRODUCT CONFIGURATION TABLE
// =============================================================================

var productConfiguration =
  ee.FeatureCollection(
    ANOMALY_PRODUCTS.map(function(product) {
      return ee.Feature(
        null,
        {
          anomaly_product:
            product.key,

          event_year_pair:
            product.eventYearPair,

          event_label:
            product.eventLabel,

          classification_year:
            product.classificationYear,

          asset_prefix:
            product.assetPrefix,

          anomaly_bin_C:
            ANOMALY_BIN_C
        }
      );
    })
  );

print(
  'Product x event x LULC configuration:',
  productConfiguration
);


// =============================================================================
// 21. ASSET CHECK TABLE
// =============================================================================

var expectedAssets = [];

ANOMALY_PRODUCTS.forEach(function(product) {
  PERIODS.forEach(function(period) {
    expectedAssets.push(
      ee.Feature(
        null,
        {
          anomaly_product:
            product.key,

          period:
            period,

          classification_year:
            product.classificationYear,

          asset_id:
            TEMPERATURE_DIR +
            '/' +
            product.assetPrefix +
            period
        }
      )
    );
  });
});

print(
  'Expected temperature-anomaly assets:',
  ee.FeatureCollection(expectedAssets)
);


// =============================================================================
// 22. FINAL CHECKS
// =============================================================================

print(
  'Number of anomaly products:',
  ANOMALY_PRODUCTS.length
);

print(
  'Number of periods:',
  PERIODS.length
);

print(
  'Number of biomes:',
  BIOME_IDS.length
);

print(
  'Number of export tasks:',
  ANOMALY_PRODUCTS.length *
  PERIODS.length *
  BIOME_IDS.length
);

print(
  'Expected tasks: 5 x 4 x 6 = 120'
);

print(
  'Temperature-anomaly bin:',
  ANOMALY_BIN_C,
  '°C'
);

print(
  'Internal grouping unit: integer tenths of a degree'
);

print(
  'Numeric anomaly output: temperature_anomaly_C'
);

print(
  'Exactly one-decimal text output: temperature_anomaly_C_1dp'
);

print(
  'tileScale:',
  TILE_SCALE
);

print(
  'Area unit: hectares'
);

print(
  '1982/83 temperature anomaly -> MapBiomas 1985'
);

print(
  '1997/98 temperature anomaly -> MapBiomas 1997'
);

print(
  '2015/16 temperature anomaly -> MapBiomas 2015'
);

print(
  '2023/24 temperature anomaly -> MapBiomas 2023'
);

print(
  'Mean of four events -> MapBiomas 2025'
);
