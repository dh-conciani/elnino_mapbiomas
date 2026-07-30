/********************************************************************************
 * MAPBIOMAS COLLECTION 11
 *
 * AREA BY:
 *   YEAR
 *   TERRITORY = PRECIP ANOMALY × 100 + BIOME
 *   LAND-COVER CLASS
 *
 * Territory encoding:
 *
 *   territory = (precip_anomaly_mm * 100) + biome
 *
 * Example:
 *
 *   anomaly = -87
 *   biome   = 4
 *
 *   territory = -8700 + 4 = -8696
 *
 * OUTPUT:
 *   4 CSV files:
 *   DJF, MAM, JJA, SON
 *
 * AREA:
 *   hectares
 ********************************************************************************/


// =============================================================================
// 1. YEARS
// =============================================================================

var years = [
    1985, 1986, 1987, 1988, 1989,
    1990, 1991, 1992, 1993, 1994,
    1995, 1996, 1997, 1998, 1999,
    2000, 2001, 2002, 2003, 2004,
    2005, 2006, 2007, 2008, 2009,
    2010, 2011, 2012, 2013, 2014,
    2015, 2016, 2017, 2018, 2019,
    2020, 2021, 2022, 2023, 2024,
    2025
];


// =============================================================================
// 2. MAPBIOMAS COLLECTION 11
// =============================================================================

var mapbiomas = ee.ImageCollection(
    'projects/mapbiomas-brazil/assets/LAND-COVER/COLLECTION-11/INTEGRATION/classification-ft'
)
.filter(
    ee.Filter.eq(
        'version',
        '0-4-13-w3y-5'
    )
)
.mosaic()
.selfMask();


print(
    'MapBiomas Collection 11:',
    mapbiomas
);


// =============================================================================
// 3. PRECIPITATION ANOMALIES
// =============================================================================

var PRECIP_DIR =
    'projects/mapbiomas-brazil/assets/DEGRADATION/COLLECTION-10/ELNINO';


var PERIODS = [
    'DJF',
    'MAM',
    'JJA',
    'SON'
];


var precipAnomalies = {

    DJF: ee.Image(
        PRECIP_DIR + '/precip_anomaly_elnino_DJF'
    )
    .round()
    .toInt16()
    .rename('precip_anomaly_mm'),


    MAM: ee.Image(
        PRECIP_DIR + '/precip_anomaly_elnino_MAM'
    )
    .round()
    .toInt16()
    .rename('precip_anomaly_mm'),


    JJA: ee.Image(
        PRECIP_DIR + '/precip_anomaly_elnino_JJA'
    )
    .round()
    .toInt16()
    .rename('precip_anomaly_mm'),


    SON: ee.Image(
        PRECIP_DIR + '/precip_anomaly_elnino_SON'
    )
    .round()
    .toInt16()
    .rename('precip_anomaly_mm')

};


// =============================================================================
// 4. BIOMES
// =============================================================================

var biomes = ee.Image(
    'projects/mapbiomas-workspace/AUXILIAR/biome_2025_buf5k_30m'
)
.rename('biome')
.toInt16()
.selfMask();


print(
    'Biomes:',
    biomes
);


// =============================================================================
// 5. CREATE TERRITORY
// =============================================================================

/*
 * TERRITORY:
 *
 * precipitation anomaly * 100
 * +
 * biome
 *
 * Examples:
 *
 * anomaly =  120, biome = 3  -> 12003
 * anomaly =   15, biome = 6  ->  1506
 * anomaly =  -87, biome = 4  -> -8696
 *
 * Using Int32 because the combined values can exceed Int16
 * depending on anomaly extremes.
 */

var createTerritory = function(
    precipAnomaly
) {

    return precipAnomaly

        .multiply(100)

        .add(
            biomes
        )

        .rename(
            'territory'
        )

        .toInt32();

};


// Create territories for each trimester.

var territories = {

    DJF:
        createTerritory(
            precipAnomalies.DJF
        ),

    MAM:
        createTerritory(
            precipAnomalies.MAM
        ),

    JJA:
        createTerritory(
            precipAnomalies.JJA
        ),

    SON:
        createTerritory(
            precipAnomalies.SON
        )

};


// =============================================================================
// 6. BRAZIL GEOMETRY
// =============================================================================

