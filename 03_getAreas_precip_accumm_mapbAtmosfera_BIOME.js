// =============================================================================
// MAPBIOMAS COLLECTION 11
// AREA BY BIOME, LULC CLASS AND ACCUMULATED SON PRECIPITATION
//
// INPUT PRODUCTS CREATED BY THE PRECIPITATION-ACCUMULATION SCRIPT:
//
//   1. El Niño 1997/98
//      mapbAtmosfera_precip_total_SON_elnino_1997_98
//      SON = Sep + Oct + Nov 1997
//      LULC = 1997
//
//   2. El Niño 2015/16
//      mapbAtmosfera_precip_total_SON_elnino_2015_16
//      SON = Sep + Oct + Nov 2015
//      LULC = 2015
//
//   3. El Niño 2023/24
//      mapbAtmosfera_precip_total_SON_elnino_2023_24
//      SON = Sep + Oct + Nov 2023
//      LULC = 2023
//
//   4. Reference period
//      mapbAtmosfera_precip_mean_total_SON_reference_1991_2020_without_strong_elnino
//      Mean accumulated SON precipitation for 1991–2020,
//      excluding strong El Niño SON years 1997 and 2015.
//      LULC = 2025
//
// IMPORTANT:
// - NO precipitation anomaly is used.
// - The precipitation variable is accumulated SON precipitation in mm.
// - Event products are total SON precipitation.
// - The reference product is the pixel-wise mean of SON totals across
//   reference years without the strong El Niño years.
//
// OUTPUT COLUMNS:
//
//   classification_year
//   event_year_pair
//   precip_product
//   product_type
//   event_label
//   period
//   reference_period
//   biome
//   biome_name
//   biome_region_key
//   source_biome_id
//   class
//   precip_accum_mm
//   precip_bin_mm
//   area_ha
//
// ADJUSTED BIOME CODES:
//
//   41 = Mata Atlântica (Sul): intersection of biome 4 with RS, SC, PR, SP and RJ
//   42 = Mata Atlântica (Norte): remaining pixels of biome 4
//
// EXPORT TASK-NAME FIX:
// - Earth Engine task `description` is intentionally shorter than the Drive filename.
// - Full descriptive filenames are still preserved through `fileNamePrefix`.
// - This avoids failures for the longer Mata Atlântica Norte/Sul reference names.
//
// // NUMBER OF TASKS:
//
//   4 precipitation products × 7 adjusted biomes = 28 export tasks
//
// Only SON is processed because the accumulation script exported SON products.
// =============================================================================


// =============================================================================
// 1. SETTINGS
// =============================================================================

var PERIOD = 'SON';


/*
 * Original biome ID for Mata Atlântica in the biome raster.
 */
var MATA_ATLANTICA_ID = 4;


/*
 * State identifiers from projects/mapbiomas-workspace/AUXILIAR/estados-2017_old.
 * CD_GEOCUF is stored as a String in that asset.
 *
 *   33 = Rio de Janeiro
 *   35 = São Paulo
 *   41 = Paraná
 *   42 = Santa Catarina
 *   43 = Rio Grande do Sul
 */
var SOUTH_STATE_CODES = [
  '33',
  '35',
  '41',
  '42',
  '43'
];


var SOUTH_STATE_NAMES = [
  'RIO DE JANEIRO',
  'SÃO PAULO',
  'PARANÁ',
  'SANTA CATARINA',
  'RIO GRANDE DO SUL'
];


/*
 * The original six biomes become seven adjusted processing regions.
 * Codes 41 and 42 replace original Mata Atlântica code 4 only in outputs.
 */
