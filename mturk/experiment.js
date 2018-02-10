// I'm implementing the experiment using a data structure that I call a **sequence**. The insight behind sequences is that many experiments consist of a sequence of largely homogeneous trials that vary based on a parameter. For instance, in this example experiment, a lot stays the same from trial to trial - we always have to present some number, the subject always has to make a response, and we always want to record that response. Of course, the trials do differ - we're displaying a different number every time. The idea behind the sequence is to separate what stays the same from what differs - to **separate code from data**. This results in **parametric code**, which is much easier to maintain - it's simple to add, remove, or change conditions, do randomization, and do testing.

// ## High-level overview
// Things happen in this order:
// 
// 1. Compute randomization parameters (which keys to press for even/odd and trial order), fill in the template <code>{{}}</code> slots that indicate which keys to press for even/odd, and show the instructions slide.
// 2. Set up the experiment sequence object.
// 3. When the subject clicks the start button, it calls <code>experiment.next()</code>
// 4. <code>experiment.next()</code> checks if there are any trials left to do. If there aren't, it calls <code>experiment.end()</code>, which shows the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk.
// 5. If there are more trials left, <code>experiment.next()</code> shows the next trial, records the current time for computing reaction time, and sets up a listener for a key press.
// 6. The key press listener, when it detects either a P or a Q, constructs a data object, which includes the presented stimulus number, RT (current time - start time), and whether or not the subject was correct. This entire object gets pushed into the <code>experiment.data</code> array. Then we show a blank screen and wait 500 milliseconds before calling <code>experiment.next()</code> again.

// ## Global statics
var SPACE = 32;
var F = 70;
var J = 74;

$(function() {
  $("#instructions").focus();
})

function start(e) {
  if(e.keyCode == SPACE) {
    experiment.next_word();
  }
}

// expected input: array only with same version and trial num
function Exchange(utterances) {
  var utts = [];
  for(key in utterances) {
    var utt = utterances[key];
    var words = [];
    utt["UTTERANCE"] = utt["UTTERANCE"].replace("\"", "");
    words = words.concat(utt["UTTERANCE"].split(" "));
    utts[utt["INDEX"] - 1] = {"words": words, "speaker": utt["SPEAKER"]}; 
  }
  this.utterances = utts;
}

function logTrial(trial) {
  console.log("number: " + trial.number);
  console.log("a version: ");
  console.log(trial.trials["a"].utterances);
  console.log("b version: ");
  console.log(trial.trials["b"].utterances);
}

function logme(trialVersion) {
  console.log("number: " + trial["t"]);
  console.log("version: " + trial["v"]);
  console.log("utterances: " + trial["v"].utterances);
}



// ## Define trial object
function Trial(number, entries) {
  this.number = number;
  this.versions = {"a": [], "b": []};
  this.check = {"seen": "", "unseen": ""};
  var as = [];
  var bs = [];

  for(key in entries) {
    var entry = entries[key];
    if(entry["TRIAL"] == number) {
      if(number < 0) {
        as.push(entry);
        bs.push(entry);
      } else {
        entry["VERSION"] == "a" ? as.push(entry) : bs.push(entry);
      }
      if(this.check["seen"]=="") {
        this.check["seen"] = entry["SEEN"];
        this.check["unseen"] = entry["UNSEEN"];
      }
    }
  }
  this.versions["a"] = new Exchange(as);
  this.versions["b"] = new Exchange(bs);
}


var testTrial = new Trial()

// ## Read csv
var trialObjs = $.csv.toObjects(trialsStr);
// ## reorganize trials
var trials = [new Trial(-1, trialObjs)];
trials.push(new Trial(-2, trialObjs));
for(var i = 0; i < 10; i++) {
  var t = new Trial(i + 1, trialObjs);
  trials.push(t);
}

// ## Helper functions

function showSlide(id) {
	$(".slide").hide();
	$("#"+id).show();
}

// Get a random integer less than n.
function randomInteger(n) {
	return Math.floor(Math.random()*n);
}

// Get a random element from an array (e.g., <code>random_element([4,8,7])</code> could return 4, 8, or 7). This is useful for condition randomization.
function randomElement(array) {
  return array[randomInteger(array.length)];
}

function randomVersion(testTrialNums) {
  //FIX THIS YOU ARE MISSING TRIAL 11

  var t = randomInteger(10);
  var v = "b";
  if(testTrialNums.includes(t + 2)) {
    v = "a";
  }
  return {"t" : t+2, "v" : v, "trial" : trials[t+2]};
}

