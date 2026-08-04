# ==============================================================================
# MAPBIOMAS × ANOMALIAS DE PRECIPITAÇÃO — V7
# ANÁLISE DESCRITIVA E COMPARATIVA POR EVENTO DE EL NIÑO, BIOMA, BRASIL E CLASSE LEVEL_1
#
# Estrutura esperada dos CSVs:
#
# classification_year,event_year_pair,anomaly_product,event_label,period,
# biome,class,precip_anomaly_mm,anomaly_bin_mm,area_ha
#
# Mudanças principais:
# - lê os CSVs de ./table_v2;
# - salva os resultados em ./output_v2;
# - usa event_year_pair/anomaly_product;
# - agrega o Brasil separadamente para cada evento;
# - cria uma linha de painéis para cada evento de El Niño;
# - mantém quatro colunas sazonais: SON, DJF, MAM e JJA;
# - agrega e exibe as classes no nível Level_1;
# - usa cores fixas para as cinco classes Level_1;
# - exporta tabelas, PNG e PDF.
# - remove o produto Média dos 4 eventos;
# - adiciona trajetórias e diferenças entre eventos para a mesma classe/período.
# ==============================================================================


# ==============================================================================
# 1. PACOTES
# ==============================================================================

required_packages <- c(
  "dplyr",
  "readr",
  "purrr",
  "readxl",
  "ggplot2",
  "scales",
  "stringr",
  "patchwork",
  "tidyr"
)

missing_packages <- required_packages[
  !vapply(
    required_packages,
    requireNamespace,
    quietly = TRUE,
    FUN.VALUE = logical(1)
  )
]

if (length(missing_packages) > 0) {
  stop(
    paste0(
      "Os seguintes pacotes precisam ser instalados:\n",
      paste(missing_packages, collapse = ", "),
      "\n\nExecute:\ninstall.packages(c(",
      paste0('"', missing_packages, '"', collapse = ", "),
      "))"
    )
  )
}


# ==============================================================================
# 2. CONFIGURAÇÕES
# ==============================================================================

options(scipen = 999)

data_folder <- "./table_v2"
dictionary_file <- "./dict/legend_col11.xlsx"
output_folder <- "./output_v2"

label_threshold <- 15

segment_label_size <- 4.2
class_name_size <- 15
class_wrap_width <- 26

class_panel_width <- 1.05
main_panel_width <- 5.95

event_product_levels <- c(
  "elnino_1982_83",
  "elnino_1997_98",
  "elnino_2015_16",
  "elnino_2023_24"
)

event_year_pair_levels <- c(
  "1982/83",
  "1997/98",
  "2015/16",
  "2023/24"
)

event_mid_year_lookup <- c(
  "elnino_1982_83" = 1982.5,
  "elnino_1997_98" = 1997.5,
  "elnino_2015_16" = 2015.5,
  "elnino_2023_24" = 2023.5
)

transition_levels <- c(
  "1982/83 → 1997/98",
  "1997/98 → 2015/16",
  "2015/16 → 2023/24"
)

# Ordem e cores fixas das classes Level_1.
level1_levels <- c(
  "1. Floresta",
  "2. Vegetação Herbácea e Arbustiva",
  "3. Agropecuária",
  "4. Área não vegetada",
  "5. Corpo D'água"
)

level1_colors <- c(
  "1. Floresta" = "#1F8D49",
  "2. Vegetação Herbácea e Arbustiva" = "#D6BC74",
  "3. Agropecuária" = "#FFEFC3",
  "4. Área não vegetada" = "#D4271E",
  "5. Corpo D'água" = "#2532E4"
)

dir.create(
  output_folder,
  recursive = TRUE,
  showWarnings = FALSE
)


# ==============================================================================
# 3. FUNÇÕES AUXILIARES
# ==============================================================================

weighted_mean_safe <- function(values, weights) {
  valid <- is.finite(values) &
    is.finite(weights) &
    weights > 0
  
  values <- values[valid]
  weights <- weights[valid]
  
  if (length(values) == 0 || sum(weights) <= 0) {
    return(NA_real_)
  }
  
  sum(values * weights) / sum(weights)
}


format_mha <- function(area_ha) {
  vapply(
    area_ha,
    function(value_ha) {
      if (is.na(value_ha) || !is.finite(value_ha)) {
        return(NA_character_)
      }
      
      value_mha <- value_ha / 1e6
      
      accuracy <- if (value_mha >= 10) {
        1
      } else if (value_mha >= 1) {
        0.1
      } else if (value_mha >= 0.1) {
        0.01
      } else {
        0.001
      }
      
      paste0(
        scales::number(
          value_mha,
          accuracy = accuracy,
          big.mark = ".",
          decimal.mark = ",",
          trim = TRUE
        ),
        " Mha"
      )
    },
    FUN.VALUE = character(1)
  )
}


slugify <- function(text) {
  clean_text <- iconv(
    text,
    from = "",
    to = "ASCII//TRANSLIT"
  )
  
  clean_text <- tolower(clean_text)
  clean_text <- gsub("[^a-z0-9]+", "_", clean_text)
  clean_text <- gsub("^_+|_+$", "", clean_text)
  clean_text
}


# ------------------------------------------------------------------------------
# Inclinação linear descritiva em mm por década.
# Com apenas quatro eventos, este valor não deve ser interpretado como uma
# tendência climática inferencial.
# ------------------------------------------------------------------------------

safe_slope_per_decade <- function(x, y) {
  valid <- is.finite(x) & is.finite(y)
  x <- x[valid]
  y <- y[valid]
  
  if (length(x) < 2 || length(unique(x)) < 2) {
    return(NA_real_)
  }
  
  unname(stats::coef(stats::lm(y ~ x))[2]) * 10
}


# ------------------------------------------------------------------------------
# R² da tendência linear descritiva.
# ------------------------------------------------------------------------------

safe_linear_r_squared <- function(x, y) {
  valid <- is.finite(x) & is.finite(y)
  x <- x[valid]
  y <- y[valid]
  
  if (length(x) < 3 || length(unique(x)) < 2) {
    return(NA_real_)
  }
  
  summary(stats::lm(y ~ x))$r.squared
}


# ------------------------------------------------------------------------------
# Correlação ordinal de Spearman entre a ordem temporal e a anomalia.
# ------------------------------------------------------------------------------

safe_spearman <- function(x, y) {
  valid <- is.finite(x) & is.finite(y)
  x <- x[valid]
  y <- y[valid]
  
  if (length(x) < 3 || length(unique(y)) < 2) {
    return(NA_real_)
  }
  
  suppressWarnings(
    stats::cor(
      x,
      y,
      method = "spearman"
    )
  )
}


# ------------------------------------------------------------------------------
# Classificar a trajetória observada entre os quatro eventos.
#
# Esta classificação é descritiva:
# - "progressivamente mais úmida": todos os passos aumentam;
# - "progressivamente mais seca": todos os passos diminuem;
# - "mudança líquida para mais úmida/seca": direção entre primeiro e último;
# - "oscilante": mudanças de sinal e pouca alteração líquida.
# ------------------------------------------------------------------------------

classify_event_trajectory <- function(
    values,
    net_change_threshold_mm = 20
) {
  values <- values[is.finite(values)]
  
  if (length(values) < 2) {
    return("Dados insuficientes")
  }
  
  changes <- diff(values)
  total_change <- values[length(values)] - values[1]
  
  if (all(changes > 0)) {
    return("Progressivamente mais úmida")
  }
  
  if (all(changes < 0)) {
    return("Progressivamente mais seca")
  }
  
  if (abs(total_change) < net_change_threshold_mm) {
    return("Oscilante, com pouca mudança líquida")
  }
  
  if (total_change > 0) {
    return("Oscilante, com mudança líquida para mais úmida")
  }
  
  "Oscilante, com mudança líquida para mais seca"
}


# ==============================================================================
# 4. VERIFICAR CAMINHOS
# ==============================================================================

if (!dir.exists(data_folder)) {
  stop(
    "Pasta de dados não encontrada: ",
    normalizePath(
      data_folder,
      winslash = "/",
      mustWork = FALSE
    )
  )
}

if (!file.exists(dictionary_file)) {
  stop(
    "Dicionário MapBiomas não encontrado: ",
    normalizePath(
      dictionary_file,
      winslash = "/",
      mustWork = FALSE
    )
  )
}


# ==============================================================================
# 5. LER TODOS OS CSVs
# ==============================================================================

csv_files <- list.files(
  path = data_folder,
  pattern = "\\.csv$",
  full.names = TRUE,
  ignore.case = TRUE,
  recursive = FALSE
)

if (length(csv_files) == 0) {
  stop(
    "Nenhum arquivo CSV foi encontrado em: ",
    normalizePath(
      data_folder,
      winslash = "/",
      mustWork = FALSE
    )
  )
}

names(csv_files) <- basename(csv_files)

message(length(csv_files), " arquivo(s) CSV encontrado(s).")

combined_data <- purrr::map_dfr(
  .x = csv_files,
  .f = function(file_path) {
    readr::read_csv(
      file = file_path,
      show_col_types = FALSE,
      progress = FALSE
    )
  },
  .id = "source_file"
)

message(
  format(nrow(combined_data), big.mark = "."),
  " linhas lidas antes da validação."
)


# ==============================================================================
# 6. VALIDAR E PADRONIZAR OS DADOS
# ==============================================================================

required_columns <- c(
  "classification_year",
  "event_year_pair",
  "anomaly_product",
  "event_label",
  "period",
  "biome",
  "class",
  "precip_anomaly_mm",
  "anomaly_bin_mm",
  "area_ha"
)