var BIOME_REGIONS = [
  {
    key: 'amazonia',
    outputBiomeId: 1,
    sourceBiomeId: 1,
    label: 'Amazônia'
  },
  {
    key: 'caatinga',
    outputBiomeId: 2,
    sourceBiomeId: 2,
    label: 'Caatinga'
  },
  {
    key: 'cerrado',
    outputBiomeId: 3,
    sourceBiomeId: 3,
    label: 'Cerrado'
  },
  {
    key: 'mata_atlantica_sul',
    outputBiomeId: 41,
    sourceBiomeId: MATA_ATLANTICA_ID,
    label: 'Mata Atlântica (Sul)'
  },
  {
    key: 'mata_atlantica_norte',
    outputBiomeId: 42,
    sourceBiomeId: MATA_ATLANTICA_ID,
    label: 'Mata Atlântica (Norte)'
  },
  {
    key: 'pampa',
    outputBiomeId: 5,
    sourceBiomeId: 5,
    label: 'Pampa'
  },
  {
    key: 'pantanal',
    outputBiomeId: 6,
    sourceBiomeId: 6,
    label: 'Pantanal'
  }
];


/*
 * Accumulated-precipitation grouping interval in millimetres.
 *
 * Example with PRECIP_BIN_MM = 10:
 *
 *   137 mm -> 140 mm
 *   133 mm -> 130 mm
 *   846 mm -> 850 mm
 *
 * Set to 1 to preserve integer-millimetre classes.
 */
var PRECIP_BIN_MM = 10;


/*
 * Increase to 16 if an individual reduction fails because of memory limits.
 */
var TILE_SCALE = 8;


/*
 * The reduction is performed on the 30 m MapBiomas grid.
 * The coarser precipitation raster is treated as a categorical precipitation-bin
 * raster and therefore uses nearest-neighbour reprojection by default.
 */
var SCALE = 30;


var DRIVE_FOLDER =
  'Collection11-ElNino-MapbAtmosfera';


var OUTPUT_PREFIX =
  'c11-atm-precip-accum-biome-class';


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


var STATES_ASSET =
  'projects/mapbiomas-workspace/AUXILIAR/estados-2017_old';


// =============================================================================
// 3. ACCUMULATED-PRECIPITATION PRODUCTS
// =============================================================================
//
// Asset names exactly match the four exports from the accumulation script.
//
// Event assets contain:
//   precipitacao_total_SON_mm
//
// Reference asset contains:
//   precipitacao_media_total_SON_referencia_mm
//
// loadPrecipitation() selects band 0, so both product types are handled
// without depending on their original band names.
// =============================================================================

var PRECIP_PRODUCTS = [

  {
    key:
      'elnino_1997_98',

    eventYearPair:
      '1997/98',

    eventLabel:
      'El Niño 1997/98',

    productType:
      'event_total',

    referencePeriod:
      '',

    classificationYear:
      1997,

    assetName:
      'mapbAtmosfera_precip_total_SON_elnino_1997_98'
  },


  {
    key:
      'elnino_2015_16',

    eventYearPair:
      '2015/16',

    eventLabel:
      'El Niño 2015/16',

    productType:
      'event_total',

    referencePeriod:
      '',

    classificationYear:
      2015,

    assetName:
      'mapbAtmosfera_precip_total_SON_elnino_2015_16'
  },


  {
    key:
      'elnino_2023_24',

    eventYearPair:
      '2023/24',

    eventLabel:
      'El Niño 2023/24',

    productType:
      'event_total',

    referencePeriod:
      '',

    classificationYear:
      2023,

    assetName:
      'mapbAtmosfera_precip_total_SON_elnino_2023_24'
  },


  {
    key:
      'reference_1991_2020_without_strong_elnino',

    eventYearPair:
      'REFERENCE',

    eventLabel:
      'Referência 1991–2020 sem El Niño forte',

    productType:
      'reference_mean',

    referencePeriod:
      '1991-2020_without_1997_2015',

    /*
     * The reference precipitation raster is a multi-year climatological mean
     * and therefore has no single matching LULC year.
     *
     * To preserve the same area-by-current-LULC logic used in the previous
     * anomaly script, the reference product is crossed with MapBiomas 2025.
     */
    classificationYear:
      2025,

    assetName:
      'mapbAtmosfera_precip_mean_total_SON_reference_1991_2020_without_strong_elnino'
  }

];


// =============================================================================
// 4. PROCESSING REGION
// =============================================================================