function generateUnderlines(words) {
  $(".utt").empty();
  var $underlines = $("<div/>", {"id": "underlines"});
  for(var i = 0; i < words.length; i++) {
    $sp = $("<span/>", {"class": "empty word" + i});
    $wrapper = $("<div/>", {"class": "underline"});
    $sp.text(words[i]);
    $wrapper.append($sp);
    $underlines.append($wrapper);
  }
  $(".utt").append($underlines);
}

function generateAttentionCheck(seenOrder, seen, unseen) {
  $(".ac_container").empty();
  var $seenContainer = $("<div/>", {"id": "seen", "class": "ac_option"});
  var $unseenContainer = $("<div/>", {"id": "unseen", "class": "ac_option"});
  $seenContainer.text(seen);
  $unseenContainer.text(unseen);
  if(seenOrder == F) {
    $seenContainer.prepend("<span class='key'>F</span><br><br>");
    $(".ac_container").append($seenContainer);
    $unseenContainer.prepend("<span class='key'>J</span><br><br>");
    $(".ac_container").append($unseenContainer);
  } else {
    $unseenContainer.prepend("<span class='key'>F</span><br><br>");
    $(".ac_container").append($unseenContainer);
    $seenContainer.prepend("<span class='key'>J</span><br><br>");
    $(".ac_container").append($seenContainer);
  }
}

// ## Configuration settings
var myTrialOrder = [];
var seenTrials = [];
var seenTestTrialNums = [];
var testTrialNums = [];
for(var i = 0; i < 5; i++) {
  var t = randomInteger(10) + 2;
  while(seenTestTrialNums.includes(t)) {
    t = randomInteger(10) + 2;
  }
  testTrialNums.push(t);
  seenTestTrialNums.push(t);
}

myTrialOrder.push({"t": 0, "v": "a", "trial": trials[0]});
myTrialOrder.push({"t": 1, "v": "a", "trial": trials[1]});
//randomize order
for(var i = 0; i < 10; i++) {
  trial = randomVersion(testTrialNums);
  while(seenTrials.includes(trial["t"])) {
    trial = randomVersion(testTrialNums);
  }
  myTrialOrder.push(trial);
  seenTrials.push(trial["t"]);
}

// Fill in the instructions template using jQuery's <code>html()</code> method. In particular,
$("#true-key").text("J");
$("#false-key").text("F");
$("#advance-key").text("space");

// Show the instructions slide -- this is what we want subjects to see first.
showSlide("instructions");

// ## The main event
// I implement the sequence as an object with properties and methods. The benefit of encapsulating everything in an object is that it's conceptually coherent (i.e. the <code>data</code> variable belongs to this particular sequence and not any other) and allows you to **compose** sequences to build more complicated experiments. For instance, if you wanted an experiment with, say, a survey, a reaction time test, and a memory test presented in a number of different orders, you could easily do so by creating three separate sequences and dynamically setting the <code>end()</code> function for each sequence so that it points to the next. **More practically, you should stick everything in an object and submit that whole object so that you don't lose data (e.g. randomization parameters, what condition the subject is in, etc). Don't worry about the fact that some of the object properties are functions -- mmturkey (the Turk submission library) will strip these out.**

