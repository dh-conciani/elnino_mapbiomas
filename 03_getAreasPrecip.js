// =============================================================================
// MAPBIOMAS COLLECTION 11
// AREA BY BIOME, CLASS AND PRECIPITATION-ANOMALY PRODUCT
//
// Products:
//   1. Mean anomaly of four strong El Niño events
//   2. El Niño 2023/2024 anomaly
//
// Classification:
//   MapBiomas Collection 11 — 2025
//
// Output:
//   classification_year
//   anomaly_product
//   event_label
//   period
//   biome
//   class
//   precip_anomaly_mm
//   anomaly_bin_mm
//   area_ha
//
// Number of tasks:
//   2 products × 4 periods × 6 biomes = 48
// =============================================================================


// =============================================================================
// 1. SETTINGS
// =============================================================================

var CLASSIFICATION_YEAR = 2025;

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
 * 10 = anomaly classes every 10 mm.
 *
 * Examples:
 *   -137 becomes -140
 *   -133 becomes -130
 *    +46 becomes +50
 *
 * Change to 1 for integer-millimetre classes.
 */
var ANOMALY_BIN_MM = 10;


/*
 * Increase to 16 only if an individual task still fails
 * with an out-of-memory error.
 */
var TILE_SCALE = 8;

var SCALE = 30;

var DRIVE_FOLDER =
  'Collection11';

var OUTPUT_PREFIX =
  'collection11-precip-anomaly-biome-class';


// =============================================================================
// 2. ASSETS
// =============================================================================

var MAPBIOMAS_COLLECTION =
  'projects/mapbiomas-brazil/assets/LAND-COVER/COLLECTION-11/INTEGRATION/classification-ft';

var MAPBIOMAS_VERSION =
  '0-4-13-w3y-5';

var PRECIP_DIR =
  'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO';

var BIOMES_ASSET =
  'projects/mapbiomas-workspace/AUXILIAR/biome_2025_buf5k_30m';


// =============================================================================
// 3. PRECIPITATION-ANOMALY PRODUCTS
// =============================================================================

/*
 * Expected asset names:
 *
 * Mean:
 *   precip_anomaly_mean_4elnino_DJF
 *   precip_anomaly_mean_4elnino_MAM
 *   precip_anomaly_mean_4elnino_JJA
 *   precip_anomaly_mean_4elnino_SON
 *
 * Event 2023/24:
 *   precip_anomaly_elnino_2023_24_DJF
 *   precip_anomaly_elnino_2023_24_MAM
 *   precip_anomaly_elnino_2023_24_JJA
 *   precip_anomaly_elnino_2023_24_SON
 */

var ANOMALY_PRODUCTS = [

  {
    key:
      'mean_4_events',

    eventLabel:
      'Mean of 1982/83, 1997/98, 2015/16 and 2023/24',

    assetPrefix:
      'precip_anomaly_mean_4elnino_'
  },

  {
    key:
      'elnino_2023_24',

    eventLabel:
      'El Nino 2023/24',

    assetPrefix:
      'precip_anomaly_elnino_2023_24_'
  }

];


// =============================================================================
// 4. PROCESSING REGION
// =============================================================================

/*
 * A simple rectangle avoids processing a complex national geometry.
 *
 * The biome, classification and anomaly masks determine which pixels
 * are actually included.
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
// 5. MAPBIOMAS CLASSIFICATION — 2025
// =============================================================================

/*
 * Select the 2025 band before mosaic().
 *
 * This avoids carrying all annual bands through the computation.
 */

var classification = ee.ImageCollection(
  MAPBIOMAS_COLLECTION
)

.filter(
  ee.Filter.eq(
    'version',
    MAPBIOMAS_VERSION
  )
)

.select(
  'classification_' + CLASSIFICATION_YEAR
)

.mosaic()

.rename(
  'class'
)

.toInt16()

.selfMask();


print(
  'MapBiomas classification:',
  classification
);


print(
  'Classification projection:',
  classification.projection()
);


// =============================================================================
// 6. BIOMES
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
// 7. LOAD PRECIPITATION ANOMALY
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

  .select(
    [0]
  )

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

  .toInt32();

}


// =============================================================================
// 8. PIXEL AREA
// =============================================================================

// Area in hectares.

var pixelAreaHa = ee.Image
  .pixelArea()

  .divide(
    10000
  )

  .rename(
    'area_ha'
  );


// =============================================================================
// 9. INTERNAL CLASS + ANOMALY ENCODING
// =============================================================================

