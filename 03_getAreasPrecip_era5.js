// =============================================================================
// MAPBIOMAS COLLECTION 11
// AREA BY BIOME, LULC CLASS AND PRECIPITATION-ANOMALY PRODUCT
//
// ANOMALY PRODUCTS:
//
//   1. El Niño 1982/83
//      LULC = 1985
//
//   2. El Niño 1997/98
//      LULC = 1997
//
//   3. El Niño 2015/16
//      LULC = 2015
//
//   4. El Niño 2023/24
//      LULC = 2023
//
//   5. Mean anomaly of the four El Niño events
//      LULC = 2025
//
//
// OUTPUT COLUMNS:
//
//   classification_year
//   event_year_pair
//   anomaly_product
//   event_label
//   period
//   biome
//   class
//   precip_anomaly_mm
//   anomaly_bin_mm
//   area_ha
//
//
// NUMBER OF TASKS:
//
//   5 products
//   × 4 periods
//   × 6 biomes
//   = 120 export tasks
//
// =============================================================================


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
 * Precipitation-anomaly grouping interval.
 *
 * ANOMALY_BIN_MM = 10:
 *
 *   -137 mm becomes -140 mm
 *   -133 mm becomes -130 mm
 *    +46 mm becomes  +50 mm
 *
 * Set to 1 to retain integer-millimetre classes.
 */

var ANOMALY_BIN_MM =
  10;


/*
 * Increase to 16 if an individual task still fails
 * because of an out-of-memory error.
 */

var TILE_SCALE =
  8;


var SCALE =
  30;


var DRIVE_FOLDER =
  'Collection11-ElNino';


var OUTPUT_PREFIX =
  'collection11-precip-anomaly-biome-class';


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


var BIOMES_ASSET =

  'projects/mapbiomas-workspace/' +
  'AUXILIAR/biome_2025_buf5k_30m';


// =============================================================================
// 3. PRECIPITATION-ANOMALY PRODUCTS
// =============================================================================

/*
 * Expected anomaly assets:
 *
 * El Niño 1982/83:
 *
 *   precip_anomaly_elnino_1982_83_DJF
 *   precip_anomaly_elnino_1982_83_MAM
 *   precip_anomaly_elnino_1982_83_JJA
 *   precip_anomaly_elnino_1982_83_SON
 *
 *
 * El Niño 1997/98:
 *
 *   precip_anomaly_elnino_1997_98_DJF
 *   precip_anomaly_elnino_1997_98_MAM
 *   precip_anomaly_elnino_1997_98_JJA
 *   precip_anomaly_elnino_1997_98_SON
 *
 *
 * El Niño 2015/16:
 *
 *   precip_anomaly_elnino_2015_16_DJF
 *   precip_anomaly_elnino_2015_16_MAM
 *   precip_anomaly_elnino_2015_16_JJA
 *   precip_anomaly_elnino_2015_16_SON
 *
 *
 * El Niño 2023/24:
 *
 *   precip_anomaly_elnino_2023_24_DJF
 *   precip_anomaly_elnino_2023_24_MAM
 *   precip_anomaly_elnino_2023_24_JJA
 *   precip_anomaly_elnino_2023_24_SON
 *
 *
 * Mean of four events:
 *
 *   precip_anomaly_mean_4elnino_DJF
 *   precip_anomaly_mean_4elnino_MAM
 *   precip_anomaly_mean_4elnino_JJA
 *   precip_anomaly_mean_4elnino_SON
 */