missing_columns <- setdiff(
  required_columns,
  names(combined_data)
)

if (length(missing_columns) > 0) {
  stop(
    paste0(
      "As seguintes colunas obrigatórias não foram encontradas:\n",
      paste(missing_columns, collapse = ", ")
    )
  )
}

combined_data <- combined_data |>
  dplyr::mutate(
    classification_year = suppressWarnings(
      as.integer(classification_year)
    ),
    event_year_pair = trimws(as.character(event_year_pair)),
    anomaly_product = trimws(as.character(anomaly_product)),
    event_label = trimws(as.character(event_label)),
    period = toupper(trimws(as.character(period))),
    biome_code = trimws(as.character(biome)),
    class = suppressWarnings(as.integer(class)),
    precip_anomaly_mm = suppressWarnings(
      as.numeric(precip_anomaly_mm)
    ),
    anomaly_bin_mm = suppressWarnings(
      as.numeric(anomaly_bin_mm)
    ),
    area_ha = suppressWarnings(as.numeric(area_ha))
  )

if (any(combined_data$area_ha < 0, na.rm = TRUE)) {
  stop("Foram encontrados valores negativos em area_ha.")
}

invalid_rows <- combined_data |>
  dplyr::filter(
    is.na(classification_year) |
      is.na(event_year_pair) |
      event_year_pair == "" |
      is.na(anomaly_product) |
      anomaly_product == "" |
      is.na(event_label) |
      event_label == "" |
      is.na(period) |
      is.na(biome_code) |
      is.na(class) |
      is.na(precip_anomaly_mm) |
      is.na(anomaly_bin_mm) |
      is.na(area_ha) |
      area_ha <= 0
  )

if (nrow(invalid_rows) > 0) {
  warning(
    nrow(invalid_rows),
    " linha(s) com valores ausentes ou area_ha <= 0 foram removidas."
  )
}

combined_data <- combined_data |>
  dplyr::filter(
    !is.na(classification_year),
    !is.na(event_year_pair),
    event_year_pair != "",
    !is.na(anomaly_product),
    anomaly_product != "",
    !is.na(event_label),
    event_label != "",
    !is.na(period),
    !is.na(biome_code),
    !is.na(class),
    !is.na(precip_anomaly_mm),
    !is.na(anomaly_bin_mm),
    !is.na(area_ha),
    area_ha > 0
  ) |>
  dplyr::mutate(
    biome = dplyr::recode(
      biome_code,
      "1" = "Amazônia",
      "2" = "Caatinga",
      "3" = "Cerrado",
      "4" = "Mata Atlântica",
      "5" = "Pampa",
      "6" = "Pantanal",
      .default = biome_code
    )
  )


# ==============================================================================
# 6.1. MANTER SOMENTE OS QUATRO EVENTOS DE EL NIÑO
# ==============================================================================

number_mean_rows_removed <- sum(
  combined_data$anomaly_product == "mean_4_events",
  na.rm = TRUE
)

combined_data <- combined_data |>
  dplyr::filter(
    anomaly_product %in% event_product_levels
  )

if (number_mean_rows_removed > 0) {
  message(
    format(number_mean_rows_removed, big.mark = "."),
    " linha(s) do produto 'Média dos 4 eventos' foram removidas."
  )
}

missing_expected_events <- setdiff(
  event_product_levels,
  unique(combined_data$anomaly_product)
)

if (length(missing_expected_events) > 0) {
  warning(
    "Evento(s) esperado(s) não encontrado(s): ",
    paste(missing_expected_events, collapse = ", ")
  )
}


# ==============================================================================
# 7. CONFIGURAR E ORDENAR OS EVENTOS
# ==============================================================================

event_lookup <- combined_data |>
  dplyr::distinct(
    anomaly_product,
    event_year_pair,
    event_label,
    classification_year
  ) |>
  dplyr::mutate(
    event_order = match(
      anomaly_product,
      event_product_levels
    ),
    event_order = dplyr::if_else(
      is.na(event_order),
      length(event_product_levels) + dplyr::row_number(),
      event_order
    ),
    event_mid_year = unname(
      event_mid_year_lookup[anomaly_product]
    ),
    event_axis_label = factor(
      event_year_pair,
      levels = event_year_pair_levels,
      ordered = TRUE
    ),
    event_panel_label = paste0(
      "El Niño ",
      event_year_pair,
      "\nLULC ",
      classification_year
    )
  ) |>
  dplyr::arrange(
    event_order,
    classification_year,
    event_year_pair
  )

event_panel_levels <- event_lookup$event_panel_label

combined_data <- combined_data |>
  dplyr::left_join(
    event_lookup |>
      dplyr::select(
        anomaly_product,
        event_year_pair,
        event_label,
        classification_year,
        event_order,
        event_mid_year,
        event_axis_label,
        event_panel_label
      ),
    by = c(
      "anomaly_product",
      "event_year_pair",
      "event_label",
      "classification_year"
    )
  ) |>
  dplyr::mutate(
    event_panel_label = factor(
      event_panel_label,
      levels = event_panel_levels,
      ordered = TRUE
    )
  )


# ==============================================================================
# 8. LER E PREPARAR O DICIONÁRIO MAPBIOMAS
# ==============================================================================

lulc_raw <- readxl::read_xlsx(dictionary_file)

required_dictionary_columns <- c(
  "NEW ID",
  "Level_1"
)

missing_dictionary_columns <- setdiff(
  required_dictionary_columns,
  names(lulc_raw)
)

if (length(missing_dictionary_columns) > 0) {
  stop(
    paste0(
      "As seguintes colunas não foram encontradas no dicionário:\n",
      paste(missing_dictionary_columns, collapse = ", ")
    )
  )
}

lulc <- lulc_raw |>
  dplyr::transmute(
    class = suppressWarnings(as.integer(`NEW ID`)),
    Level_1 = trimws(as.character(Level_1))
  ) |>
  dplyr::filter(!is.na(class)) |>
  dplyr::distinct(class, .keep_all = TRUE)

combined_data <- combined_data |>
  dplyr::left_join(
    lulc,
    by = "class"
  )

missing_level1 <- combined_data |>
  dplyr::filter(is.na(Level_1) | Level_1 == "") |>
  dplyr::distinct(class)

if (nrow(missing_level1) > 0) {
  warning(
    nrow(missing_level1),
    " classe(s) não possuem Level_1 no dicionário e serão removidas."
  )
}

unexpected_level1 <- combined_data |>
  dplyr::filter(
    !is.na(Level_1),
    Level_1 != "",
    !Level_1 %in% level1_levels
  ) |>
  dplyr::distinct(Level_1) |>
  dplyr::pull(Level_1)

if (length(unexpected_level1) > 0) {
  warning(
    "Level_1 inesperado(s), removidos da análise: ",
    paste(unexpected_level1, collapse = ", ")
  )
}

combined_data <- combined_data |>
  dplyr::filter(
    !is.na(Level_1),
    Level_1 %in% level1_levels
  ) |>
  dplyr::mutate(
    Level_1 = factor(
      Level_1,
      levels = level1_levels,
      ordered = TRUE
    ),
    level1_color = unname(
      level1_colors[as.character(Level_1)]
    )
  )


# ==============================================================================
# 9. ORDENAR OS PERÍODOS
# ==============================================================================

period_levels <- c(
  "SON",
  "DJF",
  "MAM",
  "JJA"
)

period_display_labels <- c(
  "SON" = "Set–Out–Nov",
  "DJF" = "Dez–Jan–Fev",
  "MAM" = "Mar–Abr–Mai",
  "JJA" = "Jun–Jul–Ago"
)

combined_data <- combined_data |>
  dplyr::filter(period %in% period_levels) |>
  dplyr::mutate(
    period = factor(
      period,
      levels = period_levels,
      ordered = TRUE
    )
  )


# ==============================================================================
# 10. AGREGAR AS CLASSES MAPBIOMAS PARA LEVEL_1
# ==============================================================================

# Esta agregação soma todas as classes detalhadas pertencentes à mesma classe
# Level_1, preservando evento, período, bioma e faixa de anomalia.
combined_level1 <- combined_data |>
  dplyr::group_by(
    source_file,
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    event_order,
    event_mid_year,
    event_axis_label,
    event_panel_label,
    period,
    biome_code,
    biome,
    Level_1,
    level1_color,
    precip_anomaly_mm,
    anomaly_bin_mm
  ) |>
  dplyr::summarise(
    area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  ) |>
  dplyr::mutate(
    Level_1 = factor(
      as.character(Level_1),
      levels = level1_levels,
      ordered = TRUE
    )
  )


# ==============================================================================
# 11. CRIAR DADOS DOS BIOMAS E AGREGAR O BRASIL POR EVENTO
# ==============================================================================

analysis_biomes <- combined_level1 |>
  dplyr::mutate(
    region = biome,
    region_level = "Bioma"
  )

analysis_brazil <- combined_level1 |>
  dplyr::group_by(
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    event_order,
    event_mid_year,
    event_axis_label,
    event_panel_label,
    period,
    Level_1,
    level1_color,
    precip_anomaly_mm,
    anomaly_bin_mm
  ) |>
  dplyr::summarise(
    area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  ) |>
  dplyr::mutate(
    source_file = "AGREGACAO_TODOS_BIOMAS",
    biome_code = NA_character_,
    biome = "Todos os biomas",
    region = "Brasil",
    region_level = "País"
  )