/*
 * A rectangular region avoids reducing over a complex national geometry.
 * Final pixels are still restricted by the intersection of:
 *
 *   1. MapBiomas classification mask;
 *   2. accumulated precipitation mask;
 *   3. selected biome mask.
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

var CLASSIFICATION_CACHE = {};


// =============================================================================
// 6. LOAD MAPBIOMAS CLASSIFICATION
// =============================================================================

function loadClassification(classificationYear) {

  var cacheKey =
    String(classificationYear);

  if (!CLASSIFICATION_CACHE[cacheKey]) {

    var bandName =
      'classification_' +
      classificationYear;

    CLASSIFICATION_CACHE[cacheKey] =
      ee.ImageCollection(MAPBIOMAS_COLLECTION)
        .filter(
          ee.Filter.eq(
            'version',
            MAPBIOMAS_VERSION
          )
        )
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
    CLASSIFICATION_CACHE[cacheKey]
  );

}


// =============================================================================
// 7. PRELOAD AND CHECK CLASSIFICATIONS
// =============================================================================

var CLASSIFICATION_YEARS = [
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
// 8. BIOMES AND STATE-BASED MATA ATLÂNTICA SUBDIVISION
// =============================================================================

var biomes =
  ee.Image(
    BIOMES_ASSET
  )
  .rename(
    'biome'
  )
  .toInt16()
  .selfMask();


var brazilStates =
  ee.FeatureCollection(
    STATES_ASSET
  );


/*
 * Select exactly RJ, SP, PR, SC and RS by stable state codes.
 */
var southStates =
  brazilStates.filter(
    ee.Filter.inList(
      'CD_GEOCUF',
      SOUTH_STATE_CODES
    )
  );


/*
 * Rasterize the five selected states as 1 and all other pixels as 0.
 */
var southStatesMask =
  ee.Image(0)
    .byte()
    .paint(
      southStates,
      1
    )
    .unmask(0)
    .rename(
      'south_states'
    );


/*
 * Only pixels equal to original Mata Atlântica code 4 are eligible.
 */
var mataAtlanticaReferenceMask =
  biomes
    .eq(
      MATA_ATLANTICA_ID
    )
    .selfMask()
    .rename(
      'mata_atlantica_reference'
    );


/*
 * Sul = original Mata Atlântica intersected with RJ, SP, PR, SC and RS.
 */
var mataAtlanticaSouthMask =
  mataAtlanticaReferenceMask
    .updateMask(
      southStatesMask.eq(1)
    )
    .selfMask()
    .rename(
      'mata_atlantica_sul'
    );


/*
 * Norte = original Mata Atlântica outside those five states.
 */
var mataAtlanticaNorthMask =
  mataAtlanticaReferenceMask
    .updateMask(
      southStatesMask.eq(0)
    )
    .selfMask()
    .rename(
      'mata_atlantica_norte'
    );


/*
 * Recombine both subdivisions for validation.
 */
var mataAtlanticaRecombinedMask =
  mataAtlanticaSouthMask
    .unmask(0)
    .or(
      mataAtlanticaNorthMask.unmask(0)
    )
    .selfMask()
    .rename(
      'mata_atlantica_recombined'
    );


/*
 * This mismatch layer should be empty.
 */
var mataAtlanticaSplitMismatch =
  mataAtlanticaReferenceMask
    .unmask(0)
    .neq(
      mataAtlanticaRecombinedMask.unmask(0)
    )
    .selfMask()
    .rename(
      'mata_atlantica_split_mismatch'
    );


/*
 * Adjusted biome raster used for checking and visualization.
 */
var adjustedBiomes =
  biomes
    .where(
      mataAtlanticaSouthMask
        .unmask(0)
        .eq(1),
      41
    )
    .where(
      mataAtlanticaNorthMask
        .unmask(0)
        .eq(1),
      42
    )
    .rename(
      'adjusted_biome'
    )
    .toInt16();


