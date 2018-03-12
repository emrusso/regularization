#!/usr/bin/python

import csv
import inspect

def createWordRowsFromUtterance(utterance_row):
	wordArr = utterance_row['UTTERANCE'].split()
	words = []
	for word in wordArr:
		word_row = {}
		word_row["word_in_utterance"] = wordArr.index(word) + 1
		word_row["word"] = word
		word_row["version"] = utterance_row["VERSION"]
		word_row["utterance_in_exchange"] = utterance_row["INDEX"]
		word_row["exchange"] = int(utterance_row["TRIAL"]) + 1 
		words.append(word_row)
	return words

total = []
with open('trials.csv', 'r') as csvfile:
	reader = csv.DictReader(csvfile)
	for row in reader:
		if int(row['TRIAL']) > 0:
			words = createWordRowsFromUtterance(row)
			total.append(words)
	csvfile.close()

with open('trials_as_words.csv', 'a') as csvfile:
	fieldNames = ['word_in_utterance', 'word', 'version', 'utterance_in_exchange', 'exchange']
	writer = csv.DictWriter(csvfile, fieldnames = fieldNames)
	for entry in total:
		for word in entry:
			writer.writerow(word)
	csvfile.close()