analysis_data <- dplyr::bind_rows(
  analysis_biomes,
  analysis_brazil
) |>
  dplyr::mutate(
    event_panel_label = factor(
      as.character(event_panel_label),
      levels = event_panel_levels,
      ordered = TRUE
    ),
    event_axis_label = factor(
      as.character(event_axis_label),
      levels = event_year_pair_levels,
      ordered = TRUE
    ),
    period = factor(
      as.character(period),
      levels = period_levels,
      ordered = TRUE
    ),
    Level_1 = factor(
      as.character(Level_1),
      levels = level1_levels,
      ordered = TRUE
    )
  ) |>
  dplyr::select(
    source_file,
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    event_order,
    event_mid_year,
    event_axis_label,
    event_panel_label,
    period,
    region,
    region_level,
    biome_code,
    biome,
    Level_1,
    level1_color,
    precip_anomaly_mm,
    anomaly_bin_mm,
    area_ha
  ) |>
  dplyr::arrange(
    region,
    event_order,
    period,
    Level_1,
    precip_anomaly_mm
  )


# ==============================================================================
# 12. VERIFICAR A AGREGAÇÃO NACIONAL
# ==============================================================================

expected_brazil_area <- combined_level1 |>
  dplyr::group_by(
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    period,
    Level_1
  ) |>
  dplyr::summarise(
    expected_area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  )

observed_brazil_area <- analysis_brazil |>
  dplyr::group_by(
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    period,
    Level_1
  ) |>
  dplyr::summarise(
    observed_area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  )

brazil_aggregation_check <- expected_brazil_area |>
  dplyr::left_join(
    observed_brazil_area,
    by = c(
      "classification_year",
      "event_year_pair",
      "anomaly_product",
      "event_label",
      "period",
      "Level_1"
    )
  ) |>
  dplyr::mutate(
    difference_ha = observed_area_ha - expected_area_ha,
    check_passed = abs(difference_ha) < 0.001
  )

failed_brazil_checks <- brazil_aggregation_check |>
  dplyr::filter(!check_passed)

if (nrow(failed_brazil_checks) > 0) {
  warning(
    nrow(failed_brazil_checks),
    " verificação(ões) da agregação do Brasil falharam."
  )
} else {
  message("Verificação da agregação do Brasil aprovada.")
}


# ==============================================================================
# 13. CLASSIFICAR AS FAIXAS DE ANOMALIA
# ==============================================================================

anomaly_band_levels <- c(
  "≤ −300 mm",
  "−300 a −200 mm",
  "−200 a −100 mm",
  "−100 a 0 mm",
  "0 mm",
  "0 a 100 mm",
  "100 a 200 mm",
  "200 a 300 mm",
  "≥ 300 mm"
)

analysis_data <- analysis_data |>
  dplyr::mutate(
    anomaly_band = dplyr::case_when(
      precip_anomaly_mm <= -300 ~ "≤ −300 mm",
      precip_anomaly_mm <= -200 ~ "−300 a −200 mm",
      precip_anomaly_mm <= -100 ~ "−200 a −100 mm",
      precip_anomaly_mm < 0 ~ "−100 a 0 mm",
      precip_anomaly_mm == 0 ~ "0 mm",
      precip_anomaly_mm < 100 ~ "0 a 100 mm",
      precip_anomaly_mm < 200 ~ "100 a 200 mm",
      precip_anomaly_mm < 300 ~ "200 a 300 mm",
      TRUE ~ "≥ 300 mm"
    ),
    anomaly_band = factor(
      anomaly_band,
      levels = anomaly_band_levels,
      ordered = TRUE
    )
  )

anomaly_colors <- c(
  "≤ −300 mm"       = "#8B0000",
  "−300 a −200 mm"  = "#B2182B",
  "−200 a −100 mm"  = "#D6604D",
  "−100 a 0 mm"     = "#F4A582",
  "0 mm"            = "#F7F7F7",
  "0 a 100 mm"      = "#D1E5F0",
  "100 a 200 mm"    = "#92C5DE",
  "200 a 300 mm"    = "#4393C3",
  "≥ 300 mm"        = "#053061"
)

anomaly_legend_order <- c(
  "≥ 300 mm",
  "200 a 300 mm",
  "100 a 200 mm",
  "0 a 100 mm",
  "0 mm",
  "−100 a 0 mm",
  "−200 a −100 mm",
  "−300 a −200 mm",
  "≤ −300 mm"
)


# ==============================================================================
# 14. CALCULAR O RESUMO PONDERADO POR LEVEL_1
# ==============================================================================

summary_by_level1 <- analysis_data |>
  dplyr::group_by(
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    event_order,
    event_mid_year,
    event_axis_label,
    event_panel_label,
    period,
    region,
    region_level,
    Level_1,
    level1_color
  ) |>
  dplyr::summarise(
    total_area_ha = sum(area_ha, na.rm = TRUE),
    
    mean_anomaly_mm = weighted_mean_safe(
      values = precip_anomaly_mm,
      weights = area_ha
    ),
    
    deficit_area_ha = sum(
      area_ha[precip_anomaly_mm < 0],
      na.rm = TRUE
    ),
    
    zero_anomaly_area_ha = sum(
      area_ha[precip_anomaly_mm == 0],
      na.rm = TRUE
    ),
    
    excess_area_ha = sum(
      area_ha[precip_anomaly_mm > 0],
      na.rm = TRUE
    ),
    
    strong_deficit_area_ha = sum(
      area_ha[precip_anomaly_mm <= -100],
      na.rm = TRUE
    ),
    
    strong_excess_area_ha = sum(
      area_ha[precip_anomaly_mm >= 100],
      na.rm = TRUE
    ),
    
    extreme_deficit_area_ha = sum(
      area_ha[precip_anomaly_mm <= -300],
      na.rm = TRUE
    ),
    
    extreme_excess_area_ha = sum(
      area_ha[precip_anomaly_mm >= 300],
      na.rm = TRUE
    ),
    
    .groups = "drop"
  ) |>
  dplyr::mutate(
    deficit_pct = 100 * deficit_area_ha / total_area_ha,
    zero_anomaly_pct = 100 * zero_anomaly_area_ha / total_area_ha,
    excess_pct = 100 * excess_area_ha / total_area_ha,
    strong_deficit_pct = 100 * strong_deficit_area_ha / total_area_ha,
    strong_excess_pct = 100 * strong_excess_area_ha / total_area_ha,
    extreme_deficit_pct = 100 * extreme_deficit_area_ha / total_area_ha,
    extreme_excess_pct = 100 * extreme_excess_area_ha / total_area_ha,
    dominant_condition = dplyr::case_when(
      deficit_pct >= 60 ~ "Predomínio de déficit",
      excess_pct >= 60 ~ "Predomínio de excesso",
      TRUE ~ "Condição mista"
    )
  ) |>
  dplyr::arrange(
    region,
    event_order,
    period,
    Level_1
  )


# ==============================================================================
# 15. CALCULAR A DISTRIBUIÇÃO POR FAIXA E LEVEL_1
# ==============================================================================

anomaly_distribution <- analysis_data |>
  dplyr::group_by(
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    event_order,
    event_mid_year,
    event_axis_label,
    event_panel_label,
    period,
    region,
    region_level,
    Level_1,
    level1_color,
    anomaly_band
  ) |>
  dplyr::summarise(
    area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  ) |>
  dplyr::group_by(
    anomaly_product,
    classification_year,
    event_year_pair,
    period,
    region,
    region_level,
    Level_1
  ) |>
  dplyr::mutate(
    area_pct = 100 * area_ha / sum(area_ha, na.rm = TRUE)
  ) |>
  dplyr::ungroup() |>
  dplyr::arrange(
    region,
    event_order,
    period,
    Level_1,
    anomaly_band
  )

percentage_check <- anomaly_distribution |>
  dplyr::group_by(
    anomaly_product,
    classification_year,
    event_year_pair,
    period,
    region,
    Level_1
  ) |>
  dplyr::summarise(
    percentage_sum = sum(area_pct, na.rm = TRUE),
    .groups = "drop"
  ) |>
  dplyr::mutate(
    check_passed = abs(percentage_sum - 100) < 0.001
  )

incorrect_percentages <- percentage_check |>
  dplyr::filter(!check_passed)

if (nrow(incorrect_percentages) > 0) {
  warning(
    nrow(incorrect_percentages),
    " combinação(ões) não somam 100%."
  )
} else {
  message("Todas as barras somam 100%.")
}


# ==============================================================================
# 15.1. ANÁLISE COMPARATIVA ENTRE EVENTOS
# ==============================================================================

# A unidade de comparação é:
#
#   mesma região
#   × mesma classe Level_1
#   × mesmo trimestre
#   × diferentes eventos de El Niño
#
# As métricas são descritivas. Como cada evento usa um ano LULC diferente,
# a comparação combina:
#
#   1. diferenças climáticas entre os eventos;
#   2. possíveis mudanças na extensão e composição espacial da classe Level_1.
#
# Portanto, "trajetória" não significa automaticamente tendência climática.

event_trajectory_data <- summary_by_level1 |>
  dplyr::mutate(
    event_axis_label = factor(
      as.character(event_axis_label),
      levels = event_year_pair_levels,
      ordered = TRUE
    ),
    event_mid_year = as.numeric(event_mid_year)
  ) |>
  dplyr::arrange(
    region,
    period,
    Level_1,
    event_order
  )


# ------------------------------------------------------------------------------
# Mudanças entre eventos consecutivos.
# ------------------------------------------------------------------------------