var countries = ee.FeatureCollection(
    'FAO/GAUL/2015/level0'
);


var geometry = countries

    .filter(
        ee.Filter.eq(
            'ADM0_NAME',
            'Brazil'
        )
    )

    .geometry();


// =============================================================================
// 7. SETTINGS
// =============================================================================

var scale = 30;


var driveFolder =
    'Collection11';


var outputPrefix =
    'collection11-brazil-precip-anomaly-biome';


// =============================================================================
// 8. PIXEL AREA
// =============================================================================

// hectares

var pixelArea = ee.Image
    .pixelArea()
    .divide(10000)
    .rename('area');


// =============================================================================
// 9. CONVERT GROUPED RESULT TO TABLE
// =============================================================================

var convert2table = function(obj) {

    obj = ee.Dictionary(
        obj
    );


    // -------------------------------------------------------------------------
    // Combined territory value
    // -------------------------------------------------------------------------

    var territory = ee.Number(
        obj.get(
            'territory'
        )
    );


    /*
     * Decode anomaly and biome.
     *
     * Since biome IDs occupy the last two digits:
     *
     * anomaly =
     * floor((territory - 1) / 100)
     *
     * This formulation also works for negative anomalies.
     */

    var precipAnomaly = territory
        .subtract(1)
        .divide(100)
        .floor();


    /*
     * biome =
     * territory - anomaly * 100
     */

    var biome = territory
        .subtract(
            precipAnomaly.multiply(100)
        );


    // -------------------------------------------------------------------------
    // MapBiomas classes inside territory
    // -------------------------------------------------------------------------

    var classesAndAreas = ee.List(
        obj.get(
            'groups'
        )
    );


    var tableRows = classesAndAreas.map(

        function(classAndArea) {

            classAndArea = ee.Dictionary(
                classAndArea
            );


            var classId =
                classAndArea.get(
                    'class'
                );


            var area =
                classAndArea.get(
                    'sum'
                );


            return ee.Feature(null)

                .set(
                    'territory',
                    territory
                )

                .set(
                    'precip_anomaly_mm',
                    precipAnomaly
                )

                .set(
                    'biome',
                    biome
                )

                .set(
                    'class',
                    classId
                )

                .set(
                    'area',
                    area
                );

        }

    );


    return ee.FeatureCollection(
        tableRows
    );

};


// =============================================================================
// 10. CALCULATE AREA
// =============================================================================

var calculateArea = function(
    image,
    territory,
    geometry
) {


    /*
     * Bands:
     *
     * 0 = area
     * 1 = territory
     * 2 = MapBiomas class
     *
     *
     * Nested reducer:
     *
     * TERRITORY
     *     |
     *     +--- CLASS
     *             |
     *             +--- AREA
     */

    var reducer = ee.Reducer
        .sum()

        .group(
            1,
            'class'
        )

        .group(
            1,
            'territory'
        );


    var data = pixelArea

        .addBands(
            territory
        )

        .addBands(
            image
        )

        .reduceRegion({

            reducer:
                reducer,

            geometry:
                geometry,

            scale:
                scale,

            maxPixels:
                1e13,

            tileScale:
                4

        });


    var groupedData = ee.List(
        data.get(
            'groups'
        )
    );


    var areas = groupedData.map(
        convert2table
    );


    return ee.FeatureCollection(
        areas
    )
    .flatten();

};


// =============================================================================
// 11. CALCULATE ONE PERIOD
// =============================================================================

var calculatePeriod = function(
    period
) {


    var territory =
        territories[period];


    var areas = years.map(

        function(year) {


            // -----------------------------------------------------------------
            // Land-cover class
            // -----------------------------------------------------------------

            var image = mapbiomas.select(
                'classification_' + year
            );


            // -----------------------------------------------------------------
            // Areas
            // -----------------------------------------------------------------

            var yearAreas = calculateArea(
                image,
                territory,
                geometry
            );


            // -----------------------------------------------------------------
            // Metadata
            // -----------------------------------------------------------------

            yearAreas = yearAreas.map(

                function(feature) {

                    return feature

                        .set(
                            'year',
                            year
                        )

                        .set(
                            'period',
                            period
                        );

                }

            );


            return yearAreas;

        }

    );


    return ee.FeatureCollection(
        areas
    )
    .flatten();

};