var ANOMALY_PRODUCTS = [

  // ---------------------------------------------------------------------------
  // El Niño 1982/83
  // ---------------------------------------------------------------------------

  {

    key:
      'elnino_1982_83',

    eventYearPair:
      '1982/83',

    eventLabel:
      'El Niño 1982/83',

    classificationYear:
      1985,

    assetPrefix:
      'precip_anomaly_elnino_1982_83_'

  },


  // ---------------------------------------------------------------------------
  // El Niño 1997/98
  // ---------------------------------------------------------------------------

  {

    key:
      'elnino_1997_98',

    eventYearPair:
      '1997/98',

    eventLabel:
      'El Niño 1997/98',

    classificationYear:
      1997,

    assetPrefix:
      'precip_anomaly_elnino_1997_98_'

  },


  // ---------------------------------------------------------------------------
  // El Niño 2015/16
  // ---------------------------------------------------------------------------

  {

    key:
      'elnino_2015_16',

    eventYearPair:
      '2015/16',

    eventLabel:
      'El Niño 2015/16',

    classificationYear:
      2015,

    assetPrefix:
      'precip_anomaly_elnino_2015_16_'

  },


  // ---------------------------------------------------------------------------
  // El Niño 2023/24
  // ---------------------------------------------------------------------------

  {

    key:
      'elnino_2023_24',

    eventYearPair:
      '2023/24',

    eventLabel:
      'El Niño 2023/24',

    classificationYear:
      2023,

    assetPrefix:
      'precip_anomaly_elnino_2023_24_'

  },


  // ---------------------------------------------------------------------------
  // Mean of the four events
  // ---------------------------------------------------------------------------

  {

    key:
      'mean_4_events',

    eventYearPair:
      '1982/83 + 1997/98 + 2015/16 + 2023/24',

    eventLabel:
      'Média de 1982/83, 1997/98, 2015/16 e 2023/24',

    classificationYear:
      2025,

    assetPrefix:
      'precip_anomaly_mean_4elnino_'

  }

];


// =============================================================================
// 4. PROCESSING REGION
// =============================================================================

/*
 * A rectangular region avoids reducing over a complex national geometry.
 *
 * The final included pixels are determined by the intersection of:
 *
 *   1. MapBiomas classification mask;
 *   2. precipitation-anomaly mask;
 *   3. biome mask.
 */

var BRAZIL_BBOX = ee.Geometry.Rectangle(

  [
    -74.5,
    -34.5,
    -33.5,
    6.0
  ],

  null,

  false

);


// =============================================================================
// 5. MAPBIOMAS CLASSIFICATION CACHE
// =============================================================================

/*
 * Each anomaly product uses a different LULC year.
 *
 * The classifications are cached so the same annual image does not need
 * to be rebuilt for every biome and period.
 */

var CLASSIFICATION_CACHE = {};


// =============================================================================
// 6. LOAD MAPBIOMAS CLASSIFICATION
// =============================================================================

function loadClassification(
  classificationYear
) {


  var cacheKey =
    String(
      classificationYear
    );


  if (
    !CLASSIFICATION_CACHE[cacheKey]
  ) {


    var bandName =

      'classification_' +
      classificationYear;


    CLASSIFICATION_CACHE[cacheKey] =

      ee.ImageCollection(
        MAPBIOMAS_COLLECTION
      )

      .filter(

        ee.Filter.eq(

          'version',

          MAPBIOMAS_VERSION

        )

      )

      // Select the annual band before mosaic().
      .select(
        bandName
      )

      .mosaic()

      .rename(
        'class'
      )

      .toInt16()

      .selfMask()

      .set({

        classification_year:
          classificationYear,

        mapbiomas_version:
          MAPBIOMAS_VERSION

      });

  }


  return ee.Image(

    CLASSIFICATION_CACHE[
      cacheKey
    ]

  );

}


// =============================================================================
// 7. PRELOAD AND CHECK CLASSIFICATIONS
// =============================================================================

var CLASSIFICATION_YEARS = [

  1985,
  1997,
  2015,
  2023,
  2025

];


CLASSIFICATION_YEARS.forEach(

  function(year) {


    var classification =
      loadClassification(
        year
      );


    print(

      'MapBiomas classification ' +
      year +
      ':',

      classification

    );


    print(

      'Projection — classification ' +
      year +
      ':',

      classification.projection()

    );

  }

);


// =============================================================================
// 8. BIOMES
// =============================================================================

var biomes = ee.Image(
  BIOMES_ASSET
)

