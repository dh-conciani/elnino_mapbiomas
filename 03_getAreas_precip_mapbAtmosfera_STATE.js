// =============================================================================
// MAPBIOMAS COLLECTION 11
// AREA BY BIOME, LULC CLASS AND MAPBIOMAS ATMOSPHERE
// PRECIPITATION-ANOMALY PRODUCT
//
// INPUT PRODUCTS CREATED BY THE SECOND SCRIPT:
//
//   1. El Niño 1997/98
//      mapbAtmosfera_precip_anomaly_elnino_1997_98_<PERIOD>
//      LULC = 1997
//
//   2. El Niño 2015/16
//      mapbAtmosfera_precip_anomaly_elnino_2015_16_<PERIOD>
//      LULC = 2015
//
//   3. El Niño 2023/24
//      mapbAtmosfera_precip_anomaly_elnino_2023_24_<PERIOD>
//      LULC = 2023
//
//   4. Mean anomaly of the three El Niño events
//      mapbAtmosfera_precip_anomaly_mean_3elnino_<PERIOD>
//      LULC = 2025
//
// ONLY THE FOUR TRIMESTERS ARE PROCESSED:
//
//   SON | DJF | MAM | JJA
//
// THE ANNUAL SEPTEMBER-AUGUST PRODUCT IS NOT USED.
//
// OUTPUT COLUMNS:
//
//   classification_year
//   event_year_pair
//   anomaly_product
//   event_label
//   period
//   biome
//   biome_name
//   biome_region_key
//   source_biome_id
//   class
//   precip_anomaly_mm
//   anomaly_bin_mm
//   area_ha
//
// ADJUSTED BIOME CODES:
//
//   41 = Mata Atlântica (Sul): intersection of biome 4 with RS, SC, PR, SP and RJ
//   42 = Mata Atlântica (Norte): remaining pixels of biome 4
//
// NUMBER OF TASKS WITH ALL FOUR TRIMESTERS ENABLED:
//
//   4 products × 4 trimesters × 7 adjusted biomes = 112 export tasks
// =============================================================================


// =============================================================================
// 1. SETTINGS
// =============================================================================

var PERIODS = [
  'SON',
  //'DJF',
  //'MAM',
  //'JJA'
];


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
 * Precipitation-anomaly grouping interval in millimetres.
 *
 * Example with ANOMALY_BIN_MM = 10:
 *
 *   -137 mm -> -140 mm
 *   -133 mm -> -130 mm
 *    +46 mm ->  +50 mm
 *
 * Set to 1 to preserve integer-millimetre classes.
 */
var ANOMALY_BIN_MM = 10;


/*
 * Increase to 16 if an individual reduction fails because of memory limits.
 */
var TILE_SCALE = 8;


/*
 * The reduction is performed on the 30 m MapBiomas grid.
 * The coarser precipitation anomaly is treated as a categorical anomaly-bin
 * raster and therefore uses nearest-neighbour reprojection by default.
 */
var SCALE = 30;


var DRIVE_FOLDER =
  'Collection11-ElNino-MapbAtmosfera';


var OUTPUT_PREFIX =
  'c11-atm-anom-biome-class';


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


/*
 * MapBiomas/IBGE state boundaries. Relevant attributes:
 *
 *   CD_GEOCUF — state code stored as String
 *   NM_ESTADO — state name
 *   NM_REGIAO — Brazilian macroregion
 */
var STATES_ASSET =
  'projects/mapbiomas-workspace/AUXILIAR/estados-2017_old';


// =============================================================================
// 3. PRECIPITATION-ANOMALY PRODUCTS
// =============================================================================

/*
 * The event assets exported by the second script contain the band:
 *
 *   anomalia_mm
 *
 * The mean assets contain the band:
 *
 *   media_anomalias_mm
 *
 * loadAnomaly() selects band 0, so both product types are handled by the same
 * function without depending on their original band names.
 */
var ANOMALY_PRODUCTS = [

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
      'mapbAtmosfera_precip_anomaly_elnino_1997_98_'
  },


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
      'mapbAtmosfera_precip_anomaly_elnino_2015_16_'
  },


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
      'mapbAtmosfera_precip_anomaly_elnino_2023_24_'
  },


  {
    key:
      'mean_3_events',

    eventYearPair:
      '1997/98 + 2015/16 + 2023/24',

    eventLabel:
      'Média de 1997/98, 2015/16 e 2023/24',

    classificationYear:
      2025,

    assetPrefix:
      'mapbAtmosfera_precip_anomaly_mean_3elnino_'
  }

];