// =============================================================================
// 12. EXPORT FOUR PERIODS
// =============================================================================

PERIODS.forEach(

    function(period) {


        var areas = calculatePeriod(
            period
        );


        var outputName =
            outputPrefix +
            '-' +
            period;


        print(
            'Export configured:',
            outputName
        );


        Export.table.toDrive({

            collection:
                areas,

            description:
                outputName,

            folder:
                driveFolder,

            fileNamePrefix:
                outputName,

            fileFormat:
                'CSV',

            selectors: [

                'year',

                'period',

                'territory',

                'precip_anomaly_mm',

                'biome',

                'class',

                'area'

            ]

        });

    }

);


// =============================================================================
// 13. VISUAL CHECK — ROUNDED PRECIPITATION ANOMALIES
// =============================================================================

var VIS_ANOMALY = {

    min: -300,
    max: 300,

    palette: [
        '8b0000',
        'b2182b',
        'd6604d',
        'f4a582',
        'fddbc7',
        'fff7bc',
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


// Rounded anomaly images.
// These are the same images used to construct territory.

Map.addLayer(
    precipAnomalies.DJF,
    VIS_ANOMALY,
    '01 | DJF — rounded anomaly (mm)',
    true
);


Map.addLayer(
    precipAnomalies.MAM,
    VIS_ANOMALY,
    '02 | MAM — rounded anomaly (mm)',
    false
);


Map.addLayer(
    precipAnomalies.JJA,
    VIS_ANOMALY,
    '03 | JJA — rounded anomaly (mm)',
    false
);


Map.addLayer(
    precipAnomalies.SON,
    VIS_ANOMALY,
    '04 | SON — rounded anomaly (mm)',
    false
);


// =============================================================================
// 14. BIOMES — OPTIONAL OVERLAY
// =============================================================================

/*
 * Draw biome boundaries for inspection.
 * This does not modify the anomaly rasters.
 */

var biomeBoundaries = biomes
    .neq(
        biomes.focal_mode({
            radius: 1,
            units: 'pixels'
        })
    )
    .selfMask();


Map.addLayer(
    biomeBoundaries,
    {
        palette: ['333333']
    },
    'Biome boundaries',
    true
);


// =============================================================================
// 15. LEGEND
// =============================================================================

function addLegend() {

    var panel = ui.Panel({

        style: {
            position: 'bottom-left',
            padding: '8px 12px',
            backgroundColor: 'ffffff'
        }

    });


    panel.add(

        ui.Label({

            value:
                'El Niño precipitation anomaly',

            style: {
                fontWeight: 'bold',
                fontSize: '14px',
                margin: '0 0 3px 0'
            }

        })

    );


    panel.add(

        ui.Label({

            value:
                'Rounded to integer mm',

            style: {
                fontSize: '11px',
                color: '555555',
                margin: '0 0 8px 0'
            }

        })

    );


    var colors = [
        '8b0000',
        'd6604d',
        'f4a582',
        'fddbc7',
        'ffffff',
        'd1e5f0',
        '4393c3',
        '053061'
    ];


    var labels = [
        '≤ −300 mm',
        '−300 to −200 mm',
        '−200 to −100 mm',
        '−100 to 0 mm',
        '≈ 0 mm',
        '0 to 100 mm',
        '100 to 200 mm',
        '≥ 300 mm'
    ];


    for (
        var i = 0;
        i < colors.length;
        i++
    ) {

        var colorBox = ui.Label({

            style: {
                backgroundColor:
                    '#' + colors[i],

                padding: '8px',

                margin:
                    '0 6px 3px 0',

                border:
                    '1px solid #999999'
            }

        });


        var text = ui.Label({

            value:
                labels[i],

            style: {
                fontSize: '11px',
                margin: '0 0 3px 0'
            }

        });


        panel.add(

            ui.Panel({

                widgets: [
                    colorBox,
                    text
                ],

                layout:
                    ui.Panel.Layout.Flow(
                        'horizontal'
                    )

            })

        );

    }


    panel.add(

        ui.Label({

            value:
                'Climatology: 1991–2020',

            style: {
                fontSize: '10px',
                color: '666666',
                margin: '7px 0 0 0'
            }

        })

    );


    Map.add(
        panel
    );

}


addLegend();
