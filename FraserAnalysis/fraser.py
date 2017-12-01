#!/usr/bin/python

# utterance | response | response_time | speaker | responder | utt_length | error | age

#### add overlap presence, run on MPI-EVA-manchester

import csv
import nltk
from nltk.parse import TestGrammar
from nltk.corpus.reader import CHILDESCorpusReader
from nltk.corpus.reader.xmldocs import XMLCorpusReader, ElementTree
from nltk.util import flatten, LazyMap, LazyConcatenation
from nltk.compat import string_types

NS = 'http://www.talkbank.org/ns/talkbank'

corpus_root = nltk.data.find('corpora/childes/Eng-UK')
manchester_corpus_root = nltk.data.find('corpora/childes/Eng-UK/MPI-EVA-Manchester')
eleanor = CHILDESCorpusReader(manchester_corpus_root, 'eleanor/.*.xml')
fraser = CHILDESCorpusReader(manchester_corpus_root, 'fraser/.*.xml')

def getUtterance(xmlsent):
	utterance = ""
	for word in xmlsent.findall('.//{%s}w' % NS):
		if word.text != None:
			utterance = utterance + " " + word.text
	return utterance

def getRT(s1, s2):
	s1_media = s1.find('.//{%s}media' % NS)
	s2_media = s2.find('.//{%s}media' % NS)
	if s1_media != None and s2_media != None:
		rt_start = float(s1_media.get('end'))
		rt_end = float(s2_media.get('start'))
		return rt_end - rt_start
	return "s1 or s2 media info not available"

def getT(s, start_or_end):
	media = s.find('.//{%s}media' % NS)
	if media != None:
		return float(media.get(start_or_end))
	return "media info not found"


def getUL(s):
	media = s.find('.//{%s}media' % NS)
	if media != None:
		return float(media.get('end')) - float(media.get('start'))
	return "media info not available"

def foundError(s):
	if s.find('.//{%s}error' % NS) != None:
		return True
	return False

def getErrorInfo(arr):
	error_data = []
	for file_res in arr:
		for entry in file_res:
			if entry['error'] == True:
				error_data.append(entry)
	return error_data

def hasPastTense(utterance):
	gwraps = utterance.findall('.//{%s}g' % NS)
	if gwraps != None:
		for gwrap in gwraps:
			for xmlword in gwrap.findall('.//{%s}w' % NS):
				for xmlsfx in xmlword.findall('.//{%s}mor/{%s}mw/{%s}mk' % (NS, NS, NS)):
					if xmlsfx.text.find("PAST") > -1:
						return True
	return False

def hasPlural(utterance):
	gwraps = utterance.findall('.//{%s}g' % NS)
	if gwraps != None:
		for gwrap in gwraps:
			for xmlword in gwrap.findall('.//{%s}w' % NS):
				for xmlsfx in xmlword.findall('.//{%s}mor/{%s}mw/{%s}mk' % (NS, NS, NS)):
					if xmlsfx.text.find("PL") > -1:
					  return True
	return False

def responseOverlaps(utt, resp):
	return responseOverlapsHelper(utt, 'overlap follows') or responseOverlapsHelper(resp, 'overlap precedes')

def responseOverlapsHelper(s, type):
	gwraps = s.findall('.//{%s}g' % NS)
	if gwraps != None:
		for gwrap in gwraps:
			for overlap in gwrap.findall('.//{%s}overlap' % NS):
				if overlap.get('type') == type:
					return True
	return False

def getAgeFromFileName(file):
	chunks = file.split('-')
	year = chunks[0]
	month = chunks[1]
	months = (int(year) * 12) + int(month)
	return months

for file in fraser.fileids():
	xmldoc = ElementTree.parse(file).getroot()
	results = []
	with open('fraser_utterance_data.csv', 'a') as csvfile:
		fieldnames = ['utterance', 'response', 'response_time',
		'speaker', 'responder', 'utterance_time', 'error', 'age',
		'past_tense', 'plural', 'overlap', 'source_file',]
		writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
		i = 0
		sents = xmldoc.findall('.//{%s}u' % NS)
		while i + 1 < len(sents):
			data = {}
			data['utterance'] = getUtterance(sents[i])
			data['response'] = getUtterance(sents[i+1])
			data['response_time'] = getRT(sents[i], sents[i+1])
			data['speaker'] = sents[i].get('who')
			data['responder'] = sents[i+1].get('who')
			data['error'] = foundError(sents[i])
			data['age'] = getAgeFromFileName(file.split('/')[1])
			data['past_tense'] = hasPastTense(sents[i])
			data['plural'] = hasPlural(sents[i])
			data['overlap'] = responseOverlaps(sents[i], sents[i+1])
			data['source_file'] = file
			data['utterance_time'] = getUL(sents[i])
			writer.writerow(data)
			i = i + 1
		csvfile.close()
	print('%s done' % file)