event_pairwise_changes <- event_trajectory_data |>
  dplyr::group_by(
    region,
    region_level,
    period,
    Level_1,
    level1_color
  ) |>
  dplyr::arrange(
    event_order,
    .by_group = TRUE
  ) |>
  dplyr::mutate(
    previous_event_year_pair = dplyr::lag(event_year_pair),
    previous_event_label = dplyr::lag(event_label),
    previous_classification_year = dplyr::lag(classification_year),
    previous_event_mid_year = dplyr::lag(event_mid_year),
    previous_mean_anomaly_mm = dplyr::lag(mean_anomaly_mm),
    previous_deficit_pct = dplyr::lag(deficit_pct),
    previous_excess_pct = dplyr::lag(excess_pct),
    previous_strong_deficit_pct = dplyr::lag(strong_deficit_pct),
    previous_strong_excess_pct = dplyr::lag(strong_excess_pct),
    
    transition_label = paste0(
      previous_event_year_pair,
      " → ",
      event_year_pair
    ),
    
    interval_years =
      event_mid_year - previous_event_mid_year,
    
    change_mean_anomaly_mm =
      mean_anomaly_mm - previous_mean_anomaly_mm,
    
    change_mm_per_decade =
      10 * change_mean_anomaly_mm / interval_years,
    
    change_deficit_pct =
      deficit_pct - previous_deficit_pct,
    
    change_excess_pct =
      excess_pct - previous_excess_pct,
    
    change_strong_deficit_pct =
      strong_deficit_pct - previous_strong_deficit_pct,
    
    change_strong_excess_pct =
      strong_excess_pct - previous_strong_excess_pct
  ) |>
  dplyr::filter(
    !is.na(previous_event_year_pair)
  ) |>
  dplyr::ungroup() |>
  dplyr::mutate(
    transition_label = factor(
      transition_label,
      levels = transition_levels,
      ordered = TRUE
    ),
    change_direction = dplyr::case_when(
      change_mean_anomaly_mm > 20 ~
        "Mudança para anomalia mais úmida",
      change_mean_anomaly_mm < -20 ~
        "Mudança para anomalia mais seca",
      TRUE ~
        "Mudança pequena"
    )
  )


# ------------------------------------------------------------------------------
# Resumo da trajetória 1982/83 → 2023/24.
# ------------------------------------------------------------------------------

event_trajectory_summary <- event_trajectory_data |>
  dplyr::group_by(
    region,
    region_level,
    period,
    Level_1,
    level1_color
  ) |>
  dplyr::arrange(
    event_order,
    .by_group = TRUE
  ) |>
  dplyr::summarise(
    number_of_events = dplyr::n(),
    
    first_event = dplyr::first(event_year_pair),
    last_event = dplyr::last(event_year_pair),
    
    first_classification_year =
      dplyr::first(classification_year),
    
    last_classification_year =
      dplyr::last(classification_year),
    
    first_anomaly_mm =
      dplyr::first(mean_anomaly_mm),
    
    last_anomaly_mm =
      dplyr::last(mean_anomaly_mm),
    
    total_change_mm =
      last_anomaly_mm - first_anomaly_mm,
    
    minimum_anomaly_mm =
      min(mean_anomaly_mm, na.rm = TRUE),
    
    maximum_anomaly_mm =
      max(mean_anomaly_mm, na.rm = TRUE),
    
    amplitude_mm =
      maximum_anomaly_mm - minimum_anomaly_mm,
    
    slope_mm_per_decade =
      safe_slope_per_decade(
        event_mid_year,
        mean_anomaly_mm
      ),
    
    linear_r_squared =
      safe_linear_r_squared(
        event_mid_year,
        mean_anomaly_mm
      ),
    
    spearman_rho =
      safe_spearman(
        event_mid_year,
        mean_anomaly_mm
      ),
    
    trajectory_class =
      classify_event_trajectory(
        mean_anomaly_mm
      ),
    
    .groups = "drop"
  ) |>
  dplyr::mutate(
    net_direction = dplyr::case_when(
      total_change_mm > 20 ~
        "Mais úmida em 2023/24 que em 1982/83",
      total_change_mm < -20 ~
        "Mais seca em 2023/24 que em 1982/83",
      TRUE ~
        "Pouca mudança líquida entre 1982/83 e 2023/24"
    )
  ) |>
  dplyr::arrange(
    region,
    period,
    Level_1
  )


# ==============================================================================
# 16. FUNÇÕES DE PREPARAÇÃO DOS GRÁFICOS
# ==============================================================================

select_region_events <- function(
    data,
    selected_region
) {
  available_regions <- sort(unique(as.character(data$region)))
  
  if (!selected_region %in% available_regions) {
    stop(
      "Região não encontrada: ",
      selected_region,
      "\nRegiões disponíveis: ",
      paste(available_regions, collapse = ", ")
    )
  }
  
  filtered_data <- data |>
    dplyr::filter(region == selected_region) |>
    dplyr::mutate(
      period = factor(
        as.character(period),
        levels = period_levels,
        ordered = TRUE
      ),
      event_panel_label = factor(
        as.character(event_panel_label),
        levels = event_panel_levels,
        ordered = TRUE
      ),
      Level_1 = factor(
        as.character(Level_1),
        levels = level1_levels,
        ordered = TRUE
      )
    )
  
  list(
    data = filtered_data,
    region = selected_region
  )
}


prepare_level1_axis <- function(data) {
  level_lookup <- data |>
    dplyr::distinct(
      Level_1,
      level1_color
    ) |>
    dplyr::mutate(
      Level_1 = factor(
        as.character(Level_1),
        levels = level1_levels,
        ordered = TRUE
      ),
      wrapped_label = stringr::str_wrap(
        as.character(Level_1),
        width = class_wrap_width
      )
    ) |>
    dplyr::arrange(Level_1)
  
  axis_levels <- rev(level1_levels)
  
  level_lookup <- level_lookup |>
    dplyr::mutate(
      level1_axis = factor(
        as.character(Level_1),
        levels = axis_levels
      )
    )
  
  prepared_data <- data |>
    dplyr::mutate(
      level1_axis = factor(
        as.character(Level_1),
        levels = axis_levels
      )
    )
  
  list(
    data = prepared_data,
    lookup = level_lookup,
    levels = axis_levels
  )
}


build_level1_label_panel <- function(
    level_lookup,
    event_levels,
    class_text_size = 12,
    blank_facet_strip = TRUE,
    rectangle_x = 0.025,
    text_x = 0.062,
    x_limit = 0.52
) {
  panel_data <- purrr::map_dfr(
    event_levels,
    function(current_event) {
      level_lookup |>
        dplyr::mutate(
          event_panel_label = factor(
            current_event,
            levels = event_levels,
            ordered = TRUE
          ),
          strip_dummy = factor(" ", levels = " ")
        )
    }
  )
  
  label_plot <- ggplot2::ggplot(
    panel_data,
    ggplot2::aes(y = level1_axis)
  ) +
    ggplot2::geom_tile(
      ggplot2::aes(
        x = rectangle_x,
        fill = level1_color
      ),
      width = 0.045,
      height = 0.72
    ) +
    ggplot2::geom_text(
      ggplot2::aes(
        x = text_x,
        label = wrapped_label
      ),
      hjust = 0,
      size = class_text_size / ggplot2::.pt,
      lineheight = 0.95,
      color = "grey10"
    ) +
    ggplot2::scale_fill_identity(guide = "none") +
    ggplot2::scale_y_discrete(
      limits = levels(level_lookup$level1_axis),
      drop = FALSE,
      expand = ggplot2::expansion(add = c(0.6, 0.6))
    ) +
    ggplot2::scale_x_continuous(
      limits = c(0, x_limit),
      expand = ggplot2::expansion(mult = c(0, 0))
    ) +
    ggplot2::coord_cartesian(clip = "off") +
    ggplot2::labs(x = NULL, y = NULL) +
    ggplot2::theme_void(base_size = 13) +
    ggplot2::theme(
      panel.spacing.y = grid::unit(0.85, "lines"),
      panel.border = ggplot2::element_rect(
        color = "grey85",
        fill = NA,
        linewidth = 0.35
      ),
      strip.background = ggplot2::element_blank(),
      strip.text.y.right = ggplot2::element_blank(),
      plot.margin = ggplot2::margin(
        t = 0,
        r = -4,
        b = 0,
        l = 0
      )
    )
  
  if (isTRUE(blank_facet_strip)) {
    label_plot <- label_plot +
      ggplot2::facet_grid(
        rows = ggplot2::vars(event_panel_label),
        cols = ggplot2::vars(strip_dummy),
        drop = FALSE
      ) +
      ggplot2::theme(
        strip.text.x = ggplot2::element_text(
          size = 22,
          color = NA,
          margin = ggplot2::margin(
            t = 5,
            b = 10
          )
        )
      )
  } else {
    label_plot <- label_plot +
      ggplot2::facet_grid(
        rows = ggplot2::vars(event_panel_label),
        drop = FALSE
      )
  }
  
  label_plot
}


# ==============================================================================
# 17. GRÁFICO DE DISTRIBUIÇÃO — LEVEL_1
# ==============================================================================

