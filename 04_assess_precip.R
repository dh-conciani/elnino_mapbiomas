# ==============================================================================
# MAPBIOMAS × ANOMALIAS DE PRECIPITAÇÃO
# ANÁLISE POR BIOMA E BRASIL
#
# Versão funcional sem HTML/ggtext:
# - agrega o Brasil antes das estatísticas;
# - usa quatro painéis: SON, DJF, MAM e JJA;
# - mostra Level_4 como nome das classes;
# - ordena as classes pelo código hierárquico no início de Level_4;
# - desenha um retângulo real com a cor de NEW COLOR NUMER;
# - mostra percentual e área absoluta apenas quando area_pct > 15%;
# - exporta tabelas, PNG e PDF.
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
  "patchwork"
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

data_folder <- "./table"
dictionary_file <- "./dict/legend_col11.xlsx"
output_folder <- "./output"

# Somente faixas estritamente maiores que este valor recebem rótulo.
label_threshold <- 15

# Tamanhos dos textos.
segment_label_size <- 3.3
class_name_size <- 12
class_wrap_width <- 28

# Cor usada quando NEW COLOR NUMER estiver ausente ou inválido.
fallback_class_color <- "#BDBDBD"

# Largura relativa do painel de nomes e do painel principal.
# Valores mais compactos mantêm os nomes próximos às barras.
class_panel_width <- 0.95
main_panel_width <- 5.05

# Eventos de Super El Niño mostrados no cabeçalho dos gráficos.
event_years_note <- "*1982-1983 / 1997-1998 / 2015-2016 / 2023-2024"

dir.create(
  output_folder,
  recursive = TRUE,
  showWarnings = FALSE
)


# ==============================================================================
# 3. FUNÇÕES AUXILIARES
# ==============================================================================

# ------------------------------------------------------------------------------
# Normalizar uma cor hexadecimal.
# Aceita valores como 1F8D49, #1F8D49 e 0x1F8D49.
# ------------------------------------------------------------------------------

normalize_hex_color <- function(
    color,
    fallback = "#BDBDBD"
) {
  color <- toupper(trimws(as.character(color)))
  
  color[
    is.na(color) |
      color %in% c("", "NA", "N/A", "NULL")
  ] <- NA_character_
  
  color <- sub(
    pattern = "^0X",
    replacement = "",
    x = color
  )
  
  needs_hash <- !is.na(color) & !startsWith(color, "#")
  color[needs_hash] <- paste0("#", color[needs_hash])
  
  valid <- !is.na(color) &
    grepl(
      "^#([0-9A-F]{6}|[0-9A-F]{8}|[0-9A-F]{3}|[0-9A-F]{4})$",
      color
    )
  
  result <- rep(fallback, length(color))
  result[valid] <- color[valid]
  result
}


# ------------------------------------------------------------------------------
# Média ponderada pela área.
# ------------------------------------------------------------------------------

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


# ------------------------------------------------------------------------------
# Formatar hectares como milhões de hectares.
# ------------------------------------------------------------------------------

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


# ------------------------------------------------------------------------------
# Extrair o código hierárquico do início do nome da classe.
#
# Exemplos:
#   "1.1 Formação Florestal" -> "1.1"
#   "3.2.1.3.1 Soja"        -> "3.2.1.3.1"
# ------------------------------------------------------------------------------

extract_hierarchical_code <- function(label) {
  label <- trimws(as.character(label))
  
  stringr::str_extract(
    label,
    "^[0-9]+(?:\\.[0-9]+)*"
  )
}


# ------------------------------------------------------------------------------
# Criar uma chave numérica para ordenar corretamente códigos hierárquicos.
#
# A chave preenchida com zeros evita problemas como colocar 3.2.1.10 antes de
# 3.2.1.2. Classes sem código no início do rótulo são colocadas ao final.
# ------------------------------------------------------------------------------