.rename(
  'biome'
)

.toInt16()

.selfMask();


print(
  'Biomes:',
  biomes
);


// =============================================================================
// 9. LOAD PRECIPITATION ANOMALY
// =============================================================================

function loadAnomaly(
  product,
  period
) {


  var assetId =

    PRECIP_DIR +
    '/' +
    product.assetPrefix +
    period;


  return ee.Image(
    assetId
  )

  // The anomaly asset contains one relevant band.
  .select(
    [0]
  )

  // Create anomaly classes.
  .divide(
    ANOMALY_BIN_MM
  )

  .round()

  .multiply(
    ANOMALY_BIN_MM
  )

  .rename(
    'precip_anomaly_mm'
  )

  .toInt32()

  .set({

    anomaly_product:
      product.key,

    event_year_pair:
      product.eventYearPair,

    event_label:
      product.eventLabel,

    period:
      period,

    classification_year:
      product.classificationYear,

    anomaly_asset:
      assetId

  });

}


// =============================================================================
// 10. PIXEL AREA
// =============================================================================

/*
 * Area in hectares.
 */

var pixelAreaHa = ee.Image

  .pixelArea()

  .divide(
    10000
  )

  .rename(
    'area_ha'
  );


// =============================================================================
// 11. INTERNAL CLASS + ANOMALY ENCODING
// =============================================================================

/*
 * Biome is not encoded because every export task processes only one biome.
 *
 * Class and anomaly are temporarily encoded as:
 *
 *   group_id =
 *       class × GROUP_STRIDE
 *       + anomaly
 *       + ANOMALY_OFFSET
 *
 *
 * Example:
 *
 *   class = 15
 *   anomaly = -130 mm
 *
 *   group_id =
 *       15 × 200001
 *       - 130
 *       + 100000
 *
 *
 * The values are decoded before CSV export.
 *
 * This creates one grouping level instead of nested groups:
 *
 *   class
 *     └── anomaly
 *           └── area
 */

var ANOMALY_OFFSET =
  100000;


var GROUP_STRIDE =
  200001;


// =============================================================================
// 12. CALCULATE ONE PRODUCT × PERIOD × BIOME
// =============================================================================