plot_anomaly_distribution <- function(
    data,
    selected_region,
    label_threshold = 15,
    label_size = 3.1,
    class_text_size = 12
) {
  selected <- select_region_events(
    data = data,
    selected_region = selected_region
  )
  
  plot_data <- selected$data
  
  prepared_axis <- prepare_level1_axis(plot_data)
  
  plot_data <- prepared_axis$data
  level_lookup <- prepared_axis$lookup
  level1_axis_levels <- prepared_axis$levels
  current_event_levels <- levels(plot_data$event_panel_label)
  
  plot_data <- plot_data |>
    dplyr::mutate(
      segment_label = dplyr::if_else(
        area_pct > label_threshold,
        paste0(
          scales::number(
            area_pct,
            accuracy = 1,
            big.mark = ".",
            decimal.mark = ",",
            trim = TRUE
          ),
          "%\n(",
          format_mha(area_ha),
          ")"
        ),
        NA_character_
      ),
      label_color = dplyr::case_when(
        anomaly_band %in% c(
          "≤ −300 mm",
          "−300 a −200 mm",
          "−200 a −100 mm",
          "200 a 300 mm",
          "≥ 300 mm"
        ) ~ "white",
        TRUE ~ "black"
      )
    )
  
  class_label_plot <- build_level1_label_panel(
    level_lookup = level_lookup,
    event_levels = current_event_levels,
    class_text_size = class_text_size,
    blank_facet_strip = TRUE
  )
  
  main_plot <- ggplot2::ggplot(
    plot_data,
    ggplot2::aes(
      x = level1_axis,
      y = area_pct,
      fill = anomaly_band,
      group = anomaly_band
    )
  ) +
    ggplot2::geom_col(
      width = 0.82,
      position = "stack"
    ) +
    ggplot2::geom_text(
      ggplot2::aes(
        label = segment_label,
        color = label_color
      ),
      position = ggplot2::position_stack(vjust = 0.5),
      size = label_size,
      fontface = "bold",
      lineheight = 0.9,
      na.rm = TRUE,
      show.legend = FALSE
    ) +
    ggplot2::coord_flip() +
    ggplot2::facet_grid(
      rows = ggplot2::vars(event_panel_label),
      cols = ggplot2::vars(period),
      labeller = ggplot2::labeller(
        period = period_display_labels
      ),
      drop = FALSE
    ) +
    ggplot2::scale_x_discrete(
      limits = level1_axis_levels,
      drop = FALSE,
      expand = ggplot2::expansion(add = c(0.6, 0.6))
    ) +
    ggplot2::scale_y_continuous(
      limits = c(0, 100),
      breaks = seq(0, 100, by = 20),
      labels = scales::label_percent(
        scale = 1,
        accuracy = 1,
        decimal.mark = ","
      ),
      expand = ggplot2::expansion(mult = c(0, 0.01))
    ) +
    ggplot2::scale_fill_manual(
      values = anomaly_colors,
      limits = anomaly_band_levels,
      breaks = anomaly_legend_order,
      drop = FALSE
    ) +
    ggplot2::scale_color_identity(guide = "none") +
    ggplot2::labs(
      x = NULL,
      y = "Percentual da área da classe Level_1",
      fill = "Anomalia de precipitação"
    ) +
    ggplot2::guides(
      fill = ggplot2::guide_legend(
        nrow = 1,
        byrow = TRUE,
        title.position = "top",
        title.hjust = 0.5
      )
    ) +
    ggplot2::theme_minimal(base_size = 13) +
    ggplot2::theme(
      strip.background = ggplot2::element_rect(
        fill = "grey96",
        color = "grey82",
        linewidth = 0.4
      ),
      strip.text.x = ggplot2::element_text(
        face = "bold",
        size = 18,
        color = "grey10",
        margin = ggplot2::margin(t = 5, b = 8)
      ),
      strip.text.y.right = ggplot2::element_text(
        face = "bold",
        size = 11,
        angle = 0,
        color = "grey10",
        lineheight = 1.0,
        margin = ggplot2::margin(l = 5, r = 5)
      ),
      axis.text.y = ggplot2::element_blank(),
      axis.ticks.y = ggplot2::element_blank(),
      axis.text.x = ggplot2::element_text(size = 9),
      axis.title.x = ggplot2::element_text(
        size = 12,
        face = "bold",
        margin = ggplot2::margin(t = 8)
      ),
      panel.border = ggplot2::element_rect(
        color = "grey85",
        fill = NA,
        linewidth = 0.35
      ),
      panel.grid.major.y = ggplot2::element_blank(),
      panel.grid.minor = ggplot2::element_blank(),
      panel.grid.major.x = ggplot2::element_line(
        color = "grey90",
        linewidth = 0.3
      ),
      panel.spacing.x = grid::unit(0.75, "lines"),
      panel.spacing.y = grid::unit(0.85, "lines"),
      legend.position = "top",
      legend.direction = "horizontal",
      legend.justification = "center",
      legend.box = "horizontal",
      legend.box.just = "center",
      legend.title = ggplot2::element_text(
        face = "bold",
        size = 13
      ),
      legend.text = ggplot2::element_text(size = 11),
      legend.key.height = grid::unit(0.55, "cm"),
      legend.key.width = grid::unit(0.75, "cm"),
      legend.spacing.x = grid::unit(0.20, "cm"),
      plot.margin = ggplot2::margin(
        t = 0,
        r = 20,
        b = 0,
        l = -12
      )
    )
  
  patchwork::wrap_plots(
    class_label_plot,
    main_plot,
    widths = c(class_panel_width, main_panel_width),
    guides = "collect"
  ) +
    patchwork::plot_annotation(
      title = paste0(
        selected_region,
        " — Anomalias de precipitação por evento de El Niño, ",
        "trimestre e classe Level_1"
      ),
      subtitle = paste0(
        "Cada linha representa um evento e o respectivo ano LULC; ",
        "as colunas representam SON, DJF, MAM e JJA.\n",
        "Classes Level_1: Floresta, Vegetação Herbácea e Arbustiva, ",
        "Agropecuária, Área não Vegetada e Corpo D'água."
      ),
      caption = paste0(
        "Os rótulos mostram o percentual e a área absoluta somente para ",
        "faixas superiores a ",
        label_threshold,
        "% da área da classe. Mha = milhões de hectares."
      ),
      theme = ggplot2::theme(
        plot.title = ggplot2::element_text(
          face = "plain",
          size = 27,
          hjust = 0,
          margin = ggplot2::margin(b = 4)
        ),
        plot.subtitle = ggplot2::element_text(
          face = "plain",
          size = 15,
          lineheight = 1.20,
          color = "grey25",
          margin = ggplot2::margin(b = 10)
        ),
        plot.caption = ggplot2::element_text(
          size = 10,
          hjust = 0,
          color = "grey35",
          margin = ggplot2::margin(t = 12)
        ),
        plot.margin = ggplot2::margin(
          t = 16,
          r = 20,
          b = 16,
          l = 20
        )
      )
    ) &
    ggplot2::theme(
      legend.position = "top"
    )
}


# ==============================================================================
# 18. HEATMAP — LEVEL_1
# ==============================================================================

plot_weighted_anomaly_heatmap <- function(
    data,
    selected_region,
    class_text_size = 11
) {
  selected <- select_region_events(
    data = data,
    selected_region = selected_region
  )
  
  plot_data <- selected$data
  
  prepared_axis <- prepare_level1_axis(plot_data)
  
  plot_data <- prepared_axis$data
  level_lookup <- prepared_axis$lookup
  level1_axis_levels <- prepared_axis$levels
  current_event_levels <- levels(plot_data$event_panel_label)
  
  anomaly_limit <- max(
    abs(plot_data$mean_anomaly_mm),
    na.rm = TRUE
  )
  
  if (!is.finite(anomaly_limit) || anomaly_limit == 0) {
    anomaly_limit <- 1
  }
  
  plot_data <- plot_data |>
    dplyr::mutate(
      anomaly_label = dplyr::if_else(
        is.finite(mean_anomaly_mm),
        paste0(
          scales::number(
            mean_anomaly_mm,
            accuracy = 1,
            decimal.mark = ","
          ),
          " mm"
        ),
        NA_character_
      ),
      text_color = dplyr::if_else(
        abs(mean_anomaly_mm) >= 0.55 * anomaly_limit,
        "white",
        "black"
      )
    )
  
  class_label_plot <- build_level1_label_panel(
    level_lookup = level_lookup,
    event_levels = current_event_levels,
    class_text_size = class_text_size,
    blank_facet_strip = FALSE
  )
  
  main_plot <- ggplot2::ggplot(
    plot_data,
    ggplot2::aes(
      x = period,
      y = level1_axis,
      fill = mean_anomaly_mm
    )
  ) +
    ggplot2::geom_tile(
      color = "white",
      linewidth = 0.6
    ) +
    ggplot2::geom_text(
      ggplot2::aes(
        label = anomaly_label,
        color = text_color
      ),
      size = 4.3,
      fontface = "bold",
      na.rm = TRUE
    ) +
    ggplot2::facet_grid(
      rows = ggplot2::vars(event_panel_label),
      drop = FALSE
    ) +
    ggplot2::scale_color_identity(guide = "none") +
    ggplot2::scale_y_discrete(
      limits = level1_axis_levels,
      drop = FALSE,
      expand = ggplot2::expansion(add = c(0.6, 0.6))
    ) +
    ggplot2::scale_x_discrete(
      labels = period_display_labels,
      drop = FALSE
    ) +
    ggplot2::scale_fill_gradient2(
      low = "#B2182B",
      mid = "#F7F7F7",
      high = "#2166AC",
      midpoint = 0,
      limits = c(-anomaly_limit, anomaly_limit),
      oob = scales::squish,
      name = paste(
        "Anomalia média",
        "ponderada (mm)",
        sep = "\n"
      )
    ) +
    ggplot2::labs(
      x = NULL,
      y = NULL
    ) +
    ggplot2::theme_minimal(base_size = 14) +
    ggplot2::theme(
      axis.text.x = ggplot2::element_text(
        face = "bold",
        size = 15
      ),
      axis.text.y = ggplot2::element_blank(),
      axis.ticks.y = ggplot2::element_blank(),
      panel.grid = ggplot2::element_blank(),
      panel.border = ggplot2::element_rect(
        color = "grey85",
        fill = NA,
        linewidth = 0.35
      ),
      panel.spacing.y = grid::unit(0.85, "lines"),
      strip.background = ggplot2::element_rect(
        fill = "grey96",
        color = "grey82",
        linewidth = 0.4
      ),
      strip.text.y.right = ggplot2::element_text(
        face = "bold",
        size = 11,
        angle = 0,
        color = "grey10",
        lineheight = 1.0
      ),
      legend.position = "top",
      legend.title = ggplot2::element_text(
        face = "bold",
        size = 13
      ),
      legend.text = ggplot2::element_text(size = 11),
      plot.margin = ggplot2::margin(
        t = 0,
        r = 20,
        b = 0,
        l = -8
      )
    )
  
  patchwork::wrap_plots(
    class_label_plot,
    main_plot,
    widths = c(class_panel_width, main_panel_width),
    guides = "collect"
  ) +
    patchwork::plot_annotation(
      title = paste0(
        selected_region,
        " — Anomalia média de precipitação ponderada pela área"
      ),
      subtitle = paste0(
        "Resultados agregados para as cinco classes Level_1. ",
        "Cada linha representa um evento e o respectivo ano LULC."
      ),
      theme = ggplot2::theme(
        plot.title = ggplot2::element_text(
          face = "bold",
          size = 20
        ),
        plot.subtitle = ggplot2::element_text(
          size = 13,
          color = "grey30",
          lineheight = 1.15,
          margin = ggplot2::margin(b = 12)
        ),
        plot.margin = ggplot2::margin(
          t = 15,
          r = 20,
          b = 15,
          l = 20
        )
      )
    ) &
    ggplot2::theme(
      legend.position = "top"
    )
}


