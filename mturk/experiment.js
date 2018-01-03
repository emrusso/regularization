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
var FALSE = 70;
var TRUE = 74;


// expected input: array only with same version and trial num
function Exchange(utterances) {
  var utts = [];
  for(key in utterances) {
    var utt = utterances[key];
    var words = [];
    words.push(utt["SPEAKER"]);
    words = words.concat(utt["UTTERANCE"].split(" "));
    utts[utt["INDEX"] - 1] = words; 
  }
  this.utterances = utts;
}

function logme(trial) {
  console.log("number: " + trial.number);
  console.log("a version: ");
  console.log(trial.trials["a"].utterances);
  console.log("b version: ");
  console.log(trial.trials["b"].utterances);
}

// ## Define trial object
function Trial(number, entries) {
  this.number = number;
  this.trials = {"a": [], "b": []};
  var as = [];
  var bs = [];
  for(key in entries) {
    var entry = entries[key];
    if(entry["TRIAL"] == number) {
      entry["VERSION"] == "a" ? as.push(entry) : bs.push(entry);    }
  }
  this.trials["a"] = new Exchange(as);
  this.trials["b"] = new Exchange(bs);
}



// ## Read csv
var trialObjs = $.csv.toObjects(trialsStr);
// ## reorganize trials
var trials = [];
for(var i = 0; i < 11; i++) {
  var t = new Trial(i + 1, trialObjs);
  //logme(t);
  trials.push(t);
}


// ## Helper functions

// Shows slides. We're using jQuery here - the **$** is the jQuery selector function, which takes as input either a DOM element or a CSS selector string.
function showSlide(id) {
  // Hide all slides
	$(".slide").hide();
	// Show just the slide we want to show
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

function keyPressed(event) {

}

function randomVersion(seen) {
  var t = randomInteger(11);
  while(seen.includes(t)) {
    t = randomInteger(11);
  }
  var v = randomInteger(2) == 0 ? "a" : "b";
  return {"t" : t, "v" : v, "trial" : trials[t]};
}

// ## Configuration settings
var myTrialOrder = [];
var seenTrials = [];
for(var i = 0; i < 11; i++) {
  trial = randomVersion(seenTrials);
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
  // The function that gets called when the sequence is finished.
  end: function() {
    // Show the finish slide.
    showSlide("finished");
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(experiment) }, 1500);
  },

  //this is very janky but it's working (kind of)
  next_word: function() {
    var wordData = {};
    var exchange = experiment.curr_trial.trial.trials[experiment.curr_trial["v"]].utterances;
    var i = experiment.curr_i;
    var j = experiment.curr_j;

    if(j >= exchange[i].length) {
      experiment.curr_i++;
      experiment.curr_j = 0;
      
      if(experiment.curr_i >= exchange.length) {
        experiment.data.push({"version":experiment.curr_trial["t"] + experiment.curr_trial["v"], "data" : experiment.curr_trial_data});
        experiment.curr_i = 0;
        experiment.curr_j = 0;
        experiment.ct_index++;

        if(experiment.ct_index >= experiment.trials.length) {
          experiment.end();
          return;
        }

        experiment.curr_trial = experiment.trials[experiment.ct_index];
        experiment.curr_trial_data = [];
      }

      i = experiment.curr_i;
      j = experiment.curr_j;
      exchange = experiment.curr_trial.trial.trials[experiment.curr_trial["v"]].utterances;
    }

    showSlide("stage");
    startTime = (new Date()).getTime();
    $("#word").text(exchange[i][j]);
    var keyPressHandler = function(event) {
      var keyCode = event.which;
      while (keyCode != SPACE) {
        // If a key that we don't care about is pressed, re-attach the handler (see the end of this script for more info)
        $(document).one("keydown", keyPressHandler);
      }
      // record the reaction time (current time minus start time), which key was pressed, and what that means (even or odd).
      var endTime = (new Date()).getTime()
      if(keyCode == SPACE) {
        word_data = {
          stimulus: exchange[i][j],
          rt: endTime - startTime
        };
        experiment.curr_trial_data.push(word_data);
        $("#word").text("");
        setTimeout(function() {
          experiment.curr_j++;
          experiment.next_word();
        }, 500)
      }
    }
    $(document).one("keydown", keyPressHandler);
  }
}
