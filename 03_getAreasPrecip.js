// =============================================================================
// MAPBIOMAS COLLECTION 11 — AREA EXPORT BY BIOME
//
// Output columns:
//
//   year
//   period
//   biome
//   class
//   precip_anomaly_mm
//   area_ha
//
// Creates 24 tasks:
//   4 periods × 6 biomes
// =============================================================================


// =============================================================================
// 1. SETTINGS
// =============================================================================

var YEAR = 2025;

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

// 1 = anomaly rounded to the nearest 1 mm.
// Use 5, 10 or 25 to reduce the number of output rows.
var ANOMALY_BIN_MM = 10;

// Increase to 16 if an individual biome still fails.
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


// Simple processing region.
// Raster masks restrict each calculation to the selected biome.
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
// 3. MAPBIOMAS CLASSIFICATION
// =============================================================================

// Select the required band before mosaic().
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
  'classification_' + YEAR
)

.mosaic()

.rename(
  'class'
)

.toInt16()

.selfMask();


print(
  'Classification:',
  classification
);


print(
  'Classification projection:',
  classification.projection()
);


// =============================================================================
// 4. BIOMES
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
// 5. PRECIPITATION ANOMALY
// =============================================================================

function loadAnomaly(period) {

  return ee.Image(

    PRECIP_DIR +
    '/precip_anomaly_elnino_' +
    period

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
// 6. PIXEL AREA
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
// 7. CONVERT ONE CLASS GROUP TO A TABLE
// =============================================================================

/*
 * Grouped-result structure:
 *
 * class
 *   └── precip_anomaly_mm
 *         └── sum(area_ha)
 */

function convertClassGroup(
  classGroup,
  period,
  biomeId
) {

  classGroup = ee.Dictionary(
    classGroup
  );


  var classId = ee.Number(

    classGroup.get(
      'class'
    )

  );


  var anomalyGroups = ee.List(

    classGroup.get(
      'groups'
    )

  );


  var rows = anomalyGroups.map(

    function(anomalyGroup) {

      anomalyGroup = ee.Dictionary(
        anomalyGroup
      );


      return ee.Feature(

        null,

        {

          year:
            YEAR,

          period:
            period,

          // Hardcoded from the current biome export.
          biome:
            biomeId,

          class:
            classId,

          precip_anomaly_mm:
            anomalyGroup.get(
              'precip_anomaly_mm'
            ),

          area_ha:
            anomalyGroup.get(
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
// 8. CALCULATE ONE PERIOD FOR ONE BIOME
// =============================================================================

function calculateBiomePeriod(
  period,
  biomeId
) {

  biomeId = ee.Number(
    biomeId
  );


  var anomaly = loadAnomaly(
    period
  );


  var biomeMask = biomes.eq(
    biomeId
  );


  /*
   * A pixel must be valid in:
   *
   * 1. MapBiomas classification;
   * 2. precipitation anomaly;
   * 3. selected biome.
   */

  var validMask = classification
    .mask()

    .and(
      anomaly.mask()
    )

    .and(
      biomeMask
    );


  var classImage = classification

    .updateMask(
      validMask
    )

    .rename(
      'class'
    )

    .toInt16();


  var anomalyImage = anomaly

    .updateMask(
      validMask
    )

    .rename(
      'precip_anomaly_mm'
    )

    .toInt32();


  /*
   * Input-band order:
   *
   *   0 = area_ha
   *   1 = class
   *   2 = precip_anomaly_mm
   */

  var reductionImage = pixelAreaHa

    .updateMask(
      validMask
    )

    .addBands(
      classImage
    )

    .addBands(
      anomalyImage
    );


  /*
   * Nested grouping:
   *
   * class
   *   └── precipitation anomaly
   *         └── area
   */

  var reducer = ee.Reducer
    .sum()

    .group(
      1,
      'precip_anomaly_mm'
    )

    .group(
      1,
      'class'
    );


  var result = reductionImage.reduceRegion({

    reducer:
      reducer,

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


  // Empty-list fallback.
  var classGroups = ee.List(

    ee.Dictionary(
      result
    )

    .get(
      'groups',
      ee.List([])
    )

  );


  var tables = classGroups.map(

    function(classGroup) {

      return convertClassGroup(

        classGroup,

        period,

        biomeId

      );

    }

  );


  return ee.FeatureCollection(
    tables
  )

  .flatten();

}


// =============================================================================
// 9. EXPORT ONE CSV PER PERIOD AND BIOME
// =============================================================================

PERIODS.forEach(

  function(period) {

    BIOME_IDS.forEach(

      function(biomeId) {

        var outputName =

          OUTPUT_PREFIX +
          '-' +
          YEAR +
          '-' +
          period +
          '-biome-' +
          biomeId;


        var areas = calculateBiomePeriod(

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

            'year',
            'period',
            'biome',
            'class',
            'precip_anomaly_mm',
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


// =============================================================================
// 10. OPTIONAL SINGLE-BIOME TEST
// =============================================================================

/*
 * Uncomment before launching all tasks to inspect a sample.
 */

/*
var test = calculateBiomePeriod(
  'SON',
  1
);

print(
  'SON — biome 1 test:',
  test.limit(20)
);
*/


// =============================================================================
// 11. VISUAL CHECK
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


Map.addLayer(

  loadAnomaly(
    'SON'
  ),

  VIS_ANOMALY,

  'SON precipitation anomaly',

  true

);


Map.addLayer(

  classification,

  {},

  'MapBiomas classification ' + YEAR,

  false

);


Map.addLayer(

  biomes.randomVisualizer(),

  {},

  'Biomes',

  false

);


// =============================================================================
// 12. FINAL CHECKS
// =============================================================================

print(
  'Number of export tasks:',
  PERIODS.length * BIOME_IDS.length
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