# ==============================================================================
# 18.1. GRÁFICO COMPARATIVO DE TRAJETÓRIA ENTRE EVENTOS
# ==============================================================================

# ------------------------------------------------------------------------------
# Painel esquerdo com retângulos e nomes das classes Level_1.
#
# O painel é separado do gráfico principal para manter as classes à esquerda,
# usando exatamente as cores hexadecimais definidas em level1_colors.
# ------------------------------------------------------------------------------

build_trajectory_level1_panel <- function(
    class_text_size = 12,
    rectangle_x = 0.030,
    text_x = 0.075,
    x_limit = 0.72
) {
  level_lookup <- tibble::tibble(
    Level_1 = factor(
      level1_levels,
      levels = level1_levels,
      ordered = TRUE
    ),
    level1_color = unname(level1_colors[level1_levels])
  ) |>
    dplyr::mutate(
      level1_axis = factor(
        as.character(Level_1),
        levels = rev(level1_levels)
      ),
      wrapped_label = stringr::str_wrap(
        as.character(Level_1),
        width = class_wrap_width
      ),
      strip_dummy = factor(" ", levels = " ")
    )
  
  ggplot2::ggplot(
    level_lookup,
    ggplot2::aes(y = level1_axis)
  ) +
    ggplot2::geom_tile(
      ggplot2::aes(
        x = rectangle_x,
        fill = level1_color
      ),
      width = 0.052,
      height = 0.72
    ) +
    ggplot2::geom_text(
      ggplot2::aes(
        x = text_x,
        label = wrapped_label
      ),
      hjust = 0,
      size = class_text_size / ggplot2::.pt,
      lineheight = 0.95,
      color = "grey10"
    ) +
    ggplot2::scale_fill_identity(guide = "none") +
    ggplot2::scale_y_discrete(
      limits = rev(level1_levels),
      drop = FALSE,
      expand = ggplot2::expansion(add = c(0.6, 0.6))
    ) +
    ggplot2::scale_x_continuous(
      limits = c(0, x_limit),
      expand = ggplot2::expansion(mult = c(0, 0))
    ) +
    ggplot2::coord_cartesian(clip = "off") +
    ggplot2::facet_grid(
      cols = ggplot2::vars(strip_dummy),
      drop = FALSE
    ) +
    ggplot2::labs(x = NULL, y = NULL) +
    ggplot2::theme_void(base_size = 13) +
    ggplot2::theme(
      strip.background = ggplot2::element_blank(),
      strip.text.x = ggplot2::element_text(
        size = 16,
        color = NA,
        margin = ggplot2::margin(t = 5, b = 8)
      ),
      panel.border = ggplot2::element_rect(
        color = "grey85",
        fill = NA,
        linewidth = 0.35
      ),
      plot.margin = ggplot2::margin(
        t = 0,
        r = -4,
        b = 0,
        l = 0
      )
    )
}


plot_event_trajectory <- function(
    data,
    trajectory_summary,
    selected_region
) {
  selected <- select_region_events(
    data = data,
    selected_region = selected_region
  )
  
  plot_data <- selected$data |>
    dplyr::mutate(
      event_axis_label = factor(
        as.character(event_axis_label),
        levels = event_year_pair_levels,
        ordered = TRUE
      ),
      event_index = as.numeric(event_axis_label),
      Level_1 = factor(
        as.character(Level_1),
        levels = level1_levels,
        ordered = TRUE
      )
    )
  
  annotation_data <- trajectory_summary |>
    dplyr::filter(
      region == selected_region
    ) |>
    dplyr::mutate(
      Level_1 = factor(
        as.character(Level_1),
        levels = level1_levels,
        ordered = TRUE
      ),
      change_label = paste0(
        "Δ 1982/83–2023/24: ",
        dplyr::if_else(
          total_change_mm > 0,
          "+",
          ""
        ),
        scales::number(
          total_change_mm,
          accuracy = 1,
          decimal.mark = ","
        ),
        " mm"
      ),
      delta_fill = dplyr::if_else(
        total_change_mm < 0,
        "#B2182B",
        "#2166AC"
      ),
      delta_text_color = "white"
    )
  
  class_label_plot <- build_trajectory_level1_panel(
    class_text_size = class_name_size
  )
  
  main_plot <- ggplot2::ggplot(
    plot_data,
    ggplot2::aes(
      x = event_index,
      y = mean_anomaly_mm,
      group = 1,
      color = Level_1
    )
  ) +
    ggplot2::geom_hline(
      yintercept = 0,
      color = "grey40",
      linewidth = 0.55
    ) +
    ggplot2::geom_line(
      linewidth = 1.80,
      lineend = "round"
    ) +
    ggplot2::geom_smooth(
      ggplot2::aes(
        x = event_index,
        y = mean_anomaly_mm,
        group = 1
      ),
      method = "lm",
      formula = y ~ x,
      se = FALSE,
      inherit.aes = TRUE,
      color = "#D73027",
      linetype = "dotted",
      linewidth = 1.05,
      alpha = 0.98,
      show.legend = FALSE
    ) +
    ggplot2::geom_point(
      size = 5.2,
      stroke = 0.45
    ) +
    ggplot2::geom_text(
      data = plot_data,
      ggplot2::aes(
        x = event_index,
        y = mean_anomaly_mm,
        label = paste0(
          dplyr::if_else(
            mean_anomaly_mm > 0,
            "+",
            ""
          ),
          scales::number(
            mean_anomaly_mm,
            accuracy = 1,
            decimal.mark = ","
          ),
          " mm"
        )
      ),
      inherit.aes = FALSE,
      vjust = -1.05,
      size = 5.80,
      fontface = "bold",
      color = "black",
      show.legend = FALSE,
      check_overlap = TRUE
    ) +
    ggplot2::geom_label(
      data = annotation_data,
      ggplot2::aes(
        x = Inf,
        y = Inf,
        label = change_label,
        fill = delta_fill
      ),
      inherit.aes = FALSE,
      hjust = 1.03,
      vjust = 1.10,
      size = 4.50,
      fontface = "bold",
      label.size = 0.28,
      label.padding = grid::unit(0.20, "lines"),
      color = "white"
    ) +
    ggplot2::facet_grid(
      rows = ggplot2::vars(Level_1),
      cols = ggplot2::vars(period),
      scales = "free_y",
      labeller = ggplot2::labeller(
        period = period_display_labels
      ),
      drop = FALSE
    ) +
    ggplot2::scale_color_manual(
      values = level1_colors,
      limits = level1_levels,
      drop = FALSE,
      guide = "none"
    ) +
    ggplot2::scale_fill_identity(
      guide = "none"
    ) +
    ggplot2::scale_x_continuous(
      breaks = seq_along(event_year_pair_levels),
      labels = event_year_pair_levels,
      limits = c(0.75, length(event_year_pair_levels) + 0.25)
    ) +
    ggplot2::scale_y_continuous(
      labels = scales::label_number(
        accuracy = 1,
        decimal.mark = ",",
        suffix = " mm"
      ),
      expand = ggplot2::expansion(
        mult = c(0.18, 0.38)
      )
    ) +
    ggplot2::labs(
      x = "Evento de El Niño",
      y = "Anomalia média ponderada (mm)"
    ) +
    ggplot2::theme_minimal(
      base_size = 13
    ) +
    ggplot2::theme(
      strip.background = ggplot2::element_rect(
        fill = "grey96",
        color = "grey80",
        linewidth = 0.45
      ),
      strip.text.x = ggplot2::element_text(
        face = "bold",
        size = 18,
        color = "grey10",
        margin = ggplot2::margin(
          t = 6,
          b = 9
        )
      ),
      strip.text.y.right = ggplot2::element_blank(),
      axis.text.x = ggplot2::element_text(
        size = 17,
        face = "bold",
        angle = 0,
        hjust = 0.5,
        vjust = 0.9,
        color = "black",
        margin = ggplot2::margin(t = 6)
      ),
      axis.text.y = ggplot2::element_text(
        size = 11.5,
        color = "grey15"
      ),
      axis.title = ggplot2::element_text(
        face = "bold",
        size = 14.5,
        color = "grey10"
      ),
      panel.grid.minor = ggplot2::element_blank(),
      panel.grid.major.x = ggplot2::element_blank(),
      panel.grid.major.y = ggplot2::element_line(
        color = "grey92",
        linewidth = 0.35
      ),
      panel.border = ggplot2::element_rect(
        color = "grey82",
        fill = NA,
        linewidth = 0.42
      ),
      panel.spacing.x = grid::unit(0.85, "lines"),
      panel.spacing.y = grid::unit(0.90, "lines"),
      plot.margin = ggplot2::margin(
        t = 0,
        r = 24,
        b = 0,
        l = -8
      )
    )
  
  patchwork::wrap_plots(
    class_label_plot,
    main_plot,
    widths = c(class_panel_width, main_panel_width),
    guides = "collect"
  ) +
    patchwork::plot_annotation(
      title = paste0(
        selected_region,
        " - Média de Anomalia de precipitação em anos de Super El Nino por trimestre e classe de uso e cobertura da terra"
      ),
      subtitle = "MapBiomas Collection 11 ; A linha vermelha pontilhada representa a tendência linear descritiva",
      caption = paste0(
        "Δ = diferença entre 2023/24 e 1982/83. Caixas vermelhas indicam ",
        "mudança líquida para valores mais negativos; caixas azuis indicam ",
        "mudança líquida para valores mais positivos. Esta comparação é ",
        "descritiva e não constitui teste de tendência climática."
      ),
      theme = ggplot2::theme(
        plot.title = ggplot2::element_text(
          size = 28,
          face = "plain",
          hjust = 0,
          lineheight = 1.04
        ),
        plot.subtitle = ggplot2::element_text(
          size = 17,
          color = "grey20",
          lineheight = 1.15,
          margin = ggplot2::margin(
            b = 12
          )
        ),
        plot.caption = ggplot2::element_text(
          size = 12,
          color = "grey35",
          hjust = 0,
          lineheight = 1.15,
          margin = ggplot2::margin(
            t = 12
          )
        ),
        plot.margin = ggplot2::margin(
          t = 15,
          r = 20,
          b = 15,
          l = 20
        )
      )
    )
}