/*
 * Biome is not encoded because every task processes only one biome.
 *
 * Class and anomaly are temporarily encoded as:
 *
 *   group_id =
 *       class × GROUP_STRIDE
 *       + anomaly
 *       + ANOMALY_OFFSET
 *
 * The values are decoded before CSV export.
 *
 * This creates one grouping level instead of:
 *
 *   class
 *     └── anomaly
 *           └── area
 */

var ANOMALY_OFFSET = 100000;

var GROUP_STRIDE = 200001;


// =============================================================================
// 10. CALCULATE ONE PRODUCT × PERIOD × BIOME
// =============================================================================

function calculateProductPeriodBiome(
  product,
  period,
  biomeIdValue
) {

  var biomeId = ee.Number(
    biomeIdValue
  );


  // ---------------------------------------------------------------------------
  // Anomaly product
  // ---------------------------------------------------------------------------

  var anomaly = loadAnomaly(
    product,
    period
  );


  // ---------------------------------------------------------------------------
  // Biome mask
  // ---------------------------------------------------------------------------

  var biomeMask = biomes.eq(
    biomeId
  );


  /*
   * Include only pixels valid in:
   *
   *   1. MapBiomas classification;
   *   2. precipitation anomaly;
   *   3. selected biome.
   */

  var validMask = classification
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

  var classImage = classification

    .updateMask(
      validMask
    )

    .toInt32();


  // ---------------------------------------------------------------------------
  // Precipitation anomaly
  // ---------------------------------------------------------------------------

  var anomalyImage = anomaly

    .updateMask(
      validMask
    )

    .toInt32();


  // ---------------------------------------------------------------------------
  // Encode class + anomaly
  // ---------------------------------------------------------------------------

  var groupId = classImage

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
   *   0 = area_ha
   *   1 = group_id
   */

  var reductionImage = pixelAreaHa

    .updateMask(
      validMask
    )

    .addBands(
      groupId
    );


  // ---------------------------------------------------------------------------
  // Grouped reduction
  // ---------------------------------------------------------------------------

  var result = reductionImage.reduceRegion({

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


      // Decode MapBiomas class.

      var classId = encoded

        .divide(
          GROUP_STRIDE
        )

        .floor();


      // Decode signed precipitation anomaly.

      var precipAnomaly = encoded

        .mod(
          GROUP_STRIDE
        )

        .subtract(
          ANOMALY_OFFSET
        );


      return ee.Feature(

        null,

        {

          classification_year:
            CLASSIFICATION_YEAR,

          anomaly_product:
            product.key,

          event_label:
            product.eventLabel,

          period:
            period,

          // Hardcoded from the current task.
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
// 11. EXPORTS
// =============================================================================

/*
 * Creates one task for every:
 *
 *   anomaly product
 *   × period
 *   × biome
 *
 * Total:
 *
 *   2 × 4 × 6 = 48 tasks
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
              '-' +
              CLASSIFICATION_YEAR +
              '-' +
              period +
              '-biome-' +
              biomeId;


            var areas = calculateProductPeriodBiome(

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
              outputName
            );

          }

        );

      }

    );

  }

);


// =============================================================================
// 12. OPTIONAL SINGLE-TASK TEST
// =============================================================================

/*
 * Uncomment this block before launching every task.
 *
 * Product index:
 *
 *   0 = four-event mean
 *   1 = El Niño 2023/24
 */

/*
var testProduct =
  ANOMALY_PRODUCTS[1];


var test = calculateProductPeriodBiome(

  testProduct,

  'SON',

  1

);


print(

  'Test — 2023/24, SON, biome 1:',

  test.limit(
    20
  )

);
*/


// =============================================================================
// 13. VISUAL CHECK
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


Map.setCenter(
  -54,
  -14,
  4
);


// Four-event mean.

Map.addLayer(

  loadAnomaly(
    ANOMALY_PRODUCTS[0],
    'SON'
  ),

  VIS_ANOMALY,

  'Mean anomaly — SON',

  true

);


// El Niño 2023/24.

Map.addLayer(

  loadAnomaly(
    ANOMALY_PRODUCTS[1],
    'SON'
  ),

  VIS_ANOMALY,

  'El Nino 2023/24 — SON',

  false

);


// MapBiomas classification.

Map.addLayer(

  classification,

  {},

  'MapBiomas classification ' +
  CLASSIFICATION_YEAR,

  false

);


// Biomes.

Map.addLayer(

  biomes.randomVisualizer(),

  {},

  'Biomes',

  false

);


// =============================================================================
// 14. FINAL CHECKS
// =============================================================================

print(
  'Number of anomaly products:',
  ANOMALY_PRODUCTS.length
);


print(
  'Number of export tasks:',
  ANOMALY_PRODUCTS.length *
  PERIODS.length *
  BIOME_IDS.length
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