function getBiomeRegionMask(
  biomeRegion
) {

  if (
    biomeRegion.key ===
    'mata_atlantica_sul'
  ) {

    return mataAtlanticaSouthMask;

  }

  if (
    biomeRegion.key ===
    'mata_atlantica_norte'
  ) {

    return mataAtlanticaNorthMask;

  }

  return biomes.eq(
    biomeRegion.sourceBiomeId
  );

}


print(
  'Original biomes:',
  biomes
);


print(
  'Selected southern states — names:',
  southStates.aggregate_array(
    'NM_ESTADO'
  )
);


print(
  'Selected southern states — CD_GEOCUF:',
  southStates.aggregate_array(
    'CD_GEOCUF'
  )
);


print(
  'Number of selected southern states (expected 5):',
  southStates.size()
);


print(
  'Mata Atlântica source biome ID (expected 4):',
  MATA_ATLANTICA_ID
);


print(
  'Mata Atlântica split mismatch (should be empty):',
  mataAtlanticaSplitMismatch
);


print(
  'Adjusted biomes:',
  adjustedBiomes
);


// =============================================================================
// 9. LOAD ACCUMULATED PRECIPITATION
// =============================================================================

function loadPrecipitation(
  product
) {

  var assetId =
    PRECIP_DIR +
    '/' +
    product.assetName;


  /*
   * Select band 0 because event and reference products have different
   * original band names.
   *
   * Values are grouped into PRECIP_BIN_MM bins.
   */
  return ee.Image(
      assetId
    )
    .select(
      [0]
    )
    .divide(
      PRECIP_BIN_MM
    )
    .round()
    .multiply(
      PRECIP_BIN_MM
    )
    .rename(
      'precip_accum_mm'
    )
    .toInt32()
    .set({

      precip_product:
        product.key,

      product_type:
        product.productType,

      event_year_pair:
        product.eventYearPair,

      event_label:
        product.eventLabel,

      period:
        PERIOD,

      reference_period:
        product.referencePeriod,

      classification_year:
        product.classificationYear,

      precip_asset:
        assetId,

      precip_bin_mm:
        PRECIP_BIN_MM,

      unit:
        'mm'

    });

}


// =============================================================================
// 10. PIXEL AREA
// =============================================================================

var pixelAreaHa =
  ee.Image.pixelArea()
    .divide(
      10000
    )
    .rename(
      'area_ha'
    );


// =============================================================================
// 11. INTERNAL CLASS + PRECIPITATION ENCODING
// =============================================================================

/*
 * Biome is not encoded because each export task processes one biome only.
 *
 *   group_id = class × GROUP_STRIDE + precipitation_bin
 *
 * Accumulated precipitation is non-negative.
 *
 * GROUP_STRIDE = 100000 allows precipitation bins from 0 to 99,999 mm,
 * far above any realistic SON total.
 */
var GROUP_STRIDE = 100000;


// =============================================================================
// 12. CALCULATE ONE PRODUCT × BIOME
// =============================================================================