# ==============================================================================
# 18.2. HEATMAP DAS DIFERENÇAS ENTRE EVENTOS CONSECUTIVOS
# ==============================================================================

plot_event_pairwise_changes <- function(
    data,
    selected_region
) {
  plot_data <- data |>
    dplyr::filter(
      region == selected_region
    ) |>
    dplyr::mutate(
      Level_1 = factor(
        as.character(Level_1),
        levels = level1_levels,
        ordered = TRUE
      ),
      transition_label = factor(
        as.character(transition_label),
        levels = transition_levels,
        ordered = TRUE
      ),
      change_label = paste0(
        dplyr::if_else(
          change_mean_anomaly_mm > 0,
          "+",
          ""
        ),
        scales::number(
          change_mean_anomaly_mm,
          accuracy = 1,
          decimal.mark = ","
        ),
        " mm"
      )
    )
  
  change_limit <- max(
    abs(plot_data$change_mean_anomaly_mm),
    na.rm = TRUE
  )
  
  if (!is.finite(change_limit) || change_limit == 0) {
    change_limit <- 1
  }
  
  ggplot2::ggplot(
    plot_data,
    ggplot2::aes(
      x = transition_label,
      y = Level_1,
      fill = change_mean_anomaly_mm
    )
  ) +
    ggplot2::geom_tile(
      color = "white",
      linewidth = 0.7
    ) +
    ggplot2::geom_text(
      ggplot2::aes(
        label = change_label,
        color = abs(change_mean_anomaly_mm) >= 0.55 * change_limit
      ),
      size = 4.3,
      fontface = "bold"
    ) +
    ggplot2::facet_grid(
      cols = ggplot2::vars(period),
      labeller = ggplot2::labeller(
        period = period_display_labels
      ),
      drop = FALSE
    ) +
    ggplot2::scale_fill_gradient2(
      low = "#B2182B",
      mid = "#F7F7F7",
      high = "#2166AC",
      midpoint = 0,
      limits = c(-change_limit, change_limit),
      oob = scales::squish,
      name = paste(
        "Mudança da anomalia",
        "média ponderada (mm)",
        sep = "\n"
      )
    ) +
    ggplot2::scale_color_manual(
      values = c(
        "TRUE" = "white",
        "FALSE" = "black"
      ),
      guide = "none"
    ) +
    ggplot2::scale_x_discrete(
      drop = FALSE
    ) +
    ggplot2::scale_y_discrete(
      limits = rev(level1_levels),
      drop = FALSE
    ) +
    ggplot2::labs(
      x = "Comparação entre eventos consecutivos",
      y = NULL
    ) +
    ggplot2::theme_minimal(
      base_size = 13
    ) +
    ggplot2::theme(
      strip.background = ggplot2::element_rect(
        fill = "grey96",
        color = "grey82",
        linewidth = 0.4
      ),
      strip.text.x = ggplot2::element_text(
        face = "bold",
        size = 16,
        color = "grey10",
        margin = ggplot2::margin(
          t = 5,
          b = 8
        )
      ),
      axis.text.x = ggplot2::element_text(
        size = 11.5,
        angle = 30,
        hjust = 1
      ),
      axis.text.y = ggplot2::element_text(
        size = 13.5,
        face = "bold"
      ),
      axis.title.x = ggplot2::element_text(
        face = "bold",
        size = 14,
        margin = ggplot2::margin(
          t = 10
        )
      ),
      panel.grid = ggplot2::element_blank(),
      panel.border = ggplot2::element_rect(
        color = "grey85",
        fill = NA,
        linewidth = 0.35
      ),
      panel.spacing.x = grid::unit(0.8, "lines"),
      legend.position = "top",
      legend.title = ggplot2::element_text(
        face = "bold",
        size = 13
      ),
      legend.text = ggplot2::element_text(size = 11),
      plot.margin = ggplot2::margin(
        t = 10,
        r = 20,
        b = 10,
        l = 20
      )
    ) +
    ggplot2::labs(
      title = paste0(
        selected_region,
        " — Diferenças das anomalias entre eventos de El Niño"
      ),
      subtitle = paste0(
        "Valores negativos indicam mudança para uma anomalia mais seca; ",
        "valores positivos indicam mudança para uma anomalia mais úmida."
      ),
      caption = paste0(
        "Cada célula compara a anomalia média ponderada da mesma classe ",
        "Level_1 e do mesmo trimestre entre dois eventos consecutivos. ",
        "As diferenças também refletem os distintos anos LULC."
      )
    ) +
    ggplot2::theme(
      plot.title = ggplot2::element_text(
        size = 28,
        face = "plain",
        hjust = 0
      ),
      plot.subtitle = ggplot2::element_text(
        size = 16.5,
        color = "grey25",
        lineheight = 1.15,
        margin = ggplot2::margin(
          b = 12
        )
      ),
      plot.caption = ggplot2::element_text(
        size = 12,
        color = "grey35",
        hjust = 0,
        lineheight = 1.15,
        margin = ggplot2::margin(
          t = 12
        )
      )
    )
}


# ==============================================================================
# 19. EXPORTAR AS TABELAS
# ==============================================================================

combined_data_export <- combined_data |>
  dplyr::mutate(
    period = as.character(period),
    event_panel_label = as.character(event_panel_label),
    Level_1 = as.character(Level_1)
  )

combined_level1_export <- combined_level1 |>
  dplyr::mutate(
    period = as.character(period),
    event_panel_label = as.character(event_panel_label),
    Level_1 = as.character(Level_1)
  )

analysis_data_export <- analysis_data |>
  dplyr::mutate(
    period = as.character(period),
    event_panel_label = as.character(event_panel_label),
    Level_1 = as.character(Level_1),
    anomaly_band = as.character(anomaly_band)
  )

summary_by_level1_export <- summary_by_level1 |>
  dplyr::mutate(
    period = as.character(period),
    event_panel_label = as.character(event_panel_label),
    Level_1 = as.character(Level_1)
  )

anomaly_distribution_export <- anomaly_distribution |>
  dplyr::mutate(
    period = as.character(period),
    event_panel_label = as.character(event_panel_label),
    Level_1 = as.character(Level_1),
    anomaly_band = as.character(anomaly_band)
  )

readr::write_csv(
  combined_data_export,
  file.path(
    output_folder,
    "dados_combinados_classes_originais_v7.csv"
  )
)

readr::write_csv(
  combined_level1_export,
  file.path(
    output_folder,
    "dados_combinados_level1_v7.csv"
  )
)

readr::write_csv(
  analysis_data_export,
  file.path(
    output_folder,
    "dados_analise_level1_biomas_brasil_v7.csv"
  )
)

readr::write_csv(
  summary_by_level1_export,
  file.path(
    output_folder,
    "resumo_anomalia_por_evento_regiao_level1_v7.csv"
  )
)

readr::write_csv(
  anomaly_distribution_export,
  file.path(
    output_folder,
    "distribuicao_anomalia_por_evento_regiao_level1_v7.csv"
  )
)

readr::write_csv(
  percentage_check |>
    dplyr::mutate(
      period = as.character(period),
      Level_1 = as.character(Level_1)
    ),
  file.path(
    output_folder,
    "verificacao_percentuais_level1_v7.csv"
  )
)

readr::write_csv(
  brazil_aggregation_check |>
    dplyr::mutate(
      period = as.character(period),
      Level_1 = as.character(Level_1)
    ),
  file.path(
    output_folder,
    "verificacao_agregacao_brasil_level1_v7.csv"
  )
)

