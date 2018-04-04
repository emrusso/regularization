library(tidyverse)
library(jsonlite)
library(lubridate)
library(stringr)
library(data.table)

Sys.setenv(TZ='America/Chicago')

old_files <- list.files("../2.8.2018/production-results/", "*.json", full.names = T)
files <- list.files("../3.13.2018/production-results/", "*.json", full.names = T)

final_data <- NULL
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
    bind_rows(.id = "true_display_order") %>%
    rename(version = V1) %>%
    rowwise() %>%
    mutate(trial = str_split(version, "(?=[:alpha:])")[[1]][1],
           version = str_split(version, "(?=[:alpha:])")[[1]][2])  
  
  # map(data, ~ .x$trial_data %>% unlist() %>% matrix(ncol = 2, byrow = T) %>% as_data_frame()) %>%
  #   bind_rows(.id = "trial") %>%
  #   rename(word = V1, rt = V2) %>%
  #   left_join(version_data) %>%
  #   left_join(ac_data) %>%
  #   mutate(id = id, time = time, start_time = start_time)
  
  hm <- map(data, ~ .x$trial_data %>% unlist(recursive=FALSE))
  
  for (i in 1:20) {
    problem_word <- hm[[i]]$test_word
    hm[[i]]$test_word<- if_else(is.null(problem_word), NA, problem_word)
    tmp <- hm[[i]] %>% matrix(ncol = 10, byrow = T)
    if(i==1) {
      subj_matrix <- tmp
    } else {
      subj_matrix <- rbind(subj_matrix,tmp)
    }
  }
  all_data_subj <- as_data_frame(subj_matrix) %>%
    mutate_at(.vars=vars(names(.), -V8), funs(as.character)) %>%
    rename(trial=V1,
           display_order=V4) %>%
    left_join(version_data, by="trial") %>%
    left_join(ac_data, by=c("true_display_order"="trial")) %>%
    mutate(id = id, time = time, start_time = start_time)
  
  rbind(final_data,all_data_subj)
}

fixed_data <- map(files, read_file) 
fixed_data <- do.call(rbind,fixed_data)




completion_time <- fixed_data %>%
  distinct(subj, time, start_time) %>%
  arrange(start_time) 

first_turkers <- fixed_data %>%
  distinct(id, time) %>%
  distinct(id) %>%
  mutate(subj = 1:n())

anonymized_data <- fixed_data %>%
  left_join(first_turkers) %>%
  select(-id, -time) %>%
  group_by(subj, trial, V7) %>%
  mutate(words = paste(V8[[1]]$words, collapse=' '), 
            V8= V8[[1]]$speaker)


write_csv(anonymized_data, "../data/3.13_data.csv")

  