// =============================================================================
// 4. PROCESSING REGION
// =============================================================================

/*
 * A rectangular region avoids reducing over a complex national geometry.
 * Final pixels are still restricted by the intersection of:
 *
 *   1. the MapBiomas classification mask;
 *   2. the precipitation-anomaly mask;
 *   3. the selected biome mask.
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
      loadClassification(year);

    print(
      'MapBiomas classification ' + year + ':',
      classification
    );

    print(
      'Projection — classification ' + year + ':',
      classification.projection()
    );
  }
);


// =============================================================================
// 8. BIOMES AND STATE-BASED MATA ATLÂNTICA SUBDIVISION
// =============================================================================

var biomes =
  ee.Image(BIOMES_ASSET)
    .rename('biome')
    .toInt16()
    .selfMask();


var brazilStates =
  ee.FeatureCollection(STATES_ASSET);


/*
 * Select exactly RJ, SP, PR, SC and RS by their stable state codes.
 * Using CD_GEOCUF avoids differences in spelling, accents or capitalization.
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
    .rename('south_states');


/*
 * AUTHORITATIVE MATA ATLÂNTICA REFERENCE:
 * only pixels equal to biome code 4 in BIOMES_ASSET are eligible for either
 * subdivision. selfMask() removes every other biome from the mask domain.
 */
var mataAtlanticaReferenceMask =
  biomes
    .eq(MATA_ATLANTICA_ID)
    .selfMask()
    .rename('mata_atlantica_reference');


/*
 * Sul = original Mata Atlântica reference intersected with
 * RS, SC, PR, SP and RJ.
 */
var mataAtlanticaSouthMask =
  mataAtlanticaReferenceMask
    .updateMask(
      southStatesMask.eq(1)
    )
    .selfMask()
    .rename('mata_atlantica_sul');


/*
 * Norte = original Mata Atlântica reference outside those five states.
 * Because the starting image is mataAtlanticaReferenceMask, this operation
 * cannot include Caatinga, Cerrado or any other biome.
 */
var mataAtlanticaNorthMask =
  mataAtlanticaReferenceMask
    .updateMask(
      southStatesMask.eq(0)
    )
    .selfMask()
    .rename('mata_atlantica_norte');


/*
 * Recombine both subdivisions for validation against the original reference.
 */
var mataAtlanticaRecombinedMask =
  mataAtlanticaSouthMask
    .unmask(0)
    .or(
      mataAtlanticaNorthMask.unmask(0)
    )
    .selfMask()
    .rename('mata_atlantica_recombined');


/*
 * This mismatch layer should be empty. Any visible pixel indicates either a
 * gap or an overlap relative to the original Mata Atlântica reference.
 */
var mataAtlanticaSplitMismatch =
  mataAtlanticaReferenceMask
    .unmask(0)
    .neq(
      mataAtlanticaRecombinedMask.unmask(0)
    )
    .selfMask()
    .rename('mata_atlantica_split_mismatch');


/*
 * Adjusted biome raster used for checking and visualization.
 * Only original code 4 is replaced by 41 (Sul) or 42 (Norte).
 */
var adjustedBiomes =
  biomes
    .where(
      mataAtlanticaSouthMask.unmask(0).eq(1),
      41
    )
    .where(
      mataAtlanticaNorthMask.unmask(0).eq(1),
      42
    )
    .rename('adjusted_biome')
    .toInt16();


function getBiomeRegionMask(biomeRegion) {

  if (biomeRegion.key === 'mata_atlantica_sul') {
    return mataAtlanticaSouthMask;
  }

  if (biomeRegion.key === 'mata_atlantica_norte') {
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
  southStates.aggregate_array('NM_ESTADO')
);


print(
  'Selected southern states — CD_GEOCUF:',
  southStates.aggregate_array('CD_GEOCUF')
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
  'Mata Atlântica reference mask:',
  mataAtlanticaReferenceMask
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
// 9. LOAD PRECIPITATION ANOMALY
// =============================================================================

function loadAnomaly(product, period) {

  var assetId =
    PRECIP_DIR +
    '/' +
    product.assetPrefix +
    period;

  return ee.Image(assetId)
    // Event assets use anomalia_mm; mean assets use media_anomalias_mm.
    // Both contain one relevant band, so select it by position.
    .select([0])
    .divide(ANOMALY_BIN_MM)
    .round()
    .multiply(ANOMALY_BIN_MM)
    .rename('precip_anomaly_mm')
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
        assetId,

      anomaly_bin_mm:
        ANOMALY_BIN_MM
    });
}


