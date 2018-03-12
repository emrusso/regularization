library(tidyverse)
library(jsonlite)
library(lubridate)
library(stringr)

Sys.setenv(TZ='America/Chicago')

files <- list.files("../production-results/", "*.json", full.names = T)

read_file <- function(file) {
  raw_data <- read_json(file)
  id <- raw_data$WorkerId
  start_time <- raw_data$AcceptTime
  time <- raw_data$SubmitTime
  
  data <- raw_data$answers$data$data
  
  ac_data <- map(data, ~ .x$ac_data %>% unlist() %>% t() %>% as_data_frame) %>%
    bind_rows(.id = "trial") %>%
    rename(ac_rt = rt)
  
  version_data <- map(data, ~ .x$version %>% unlist() %>% t() %>% as_data_frame) %>%
    bind_rows(.id = "trial") %>%
    rename(version = V1)
  
  map(data, ~ .x$data %>% unlist() %>% matrix(ncol = 2, byrow = T) %>% as_data_frame()) %>%
    bind_rows(.id = "trial") %>%
    rename(word = V1, rt = V2) %>%
    left_join(version_data) %>%
    left_join(ac_data) %>%
    mutate(id = id, time = time, start_time = start_time)
}

data <- map(files, read_file) %>%
  bind_rows() %>%
  arrange(id, time)


completion_time <- data %>%
  distinct(subj, time, start_time) %>%
  arrange(start_time)
  mutate(diff = time - start_time)

first_turkers <- data %>%
  distinct(id, time) %>%
  distinct(id) %>%
  mutate(subj = 1:n())

anonymized_data <- data %>%
  left_join(first_turkers) %>%
  select(-id, -time) %>%
  mutate(exchange = str_extract(version, "[0-9]+"),
         version = str_extract(version, "[a-z]+"))


write_csv(anonymized_data, "../data/pilot_data.csv")