make_hierarchical_sort_key <- function(
    label,
    class_id = seq_along(label),
    max_depth = 12L
) {
  label <- as.character(label)
  class_id <- suppressWarnings(as.integer(class_id))
  
  if (length(class_id) != length(label)) {
    stop(
      "make_hierarchical_sort_key(): label e class_id devem ter o mesmo comprimento."
    )
  }
  
  missing_class_id <- is.na(class_id)
  class_id[missing_class_id] <- seq_along(class_id)[missing_class_id]
  
  codes <- extract_hierarchical_code(label)
  
  vapply(
    seq_along(codes),
    function(i) {
      code <- codes[i]
      
      if (is.na(code) || code == "") {
        return(
          paste0(
            "99999.",
            sprintf("%010d", class_id[i])
          )
        )
      }
      
      parts <- suppressWarnings(
        as.integer(
          strsplit(
            code,
            split = ".",
            fixed = TRUE
          )[[1]]
        )
      )
      
      if (length(parts) == 0 || any(is.na(parts))) {
        return(
          paste0(
            "99999.",
            sprintf("%010d", class_id[i])
          )
        )
      }
      
      if (length(parts) < max_depth) {
        parts <- c(
          parts,
          rep(0L, max_depth - length(parts))
        )
      } else if (length(parts) > max_depth) {
        parts <- parts[seq_len(max_depth)]
      }
      
      paste(
        sprintf("%05d", parts),
        collapse = "."
      )
    },
    FUN.VALUE = character(1)
  )
}


# ------------------------------------------------------------------------------
# Criar nomes seguros para arquivos.
# ------------------------------------------------------------------------------

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
  "year",
  "period",
  "biome",
  "class",
  "precip_anomaly_mm",
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
    year = suppressWarnings(as.integer(year)),
    period = toupper(trimws(as.character(period))),
    biome_code = trimws(as.character(biome)),
    class = suppressWarnings(as.integer(class)),
    precip_anomaly_mm = suppressWarnings(as.numeric(precip_anomaly_mm)),
    area_ha = suppressWarnings(as.numeric(area_ha))
  )

if (any(combined_data$area_ha < 0, na.rm = TRUE)) {
  stop("Foram encontrados valores negativos em area_ha.")
}