function calculateProductPeriodBiome(
  product,
  period,
  biomeIdValue
) {


  var biomeId =
    ee.Number(
      biomeIdValue
    );


  // ---------------------------------------------------------------------------
  // Product-specific MapBiomas classification
  // ---------------------------------------------------------------------------

  var classification =

    loadClassification(
      product.classificationYear
    );


  // ---------------------------------------------------------------------------
  // Product-specific precipitation anomaly
  // ---------------------------------------------------------------------------

  var anomaly =

    loadAnomaly(
      product,
      period
    );


  // ---------------------------------------------------------------------------
  // Selected biome
  // ---------------------------------------------------------------------------

  var biomeMask =

    biomes.eq(
      biomeId
    );


  /*
   * Include only pixels valid in:
   *
   *   1. the product-specific MapBiomas classification;
   *   2. the precipitation-anomaly image;
   *   3. the selected biome.
   */

  var validMask =

    classification

      .mask()

      .and(
        anomaly.mask()
      )

      .and(
        biomeMask
      );


  // ---------------------------------------------------------------------------
  // MapBiomas class
  // ---------------------------------------------------------------------------

  var classImage =

    classification

      .updateMask(
        validMask
      )

      .toInt32();


  // ---------------------------------------------------------------------------
  // Precipitation-anomaly class
  // ---------------------------------------------------------------------------

  var anomalyImage =

    anomaly

      .updateMask(
        validMask
      )

      .toInt32();


  // ---------------------------------------------------------------------------
  // Encode class + precipitation anomaly
  // ---------------------------------------------------------------------------

  var groupId =

    classImage

      .multiply(
        GROUP_STRIDE
      )

      .add(
        anomalyImage
      )

      .add(
        ANOMALY_OFFSET
      )

      .rename(
        'group_id'
      )

      .toInt32();


  /*
   * Reduction-image bands:
   *
   *   band 0 = area_ha
   *   band 1 = group_id
   */

  var reductionImage =

    pixelAreaHa

      .updateMask(
        validMask
      )

      .addBands(
        groupId
      );


  // ---------------------------------------------------------------------------
  // Grouped reduction
  // ---------------------------------------------------------------------------

  var result =

    reductionImage.reduceRegion({

      reducer:

        ee.Reducer

          .sum()

          .group({

            groupField:
              1,

            groupName:
              'group_id'

          }),

      geometry:
        BRAZIL_BBOX,

      scale:
        SCALE,

      crs:
        classification.projection(),

      maxPixels:
        1e13,

      tileScale:
        TILE_SCALE

    });


  // ---------------------------------------------------------------------------
  // Empty-result protection
  // ---------------------------------------------------------------------------

  var groups = ee.List(

    ee.Dictionary(
      result
    )

    .get(

      'groups',

      ee.List([])

    )

  );


  // ---------------------------------------------------------------------------
  // Decode groups and create output table
  // ---------------------------------------------------------------------------

  var rows = groups.map(

    function(groupItem) {


      groupItem = ee.Dictionary(
        groupItem
      );


      var encoded = ee.Number(

        groupItem.get(
          'group_id'
        )

      );


      // -----------------------------------------------------------------------
      // Decode MapBiomas class
      // -----------------------------------------------------------------------

      var classId =

        encoded

          .divide(
            GROUP_STRIDE
          )

          .floor();


      // -----------------------------------------------------------------------
      // Decode signed precipitation anomaly
      // -----------------------------------------------------------------------

      var precipAnomaly =

        encoded

          .mod(
            GROUP_STRIDE
          )

          .subtract(
            ANOMALY_OFFSET
          );


      return ee.Feature(

        null,

        {

          // LULC year used for this anomaly product.
          classification_year:
            product.classificationYear,

          // Requested event-year-pair column.
          event_year_pair:
            product.eventYearPair,

          anomaly_product:
            product.key,

          event_label:
            product.eventLabel,

          period:
            period,

          // Each task processes only one biome.
          biome:
            biomeId,

          class:
            classId,

          precip_anomaly_mm:
            precipAnomaly,

          anomaly_bin_mm:
            ANOMALY_BIN_MM,

          area_ha:
            groupItem.get(
              'sum'
            )

        }

      );

    }

  );


  return ee.FeatureCollection(
    rows
  );

}


// =============================================================================
// 13. EXPORTS
// =============================================================================

/*
 * One task is created for every:
 *
 *   anomaly product
 *   × period
 *   × biome
 *
 *
 * Total:
 *
 *   5 × 4 × 6
 *   = 120 tasks
 */

ANOMALY_PRODUCTS.forEach(

  function(product) {


    PERIODS.forEach(

      function(period) {


        BIOME_IDS.forEach(

          function(biomeId) {


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

              collection:
                areas,

              description:
                outputName,

              folder:
                DRIVE_FOLDER,

              fileNamePrefix:
                outputName,

              fileFormat:
                'CSV',

              selectors: [

                'classification_year',
                'event_year_pair',
                'anomaly_product',
                'event_label',
                'period',
                'biome',
                'class',
                'precip_anomaly_mm',
                'anomaly_bin_mm',
                'area_ha'

              ]

            });


            print(

              'Configured:',

              outputName,

              '| event:',
              product.eventYearPair,

              '| LULC:',
              product.classificationYear

            );

          }

        );

      }

    );

  }

);


// =============================================================================
// 14. OPTIONAL SINGLE-TASK TEST
// =============================================================================

/*
 * Run a single test before launching all 120 tasks.
 *
 *
 * Product indices:
 *
 *   0 = El Niño 1982/83 — LULC 1985
 *   1 = El Niño 1997/98 — LULC 1997
 *   2 = El Niño 2015/16 — LULC 2015
 *   3 = El Niño 2023/24 — LULC 2023
 *   4 = mean of four events — LULC 2025
 */