var experiment = {
  // Parameters for this sequence.
  trials: myTrialOrder,
  ct_index: 0,
  curr_trial: myTrialOrder[0],
  curr_trial_data: [],
  curr_i: 0,
  curr_j: 0,
  // An array to store the data that we're collecting.
  data: [],
  passed_ac: false,
  show_ac: false,
  correctKeyCode: F,
  show_begin: false,

  // The function that gets called when the sequence is finished.
  end: function() {
    // Show the finish slide.
    showSlide("finished");
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(experiment) }, 1500);
  },

  next_word: function() {
    var wordData = {};
    var exchange = experiment.curr_trial.trial.versions[experiment.curr_trial["v"]].utterances;
    var i = experiment.curr_i;
    var j = experiment.curr_j;

    if(experiment.show_begin) {
      showSlide("begin");
    }

    //if at the end of the last utterance of the exchange
    if(experiment.curr_i >= exchange.length && !experiment.show_begin) {
        // //show attention check
        // showSlide("stage");

        //randomly pick and display appropriate ac utts
        var correct = experiment.curr_trial.trial.check["seen"];
        var unseen = experiment.curr_trial.trial.check["unseen"];


        experiment.correctKeyCode = randomInteger(2) == 0 ? F : J;
        experiment.show_ac = true;
        showSlide("ac");
        startTime = (new Date()).getTime();

        generateAttentionCheck(experiment.correctKeyCode, correct, unseen);
    } else if(j >= exchange[i]["words"].length && !experiment.show_begin) {
      experiment.curr_i++;
      experiment.curr_j = 0;
      if(experiment.curr_i >= exchange.length) {
        //lol this is extremely dumb
        var correct = experiment.curr_trial.trial.check["seen"];
        var unseen = experiment.curr_trial.trial.check["unseen"];


        experiment.correctKeyCode = randomInteger(2) == 0 ? F : J;
        experiment.show_ac = true;
        showSlide("ac");
        startTime = (new Date()).getTime();

        generateAttentionCheck(experiment.correctKeyCode, correct, unseen);
      }
    }

    if(experiment.curr_trial["t"] < 2 && !experiment.show_ac && !experiment.show_begin) {
      showSlide("sample");

      if(experiment.curr_j == 0) {
        //update label
        $(".speaker").text(exchange[experiment.curr_i]["speaker"]);
        //update underlines
        generateUnderlines(exchange[experiment.curr_i]["words"]);
      }

      $(".word" + experiment.curr_j).removeClass("empty");
      $(".word" + experiment.curr_j).parent(".underline").addClass("selected");
    }

    if(!experiment.show_ac && experiment.curr_trial["t"] >= 2 && !experiment.show_begin) {
      showSlide("stage");
      startTime = (new Date()).getTime();
      //if start of new utterance
      if(experiment.curr_j == 0) {
        //update label
        $(".speaker").text(exchange[experiment.curr_i]["speaker"]);
        //update underlines
        generateUnderlines(exchange[experiment.curr_i]["words"]);
      }

      $(".word" + experiment.curr_j).removeClass("empty");
      $(".word" + experiment.curr_j).parent(".underline").addClass("selected");
    }

    //$("#utt").text(exchange[i]["words"][j]);
    var keyPressHandler = function(event) {
      var keyCode = event.which;
      if(!(keyCode == SPACE && !experiment.show_ac) && !((keyCode == F || keyCode == J) && experiment.show_ac)) {
        // If a key that we don't care about is pressed, re-attach the handler (see the end of this script for more info)      
        $(document).one("keydown", keyPressHandler);
      }

      if(keyCode == SPACE && !experiment.show_ac) {
        //if sample trial, don't send any data        
        if(experiment.curr_trial["t"] == 0 && !experiment.show_begin) {
            $(".word" + experiment.curr_j).addClass("empty");
            $(".selected").removeClass("selected");
            experiment.curr_j++;
            experiment.next_word();
            return;
        }

        if(experiment.show_begin) {
          experiment.show_begin = false;
          experiment.next_word();
          return;
        }

        var endTime = (new Date()).getTime();
        word_data = {
          stimulus: exchange[experiment.curr_i]["words"][experiment.curr_j],
          rt: endTime - startTime
        };
        experiment.curr_trial_data.push(word_data);
        $(".word" + experiment.curr_j).addClass("empty");
        $(".selected").removeClass("selected");
        experiment.curr_j++;
        experiment.next_word();
      } else if((keyCode == F || keyCode == J) && experiment.show_ac) {
        
        if(experiment.curr_trial["t"] < 2) {
          if(keyCode != experiment.correctKeyCode) {
            $(document).one("keydown", keyPressHandler);
            return;
          }

          if(experiment.curr_trial["t"] == 1) {
            experiment.show_begin = true;
          }

          experiment.show_ac = false;
          experiment.ct_index++;
          experiment.curr_trial = experiment.trials[experiment.ct_index];
          experiment.curr_trial_data = [];
          experiment.curr_i = 0;
          experiment.curr_j = 0;
          experiment.passed_ac = false;
          if(experiment.curr_trial["t"] == 1) {
            showSlide("nextSample");
            setTimeout(function() {
              experiment.next_word()
            }, 2000);
          } else {
            experiment.next_word();
          }
          return;
        }

        var endTime = (new Date()).getTime();
        experiment.passed_ac = keyCode == experiment.correctKeyCode;
        ac_data = {
          correctKeyCode: experiment.correctKeyCode == F ? "left" : "right",
          pressedKeyCode: keyCode == F ? "left" : "right",
          passed: experiment.passed_ac,
          rt: endTime - startTime
        }
        experiment.show_ac = false;
        experiment.data.push({"version":experiment.curr_trial["t"] + experiment.curr_trial["v"], "data" : experiment.curr_trial_data, "ac_data" : ac_data});
        experiment.ct_index++;
        //end experiment if we've run all the trials
        if(experiment.ct_index >= experiment.trials.length) {
          experiment.end();
          return;
        }

        experiment.curr_trial = experiment.trials[experiment.ct_index];
        experiment.curr_trial_data = [];
        experiment.curr_i = 0;
        experiment.curr_j = 0;
        experiment.passed_ac = false;
        experiment.next_word();
      }
    }
    $(document).one("keydown", keyPressHandler);
  }
}