invalid_rows <- combined_data |>
  dplyr::filter(
    is.na(year) |
      is.na(period) |
      is.na(biome_code) |
      is.na(class) |
      is.na(precip_anomaly_mm) |
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
    !is.na(year),
    !is.na(period),
    !is.na(biome_code),
    !is.na(class),
    !is.na(precip_anomaly_mm),
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

unknown_biomes <- combined_data |>
  dplyr::filter(!biome_code %in% as.character(1:6)) |>
  dplyr::distinct(biome_code) |>
  dplyr::pull(biome_code)

if (length(unknown_biomes) > 0) {
  warning(
    "Código(s) de bioma inesperado(s): ",
    paste(unknown_biomes, collapse = ", ")
  )
}


# ==============================================================================
# 7. LER E PREPARAR O DICIONÁRIO MAPBIOMAS
# ==============================================================================

lulc_raw <- readxl::read_xlsx(dictionary_file)

required_dictionary_columns <- c(
  "NEW ID",
  "Level_0_5",
  "Level_1",
  "Level_4",
  "COLLECTION 11 - CLASSES",
  "NEW COLOR NUMER"
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
    Level_0_5 = as.character(Level_0_5),
    Level_1 = as.character(Level_1),
    Level_4 = as.character(Level_4),
    `COLLECTION 11 - CLASSES` = as.character(`COLLECTION 11 - CLASSES`),
    `NEW COLOR NUMER` = as.character(`NEW COLOR NUMER`)
  ) |>
  dplyr::filter(!is.na(class))

duplicated_classes <- lulc |>
  dplyr::count(class, name = "number_of_records") |>
  dplyr::filter(number_of_records > 1)

if (nrow(duplicated_classes) > 0) {
  warning(
    "Foram encontrados IDs duplicados no dicionário. ",
    "Somente o primeiro registro de cada classe será utilizado."
  )
}

lulc <- lulc |>
  dplyr::distinct(class, .keep_all = TRUE) |>
  dplyr::mutate(
    class_color = normalize_hex_color(
      color = `NEW COLOR NUMER`,
      fallback = fallback_class_color
    )
  )

combined_data <- combined_data |>
  dplyr::left_join(
    lulc,
    by = "class"
  ) |>
  dplyr::mutate(
    Level_4 = dplyr::case_when(
      is.na(Level_4) | trimws(Level_4) == "" ~
        paste0("Classe ", class),
      TRUE ~ Level_4
    ),
    class_label = paste0(class, " — ", Level_4),
    class_color = dplyr::if_else(
      is.na(class_color),
      fallback_class_color,
      class_color
    )
  )


# ==============================================================================
# 8. ORDENAR OS PERÍODOS
# ==============================================================================

period_levels <- c("SON", "DJF", "MAM", "JJA")

# Rótulos exibidos nos gráficos.
# Os códigos SON, DJF, MAM e JJA continuam sendo usados internamente.
period_display_labels <- c(
  "SON" = "Set–Out–Nov",
  "DJF" = "Dez–Jan–Fev",
  "MAM" = "Mar–Abr–Mai",
  "JJA" = "Jun–Jul–Ago"
)

unexpected_periods <- setdiff(
  unique(combined_data$period),
  period_levels
)

if (length(unexpected_periods) > 0) {
  warning(
    "Período(s) inesperado(s): ",
    paste(unexpected_periods, collapse = ", ")
  )
}

combined_data <- combined_data |>
  dplyr::filter(period %in% period_levels) |>
  dplyr::mutate(
    period = factor(
      period,
      levels = period_levels,
      ordered = TRUE
    )
  )

season_lookup <- combined_data |>
  dplyr::distinct(year, period) |>
  dplyr::arrange(year, period) |>
  dplyr::mutate(
    season_label = paste0(as.character(period), " ", year),
    season_order = dplyr::row_number()
  )

combined_data <- combined_data |>
  dplyr::left_join(
    season_lookup,
    by = c("year", "period")
  ) |>
  dplyr::mutate(
    season_label = factor(
      season_label,
      levels = season_lookup$season_label,
      ordered = TRUE
    )
  )


# ==============================================================================
# 9. CRIAR DADOS DOS BIOMAS E AGREGAR O BRASIL
# ==============================================================================

analysis_biomes <- combined_data |>
  dplyr::mutate(
    region = biome,
    region_level = "Bioma"
  )

# A agregação nacional é feita antes das estatísticas.
analysis_brazil <- combined_data |>
  dplyr::group_by(
    year,
    period,
    season_label,
    season_order,
    class,
    class_label,
    Level_0_5,
    Level_1,
    Level_4,
    `COLLECTION 11 - CLASSES`,
    `NEW COLOR NUMER`,
    class_color,
    precip_anomaly_mm
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
  dplyr::select(
    source_file,
    year,
    period,
    season_label,
    season_order,
    region,
    region_level,
    biome_code,
    biome,
    class,
    class_label,
    Level_0_5,
    Level_1,
    Level_4,
    `COLLECTION 11 - CLASSES`,
    `NEW COLOR NUMER`,
    class_color,
    precip_anomaly_mm,
    area_ha
  ) |>
  dplyr::arrange(
    region,
    year,
    period,
    class,
    precip_anomaly_mm
  )


# ==============================================================================
# 10. VERIFICAR A AGREGAÇÃO NACIONAL
# ==============================================================================

expected_brazil_area <- combined_data |>
  dplyr::group_by(year, period, class) |>
  dplyr::summarise(
    expected_area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  )

observed_brazil_area <- analysis_brazil |>
  dplyr::group_by(year, period, class) |>
  dplyr::summarise(
    observed_area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  )

brazil_aggregation_check <- expected_brazil_area |>
  dplyr::left_join(
    observed_brazil_area,
    by = c("year", "period", "class")
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
# 11. CLASSIFICAR AS FAIXAS DE ANOMALIA
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

# Ordem da legenda, seguindo visualmente do maior excesso ao maior déficit.
# Essa ordem altera apenas a legenda; a ordem de empilhamento das barras é mantida.
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
# 12. CALCULAR O RESUMO PONDERADO
# ==============================================================================

summary_by_class <- analysis_data |>
  dplyr::group_by(
    year,
    period,
    season_label,
    season_order,
    region,
    region_level,
    class,
    class_label,
    Level_0_5,
    Level_1,
    Level_4,
    `COLLECTION 11 - CLASSES`,
    `NEW COLOR NUMER`,
    class_color
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
  dplyr::mutate(
    class_sort_key = make_hierarchical_sort_key(
      label = Level_4,
      class_id = class
    )
  ) |>
  dplyr::arrange(
    region,
    year,
    period,
    class_sort_key,
    class
  ) |>
  dplyr::select(-class_sort_key)


# ==============================================================================
# 13. CALCULAR A DISTRIBUIÇÃO POR FAIXA
# ==============================================================================

anomaly_distribution <- analysis_data |>
  dplyr::group_by(
    year,
    period,
    season_label,
    season_order,
    region,
    region_level,
    class,
    class_label,
    Level_0_5,
    Level_1,
    Level_4,
    `NEW COLOR NUMER`,
    class_color,
    anomaly_band
  ) |>
  dplyr::summarise(
    area_ha = sum(area_ha, na.rm = TRUE),
    .groups = "drop"
  ) |>
  dplyr::group_by(
    year,
    period,
    region,
    region_level,
    class
  ) |>
  dplyr::mutate(
    area_pct = 100 * area_ha / sum(area_ha, na.rm = TRUE)
  ) |>
  dplyr::ungroup() |>
  dplyr::mutate(
    class_sort_key = make_hierarchical_sort_key(
      label = Level_4,
      class_id = class
    )
  ) |>
  dplyr::arrange(
    region,
    year,
    period,
    class_sort_key,
    class,
    anomaly_band
  ) |>
  dplyr::select(-class_sort_key)

percentage_check <- anomaly_distribution |>
  dplyr::group_by(year, period, region, class) |>
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
# 14. FUNÇÕES DE PREPARAÇÃO DOS GRÁFICOS
# ==============================================================================

# ------------------------------------------------------------------------------
# Selecionar uma região e um ano.
# ------------------------------------------------------------------------------

select_region_year <- function(
    data,
    selected_region,
    selected_year = NULL
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
  
  region_data <- data |>
    dplyr::filter(region == selected_region)
  
  available_years <- sort(unique(region_data$year))
  
  if (is.null(selected_year)) {
    if (length(available_years) > 1) {
      stop(
        "Mais de um ano está disponível para ",
        selected_region,
        ": ",
        paste(available_years, collapse = ", "),
        ". Informe selected_year."
      )
    }
    
    selected_year <- available_years[1]
  }
  
  if (!selected_year %in% available_years) {
    stop(
      "Ano ",
      selected_year,
      " não encontrado para ",
      selected_region,
      ". Anos disponíveis: ",
      paste(available_years, collapse = ", ")
    )
  }
  
  filtered_data <- region_data |>
    dplyr::filter(year == selected_year) |>
    dplyr::mutate(
      period = factor(
        as.character(period),
        levels = period_levels,
        ordered = TRUE
      )
    )
  
  list(
    data = filtered_data,
    year = selected_year
  )
}


# ------------------------------------------------------------------------------
# Preparar a ordem, os nomes e as cores das classes.
# ------------------------------------------------------------------------------

prepare_class_axis <- function(
    data,
    wrap_width = 28,
    fallback_color = "#BDBDBD"
) {
  class_lookup <- data |>
    dplyr::distinct(
      class,
      Level_4,
      class_color
    ) |>
    dplyr::mutate(
      Level_4 = dplyr::case_when(
        is.na(Level_4) | trimws(Level_4) == "" ~
          paste0("Classe ", class),
        TRUE ~ Level_4
      ),
      class_color = normalize_hex_color(
        color = class_color,
        fallback = fallback_color
      ),
      class_sort_key = make_hierarchical_sort_key(
        label = Level_4,
        class_id = class
      ),
      wrapped_label = stringr::str_wrap(
        Level_4,
        width = wrap_width
      )
    ) |>
    dplyr::arrange(
      class_sort_key,
      Level_4,
      class
    )
  
  # A tabela acima está em ordem hierárquica crescente:
  # 1.1, 1.2, 1.4, 1.6, 2.1, 2.2, 2.3, ...
  # Os níveis são invertidos porque coord_flip() coloca o primeiro nível visual
  # no sentido oposto do eixo discreto original. Assim, 1.1 permanece no topo.
  class_levels <- rev(
    as.character(class_lookup$class)
  )
  
  class_lookup <- class_lookup |>
    dplyr::mutate(
      class_axis = factor(
        as.character(class),
        levels = class_levels
      )
    )
  
  prepared_data <- data |>
    dplyr::mutate(
      class_axis = factor(
        as.character(class),
        levels = class_levels
      )
    )
  
  list(
    data = prepared_data,
    lookup = class_lookup,
    levels = class_levels
  )
}


# ------------------------------------------------------------------------------
# CONSTRUIR O PAINEL DE RETÂNGULOS E NOMES DAS CLASSES.
#
# Esta é a função que estava faltando no script anterior.
# Ela não usa HTML, ggtext, span, nbsp ou códigos hexadecimais como texto.
# ------------------------------------------------------------------------------

build_class_label_panel <- function(
    class_lookup,
    class_text_size = 12,
    blank_facet_strip = TRUE,
    rectangle_x = 0.022,
    text_x = 0.052,
    x_limit = 0.50
) {
  required_lookup_columns <- c(
    "class_axis",
    "class_color",
    "wrapped_label"
  )
  
  missing_lookup_columns <- setdiff(
    required_lookup_columns,
    names(class_lookup)
  )
  
  if (length(missing_lookup_columns) > 0) {
    stop(
      "build_class_label_panel(): coluna(s) ausente(s): ",
      paste(missing_lookup_columns, collapse = ", ")
    )
  }
  
  class_levels <- levels(class_lookup$class_axis)
  
  panel_data <- class_lookup |>
    dplyr::mutate(
      strip_dummy = factor(" ", levels = " ")
    )
  
  label_plot <- ggplot2::ggplot(
    panel_data,
    ggplot2::aes(y = class_axis)
  ) +
    # Retângulo real preenchido com a cor da classe.
    ggplot2::geom_tile(
      ggplot2::aes(
        x = rectangle_x,
        fill = class_color
      ),
      width = 0.040,
      height = 0.72
    ) +
    # Nome da classe desenhado separadamente.
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
    ggplot2::scale_fill_identity(
      guide = "none"
    ) +
    ggplot2::scale_y_discrete(
      limits = class_levels,
      drop = FALSE,
      expand = ggplot2::expansion(
        add = c(0.6, 0.6)
      )
    ) +
    ggplot2::scale_x_continuous(
      limits = c(0, x_limit),
      expand = ggplot2::expansion(mult = c(0, 0))
    ) +
    ggplot2::coord_cartesian(
      clip = "off"
    ) +
    ggplot2::labs(
      x = NULL,
      y = NULL
    ) +
    ggplot2::theme_void(
      base_size = 13
    ) +
    ggplot2::theme(
      plot.margin = ggplot2::margin(
        t = 0,
        r = -4,
        b = 0,
        l = 0
      )
    )
  
  # O gráfico de distribuição possui faixas SON/DJF/MAM/JJA no topo.
  # Um facet vazio reserva a mesma altura no painel esquerdo.
  if (isTRUE(blank_facet_strip)) {
    label_plot <- label_plot +
      ggplot2::facet_grid(
        cols = ggplot2::vars(strip_dummy),
        drop = FALSE
      ) +
      ggplot2::theme(
        strip.background = ggplot2::element_blank(),
        strip.text.x = ggplot2::element_text(
          size = 22,
          color = NA,
          margin = ggplot2::margin(
            t = 5,
            b = 10
          )
        )
      )
  }
  
  label_plot
}


# ==============================================================================
# 15. GRÁFICO DE DISTRIBUIÇÃO DAS ANOMALIAS
# ==============================================================================

plot_anomaly_distribution <- function(
    data,
    selected_region,
    selected_year = NULL,
    label_threshold = 15,
    label_size = 3.3,
    class_text_size = 12,
    wrap_width = 28
) {
  if (
    !is.numeric(label_threshold) ||
    length(label_threshold) != 1 ||
    is.na(label_threshold) ||
    label_threshold < 0 ||
    label_threshold > 100
  ) {
    stop(
      "label_threshold deve ser um único valor numérico entre 0 e 100."
    )
  }
  
  selected <- select_region_year(
    data = data,
    selected_region = selected_region,
    selected_year = selected_year
  )
  
  plot_data <- selected$data
  
  prepared_axis <- prepare_class_axis(
    data = plot_data,
    wrap_width = wrap_width,
    fallback_color = fallback_class_color
  )
  
  plot_data <- prepared_axis$data
  class_lookup <- prepared_axis$lookup
  class_levels <- prepared_axis$levels
  
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
  
  class_label_plot <- build_class_label_panel(
    class_lookup = class_lookup,
    class_text_size = class_text_size,
    blank_facet_strip = TRUE
  )
  
  main_plot <- ggplot2::ggplot(
    plot_data,
    ggplot2::aes(
      x = class_axis,
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
      cols = ggplot2::vars(period),
      labeller = ggplot2::labeller(
        period = period_display_labels
      ),
      drop = FALSE
    ) +
    ggplot2::scale_x_discrete(
      limits = class_levels,
      drop = FALSE,
      expand = ggplot2::expansion(
        add = c(0.6, 0.6)
      )
    ) +
    ggplot2::scale_y_continuous(
      limits = c(0, 100),
      breaks = seq(0, 100, by = 20),
      labels = scales::label_percent(
        scale = 1,
        accuracy = 1,
        decimal.mark = ","
      ),
      expand = ggplot2::expansion(
        mult = c(0, 0.01)
      )
    ) +
    ggplot2::scale_fill_manual(
      values = anomaly_colors,
      limits = anomaly_band_levels,
      breaks = anomaly_legend_order,
      drop = FALSE
    ) +
    ggplot2::scale_color_identity(
      guide = "none"
    ) +
    ggplot2::labs(
      x = NULL,
      y = "Percentual da área da classe",
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
    ggplot2::theme_minimal(
      base_size = 13
    ) +
    ggplot2::theme(
      strip.background = ggplot2::element_blank(),
      strip.text.x = ggplot2::element_text(
        face = "bold",
        size = 22,
        color = "grey10",
        margin = ggplot2::margin(
          t = 5,
          b = 10
        )
      ),
      axis.text.y = ggplot2::element_blank(),
      axis.ticks.y = ggplot2::element_blank(),
      axis.text.x = ggplot2::element_text(size = 10),
      axis.title.x = ggplot2::element_text(
        size = 12,
        face = "bold",
        margin = ggplot2::margin(t = 8)
      ),
      panel.grid.major.y = ggplot2::element_blank(),
      panel.grid.minor = ggplot2::element_blank(),
      panel.grid.major.x = ggplot2::element_line(
        color = "grey90",
        linewidth = 0.3
      ),
      panel.spacing.x = grid::unit(0.9, "lines"),
      legend.position = "top",
      legend.direction = "horizontal",
      legend.justification = "center",
      legend.box = "horizontal",
      legend.box.just = "center",
      legend.title = ggplot2::element_text(
        face = "bold",
        size = 13
      ),
      legend.text = ggplot2::element_text(size = 12),
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
      title = bquote(
        bold(.(selected_region)) ~
          "- Anomalias de precipitação por trimestre em anos de Super El Niño* por uso e cobertura da terra"
      ),
      subtitle = paste0(
        event_years_note,
        "\nMapBiomas Coleção 11 - 2025"
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
          size = 32,
          hjust = 0,
          margin = ggplot2::margin(b = 4)
        ),
        plot.subtitle = ggplot2::element_text(
          face = "plain",
          size = 18,
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
# 16. HEATMAP DA ANOMALIA MÉDIA PONDERADA
# ==============================================================================

plot_weighted_anomaly_heatmap <- function(
    data,
    selected_region,
    selected_year = NULL,
    class_text_size = 11,
    wrap_width = 28
) {
  selected <- select_region_year(
    data = data,
    selected_region = selected_region,
    selected_year = selected_year
  )
  
  plot_data <- selected$data
  
  prepared_axis <- prepare_class_axis(
    data = plot_data,
    wrap_width = wrap_width,
    fallback_color = fallback_class_color
  )
  
  plot_data <- prepared_axis$data
  class_lookup <- prepared_axis$lookup
  class_levels <- prepared_axis$levels
  
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
  
  class_label_plot <- build_class_label_panel(
    class_lookup = class_lookup,
    class_text_size = class_text_size,
    blank_facet_strip = FALSE
  )
  
  main_plot <- ggplot2::ggplot(
    plot_data,
    ggplot2::aes(
      x = period,
      y = class_axis,
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
      size = 3.5,
      fontface = "bold",
      na.rm = TRUE
    ) +
    ggplot2::scale_color_identity(guide = "none") +
    ggplot2::scale_y_discrete(
      limits = class_levels,
      drop = FALSE,
      expand = ggplot2::expansion(
        add = c(0.6, 0.6)
      )
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
        size = 17
      ),
      axis.text.y = ggplot2::element_blank(),
      axis.ticks.y = ggplot2::element_blank(),
      panel.grid = ggplot2::element_blank(),
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
        " - Anomalia média de precipitação ponderada pela área"
      ),
      subtitle = "MapBiomas Coleção 11 - 2025",
      theme = ggplot2::theme(
        plot.title = ggplot2::element_text(
          face = "bold",
          size = 20
        ),
        plot.subtitle = ggplot2::element_text(
          size = 13,
          color = "grey30",
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
# 17. EXPORTAR AS TABELAS
# ==============================================================================

combined_data_export <- combined_data |>
  dplyr::mutate(
    period = as.character(period),
    season_label = as.character(season_label)
  )

analysis_data_export <- analysis_data |>
  dplyr::mutate(
    period = as.character(period),
    season_label = as.character(season_label),
    anomaly_band = as.character(anomaly_band)
  )

summary_by_class_export <- summary_by_class |>
  dplyr::mutate(
    period = as.character(period),
    season_label = as.character(season_label)
  )

anomaly_distribution_export <- anomaly_distribution |>
  dplyr::mutate(
    period = as.character(period),
    season_label = as.character(season_label),
    anomaly_band = as.character(anomaly_band)
  )

readr::write_csv(
  combined_data_export,
  file.path(output_folder, "dados_combinados_biomas.csv")
)

readr::write_csv(
  analysis_data_export,
  file.path(output_folder, "dados_analise_biomas_brasil.csv")
)

readr::write_csv(
  summary_by_class_export,
  file.path(output_folder, "resumo_anomalia_por_regiao_classe.csv")
)

readr::write_csv(
  anomaly_distribution_export,
  file.path(output_folder, "distribuicao_anomalia_por_regiao_classe.csv")
)

readr::write_csv(
  percentage_check |>
    dplyr::mutate(period = as.character(period)),
  file.path(output_folder, "verificacao_percentuais.csv")
)

readr::write_csv(
  brazil_aggregation_check |>
    dplyr::mutate(period = as.character(period)),
  file.path(output_folder, "verificacao_agregacao_brasil.csv")
)

readr::write_csv(
  summary_by_class_export |>
    dplyr::filter(region == "Brasil"),
  file.path(output_folder, "brasil_resumo_anomalia_por_classe.csv")
)

readr::write_csv(
  anomaly_distribution_export |>
    dplyr::filter(region == "Brasil"),
  file.path(output_folder, "brasil_distribuicao_anomalia_por_classe.csv")
)


# ==============================================================================
# 18. GERAR E SALVAR OS GRÁFICOS
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

# Usar cairo_pdf quando disponível; caso contrário, usar o PDF padrão.
pdf_device <- if (isTRUE(capabilities("cairo"))) {
  grDevices::cairo_pdf
} else {
  grDevices::pdf
}

purrr::walk(
  regions,
  function(current_region) {
    region_years <- anomaly_distribution |>
      dplyr::filter(region == current_region) |>
      dplyr::distinct(year) |>
      dplyr::arrange(year) |>
      dplyr::pull(year)
    
    purrr::walk(
      region_years,
      function(current_year) {
        region_slug <- slugify(current_region)
        
        number_classes <- anomaly_distribution |>
          dplyr::filter(
            region == current_region,
            year == current_year
          ) |>
          dplyr::summarise(
            number_classes = dplyr::n_distinct(class)
          ) |>
          dplyr::pull(number_classes)
        
        distribution_height <- max(
          10,
          5 + number_classes * 0.45
        )
        
        heatmap_height <- max(
          10,
          5 + number_classes * 0.48
        )
        
        distribution_plot <- plot_anomaly_distribution(
          data = anomaly_distribution,
          selected_region = current_region,
          selected_year = current_year,
          label_threshold = label_threshold,
          label_size = segment_label_size,
          class_text_size = class_name_size,
          wrap_width = class_wrap_width
        )
        
        heatmap_plot <- plot_weighted_anomaly_heatmap(
          data = summary_by_class,
          selected_region = current_region,
          selected_year = current_year,
          class_text_size = class_name_size - 1,
          wrap_width = class_wrap_width
        )
        
        ggplot2::ggsave(
          filename = file.path(
            output_folder,
            paste0(
              "distribuicao_anomalia_",
              region_slug,
              "_",
              current_year,
              ".png"
            )
          ),
          plot = distribution_plot,
          width = 24,
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
              "distribuicao_anomalia_",
              region_slug,
              "_",
              current_year,
              ".pdf"
            )
          ),
          plot = distribution_plot,
          width = 24,
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
              "heatmap_anomalia_ponderada_",
              region_slug,
              "_",
              current_year,
              ".png"
            )
          ),
          plot = heatmap_plot,
          width = 17,
          height = heatmap_height,
          units = "in",
          dpi = 300,
          bg = "white",
          limitsize = FALSE
        )
        
        message(
          "Gráficos salvos para: ",
          current_region,
          " — ",
          current_year
        )
      }
    )
  }
)


# ==============================================================================
# 19. EXIBIR UM EXEMPLO DO BRASIL
# ==============================================================================

brazil_years <- anomaly_distribution |>
  dplyr::filter(region == "Brasil") |>
  dplyr::distinct(year) |>
  dplyr::arrange(year) |>
  dplyr::pull(year)

if (length(brazil_years) == 0) {
  stop("Nenhum dado agregado do Brasil foi encontrado.")
}

display_year <- if (2025 %in% brazil_years) {
  2025
} else {
  brazil_years[1]
}

plot_brazil_distribution <- plot_anomaly_distribution(
  data = anomaly_distribution,
  selected_region = "Brasil",
  selected_year = display_year,
  label_threshold = label_threshold,
  label_size = segment_label_size,
  class_text_size = class_name_size,
  wrap_width = class_wrap_width
)

plot_brazil_heatmap <- plot_weighted_anomaly_heatmap(
  data = summary_by_class,
  selected_region = "Brasil",
  selected_year = display_year,
  class_text_size = class_name_size - 1,
  wrap_width = class_wrap_width
)

print(plot_brazil_distribution)
print(plot_brazil_heatmap)


# ==============================================================================
# 20. TABELA COMPACTA
# ==============================================================================

assessment_table <- summary_by_class |>
  dplyr::select(
    year,
    period,
    region,
    region_level,
    class,
    Level_4,
    class_color,
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
  dplyr::mutate(
    class_sort_key = make_hierarchical_sort_key(
      label = Level_4,
      class_id = class
    )
  ) |>
  dplyr::arrange(
    region,
    year,
    period,
    class_sort_key,
    class
  ) |>
  dplyr::select(-class_sort_key)

print(assessment_table, n = 30)

brazil_assessment_table <- assessment_table |>
  dplyr::filter(region == "Brasil")

print(brazil_assessment_table, n = 50)


# ==============================================================================
# 21. INFORMAÇÕES FINAIS
# ==============================================================================

message("\nAnálise concluída.")
message("Número de arquivos CSV: ", length(csv_files))
message(
  "Número de linhas válidas dos biomas: ",
  format(nrow(combined_data), big.mark = ".")
)
message(
  "Número de linhas agregadas para o Brasil: ",
  format(nrow(analysis_brazil), big.mark = ".")
)
message(
  "Regiões analisadas: ",
  paste(regions, collapse = ", ")
)
message("Brasil agregado antes do cálculo das estatísticas.")
message("Painéis: Set–Out–Nov, Dez–Jan–Fev, Mar–Abr–Mai e Jun–Jul–Ago.")
message("Nomes das classes: Level_4, em ordem hierárquica natural.")
message("Retângulos coloridos: NEW COLOR NUMER, sem HTML ou ggtext.")
message("Rótulos internos exibidos quando area_pct > ", label_threshold, "%.")
message(
  "Resultados salvos em: ",
  normalizePath(
    output_folder,
    winslash = "/",
    mustWork = FALSE
  )
)