readr::write_csv(
  summary_by_level1_export |>
    dplyr::filter(region == "Brasil"),
  file.path(
    output_folder,
    "brasil_resumo_anomalia_por_evento_level1_v7.csv"
  )
)

readr::write_csv(
  anomaly_distribution_export |>
    dplyr::filter(region == "Brasil"),
  file.path(
    output_folder,
    "brasil_distribuicao_anomalia_por_evento_level1_v7.csv"
  )
)


# ------------------------------------------------------------------------------
# Tabelas comparativas entre eventos.
# ------------------------------------------------------------------------------

readr::write_csv(
  event_trajectory_data |>
    dplyr::mutate(
      period = as.character(period),
      Level_1 = as.character(Level_1),
      event_axis_label = as.character(event_axis_label),
      event_panel_label = as.character(event_panel_label)
    ),
  file.path(
    output_folder,
    "trajetoria_valores_por_evento_level1_v7.csv"
  )
)

readr::write_csv(
  event_pairwise_changes |>
    dplyr::mutate(
      period = as.character(period),
      Level_1 = as.character(Level_1),
      transition_label = as.character(transition_label)
    ),
  file.path(
    output_folder,
    "mudancas_entre_eventos_consecutivos_level1_v7.csv"
  )
)

readr::write_csv(
  event_trajectory_summary |>
    dplyr::mutate(
      period = as.character(period),
      Level_1 = as.character(Level_1)
    ),
  file.path(
    output_folder,
    "resumo_trajetoria_1982_2023_level1_v7.csv"
  )
)


# ==============================================================================
# 20. GERAR E SALVAR OS GRÁFICOS
# ==============================================================================

regions <- analysis_data |>
  dplyr::distinct(region, region_level) |>
  dplyr::mutate(
    region_order = dplyr::if_else(
      region == "Brasil",
      0L,
      1L
    )
  ) |>
  dplyr::arrange(region_order, region) |>
  dplyr::pull(region)

message(
  "Regiões que serão processadas: ",
  paste(regions, collapse = ", ")
)

pdf_device <- if (isTRUE(capabilities("cairo"))) {
  grDevices::cairo_pdf
} else {
  grDevices::pdf
}

purrr::walk(
  regions,
  function(current_region) {
    region_slug <- slugify(current_region)
    
    number_events <- anomaly_distribution |>
      dplyr::filter(region == current_region) |>
      dplyr::summarise(
        number_events = dplyr::n_distinct(anomaly_product)
      ) |>
      dplyr::pull(number_events)
    
    distribution_height <- max(
      12,
      5 + number_events * 4.2
    )
    
    heatmap_height <- max(
      12,
      5 + number_events * 3.9
    )
    
    distribution_plot <- plot_anomaly_distribution(
      data = anomaly_distribution,
      selected_region = current_region,
      label_threshold = label_threshold,
      label_size = segment_label_size,
      class_text_size = class_name_size
    )
    
    heatmap_plot <- plot_weighted_anomaly_heatmap(
      data = summary_by_level1,
      selected_region = current_region,
      class_text_size = class_name_size - 1
    )
    
    trajectory_plot <- plot_event_trajectory(
      data = event_trajectory_data,
      trajectory_summary = event_trajectory_summary,
      selected_region = current_region
    )
    
    pairwise_change_plot <- plot_event_pairwise_changes(
      data = event_pairwise_changes,
      selected_region = current_region
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "distribuicao_anomalia_level1_",
          region_slug,
          "_v7.png"
        )
      ),
      plot = distribution_plot,
      width = 25,
      height = distribution_height,
      units = "in",
      dpi = 300,
      bg = "white",
      limitsize = FALSE
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "distribuicao_anomalia_level1_",
          region_slug,
          "_v7.pdf"
        )
      ),
      plot = distribution_plot,
      width = 25,
      height = distribution_height,
      units = "in",
      device = pdf_device,
      bg = "white",
      limitsize = FALSE
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "heatmap_anomalia_level1_",
          region_slug,
          "_v7.png"
        )
      ),
      plot = heatmap_plot,
      width = 18,
      height = heatmap_height,
      units = "in",
      dpi = 300,
      bg = "white",
      limitsize = FALSE
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "heatmap_anomalia_level1_",
          region_slug,
          "_v7.pdf"
        )
      ),
      plot = heatmap_plot,
      width = 18,
      height = heatmap_height,
      units = "in",
      device = pdf_device,
      bg = "white",
      limitsize = FALSE
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "trajetoria_anomalia_eventos_",
          region_slug,
          "_v7.png"
        )
      ),
      plot = trajectory_plot,
      width = 24,
      height = 24,
      units = "in",
      dpi = 300,
      bg = "white",
      limitsize = FALSE
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "trajetoria_anomalia_eventos_",
          region_slug,
          "_v7.pdf"
        )
      ),
      plot = trajectory_plot,
      width = 24,
      height = 24,
      units = "in",
      device = pdf_device,
      bg = "white",
      limitsize = FALSE
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "diferencas_entre_eventos_",
          region_slug,
          "_v7.png"
        )
      ),
      plot = pairwise_change_plot,
      width = 22,
      height = 10,
      units = "in",
      dpi = 300,
      bg = "white",
      limitsize = FALSE
    )
    
    ggplot2::ggsave(
      filename = file.path(
        output_folder,
        paste0(
          "diferencas_entre_eventos_",
          region_slug,
          "_v7.pdf"
        )
      ),
      plot = pairwise_change_plot,
      width = 22,
      height = 10,
      units = "in",
      device = pdf_device,
      bg = "white",
      limitsize = FALSE
    )
    
    message(
      "Gráficos descritivos e comparativos salvos para: ",
      current_region
    )
  }
)


# ==============================================================================
# 21. EXIBIR UM EXEMPLO DO BRASIL
# ==============================================================================

if (!"Brasil" %in% unique(analysis_data$region)) {
  stop("Nenhum dado agregado do Brasil foi encontrado.")
}

plot_brazil_distribution <- plot_anomaly_distribution(
  data = anomaly_distribution,
  selected_region = "Brasil",
  label_threshold = label_threshold,
  label_size = segment_label_size,
  class_text_size = class_name_size
)

plot_brazil_heatmap <- plot_weighted_anomaly_heatmap(
  data = summary_by_level1,
  selected_region = "Brasil",
  class_text_size = class_name_size - 1
)

plot_brazil_trajectory <- plot_event_trajectory(
  data = event_trajectory_data,
  trajectory_summary = event_trajectory_summary,
  selected_region = "Brasil"
)

plot_brazil_pairwise_changes <- plot_event_pairwise_changes(
  data = event_pairwise_changes,
  selected_region = "Brasil"
)

print(plot_brazil_distribution)
print(plot_brazil_heatmap)
print(plot_brazil_trajectory)
print(plot_brazil_pairwise_changes)


# ==============================================================================
# 22. TABELA COMPACTA
# ==============================================================================

assessment_table <- summary_by_level1 |>
  dplyr::select(
    classification_year,
    event_year_pair,
    anomaly_product,
    event_label,
    period,
    region,
    region_level,
    Level_1,
    level1_color,
    total_area_ha,
    mean_anomaly_mm,
    deficit_pct,
    excess_pct,
    strong_deficit_pct,
    strong_excess_pct,
    extreme_deficit_pct,
    extreme_excess_pct,
    dominant_condition
  ) |>
  dplyr::mutate(
    total_area_ha = round(total_area_ha, 2),
    mean_anomaly_mm = round(mean_anomaly_mm, 1),
    dplyr::across(
      dplyr::ends_with("_pct"),
      ~ round(.x, 1)
    )
  ) |>
  dplyr::arrange(
    region,
    match(anomaly_product, event_product_levels),
    period,
    Level_1
  )

print(assessment_table, n = 50)

brazil_assessment_table <- assessment_table |>
  dplyr::filter(region == "Brasil")

print(brazil_assessment_table, n = 100)

readr::write_csv(
  assessment_table |>
    dplyr::mutate(Level_1 = as.character(Level_1)),
  file.path(
    output_folder,
    "tabela_compacta_avaliacao_level1_v7.csv"
  )
)


# ==============================================================================
# 23. INFORMAÇÕES FINAIS
# ==============================================================================

message("\nAnálise Level_1 descritiva e comparativa concluída.")
message("Pasta de entrada: ", data_folder)
message("Pasta de saída: ", output_folder)
message("Número de arquivos CSV: ", length(csv_files))
message(
  "Número de linhas originais válidas: ",
  format(nrow(combined_data), big.mark = ".")
)
message(
  "Número de linhas agregadas para Level_1: ",
  format(nrow(combined_level1), big.mark = ".")
)
message(
  "Número de linhas agregadas para o Brasil: ",
  format(nrow(analysis_brazil), big.mark = ".")
)
message(
  "Classes Level_1: ",
  paste(level1_levels, collapse = " | ")
)
message(
  "Cores Level_1: ",
  paste(
    paste0(names(level1_colors), " = ", unname(level1_colors)),
    collapse = " | "
  )
)
message("Brasil agregado separadamente para cada evento e período.")
message("Linhas dos gráficos: eventos de El Niño e ano LULC.")
message("Colunas dos gráficos descritivos: SON, DJF, MAM e JJA.")
message("Produto 'Média dos 4 eventos': removido.")
message("Rótulos laterais: El Niño + par de anos + ano LULC.")
message(
  "Análises comparativas: trajetória, mudanças consecutivas, ",
  "diferença 1982/83–2023/24, inclinação descritiva, R² e Spearman."
)
message(
  "Resultados salvos em: ",
  normalizePath(
    output_folder,
    winslash = "/",
    mustWork = FALSE
  )
)