/*
var testProduct =
  ANOMALY_PRODUCTS[0];


var test = calculateProductPeriodBiome(

  testProduct,

  'SON',

  1

);


print(

  'Test:',

  testProduct.eventLabel,

  '| event pair:',
  testProduct.eventYearPair,

  '| LULC:',
  testProduct.classificationYear,

  '| period: SON',

  '| biome: 1',

  test.limit(
    20
  )

);
*/


// =============================================================================
// 15. VISUALIZATION PARAMETERS
// =============================================================================

var VIS_ANOMALY = {

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
// 16. VISUAL CHECK
// =============================================================================

Map.setCenter(

  -54,
  -14,
  4

);


// -----------------------------------------------------------------------------
// El Niño 1982/83 anomaly
// -----------------------------------------------------------------------------

Map.addLayer(

  loadAnomaly(

    ANOMALY_PRODUCTS[0],

    'SON'

  ),

  VIS_ANOMALY,

  'El Niño 1982/83 — SON',

  false

);


// -----------------------------------------------------------------------------
// El Niño 1997/98 anomaly
// -----------------------------------------------------------------------------

Map.addLayer(

  loadAnomaly(

    ANOMALY_PRODUCTS[1],

    'SON'

  ),

  VIS_ANOMALY,

  'El Niño 1997/98 — SON',

  false

);


// -----------------------------------------------------------------------------
// El Niño 2015/16 anomaly
// -----------------------------------------------------------------------------

Map.addLayer(

  loadAnomaly(

    ANOMALY_PRODUCTS[2],

    'SON'

  ),

  VIS_ANOMALY,

  'El Niño 2015/16 — SON',

  false

);


// -----------------------------------------------------------------------------
// El Niño 2023/24 anomaly
// -----------------------------------------------------------------------------

Map.addLayer(

  loadAnomaly(

    ANOMALY_PRODUCTS[3],

    'SON'

  ),

  VIS_ANOMALY,

  'El Niño 2023/24 — SON',

  true

);


// -----------------------------------------------------------------------------
// Mean anomaly of four events
// -----------------------------------------------------------------------------

Map.addLayer(

  loadAnomaly(

    ANOMALY_PRODUCTS[4],

    'SON'

  ),

  VIS_ANOMALY,

  'Média dos quatro eventos — SON',

  false

);


// =============================================================================
// 17. MAPBIOMAS CLASSIFICATION LAYERS
// =============================================================================

CLASSIFICATION_YEARS.forEach(

  function(year) {


    Map.addLayer(

      loadClassification(
        year
      ),

      {},

      'MapBiomas Collection 11 — ' +
      year,

      false

    );

  }

);


// =============================================================================
// 18. BIOMES
// =============================================================================

Map.addLayer(

  biomes.randomVisualizer(),

  {},

  'Biomas',

  false

);


// =============================================================================
// 19. PRODUCT CONFIGURATION TABLE
// =============================================================================

var productConfiguration = ee.FeatureCollection(

  ANOMALY_PRODUCTS.map(

    function(product) {


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
            product.assetPrefix

        }

      );

    }

  )

);


print(

  'Product × event × LULC configuration:',

  productConfiguration

);


// =============================================================================
// 20. FINAL CHECKS
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

  'Expected tasks: 5 × 4 × 6 = 120'

);


print(

  'Anomaly bin:',

  ANOMALY_BIN_MM,

  'mm'

);


print(

  'tileScale:',

  TILE_SCALE

);


print(

  'Area unit: hectares'

);


print(

  'Event/LULC associations:'

);


print(

  '1982/83 anomaly → MapBiomas 1985'

);


print(

  '1997/98 anomaly → MapBiomas 1997'

);


print(

  '2015/16 anomaly → MapBiomas 2015'

);


print(

  '2023/24 anomaly → MapBiomas 2023'

);


print(

  'Mean of four events → MapBiomas 2025'

);