function calculateProductBiome(
  product,
  biomeRegion
) {

  var outputBiomeId =
    ee.Number(
      biomeRegion.outputBiomeId
    );


  var sourceBiomeId =
    ee.Number(
      biomeRegion.sourceBiomeId
    );


  // Product-specific MapBiomas classification.
  var classification =
    loadClassification(
      product.classificationYear
    );


  // Product-specific accumulated precipitation.
  var precipitation =
    loadPrecipitation(
      product
    );


  // Selected original or adjusted biome region.
  var biomeMask =
    getBiomeRegionMask(
      biomeRegion
    );


  // Include only pixels valid in classification, precipitation and biome.
  var validMask =
    classification
      .mask()
      .and(
        precipitation.mask()
      )
      .and(
        biomeMask
      );


  var classImage =
    classification
      .updateMask(
        validMask
      )
      .toInt32();


  var precipitationImage =
    precipitation
      .updateMask(
        validMask
      )
      .toInt32();


  var groupId =
    classImage
      .multiply(
        GROUP_STRIDE
      )
      .add(
        precipitationImage
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


  // Empty-result protection.
  var groups =
    ee.List(
      ee.Dictionary(
        result
      )
      .get(
        'groups',
        ee.List([])
      )
    );


  var rows =
    groups.map(

      function(groupItem) {

        groupItem =
          ee.Dictionary(
            groupItem
          );


        var encoded =
          ee.Number(
            groupItem.get(
              'group_id'
            )
          );


        var classId =
          encoded
            .divide(
              GROUP_STRIDE
            )
            .floor();


        var precipAccum =
          encoded
            .mod(
              GROUP_STRIDE
            );


        return ee.Feature(
          null,
          {

            classification_year:
              product.classificationYear,

            event_year_pair:
              product.eventYearPair,

            precip_product:
              product.key,

            product_type:
              product.productType,

            event_label:
              product.eventLabel,

            period:
              PERIOD,

            reference_period:
              product.referencePeriod,

            biome:
              outputBiomeId,

            biome_name:
              biomeRegion.label,

            biome_region_key:
              biomeRegion.key,

            source_biome_id:
              sourceBiomeId,

            class:
              classId,

            precip_accum_mm:
              precipAccum,

            precip_bin_mm:
              PRECIP_BIN_MM,

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
 * One CSV task is created for every:
 *
 *   precipitation product × adjusted biome region
 *
 * Total:
 *
 *   4 × 7 = 28 tasks
 *
 * Products:
 *
 *   1) SON 1997/98 accumulated precipitation
 *   2) SON 2015/16 accumulated precipitation
 *   3) SON 2023/24 accumulated precipitation
 *   4) SON reference mean 1991–2020 excluding 1997 and 2015
 */
PRECIP_PRODUCTS.forEach(

  function(product) {

    BIOME_REGIONS.forEach(

      function(biomeRegion) {

        // Full descriptive filename written to Google Drive.
        // This can remain long and preserves the original naming convention.
        var outputName =
          OUTPUT_PREFIX +
          '-' +
          product.key +
          '-y' +
          product.classificationYear +
          '-' +
          PERIOD +
          '-b' +
          biomeRegion.outputBiomeId +
          '-' +
          biomeRegion.key;


        // SHORT Earth Engine task name.
        //
        // The full reference filenames for Mata Atlântica Norte/Sul exceed
        // the practical task-description length accepted by the Code Editor.
        // Keep `description` short, ASCII-only and restricted to
        // letters/numbers/_/-.  `fileNamePrefix` below still uses outputName.
        var taskDescription =
          'c11_precip_' +
          product.key +
          '_y' +
          product.classificationYear +
          '_' +
          PERIOD +
          '_b' +
          biomeRegion.outputBiomeId;

        // Defensive sanitization in case future product keys change.
        taskDescription =
          taskDescription
            .replace(/[^A-Za-z0-9_-]/g, '_')
            .substring(0, 90);


        var areas =
          calculateProductBiome(
            product,
            biomeRegion
          );


        Export.table.toDrive({

          collection:
            areas,

          // Task name shown in the Earth Engine Tasks tab.
          description:
            taskDescription,

          folder:
            DRIVE_FOLDER,

          // Full CSV filename written to Google Drive.
          fileNamePrefix:
            outputName,

          fileFormat:
            'CSV',

          selectors: [

            'classification_year',

            'event_year_pair',

            'precip_product',

            'product_type',

            'event_label',

            'period',

            'reference_period',

            'biome',

            'biome_name',

            'biome_region_key',

            'source_biome_id',

            'class',

            'precip_accum_mm',

            'precip_bin_mm',

            'area_ha'

          ]

        });


        print(
          'Configured task:',
          taskDescription,
          '| Drive file:',
          outputName,
          '| product:',
          product.key,
          '| LULC:',
          product.classificationYear,
          '| period:',
          PERIOD,
          '| biome:',
          biomeRegion.outputBiomeId,
          '| biome name:',
          biomeRegion.label,
          '| source biome:',
          biomeRegion.sourceBiomeId
        );

      }

    );

  }

);


// =============================================================================
// 14. OPTIONAL SINGLE-TASK TEST
// =============================================================================

/*
 * Recommended:
 * comment out Section 13 and run this single test first.
 *
 * Product indices:
 *
 *   0 = El Niño 1997/98 — LULC 1997
 *   1 = El Niño 2015/16 — LULC 2015
 *   2 = El Niño 2023/24 — LULC 2023
 *   3 = Reference 1991–2020 without strong El Niño — LULC 2025
 */

/*
var testProduct =
  PRECIP_PRODUCTS[0];


var testBiomeRegion =
  BIOME_REGIONS[3]; // Mata Atlântica (Sul)


var test =
  calculateProductBiome(
    testProduct,
    testBiomeRegion
  );


print(
  'Test:',
  testProduct.eventLabel,
  '| event/reference:',
  testProduct.eventYearPair,
  '| LULC:',
  testProduct.classificationYear,
  '| period:',
  PERIOD,
  '| biome:',
  testBiomeRegion.label,
  test.limit(20)
);
*/


// =============================================================================
// 15. VISUALIZATION PARAMETERS
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


// =============================================================================
// 16. VISUAL CHECK
// =============================================================================

Map.setCenter(
  -54,
  -14,
  4
);


Map.addLayer(
  loadPrecipitation(
    PRECIP_PRODUCTS[0]
  ),
  VIS_PRECIP,
  'Accumulated precip — El Niño 1997/98 — SON',
  false
);


Map.addLayer(
  loadPrecipitation(
    PRECIP_PRODUCTS[1]
  ),
  VIS_PRECIP,
  'Accumulated precip — El Niño 2015/16 — SON',
  false
);


Map.addLayer(
  loadPrecipitation(
    PRECIP_PRODUCTS[2]
  ),
  VIS_PRECIP,
  'Accumulated precip — El Niño 2023/24 — SON',
  true
);


Map.addLayer(
  loadPrecipitation(
    PRECIP_PRODUCTS[3]
  ),
  VIS_PRECIP,
  'Accumulated precip — reference 1991–2020 without strong El Niño — SON',
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
// 18. ORIGINAL AND ADJUSTED BIOMES
// =============================================================================

Map.addLayer(
  biomes.randomVisualizer(),
  {},
  'Biomas originais',
  false
);


/*
 * Remap non-contiguous adjusted codes to 1–7 only for palette display.
 * Analytical raster and CSV retain codes 1, 2, 3, 41, 42, 5 and 6.
 */
var adjustedBiomesForMap =
  adjustedBiomes.remap(
    [1, 2, 3, 41, 42, 5, 6],
    [1, 2, 3, 4, 5, 6, 7]
  )
  .rename(
    'adjusted_biome_visual'
  )
  .selfMask();


var ADJUSTED_BIOME_PALETTE = [
  '1f8d49', // Amazônia
  'fdae61', // Caatinga
  'dfc35a', // Cerrado
  '7b3294', // Mata Atlântica (Sul)
  'c2a5cf', // Mata Atlântica (Norte)
  '2c7fb8', // Pampa
  '80cdc1'  // Pantanal
];


Map.addLayer(
  adjustedBiomesForMap,
  {
    min:
      1,

    max:
      7,

    palette:
      ADJUSTED_BIOME_PALETTE
  },
  'Biomas ajustados — Mata Atlântica Sul/Norte',
  true
);


Map.addLayer(
  mataAtlanticaReferenceMask,
  {
    palette:
      ['00ffff']
  },
  'Referência original — Mata Atlântica (bioma 4)',
  false
);


Map.addLayer(
  mataAtlanticaSplitMismatch,
  {
    palette:
      ['ff0000']
  },
  'ERRO de subdivisão — deve ficar vazio',
  true
);


Map.addLayer(
  mataAtlanticaSouthMask.selfMask(),
  {
    palette:
      ['7b3294']
  },
  'Mata Atlântica (Sul) — RJ, SP, PR, SC e RS',
  false
);


Map.addLayer(
  mataAtlanticaNorthMask.selfMask(),
  {
    palette:
      ['c2a5cf']
  },
  'Mata Atlântica (Norte) — demais estados',
  false
);


Map.addLayer(
  brazilStates.style({

    color:
      '808080',

    fillColor:
      '00000000',

    width:
      1

  }),
  {},
  'Limites de todos os estados',
  false
);


Map.addLayer(
  southStates.style({

    color:
      '000000',

    fillColor:
      '00000000',

    width:
      2

  }),
  {},
  'Estados da Mata Atlântica Sul — RJ, SP, PR, SC e RS',
  true
);


// =============================================================================
// 19. BIOME LEGEND
// =============================================================================

var biomeLegend =
  ui.Panel({

    style: {

      position:
        'bottom-left',

      padding:
        '8px 12px'

    }

  });


biomeLegend.add(

  ui.Label({

    value:
      'Biomas ajustados',

    style: {

      fontWeight:
        'bold',

      margin:
        '0 0 6px 0'

    }

  })

);


function addBiomeLegendRow(
  color,
  label
) {

  var colorBox =
    ui.Label({

      style: {

        backgroundColor:
          '#' + color,

        padding:
          '8px',

        margin:
          '0 6px 4px 0'

      }

    });


  var description =
    ui.Label({

      value:
        label,

      style: {

        margin:
          '0 0 4px 0'

      }

    });


  biomeLegend.add(

    ui.Panel({

      widgets: [
        colorBox,
        description
      ],

      layout:
        ui.Panel.Layout.Flow(
          'horizontal'
        )

    })

  );

}


[
  'Amazônia',
  'Caatinga',
  'Cerrado',
  'Mata Atlântica (Sul)',
  'Mata Atlântica (Norte)',
  'Pampa',
  'Pantanal'
].forEach(

  function(label, index) {

    addBiomeLegendRow(
      ADJUSTED_BIOME_PALETTE[index],
      label
    );

  }

);


Map.add(
  biomeLegend
);


// =============================================================================
// 20. PRODUCT CONFIGURATION TABLE
// =============================================================================

var productConfiguration =
  ee.FeatureCollection(

    PRECIP_PRODUCTS.map(

      function(product) {

        return ee.Feature(
          null,
          {

            precip_product:
              product.key,

            product_type:
              product.productType,

            event_year_pair:
              product.eventYearPair,

            event_label:
              product.eventLabel,

            reference_period:
              product.referencePeriod,

            classification_year:
              product.classificationYear,

            asset_name:
              product.assetName

          }
        );

      }

    )

  );


print(
  'Product × event/reference × LULC configuration:',
  productConfiguration
);


// =============================================================================
// 21. FINAL CHECKS
// =============================================================================

print(
  'Number of precipitation products:',
  PRECIP_PRODUCTS.length
);


print(
  'Period:',
  PERIOD
);


print(
  'Number of adjusted biome regions:',
  BIOME_REGIONS.length
);


print(
  'Adjusted biome configuration:',
  BIOME_REGIONS
);


print(
  'Number of export tasks:',
  PRECIP_PRODUCTS.length *
  BIOME_REGIONS.length
);


print(
  'Expected: 4 × 7 = 28 tasks'
);


print(
  'Precipitation bin:',
  PRECIP_BIN_MM,
  'mm'
);


print(
  'Area unit: hectares'
);


print(
  'Mata Atlântica Sul — states:',
  SOUTH_STATE_NAMES
);


print(
  'Mata Atlântica adjusted codes: 41 = Sul; 42 = Norte'
);


print(
  'Event/reference × LULC associations:'
);


print(
  '1997/98 accumulated SON precipitation → MapBiomas 1997'
);


print(
  '2015/16 accumulated SON precipitation → MapBiomas 2015'
);


print(
  '2023/24 accumulated SON precipitation → MapBiomas 2023'
);


print(
  'Reference mean SON 1991–2020 without 1997/2015 → MapBiomas 2025'
);


print(
  'NO precipitation anomaly is used.'
);
