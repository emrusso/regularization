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
thomas = CHILDESCorpusReader(corpus_root, 'Thomas/.*.xml')
eleanor = CHILDESCorpusReader(manchester_corpus_root, 'eleanor/.*.xml')
fraser = CHILDESCorpusReader(manchester_corpus_root, 'fraser/.*.xml')

corpus_rt_total = 0
corpus_rt_num = 0
corpus_rt_avg = 0
corpus_noerr_rt_total = 0
corpus_noerr_rt_num = 0
corpus_noerr_rt_avg = 0
corpus_err_rt_total = 0
corpus_err_rt_num = 0
corpus_err_rt_avg = 0


corpus_total_errs = 0;

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


for file in thomas.fileids():
	xmldoc = ElementTree.parse(file).getroot()
	results = []
	with open('thomas_utterance_data.csv', 'a') as csvfile:
		fieldnames = ['utterance', 'response', 'speaker', 'responder','error', 'age', 'past_tense', 'plural', 'source_file',
			'utterance_start', 'utterance_end', 'response_start', 'response_end']
		writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
		i = 0
		sents = xmldoc.findall('.//{%s}u' % NS)
		while i + 1 < len(sents):
			data = {}
			data['utterance'] = getUtterance(sents[i])
			data['response'] = getUtterance(sents[i+1])
			data['speaker'] = sents[i].get('who')
			data['responder'] = sents[i+1].get('who')
			data['error'] = foundError(sents[i])
			data['age'] = getAgeFromFileName(file.split('/')[1])
			data['past_tense'] = hasPastTense(sents[i])
			data['plural'] = hasPlural(sents[i])
			data['source_file'] = file
			data['utterance_start'] = getT(sents[i], 'start')
			data['utterance_end'] = getT(sents[i], 'end')
			data['response_start'] = getT(sents[i+1], 'start')
			data['response_end'] = getT(sents[i+1], 'end')
			writer.writerow(data)
			i = i + 1
		csvfile.close()
	print('%s done' % file)



# utterance_f = open('utterance_data.txt', 'w')
# utterance_f.write(str(all_files_results))
# utterance_f.close()


# for file in thomas.fileids():
# 	xmldoc = ElementTree.parse(file).getroot()
# 	results = []
# 	num_errs = 0
# 	i = 0
# 	sents = xmldoc.findall('.//{%s}u' % NS)
# 	while i + 1 < len(sents):
# 		if 'CHI' == sents[i].get('who') and 'MOT' == sents[i+1].get('who'):
# 			words = {}
# 			chi_media = sents[i].find('.//{%s}media' % NS)
# 			mot_media = sents[i+1].find('.//{%s}media' % NS)
# 			gwraps = sents[i].findall('.//{%s}g' % NS)
# 			if gwraps != None:
# 				for gwrap in gwraps: 
# 				    if sents[i].find('.//{%s}error' % NS) != None:
# 						for xmlword in gwrap.findall('.//{%s}w' % NS):
# 							for xmlsfx in xmlword.findall('.//{%s}mor/{%s}mw/{%s}mk' % (NS, NS, NS)):
# 								if xmlsfx.get('type') == 'sfx' :
# 									if xmlsfx.text == "PAST":
# 										if xmlword.text != "fixed" and xmlword.text != "wanted" and xmlword.text != "clowned" and xmlword.text != "squashed":
# 											if file != "Thomas/2-10-25.xml":
# 												num_errs = num_errs + 1
# 												words["error"] = xmlword.text
# 			if chi_media != None and mot_media != None:
# 				words["child_end_time"] = chi_media.get('end')
# 				words["mot_start_time"] = mot_media.get('start')
# 				words["time_to_respond"] = float(words["mot_start_time"]) - float(words["child_end_time"])
# 			else:
# 				words["xml_err"] = "media for chi or mot not found"
# 			if words:
# 				results.append(words)
# 		i = i + 2

# 	i = 0
# 	total_nonerr_time = 0
# 	total_num_nonerrs = 0
# 	total_err_time = 0
# 	total_num_errs = 0
# 	while i < len(results):
# 		if "error" in results[i]:
# 			if "xml_err" not in results[i]:
# 				total_num_errs = total_num_errs + 1
# 				total_err_time = total_err_time + results[i]["time_to_respond"]
# 				print results[i]["error"]
# 		else:
# 			if "xml_err" not in results[i]:
# 				total_num_nonerrs = total_num_nonerrs + 1
# 				total_nonerr_time = total_nonerr_time + results[i]["time_to_respond"]
# 		i = i + 1
	
# 	avg_nonerr_time = 0
# 	avg_err_time = 0
# 	if total_num_nonerrs > 0:
# 		avg_nonerr_time = total_nonerr_time/total_num_nonerrs
# 		corpus_noerr_rt_total = corpus_noerr_rt_total + avg_nonerr_time
# 		corpus_noerr_rt_num = corpus_noerr_rt_num + 1
# 	if total_num_errs > 0:
# 		avg_err_time = total_err_time/total_num_errs
# 		corpus_err_rt_total = corpus_err_rt_total + avg_err_time
# 		corpus_err_rt_num = corpus_err_rt_num + 1
# 	if avg_err_time != 0:
# 		print file
# 		print "number errors: " + str(num_errs)
# 		print "average response time with no error: " + str(avg_nonerr_time)
# 		print "average response time with error: " + str(avg_err_time)
# 		print '\n'


# corpus_noerr_rt_avg = corpus_noerr_rt_total/corpus_noerr_rt_num
# corpus_err_rt_avg = corpus_err_rt_total/corpus_err_rt_num
# print "overall noerr rt avg: " + str(corpus_noerr_rt_avg)
# print "overall err rt avg: " + str(corpus_err_rt_avg)
# print "diff: " + str(corpus_err_rt_avg - corpus_noerr_rt_avg)