// =============================================================================
// 10. PIXEL AREA
// =============================================================================

var pixelAreaHa =
  ee.Image.pixelArea()
    .divide(10000)
    .rename('area_ha');


// =============================================================================
// 11. INTERNAL CLASS + ANOMALY ENCODING
// =============================================================================

/*
 * Biome is not encoded because each export task processes one biome only.
 *
 *   group_id = class × GROUP_STRIDE + anomaly + ANOMALY_OFFSET
 *
 * The values are decoded before CSV export. This creates one grouping level
 * instead of nested class -> anomaly groups.
 */
var ANOMALY_OFFSET = 100000;
var GROUP_STRIDE = 200001;


// =============================================================================
// 12. CALCULATE ONE PRODUCT × TRIMESTER × BIOME
// =============================================================================

function calculateProductPeriodBiome(
  product,
  period,
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


  // Product-specific precipitation anomaly.
  var anomaly =
    loadAnomaly(
      product,
      period
    );


  // Selected original or adjusted biome region.
  var biomeMask =
    getBiomeRegionMask(
      biomeRegion
    );


  // Include only pixels valid in classification, anomaly and selected biome.
  var validMask =
    classification
      .mask()
      .and(anomaly.mask())
      .and(biomeMask);


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


  /*
   * Reduction-image bands:
   *
   *   band 0 = area_ha
   *   band 1 = group_id
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
            outputBiomeId,

          biome_name:
            biomeRegion.label,

          biome_region_key:
            biomeRegion.key,

          source_biome_id:
            sourceBiomeId,

          class:
            classId,

          precip_anomaly_mm:
            precipAnomaly,

          anomaly_bin_mm:
            ANOMALY_BIN_MM,

          area_ha:
            groupItem.get('sum')
        }
      );
    }
  );


  return ee.FeatureCollection(rows);
}


// =============================================================================
// 13. EXPORTS
// =============================================================================

/*
 * One CSV task is created for every:
 *
 *   anomaly product × trimester × adjusted biome region
 *
 * Total with all four trimesters enabled:
 *
 *   4 × 4 × 7 = 112 tasks
 *
 * No ANUAL / September-August task is created.
 */
ANOMALY_PRODUCTS.forEach(
  function(product) {

    PERIODS.forEach(
      function(period) {

        BIOME_REGIONS.forEach(
          function(biomeRegion) {

            // Keep the task name compact. Earth Engine task names must use
            // only letters, numbers, hyphens and underscores, with no spaces.
            var outputName =
              OUTPUT_PREFIX +
              '-' +
              product.key +
              '-y' +
              product.classificationYear +
              '-' +
              period +
              '-b' +
              biomeRegion.outputBiomeId +
              '-' +
              biomeRegion.key;


            var areas =
              calculateProductPeriodBiome(
                product,
                period,
                biomeRegion
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
                'biome_name',
                'biome_region_key',
                'source_biome_id',
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
              product.classificationYear,
              '| period:',
              period,
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
  }
);


// =============================================================================
// 14. OPTIONAL SINGLE-TASK TEST
// =============================================================================

/*
 * Recommended: comment out Section 13 and run this single test first.
 *
 * Product indices:
 *
 *   0 = El Niño 1997/98 — LULC 1997
 *   1 = El Niño 2015/16 — LULC 2015
 *   2 = El Niño 2023/24 — LULC 2023
 *   3 = mean of three events — LULC 2025
 */

/*
var testProduct =
  ANOMALY_PRODUCTS[0];


var testBiomeRegion =
  BIOME_REGIONS[3]; // Mata Atlântica (Sul)


var test =
  calculateProductPeriodBiome(
    testProduct,
    'SON',
    testBiomeRegion
  );


print(
  'Test:',
  testProduct.eventLabel,
  '| event pair:',
  testProduct.eventYearPair,
  '| LULC:',
  testProduct.classificationYear,
  '| period: SON',
  '| biome:',
  testBiomeRegion.label,
  test.limit(20)
);
*/


// =============================================================================
// 15. VISUALIZATION PARAMETERS
// =============================================================================

var VIS_ANOMALY = {
  min:
    -500,

  max:
    500,

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


// =============================================================================
// 16. VISUAL CHECK
// =============================================================================

Map.setCenter(
  -54,
  -14,
  4
);


Map.addLayer(
  loadAnomaly(
    ANOMALY_PRODUCTS[0],
    'SON'
  ),
  VIS_ANOMALY,
  'MapBiomas Atmosfera — El Niño 1997/98 — SON',
  false
);


Map.addLayer(
  loadAnomaly(
    ANOMALY_PRODUCTS[1],
    'SON'
  ),
  VIS_ANOMALY,
  'MapBiomas Atmosfera — El Niño 2015/16 — SON',
  false
);


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
  loadAnomaly(
    ANOMALY_PRODUCTS[3],
    'SON'
  ),
  VIS_ANOMALY,
  'MapBiomas Atmosfera — média dos três eventos — SON',
  false
);


// =============================================================================
// 17. MAPBIOMAS CLASSIFICATION LAYERS
// =============================================================================

CLASSIFICATION_YEARS.forEach(
  function(year) {

    Map.addLayer(
      loadClassification(year),
      {},
      'MapBiomas Collection 11 — ' + year,
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
 * Remap the non-contiguous adjusted codes to 1–7 only for palette display.
 * The analytical raster and CSV outputs retain codes 1, 2, 3, 41, 42, 5 and 6.
 */
var adjustedBiomesForMap =
  adjustedBiomes.remap(
    [1, 2, 3, 41, 42, 5, 6],
    [1, 2, 3, 4, 5, 6, 7]
  )
  .rename('adjusted_biome_visual')
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
    min: 1,
    max: 7,
    palette: ADJUSTED_BIOME_PALETTE
  },
  'Biomas ajustados — Mata Atlântica Sul/Norte',
  true
);


Map.addLayer(
  mataAtlanticaReferenceMask,
  {
    palette: ['00ffff']
  },
  'Referência original — Mata Atlântica (bioma 4)',
  false
);


Map.addLayer(
  mataAtlanticaSplitMismatch,
  {
    palette: ['ff0000']
  },
  'ERRO de subdivisão — deve ficar vazio',
  true
);


Map.addLayer(
  mataAtlanticaSouthMask.selfMask(),
  {
    palette: ['7b3294']
  },
  'Mata Atlântica (Sul) — RJ, SP, PR, SC e RS',
  false
);


Map.addLayer(
  mataAtlanticaNorthMask.selfMask(),
  {
    palette: ['c2a5cf']
  },
  'Mata Atlântica (Norte) — demais estados',
  false
);


Map.addLayer(
  brazilStates.style({
    color: '808080',
    fillColor: '00000000',
    width: 1
  }),
  {},
  'Limites de todos os estados',
  false
);


Map.addLayer(
  southStates.style({
    color: '000000',
    fillColor: '00000000',
    width: 2
  }),
  {},
  'Estados da Mata Atlântica Sul — RJ, SP, PR, SC e RS',
  true
);


var biomeLegend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 12px'
  }
});


biomeLegend.add(
  ui.Label({
    value: 'Biomas ajustados',
    style: {
      fontWeight: 'bold',
      margin: '0 0 6px 0'
    }
  })
);


function addBiomeLegendRow(color, label) {

  var colorBox =
    ui.Label({
      style: {
        backgroundColor: '#' + color,
        padding: '8px',
        margin: '0 6px 4px 0'
      }
    });

  var description =
    ui.Label({
      value: label,
      style: {
        margin: '0 0 4px 0'
      }
    });

  biomeLegend.add(
    ui.Panel({
      widgets: [
        colorBox,
        description
      ],
      layout:
        ui.Panel.Layout.Flow('horizontal')
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


Map.add(biomeLegend);


// =============================================================================
// 19. PRODUCT CONFIGURATION TABLE
// =============================================================================

var productConfiguration =
  ee.FeatureCollection(
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
  'Number of trimesters:',
  PERIODS.length
);


print(
  'Periods:',
  PERIODS
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
  'Number of export tasks with currently enabled periods:',
  ANOMALY_PRODUCTS.length *
  PERIODS.length *
  BIOME_REGIONS.length
);


print(
  'Expected with all four trimesters enabled: 4 × 4 × 7 = 112'
);


print(
  'ANUAL / September-August included:',
  false
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
  'Mata Atlântica Sul — estados:',
  SOUTH_STATE_NAMES
);


print(
  'Mata Atlântica Sul — CD_GEOCUF:',
  SOUTH_STATE_CODES
);


print(
  'Mata Atlântica adjusted codes: 41 = Sul; 42 = Norte'
);


print(
  'Event/LULC associations:'
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
  'Mean of three events → MapBiomas 2025'
);
